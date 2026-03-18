import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number.parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function ensureDatabaseFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '{}', 'utf8');
  }
}

async function readDatabase() {
  await ensureDatabaseFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return raw.trim() ? JSON.parse(raw) : {};
}

async function writeDatabase(data) {
  await ensureDatabaseFile();
  const nextContent = JSON.stringify(data, null, 2);
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, nextContent, 'utf8');
  await fs.rename(tempFile, DATA_FILE);
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
      databaseUrlExample: `http://localhost:${PORT}/db/site_config.json`
    });
    return;
  }

  const segments = parseDbPath(url.pathname);
  if (segments === null) {
    sendJson(res, 404, { error: 'Unknown endpoint' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const database = await readDatabase();
      sendJson(res, 200, getNestedValue(database, segments));
      return;
    }

    if (req.method === 'DELETE') {
      await enqueueMutation(async () => {
        const database = await readDatabase();
        const next = deleteNestedValue(database, segments);
        await writeDatabase(next);
      });
      sendJson(res, 200, null);
      return;
    }

    const body = await parseBody(req);

    if (req.method === 'PUT') {
      await enqueueMutation(async () => {
        const database = await readDatabase();
        const next = setNestedValue(database, segments, body);
        await writeDatabase(next);
      });
      sendJson(res, 200, body);
      return;
    }

    if (req.method === 'PATCH') {
      let merged = null;
      await enqueueMutation(async () => {
        const database = await readDatabase();
        const current = getNestedValue(database, segments) || {};
        merged = mergeNestedValue(current, body || {});
        const next = setNestedValue(database, segments, merged);
        await writeDatabase(next);
      });
      sendJson(res, 200, merged);
      return;
    }

    if (req.method === 'POST') {
      let key = null;
      await enqueueMutation(async () => {
        const database = await readDatabase();
        key = createPushKey();
        const current = getNestedValue(database, segments) || {};
        const nextValue = { ...current, [key]: body };
        const next = setNestedValue(database, segments, nextValue);
        await writeDatabase(next);
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
});