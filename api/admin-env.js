/**
 * Returns the admin credentials sourced from Vercel environment variables.
 * Accessing this endpoint requires the env vars (ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET) to be populated.
 */
const crypto = require('crypto');

function getSha256(value = '') {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function adminHandler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    sendJson(res, 403, { error: 'Admin environment not configured' });
    return;
  }

  const payload = {
    username: ADMIN_USERNAME,
    passwordHash: getSha256(ADMIN_PASSWORD),
    secret: ADMIN_SECRET
  };

  sendJson(res, 200, payload);
}

module.exports = adminHandler;
module.exports.config = { maxDuration: 5 };
