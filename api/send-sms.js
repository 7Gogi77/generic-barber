/**
 * Vercel Serverless Function — SMS Proxy
 * Forwards SMS requests to SMS Gate (api.sms-gate.app) cloud gateway.
 * The gateway relays messages to a connected Android phone which sends SMS via SIM card.
 *
 * POST /api/send-sms
 * Body: { to: "+38641234567", message: "Your appointment..." }
 *
 * Environment variables required (set in Vercel dashboard):
 *   SMS_GATE_USERNAME — Basic Auth username from SMS Gate app
 *   SMS_GATE_PASSWORD — Basic Auth password from SMS Gate app
 */

const SMS_GATE_URL = 'https://api.sms-gate.app/3rdparty/v1/message';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const username = process.env.SMS_GATE_USERNAME;
  const password = process.env.SMS_GATE_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({ success: false, error: 'SMS gateway credentials not configured' });
  }

  const { to, message } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, message' });
  }

  // Auto-format Slovenian numbers: 031... → +38631...
  let formattedTo = String(to).trim();
  if (formattedTo.startsWith('0')) {
    formattedTo = '+386' + formattedTo.substring(1);
  }

  if (!formattedTo.startsWith('+')) {
    return res.status(400).json({ success: false, error: 'Invalid phone number — must start with + or country prefix' });
  }

  try {
    const basicAuth = Buffer.from(username + ':' + password).toString('base64');

    const response = await fetch(SMS_GATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + basicAuth,
      },
      body: JSON.stringify({
        phoneNumbers: [formattedTo],
        message: message,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data: result });
    } else {
      return res.status(response.status).json({ success: false, error: result.message || result.error || 'SMS Gate API error' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = { maxDuration: 10 };
