# 🚀 Multi-Tenant Site Factory - Quick Start Guide

## What Is This?

A complete SaaS system that allows non-technical staff to provision new barber booking sites in minutes. Each new site gets:
- ✅ Own Vercel deployment
- ✅ Own database on VPS
- ✅ Isolated configuration
- ✅ Live production URL

## Where to Start

### 1. **Test the System** (First-time users)
Go to `/site-factory.html` in your Vercel deployment.

Fill in:
- Tenant ID: `my-test-salon` (unique identifier)
- Business Name: `My Test Salon`
- Service Type: Choose from dropdown
- Working Days: Select days
- Public Base URL: `http://your-domain.com`

Click "Create Site" and wait ~20-30 seconds.

Expected result: Green success message with new site URL and database URL.

### 2. **Understanding the Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                 Vercel Deployment                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  /site-factory.html - Admin UI for provisioning    │ │
│  │  /api/provision-site - Main provisioning logic     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │ Creates project + injects env vars
                   ▼
        ┌──────────────────────┐
        │  Vercel Projects     │
        │  (One per tenant)    │
        └──────────────────────┘
                   │
        Uses database URL ──┐
                            │
                            ▼
        ┌──────────────────────────────────┐
        │  VPS Database Server (Port 3001) │
        │  (178.104.77.218:3001)           │
        │  Stores tenant data & config     │
        └──────────────────────────────────┘
```

### 3. **System Health Check**

To verify everything is running:

```bash
# SSH to VPS
ssh root@178.104.77.218

# Check PM2 process
pm2 list
pm2 show barber-db

# Quick health test
curl -i http://127.0.0.1:3001/health

# Check tenant data
cat /root/generic-barber/data/tenants-registry.json
```

### 4. **Access Created Sites**

After successful provisioning, you'll get:
- **Site URL**: Where users book appointments (hosted on Vercel)
- **Database URL**: Where each site's data is stored (on VPS)
- **Admin URL**: Where staff manage the site

Each created site is completely independent.

---

## Common Tasks

### Add a New Tenant (Non-technical)
1. Open `/site-factory.html`
2. Fill form
3. Click "Create Site"
4. Done! Site is live.

### Check Tenant Data (Technical)
```bash
ssh root@178.104.77.218
cat /root/generic-barber/data/tenants/[tenant-id].json
```

### Verify VPS Connectivity
```bash
# From anywhere with network access to VPS
curl -i http://178.104.77.218:3001/health

# With authentication (test permission)
curl -i -X POST http://178.104.77.218:3001/_admin/tenants \
  -H "x-admin-token: [token]" \
  -H "Content-Type: application/json" \
  --data '{"tenantId":"test"}'
```

### Restart Services
```bash
ssh root@178.104.77.218
cd /root/generic-barber

# Restart the database server
pm2 restart barber-db

# Or restart everything
pm2 restart all
pm2 save  # Save for auto-start on reboot
```

---

## File Navigation

### For Checking System Status
→ `OPERATIONAL_STATUS.md` - Current architecture and diagnostics

### For Provisioning Issues
→ `VPS_PM2_COMPLETE_FIX.md` - Deployment troubleshooting

### For Security Questions
→ `TOKEN_ROTATION_GUIDE.md` - How to rotate the admin token

### For Configuration Details
→ `SITE_FACTORY_SETUP.md` - Configuration reference with VPS IP

### For Implementation Details
→ `IMPLEMENTATION_COMPLETE.md` - What was built and how it works

### For Code Details
→ `server/vps-db-server.mjs` - VPS server implementation
→ `api/provision-site.js` - Provisioning orchestration
→ `site-factory.html` + `js/site-factory.js` - UI and form logic

---

## Important Details

### VPS Location
```
IP: 178.104.77.218
Port: 3001 (database server)
Database: /root/generic-barber/data/
Manager: PM2 (process: barber-db)
```

### Required Environment Variables (Vercel)
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_REPO_ID` - Template project repository ID
- `VERCEL_TEAM_ID` - Your Vercel team ID
- `VPS_DB_ADMIN_TOKEN` - Auth token for VPS (32-byte hex)

### Required Configuration (VPS)
- Node.js runtime (for `vps-db-server.mjs`)
- PM2 for process management
- `/root/generic-barber/` directory with code

---

## Troubleshooting

### "Cannot reach VPS"
- Check firewall allows port 3001
- Verify VPS is running: `ssh root@178.104.77.218`
- Check PM2 process: `pm2 show barber-db`

### "Provisioning fails with 401"
- Token mismatch between Vercel and VPS
- Check: `pm2 show barber-db | grep VPS_DB_ADMIN_TOKEN`
- Verify Vercel env var is updated
- Redeploy Vercel: `vercel deploy --prod`

### "New site created but can't access URL"
- Wait 2-3 minutes for Vercel deployment to complete
- Check Vercel deployment status in dashboard
- Verify env vars were injected: Check Vercel project settings

### "PM2 process keeps crashing"
```bash
# Check error logs
pm2 logs barber-db --lines 100

# If data directory missing
mkdir -p /root/generic-barber/data/tenants

# Restart
pm2 restart barber-db
```

---

## Security Reminders

⚠️ The admin token allows creating/modifying any tenant. Keep it secret!

- Never commit tokens to git
- Rotate every 90 days (see TOKEN_ROTATION_GUIDE.md)
- Use HTTPS in production
- Audit who has access to VPS

---

## Next Steps

1. **First time?** → Go test `/site-factory.html`
2. **Want details?** → Read `IMPLEMENTATION_COMPLETE.md`
3. **Having issues?** → Check `OPERATIONAL_STATUS.md`
4. **Need to deploy?** → Follow `VPS_PM2_COMPLETE_FIX.md`

---

## Support

For questions about:
- **Architecture**: See `OPERATIONAL_STATUS.md`
- **Deployment**: See `VPS_PM2_COMPLETE_FIX.md`
- **Security**: See `TOKEN_ROTATION_GUIDE.md`
- **Code**: Check file comments and `IMPLEMENTATION_COMPLETE.md`

System is **production-ready** after token rotation! 🚀
