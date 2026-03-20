#!/bin/bash
# Fix VPS PM2 configuration to include VPS_DB_ADMIN_TOKEN

set -e

cd /root/generic-barber

# 1. Delete old PM2 process if it exists
echo "Deleting old PM2 process..."
pm2 delete barber-db 2>/dev/null || true

# 2. Wait a moment for PM2 to clean up
sleep 2

# 3. Start the process using the ecosystem config
echo "Starting new PM2 process with ecosystem.config.cjs..."
pm2 start ecosystem.config.cjs

# 4. Save PM2 configuration to persist on reboot
echo "Saving PM2 configuration..."
pm2 save

# 5. Wait for process to fully start
sleep 3

# 6. Verify the process is running
echo ""
echo "==== PM2 Process List ===="
pm2 list

echo ""
echo "==== Checking Environment Variables ===="
pm2 show barber-db | grep -A 15 "env:"

# 7. Test the endpoint with the correct token
echo ""
echo "==== Testing Admin Endpoint ===="
export TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"

curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $TOKEN" \
  --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}'

echo ""
echo "==== Fix Complete ===="
