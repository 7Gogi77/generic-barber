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

const TEMPLATE_SEED_DATA = {
  barber: {
    navLinks: [
      { name: 'Domov', link: '#home' },
      { name: 'O nas', link: '#about' },
      { name: 'Storitve', link: '#services' },
      { name: 'Ekipa', link: '#barbers' },
      { name: 'Galerija', link: '#gallery' }
    ],
    galleryTitle: 'Galerija',
    hero: {
      subtitle: 'TRADICIJA & STIL',
      buttonText: 'Oglej si storitve',
      backgroundImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2000'
    },
    ourStory: {
      sectionTitle: 'Naša zgodba',
      title: 'Natančnost in tradicija',
      text: 'Sodobne tehnike v kombinaciji s klasičnim pristopom. Vsak obisk je izkušnja.',
      image: 'https://images.unsplash.com/photo-1532710093739-9470acff878f?q=80&w=1200'
    },
    servicesSection: {
      title: 'Storitve',
      items: [
        { name: 'Klasična frizura', price: '€25', desc: '30 min • Natančen rez', duration: 30 },
        { name: 'Fade & Styling', price: '€30', desc: '45 min • Moderno', duration: 45 },
        { name: 'Britje z brisačo', price: '€22', desc: '25 min • Tradicionalno', duration: 25 },
        { name: 'Paket Gentleman', price: '€45', desc: '60 min • Frizura + britje', duration: 60 }
      ]
    },
    barbersSection: {
      title: 'Naša ekipa',
      list: [
        { name: 'Marko Novak', role: 'Master Barber', img: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=1000' },
        { name: 'Luka Šter', role: 'Beard Expert', img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1000' },
        { name: 'Tilen Kralj', role: 'Senior Stylist', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000' }
      ]
    },
    gallery: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1000',
      'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1000',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000'
    ],
    testimonial: { quote: 'Najboljša izkušnja v mestu. Vrnem se zagotovo!', author: 'Tomaž P.' },
    ctaSection: {
      title: 'Pripravljeni na spremembo?',
      text: 'Rezervirajte termin danes in doživite vrhunsko storitev.',
      buttonText: 'Rezerviraj zdaj'
    },
    booking: {
      title: 'Naročilo termina',
      heading: 'Rezervirajte termin',
      buttonText: 'Potrdi termin',
      placeholderName: 'Ime',
      placeholderEmail: 'E-pošta',
      placeholderPhone: 'Telefon'
    },
    googleReviews: {
      title: 'Google ocene',
      subtitle: 'Preveri mnenja naših strank.',
      rating: '5.0',
      countText: '(120 ocen)',
      link: '',
      items: [
        { author: 'Ana K.', text: 'Odlična storitev in vzdušje.', stars: 5 },
        { author: 'Marko P.', text: 'Vrhunska ekipa, priporočam!', stars: 5 },
        { author: 'Sara M.', text: 'Super izkušnja, pridem spet.', stars: 5 }
      ]
    }
  },
  detailer: {
    navLinks: [
      { name: 'Domov', link: '#home' },
      { name: 'O nas', link: '#about' },
      { name: 'Storitve', link: '#services' },
      { name: 'Ekipa', link: '#barbers' },
      { name: 'Galerija', link: '#gallery' }
    ],
    galleryTitle: 'Galerija',
    hero: {
      subtitle: 'PODROBNOSTI SO VSE',
      buttonText: 'Rezerviraj termin',
      backgroundImage: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=2000'
    },
    ourStory: {
      sectionTitle: 'O nas',
      title: 'Skrb za vsak detajl',
      text: 'Profesionalno čiščenje, poliranje in zaščita. Vaše vozilo zasije kot novo.',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200'
    },
    servicesSection: {
      title: 'Paketne storitve',
      items: [
        { name: 'Notranje čiščenje', price: '€60', desc: '90 min • Globinsko', duration: 90 },
        { name: 'Zunanje poliranje', price: '€120', desc: '150 min • Visok sijaj', duration: 150 },
        { name: 'Keramična zaščita', price: '€280', desc: '4h • Dolgotrajno', duration: 240 },
        { name: 'Komplet Detail', price: '€190', desc: '3h • Notranje + zunanje', duration: 180 }
      ]
    },
    barbersSection: {
      title: 'Naša ekipa',
      list: [
        { name: 'Andrej Kovač', role: 'Detailing specialist', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000' },
        { name: 'Nika Zupan', role: 'Paint correction', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000' }
      ]
    },
    gallery: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000',
      'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?q=80&w=1000',
      'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=1000'
    ],
    testimonial: { quote: 'Avto je po obdelavi izgledal bolje kot ob nakupu.', author: 'Miha K.' },
    ctaSection: {
      title: 'Naj bo vaš avto kot nov',
      text: 'Izberite paket in rezervirajte termin.',
      buttonText: 'Rezerviraj zdaj'
    },
    booking: {
      title: 'Rezervacija',
      heading: 'Rezervirajte termin',
      buttonText: 'Potrdi termin',
      placeholderName: 'Ime',
      placeholderEmail: 'E-pošta',
      placeholderPhone: 'Telefon'
    },
    googleReviews: {
      title: 'Google ocene',
      subtitle: 'Preveri mnenja naših strank.',
      rating: '4.9',
      countText: '(87 ocen)',
      link: '',
      items: [
        { author: 'Tilen V.', text: 'Avto izgleda kot nov.', stars: 5 },
        { author: 'Nina Z.', text: 'Profesionalno in hitro.', stars: 5 },
        { author: 'Rok S.', text: 'Odlična kakovost storitve.', stars: 5 }
      ]
    }
  },
  'beauty-salon': {
    navLinks: [
      { name: 'Domov', link: '#home' },
      { name: 'O nas', link: '#about' },
      { name: 'Storitve', link: '#services' },
      { name: 'Ekipa', link: '#barbers' },
      { name: 'Galerija', link: '#gallery' }
    ],
    galleryTitle: 'Galerija',
    hero: {
      subtitle: 'NEGA • LEPOTA • SIJAJ',
      buttonText: 'Rezerviraj nego',
      backgroundImage: 'https://images.pexels.com/photos/7755512/pexels-photo-7755512.jpeg'
    },
    ourStory: {
      sectionTitle: 'O nas',
      title: 'Vaš čas za razvajanje',
      text: 'Nudimo vrhunske tretmaje, ki poudarijo vašo naravno lepoto.',
      image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1200'
    },
    servicesSection: {
      title: 'Storitve',
      items: [
        { name: 'Nega obraza', price: '€55', desc: '60 min • Globinska', duration: 60 },
        { name: 'Manikura', price: '€25', desc: '30 min • Klasična', duration: 30 },
        { name: 'Pedikura', price: '€35', desc: '45 min • SPA', duration: 45 },
        { name: 'Masaža', price: '€50', desc: '60 min • Sproščujoča', duration: 60 }
      ]
    },
    barbersSection: {
      title: 'Naša ekipa',
      list: [
        { name: 'Sara M.', role: 'Kozmetičarka', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000' },
        { name: 'Ana L.', role: 'Nega in masaže', img: 'https://images.pexels.com/photos/734478/pexels-photo-734478.jpeg' }
      ]
    },
    gallery: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1000',
      'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1000',
      'https://images.pexels.com/photos/939835/pexels-photo-939835.jpeg?q=80&w=1000'
    ],
    testimonial: { quote: 'Čudovita izkušnja in popolna nega. Priporočam!', author: 'Nina R.' },
    ctaSection: {
      title: 'Rezervirajte svoj tretma',
      text: 'Sprostite se in prepustite nego strokovnjakom.',
      buttonText: 'Rezerviraj termin'
    },
    booking: {
      title: 'Rezervacija',
      heading: 'Rezervirajte termin',
      buttonText: 'Potrdi termin',
      placeholderName: 'Ime',
      placeholderEmail: 'E-pošta',
      placeholderPhone: 'Telefon'
    },
    googleReviews: {
      title: 'Google ocene',
      subtitle: 'Preveri mnenja naših strank.',
      rating: '5.0',
      countText: '(64 ocen)',
      link: '',
      items: [
        { author: 'Lana B.', text: 'Čudovit salon in storitev.', stars: 5 },
        { author: 'Tina K.', text: 'Top nega, priporočam!', stars: 5 },
        { author: 'Maja P.', text: 'Zelo prijazno osebje.', stars: 5 }
      ]
    }
  }
};

function buildFullTheme(primary, mode) {
  const isLight = String(mode || 'dark').toLowerCase() === 'light';
  return {
    primary,
    mode: isLight ? 'light' : 'dark',
    dark: isLight ? '#FFFFFF' : '#0A0A0A',
    card: isLight ? '#F2F2F7' : '#141414',
    gradientStart: primary,
    gradientEnd: primary,
    gradientDark: isLight ? '#F2F2F7' : '#0A0A0A',
    gradientAccent: primary,
    textPrimary: isLight ? '#1C1C1E' : '#FFFFFF',
    textSecondary: isLight ? '#6E6E73' : '#8E8E93',
    textGold: primary,
    accentRed: primary,
    accentBlue: primary,
    accentWhite: isLight ? '#F2F2F7' : '#FFFFFF',
    borderLight: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
    borderGold: 'rgba(0,0,0,0.15)',
    buttonColor: primary,
    buttonTextColor: '#FFFFFF',
    navTextColor: isLight ? '#6E6E73' : '#8E8E93',
    navTextColorTop: '#FFFFFF',
    navTextColorScrolled: isLight ? '#1C1C1E' : '#8E8E93',
    navHoverColor: primary,
    footerBgColor: isLight ? '#1C1C1E' : '#0A0A0A',
    footerTextColor: isLight ? '#F2F2F7' : '#8E8E93',
    textOnHero: '#FFFFFF',
    scrollbarThumb: primary,
    scrollbarTrack: isLight ? '#F2F2F7' : '#1C1C1E',
    success: '#4ADE80',
    error: '#F87171',
    warning: '#FBBF24',
    fontSerif: 'Cormorant Garamond, serif',
    fontSans: 'Montserrat, sans-serif'
  };
}

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

export function buildTenantRuntimeDatabaseUrl(tenantId) {
  const normalizedTenantId = slugify(tenantId);
  return normalizedTenantId ? `/tenant-db/${normalizedTenantId}` : '/tenant-db';
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
  const templateRepo = String(process.env.VERCEL_TEMPLATE_REPO || '').trim();
  const templateRepoId = String(process.env.VERCEL_TEMPLATE_REPO_ID || '').trim();
  const templateRepoRef = String(process.env.VERCEL_TEMPLATE_REPO_REF || 'main').trim();

  return {
    ready: missingRequired.length === 0,
    authRequired: getFactoryAuthRequirement(),
    missingRequired,
    configuredOptional,
    required: REQUIRED_ENV_KEYS,
    optional: OPTIONAL_ENV_KEYS,
    deploymentMode: templateRepoId ? 'project-and-deploy' : 'project-only',
    templateRepo,
    templateRepoId: templateRepoId || null,
    templateRepoRef
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
  const themeMode = String(payload.themeMode || 'dark').toLowerCase();
  const primaryColor = String(payload.theme?.primary || '#007AFF').trim();
  const services = normalizeServices(payload.services);
  const adminUsername = String(payload.adminUsername || 'admin').trim() || 'admin';
  const booking = payload.booking && typeof payload.booking === 'object' ? payload.booking : {};
  const workingDays = normalizeWorkingDays(booking.workingDays);
  const hours = normalizeHours(booking.hours);
  const startHour = parseInteger(booking.start, 9);
  const endHour = parseInteger(booking.end, 17);

  const templateKey = siteTemplate === 'beauty-salon' ? 'beauty-salon' : siteTemplate;
  const tpl = TEMPLATE_SEED_DATA[templateKey] || TEMPLATE_SEED_DATA.barber;
  const fullTheme = buildFullTheme(primaryColor, themeMode);

  const resolvedServices = services.length
    ? { title: tpl.servicesSection.title, items: services }
    : tpl.servicesSection;

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
    theme: fullTheme,
    navLinks: tpl.navLinks,
    galleryTitle: tpl.galleryTitle,
    hero: {
      ...tpl.hero,
      title: businessName
    },
    ourStory: tpl.ourStory,
    servicesSection: resolvedServices,
    barbersSection: tpl.barbersSection,
    gallery: tpl.gallery,
    testimonial: tpl.testimonial,
    ctaSection: tpl.ctaSection,
    contactSection: {
      title: 'Kontakt',
      subtitle: 'Pišite ali nas pokličite za termin.',
      address: businessAddress,
      phone: HARD_CODED_CLIENT_PHONE,
      email: ownerEmail
    },
    googleReviews: tpl.googleReviews,
    booking: {
      ...tpl.booking,
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

export async function createTenantOnVps({ tenantId, businessName, siteConfig, metadata, databaseUrl, overwrite = false }) {
  return runVpsAdminWithFallback({
    method: 'POST',
    pathSuffix: '/_admin/tenants',
    body: {
      tenantId,
      businessName,
      siteConfig,
      metadata,
      ...(databaseUrl ? { databaseUrl } : {}),
      overwrite: Boolean(overwrite)
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
  try {
    return await runVpsAdminWithFallback({
      method: 'PATCH',
      pathSuffix: '/_admin/tenants',
      tenantId,
      body: payload || {}
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const looksLikeLegacy405 = /405|Method not allowed/i.test(message);
    if (!looksLikeLegacy405) {
      throw error;
    }

    const current = await getTenantFromVps(tenantId);
    const tenant = current?.tenant && typeof current.tenant === 'object' ? current.tenant : {};
    const existingMeta = tenant.meta && typeof tenant.meta === 'object' ? tenant.meta : {};

    const nextBusinessName = String(payload?.businessName || tenant.businessName || tenantId).trim() || tenantId;
    const nextMeta = {
      ...existingMeta,
      ...(payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}),
      ...(payload?.businessAddress ? { businessAddress: String(payload.businessAddress).trim() } : {}),
      ...(payload?.ownerEmail ? { ownerEmail: String(payload.ownerEmail).trim() } : {}),
      ...(payload?.ownerPhone ? { ownerPhone: String(payload.ownerPhone).trim() } : {}),
      ...(payload?.siteTemplate ? { siteTemplate: String(payload.siteTemplate).trim() } : {})
    };

    return createTenantOnVps({
      tenantId,
      businessName: nextBusinessName,
      siteConfig: {
        businessName: nextBusinessName,
        shopName: nextBusinessName,
        ...(payload?.siteConfig && typeof payload.siteConfig === 'object' ? payload.siteConfig : {}),
        ...(payload?.businessAddress ? { businessAddress: String(payload.businessAddress).trim() } : {}),
        ...(payload?.siteTemplate ? { siteTemplate: String(payload.siteTemplate).trim() } : {}),
        ...(payload?.ownerEmail || payload?.ownerPhone
          ? {
              ownerContact: {
                ...(payload?.ownerEmail ? { email: String(payload.ownerEmail).trim() } : {}),
                ...(payload?.ownerPhone ? { ownerPhone: String(payload.ownerPhone).trim() } : {})
              }
            }
          : {})
      },
      metadata: nextMeta,
      overwrite: true
    });
  }
}

export async function deleteTenantOnVps(tenantId) {
  try {
    return await runVpsAdminWithFallback({
      method: 'DELETE',
      pathSuffix: '/_admin/tenants',
      tenantId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const looksLikeLegacy405 = /405|Method not allowed/i.test(message);
    if (!looksLikeLegacy405) {
      throw error;
    }

    const current = await getTenantFromVps(tenantId);
    const tenant = current?.tenant && typeof current.tenant === 'object' ? current.tenant : {};
    const existingMeta = tenant.meta && typeof tenant.meta === 'object' ? tenant.meta : {};
    const nowIso = new Date().toISOString();

    await createTenantOnVps({
      tenantId,
      businessName: tenant.businessName || tenantId,
      siteConfig: {
        businessName: tenant.businessName || tenantId,
        shopName: tenant.businessName || tenantId,
        archived: true
      },
      metadata: {
        ...existingMeta,
        deleted: true,
        deletedAt: nowIso,
        archived: true
      },
      overwrite: true
    });

    return {
      ok: true,
      tenantId,
      deleted: true,
      legacyDelete: true
    };
  }
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

function parseOwnerRepoSlug(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^github:/i, '')
    .trim();

  const [owner, repo] = normalized.split('/');
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo, slug: `${owner}/${repo}` };
}

async function resolveGithubRepoIdFromSlug(slug) {
  const parsed = parseOwnerRepoSlug(slug);
  if (!parsed) {
    return null;
  }

  const githubToken = String(process.env.GITHUB_TOKEN || '').trim();

  try {
    const response = await fetch(`https://api.github.com/repos/${parsed.slug}`, {
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
    return payload?.id ? String(payload.id).trim() : null;
  } catch {
    return null;
  }
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

  return resolveGithubRepoIdFromSlug(slug);
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

function extractRepoIdFromProjectPayload(projectLike) {
  const candidates = [
    projectLike?.link?.repoId,
    projectLike?.link?.repo?.id,
    projectLike?.gitRepository?.repoId,
    projectLike?.source?.repoId
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function extractRepoSlugFromProjectPayload(projectLike) {
  const candidates = [
    projectLike?.link?.repo,
    projectLike?.gitRepository?.repo,
    projectLike?.source?.repo,
    process.env.VERCEL_TEMPLATE_REPO
  ];

  for (const candidate of candidates) {
    const parsed = parseOwnerRepoSlug(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function buildGitSourceFromRepoId(repoId) {
  const id = String(repoId || '').trim();
  if (!id) return null;

  return {
    type: process.env.VERCEL_TEMPLATE_REPO_TYPE || 'github',
    repoId: id,
    ref: process.env.VERCEL_TEMPLATE_REPO_REF || 'main'
  };
}

function buildGitSourceFromSlug(parsedSlug) {
  if (!parsedSlug) return null;

  return {
    type: process.env.VERCEL_TEMPLATE_REPO_TYPE || 'github',
    org: parsedSlug.owner,
    repo: parsedSlug.repo,
    ref: process.env.VERCEL_TEMPLATE_REPO_REF || 'main'
  };
}

async function resolveGitSourceForProject(projectIdOrName, projectPayload) {
  const explicitRepoId = String(process.env.VERCEL_TEMPLATE_REPO_ID || '').trim();
  if (explicitRepoId) {
    return buildGitSourceFromRepoId(explicitRepoId);
  }

  const fromProject = extractRepoIdFromProjectPayload(projectPayload);
  if (fromProject) {
    return buildGitSourceFromRepoId(fromProject);
  }

  try {
    const details = await vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}`);
    const fromDetails = extractRepoIdFromProjectPayload(details);
    if (fromDetails) {
      return buildGitSourceFromRepoId(fromDetails);
    }

    const slugDetails = extractRepoSlugFromProjectPayload(details);
    if (slugDetails) {
      const repoId = await resolveGithubRepoIdFromSlug(slugDetails.slug);
      if (repoId) {
        return buildGitSourceFromRepoId(repoId);
      }
      return buildGitSourceFromSlug(slugDetails);
    }
  } catch {
    // Keep falling back.
  }

  const templateRepoId = await resolveTemplateRepoId();
  if (templateRepoId) {
    return buildGitSourceFromRepoId(templateRepoId);
  }

  const templateSlug = extractRepoSlugFromProjectPayload(projectPayload);
  if (templateSlug) {
    return buildGitSourceFromSlug(templateSlug);
  }

  return null;
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

  const detectedBefore = await waitForProjectDeployment(projectIdOrName, 8000, 2000);
  if (detectedBefore) {
    return detectedBefore;
  }

  const gitSource = await resolveGitSourceForProject(projectIdOrName, project);

  if (gitSource) {
    try {
      const explicit = await vercelRequest('/v13/deployments', {
        method: 'POST',
        body: JSON.stringify({
          name: project.name,
          project: projectIdOrName,
          target: 'production',
          gitSource,
          meta
        })
      });

      return normalizeDeploymentRecord(explicit);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
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
