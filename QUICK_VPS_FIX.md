# Quick VPS PM2 Fix - Copy and Paste Commands

## Step 1: Copy the ecosystem config file from your local machine to the VPS

```bash
# On your local machine (in the generic-barber directory):
scp ecosystem.config.cjs root@178.104.77.218:/root/generic-barber/
```

When prompted for password, enter your VPS root password.

## Step 2: SSH into the VPS and run these commands:

```bash
ssh root@178.104.77.218
```

Then once connected, run:

```bash
cd /root/generic-barber

# Delete the old PM2 process
pm2 delete barber-db

# Wait a moment
sleep 2

# Start with the ecosystem config file
pm2 start ecosystem.config.cjs

# Save PM2 configuration for auto-start on reboot
pm2 save

# Verify the process started and check env vars
pm2 show barber-db

# Test the endpoint with the correct token
export TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"

curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $TOKEN" \
  --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}'
```

## Expected Result

You should see a **201 Created** response (or possibly 200 OK) with a JSON body containing the tenant data, instead of the **401 Unauthorized** you were getting before.

## If you need to troubleshoot:

```bash
# Check PM2 logs
pm2 logs barber-db --lines 50

# Verify the process is actually running
pm2 list

# Check if port 3001 is listening
ss -ltnp | grep 3001

# Manual test without exporting TOKEN variable (inline):
curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H 'x-admin-token: e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e' \
  --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}'
```
