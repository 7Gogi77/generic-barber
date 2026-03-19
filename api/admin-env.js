function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    maxAttempts: parseInteger(process.env.ADMIN_MAX_ATTEMPTS, 3),
    lockoutDuration: parseInteger(process.env.ADMIN_LOCKOUT_DURATION, 60000),
    enabled: parseBoolean(process.env.ADMIN_ENABLED, true)
  };

  const databaseUrl = (process.env.BACKEND_DATABASE_URL || process.env.DATABASE_URL || '').trim();
  if (databaseUrl) {
    payload.databaseUrl = databaseUrl.replace(/\/+$/, '');
  }

  if (!payload.passwordHash) {
    payload.error = 'Admin credentials not provided';
  }

  res.status(200).json(payload);
}