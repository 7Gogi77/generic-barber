function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getProxyBaseUrl() {
  const explicit = normalizeBaseUrl(process.env.VPS_PUBLIC_BASE_URL);
  if (explicit) {
    return explicit;
  }

  const fallback = normalizeBaseUrl(process.env.SITE_FACTORY_PUBLIC_VPS_BASE_URL);
  if (fallback) {
    return fallback;
  }

  const adminUrl = normalizeBaseUrl(process.env.SITE_FACTORY_VPS_ADMIN_URL);
  if (!adminUrl) {
    return '';
  }

  return adminUrl.replace(/\/_admin\/tenants\/?$/i, '');
}

function normalizePathSegments(pathValue) {
  if (Array.isArray(pathValue)) {
    return pathValue.map((segment) => String(segment || '').trim()).filter(Boolean);
  }

  const single = String(pathValue || '').trim();
  return single ? [single] : [];
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (!chunks.length) {
    return '';
  }

  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const baseUrl = getProxyBaseUrl();
  if (!baseUrl) {
    json(res, 500, { error: 'VPS public base URL is not configured' });
    return;
  }

  const pathSegments = normalizePathSegments(req.query?.path);
  if (!pathSegments.length) {
    json(res, 400, { error: 'Tenant DB path is required' });
    return;
  }

  const upstreamUrl = new URL(`${baseUrl}/tenant-db/${pathSegments.map(encodeURIComponent).join('/')}`);
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (key === 'path') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => upstreamUrl.searchParams.append(key, String(entry)));
      return;
    }

    if (value !== undefined) {
      upstreamUrl.searchParams.set(key, String(value));
    }
  });

  try {
    const requestBody = ['GET', 'HEAD'].includes(req.method || '') ? '' : await readRequestBody(req);
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json'
      },
      ...(requestBody ? { body: requestBody } : {})
    });

    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const payloadText = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.send(payloadText);
  } catch (error) {
    json(res, 502, { error: error instanceof Error ? error.message : 'Tenant DB proxy failed' });
  }
}