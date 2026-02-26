# ANDROID SMS GATEWAY - QUICK SETUP GUIDE

## Step 1: Install App on Your Android Phone (2 minutes)

1. **Download SMS Gateway API** from Google Play Store:
   - Link: https://play.google.com/store/apps/details?id=eu.apksoft.android.smsgateway
   - OR search "SMS Gateway API" in Play Store

2. **Open the app** and grant permissions:
   - SMS permissions
   - Phone permissions
   - Background activity

3. **Get your credentials:**
   - Open app → Click **"Settings"** → **"API"**
   - Copy **Login** (your username)
   - Copy **Password** (your password)
   - Note: Keep these secret!

---

## Step 2: Add SMS Code to Your App (5 minutes)

I've created `sms-handler.js` with all the SMS functions. You just need to:

1. **Update credentials** in `sms-handler.js`:
   - Line 9: Replace `'your_login_here'` with your app login
   - Line 10: Replace `'your_password_here'` with your app password
   - Line 13: Replace `'Vaš Frizer'` with your business name

2. **Include the script** in your HTML files:
   ```html
   <script src="js/sms-handler.js"></script>
   ```

3. **That's it!** SMS will be sent automatically when appointments are created.

---

## Step 3: Test It (1 minute)

1. **Keep your phone:**
   - Connected to Wi-Fi or mobile data
   - SMS Gateway app running in background
   - Phone unlocked (at least for first test)

2. **Create a test appointment:**
   - Use your own phone number with country code: `+381...`
   - Save the appointment
   - You should receive SMS within 5-10 seconds!

3. **Check app logs:**
   - Open SMS Gateway app → "Messages" tab
   - You'll see the sent SMS

---

## Step 4: Setup Daily Reminders (Optional)

For automatic reminders 1 day before appointments:

**Option A: Use your computer (simple)**
- Keep your computer on
- Run: `node daily-reminder.js` every day at 10 AM
- Use Windows Task Scheduler to automate it

**Option B: Use Firebase Functions (free tier)**
- Follow instructions in `daily-reminder-cloudfunction.js`
- Runs automatically in the cloud

I recommend **Option A** for simplicity.

---

## Phone Number Format

**Important:** Phone numbers MUST include country code with `+`

**Correct formats:**
- Slovenia: `+386 41 234 567` or `+38641234567`
- Serbia: `+381 64 123 4567` or `+381641234567`
- Croatia: `+385 91 234 5678` or `+38591234567`

**Wrong formats:**
- `064 123 4567` ❌
- `0641234567` ❌
- `381641234567` ❌ (missing +)

---

## Troubleshooting

### **SMS not sent?**

1. **Check phone:**
   - Is SMS Gateway app running?
   - Is phone connected to internet?
   - Check app logs for errors

2. **Check credentials:**
   - Login and password correct in `sms-handler.js`?
   - App shows "Connected" status?

3. **Check phone number:**
   - Starts with `+`?
   - Includes country code?
   - No spaces before `+`?

4. **Check browser console:**
   - Press F12 → Console tab
   - Look for errors with "SMS"

### **SMS sent but not received?**

1. **Check SIM card:**
   - Does it have credit/active plan?
   - Can you send SMS manually from phone?

2. **Check number:**
   - Is it a valid mobile number?
   - Not a landline?

3. **Wait a bit:**
   - Sometimes takes 30-60 seconds
   - Check SMS Gateway app logs

### **Phone keeps sleeping?**

**Disable battery optimization:**
1. Phone Settings → Apps → SMS Gateway
2. Battery → Unrestricted
3. Background activity → Allow

**Keep screen on (optional):**
1. Developer options → Stay awake when charging
2. Keep phone plugged in at salon

---

## Daily Usage

**Morning routine:**
1. Turn on phone (if turned off overnight)
2. Ensure SMS Gateway app is running
3. Check internet connection
4. That's it!

**During the day:**
- Create appointments as normal
- SMS sent automatically within seconds
- No need to do anything special

**End of day:**
- Phone can stay on or turn off
- Reminders will send next morning at 10 AM

---

## Cost

**FREE!** 🎉

Only costs:
- Your phone's data plan (minimal - ~1KB per SMS)
- Your SIM card's SMS plan (if you have one)

Most unlimited mobile plans include unlimited SMS.

---

## Limitations

⚠️ **Phone must be:**
- Powered on
- Connected to internet
- App running in background

⚠️ **Not recommended if:**
- You travel frequently without phone
- Phone is often turned off
- You need 99.9% reliability

**For those cases, use Twilio instead** (€5-15/month but 100% reliable)

---

## Support

**SMS Gateway app support:**
- In-app help: SMS Gateway app → Menu → Help
- Website: https://smsgateway.me

**Your code issues:**
- Check browser console (F12)
- Check `sms-handler.js` credentials
- Test with your own number first

---

## What's Next?

After setup works:

1. ✅ Test with 2-3 real appointments
2. ✅ Verify SMS delivered within 10 seconds
3. ✅ Set up daily reminders (optional)
4. ✅ Train staff on phone number format
5. 🚀 Go live!

---

**Ready to start? Install the app and update the credentials!** 📱
