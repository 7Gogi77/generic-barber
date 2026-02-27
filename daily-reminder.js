/**
 * Daily Reminder Script
 * Run this every day at 10 AM to send reminder SMS
 * 
 * Usage: node daily-reminder.js
 * 
 * To automate on Windows:
 * 1. Open Task Scheduler
 * 2. Create new task: Run daily at 10:00 AM
 * 3. Action: node c:\generic-barber25\generic-barber\daily-reminder.js
 */

import fetch from 'node-fetch';

// ========== CONFIGURATION - UPDATE THESE ==========
const SMS_CONFIG = {
  // Get these from HTTP SMS app (https://httpsms.com)
  apiKey: 'uk_bwPUw3HInCfOQQUj67MeG-wv-JVtVdHZeOr910i4qvh7X9qD8v5ZJjKFmzF-VkWZ',        // From HTTP SMS app → API Keys
  phoneNumber: '+38631886977',        // Your phone number (the sender)
  apiUrl: 'https://api.httpsms.com/v1/messages/send',
  businessName: 'Aaa',          // Your business name
  firebaseUrl: 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app',
};

// ========== SEND SMS FUNCTION ==========

async function sendSMS(phoneNumber, message) {
  console.log(`📱 Sending SMS to: ${phoneNumber}`);

  try {
    const response = await fetch(SMS_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SMS_CONFIG.apiKey,
      },
      body: JSON.stringify({
        from: SMS_CONFIG.phoneNumber,  // Your phone (sender)
        to: phoneNumber,                // Customer's phone (receiver)
        content: message,               // SMS text
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ SMS sent successfully`);
      return { success: true };
    } else {
      console.error(`❌ Failed:`, result.message || result.error);
      return { success: false, error: result.message || result.error };
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// ========== GET TOMORROW'S APPOINTMENTS ==========

async function getTomorrowAppointments() {
  try {
    // Fetch appointments from Firebase
    const response = await fetch(`${SMS_CONFIG.firebaseUrl}/schedule/events.json`);
    const allAppointments = await response.json() || {};

    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Filter appointments
    const tomorrowAppointments = [];

    for (const [id, appointment] of Object.entries(allAppointments)) {
      const appointmentDate = new Date(appointment.start);

      if (appointmentDate >= tomorrow && appointmentDate < dayAfter) {
        tomorrowAppointments.push({ ...appointment, id });
      }
    }

    return tomorrowAppointments;
  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    return [];
  }
}

// ========== MAIN FUNCTION ==========

async function main() {
  console.log('🔔 Daily Reminder Script Started');
  console.log('⏰ Time:', new Date().toLocaleString('sl-SI'));
  console.log('');

  // Get tomorrow's appointments
  console.log('📅 Fetching tomorrow appointments...');
  const appointments = await getTomorrowAppointments();

  if (appointments.length === 0) {
    console.log('ℹ️  No appointments tomorrow - nothing to do!');
    process.exit(0);
  }

  console.log(`✅ Found ${appointments.length} appointments for tomorrow`);
  console.log('');

  // Send reminders
  let sent = 0;
  let failed = 0;

  for (const appointment of appointments) {
    const phoneNumber = appointment.phoneNumber;

    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      console.warn(`⚠️  Skipping appointment ${appointment.clientName} - invalid phone`);
      failed++;
      continue;
    }

    // Format time
    const startTime = new Date(appointment.start);
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Compose message
    const message = `Pozdravljeni, jutri ob ${timeStr} imate termin pri ${SMS_CONFIG.businessName}.`;

    console.log(`\n📤 Sending to ${appointment.clientName} (${phoneNumber}) - ${timeStr}`);

    // Send SMS
    const result = await sendSMS(phoneNumber, message);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Delay between messages
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total appointments tomorrow: ${appointments.length}`);
  console.log(`SMS sent successfully: ${sent} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log('='.repeat(60));

  process.exit(0);
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
