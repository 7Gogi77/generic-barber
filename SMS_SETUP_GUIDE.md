# SMS NOTIFICATIONS SETUP GUIDE

Choose your option:
- **Option 1: Twilio (Professional)** - Reliable, paid (~$0.01-0.05 per SMS)
- **Option 2: Android SMS Gateway** - Free, uses your phone

---

## **OPTION 1: TWILIO (RECOMMENDED)**

### **Why Twilio?**
✅ Most reliable SMS delivery
✅ Works in 180+ countries
✅ Automated - no phone needed
✅ ~$0.01-0.05 per SMS (very affordable)
✅ Professional delivery reports

---

### **Step 1: Create Twilio Account**

1. Go to: https://www.twilio.com/try-twilio
2. Sign up for **free trial** (get $15 credit)
3. Verify your phone number
4. Get a **Twilio phone number** (free during trial)

---

### **Step 2: Get Twilio Credentials**

After signing up:

1. Go to: https://console.twilio.com
2. Copy these values:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
   - **Phone Number** (your Twilio number, e.g., +12345678900)

---

### **Step 3: Install Firebase CLI**

```powershell
npm install -g firebase-tools
firebase login
```

---

### **Step 4: Initialize Firebase Functions**

```powershell
cd c:\generic-barber25\generic-barber

# Initialize Firebase Functions
firebase init functions

# Choose:
# - Language: JavaScript
# - ESLint: No
# - Install dependencies: Yes
```

---

### **Step 5: Update Configuration**

Open `functions/index.js` and replace these values:

```javascript
// Line 19-21
const TWILIO_ACCOUNT_SID = 'ACxxxxxxxx'; // Your Account SID
const TWILIO_AUTH_TOKEN = 'your_token';   // Your Auth Token
const TWILIO_PHONE_NUMBER = '+12345678900'; // Your Twilio number

// Line 26-27
const BUSINESS_NAME = 'Frizerski Salon XYZ'; // Your business name
const MANAGE_LINK_BASE = 'https://your-app.vercel.app/rezervacija.html?id=';
```

---

### **Step 6: Deploy to Firebase**

```powershell
cd functions
npm install

cd ..
firebase deploy --only functions
```

You'll see:
```
✔  functions[sendAppointmentConfirmation] deployed
✔  functions[sendDailyReminders] deployed
✔  functions[testSMS] deployed
```

---

### **Step 7: Test It!**

**Test SMS manually:**

1. Go to Firebase Console: https://console.firebase.google.com
2. Navigate to **Functions** tab
3. Find `testSMS` function
4. Click **"Logs"** to see test results

**Test with real appointment:**

1. Create a new appointment in your app
2. Use a **real phone number** (with country code: +381641234567)
3. You should receive SMS within seconds!

---

### **Step 8: Update Appointment Creation Code**

The SMS is sent automatically when you save to Firebase Firestore. If you're using Realtime Database, update your save code:

**In your appointment creation code**, change Firebase path:

```javascript
// OLD (Realtime Database)
await database.ref('schedule/events').push(appointmentData);

// NEW (Firestore - triggers SMS)
await firestore.collection('appointments').add(appointmentData);

// OR keep Realtime Database but also trigger Firestore
await database.ref('schedule/events').push(appointmentData);
await firestore.collection('appointments').add(appointmentData); // Triggers SMS
```

---

### **How It Works**

1. **Confirmation SMS:**
   - Triggers when appointment created
   - Sends: "Hvala za vaše naručilo na termin. Pošiljamo vam link do upravljanja vašega termina: [LINK]"
   
2. **Reminder SMS:**
   - Runs daily at 10:00 AM
   - Checks appointments for tomorrow
   - Sends: "Pozdravljeni, jutri ob [URA] imate termin pri [IME FIRME]."

---

### **Cost Estimate**

**Twilio Pricing (Slovenia/Serbia):**
- SMS: ~€0.04 per message
- Monthly phone number: ~€1.00

**Example costs:**
- 50 appointments/month = €2 + €2 (reminders) = **€4/month**
- 100 appointments/month = €4 + €4 = **€8/month**
- 200 appointments/month = €8 + €8 = **€16/month**

**Affordable for most barber shops!**

---

---

## **OPTION 2: ANDROID SMS GATEWAY (FREE)**

Send SMS from your Android phone for free.

### **Requirements**
- Android phone with active SIM card
- Phone must stay ON and connected to internet
- Less reliable than Twilio

---

### **Step 1: Install SMS Gateway App**

1. Install **SMS Gateway API** from Google Play:
   https://play.google.com/store/apps/details?id=eu.apksoft.android.smsgateway

2. Open app → Grant SMS permissions

3. Get your **API Key** from app settings

---

### **Step 2: Create Webhook Endpoint**

Add this to your `poslovni-panel.3f8a1c.html` or create separate file:

```javascript
/**
 * Send SMS via Android Gateway
 */
async function sendSMSViaAndroid(phoneNumber, message) {
  const API_KEY = 'your_android_gateway_api_key'; // From SMS Gateway app
  const DEVICE_ID = 'your_device_id'; // From SMS Gateway app
  
  const url = 'https://smsgateway.me/api/v4/message/send';
  
  const payload = {
    phoneNumber: phoneNumber,
    message: message,
    deviceId: DEVICE_ID,
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY,
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    console.log('SMS sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error };
  }
}

// Usage after saving appointment
async function onAppointmentCreated(appointment) {
  const manageLink = `https://your-app.com/rezervacija.html?id=${appointment.id}`;
  const message = `Hvala za vaše naručilo na termin. Pošiljamo vam link do upravljanja vašega termina: ${manageLink}`;
  
  await sendSMSViaAndroid(appointment.phoneNumber, message);
}
```

---

### **Step 3: Set Up Daily Reminders**

For reminders, use **Firebase Cloud Scheduler** (free tier):

```javascript
// In Firebase Cloud Function
exports.sendDailyReminders = functions.pubsub
  .schedule('0 10 * * *') // Every day at 10 AM
  .timeZone('Europe/Belgrade')
  .onRun(async (context) => {
    // Get tomorrow's appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Fetch appointments for tomorrow
    const appointments = await getTomorrowAppointments(tomorrow);
    
    // Send reminder to each
    for (const apt of appointments) {
      const time = apt.start.toTimeString().slice(0, 5); // "14:30"
      const message = `Pozdravljeni, jutri ob ${time} imate termin pri Vaš Frizer.`;
      await sendSMSViaAndroid(apt.phoneNumber, message);
    }
  });
```

---

### **Pros/Cons Comparison**

| Feature | Twilio | Android Gateway |
|---------|--------|-----------------|
| **Cost** | €4-16/month | FREE |
| **Reliability** | 99.9% | 80-90% |
| **Setup** | Easy | Medium |
| **Maintenance** | None | Phone must stay on |
| **International** | Yes | Depends on SIM |
| **Professional** | Yes | No |

---

## **MY RECOMMENDATION**

### **Use Twilio if:**
- ✅ Your business sends 20+ SMS/month
- ✅ You want reliability
- ✅ You can afford €5-15/month
- ✅ You want it to "just work"

### **Use Android Gateway if:**
- ✅ You're just testing/starting
- ✅ Budget is very tight
- ✅ You send <20 SMS/month
- ✅ You can keep phone connected

---

## **Quick Start**

**For Twilio (5 minutes):**
```powershell
# 1. Sign up: https://www.twilio.com/try-twilio
# 2. Get credentials
# 3. Run:
cd c:\generic-barber25\generic-barber
firebase init functions
cd functions
npm install
# 4. Update credentials in index.js
# 5. Deploy:
firebase deploy --only functions
```

**For Android Gateway (10 minutes):**
```powershell
# 1. Install app from Play Store
# 2. Get API key
# 3. Add sendSMSViaAndroid function to your code
# 4. Call it when saving appointments
```

---

## **Testing**

**Test phone numbers** (format with country code):
- Slovenia: `+386 XX XXX XXX`
- Serbia: `+381 XX XXX XXXX`
- Croatia: `+385 XX XXX XXXX`

**Test message:**
```javascript
sendSMS('+381641234567', 'Test poruka iz frizerskega salona!');
```

---

## **Troubleshooting**

**SMS not delivered:**
- ✅ Check phone number format (+381...)
- ✅ Verify Twilio account is active
- ✅ Check Twilio logs in console
- ✅ Ensure phone number is verified (trial accounts)

**Reminders not sending:**
- ✅ Check Firebase Functions logs
- ✅ Verify scheduler is enabled
- ✅ Confirm timezone is correct

**High costs:**
- ✅ Limit to confirmed appointments only
- ✅ Don't send reminders for past appointments
- ✅ Add unsubscribe option

---

## **Need Help?**

1. Twilio Support: https://support.twilio.com
2. Firebase Functions Docs: https://firebase.google.com/docs/functions
3. SMS Gateway App Support: https://smsgateway.me/help

---

**Ready to go live with SMS notifications!** 📱
