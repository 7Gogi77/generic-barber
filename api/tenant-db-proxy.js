function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function addBaseCandidate(set, value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    return;
  }

  set.add(normalized);

  try {
    const parsed = new URL(normalized);
    if (!parsed.port) {
      const withPort = new URL(normalized);
      withPort.port = '3001';
      set.add(normalizeBaseUrl(withPort.toString()));
    }

    if (parsed.protocol === 'https:') {
      const asHttp = new URL(normalized);
      asHttp.protocol = 'http:';
      set.add(normalizeBaseUrl(asHttp.toString()));

      if (!asHttp.port) {
        asHttp.port = '3001';
        set.add(normalizeBaseUrl(asHttp.toString()));
      }
    }
  } catch {
    // Ignore invalid URLs.
  }
}

function getProxyBaseUrls() {
  const candidates = new Set();

  addBaseCandidate(candidates, process.env.VPS_PUBLIC_BASE_URL);
  addBaseCandidate(candidates, process.env.SITE_FACTORY_PUBLIC_VPS_BASE_URL);

  const adminUrl = normalizeBaseUrl(process.env.SITE_FACTORY_VPS_ADMIN_URL).replace(/\/_admin\/tenants\/?$/i, '');
  addBaseCandidate(candidates, adminUrl);

  return [...candidates];
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

  return chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
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

  const baseUrls = getProxyBaseUrls();
  if (!baseUrls.length) {
    json(res, 500, { error: 'VPS public base URL is not configured' });
    return;
  }

  const tenantId = String(req.query?.tenantId || '').trim();
  const relativePath = String(req.query?.path || '').trim().replace(/^\/+/, '');

  if (!tenantId) {
    json(res, 400, { error: 'tenantId is required' });
    return;
  }

  if (!relativePath) {
    json(res, 400, { error: 'path is required' });
    return;
  }

  try {
    const requestBody = ['GET', 'HEAD'].includes(req.method || '') ? '' : await readRequestBody(req);
    let lastStatus = 502;
    let lastContentType = 'application/json; charset=utf-8';
    let lastPayloadText = JSON.stringify({ error: 'Tenant DB proxy failed' });

    for (const baseUrl of baseUrls) {
      const upstreamUrl = new URL(`${baseUrl}/tenant-db/${encodeURIComponent(tenantId)}/${relativePath}`);
      Object.entries(req.query || {}).forEach(([key, value]) => {
        if (key === 'tenantId' || key === 'path') {
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
        const upstream = await fetch(upstreamUrl, {
          method: req.method,
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/json'
          },
          ...(requestBody ? { body: requestBody } : {})
        });

        const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
        const payloadText = await upstream.text();

        lastStatus = upstream.status;
        lastContentType = contentType;
        lastPayloadText = payloadText;

        if (upstream.ok) {
          res.status(upstream.status);
          res.setHeader('Content-Type', contentType);
          res.send(payloadText);
          return;
        }

        if (upstream.status !== 404) {
          break;
        }
      } catch (error) {
        lastStatus = 502;
        lastContentType = 'application/json; charset=utf-8';
        lastPayloadText = JSON.stringify({
          error: error instanceof Error ? error.message : 'Tenant DB proxy failed'
        });
      }
    }

    res.status(lastStatus);
    res.setHeader('Content-Type', lastContentType);
    res.send(lastPayloadText);
  } catch (error) {
    json(res, 502, { error: error instanceof Error ? error.message : 'Tenant DB proxy failed' });
  }
}