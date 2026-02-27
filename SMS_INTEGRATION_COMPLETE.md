# SMS Integration Setup Guide

## Status: ✅ FULLY INTEGRATED

Your barber shop now has complete SMS functionality:

### ✅ What's Working

1. **SMS Confirmation on Booking** 
   - When a customer creates an appointment, they receive an SMS confirmation
   - Includes link to manage their appointment
   - Language: Slovenian

2. **Daily Reminder SMS** (Automated)
   - Every day at 10 AM, customers get SMS reminder for their appointment tomorrow
   - Includes appointment time and business name
   - Runs automatically via Windows Task Scheduler

---

## 🚀 QUICK START

### Step 1: Test SMS Manually (in browser)
```javascript
// Open browser console (F12) and paste:
window.SMSHandler.sendSMS('+38631886977', 'Test SMS! 💇')
```

### Step 2: Setup Automatic Daily Reminders

**On Windows (Recommended):**
1. Open PowerShell as Administrator
2. Run: `PowerShell -ExecutionPolicy Bypass -File setup-daily-reminders.ps1`
3. Script will set up Task Scheduler automatically
4. Done! Reminders will send daily at 10 AM

---

## 📱 How It Works

### When Appointment is Created:
```
Customer books appointment → SMS sent automatically
Message: "Hvala za vaše naročilo na termin. Pošiljamo vam link do upravljanja vašega termina: [link]"
```

### Daily at 10 AM:
```
Task Scheduler runs daily-reminder.js → 
Fetches tomorrow's appointments → 
Sends SMS to each customer →
Message: "Pozdravljeni, jutri ob HH:MM imate termin pri Aaa."
```

---

## 🔧 FILES MODIFIED

### Main Code Changes:
- **poslovni-panel.3f8a1c.html** - Added SMS confirmation after appointment booking
- **dist/poslovni-panel.3f8a1c.html** - Distribution copy
- **js/sms-handler.js** - All SMS functions with HTTP SMS API
- **daily-reminder.js** - Updated with your credentials

### New Files Created:
- **setup-daily-reminders.ps1** - PowerShell script to setup Task Scheduler
- **SMS_HANDLER_FUNCTIONS.md** - Technical reference

---

## 🔑 Your SMS Configuration

These are already filled in (from HTTP SMS):
- **API Key:** uk_bwPUw3HInCfOQQUj67MeG-wv-JVtVdHZeOr910i4qvh7X9qD8v5ZJjKFmzF-VkWZ**
- **Phone Number:** +38631886977 (your Android phone)
- **Business Name:** Aaa
- **API URL:** https://api.httpsms.com/v1/messages/send

⚠️ **Important:** The Android phone with HTTP SMS app must be online to receive/send SMS!

---

## 🧪 Testing

### Test 1: Manual SMS (Browser)
```javascript
// Browser Console (F12):
window.SMSHandler.sendSMS('+38631886977', 'Test!')
```

### Test 2: Test with Appointment Booking
1. Create a test appointment in calendar with phone number
2. SMS should be sent automatically
3. Check browser console for logs

### Test 3: Test Daily Reminder (PowerShell)
```powershell
# Run this to test the daily-reminder script manually:
node c:\generic-barber25\generic-barber\daily-reminder.js
```

---

## 🐛 Troubleshooting

### "Cannot read properties of undefined (reading 'sendSMS')"
- **Cause:** Script not loaded
- **Fix:** Refresh page (Ctrl+F5)

### SMS not sending
1. Verify HTTP SMS app is running on your Android phone
2. Check phone has internet connection
3. Check browser console for error messages
4. Verify phone number format includes country code (+381...)

### Daily reminder not running
1. Check Task Scheduler: 
   - Control Panel → Administrative Tools → Task Scheduler
   - Look for "Barber Shop Daily SMS Reminders"
2. Verify Node.js is installed: `node --version`
3. Run manually to test: `node daily-reminder.js`

### Check Task Execution Logs
In Task Scheduler → Right-click task → View History

---

## 📊 SMS Functions Available

All functions are available via `window.SMSHandler`:

```javascript
// Send generic SMS
window.SMSHandler.sendSMS(phoneNumber, message)

// Send appointment confirmation
window.SMSHandler.sendAppointmentConfirmation(appointment)

// Send reminder SMS
window.SMSHandler.sendAppointmentReminder(appointment)

// Get tomorrow's appointments
window.SMSHandler.getTomorrowAppointments()

// Send all reminders for tomorrow
window.SMSHandler.sendDailyReminders()

// Validate phone number
window.SMSHandler.validatePhoneNumber(phoneNumber)

// View config
window.SMSHandler.config
```

---

## 🔐 Security Notes

- API key is stored in `sms-handler.js` - treat as sensitive
- Only visible to browser in dev tools
- In production, consider storing in secure backend
- HTTP SMS app requires Android device with internet

---

## 📞 Support

- HTTP SMS Docs: https://httpsms.com/docs
- Android App: https://play.google.com/store/apps/details?id=com.httpsms
- API Status: https://httpsms.com/status

---

## ✨ What's Next?

Optional enhancements:
1. Add SMS for cancellations
2. Add SMS for rescheduling
3. Send SMS to worker when new appointment created
4. Custom message templates
5. SMS delivery tracking

All functions are ready to use - just call them when needed!
