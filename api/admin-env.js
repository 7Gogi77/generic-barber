/**
 * Returns the admin credentials sourced from Vercel environment variables.
 * Accessing this endpoint requires the env vars (ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET) to be populated.
 */
const crypto = require('crypto');

function getSha256(value = '') {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export default function handler(req, res) {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin environment not configured' });
  }

  const payload = {
    username: ADMIN_USERNAME,
    passwordHash: getSha256(ADMIN_PASSWORD),
    secret: ADMIN_SECRET
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json(payload);
}

export const config = {
  maxDuration: 5
};
