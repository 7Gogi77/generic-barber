/**
 * WhatsApp Handler — Appointment Notifications via Meta WhatsApp Cloud API
 *
 * Uses /api/send-whatsapp proxy to Meta Graph API for WhatsApp messages.
 * Requires WHATSAPP_TOKEN + WHATSAPP_PHONE_ID environment variables in Vercel.
 *
 * Templates use {ime}, {posel}, {datum}, {cas}, {link} variables.
 */

// ========== HELPERS ==========

function _msgGetBusiness() {
  try {
    var b = localStorage.getItem('site_config_backup');
    if (b) { var c = JSON.parse(b); if (c && c.shopName) return c.shopName; }
  } catch (_) {}
  if (window.SITE_CONFIG && window.SITE_CONFIG.shopName) return window.SITE_CONFIG.shopName;
  return 'Naš salon';
}

function _msgGetSettings(key) {
  try {
    var s = JSON.parse(localStorage.getItem('bookingSettings') || '{}');
    return s[key] || {};
  } catch (_) { return {}; }
}

function _msgApplyTemplate(tpl, vars) {
  return tpl
    .replace(/\{ime\}/g,   vars.ime   || '')
    .replace(/\{posel\}/g, vars.posel || _msgGetBusiness())
    .replace(/\{datum\}/g, vars.datum || '')
    .replace(/\{cas\}/g,   vars.cas   || '')
    .replace(/\{link\}/g,  vars.link  || '');
}

function _msgGetProductionUrl() {
  if (window.SMSHandler && window.SMSHandler.config && window.SMSHandler.config.productionUrl) {
    return window.SMSHandler.config.productionUrl;
  }
  return window.location.origin;
}

// ========== WHATSAPP ==========

var WhatsAppHandler = {
  isEnabled: function() {
    return !!_msgGetSettings('whatsappTemplates').enabled;
  },

  sendConfirmation: async function(appointment) {
    if (!this.isEnabled()) return { success: false, error: 'WhatsApp disabled' };
    var phone = appointment.phoneNumber || (appointment.extendedProps && appointment.extendedProps.phone) || '';
    if (!phone) return { success: false, error: 'No phone' };

    var tmpl = _msgGetSettings('whatsappTemplates');
    var manageLink = _msgGetProductionUrl() + '/manage-appointment.html?id=' + appointment.id;

    var startDate = new Date(appointment.start);
    var dateStr = startDate.toLocaleDateString('sl-SI');
    var timeStr = startDate.getHours().toString().padStart(2, '0') + ':' + startDate.getMinutes().toString().padStart(2, '0');

    var defaultMsg = 'Hvala za rezervacijo pri {posel}! Vaš termin: {datum} ob {cas}. Upravljanje: {link}';
    var text = _msgApplyTemplate(tmpl.confirmationMessage || defaultMsg, {
      ime: appointment.customer || '',
      posel: _msgGetBusiness(),
      datum: dateStr,
      cas: timeStr,
      link: manageLink
    });

    return await _whatsappSend(phone, text);
  },

  sendReschedule: async function(appointment, dateLabel, timeLabel) {
    if (!this.isEnabled()) return { success: false, error: 'WhatsApp disabled' };
    var phone = (appointment.extendedProps && appointment.extendedProps.phone) || appointment.phoneNumber || '';
    if (!phone) return { success: false, error: 'No phone' };

    var text = _msgApplyTemplate('{ime}, vaš termin pri {posel} je bil spremenjen na {datum} ob {cas}.', {
      ime: (appointment.extendedProps && appointment.extendedProps.customer) || appointment.customer || '',
      posel: _msgGetBusiness(),
      datum: dateLabel || '',
      cas: timeLabel || ''
    });

    return await _whatsappSend(phone, text);
  },

  sendCancel: async function(appointment) {
    if (!this.isEnabled()) return { success: false, error: 'WhatsApp disabled' };
    var ep = appointment.extendedProps || appointment;
    var phone = ep.phone || appointment.phoneNumber || '';
    if (!phone) return { success: false, error: 'No phone' };

    var text = _msgApplyTemplate('{ime}, vaš termin pri {posel} je bil odpovedan.', {
      ime: ep.customer || '',
      posel: _msgGetBusiness()
    });

    return await _whatsappSend(phone, text);
  }
};

async function _whatsappSend(phone, message) {
  // Format phone number
  var formatted = String(phone).trim();
  if (formatted.startsWith('0')) formatted = '+386' + formatted.substring(1);
  if (!formatted.startsWith('+')) return { success: false, error: 'Invalid phone' };

  try {
    var resp = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: formatted, message: message })
    });
    var result = await resp.json();
    return resp.ok && result.success ? { success: true } : { success: false, error: result.error || 'Failed' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ========== GLOBAL EXPORTS ==========

window.WhatsAppHandler = WhatsAppHandler;
