/**
 * Vercel Serverless Function — Viber Proxy
 * Sends Viber messages via Viber Business Messages API.
 *
 * POST /api/send-viber
 * Body: { to: "+38641234567", message: "Your message" }
 *
 * Environment variables required:
 *   VIBER_AUTH_TOKEN — Viber Business bot auth token
 *   VIBER_SENDER_NAME — Sender name shown in Viber (e.g. "Salon Ana")
 */

const VIBER_API_URL = 'https://chatapi.viber.com/pa/send_message';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const authToken = process.env.VIBER_AUTH_TOKEN;
  const senderName = process.env.VIBER_SENDER_NAME || 'Obvestilo';
  if (!authToken) {
    return res.status(500).json({ success: false, error: 'Viber auth token not configured' });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, message' });
  }

  let formattedTo = String(to).trim();
  if (formattedTo.startsWith('0')) formattedTo = '+386' + formattedTo.substring(1);
  // Viber uses phone numbers without + prefix
  const viberId = formattedTo.replace(/^\+/, '');

  try {
    const response = await fetch(VIBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Viber-Auth-Token': authToken,
      },
      body: JSON.stringify({
        receiver: viberId,
        min_api_version: 1,
        sender: { name: senderName },
        type: 'text',
        text: message,
      }),
    });

    const result = await response.json();
    if (result.status === 0) {
      return res.status(200).json({ success: true, data: result });
    } else {
      return res.status(400).json({ success: false, error: result.status_message || 'Viber send failed' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = { maxDuration: 15 };
