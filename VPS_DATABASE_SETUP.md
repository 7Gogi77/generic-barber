# VPS Database Setup

This project can now run without Firebase by pointing the frontend at a simple JSON database server on your VPS.

## 1. Start the VPS database server

Run this on the VPS inside the project directory:

```bash
npm install
npm run vps:db
```

The server exposes:

- `GET /health`
- `GET|POST|PUT|PATCH|DELETE /db/<path>.json`
- `GET|POST|PUT|PATCH|DELETE /tenant-db/<tenantId>/<path>.json`
- `GET /_admin/tenants`
- `POST /_admin/tenants` with `x-admin-token`

Example:

- `https://your-domain.com/db/site_config.json`
- `https://your-domain.com/db/schedule.json`
- `https://your-domain.com/db/workers.json`
- `https://your-domain.com/tenant-db/client-a/site_config.json`
- `https://your-domain.com/tenant-db/client-a/schedule.json`

For tenant provisioning, set these env vars before starting the server:

```bash
PUBLIC_BASE_URL=https://your-domain.com
VPS_DB_ADMIN_TOKEN=change-this-long-random-token
```

Then create tenants via:

```bash
curl -X POST "https://your-domain.com/_admin/tenants" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: change-this-long-random-token" \
    -d '{"tenantId":"client-a","businessName":"Client A"}'
```

## 2. Migrate existing Firebase data

If your current data is still in Firebase, import it once:

```bash
SOURCE_DATABASE_URL="https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app" npm run vps:import-firebase
```

That writes everything into `data/db.json` on the VPS.

## 3. Point the frontend to the VPS

Set the database base URL to your VPS `/db` endpoint.

Minimum change:

- edit `DEFAULT_DATABASE_URL` in `js/config.js`
- edit `SITE_CONFIG.backend.databaseURL` in `js/config.js`

Example:

```js
const DEFAULT_DATABASE_URL = 'https://your-domain.com/db';

backend: {
    databaseURL: 'https://your-domain.com/db',
    syncPollingMs: 15000
},
```

Important:

- For Firebase, the base URL is the Firebase root.
- For the VPS server, the base URL must include `/db`.

## 4. Reverse proxy recommendation

If you use Nginx, proxy `/db/` and `/health` to the Node process, for example on port `3001`.

## 5. Rebuild frontend assets

After changing the database URL, rebuild the app:

```bash
npm run build
```

## Stored data

The VPS database server persists everything in:

```text
data/db.json
data/tenants/*.json
data/tenants-registry.json
```

Back these files up regularly.