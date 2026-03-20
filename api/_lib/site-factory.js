import { createHash } from 'node:crypto';

const REQUIRED_ENV_KEYS = [
  'SITE_FACTORY_VPS_ADMIN_URL',
  'VPS_DB_ADMIN_TOKEN',
  'VERCEL_ACCESS_TOKEN',
  'VERCEL_TEMPLATE_REPO'
];

const OPTIONAL_ENV_KEYS = [
  'SITE_FACTORY_API_KEY',
  'VERCEL_TEAM_ID',
  'VERCEL_TEAM_SLUG',
  'VERCEL_TEMPLATE_REPO_ID',
  'VERCEL_TEMPLATE_REPO_TYPE',
  'VERCEL_TEMPLATE_REPO_REF',
  'VERCEL_PROJECT_ROOT_DIRECTORY',
  'VERCEL_PROJECT_FRAMEWORK',
  'VERCEL_BUILD_COMMAND',
  'VERCEL_OUTPUT_DIRECTORY',
  'VERCEL_INSTALL_COMMAND',
  'SITE_FACTORY_PUBLIC_VPS_BASE_URL',
  'GITHUB_TOKEN'
];

const HARD_CODED_CLIENT_PHONE = '+38631886977';

export function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

export function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function hashPassword(password) {
  return createHash('sha256').update(String(password || '')).digest('hex');
}

export function getFactoryAuthRequirement() {
  return Boolean((process.env.SITE_FACTORY_API_KEY || '').trim());
}

export function isAuthorizedFactoryRequest(req) {
  const configured = (process.env.SITE_FACTORY_API_KEY || '').trim();
  if (!configured) {
    return true;
  }

  const headerKey = req.headers['x-site-factory-key'];
  const authHeader = req.headers.authorization || '';
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  return headerKey === configured || bearerKey === configured;
}

export function assessSiteFactoryReadiness() {
  const missingRequired = REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] || '').trim());
  const configuredOptional = OPTIONAL_ENV_KEYS.filter((key) => String(process.env[key] || '').trim());

  return {
    ready: missingRequired.length === 0,
    authRequired: getFactoryAuthRequirement(),
    missingRequired,
    configuredOptional,
    required: REQUIRED_ENV_KEYS,
    optional: OPTIONAL_ENV_KEYS,
    deploymentMode: String(process.env.VERCEL_TEMPLATE_REPO_ID || '').trim() ? 'project-and-deploy' : 'project-only'
  };
}

export async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }

  return {};
}

function normalizeServiceItem(item) {
  if (!item || typeof item !== 'object') return null;

  const name = String(item.name || '').trim();
  if (!name) return null;

  const duration = parseInteger(item.duration, 30);
  const price = String(item.price || '').trim();
  const desc = String(item.desc || '').trim();

  return {
    name,
    price,
    desc,
    duration: duration > 0 ? duration : 30
  };
}

export function normalizeServices(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map(normalizeServiceItem).filter(Boolean);
}

function normalizeTheme(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const primary = String(input.primary || '').trim();
  const gradientStart = String(input.gradientStart || primary || '').trim();
  const gradientEnd = String(input.gradientEnd || '').trim();

  if (!primary && !gradientStart && !gradientEnd) {
    return null;
  }

  return {
    ...(primary ? { primary } : {}),
    ...(gradientStart ? { gradientStart } : {}),
    ...(gradientEnd ? { gradientEnd } : {})
  };
}

function normalizeWorkingDays(input) {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const normalized = {};
  Object.entries(input).forEach(([key, value]) => {
    const day = Number.parseInt(key, 10);
    if (Number.isInteger(day) && day >= 0 && day <= 6) {
      normalized[day] = Boolean(value);
    }
  });
  return Object.keys(normalized).length ? normalized : undefined;
}

function normalizeHours(input) {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const normalized = {};
  Object.entries(input).forEach(([key, value]) => {
    const day = Number.parseInt(key, 10);
    if (!Number.isInteger(day) || day < 0 || day > 6 || !value || typeof value !== 'object') {
      return;
    }

    const start = parseInteger(value.start, NaN);
    const end = parseInteger(value.end, NaN);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      normalized[day] = { start, end };
    }
  });

  return Object.keys(normalized).length ? normalized : undefined;
}

export function buildSeedSiteConfig(payload, databaseUrl, tenantId) {
  const businessName = String(payload.businessName || '').trim();
  const ownerEmail = String(payload.ownerEmail || '').trim();
  const ownerPhone = String(payload.ownerPhone || '').trim();
  const businessAddress = String(payload.businessAddress || '').trim();
  const siteTemplate = String(payload.siteTemplate || 'barber').trim() || 'barber';
  const tagline = String(payload.tagline || '').trim();
  const theme = normalizeTheme(payload.theme);
  const services = normalizeServices(payload.services);
  const adminUsername = String(payload.adminUsername || 'admin').trim() || 'admin';
  const booking = payload.booking && typeof payload.booking === 'object' ? payload.booking : {};
  const workingDays = normalizeWorkingDays(booking.workingDays);
  const hours = normalizeHours(booking.hours);
  const startHour = parseInteger(booking.start, 9);
  const endHour = parseInteger(booking.end, 17);

  return {
    tenant: {
      id: tenantId,
      createdAt: new Date().toISOString()
    },
    shopName: businessName,
    businessName,
    ownerPhone: HARD_CODED_CLIENT_PHONE,
    businessAddress,
    siteTemplate,
    ownerContact: {
      email: ownerEmail,
      phone: HARD_CODED_CLIENT_PHONE,
      ownerPhone
    },
    admin: {
      username: adminUsername,
      enabled: true,
      maxAttempts: 3,
      lockoutDuration: 60000
    },
    backend: {
      databaseURL: databaseUrl,
      syncPollingMs: 15000
    },
    ...(theme ? { theme } : {}),
    ...(tagline ? { hero: { title: businessName, subtitle: tagline } } : {}),
    ...(services.length ? { servicesSection: { title: 'Services', items: services } } : {}),
    booking: {
      title: 'Naročilo Termina',
      heading: 'Request Appointment',
      buttonText: 'Potrdi Termin',
      businessHours: {
        start: startHour,
        end: endHour
      },
      ...(workingDays ? { workingDays } : {}),
      ...(hours ? { hours } : {})
    }
  };
}

export function buildProvisionMetadata(payload, tenantId) {
  return {
    tenantId,
    customDomain: String(payload.customDomain || '').trim(),
    notes: String(payload.notes || '').trim(),
    createdBy: 'site-factory',
    ownerEmail: String(payload.ownerEmail || '').trim(),
    ownerPhone: String(payload.ownerPhone || '').trim(),
    businessAddress: String(payload.businessAddress || '').trim(),
    siteTemplate: String(payload.siteTemplate || '').trim()
  };
}

function normalizeAdminEndpoint(value, pathSuffix = '/_admin/tenants') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let base = raw;
  if (raw.endsWith('/_admin/tenants')) {
    base = raw.slice(0, -'/_admin/tenants'.length);
  }

  return `${base.replace(/\/+$/, '')}${pathSuffix}`;
}

function addPortFallback(endpoint) {
  try {
    const url = new URL(endpoint);
    if (url.port) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const fallback = new URL(endpoint);
    fallback.port = '3001';
    return fallback.toString();
  } catch {
    return null;
  }
}

function collectVpsAdminEndpointCandidates(pathSuffix = '/_admin/tenants') {
  const unique = new Set();

  const pushWithFallback = (value) => {
    const endpoint = normalizeAdminEndpoint(value, pathSuffix);
    if (!endpoint) return;

    unique.add(endpoint);
    const fallback = addPortFallback(endpoint);
    if (fallback) {
      unique.add(fallback);
    }
  };

  pushWithFallback(process.env.SITE_FACTORY_VPS_ADMIN_URL);
  pushWithFallback(process.env.SITE_FACTORY_PUBLIC_VPS_BASE_URL);

  return [...unique];
}

function buildTenantEndpoint(endpoint, tenantId) {
  const safeTenantId = encodeURIComponent(String(tenantId || '').trim());
  if (!safeTenantId) return endpoint;
  return `${endpoint.replace(/\/+$/, '')}/${safeTenantId}`;
}

async function runVpsAdminWithFallback({ method = 'GET', body = null, pathSuffix = '/_admin/tenants', tenantId = '' }) {
  const adminToken = String(process.env.VPS_DB_ADMIN_TOKEN || '').trim();
  const endpoints = collectVpsAdminEndpointCandidates(pathSuffix);

  if (!endpoints.length) {
    throw new Error('SITE_FACTORY_VPS_ADMIN_URL is not configured');
  }

  const failures = [];

  for (const baseEndpoint of endpoints) {
    const endpoint = tenantId ? buildTenantEndpoint(baseEndpoint, tenantId) : baseEndpoint;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return payload;
      }

      if ([400, 401, 403, 404, 409, 422].includes(response.status)) {
        throw new Error(payload.error || `VPS request failed (${response.status})`);
      }

      failures.push(`${endpoint} -> ${response.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Unauthorized|already exists|required|invalid|not found/i.test(message)) {
        throw error;
      }
      failures.push(`${endpoint} -> ${message}`);
    }
  }

  throw new Error(`VPS request failed. Tried endpoints: ${failures.join(' | ')}`);
}

export async function createTenantOnVps({ tenantId, businessName, siteConfig, metadata }) {
  return runVpsAdminWithFallback({
    method: 'POST',
    pathSuffix: '/_admin/tenants',
    body: {
      tenantId,
      businessName,
      siteConfig,
      metadata
    }
  });
}

export async function listTenantsFromVps() {
  return runVpsAdminWithFallback({
    method: 'GET',
    pathSuffix: '/_admin/tenants'
  });
}

export async function getTenantFromVps(tenantId) {
  return runVpsAdminWithFallback({
    method: 'GET',
    pathSuffix: '/_admin/tenants',
    tenantId
  });
}

export async function updateTenantOnVps(tenantId, payload) {
  return runVpsAdminWithFallback({
    method: 'PATCH',
    pathSuffix: '/_admin/tenants',
    tenantId,
    body: payload || {}
  });
}

export async function deleteTenantOnVps(tenantId) {
  return runVpsAdminWithFallback({
    method: 'DELETE',
    pathSuffix: '/_admin/tenants',
    tenantId
  });
}

function buildVercelQuery() {
  const query = new URLSearchParams();
  if (process.env.VERCEL_TEAM_ID) query.set('teamId', process.env.VERCEL_TEAM_ID);
  if (process.env.VERCEL_TEAM_SLUG) query.set('slug', process.env.VERCEL_TEAM_SLUG);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

async function vercelRequest(path, options = {}) {
  const token = String(process.env.VERCEL_ACCESS_TOKEN || '').trim();
  const response = await fetch(`https://api.vercel.com${path}${buildVercelQuery()}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `Vercel API failed (${response.status})`);
  }

  return payload;
}

function parseTemplateRepoSlug() {
  const repo = String(process.env.VERCEL_TEMPLATE_REPO || '').trim();
  if (!repo) {
    return null;
  }

  const normalized = repo
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^github:/i, '')
    .trim();

  const [owner, name] = normalized.split('/');
  if (!owner || !name) {
    return null;
  }

  return `${owner}/${name}`;
}

async function resolveTemplateRepoId() {
  const configured = String(process.env.VERCEL_TEMPLATE_REPO_ID || '').trim();
  if (configured) {
    return configured;
  }

  const provider = String(process.env.VERCEL_TEMPLATE_REPO_TYPE || 'github').trim().toLowerCase();
  if (provider !== 'github') {
    return null;
  }

  const slug = parseTemplateRepoSlug();
  if (!slug) {
    return null;
  }

  const githubToken = String(process.env.GITHUB_TOKEN || '').trim();

  try {
    const response = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'generic-barber-site-factory',
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    const repoId = payload && payload.id ? String(payload.id).trim() : '';
    return repoId || null;
  } catch {
    return null;
  }
}

export async function createVercelProject({ projectName, envVars }) {
  const body = {
    name: projectName,
    buildCommand: process.env.VERCEL_BUILD_COMMAND || 'npm run build',
    outputDirectory: process.env.VERCEL_OUTPUT_DIRECTORY || 'dist',
    installCommand: process.env.VERCEL_INSTALL_COMMAND || 'npm install',
    framework: process.env.VERCEL_PROJECT_FRAMEWORK || null,
    rootDirectory: process.env.VERCEL_PROJECT_ROOT_DIRECTORY || null,
    gitRepository: {
      type: process.env.VERCEL_TEMPLATE_REPO_TYPE || 'github',
      repo: process.env.VERCEL_TEMPLATE_REPO
    },
    environmentVariables: envVars.map((envVar) => ({
      key: envVar.key,
      value: envVar.value,
      type: 'plain',
      target: ['production', 'preview', 'development']
    }))
  };

  return vercelRequest('/v11/projects', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function upsertProjectEnv(projectIdOrName, envVars) {
  for (const envVar of envVars) {
    await vercelRequest(`/v10/projects/${encodeURIComponent(projectIdOrName)}/env?upsert=true`, {
      method: 'POST',
      body: JSON.stringify({
        key: envVar.key,
        value: envVar.value,
        type: 'plain',
        target: ['production', 'preview', 'development']
      })
    });
  }
}

function normalizeDeploymentUrl(urlValue) {
  if (!urlValue) return null;
  return String(urlValue).startsWith('http') ? String(urlValue) : `https://${urlValue}`;
}

function normalizeDeploymentRecord(record) {
  if (!record || typeof record !== 'object') return null;

  return {
    id: record.id || null,
    url: normalizeDeploymentUrl(record.url),
    readyState: record.readyState || record.state || record.status || null
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProjectDeployment(projectIdOrName, timeoutMs = 20000, intervalMs = 2000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const details = await vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}`);
      const latest = Array.isArray(details?.latestDeployments) ? details.latestDeployments[0] : null;
      if (latest) {
        return normalizeDeploymentRecord(latest);
      }
    } catch {
      // Continue polling.
    }

    await delay(intervalMs);
  }

  return null;
}

export async function createProductionDeployment(project, meta = {}) {
  const projectIdOrName = project.id || project.name;
  const failures = [];
  const repoId = await resolveTemplateRepoId();

  if (repoId) {
    try {
      const explicit = await vercelRequest('/v13/deployments', {
        method: 'POST',
        body: JSON.stringify({
          name: project.name,
          project: projectIdOrName,
          target: 'production',
          gitSource: {
            type: process.env.VERCEL_TEMPLATE_REPO_TYPE || 'github',
            repoId,
            ref: process.env.VERCEL_TEMPLATE_REPO_REF || 'main'
          },
          meta
        })
      });

      return normalizeDeploymentRecord(explicit);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const projectOnly = await vercelRequest('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: project.name,
        project: projectIdOrName,
        target: 'production',
        meta
      })
    });

    return normalizeDeploymentRecord(projectOnly);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  const detected = await waitForProjectDeployment(projectIdOrName, 20000, 2000);
  if (detected) {
    return detected;
  }

  if (failures.length) {
    throw new Error(`Deployment was not created. Attempts: ${failures.join(' | ')}`);
  }

  return null;
}

export async function deleteVercelProject(projectIdOrName) {
  if (!projectIdOrName) {
    return null;
  }

  return vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}`, {
    method: 'DELETE'
  });
}

export function buildProjectEnvVars({ databaseUrl, adminUsername, adminPasswordHash }) {
  return [
    { key: 'BACKEND_DATABASE_URL', value: databaseUrl },
    { key: 'DATABASE_URL', value: databaseUrl },
    { key: 'ADMIN_USERNAME', value: adminUsername },
    { key: 'ADMIN_PASSWORD_HASH', value: adminPasswordHash },
    { key: 'ADMIN_ENABLED', value: 'true' },
    { key: 'ADMIN_MAX_ATTEMPTS', value: '3' },
    { key: 'ADMIN_LOCKOUT_DURATION', value: '60000' }
  ];
}
