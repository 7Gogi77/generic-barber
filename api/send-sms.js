/**
 * Vercel Serverless Function — SMS Proxy
 * Forwards SMS requests to httpsms.com server-side, bypassing browser CORS restrictions.
 *
 * POST /api/send-sms
 * Body: { to: "+38641234567", message: "Your appointment..." }
 */

const SMS_API_KEY    = 'uk_bwPUw3HInCfOQQUj67MeG-wv-JVtVdHZeOr910i4qvh7X9qD8v5ZJjKFmzF-VkWZ';
const SMS_FROM       = '+38631886977';
const SMS_API_URL    = 'https://api.httpsms.com/v1/messages/send';

export default async function handler(req, res) {
  // Allow CORS from the same origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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
    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SMS_API_KEY,
      },
      body: JSON.stringify({
        from:    SMS_FROM,
        to:      formattedTo,
        content: message,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data: result });
    } else {
      return res.status(response.status).json({ success: false, error: result.message || result.error || 'httpsms API error' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = { maxDuration: 10 };
