# VPS 404 Error Resolution - Quick Action Guide

## ⚠️ Your Issue

When trying to create a site via site-factory.html:
```
Error: VPS tenant provisioning failed (404)
```

## 🎯 Root Cause

Missing Vercel environment variable: `SITE_FACTORY_VPS_ADMIN_URL`

This tells the provisioning API where to send requests to the VPS server.

## ✅ Fix (5 Minutes)

### 1. Go to Vercel Settings (1 min)
https://vercel.com/dashboard → Your Project → Settings → Environment Variables

### 2. Add The Missing Variable (2 min)
Click **Add New** and fill in:
```
Name:  SITE_FACTORY_VPS_ADMIN_URL
Value: http://178.104.77.218:3001/_admin/tenants
```
Select: Production, Preview, Development

Click **Save**

### 3. Redeploy (2 min)
Run in terminal:
```bash
vercel deploy --prod
```
Or in Vercel dashboard: Select latest deployment → **Redeploy**

### 4. Test (1 min)
Wait 2-3 minutes, then try creating a tenant again via `/site-factory.html`

## 📋 Verify All Required Env Vars

While you're in Vercel settings, check these are also set:

- ✅ `SITE_FACTORY_VPS_ADMIN_URL` = `http://178.104.77.218:3001/_admin/tenants` **(JUST ADDED)**
- ✅ `VPS_DB_ADMIN_TOKEN` = `e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e`
- ✅ `VERCEL_ACCESS_TOKEN` = (your Vercel API token)
- ✅ `VERCEL_TEMPLATE_REPO` = (your template repo)
- ✅ `VERCEL_TEAM_ID` = (your team ID - optional but recommended)

## 🧪 Quick Test After Fix

Try this curl command to verify the VPS endpoint is reachable:
```bash
curl -i http://178.104.77.218:3001/health
```

Should return: `HTTP 200 OK`

## 📚 For More Details

- **Full diagnosis guide:** [`VPS_404_DIAGNOSIS.md`](VPS_404_DIAGNOSIS.md)
- **Complete fix guide:** [`VPS_404_FIX.md`](VPS_404_FIX.md)
- **Diagnostic script:** `bash full-vps-diagnostic.sh` (run on VPS)

## 🎬 After Fix

Once deployed:
1. Your VPS will be properly connected to Vercel
2. Site factory will be able to create tenants on the VPS
3. Each new site will get its own database URL
4. Everything should work end-to-end

## ❓ If Still Having Issues

After redeploying, try creating a site and note:
1. **Exact error message** you see
2. **Vercel logs:** Dashboard → Deployments → Latest → Logs
3. **VPS logs:** Run `bash full-vps-diagnostic.sh` on VPS
4. Report both with the error details

**Status:** VPS server is running correctly. Just needs the Vercel env var to connect to it.

Now go add that environment variable! 👇
