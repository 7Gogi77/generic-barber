# VPS Admin Token Security & Rotation

## Current Status ✅
- VPS database server is operational and listening on port 3001
- Test tenant "test-tenant" was successfully created at 2026-03-20T07:23:07.045Z
- Admin authentication is working correctly

## Exposed Token Alert ⚠️
The following token was exposed in chat logs and VPS output:
```
e0577e43a304cb2806918be46997083e1823d181cc90e7cde084f73e2d85404e
```

**This token MUST be rotated immediately before production use.**

## Token Rotation Steps

### 1. Generate a new secure token on the VPS:

```bash
NEW_TOKEN=$(openssl rand -hex 32)
echo "New token: $NEW_TOKEN"
```

Save the output - you'll need it for steps 2 and 3.

### 2. Update ecosystem.config.cjs on VPS:

```bash
# Edit the file and replace 'ROTATE_THIS_TOKEN_BEFORE_PRODUCTION' with the new token
nano /root/generic-barber/ecosystem.config.cjs

# Find the line:
#   VPS_DB_ADMIN_TOKEN: 'ROTATE_THIS_TOKEN_BEFORE_PRODUCTION'
# 
# Replace with:
#   VPS_DB_ADMIN_TOKEN: '<YOUR_NEW_TOKEN_HERE>'
#
# Save with Ctrl+O, Enter, Ctrl+X
```

Alternatively, use sed to replace it:

```bash
NEW_TOKEN=$(openssl rand -hex 32)
sed -i "s/ROTATE_THIS_TOKEN_BEFORE_PRODUCTION/$NEW_TOKEN/g" /root/generic-barber/ecosystem.config.cjs
echo "Updated with token: $NEW_TOKEN"
```

### 3. Restart PM2 with the new token:

```bash
pm2 restart barber-db
pm2 save
```

### 4. Test with the new token:

```bash
NEW_TOKEN="<paste your new token here>"
curl -i -X POST 'http://127.0.0.1:3001/_admin/tenants' \
  -H 'Content-Type: application/json' \
  -H "x-admin-token: $NEW_TOKEN" \
  --data-raw '{"tenantId":"test-production","businessName":"Test Production Tenant"}'
```

Should return **201 Created** with the new tenant data.

### 5. Update Vercel environment variables:

Go to your Vercel project settings and update:
- **VPS_DB_ADMIN_TOKEN**: Set to your new token

### 6. Deploy to Vercel:

After updating the env var, redeploy the Vercel project so the provisioning API uses the new token:

```bash
vercel deploy --prod
```

## Verification Checklist

After rotation, verify:

- [ ] New token works in PM2 (curl returns 201, not 401)
- [ ] Vercel VPS_DB_ADMIN_TOKEN env var is updated
- [ ] Vercel project is redeployed with new env var
- [ ] Old token no longer works (optional test - curl with old token should return 401)
- [ ] PM2 configuration is saved (`pm2 save` was run)

## Best Practices

1. **Never commit tokens to git** - The exposed token in ecosystem.config.cjs should always be replaced before pushing
2. **Use environment variable files** - Keep `.env` files in `.gitignore`
3. **Rotate regularly** - Every 90 days is recommended for security
4. **Audit access** - If token is compromised, check VPS logs for unauthorized access:
   ```bash
   cat /root/generic-barber/.pm2-error.log
   cat /root/generic-barber/.pm2-out.log
   pm2 logs barber-db
   ```

## Files That Need Updates

After token rotation, these files have the old token embedded:
- `ecosystem.config.cjs` - Contains the placeholder `ROTATE_THIS_TOKEN_BEFORE_PRODUCTION`

No other files need updating locally - the token is only used:
1. In the PM2 ecosystem config (VPS-side)
2. In Vercel environment variables (for the provisioning API)
