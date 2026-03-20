# VPS 404 Error - Immediate Action Guide

## Issue
VPS tenant provisioning is failing with HTTP 404 error, indicating the server is not responding.

## What This Means
The VPS database server (`barber-db` PM2 process) is either:
- Not running (crashed or stopped)
- Not listening on port 3001 (port binding failed)
- Data directories missing (initialization error)
- Server code error preventing startup

## Immediate Action (Choose One)

### Option A: Automatic Recovery (Fastest)
```bash
# SSH to VPS
ssh root@178.104.77.218

# Navigate to project
cd /root/generic-barber

# Run auto-recovery script
bash vps-recovery.sh

# This will:
# - Ensure data directories exist
# - Check/restart PM2 process
# - Verify port 3001 is listening
# - Test both health and admin endpoints
# - Report final status
```

### Option B: Manual Diagnosis (Recommended)
```bash
# SSH to VPS
ssh root@178.104.77.218

# Navigate to project
cd /root/generic-barber

# Run diagnostic script
bash vps-diagnostic.sh

# This will show:
# 1. PM2 process status
# 2. Process details (barber-db)
# 3. Running process check
# 4. Port 3001 listener status
# 5. Data directory checks
# 6. Error logs (last 30 lines)
# 7. Health endpoint test

# Based on the output, apply the appropriate fix below
```

### Option C: Quick Manual Fix
```bash
# SSH to VPS
ssh root@178.104.77.218

cd /root/generic-barber

# Step 1: Ensure directories exist
mkdir -p /root/generic-barber/data/tenants

# Step 2: Restart PM2
pm2 delete barber-db 2>/dev/null || true
sleep 2
pm2 start ecosystem.config.cjs
pm2 save

# Step 3: Wait for startup
sleep 3

# Step 4: Verify port is listening
ss -ltnp | grep 3001

# Step 5: Test the endpoint
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
curl -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"recovery-test"}'

# Expected: HTTP 201 Created (or 409 if already exists)
```

---

## Detailed Troubleshooting Map

### If diagnostic shows PM2 process not running:
```bash
pm2 start ecosystem.config.cjs
pm2 save
sleep 3
pm2 list  # Verify it's online
```

### If diagnostic shows port 3001 not listening:
```bash
# Check what's using the port
ss -ltnp | grep 3001

# Check PM2 logs for errors
pm2 logs barber-db --lines 50

# If logs show "ENOENT" (missing directory):
mkdir -p /root/generic-barber/data/tenants
pm2 restart barber-db

# If logs show other errors, note them and report
```

### If diagnostic shows data directories missing:
```bash
mkdir -p /root/generic-barber/data/tenants
pm2 restart barber-db
sleep 3
```

### If health test shows error:
```bash
# Run server in foreground to see the actual error
cd /root/generic-barber
export VPS_DB_ADMIN_TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
export PORT=3001
export HOST="0.0.0.0"
export PUBLIC_BASE_URL="http://booking-cx33-server.hetzner.com"

node server/vps-db-server.mjs
# This will show the exact error

# Press Ctrl+C to stop
# Then restart with PM2:
pm2 restart barber-db
```

---

## Verification Steps

After running recovery or fixes, verify the system is working:

### 1. Check PM2 Status
```bash
pm2 list
# You should see: barber-db | fork | online
```

### 2. Check Port Listening
```bash
ss -ltnp | grep 3001
# You should see: LISTEN with port :3001
```

### 3. Test Health Endpoint
```bash
curl -i http://127.0.0.1:3001/health
# Expected: HTTP 200 OK
```

### 4. Test Admin Endpoint
```bash
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
curl -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"verify-test"}'
# Expected: HTTP 201 Created
```

### 5. Retry Provisioning
Once all 4 tests pass, try creating a tenant from `/site-factory.html` again.

---

## File References

| File | Purpose |
|------|---------|
| `VPS_404_TROUBLESHOOTING.md` | Comprehensive troubleshooting guide with all root causes |
| `vps-diagnostic.sh` | Automated diagnostic script |
| `vps-recovery.sh` | Automated recovery script |
| `OPERATIONAL_STATUS.md` | System architecture and status |
| `QUICK_START.md` | Quick reference guide |

---

## If Recovery Doesn't Work

If after running the recovery/diagnostic scripts the issue persists:

1. **Collect detailed information:**
   ```bash
   # Save all diagnostic output
   cd /root/generic-barber
   bash vps-diagnostic.sh > diagnostic-report.txt
   pm2 logs barber-db --lines 100 > pm2-logs.txt
   ```

2. **Check system resources:**
   ```bash
   ps aux | grep node
   free -h
   df -h /root/generic-barber
   ```

3. **Verify file permissions:**
   ```bash
   ls -la /root/generic-barber/data/
   chmod -R 755 /root/generic-barber/data/
   ```

4. **Check if dependencies are installed:**
   ```bash
   cd /root/generic-barber
   npm list --depth=0
   ```

5. **Run server in foreground:**
   ```bash
   cd /root/generic-barber
   export VPS_DB_ADMIN_TOKEN="your-token"
   export PORT=3001
   node server/vps-db-server.mjs 2>&1 | tee server-output.txt
   # Let it run for 30 seconds then Ctrl+C
   cat server-output.txt
   ```

6. **Report these details along with:**
   - Output of `vps-diagnostic.sh`
   - PM2 logs (50+ lines)
   - Server foreground output (if any errors)
   - System resource usage

---

## Success Criteria

You'll know the fix worked when:
✅ `pm2 list` shows barber-db with status "online"  
✅ `ss -ltnp | grep 3001` shows port listening  
✅ `curl http://127.0.0.1:3001/health` returns 200  
✅ Admin endpoint returns 201 Created (not 404)  
✅ `/site-factory.html` successfully creates tenants  

---

## Prevention

To prevent this in the future:

```bash
# Setup automatic daily restart to clear memory leaks
pm2 cron "0 0 * * *" restart barber-db

# Setup monitoring (requires pm2 plus):
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# Keep PM2 updated
pm2 update
```

---

## Next Steps

1. Run one of the recovery options above (A, B, or C)
2. Verify all 5 verification steps pass
3. Try provisioning again via `/site-factory.html`
4. If still having issues, collect the detailed information and report

The system should be back online within 2-3 minutes!
