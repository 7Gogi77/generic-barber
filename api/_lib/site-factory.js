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
  'VERCEL_INSTALL_COMMAND'
];

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
    ownerPhone,
    ownerContact: {
      email: ownerEmail,
      phone: ownerPhone
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
    ownerEmail: String(payload.ownerEmail || '').trim()
  };
}

export async function createTenantOnVps({ tenantId, businessName, siteConfig, metadata }) {
  const endpoint = String(process.env.SITE_FACTORY_VPS_ADMIN_URL || '').trim();
  const adminToken = String(process.env.VPS_DB_ADMIN_TOKEN || '').trim();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify({
      tenantId,
      businessName,
      siteConfig,
      metadata
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `VPS tenant provisioning failed (${response.status})`);
  }

  return payload;
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

export async function createProductionDeployment(project, meta = {}) {
  const repoId = String(process.env.VERCEL_TEMPLATE_REPO_ID || '').trim();
  if (!repoId) {
    return null;
  }

  return vercelRequest('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: project.name,
      project: project.id || project.name,
      target: 'production',
      gitSource: {
        type: process.env.VERCEL_TEMPLATE_REPO_TYPE || 'github',
        repoId,
        ref: process.env.VERCEL_TEMPLATE_REPO_REF || 'main'
      },
      meta
    })
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