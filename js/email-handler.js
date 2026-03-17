/**
 * Email Handler — Appointment Email Notifications
 * Sends confirmation / reschedule / cancel emails via /api/send-email proxy.
 *
 * Templates use the same {ime}, {posel}, {datum}, {cas}, {link} variables as SMS.
 * HTML email wraps the text in a branded template.
 */

// ========== HELPERS ==========

function _emailGetBusiness() {
  try {
    var b = localStorage.getItem('site_config_backup');
    if (b) { var c = JSON.parse(b); if (c && c.shopName) return c.shopName; }
  } catch (_) {}
  if (window.SITE_CONFIG && window.SITE_CONFIG.shopName) return window.SITE_CONFIG.shopName;
  return 'Naš salon';
}

function _emailGetTemplates() {
  try {
    var s = JSON.parse(localStorage.getItem('bookingSettings') || '{}');
    return s.emailTemplates || {};
  } catch (_) { return {}; }
}

function _emailIsEnabled() {
  var t = _emailGetTemplates();
  return t.enabled !== false && t.enabled !== undefined ? !!t.enabled : false;
}

function _emailApplyTemplate(tpl, vars) {
  return tpl
    .replace(/\{ime\}/g,   vars.ime   || '')
    .replace(/\{posel\}/g, vars.posel || _emailGetBusiness())
    .replace(/\{datum\}/g, vars.datum || '')
    .replace(/\{cas\}/g,   vars.cas   || '')
    .replace(/\{link\}/g,  vars.link  || '');
}

function _emailGetProductionUrl() {
  if (window.SMSHandler && window.SMSHandler.config && window.SMSHandler.config.productionUrl) {
    return window.SMSHandler.config.productionUrl;
  }
  return window.location.origin;
}

/** Wrap plain text in a simple branded HTML email */
function _emailWrapHtml(bodyText, businessName) {
  // Convert newlines to <br> for HTML
  var htmlBody = bodyText.replace(/\n/g, '<br>');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f5f5f7;">'
    + '<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">'
    + '<div style="background:#1c1c1e;padding:24px 28px;text-align:center;">'
    + '<h2 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:0.3px;">' + businessName + '</h2>'
    + '</div>'
    + '<div style="padding:28px 28px 20px;">'
    + '<p style="font-size:15px;line-height:1.6;color:#1c1c1e;margin:0 0 16px;">' + htmlBody + '</p>'
    + '</div>'
    + '<div style="padding:16px 28px;border-top:1px solid #e5e5ea;text-align:center;">'
    + '<p style="font-size:12px;color:#8e8e93;margin:0;">' + businessName + '</p>'
    + '</div>'
    + '</div></body></html>';
}

// ========== CORE SEND ==========

async function _emailSend(to, subject, text) {
  if (!to) return { success: false, error: 'No email address' };
  var businessName = _emailGetBusiness();
  try {
    var resp = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: to,
        subject: subject,
        text: text,
        html: _emailWrapHtml(text, businessName)
      })
    });
    var result = await resp.json();
    return resp.ok && result.success ? { success: true } : { success: false, error: result.error || 'Unknown' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ========== APPOINTMENT CONFIRMATION ==========

async function emailSendConfirmation(appointment) {
  if (!_emailIsEnabled()) return { success: false, error: 'Email disabled' };
  var tmpl = _emailGetTemplates();
  if (tmpl.confirmationEnabled === false) return { success: false, error: 'Disabled' };

  var email = appointment.email;
  if (!email) return { success: false, error: 'No email' };

  var manageLink = _emailGetProductionUrl() + '/manage-appointment.html?id=' + appointment.id;
  var businessName = _emailGetBusiness();

  var defaultMsg = 'Pozdravljeni {ime},\n\nhvala za vašo rezervacijo pri {posel}!\n\nVaš termin lahko upravljate na: {link}\n\nSe vidimo!';
  var text = _emailApplyTemplate(tmpl.confirmationMessage || defaultMsg, {
    ime: appointment.customer || '',
    posel: businessName,
    link: manageLink
  });

  return await _emailSend(email, 'Potrditev termina — ' + businessName, text);
}

// ========== RESCHEDULE ==========

async function emailSendReschedule(appointment, dateLabel, timeLabel) {
  if (!_emailIsEnabled()) return { success: false, error: 'Email disabled' };
  var tmpl = _emailGetTemplates();
  var email = appointment.email || (appointment.extendedProps && appointment.extendedProps.email) || '';
  if (!email) return { success: false, error: 'No email' };

  var businessName = _emailGetBusiness();
  var customerName = appointment.customer || (appointment.extendedProps && appointment.extendedProps.customer) || '';

  var defaultMsg = 'Pozdravljeni {ime},\n\nvaš termin pri {posel} je bil spremenjen.\n\nNov datum: {datum} ob {cas}\n\nSe vidimo!';
  var text = _emailApplyTemplate(tmpl.rescheduleMessage || defaultMsg, {
    ime: customerName,
    posel: businessName,
    datum: dateLabel || '',
    cas: timeLabel || ''
  });

  return await _emailSend(email, 'Sprememba termina — ' + businessName, text);
}

// ========== CANCELLATION ==========

async function emailSendCancel(appointment) {
  if (!_emailIsEnabled()) return { success: false, error: 'Email disabled' };
  var tmpl = _emailGetTemplates();
  var ep = appointment.extendedProps || appointment;
  var email = ep.email || appointment.email || '';
  if (!email) return { success: false, error: 'No email' };

  var businessName = _emailGetBusiness();
  var customerName = ep.customer || appointment.customer || '';

  var defaultMsg = 'Pozdravljeni {ime},\n\nvaš termin pri {posel} je bil odpovedan.\n\nKontaktirajte nas za novo rezervacijo.\n\nLep pozdrav!';
  var text = _emailApplyTemplate(tmpl.cancelMessage || defaultMsg, {
    ime: customerName,
    posel: businessName
  });

  return await _emailSend(email, 'Odpoved termina — ' + businessName, text);
}

// ========== OWNER NOTIFICATION ==========

async function emailNotifyOwner(subject, text) {
  var ownerEmail = '';
  try {
    var bs = JSON.parse(localStorage.getItem('bookingSettings') || '{}');
    ownerEmail = (bs.emailTemplates && bs.emailTemplates.ownerEmail) || '';
  } catch (_) {}
  if (!ownerEmail && window.SITE_CONFIG) {
    ownerEmail = (window.SITE_CONFIG.ownerContact && window.SITE_CONFIG.ownerContact.email) || '';
  }
  if (!ownerEmail) return { success: false, error: 'No owner email' };
  return await _emailSend(ownerEmail, subject, text);
}

// ========== GLOBAL EXPORT ==========

window.EmailHandler = {
  send: _emailSend,
  sendConfirmation: emailSendConfirmation,
  sendReschedule: emailSendReschedule,
  sendCancel: emailSendCancel,
  notifyOwner: emailNotifyOwner
};
