#!/bin/bash
# VPS Diagnostic Script
# Run this on the VPS to diagnose the 404 error

echo "=== VPS Database Server Diagnostic Report ==="
echo "Date: $(date)"
echo ""

echo "1. PM2 Process Status"
pm2 list
echo ""

echo "2. PM2 Process Details (barber-db)"
pm2 show barber-db 2>/dev/null || echo "Process not found"
echo ""

echo "3. Process Running Check"
ps aux | grep "vps-db-server" | grep -v grep || echo "Server process not running"
echo ""

echo "4. Port 3001 Listener Status"
ss -ltnp 2>/dev/null | grep 3001 || echo "Port 3001 not listening"
echo ""

echo "5. Data Directory Check"
echo "Data directory exists: $(test -d /root/generic-barber/data && echo 'YES' || echo 'NO')"
echo "Tenants directory exists: $(test -d /root/generic-barber/data/tenants && echo 'YES' || echo 'NO')"
echo "Registry file exists: $(test -f /root/generic-barber/data/tenants-registry.json && echo 'YES' || echo 'NO')"
echo ""

echo "6. PM2 Error Logs (Last 30 lines)"
pm2 logs barber-db --lines 30 --nostream 2>/dev/null || echo "No logs available"
echo ""

echo "7. Quick Health Test"
echo "Testing server endpoint..."
curl -s -i http://127.0.0.1:3001/health 2>&1 | head -1 || echo "Connection refused"
echo ""

echo "=== End Diagnostic Report ==="
