/**
 * Vercel Serverless Function - Send Daily SMS Reminders
 * Called daily by EasyCron at 10 AM
 * 
 * Endpoint: https://your-domain.vercel.app/api/send-reminders
 * (Get real URL after deploying)
 */

import fetch from 'node-fetch';

// SMS Configuration
const SMS_CONFIG = {
  apiKey: 'uk_bwPUw3HInCfOQQUj67MeG-wv-JVtVdHZeOr910i4qvh7X9qD8v5ZJjKFmzF-VkWZ',
  phoneNumber: '+38631886977',
  apiUrl: 'https://api.httpsms.com/v1/messages/send',
  businessName: 'Aaa',
  firebaseUrl: 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app',
};

// Send SMS via HTTP SMS API
async function sendSMS(phoneNumber, message) {
  try {
    const response = await fetch(SMS_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SMS_CONFIG.apiKey,
      },
      body: JSON.stringify({
        from: SMS_CONFIG.phoneNumber,
        to: phoneNumber,
        content: message,
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
