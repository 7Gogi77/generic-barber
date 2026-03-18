/**
 * Vercel Serverless Function — WhatsApp via Meta Cloud API
 *
 * POST /api/send-whatsapp
 * Body: { to: "+38641234567", message: "Your text" }
 *   OR  { to: "+38641234567", template: "booking_confirm", language: "sl", parameters: ["Salon","20.3.2026","14:00","https://..."] }
 *
 * Environment variables required:
 *   WHATSAPP_TOKEN    — Permanent System-User access token from Meta Business
 *   WHATSAPP_PHONE_ID — Phone Number ID from WhatsApp Business dashboard
 */

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ success: false, error: 'WhatsApp Cloud API not configured' });
  }

  const { to, message, template, language, parameters } = req.body || {};
  if (!to || (!message && !template)) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to + message or to + template' });
  }

  // Strip to bare digits with country code (no +)
  let number = String(to).trim();
  if (number.startsWith('0')) number = '386' + number.substring(1);
  if (number.startsWith('+')) number = number.substring(1);
  number = number.replace(/[^0-9]/g, '');

  // Build payload — template message or text message
  let payload;
  if (template) {
    payload = {
      messaging_product: 'whatsapp',
      to: number,
      type: 'template',
      template: {
        name: template,
        language: { code: language || 'sl' },
      },
    };
    // Attach body parameters if provided
    if (Array.isArray(parameters) && parameters.length > 0) {
      payload.template.components = [{
        type: 'body',
        parameters: parameters.map(p => ({ type: 'text', text: String(p) })),
      }];
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      to: number,
      type: 'text',
      text: { preview_url: false, body: message },
    };
  }

  try {
    const url = `${GRAPH_URL}/${encodeURIComponent(phoneId)}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (response.ok) {
      return res.status(200).json({ success: true, data: result });
    } else {
      const errMsg = (result.error && result.error.message) || result.message || 'WhatsApp send failed';
      return res.status(response.status).json({ success: false, error: errMsg });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = { maxDuration: 15 };
