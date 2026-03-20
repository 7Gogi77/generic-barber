#!/bin/bash
# Complete VPS 404 diagnostics - Run this to get detailed information

echo "=== Complete VPS 404 Provisioning Diagnostics ==="
echo "Time: $(date)"
echo ""

# TEST 1: Health endpoint
echo "[TEST 1] Health Endpoint"
echo "Command: curl -i http://127.0.0.1:3001/health"
curl -s -i http://127.0.0.1:3001/health
echo ""
echo ""

# TEST 2: Admin endpoint with token
echo "[TEST 2] Admin Endpoint (Tenant Creation)"
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
echo "Token: $TOKEN"
echo "Command: curl -i -X POST http://127.0.0.1:3001/_admin/tenants ..."
RESPONSE=$(curl -s -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"diagnostic-test-'$(date +%s)'","businessName":"Diagnostic Test"}')
echo "$RESPONSE"
echo ""
echo ""

# TEST 3: Check token in environment
echo "[TEST 3] Token in Running Process"
echo "Command: pm2 env 0 | grep VPS_DB_ADMIN_TOKEN"
pm2 env 0 | grep VPS_DB_ADMIN_TOKEN || echo "Token not found in env"
echo ""
echo ""

# TEST 4: Check port listener
echo "[TEST 4] Port 3001 Listener Status"
echo "Command: ss -ltnp | grep 3001"
ss -ltnp | grep 3001 || echo "Port not found"
echo ""
echo ""

# TEST 5: Check data directory
echo "[TEST 5] Data Directory Status"
echo "Tenants registry:"
if [ -f /root/generic-barber/data/tenants-registry.json ]; then
  cat /root/generic-barber/data/tenants-registry.json | head -20
else
  echo "File not found"
fi
echo ""
echo ""

# TEST 6: Recent PM2 logs
echo "[TEST 6] PM2 Logs (Last 30 lines)"
pm2 logs barber-db --lines 30 --nostream
echo ""
echo ""

# TEST 7: Network connectivity test
echo "[TEST 7] Network Test"
echo "Can we reach localhost:3001?"
if timeout 2 bash -c "</dev/tcp/127.0.0.1/3001" 2>/dev/null; then
  echo "✓ Port 3001 is reachable"
else
  echo "✗ Port 3001 cannot be reached"
fi
echo ""
echo ""

echo "=== End Diagnostics ==="
