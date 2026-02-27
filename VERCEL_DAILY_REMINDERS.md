# Free Daily SMS Reminders on Vercel

## ✅ What's Set Up

- **API Endpoint:** `/api/send-reminders` (serverless function)
- **Scheduler:** EasyCron (calls your API daily at 10 AM) - FREE
- **SMS Gateway:** HTTP SMS (already configured)

---

## 🚀 Setup Instructions

### Step 1: Deploy to Vercel (if not already done)

```bash
vercel deploy
```

After deployment, you'll get a URL like:
```
https://your-barber-shop.vercel.app
```

### Step 2: Get Your API Endpoint URL

Your reminder endpoint will be:
```
https://your-barber-shop.vercel.app/api/send-reminders?secret=YOUR_SECRET
```

(Replace `your-barber-shop` with your actual Vercel domain)

### Step 3: Add Secret to Vercel Environment

For security, add a secret token:

**In Vercel Dashboard:**
1. Go to Settings → Environment Variables
2. Add: `CRON_SECRET` = `your-secret-token-here`
3. (Use any random string, e.g., `abc123xyz789`)

### Step 4: Register with EasyCron (FREE)

1. Go to: **https://easycron.com**
2. Click **"Sign Up"** (free account)
3. Click **"Cron"** → **"Add Cron Job"**

Fill in:
- **URL:** `https://your-barber-shop.vercel.app/api/send-reminders?secret=your-secret-token-here`
- **Cron Expression:** `0 10 * * *` (daily at 10 AM UTC)
- **Execute:** every day
- **Save**

That's it! EasyCron will call your endpoint daily at 10 AM.

---

## 🧪 Test it Works

### Test 1: Manual API Call
Open browser and visit (replace with your URL):
```
https://your-barber-shop.vercel.app/api/send-reminders?secret=your-secret-token
```

You should see:
```json
{
  "success": true,
  "message": "Sent X/Y reminders",
  "sent": X,
  "failed": 0,
  "total": Y
}
```

### Test 2: Check Vercel Logs
In Vercel Dashboard:
1. Click your project
2. Go to **"Functions"** tab
3. Click **"send-reminders"**
4. View logs to see execution

---

## 📝 How It Works

1. **Every day at 10 AM UTC**, EasyCron pings your API
2. **API fetches** tomorrow's appointments from Firebase
3. **SMS sent** to each customer
4. **Logs** are saved in Vercel

---

## 🔐 Security

- ✅ Secret token prevents unauthorized calls
- ✅ Only GET requests accepted
- ✅ EasyCron IPs are whitelisted
- ✅ API key stored in `send-reminders.js`

---

## 📊 View Execution History

**In EasyCron:**
- Log in → Click your cron job → View execution logs

**In Vercel:**
- Project → Functions → send-reminders → View logs

---

## ⚠️ Important Notes

- **API endpoint is live after deploy** - test it before setting EasyCron
- **EasyCron runs UTC time** - 10 AM UTC might be different in your timezone
  - To change: EasyCron dashboard → Edit job → Cron expression
  - For Slovenia (UTC+1): Use `0 9 * * *` (9 AM UTC = 10 AM CET)
  - For Slovenia (UTC+2): Use `0 8 * * *` (8 AM UTC = 10 AM CEST)
- **Your phone must be online** with HTTP SMS app running for SMS to send
- **No need for Windows Task Scheduler** anymore!

---

## 🚀 Done!

Now you have:
✅ SMS confirmations on booking (client-side)
✅ Automated daily reminders (Vercel + EasyCron)
✅ Everything free!

Both services are completely free and will handle daily reminders without any cost.
