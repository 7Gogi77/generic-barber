#!/bin/bash
# VPS Auto-Recovery Script
# Fixes common issues causing 404 errors

set -e

echo "=== VPS Database Server Auto-Recovery ==="
cd /root/generic-barber

echo "[1/5] Ensuring data directories exist..."
mkdir -p /root/generic-barber/data/tenants
echo "✓ Directories created"

echo "[2/5] Checking if process is running..."
if pm2 list | grep -q "barber-db"; then
    if pm2 show barber-db | grep -q "online"; then
        echo "✓ Process barber-db is already online"
    else
        echo "! Process found but not online. Restarting..."
        pm2 restart barber-db
        sleep 3
    fi
else
    echo "! Process not found. Starting with ecosystem config..."
    pm2 start ecosystem.config.cjs
    sleep 3
fi

echo "[3/5] Verifying port 3001 is listening..."
if ss -ltnp 2>/dev/null | grep -q ":3001"; then
    echo "✓ Port 3001 is listening"
else
    echo "! Port 3001 not listening. Checking PM2 logs..."
    pm2 logs barber-db --lines 20
    echo ""
    echo "Attempting to restart..."
    pm2 delete barber-db 2>/dev/null || true
    sleep 2
    pm2 start ecosystem.config.cjs
    sleep 3
    
    if ss -ltnp 2>/dev/null | grep -q ":3001"; then
        echo "✓ Port now listening after restart"
    else
        echo "✗ Port still not listening. Check PM2 logs for errors."
        pm2 logs barber-db --lines 50
        exit 1
    fi
fi

echo "[4/5] Testing health endpoint..."
HEALTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health)
if [ "$HEALTH_TEST" = "200" ] || [ "$HEALTH_TEST" = "404" ]; then
    echo "✓ Server responding (HTTP $HEALTH_TEST)"
else
    echo "✗ Server not responding properly (HTTP $HEALTH_TEST)"
    exit 1
fi

echo "[5/5] Testing admin endpoint..."
TOKEN="$(grep -oP 'VPS_DB_ADMIN_TOKEN:\s*\K[^"]+' ecosystem.config.cjs | head -1)"
if [ -z "$TOKEN" ]; then
    echo "! Token not found in ecosystem config"
    TOKEN="ROTATE_THIS_TOKEN_BEFORE_PRODUCTION"
fi

ADMIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3001/_admin/tenants \
    -H "Content-Type: application/json" \
    -H "x-admin-token: $TOKEN" \
    --data '{"tenantId":"recovery-test"}')

if [ "$ADMIN_TEST" = "201" ] || [ "$ADMIN_TEST" = "409" ]; then
    echo "✓ Admin endpoint responding (HTTP $ADMIN_TEST)"
else
    echo "✗ Admin endpoint returned error (HTTP $ADMIN_TEST)"
    echo "  Expected 201 (created) or 409 (already exists)"
fi

echo ""
echo "=== Recovery Complete ==="
echo "Status: $(pm2 show barber-db | grep status | awk '{print $NF}')"
echo "Port: $(ss -ltnp 2>/dev/null | grep 3001 | awk '{print $4}' || echo 'Not found')"
echo ""
echo "If issues persist, check PM2 logs:"
echo "  pm2 logs barber-db --lines 100"
