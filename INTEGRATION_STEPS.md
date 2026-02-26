# STEP-BY-STEP INTEGRATION GUIDE

Follow these exact steps to add SMS to your app. **Total time: 10 minutes**

---

## STEP 1: Install SMS Gateway App (3 minutes)

1. **On your Android phone**, download **"SMS Gateway API"** from Play Store:
   - https://play.google.com/store/apps/details?id=eu.apksoft.android.smsgateway

2. **Open the app** and grant all permissions

3. **Get your credentials:**
   - Tap **Settings** (gear icon)
   - Tap **API**
   - Copy **Login** (write it down!)
   - Copy **Password** (write it down!)

---

## STEP 2: Update SMS Handler Credentials (2 minutes)

1. **Open this file** in your editor:
   ```
   c:\generic-barber25\generic-barber\js\sms-handler.js
   ```

2. **Find lines 9-13** and update:

   ```javascript
   const SMS_CONFIG = {
     login: 'your_email@example.com',     // ← Replace with your SMS Gateway login
     password: 'your_password',            // ← Replace with your SMS Gateway password
     apiUrl: 'https://smsgateway.me/api/v4/message/send',
     businessName: 'Moj Frizerski Salon',  // ← Replace with your business name
     appUrl: window.location.origin,
   };
   ```

3. **Save the file**

---

## STEP 3: Add Script to Your HTML (1 minute)

1. **Open this file**:
   ```
   c:\generic-barber25\generic-barber\poslovni-panel.3f8a1c.html
   ```

2. **Search for** (Ctrl+F):
   ```html
   <script src="js/calendar-engine.js" type="module"></script>
   ```

3. **Add this line RIGHT AFTER** it:
   ```html
   <script src="js/sms-handler.js"></script>
   ```

4. **Save the file**

---

## STEP 4: Add SMS Sending to Appointment Save (3 minutes)

1. **Still in** `poslovni-panel.3f8a1c.html`

2. **Search for** (Ctrl+F):
   ```javascript
   scheduleData.events.push(eventPayload);
   ```

3. **Find the one around line 4098** (the main appointment save)

4. **Add this code RIGHT AFTER** the push and BEFORE the save:

   ```javascript
   scheduleData.events.push(eventPayload);

   // ===== ADD THIS CODE HERE ===== START
   // Send SMS confirmation if phone number provided
   if (phone && phone.trim()) {
     // Validate phone number
     const validation = window.SMSHandler.validatePhoneNumber(phone);
     if (validation.valid) {
       // Create appointment object for SMS
       const appointmentForSMS = {
         id: eventId,
         phoneNumber: validation.cleaned,
         clientName: title,
         start: start,
         end: end,
       };
       
       // Send SMS (async - doesn't block the save)
       window.SMSHandler.sendAppointmentConfirmation(appointmentForSMS)
         .then(result => {
           if (result.success) {
             console.log('✅ SMS sent to customer');
             // Optionally show success message to user
             // alert('Termin shranjen! SMS poslan stranki.');
           } else {
             console.warn('⚠️ SMS failed:', result.error);
             // Appointment still saved, just SMS failed
           }
         })
         .catch(err => console.error('❌ SMS error:', err));
     } else {
       console.warn('⚠️ Invalid phone number format:', phone);
     }
   }
   // ===== ADD THIS CODE HERE ===== END

   // Save to localStorage
   try {
   ```

5. **Save the file**

---

## STEP 5: Update Phone Number Input Field (1 minute)

To ensure phone numbers are in the correct format:

1. **Still in** `poslovni-panel.3f8a1c.html`

2. **Search for** the phone input field:
   ```html
   <input type="tel" id="eventPhone"
   ```

3. **Add `placeholder` and `pattern`** attributes:
   ```html
   <input 
     type="tel" 
     id="eventPhone" 
     placeholder="+381 XX XXX XXXX" 
     pattern="\+[0-9]{10,15}"
     title="Vnesite telefonsko številko s predpono države (npr. +381...)"
   ```

4. **Save the file**

---

## STEP 6: Test It! (2 minutes)

1. **Make sure:**
   - Your Android phone is ON
   - SMS Gateway app is running
   - Phone has internet connection
   - You updated the credentials in Step 2

2. **Start your app**:
   ```powershell
   npm run dev
   ```

3. **Open in browser**: http://localhost:5173

4. **Create a test appointment:**
   - Fill in all fields
   - **Phone number**: Use YOUR phone with country code (e.g., `+381641234567`)
   - Click Save

5. **Check results:**
   - Browser console should show: `✅ SMS sent to customer`
   - Your phone should receive SMS within 10 seconds
   - SMS Gateway app should show the message in "Messages" tab

---

## STEP 7: Setup Daily Reminders (Optional, 5 minutes)

For automatic reminders 1 day before appointments:

### **Option A: Manual Daily Run (Simple)**

1. **Update credentials** in `daily-reminder.js` (lines 12-16):
   ```javascript
   const SMS_CONFIG = {
     login: 'your_email@example.com',  // ← Same as sms-handler.js
     password: 'your_password',         // ← Same as sms-handler.js
     apiUrl: 'https://smsgateway.me/api/v4/message/send',
     businessName: 'Moj Salon',         // ← Your business name
     firebaseUrl: 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app',
   };
   ```

2. **Install node-fetch** (if needed):
   ```powershell
   npm install node-fetch
   ```

3. **Test it manually**:
   ```powershell
   node daily-reminder.js
   ```

4. **Automate with Windows Task Scheduler**:
   - Open Task Scheduler
   - Create Basic Task
   - Name: "Barber SMS Reminders"
   - Trigger: Daily at 10:00 AM
   - Action: Start a program
   - Program: `node`
   - Arguments: `c:\generic-barber25\generic-barber\daily-reminder.js`
   - Finish

### **Option B: Run from Browser (Even Simpler)**

1. **Open browser console** (F12) every morning at 10 AM

2. **Paste and run**:
   ```javascript
   window.SMSHandler.sendDailyReminders();
   ```

3. **Done!** Reminders sent.

---

## Troubleshooting

### **❌ "SMSHandler is not defined"**
- Did you add the script tag in Step 3?
- Check browser console for errors
- Refresh the page (Ctrl+F5)

### **❌ SMS not sent / Shows 401 error**
- Check login/password in `sms-handler.js` (Step 2)
- Make sure credentials match SMS Gateway app exactly
- No extra spaces before/after credentials

### **❌ SMS not received**
- Check SMS Gateway app - is it running?
- Is phone connected to internet?
- Check phone number format (must start with `+`)
- Look in SMS Gateway app → Messages tab for delivery status

### **❌ "Invalid phone number" warning**
- Phone must start with `+` and country code
- Examples:
  - ✅ `+381641234567`
  - ✅ `+386 41 234 567`
  - ❌ `0641234567`
  - ❌ `381641234567`

### **❌ Phone keeps going to sleep**
- Settings → Apps → SMS Gateway → Battery
- Set to "Unrestricted"
- Or: Keep phone plugged in (stays awake)

---

## Summary - What You Did

✅ Installed SMS Gateway app on phone  
✅ Updated credentials in `sms-handler.js`  
✅ Added script tag to HTML  
✅ Added SMS sending code to appointment save  
✅ Tested with your own phone number  
✅ (Optional) Setup daily reminders  

---

## Daily Usage

**Morning:**
- Turn on phone (if off overnight)
- Ensure SMS Gateway app running
- That's it!

**During the day:**
- Create appointments as normal
- SMS sent automatically within seconds
- No extra steps needed

**Daily reminders:**
- Run `node daily-reminder.js` at 10 AM
- Or use Task Scheduler to automate it

---

## Need Help?

**Check these first:**
1. Browser console (F12) - any errors?
2. SMS Gateway app - is it connected?
3. Phone number format - starts with `+`?
4. Credentials correct in `sms-handler.js`?

**Still stuck?**
- Check `ANDROID_SMS_SETUP.md` for more details
- Test with: `window.SMSHandler.sendSMS('+381your_number', 'test')`

---

**You're all set! 🎉 Start creating appointments and watch the SMS magic happen!** 📱
