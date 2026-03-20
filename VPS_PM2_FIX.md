# VPS PM2 Configuration Fix

## Current Problem
The PM2 process `barber-db` was started without the `VPS_DB_ADMIN_TOKEN` environment variable, causing all admin requests to return 401 Unauthorized.

## Solution
Use PM2's ecosystem config file to manage environment variables persistently.

## Steps to Execute on VPS

### 1. Kill the old process
```bash
pm2 delete barber-db
```

### 2. Copy the ecosystem config file to the VPS
From your local machine:
```bash
scp ecosystem.config.cjs root@178.104.77.218:/root/generic-barber/
```

### 3. On the VPS, start the process with the config file
```bash
cd /root/generic-barber
pm2 start ecosystem.config.cjs
pm2 save
```

### 4. Verify the process is running
```bash
pm2 list
pm2 show barber-db
```

### 5. Check that the env vars are set correctly
```bash
pm2 show barber-db | grep -A 10 "env:"
```

You should see:
- `VPS_DB_ADMIN_TOKEN: e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e`
- `PORT: 3001`
- `HOST: 0.0.0.0`
- `PUBLIC_BASE_URL: http://booking-cx33-server.hetzner.com`

### 6. Test the endpoint
```bash
export TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $TOKEN" \
  --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}'
```

You should get a **201 Created** response instead of 401 Unauthorized.

## Alternative: If ecosystem config doesn't work

If you prefer not to use the config file, run PM2 with env vars inline:

```bash
pm2 delete barber-db

export VPS_DB_ADMIN_TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
export PORT=3001
export HOST="0.0.0.0"
export PUBLIC_BASE_URL="http://booking-cx33-server.hetzner.com"

pm2 start /root/generic-barber/server/vps-db-server.mjs \
  --name barber-db \
  --interpreter node \
  --cwd /root/generic-barber

# Save configuration to auto-start on reboot
pm2 save
```

## Notes
- The token `e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e` should be rotated before going to production
- Update `PUBLIC_BASE_URL` if your VPS hostname changes
- `pm2 save` persists the PM2 configuration so the process auto-starts on server reboot
