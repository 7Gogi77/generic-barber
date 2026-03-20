#!/bin/bash
# VPS PM2 Fix - All-in-one deployment script
# Run this on the VPS after copying ecosystem.config.cjs

cd /root/generic-barber || exit 1

echo "[1/6] Deleting old PM2 process..."
pm2 delete barber-db 2>/dev/null || true

echo "[2/6] Waiting for cleanup..."
sleep 2

echo "[3/6] Starting new PM2 process with ecosystem config..."
pm2 start ecosystem.config.cjs --interpreter node

echo "[4/6] Saving PM2 configuration..."
pm2 save

echo "[5/6] Waiting for process startup..."
sleep 3

echo "[6/6] Verifying installation..."
echo ""
echo "=== PM2 Process Status ==="
pm2 list
echo ""

# Check if process is online
if pm2 list | grep -q "barber-db.*online"; then
    echo "✓ Process is online"
    sleep 1
    
    # Test the endpoint
    echo ""
    echo "=== Testing Admin Endpoint ==="
    TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
    
    curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
      -H 'Content-Type: application/json' \
      -H "x-admin-token: $TOKEN" \
      --data-raw '{"tenantId":"test-tenant","businessName":"Test Tenant"}' 2>/dev/null || echo "curl failed"
    
    echo ""
    echo "✓ VPS PM2 Fix Complete!"
else
    echo "✗ Process failed to start. Check logs:"
    echo ""
    pm2 logs barber-db --lines 20
fi
