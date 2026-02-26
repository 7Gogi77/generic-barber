# HTTP SMS SETUP - 100% FREE & OPEN SOURCE

## What is HTTP SMS?

**HTTP SMS** is a completely **FREE, open-source** Android app that lets you send SMS from your phone via API calls.

- ✅ **100% Free** (no trial, no limits)
- ✅ **Open source** (GitHub: https://github.com/NdoleStudio/httpsms)
- ✅ **Active development** (maintained since 2022)
- ✅ **Works perfectly** for small businesses

---

## Step 1: Install the App (3 minutes)

### **Option A: Google Play Store (Recommended)**
1. Open Google Play Store on your Android phone
2. Search: **"HTTP SMS"**
3. Install the app by **NdoleStudio**
4. Open the app

### **Option B: Direct APK Download**
1. Go to: https://github.com/NdoleStudio/httpsms/releases/latest
2. Download the `.apk` file
3. Install on your Android phone
4. Open the app

---

## Step 2: Create Account (2 minutes)

1. **Open HTTP SMS app**
2. **Tap "Sign Up"**
3. Enter your **email** and create a **password**
4. **Verify your email** (check inbox)
5. **Log in** to the app

---

## Step 3: Get Your Credentials (2 minutes)

1. **In the app**, tap the **menu icon** (☰)
2. Tap **"API Keys"**
3. Tap **"Create API Key"**
4. Give it a name: `Barber Shop`
5. **Copy the API key** (save it somewhere!)

**Your phone number:**
- The app will show your phone number
- Example: `+381641234567`
- **Write this down too!**

---

## Step 4: Update Your Code (1 minute)

1. **Open this file**:
   ```
   c:\generic-barber25\generic-barber\js\sms-handler.js
   ```

2. **Find lines 9-11** and update:

   ```javascript
   const SMS_CONFIG = {
     apiKey: 'htsk_xxxxxxxxxxxxxxx',     // ← Paste your API key here
     phoneNumber: '+381641234567',        // ← Your phone number from app
     apiUrl: 'https://api.httpsms.com/v1/messages/send',
     
     businessName: 'Moj Frizer',          // ← Your business name
     appUrl: window.location.origin,
   };
   ```

3. **Save the file**

---

## Step 5: Test It! (1 minute)

1. **Make sure:**
   - Android phone is **ON**
   - HTTP SMS app is **running in background**
   - Phone has **internet connection**

2. **Open browser console** (F12 in your app)

3. **Paste this** and press Enter:
   ```javascript
   window.SMSHandler.sendSMS('+381YOUR_NUMBER', 'Test poruka!');
   ```

4. **Check your phone** - you should receive SMS within seconds!

5. **Check the app** - you'll see the message in "Messages" tab

---

## Step 6: Integrate with Appointments

**Already done!** If you followed the integration steps from before, SMS will be sent automatically when appointments are created.

If NOT yet integrated, add this after saving appointment:

```javascript
// Send SMS confirmation
if (phone && phone.trim()) {
  const validation = window.SMSHandler.validatePhoneNumber(phone);
  if (validation.valid) {
    window.SMSHandler.sendAppointmentConfirmation({
      id: eventId,
      phoneNumber: validation.cleaned,
      clientName: title,
      start: start,
      end: end,
    });
  }
}
```

---

## Daily Usage

### **Morning Routine:**
1. Keep phone ON and connected to internet
2. HTTP SMS app runs in background automatically
3. That's it!

### **Creating Appointments:**
- Just create appointments normally
- SMS sent automatically within 5 seconds
- No manual intervention needed

### **Battery Optimization:**
Make sure the app doesn't get killed:
1. Phone Settings → Apps → HTTP SMS
2. Battery → **Unrestricted**
3. Background activity → **Allow**

---

## Daily Reminders (Optional)

To send reminder SMS 1 day before appointments:

### **Update daily-reminder.js:**

1. Open `daily-reminder.js`
2. Update lines 12-15:
   ```javascript
   const SMS_CONFIG = {
     apiKey: 'htsk_xxxxxxxxxxxxxxx',     // Your API key
     phoneNumber: '+381641234567',        // Your phone number
     apiUrl: 'https://api.httpsms.com/v1/messages/send',
     businessName: 'Vaš Frizer',
     firebaseUrl: 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app',
   };
   ```

3. Update the sendSMS function:
   ```javascript
   async function sendSMS(to, message) {
     const response = await fetch(SMS_CONFIG.apiUrl, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': SMS_CONFIG.apiKey,
       },
       body: JSON.stringify({
         from: SMS_CONFIG.phoneNumber,
         to: to,
         content: message,
       }),
     });
     return await response.json();
   }
   ```

4. Run manually every morning:
   ```powershell
   node daily-reminder.js
   ```

5. Or automate with Windows Task Scheduler (runs at 10 AM daily)

---

## Troubleshooting

### **❌ "401 Unauthorized" error**
- **Problem:** Wrong API key
- **Fix:** Check the API key in `sms-handler.js` matches the one in the app

### **❌ SMS not sent**
- Check phone is connected to internet
- Check HTTP SMS app is running
- Check phone number is correct in config
- Look at app logs in "Messages" tab

### **❌ "Invalid phone number"**
- Phone numbers MUST start with `+`
- Must include country code
- Examples:
  - ✅ `+381641234567`
  - ✅ `+386 41 234 567`
  - ❌ `0641234567`
  - ❌ `381641234567` (missing +)

### **❌ App keeps stopping**
- Settings → Apps → HTTP SMS
- Battery → Unrestricted
- Background restrictions → Remove
- Auto-start → Enable

### **❌ "SMSHandler is not defined"**
- Did you add `<script src="js/sms-handler.js"></script>` to HTML?
- Refresh the page (Ctrl+F5)
- Check browser console for errors

---

## Cost

**100% FREE!** 🎉

- No trial period
- No message limits
- No subscription
- No hidden fees

Only costs:
- Your mobile data (minimal - ~1KB per SMS)
- Your carrier's SMS plan (if you don't have unlimited)

---

## Why HTTP SMS?

| Feature | HTTP SMS | Twilio |
|---------|----------|--------|
| **Cost** | FREE | €5-15/month |
| **Setup Time** | 10 min | 5 min |
| **Reliability** | 95%+ | 99.9% |
| **Messages/month** | Unlimited | Pay per SMS |
| **Open Source** | YES | NO |
| **Maintenance** | Phone must be on | None |

**Best for:** Small businesses, testing, low-budget projects  
**Best alternative:** Twilio (if you need 99.9% reliability)

---

## Support

**HTTP SMS Documentation:**
- Website: https://httpsms.com/docs
- GitHub: https://github.com/NdoleStudio/httpsms
- Issues: https://github.com/NdoleStudio/httpsms/issues

**Your Integration Issues:**
- Check browser console (F12)
- Test with: `window.SMSHandler.sendSMS('+your_number', 'test')`
- Verify API key is correct

---

## What You Get

✅ **Instant confirmations** when customers book  
✅ **Automatic reminders** 1 day before appointments  
✅ **Professional messages** with your business name  
✅ **Management links** for customers to reschedule  
✅ **100% FREE** - no monthly fees  

---

**Ready to go live!** 🚀

1. ✅ Install HTTP SMS app
2. ✅ Get API key
3. ✅ Update sms-handler.js
4. ✅ Test with your number
5. ✅ Start using with customers!

---

**Questions? Test it first with:**
```javascript
window.SMSHandler.sendSMS('+381your_number', 'Pozdrav iz salona! 💇');
```
