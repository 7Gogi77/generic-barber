# VPS 404 Provisioning Error - Complete Diagnosis Guide

## What the Error Means

When creating a site via `/site-factory.html`, you got "VPS tenant provisioning failed (404)". This error happens when:

1. The Vercel API (`/api/provision-site`) is called
2. It tries to reach the VPS endpoint (`http://127.0.0.1:3001/_admin/tenants`)
3. The VPS endpoint returns 404 or is unreachable

**Good news:** Your VPS server IS running and listening on port 3001.  
**Problem:** The Vercel provisioning API might not be finding/reaching it correctly.

## Diagnostic Plan

### Step 1: Test VPS Endpoints Directly

SSH to your VPS and run:

```bash
cd /root/generic-barber

# Test the health endpoint
curl -i http://127.0.0.1:3001/health

# Test the admin endpoint
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
curl -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"direct-test","businessName":"Direct Test"}'
```

**Expected responses:**
- Health: `HTTP 200 OK`
- Admin: `HTTP 201 Created` with JSON body

**If you get 404:** Run the full diagnostic:
```bash
bash full-vps-diagnostic.sh > diagnostic-report.txt
```

### Step 2: Check Vercel Environment Variables

Are these set in your Vercel project?
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_REPO_ID` - Template project repository ID  
- `VERCEL_TEAM_ID` - Your Vercel team ID
- `VPS_DB_ADMIN_TOKEN` - The token from above
- `VPS_DB_HOST` or hardcoded in code

Go to: Vercel Dashboard → Project Settings → Environment Variables

### Step 3: Check Vercel Logs

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click "Deployments"
4. Select the latest deployment
5. Click "Logs" tab
6. Look for errors from `/api/provision-site`

### Step 4: Check Vercel Server Logs in Detail

Add logging to understand what's happening. The issue is likely in `api/provision-site.js`:

```bash
# On your VPS, check what's being called:
pm2 logs barber-db --lines 100 | grep -i "admin\|provision\|error"
```

## Common Causes

### Cause 1: VPS Endpoint Not Accessible from Vercel
**Symptoms:**
- VPS tests work (`curl` from VPS works)
- Vercel logs show connection timeout

**Solution:**
Check network connectivity. The VPS might not be reachable from Vercel due to:
- Firewall rules
- Network configuration
- Wrong IP/hostname

Verify in `api/provision-site.js`, what URL is being used?

### Cause 2: Wrong Token
**Symptoms:**
- Admin endpoint returns `401 Unauthorized`
- Token in PM2 env doesn't match what Vercel is sending

**Solution:**
```bash
# Check token in running process
pm2 env 0 | grep VPS_DB_ADMIN_TOKEN
pm2 show barber-db | grep -i token

# Verify Vercel has the same token
# Go to Vercel dashboard and check VPS_DB_ADMIN_TOKEN env var
```

### Cause 3: API Endpoint Path Wrong
**Symptoms:**
- VPS responds to other paths but not `/admin/tenants`
- PM2 logs show request is received but returns 404

**Solution:**
Check the route in `server/vps-db-server.mjs`:

```bash
grep -n "_admin/tenants" /root/generic-barber/server/vps-db-server.mjs
```

Should see the route defined.

### Cause 4: Vercel API Not Deployed
**Symptoms:**
- `/api/provision-site` endpoint doesn't exist
- Vercel returns 404 for the API itself (not VPS)

**Solution:**
Redeploy to Vercel:
```bash
vercel deploy --prod
```

## Step-by-Step Action Plan

### Action 1: Run Full Diagnostic (2 minutes)
```bash
ssh root@178.104.77.218
cd /root/generic-barber
bash full-vps-diagnostic.sh
```
Copy the output and save it.

### Action 2: Test Each Layer
1. **VPS Health:** `curl http://127.0.0.1:3001/health`
2. **VPS Admin:** `curl -X POST http://127.0.0.1:3001/_admin/tenants -H "x-admin-token: ..." ...`
3. **Vercel Endpoint:** Open `/api/provision-site` endpoint directly in browser (should show API response or error)
4. **Full Flow:** Try creating a site again and check Vercel logs

### Action 3: Check Vercel Logs (3 minutes)
1. Go to Vercel dashboard
2. Select project
3. Show latest deployment logs
4. Look for provision-site errors

### Action 4: Verify Configuration
```bash
# On VPS
pm2 env 0 | grep -E "VPS_DB|PORT|HOST|PUBLIC_BASE"

# On Vercel dashboard
# Check: VERCEL_TOKEN, VERCEL_REPO_ID, VERCEL_TEAM_ID, VPS_DB_ADMIN_TOKEN
```

## What to Do Next

1. **Run the diagnostic script** on your VPS and share the output
2. **Check Vercel logs** and note any error messages
3. **Test direct curl calls** to both endpoints
4. **Verify environment variables** are set correctly in both places
5. **Report findings** with exact error messages

Once I see the diagnostic output and Vercel logs, I can identify the exact issue.

## Files to Check

- **VPS:** `/root/generic-barber/server/vps-db-server.mjs` - The database server
- **Vercel:** `api/provision-site.js` - The provisioning API
- **Vercel:** `api/_lib/site-factory.js` - Helper functions
- **VPS Config:** `/root/generic-barber/ecosystem.config.cjs` - PM2 configuration

## Quick Reference

```bash
# Fastest diagnostic
bash full-vps-diagnostic.sh

# Quick health check
curl -i http://127.0.0.1:3001/health

# Test admin endpoint
TOKEN="e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e"
curl -i -X POST http://127.0.0.1:3001/_admin/tenants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  --data '{"tenantId":"test","businessName":"Test"}'

# Check environment
pm2 env 0

# Check logs
pm2 logs barber-db --lines 50
```

## Next Steps

Share the output of:
1. `bash full-vps-diagnostic.sh`
2. Vercel deployment logs
3. Any error messages you see

With this information, I can pinpoint the exact issue and provide the fix.
