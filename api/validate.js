const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const secret = process.env.ADMIN_SECRET || 'change-me';

  try {
    const [b64, sig] = String(token).split('.');
    const payload = Buffer.from(b64, 'base64').toString('utf8');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64');
    if (!sig || !expected || sig !== expected) return res.status(401).json({ valid: false });

    const obj = JSON.parse(payload);
    if (!obj.exp || Date.now() > obj.exp) return res.status(401).json({ valid: false, reason: 'expired' });

    return res.status(200).json({ valid: true, username: obj.username });
  } catch (e) {
    return res.status(400).json({ valid: false, error: 'invalid' });
  }
};
