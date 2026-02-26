/**
 * SMS INTEGRATION - Add this to your appointment save code
 * 
 * This shows how to integrate SMS notifications with your existing
 * Firebase Realtime Database setup.
 */

// ============================================
// OPTION 1: TWILIO (Automatic with Firestore)
// ============================================

/**
 * When saving appointment, also save to Firestore to trigger SMS
 * This works with the Firebase Cloud Function automatically
 */
async function saveAppointmentWithSMS(appointmentData) {
  try {
    // 1. Save to Realtime Database (your existing code)
    const realtimeRef = await database.ref('schedule/events').push(appointmentData);
    const appointmentId = realtimeRef.key;

    // 2. ALSO save to Firestore to trigger SMS Cloud Function
    if (typeof firebase.firestore !== 'undefined') {
      await firebase.firestore().collection('appointments').doc(appointmentId).set({
        ...appointmentData,
        id: appointmentId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Appointment saved to Firestore - SMS will be sent automatically');
    }

    return { success: true, id: appointmentId };
  } catch (error) {
    console.error('❌ Error saving appointment:', error);
    return { success: false, error };
  }
}

// ============================================
// OPTION 2: ANDROID SMS GATEWAY (Manual)
// ============================================

/**
 * Send SMS using Android phone gateway
 * Replace API_KEY and DEVICE_ID with values from SMS Gateway app
 */
async function sendSMSViaAndroid(phoneNumber, message) {
  const API_KEY = 'your_api_key_here'; // Get from SMS Gateway app
  const DEVICE_ID = 'your_device_id_here'; // Get from SMS Gateway app

  try {
    const response = await fetch('https://smsgateway.me/api/v4/message/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY,
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        message: message,
        deviceId: DEVICE_ID,
      }),
    });

    const result = await response.json();
    console.log('✅ SMS sent via Android Gateway:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return { success: false, error };
  }
}

/**
 * Save appointment and send SMS manually
 */
async function saveAppointmentWithManualSMS(appointmentData) {
  try {
    // 1. Save to Realtime Database
    const realtimeRef = await database.ref('schedule/events').push(appointmentData);
    const appointmentId = realtimeRef.key;

    // 2. Generate management link
    const baseUrl = window.location.origin;
    const manageLink = `${baseUrl}/rezervacija.html?id=${appointmentId}`;

    // 3. Compose SMS message
    const message = `Hvala za vaše naročilo na termin. Pošiljamo vam link do upravljanja vašega termina: ${manageLink}`;

    // 4. Send SMS
    const phoneNumber = appointmentData.phoneNumber;
    if (phoneNumber && phoneNumber.startsWith('+')) {
      await sendSMSViaAndroid(phoneNumber, message);
    } else {
      console.warn('⚠️ Invalid phone number format. Must start with + (e.g., +381...)');
    }

    return { success: true, id: appointmentId };
  } catch (error) {
    console.error('❌ Error saving appointment:', error);
    return { success: false, error };
  }
}

// ============================================
// INTEGRATION EXAMPLE
// ============================================

/**
 * Example: Update your existing saveBooking function
 * Find this in your poslovni-panel.3f8a1c.html or admin files
 */

// BEFORE (your current code):
async function saveBooking(bookingData) {
  const ref = await database.ref('schedule/events').push(bookingData);
  console.log('Saved booking:', ref.key);
}

// AFTER (with SMS - choose one):

// Option 1: Twilio (Firestore trigger)
async function saveBooking(bookingData) {
  const result = await saveAppointmentWithSMS(bookingData);
  if (result.success) {
    console.log('✅ Booking saved and SMS queued:', result.id);
    showSuccessMessage('Termin je shranjen! SMS bo poslan stranki.');
  } else {
    console.error('❌ Error:', result.error);
    showErrorMessage('Napaka pri shranjevanju termina.');
  }
}

// Option 2: Android Gateway (manual)
async function saveBooking(bookingData) {
  const result = await saveAppointmentWithManualSMS(bookingData);
  if (result.success) {
    console.log('✅ Booking saved and SMS sent:', result.id);
    showSuccessMessage('Termin je shranjen in SMS je poslan!');
  } else {
    console.error('❌ Error:', result.error);
    showErrorMessage('Napaka pri shranjevanju termina.');
  }
}

// ============================================
// PHONE NUMBER VALIDATION
// ============================================

/**
 * Validate phone number before saving
 * Ensures proper format for SMS delivery
 */
function validatePhoneNumber(phoneNumber) {
  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s-]/g, '');

  // Check if starts with +
  if (!cleaned.startsWith('+')) {
    return {
      valid: false,
      error: 'Številka mora začeti z + in držano kodo (npr. +386...)',
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

// Usage in your booking form:
function onPhoneNumberInput(inputElement) {
  const validation = validatePhoneNumber(inputElement.value);
  if (!validation.valid) {
    inputElement.setCustomValidity(validation.error);
    console.warn('⚠️', validation.error);
  } else {
    inputElement.setCustomValidity('');
    inputElement.value = validation.cleaned; // Update to cleaned format
    console.log('✅ Valid phone number:', validation.cleaned);
  }
}

// ============================================
// EXAMPLE: COMPLETE INTEGRATION
// ============================================

/**
 * Complete example showing form submission with SMS
 */
async function handleBookingFormSubmit(event) {
  event.preventDefault();

  // Get form data
  const formData = {
    workerName: document.getElementById('workerSelect').value,
    clientName: document.getElementById('clientName').value,
    phoneNumber: document.getElementById('phoneNumber').value,
    start: document.getElementById('startTime').value,
    end: document.getElementById('endTime').value,
    service: document.getElementById('service').value,
    notes: document.getElementById('notes').value,
  };

  // Validate phone number
  const phoneValidation = validatePhoneNumber(formData.phoneNumber);
  if (!phoneValidation.valid) {
    alert(phoneValidation.error);
    return;
  }
  formData.phoneNumber = phoneValidation.cleaned;

  // Show loading
  showLoadingSpinner();

  // Save and send SMS (choose your method)
  const result = await saveAppointmentWithSMS(formData); // Twilio
  // OR
  // const result = await saveAppointmentWithManualSMS(formData); // Android

  // Hide loading
  hideLoadingSpinner();

  // Show result
  if (result.success) {
    alert('✅ Termin je shranjen! SMS obvestilo je bilo poslano stranki.');
    closeModal();
    calendar.refetchEvents(); // Refresh calendar
  } else {
    alert('❌ Napaka pri shranjevanju termina. Prosimo poskusite ponovno.');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function showLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'block';
}

function hideLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'none';
}

function showSuccessMessage(message) {
  // Implement your success notification
  console.log('✅', message);
}

function showErrorMessage(message) {
  // Implement your error notification
  console.error('❌', message);
}
