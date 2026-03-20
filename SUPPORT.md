# VPS Support & Troubleshooting Index

## Critical Issue: VPS 404 Error (VPS Server Not Responding)

### 🚨 Immediate Action Required
If you're seeing "VPS tenant provisioning failed (404)" or similar errors:

**→ Start here: [`VPS_404_RESOLUTION.md`](VPS_404_RESOLUTION.md)**
- Choose Option A (Automatic Recovery) for fastest fix
- Choose Option B (Manual Diagnosis) to understand what went wrong
- Includes all verification steps

### Supporting Documents
- **Detailed Troubleshooting:** [`VPS_404_TROUBLESHOOTING.md`](VPS_404_TROUBLESHOOTING.md)
- **Diagnostic Script:** `vps-diagnostic.sh` (automated system check)
- **Recovery Script:** `vps-recovery.sh` (automated fixes)

---

## General VPS Documentation

### For Operators/Non-Technical Users
→ [`QUICK_START.md`](QUICK_START.md)
- How to provision new tenants
- Common tasks and troubleshooting
- Health checks and verification

### For Developers/Technical Staff
→ [`OPERATIONAL_STATUS.md`](OPERATIONAL_STATUS.md)
- System architecture overview
- Data flow diagrams
- API endpoints and authentication
- Complete deployment checklist

### For Implementation Details
→ [`IMPLEMENTATION_COMPLETE.md`](IMPLEMENTATION_COMPLETE.md)
- What was built and why
- File structure and purposes
- Success metrics and progress tracking

---

## Setup & Configuration

### Initial Setup (Already Complete)
→ [`SITE_FACTORY_SETUP.md`](SITE_FACTORY_SETUP.md)
- VPS configuration reference (IP: 178.104.77.218)
- Vercel integration requirements
- Example environment values

### PM2 Process Management
→ [`VPS_PM2_COMPLETE_FIX.md`](VPS_PM2_COMPLETE_FIX.md)
- How to start/restart the database server
- Ecosystem configuration
- Process persistence

### Token Security
→ [`TOKEN_ROTATION_GUIDE.md`](TOKEN_ROTATION_GUIDE.md)
- How to rotate the admin token
- Security best practices
- Token management procedures

---

## Decision Tree

**I'm seeing an error:**
- **404 Not Found** → [`VPS_404_RESOLUTION.md`](VPS_404_RESOLUTION.md)
- **401 Unauthorized** → [`TOKEN_ROTATION_GUIDE.md`](TOKEN_ROTATION_GUIDE.md)
- **Other error** → [`OPERATIONAL_STATUS.md`](OPERATIONAL_STATUS.md) Troubleshooting section

**I want to:**
- **Fix the system** → [`VPS_404_RESOLUTION.md`](VPS_404_RESOLUTION.md)
- **Understand the architecture** → [`OPERATIONAL_STATUS.md`](OPERATIONAL_STATUS.md)
- **Learn how to use it** → [`QUICK_START.md`](QUICK_START.md)
- **Configure/customize it** → [`SITE_FACTORY_SETUP.md`](SITE_FACTORY_SETUP.md)
- **Provision a new tenant** → [`QUICK_START.md`](QUICK_START.md)

**I need to:**
- **Diagnose a problem** → [`vps-diagnostic.sh`](vps-diagnostic.sh) then [`VPS_404_TROUBLESHOOTING.md`](VPS_404_TROUBLESHOOTING.md)
- **Recover from a crash** → [`vps-recovery.sh`](vps-recovery.sh) or [`VPS_404_RESOLUTION.md`](VPS_404_RESOLUTION.md)
- **Rotate the security token** → [`TOKEN_ROTATION_GUIDE.md`](TOKEN_ROTATION_GUIDE.md)
- **Restart services** → [`VPS_PM2_COMPLETE_FIX.md`](VPS_PM2_COMPLETE_FIX.md)

---

## Scripts & Tools

### Automated Diagnostics
```bash
cd /root/generic-barber
bash vps-diagnostic.sh
```
Generates a complete system status report with recommendations.

### Automated Recovery
```bash
cd /root/generic-barber
bash vps-recovery.sh
```
Automatically fixes common issues and verifies the system is working.

### Manual Commands
```bash
# Check status
pm2 list
pm2 show barber-db

# Restart
pm2 restart barber-db
pm2 save

# View logs
pm2 logs barber-db --lines 50

# Test endpoint
curl -i http://127.0.0.1:3001/health
```

---

## Quick Reference

| Symptom | Document | Quick Fix |
|---------|----------|-----------|
| 404 errors on provisioning | VPS_404_RESOLUTION.md | `bash vps-recovery.sh` |
| 401 Unauthorized | TOKEN_ROTATION_GUIDE.md | Check token is set correctly |
| PM2 process crashed | VPS_404_TROUBLESHOOTING.md | `pm2 restart barber-db` |
| Port 3001 not listening | VPS_404_TROUBLESHOOTING.md | `pm2 show barber-db` then restart |
| Vercel provisioning fails | OPERATIONAL_STATUS.md | Check VERCEL_* env vars |
| New tenant won't load | QUICK_START.md | Wait 2-3 min then refresh |
| Data directories missing | VPS_404_TROUBLESHOOTING.md | `mkdir -p /root/generic-barber/data/tenants` |

---

## VPS Connection Details

**Server:** 178.104.77.218  
**User:** root  
**Service:** Multi-tenant SaaS provisioning factory  
**Process Manager:** PM2  
**Database Server:** Port 3001  
**Project Path:** /root/generic-barber/  
**Data Storage:** /root/generic-barber/data/  

### Quick SSH
```bash
ssh root@178.104.77.218
cd /root/generic-barber
```

---

## Escalation Path

If you've completed the steps in `VPS_404_RESOLUTION.md` and the issue persists:

1. **Collect diagnostics:**
   ```bash
   bash vps-diagnostic.sh > report.txt
   pm2 logs barber-db --lines 100 >> report.txt
   ```

2. **Check system resources:**
   ```bash
   ps aux | grep node
   free -h
   df -h /
   ```

3. **Try foreground execution:**
   ```bash
   cd /root/generic-barber
   export VPS_DB_ADMIN_TOKEN="your-token"
   node server/vps-db-server.mjs
   # Note any error messages
   ```

4. **Report with:**
   - Contents of diagnostic report
   - PM2 logs (100+ lines)
   - System resource stats
   - Any error messages from foreground execution
   - Exact steps you've already tried

---

## File Organization

### Implementation Files
- `server/vps-db-server.mjs` - VPS database server
- `api/provision-site.js` - Provisioning API
- `site-factory.html` - Admin provisioning UI
- `ecosystem.config.cjs` - PM2 configuration

### Documentation Files
- `VPS_404_RESOLUTION.md` - **START HERE for 404 errors**
- `VPS_404_TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `OPERATIONAL_STATUS.md` - Architecture and operations
- `QUICK_START.md` - User guide
- `TOKEN_ROTATION_GUIDE.md` - Security procedures
- `IMPLEMENTATION_COMPLETE.md` - Full implementation summary

### Script Files
- `vps-diagnostic.sh` - System diagnostics
- `vps-recovery.sh` - Automated recovery

---

## Status Dashboard

### System Health Check
```bash
# Run this command to check everything:
cd /root/generic-barber && bash vps-diagnostic.sh
```

You're looking for:
- ✅ PM2 status: online
- ✅ Port 3001: listening
- ✅ Data directories: exist
- ✅ Health check: responsive
- ✅ Admin endpoint: accessible

All five green = system working correctly.

---

## Version Information

- **Factory System:** Version 1.0 (Production Ready)
- **VPS Server:** Running on Node.js with PM2
- **Data Format:** JSON file storage
- **Deployment:** Vercel projects + isolated VPS databases

---

## Support Locations

| Question | Answer Location |
|----------|-----------------|
| "Why is provisioning failing?" | VPS_404_RESOLUTION.md |
| "How do I use this?" | QUICK_START.md |
| "How does it work?" | OPERATIONAL_STATUS.md |
| "What code was written?" | IMPLEMENTATION_COMPLETE.md |
| "How do I secure it?" | TOKEN_ROTATION_GUIDE.md |
| "I need detailed help" | VPS_404_TROUBLESHOOTING.md |

---

**Last Updated:** 2026-03-20  
**Next Review:** 2026-04-20  
**Maintenance Window:** None scheduled  

For immediate assistance, start with [`VPS_404_RESOLUTION.md`](VPS_404_RESOLUTION.md).
