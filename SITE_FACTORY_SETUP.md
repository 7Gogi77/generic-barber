# Site Factory Setup

This repository now includes an internal site factory that can:

- create an isolated tenant database on your VPS
- create a new Vercel project from your template repository
- inject the tenant database URL and admin credentials into that project
- return the live project URL and follow-up checklist

Main entry points:

- UI: `/site-factory.html`
- readiness API: `/api/site-factory-status`
- provisioning API: `/api/provision-site`
- runtime env API for generated projects: `/api/admin-env`

## 1. VPS setup

Run the VPS database server with these environment variables:

```bash
PORT=3001
HOST=0.0.0.0
PUBLIC_BASE_URL=https://your-vps-domain.com
VPS_DB_ADMIN_TOKEN=change-this-long-random-token
npm run vps:db
```

New VPS capabilities:

- shared DB: `GET|PUT|PATCH|POST|DELETE /db/<path>.json`
- isolated tenant DB: `GET|PUT|PATCH|POST|DELETE /tenant-db/<tenantId>/<path>.json`
- health check: `GET /health`
- tenant registry list: `GET /_admin/tenants`
- tenant creation: `POST /_admin/tenants`

Admin endpoints require:

- header: `x-admin-token: <VPS_DB_ADMIN_TOKEN>`

Example tenant create request:

```json
{
  "tenantId": "blade-bourbon",
  "businessName": "Blade & Bourbon",
  "siteConfig": {
    "shopName": "Blade & Bourbon"
  },
  "metadata": {
    "ownerEmail": "owner@example.com"
  }
}
```

## 2. Site factory project env vars

Configure these on the Vercel project that hosts this repository and the site factory UI/API.

Required:

- `SITE_FACTORY_VPS_ADMIN_URL`
  Example: `https://your-vps-domain.com/_admin/tenants`
- `VPS_DB_ADMIN_TOKEN`
  Must match the token configured on the VPS DB server.
- `VERCEL_ACCESS_TOKEN`
  Personal or team token with permission to create projects.
- `VERCEL_TEMPLATE_REPO`
  Example: `your-org/generic-barber-template`

Recommended:

- `SITE_FACTORY_API_KEY`
  Protects `/api/provision-site`.
- `VERCEL_TEAM_ID`
  Use this if provisioning into a team account.
- `VERCEL_TEAM_SLUG`
  Optional alternative/team context helper.
- `VERCEL_TEMPLATE_REPO_TYPE`
  Usually `github`.
- `VERCEL_TEMPLATE_REPO_ID`
  Required if you want the factory to trigger an immediate deployment after project creation.
- `VERCEL_TEMPLATE_REPO_REF`
  Default branch, usually `main`.
- `VERCEL_PROJECT_ROOT_DIRECTORY`
  Only if the template site is inside a monorepo subdirectory.
- `VERCEL_PROJECT_FRAMEWORK`
  Optional. Leave unset or set according to your Vercel project preference.
- `VERCEL_BUILD_COMMAND`
  Default is `npm run build`.
- `VERCEL_OUTPUT_DIRECTORY`
  Default is `dist`.
- `VERCEL_INSTALL_COMMAND`
  Default is `npm install`.
- `SITE_FACTORY_PUBLIC_VPS_BASE_URL`
  Optional helper. Example: `https://your-vps-domain.com`

## 3. Generated project env vars

Each newly created client project receives these env vars automatically:

- `BACKEND_DATABASE_URL`
- `DATABASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_ENABLED`
- `ADMIN_MAX_ATTEMPTS`
- `ADMIN_LOCKOUT_DURATION`

Those values are consumed by `/api/admin-env`, and the frontend loader in `js/admin-env.js` fetches them at runtime.

## 4. What still needs manual setup

The factory now covers project creation, tenant DB seeding, and runtime config injection. You still need to handle these operational items:

1. DNS and custom domain assignment if the client wants their own domain.
2. Email provider env vars on each generated project if you use notification endpoints.
3. SMS provider env vars on each generated project if you use SMS flows.
4. VPS backup policy for `data/tenants/*.json` and `data/tenants-registry.json`.
5. Access control around `site-factory.html` and `/api/provision-site`.

## 5. Recommended production hardening

1. Put the site factory behind your own admin auth, not only `SITE_FACTORY_API_KEY`.
2. Move tenant storage from JSON files to SQLite or Postgres if volume grows.
3. Add rollback logic if Vercel project creation succeeds but deployment fails.
4. Add custom domain automation using the Vercel domains API.
5. Add image/logo upload storage instead of relying only on pasted URLs.

## 6. Quick smoke test

1. Start the VPS DB server.
2. Open `/site-factory.html`.
3. Confirm the readiness panel says `Ready`.
4. Create a test site using a temporary slug.
5. Verify the API returns:
   - tenant ID
   - VPS database URL
   - Vercel project URL
6. Open the generated site and confirm:
   - it loads content from its tenant DB
   - admin login uses the generated username/password hash
   - `site_config.json` is being served from the tenant path