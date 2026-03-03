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
  phoneNumber: '+38631886977',          // Your Android phone number (the one sending SMS)
  apiUrl: 'https://api.httpsms.com/v1/messages/send',
  
  businessName: 'Aaa',            // Your business name
  appUrl: window.location.origin,
  productionUrl: 'https://demo-stran.vercel.app', // Production/public URL for SMS links
};

// ========== TEMPLATE HELPERS ==========

// Substitute {ime}, {posel}, {datum}, {cas}, {link} in a template string
function applyTemplate(template, vars) {
  return template
    .replace(/\{ime\}/g,   vars.ime   || '')
    .replace(/\{posel\}/g, vars.posel || SMS_CONFIG.businessName)
    .replace(/\{datum\}/g, vars.datum || '')
    .replace(/\{cas\}/g,   vars.cas   || '')
    .replace(/\{link\}/g,  vars.link  || '');
}

// Load editable SMS templates saved from nastavitve rezervacij
function getSmsTemplates() {
  try {
    const s = JSON.parse(localStorage.getItem('bookingSettings') || '{}');
    return s.smsTemplates || {};
  } catch (_) { return {}; }
}

// ========== SMS SENDING FUNCTION ==========

/**
 * Send SMS via Android Gateway
 * @param {string} phoneNumber - Phone with country code (e.g., +381641234567)
 * @param {string} message - SMS text
 * @returns {Promise<Object>} Result object
 */
async function sendSMS(phoneNumber, message) {

  // Auto-format Slovenian numbers: 031... → +38631...
  let formattedPhone = phoneNumber;
  if (formattedPhone && formattedPhone.startsWith('0')) {
    formattedPhone = '+386' + formattedPhone.substring(1);
  }

  // Validate phone number
  if (!formattedPhone || !formattedPhone.startsWith('+')) {
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
        to: formattedPhone,             // Customer's phone number (formatted)
        content: message,               // SMS text
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return { success: true, data: result };
    } else {
      return { success: false, error: result.message || result.error || 'Unknown error' };
    }
  } catch (error) {
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
  const tmpl = getSmsTemplates();
  if (tmpl.confirmationEnabled === false) return { success: false, error: 'Disabled' };

  const phoneNumber   = appointment.phoneNumber;
  const appointmentId = appointment.id;
  const manageLink    = `${SMS_CONFIG.productionUrl}/manage-appointment.html?id=${appointmentId}`;

  const defaultMsg = 'Hvala za vaše naročilo na termin pri {posel}! Upravljanje: {link}';
  const message = applyTemplate(tmpl.confirmationMessage || defaultMsg, {
    ime:   appointment.customer || '',
    posel: SMS_CONFIG.businessName,
    link:  manageLink,
    datum: '',
    cas:   '',
  });

  return await sendSMS(phoneNumber, message);
}

// ========== APPOINTMENT REMINDER SMS ==========

/**
 * Send reminder SMS for appointment tomorrow
 * @param {Object} appointment - Appointment data
 * @returns {Promise<Object>} Result object
 */
async function sendAppointmentReminder(appointment) {
  const tmpl      = getSmsTemplates();
  const phoneNumber = appointment.phoneNumber;
  const startTime   = new Date(appointment.start);
  const hours   = startTime.getHours().toString().padStart(2, '0');
  const minutes = startTime.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  const dateStr = `${startTime.getDate()}. ${startTime.getMonth() + 1}. ${startTime.getFullYear()}`;

  const defaultMsg = '{ime}, jutri ob {cas} imate termin pri {posel}. Se vidimo!';
  const message = applyTemplate(tmpl.reminderMessage || defaultMsg, {
    ime:   appointment.customer || '',
    posel: SMS_CONFIG.businessName,
    datum: dateStr,
    cas:   timeStr,
    link:  '',
  });

  return await sendSMS(phoneNumber, message);
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

    return tomorrowAppointments;
  } catch (error) {
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

  const appointments = await getTomorrowAppointments();

  if (appointments.length === 0) {
    return { total: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const appointment of appointments) {
    // Skip if no phone number
    if (!appointment.phoneNumber) {
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

