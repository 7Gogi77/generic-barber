/**
 * Vercel Serverless Function - Send Daily SMS Reminders
 * Called daily by EasyCron at 10 AM
 * Uses SMS Gate (api.sms-gate.app) cloud gateway → Android phone → SIM card
 *
 * Endpoint: https://your-domain.vercel.app/api/send-reminders
 *
 * Environment variables required (set in Vercel dashboard):
 *   SMS_GATE_USERNAME — Basic Auth username from SMS Gate app
 *   SMS_GATE_PASSWORD — Basic Auth password from SMS Gate app
 */

// SMS Configuration
const SMS_CONFIG = {
  gateUrl: 'https://api.sms-gate.app/3rdparty/v1/message',
  businessName: 'Aaa',
  firebaseUrl: 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app',
};

// Send SMS via SMS Gate API
async function sendSMS(phoneNumber, message) {
  const username = process.env.SMS_GATE_USERNAME;
  const password = process.env.SMS_GATE_PASSWORD;

  if (!username || !password) {
    return { success: false, error: 'SMS gateway credentials not configured' };
  }

  try {
    const basicAuth = Buffer.from(username + ':' + password).toString('base64');

    const response = await fetch(SMS_CONFIG.gateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + basicAuth,
      },
      body: JSON.stringify({
        phoneNumbers: [phoneNumber],
        message: message,
      }),
    });

    const result = await response.json();
    return response.ok ? { success: true } : { success: false, error: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get tomorrow's appointments from Firebase
async function getTomorrowAppointments() {
  try {
    const response = await fetch(`${SMS_CONFIG.firebaseUrl}/schedule/events.json`);
    const allAppointments = await response.json() || {};

    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Filter appointments
    const filtered = [];
    for (const [id, apt] of Object.entries(allAppointments)) {
      const aptDate = new Date(apt.start);
      if (aptDate >= tomorrow && aptDate < dayAfter) {
        filtered.push({ ...apt, id });
      }
    }

    return filtered;
  } catch (error) {
    console.error('Firebase error:', error);
    return [];
  }
}

// Main handler
export default async function handler(req, res) {
  // Security: Only allow GET requests and optionally check a secret
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Add secret token for security
  const secret = req.query.secret;
  const expectedSecret = process.env.CRON_SECRET || 'your-secret-token';
  
  if (secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔔 Daily reminder cron job started');

  try {
    // Get tomorrow's appointments
    const appointments = await getTomorrowAppointments();
    
    if (appointments.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No appointments tomorrow',
        sent: 0,
        total: 0,
      });
    }

    // Send reminders
    let sent = 0;
    let failed = 0;

    for (const apt of appointments) {
      const phone = apt.phoneNumber;

      if (!phone || !phone.startsWith('+')) {
        failed++;
        continue;
      }

      // Format time
      const time = new Date(apt.start);
      const hours = time.getHours().toString().padStart(2, '0');
      const mins = time.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${mins}`;

      // Send message
      const message = `Pozdravljeni, jutri ob ${timeStr} imate termin pri ${SMS_CONFIG.businessName}.`;
      const result = await sendSMS(phone, message);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Delay between messages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${sent}/${appointments.length} reminders`,
      sent,
      failed,
      total: appointments.length,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
