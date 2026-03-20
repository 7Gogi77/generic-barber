# VPS 404 Error - ROOT CAUSE IDENTIFIED & FIX

## The Problem

Your Vercel provisioning API is missing a critical environment variable:
```
SITE_FACTORY_VPS_ADMIN_URL
```

This variable tells the Vercel API where to find the VPS admin endpoint.

Without it, when you try to create a site via site-factory.html, the API has no idea where to send the tenant creation request, resulting in a 404 error.

## The Solution (3 Steps)

### Step 1: Add Environment Variable to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Fill in:
   - **Name:** `SITE_FACTORY_VPS_ADMIN_URL`
   - **Value:** `http://178.104.77.218:3001/_admin/tenants`
   - **Environments:** Select "Production", "Preview", and "Development"
6. Click **Save**

### Step 2: Verify All Required Vercel Environment Variables

Your Vercel project needs these variables set:

| Variable | Value | Purpose |
|----------|-------|---------|
| `SITE_FACTORY_VPS_ADMIN_URL` | `http://178.104.77.218:3001/_admin/tenants` | **NEW: Where to create tenants on VPS** |
| `VPS_DB_ADMIN_TOKEN` | `e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e` | Auth token for VPS |
| `VERCEL_ACCESS_TOKEN` | `(Your Vercel API token)` | For creating Vercel projects |
| `VERCEL_TEMPLATE_REPO` | `7Gogi77/generic-barber` (or your repo) | Template repo |
| `VERCEL_TEAM_ID` | `(Your team ID)` | Your Vercel team |

Check each one in Vercel Settings → Environment Variables.

### Step 3: Redeploy to Vercel

After adding the environment variable, redeploy:

```bash
# From your local machine in the project directory
vercel deploy --prod

# Or from Vercel dashboard: Select project → Deployments → Redeploy
```

## Verification

After redeploying, try creating a tenant again via `/site-factory.html`. You should see:
- ✅ Form submits successfully
- ✅ Progress indicator shows "Creating Vercel project..."
- ✅ Success message with new site URL

## Why This Happened

The code in `api/_lib/site-factory.js` requires this env var:

```javascript
const endpoint = String(process.env.SITE_FACTORY_VPS_ADMIN_URL || '').trim();

if (!endpoint) {
  throw new Error('SITE_FACTORY_VPS_ADMIN_URL not configured');
}
```

When it's not set, the endpoint is empty, and the API can't reach the VPS, causing a 404.

## Testing

Once redeployed, you can test directly:

```bash
# Test the Vercel API
curl -X POST "https://your-vercel-domain/api/provision-site" \
  -H "Content-Type: application/json" \
  -H "X-Site-Factory-Key: $(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 64 | head -n 1)" \
  --data '{
    "businessName": "Test Salon",
    "slug": "test-salon",
    "adminPassword": "TestPassword123!",
    "serviceType": "barbershop"
  }'
```

Should return either:
- ✅ `201 Created` with site details
- ⚠️ `400` if validation fails (but shows it's working)
- ❌ `500` if there's still an error (check Vercel logs)

## Troubleshooting

If you still see 404 after adding the env var:

1. **Verify the URL is correct:**
   - Open: `http://178.104.77.218:3001/health` (from anywhere with network access)
   - Should return `200 OK`

2. **Check Vercel logs again:**
   - Dashboard → Project → Deployments → Latest → Logs
   - Look for: `SITE_FACTORY_VPS_ADMIN_URL`
   - Should show the URL is being used

3. **Verify the token:**
   - VPS: `pm2 env 0 | grep VPS_DB_ADMIN_TOKEN`
   - Vercel: Settings → Environment Variables → Check `VPS_DB_ADMIN_TOKEN`
   - Both should be: `e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e`

4. **Test VPS endpoint directly:**
   ```bash
   curl -i -X POST "http://178.104.77.218:3001/_admin/tenants" \
     -H "Content-Type: application/json" \
     -H "x-admin-token: e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e" \
     --data '{"tenantId":"test","businessName":"Test"}'
   ```
   Should return `201 Created`

## Complete Checklist

- [ ] Add `SITE_FACTORY_VPS_ADMIN_URL` to Vercel env vars
- [ ] Value is: `http://178.104.77.218:3001/_admin/tenants`
- [ ] Include in Production, Preview, and Development environments
- [ ] Verify `VPS_DB_ADMIN_TOKEN` is also set
- [ ] Verify `VERCEL_ACCESS_TOKEN` is set
- [ ] Verify `VERCEL_TEMPLATE_REPO` is set
- [ ] Redeploy to Vercel: `vercel deploy --prod`
- [ ] Wait 2-3 minutes for deployment to complete
- [ ] Test via `/site-factory.html`
- [ ] Try creating a tenant
- [ ] Check Vercel logs if any errors

## Summary

**Root Cause:** Missing `SITE_FACTORY_VPS_ADMIN_URL` environment variable in Vercel project

**Fix:** Add the environment variable and redeploy

**Expected Result:** Provisioning will work and create tenants on VPS

Let me know once you've added the env var and redeployed, then try creating a tenant again!
