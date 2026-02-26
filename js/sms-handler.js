/**
 * SMS Handler - Android SMS Gateway Integration
 * Sends appointment confirmations and reminders via Android phone
 * 
 * Setup: Update credentials below with values from SMS Gateway app
 */

// ========== CONFIGURATION - UPDATE THESE ==========
// Using HTTP SMS (httpsms.com) - FREE Open Source Android SMS Gateway

const SMS_CONFIG = {
  // Get these from: https://httpsms.com/dashboard
  apiKey: 'uk_bwPUw3HInCfOQQUj67MeG-wv-JVtVdHZeOr910i4qvh7X9qD8v5ZJjKFmzF-VkWZ',           // From httpsms.com dashboard
  phoneNumber: '+381641234567',          // Your Android phone number (the one sending SMS)
  apiUrl: 'https://api.httpsms.com/v1/messages/send',
  
  businessName: 'Vaš Frizer',            // Your business name
  appUrl: window.location.origin,
};

// ========== SMS SENDING FUNCTION ==========

/**
 * Send SMS via Android Gateway
 * @param {string} phoneNumber - Phone with country code (e.g., +381641234567)
 * @param {string} message - SMS text
 * @returns {Promise<Object>} Result object
 */
async function sendSMS(phoneNumber, message) {
  console.log('📱 Sending SMS to:', phoneNumber);

  // Validate phone number
  if (!phoneNumber || !phoneNumber.startsWith('+')) {
    console.error('❌ Invalid phone number format. Must start with + (e.g., +381...)');
    return { success: false, error: 'Invalid phone number format' };
  }

  try {
    // HTTP SMS API request
    const response = await fetch(SMS_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SMS_CONFIG.apiKey,
      },
      body: JSON.stringify({
        from: SMS_CONFIG.phoneNumber,  // Your phone number (the sender)
        to: phoneNumber,                // Customer's phone number
        content: message,               // SMS text
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SMS sent successfully:', result);
      return { success: true, data: result };
    } else {
      console.error('❌ SMS sending failed:', result);
      return { success: false, error: result.message || result.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Network error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

    if (response.ok && result.success) {
      console.log('✅ SMS sent successfully:', result);
      return { success: true, data: result };
    } else {
      console.error('❌ SMS sending failed:', result);
      return { success: false, error: result.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Network error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

// ========== APPOINTMENT CONFIRMATION SMS ==========

/**
 * Send confirmation SMS when appointment is created
 * @param {Object} appointment - Appointment data
 * @returns {Promise<Object>} Result object
 */
async function sendAppointmentConfirmation(appointment) {
  const phoneNumber = appointment.phoneNumber;
  const appointmentId = appointment.id;

  // Generate management link
  const manageLink = `${SMS_CONFIG.appUrl}/rezervacija.html?id=${appointmentId}`;

  // Compose message
  const message = `Hvala za vaše naročilo na termin. Pošiljamo vam link do upravljanja vašega termina: ${manageLink}`;

  // Send SMS
  const result = await sendSMS(phoneNumber, message);

  // Log to console
  if (result.success) {
    console.log(`✅ Confirmation SMS sent to ${phoneNumber}`);
  } else {
    console.error(`❌ Failed to send confirmation SMS to ${phoneNumber}:`, result.error);
  }

  return result;
}

// ========== APPOINTMENT REMINDER SMS ==========

/**
 * Send reminder SMS for appointment tomorrow
 * @param {Object} appointment - Appointment data
 * @returns {Promise<Object>} Result object
 */
async function sendAppointmentReminder(appointment) {
  const phoneNumber = appointment.phoneNumber;
  const startTime = new Date(appointment.start);

  // Format time (e.g., "14:30")
  const hours = startTime.getHours().toString().padStart(2, '0');
  const minutes = startTime.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Compose message
  const message = `Pozdravljeni, jutri ob ${timeStr} imate termin pri ${SMS_CONFIG.businessName}.`;

  // Send SMS
  const result = await sendSMS(phoneNumber, message);

  // Log to console
  if (result.success) {
    console.log(`✅ Reminder SMS sent to ${phoneNumber} for ${timeStr}`);
  } else {
    console.error(`❌ Failed to send reminder SMS to ${phoneNumber}:`, result.error);
  }

  return result;
}

// ========== GET TOMORROW'S APPOINTMENTS ==========

/**
 * Get all appointments scheduled for tomorrow
 * @returns {Promise<Array>} Array of appointments
 */
async function getTomorrowAppointments() {
  try {
    // Calculate tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Load appointments from Firebase
    const snapshot = await firebase.database().ref('schedule/events').once('value');
    const allAppointments = snapshot.val() || {};

    // Filter for tomorrow's appointments
    const tomorrowAppointments = [];

    for (const [id, appointment] of Object.entries(allAppointments)) {
      const appointmentDate = new Date(appointment.start);

      if (appointmentDate >= tomorrow && appointmentDate < dayAfterTomorrow) {
        tomorrowAppointments.push({
          ...appointment,
          id,
        });
      }
    }

    console.log(`📅 Found ${tomorrowAppointments.length} appointments for tomorrow`);
    return tomorrowAppointments;
  } catch (error) {
    console.error('❌ Error fetching tomorrow appointments:', error);
    return [];
  }
}

// ========== SEND ALL REMINDERS ==========

/**
 * Send reminder SMS for all appointments tomorrow
 * Call this function daily at 10 AM
 * @returns {Promise<Object>} Summary of sent reminders
 */
async function sendDailyReminders() {
  console.log('🔔 Starting daily reminder process...');

  const appointments = await getTomorrowAppointments();

  if (appointments.length === 0) {
    console.log('ℹ️ No appointments tomorrow - no reminders to send');
    return { total: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const appointment of appointments) {
    // Skip if no phone number
    if (!appointment.phoneNumber) {
      console.warn(`⚠️ Appointment ${appointment.id} has no phone number - skipping`);
      failed++;
      continue;
    }

    // Send reminder
    const result = await sendAppointmentReminder(appointment);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
  }

  const summary = {
    total: appointments.length,
    sent,
    failed,
  };

  console.log('✅ Daily reminders complete:', summary);
  return summary;
}

// ========== PHONE NUMBER VALIDATION ==========

/**
 * Validate and format phone number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {Object} Validation result with cleaned number
 */
function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return { valid: false, error: 'Telefonska številka je obvezna' };
  }

  // Remove spaces, dashes, parentheses
  let cleaned = phoneNumber.replace(/[\s\-()]/g, '');

  // Add + if missing but starts with country code
  if (/^(381|386|385)\d+$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  // Check if starts with +
  if (!cleaned.startsWith('+')) {
    return {
      valid: false,
      error: 'Številka mora začeti z + in držano kodo (npr. +381...)',
    };
  }

  // Check if length is reasonable (8-15 digits after +)
  if (cleaned.length < 9 || cleaned.length > 16) {
    return {
      valid: false,
      error: 'Neveljavna dolžina telefonske številke',
    };
  }

  // Check if contains only + and digits
  if (!/^\+\d+$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Številka lahko vsebuje samo + in številke',
    };
  }

  return { valid: true, cleaned };
}

// ========== EXPORT FOR GLOBAL USE ==========

// Make functions available globally
window.SMSHandler = {
  sendSMS,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendDailyReminders,
  getTomorrowAppointments,
  validatePhoneNumber,
  config: SMS_CONFIG,
};

console.log('✅ SMS Handler loaded. Use window.SMSHandler for SMS functions.');
