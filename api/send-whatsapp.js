/**
 * Vercel Serverless Function — WhatsApp Proxy via Evolution API
 * Evolution API is a self-hosted WhatsApp API gateway.
 *
 * POST /api/send-whatsapp
 * Body: { to: "+38641234567", message: "Your message" }
 *
 * Environment variables required:
 *   EVOLUTION_API_URL      — Evolution API base URL (e.g. https://evo.yourdomain.com)
 *   EVOLUTION_API_KEY      — Global API key
 *   EVOLUTION_INSTANCE     — Instance name (e.g. "barber-whatsapp")
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    return res.status(500).json({ success: false, error: 'Evolution API not configured' });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, message' });
  }

  // Format phone: remove + prefix, WhatsApp uses bare numbers (e.g. 38641234567)
  let number = String(to).trim();
  if (number.startsWith('0')) number = '386' + number.substring(1);
  if (number.startsWith('+')) number = number.substring(1);

  try {
    const url = `${apiUrl.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(instance)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: number,
        text: message,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      return res.status(200).json({ success: true, data: result });
    } else {
      return res.status(response.status).json({ success: false, error: result.message || result.error || 'WhatsApp send failed' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export const config = { maxDuration: 15 };
