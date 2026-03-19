import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const TENANT_REGISTRY_FILE = path.join(DATA_DIR, 'tenants-registry.json');
const PORT = Number.parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.VPS_DB_ADMIN_TOKEN || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

async function ensureJsonFile(filePath, fallback = '{}') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, fallback, 'utf8');
  }
}

async function readJsonFile(filePath, fallback = '{}') {
  await ensureJsonFile(filePath, fallback);
  const raw = await fs.readFile(filePath, 'utf8');
  return raw.trim() ? JSON.parse(raw) : {};
}

async function writeJsonFile(filePath, data) {
  await ensureJsonFile(filePath);
  const nextContent = JSON.stringify(data, null, 2);
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, nextContent, 'utf8');
  await fs.rename(tempFile, filePath);
}

async function ensureDatabaseFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(TENANTS_DIR, { recursive: true });
  await ensureJsonFile(DATA_FILE);
  await ensureJsonFile(TENANT_REGISTRY_FILE);
}

async function readDatabase() {
  return readJsonFile(DATA_FILE);
}

async function writeDatabase(data) {
  return writeJsonFile(DATA_FILE, data);
}

async function readTenantRegistry() {
  return readJsonFile(TENANT_REGISTRY_FILE);
}

async function writeTenantRegistry(data) {
  return writeJsonFile(TENANT_REGISTRY_FILE, data);
}

let mutationQueue = Promise.resolve();

function enqueueMutation(task) {
  const scheduled = mutationQueue.then(task, task);
  mutationQueue = scheduled.catch(() => {});
  return scheduled;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function parseDbPath(pathname) {
  if (!pathname.startsWith('/db/') || !pathname.endsWith('.json')) {
    return null;
  }

  const trimmed = pathname.slice(4, -5).replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return [];
  }

  return trimmed.split('/').filter(Boolean).map(decodeURIComponent);
}

function parseTenantDbPath(pathname) {
  if (!pathname.startsWith('/tenant-db/') || !pathname.endsWith('.json')) {
    return null;
  }

  const trimmed = pathname.slice('/tenant-db/'.length, -5).replace(/^\/+|\/+$/g, '');
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split('/').filter(Boolean).map(decodeURIComponent);
  const [tenantId, ...segments] = parts;
  if (!tenantId) {
    return null;
  }

  return {
    tenantId,
    segments
  };
}

function normalizeTenantId(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function assertValidTenantId(input) {
  const tenantId = normalizeTenantId(input);
  if (!tenantId) {
    throw new Error('Valid tenantId is required');
  }
  return tenantId;
}

function getTenantFilePath(tenantId) {
  return path.join(TENANTS_DIR, `${tenantId}.json`);
}

async function readTenantDatabase(tenantId) {
  return readJsonFile(getTenantFilePath(tenantId));
}

async function writeTenantDatabase(tenantId, data) {
  return writeJsonFile(getTenantFilePath(tenantId), data);
}

function getRequestBaseUrl(req) {
  if (PUBLIC_BASE_URL) {
    return PUBLIC_BASE_URL;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : 'http';
  const host = req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function buildTenantDatabaseUrl(req, tenantId) {
  return `${getRequestBaseUrl(req)}/tenant-db/${tenantId}`;
}

function readAuthToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const customHeader = req.headers['x-admin-token'];
  return typeof customHeader === 'string' ? customHeader.trim() : '';
}

function isAuthorizedAdminRequest(req) {
  return Boolean(ADMIN_TOKEN) && readAuthToken(req) === ADMIN_TOKEN;
}

function createInitialTenantData({ tenantId, businessName = '', siteConfig = null, schedule = null, metadata = null, databaseUrl = '' }) {
  const now = new Date().toISOString();

  return {
    site_config: {
      ...(siteConfig && typeof siteConfig === 'object' ? siteConfig : {}),
      tenant: {
        id: tenantId,
        createdAt: now,
        ...(siteConfig?.tenant && typeof siteConfig.tenant === 'object' ? siteConfig.tenant : {})
      },
      businessName: siteConfig?.businessName || businessName || siteConfig?.shopName || '',
      shopName: siteConfig?.shopName || businessName || siteConfig?.businessName || '',
      backend: {
        ...(siteConfig?.backend && typeof siteConfig.backend === 'object' ? siteConfig.backend : {}),
        databaseURL: databaseUrl,
        syncPollingMs: 15000
      }
    },
    schedule: schedule && typeof schedule === 'object'
      ? schedule
      : {
          version: '1.0',
          timezone: 'Europe/Ljubljana',
          settings: {
            weekStart: 1,
            defaultWorkStart: 9,
            defaultWorkEnd: 17
          },
          events: [],
          metadata: {
            lastSync: Date.now(),
            lastModified: 0,
            tenantId
          }
        },
    metadata: {
      tenantId,
      businessName,
      createdAt: now,
      updatedAt: now,
      ...(metadata && typeof metadata === 'object' ? metadata : {})
    }
  };
}

async function createTenantRecord(req, payload) {
  const tenantId = assertValidTenantId(payload.tenantId || payload.slug || payload.businessName);
  const registry = await readTenantRegistry();
  const existing = registry[tenantId];

  if (existing && !payload.overwrite) {
    const error = new Error(`Tenant ${tenantId} already exists`);
    error.statusCode = 409;
    throw error;
  }

  const databaseUrl = payload.databaseUrl || buildTenantDatabaseUrl(req, tenantId);
  const tenantData = createInitialTenantData({
    tenantId,
    businessName: payload.businessName,
    siteConfig: payload.siteConfig,
    schedule: payload.schedule,
    metadata: payload.metadata,
    databaseUrl
  });

  await writeTenantDatabase(tenantId, tenantData);

  registry[tenantId] = {
    tenantId,
    businessName: payload.businessName || tenantData.site_config.businessName || tenantId,
    databaseUrl,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    meta: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  };
  await writeTenantRegistry(registry);

  return {
    tenantId,
    databaseUrl,
    record: registry[tenantId]
  };
}

function getNestedValue(root, segments) {
  let current = root;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || !(segment in current)) {
      return null;
    }
    current = current[segment];
  }

  return current ?? null;
}

function setNestedValue(root, segments, value) {
  if (!segments.length) {
    return value;
  }

  const clone = root && typeof root === 'object' ? root : {};
  let cursor = clone;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const next = cursor[segment];
    cursor[segment] = next && typeof next === 'object' ? next : {};
    cursor = cursor[segment];
  }

  cursor[segments[segments.length - 1]] = value;
  return clone;
}

function deleteNestedValue(root, segments) {
  if (!segments.length) {
    return {};
  }

  const clone = root && typeof root === 'object' ? root : {};
  let cursor = clone;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      return clone;
    }
    cursor = cursor[segment];
  }

  delete cursor[segments[segments.length - 1]];
  return clone;
}

function mergeNestedValue(currentValue, incomingValue) {
  if (
    currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue) &&
    incomingValue && typeof incomingValue === 'object' && !Array.isArray(incomingValue)
  ) {
    return { ...currentValue, ...incomingValue };
  }

  return incomingValue;
}

function createPushKey() {
  return `${Date.now().toString(36)}${randomBytes(6).toString('hex')}`;
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Missing request URL' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      storage: DATA_FILE,
      databaseUrlExample: `http://localhost:${PORT}/db/site_config.json`,
      tenantDatabaseUrlExample: `http://localhost:${PORT}/tenant-db/example/site_config.json`,
      adminConfigured: Boolean(ADMIN_TOKEN)
    });
    return;
  }

  if (url.pathname === '/_admin/tenants') {
    if (!isAuthorizedAdminRequest(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      if (req.method === 'GET') {
        sendJson(res, 200, await readTenantRegistry());
        return;
      }

      if (req.method === 'POST') {
        const body = await parseBody(req);
        const result = await enqueueMutation(async () => createTenantRecord(req, body || {}));
        sendJson(res, 201, {
          ok: true,
          tenantId: result.tenantId,
          databaseUrl: result.databaseUrl,
          tenant: result.record
        });
        return;
      }

      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message || 'Internal server error' });
      return;
    }
  }

  if (url.pathname.startsWith('/_admin/tenants/')) {
    if (!isAuthorizedAdminRequest(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const tenantId = normalizeTenantId(url.pathname.slice('/_admin/tenants/'.length));
    if (!tenantId) {
      sendJson(res, 400, { error: 'Valid tenantId is required' });
      return;
    }

    try {
      if (req.method === 'GET') {
        const registry = await readTenantRegistry();
        const tenant = registry[tenantId];
        if (!tenant) {
          sendJson(res, 404, { error: 'Tenant not found' });
          return;
        }

        sendJson(res, 200, {
          tenant,
          exists: true,
          databaseUrl: buildTenantDatabaseUrl(req, tenantId)
        });
        return;
      }

      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message || 'Internal server error' });
      return;
    }
  }

  const segments = parseDbPath(url.pathname);
  const tenantRoute = parseTenantDbPath(url.pathname);
  if (segments === null && tenantRoute === null) {
    sendJson(res, 404, { error: 'Unknown endpoint' });
    return;
  }

  const targetFileReader = tenantRoute
    ? () => readTenantDatabase(assertValidTenantId(tenantRoute.tenantId))
    : () => readDatabase();
  const targetFileWriter = tenantRoute
    ? (next) => writeTenantDatabase(assertValidTenantId(tenantRoute.tenantId), next)
    : (next) => writeDatabase(next);
  const pathSegments = tenantRoute ? tenantRoute.segments : segments;

  try {
    if (req.method === 'GET') {
      const database = await targetFileReader();
      sendJson(res, 200, getNestedValue(database, pathSegments));
      return;
    }

    if (req.method === 'DELETE') {
      await enqueueMutation(async () => {
        const database = await targetFileReader();
        const next = deleteNestedValue(database, pathSegments);
        await targetFileWriter(next);
      });
      sendJson(res, 200, null);
      return;
    }

    const body = await parseBody(req);

    if (req.method === 'PUT') {
      await enqueueMutation(async () => {
        const database = await targetFileReader();
        const next = setNestedValue(database, pathSegments, body);
        await targetFileWriter(next);
      });
      sendJson(res, 200, body);
      return;
    }

    if (req.method === 'PATCH') {
      let merged = null;
      await enqueueMutation(async () => {
        const database = await targetFileReader();
        const current = getNestedValue(database, pathSegments) || {};
        merged = mergeNestedValue(current, body || {});
        const next = setNestedValue(database, pathSegments, merged);
        await targetFileWriter(next);
      });
      sendJson(res, 200, merged);
      return;
    }

    if (req.method === 'POST') {
      let key = null;
      await enqueueMutation(async () => {
        const database = await targetFileReader();
        key = createPushKey();
        const current = getNestedValue(database, pathSegments) || {};
        const nextValue = { ...current, [key]: body };
        const next = setNestedValue(database, pathSegments, nextValue);
        await targetFileWriter(next);
      });
      sendJson(res, 200, { name: key });
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, HOST, async () => {
  await ensureDatabaseFile();
  console.log(`VPS DB server listening on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`Tenant DB example: http://${HOST}:${PORT}/tenant-db/example/site_config.json`);
});