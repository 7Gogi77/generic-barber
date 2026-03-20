# Complete VPS PM2 Fix Implementation Guide

## Problem
The PM2 process is running but returning **401 Unauthorized** because the `VPS_DB_ADMIN_TOKEN` environment variable is not set.

## Root Cause
When PM2 started the `barber-db` process, it didn't have the `VPS_DB_ADMIN_TOKEN` env var configured, so the Node.js server has an empty token value that doesn't match the token being sent in curl headers.

## Solution

### Option 1: Using ecosystem.config.cjs (Recommended)

**Step 1: Get the ecosystem config file**

You can copy it from your local machine, or create it on the VPS by running this single command:

```bash
cat > /root/generic-barber/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'barber-db',
      script: './server/vps-db-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: '3001',
        HOST: '0.0.0.0',
        PUBLIC_BASE_URL: 'http://booking-cx33-server.hetzner.com',
        VPS_DB_ADMIN_TOKEN: 'e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e'
      },
      error_file: '.pm2-error.log',
      out_file: '.pm2-out.log',
      log_file: '.pm2-combined.log',
      max_memory_restart: '500M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
```

**Step 2: Deploy the new PM2 process**

```bash
cd /root/generic-barber

# Delete the old process
pm2 delete barber-db

# Wait for cleanup
sleep 2

# Start with the ecosystem config
pm2 start ecosystem.config.cjs

# Save the configuration for auto-start on reboot
pm2 save

# Wait for the process to fully start
sleep 3
```

**Step 3: Verify the fix**

```bash
# Check that the process is online
pm2 list

# Check the exact env vars loaded
pm2 show barber-db | grep -A 20 "env:"

# Test the endpoint
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"

curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $TOKEN" \
  --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}'
```

**Expected Result:** You should receive a **201 Created** or **200 OK** response with JSON containing the tenant data.

---

### Option 2: Using PM2 environment variables directly (Alternative)

If you prefer not to use the config file approach:

```bash
cd /root/generic-barber

# Delete the old process
pm2 delete barber-db

# Set environment variables
export VPS_DB_ADMIN_TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
export PORT=3001
export HOST="0.0.0.0"
export PUBLIC_BASE_URL="http://booking-cx33-server.hetzner.com"

# Start the process with the environment variables
pm2 start /root/generic-barber/server/vps-db-server.mjs \
  --name barber-db \
  --interpreter node \
  --cwd /root/generic-barber

# Save the configuration
pm2 save

# Test the endpoint
export TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"

curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $TOKEN" \
  --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}'
```

---

## Troubleshooting

If the endpoint still returns 401:

```bash
# Check PM2 logs for startup errors
pm2 logs barber-db --lines 50

# Verify the token is actually set in the running process
pm2 show barber-db | grep VPS_DB_ADMIN_TOKEN

# If the token isn't set, try restarting PM2
pm2 restart barber-db

# If that doesn't work, check the PM2 daemon
pm2 kill
pm2 start ecosystem.config.cjs
pm2 save
```

If the process won't start:

```bash
# Run the server directly to see the error
cd /root/generic-barber
VPS_DB_ADMIN_TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e" \
PORT=3001 \
HOST="0.0.0.0" \
PUBLIC_BASE_URL="http://booking-cx33-server.hetzner.com" \
node server/vps-db-server.mjs

# If it runs, you should see:
# "Server listening on http://0.0.0.0:3001"
```

---

## Once the endpoint is working:

1. You can proceed to test the site factory provisioning workflow
2. Run the `/site-factory.html` form in your Vercel deployment
3. Submit a test tenant creation
4. Verify that the tenant record is created on the VPS

---

## Security Notes

- The token `e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e` should be rotated before going to production
- Update `PUBLIC_BASE_URL` if your VPS hostname or domain changes
- `pm2 save` persists the PM2 configuration to `.pm2/conf.js` so the process auto-starts on server reboot
