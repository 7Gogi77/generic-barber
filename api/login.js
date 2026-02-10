const crypto = require('crypto');

// Simple HMAC-signed token using Vercel env vars
// Required env vars: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET

function safeEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return crypto.timingSafeEqual(bufA, bufB) && bufA.length === bufB.length;
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const envUser = process.env.ADMIN_USERNAME || '';
  const envPass = process.env.ADMIN_PASSWORD || '';

  // Compare safely
  if (!safeEqual(username, envUser) || !safeEqual(password, envPass)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const secret = process.env.ADMIN_SECRET || 'change-me';
  const now = Date.now();
  const exp = now + 60 * 60 * 1000; // 1 hour
  const payload = JSON.stringify({ username, iat: now, exp });
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64');

  const token = Buffer.from(payload).toString('base64') + '.' + sig;

  // Respond with token (client stores in sessionStorage)
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ token, exp });
};
