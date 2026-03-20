# VPS 404 Error Troubleshooting Guide

## Problem
When trying to provision a new tenant, the API returns:
```
Error: VPS tenant provisioning failed (404)
```

## Root Causes & Solutions

### 1. PM2 Process Crashed
**Symptoms:**
- `pm2 list` shows process is not running or status is "stopped"
- `curl http://127.0.0.1:3001/health` returns "Connection refused"

**Solution:**
```bash
# Check status
pm2 show barber-db

# Restart the process
pm2 restart barber-db
pm2 save

# Verify it's running
pm2 list
```

**If restart fails:**
```bash
pm2 delete barber-db
sleep 2
pm2 start ecosystem.config.cjs
pm2 save
```

### 2. Data Directory Missing
**Symptoms:**
- PM2 process crashes immediately after starting
- Logs show "ENOENT" or "no such file or directory"

**Solution:**
```bash
# Create the required directories
mkdir -p /root/generic-barber/data/tenants

# Verify directories exist
ls -la /root/generic-barber/data/

# Restart PM2
pm2 restart barber-db
```

### 3. Port 3001 Not Listening
**Symptoms:**
- PM2 shows "online" status
- `ss -ltnp | grep 3001` returns nothing
- `curl http://127.0.0.1:3001/health` returns "Connection refused"

**Solution:**
```bash
# Check if something else is using port 3001
ss -ltnp | grep 3001

# If port is in use by another process:
kill -9 <PID>

# Restart PM2
pm2 delete barber-db
sleep 2
pm2 start ecosystem.config.cjs
pm2 save

# Verify port is listening
ss -ltnp | grep 3001
```

### 4. Authentication Token Mismatch
**Symptoms:**
- Health endpoint responds (200)
- Admin endpoint returns 401 Unauthorized instead of 404
- Logs show "Unauthorized"

**Solution:**
Verify the token in PM2 matches your test:
```bash
# Check what token is in the running process
pm2 show barber-db | grep VPS_DB_ADMIN_TOKEN

# Use the correct token in your curl test
export TOKEN="<token-from-pm2>"
curl -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"test"}'
```

### 5. Server Code Issue
**Symptoms:**
- PM2 process crashes on startup with error logs
- Health endpoint returns 404
- No clear error messages in `pm2 logs`

**Solution:**
Run the server in foreground to see the error:
```bash
cd /root/generic-barber

# Set environment variables
export VPS_DB_ADMIN_TOKEN="your-token-here"
export PORT=3001
export HOST="0.0.0.0"
export PUBLIC_BASE_URL="http://booking-cx33-server.hetzner.com"

# Run the server directly
node server/vps-db-server.mjs

# You should see: "Server listening on http://0.0.0.0:3001"
# If you see an error, note it and report
```

### 6. Vercel API Credentials Missing
**Symptoms:**
- Provisioning works for the VPS part but fails overall
- Error happens in Vercel project creation, not VPS
- Vercel logs show authentication errors

**Solution:**
Check Vercel environment variables:
```bash
# From your Vercel dashboard, verify these are set:
# - VERCEL_TOKEN (API token with project:write scope)
# - VERCEL_REPO_ID (The template project repository ID)
# - VERCEL_TEAM_ID (Your Vercel team ID)
# - VPS_DB_ADMIN_TOKEN (The VPS server admin token)

# If any are missing, add them and redeploy:
vercel env list  # See current env vars
vercel deploy --prod  # Redeploy to apply changes
```

---

## Quick Diagnostic Steps

Run this command on your VPS to get a full diagnostic report:

```bash
cd /root/generic-barber
bash vps-diagnostic.sh
```

This will show:
- PM2 process status
- Port 3001 listener status
- Data directory existence
- Server health check results
- Recent error logs

---

## Auto-Recovery Script

If you need automatic recovery:

```bash
cd /root/generic-barber
bash vps-recovery.sh
```

This script will:
1. Create missing data directories
2. Restart crashed processes
3. Verify port 3001 is listening
4. Test both health and admin endpoints
5. Report final status

---

## Manual Testing

### Test 1: Server Health
```bash
curl -i http://127.0.0.1:3001/health
# Expected: HTTP 200 or 404 (either means server is running)
```

### Test 2: Admin Endpoint (with correct token)
```bash
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
curl -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"manual-test","businessName":"Manual Test"}'

# Expected: HTTP 201 Created with JSON response
# If 401: Token mismatch
# If 404: Server not running
# If 409: Tenant already exists (expected on retry)
```

### Test 3: Check Tenant Was Created
```bash
cat /root/generic-barber/data/tenants-registry.json | grep "manual-test"
```

---

## Common Log Messages & Meanings

| Message | Meaning | Solution |
|---------|---------|----------|
| "ENOENT: no such file or directory" | Data directory missing | `mkdir -p /root/generic-barber/data/tenants` |
| "EADDRINUSE: Address already in use" | Port 3001 taken | Check with `ss -ltnp \| grep 3001` and kill the process |
| "Connection refused" | PM2 process crashed | `pm2 restart barber-db` |
| "Unauthorized" | Invalid token | Verify token in PM2 matches your curl header |
| "Cannot find module" | Missing dependency | `cd /root/generic-barber && npm install` |

---

## If Nothing Works

1. **Get detailed logs:**
   ```bash
   pm2 logs barber-db --lines 100
   ```

2. **Run server in foreground:**
   ```bash
   cd /root/generic-barber
   export VPS_DB_ADMIN_TOKEN="your-token"
   export PORT=3001
   node server/vps-db-server.mjs
   ```

3. **Check system resources:**
   ```bash
   ps aux | grep node
   free -h
   df -h
   ```

4. **Verify file permissions:**
   ```bash
   ls -la /root/generic-barber/data/
   chmod -R 755 /root/generic-barber/data/
   ```

5. **Restart PM2 daemon:**
   ```bash
   pm2 kill
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

---

## Prevention

To prevent 404 errors in the future:

1. **Monitor PM2 process:**
   ```bash
   # Setup PM2 hourly restart to clear memory leaks
   pm2 cron "0 * * * *" restart barber-db
   ```

2. **Setup alerting:**
   ```bash
   # Alert if process crashes
   pm2 trigger barber-db 'stop' 'mail my-email@example.com'
   ```

3. **Regular restarts:**
   ```bash
   # Restart every 6 hours to prevent hanging connections
   pm2 cron "0 */6 * * *" restart barber-db
   ```

4. **Check disk space:**
   ```bash
   # Data directory might fill up
   du -sh /root/generic-barber/data/
   ```

---

## Contact/Support

If you've tried all these steps and the issue persists:

1. Run the diagnostic script and save the output
2. Check the PM2 logs (save last 100 lines)
3. Note the exact error message you're seeing
4. Share this information with the development team
