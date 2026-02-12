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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { username, password } = await readRequestBody(req);
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET } = process.env;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    sendJson(res, 403, { error: 'Admin credentials missing' });
    return;
  }

  if (!username || !password) {
    sendJson(res, 400, { error: 'Username and password required' });
    return;
  }

  if (username !== ADMIN_USERNAME) {
    sendJson(res, 401, { error: 'Invalid username or password' });
    return;
  }

  const passwordHash = getSha256(password);
  const expectedHash = getSha256(ADMIN_PASSWORD);

  if (passwordHash !== expectedHash) {
    sendJson(res, 401, { error: 'Invalid username or password' });
    return;
  }

  const token = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(`${username}|${Date.now()}`)
    .digest('hex');

  sendJson(res, 200, { token });
}

export const config = { maxDuration: 5 };