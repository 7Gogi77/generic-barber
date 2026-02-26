/**
 * Firebase Cloud Functions for SMS Notifications
 * Option 1: Using Twilio (Professional, Reliable)
 * 
 * Setup:
 * 1. npm install firebase-functions firebase-admin twilio
 * 2. firebase init functions
 * 3. Add Twilio credentials to Firebase config
 * 4. Deploy: firebase deploy --only functions
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import twilio from 'twilio';

// Initialize Firebase Admin
initializeApp();

// Twilio Configuration
// Get these from: https://console.twilio.com
const TWILIO_ACCOUNT_SID = 'your_account_sid_here'; // Replace with your Twilio SID
const TWILIO_AUTH_TOKEN = 'your_auth_token_here';   // Replace with your Twilio token
const TWILIO_PHONE_NUMBER = '+123456789';           // Replace with your Twilio number

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Your business info
const BUSINESS_NAME = 'Vaš Frizer'; // Change to your business name
const MANAGE_LINK_BASE = 'https://your-app.vercel.app/rezervacija.html?id='; // Change to your domain

/**
 * Send SMS using Twilio
 */
async function sendSMS(to, message) {
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    });
    console.log('✅ SMS sent successfully:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger: When new appointment is created in Firebase
 * Sends confirmation SMS with management link
 */
export const sendAppointmentConfirmation = onDocumentCreated(
  'appointments/{appointmentId}',
  async (event) => {
    const appointment = event.data.data();
    const appointmentId = event.params.appointmentId;

    // Extract appointment details
    const phoneNumber = appointment.phoneNumber;
    const clientName = appointment.clientName;
    const startTime = new Date(appointment.start);

    // Validate phone number
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      console.warn('⚠️ Invalid phone number:', phoneNumber);
      return;
    }

    // Create management link
    const manageLink = `${MANAGE_LINK_BASE}${appointmentId}`;

    // Compose SMS message
    const message = `Hvala za vaše naročilo na termin. Pošiljamo vam link do upravljanja vašega termina: ${manageLink}`;

    // Send SMS
    const result = await sendSMS(phoneNumber, message);

    // Log result to Firebase
    if (result.success) {
      await getDatabase()
        .ref(`sms-logs/${appointmentId}`)
        .push({
          type: 'confirmation',
          to: phoneNumber,
          message: message,
          sentAt: new Date().toISOString(),
          status: 'sent',
          sid: result.sid,
        });
    }

    return result;
  }
);

/**
 * Scheduled function: Runs daily at 10:00 AM
 * Sends reminder SMS for appointments tomorrow
 */
export const sendDailyReminders = onSchedule('0 10 * * *', async (event) => {
  console.log('🔔 Running daily appointment reminders...');

  const db = getDatabase();
  const appointmentsRef = db.ref('schedule/events');

  // Get all appointments
  const snapshot = await appointmentsRef.once('value');
  const appointments = snapshot.val() || {};

  // Calculate tomorrow's date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  let remindersSent = 0;

  // Process each appointment
  for (const [appointmentId, appointment] of Object.entries(appointments)) {
    const appointmentDate = new Date(appointment.start);

    // Check if appointment is tomorrow
    if (appointmentDate >= tomorrow && appointmentDate < dayAfterTomorrow) {
      const phoneNumber = appointment.phoneNumber;

      // Validate phone number
      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        console.warn('⚠️ Invalid phone number for appointment:', appointmentId);
        continue;
      }

      // Format time (e.g., "14:30")
      const hours = appointmentDate.getHours().toString().padStart(2, '0');
      const minutes = appointmentDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      // Compose reminder message
      const message = `Pozdravljeni, jutri ob ${timeStr} imate termin pri ${BUSINESS_NAME}.`;

      // Send SMS
      const result = await sendSMS(phoneNumber, message);

      if (result.success) {
        remindersSent++;

        // Log to Firebase
        await db.ref(`sms-logs/${appointmentId}`).push({
          type: 'reminder',
          to: phoneNumber,
          message: message,
          sentAt: new Date().toISOString(),
          status: 'sent',
          sid: result.sid,
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`✅ Sent ${remindersSent} reminder SMS`);
  return { remindersSent };
});

/**
 * Manual trigger function (for testing)
 * Call from Firebase Console or HTTP request
 */
export const testSMS = onSchedule('every 1 hours', async (event) => {
  // This is just for testing - disable after confirming it works
  const testPhone = '+381641234567'; // Replace with your test number
  const testMessage = 'Test SMS from your barber shop app!';

  const result = await sendSMS(testPhone, testMessage);
  console.log('Test SMS result:', result);
  return result;
});
