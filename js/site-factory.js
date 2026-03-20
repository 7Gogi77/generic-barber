const STORAGE_KEY = 'site_factory_api_key';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe123!';

const COLOR_PRESETS = {
  red: '#c1121f',
  green: '#2d6a4f',
  white: '#f5f5f5',
  blue: '#1d4ed8',
  purple: '#7e22ce',
  gold: '#b8860b',
  black: '#111111',
  pink: '#e11d8a'
};

const TEMPLATE_SERVICES = {
  barber: [
    { name: 'Classic Cut', price: '35 EUR', duration: 45, desc: 'Precision cut and style.' },
    { name: 'Beard Trim', price: '18 EUR', duration: 20, desc: 'Shape and detail finish.' }
  ],
  detailer: [
    { name: 'Exterior Detail', price: '120 EUR', duration: 120, desc: 'Full wash, polish, and shine.' },
    { name: 'Interior Deep Clean', price: '95 EUR', duration: 90, desc: 'Seats, plastics, and vacuum treatment.' }
  ],
  'beauty-salon': [
    { name: 'Signature Facial', price: '60 EUR', duration: 60, desc: 'Hydration and glow treatment.' },
    { name: 'Gel Manicure', price: '35 EUR', duration: 45, desc: 'Nail prep and long-wear finish.' }
  ]
};

const form = document.getElementById('siteFactoryForm');
const businessNameInput = document.getElementById('businessName');
const siteColorInput = document.getElementById('siteColor');
const customColorField = document.getElementById('customColorField');
const customColorInput = document.getElementById('customColor');
const factoryKeyInput = document.getElementById('factoryKey');
const submitButton = document.getElementById('submitButton');
const refreshStatusButton = document.getElementById('refreshStatusButton');
const statusPill = document.getElementById('statusPill');
const statusList = document.getElementById('statusList');
const activityLog = document.getElementById('activityLog');
const resultList = document.getElementById('resultList');
const readinessValue = document.getElementById('readinessValue');
const modeValue = document.getElementById('modeValue');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function readFactoryKey() {
  return factoryKeyInput.value.trim();
}

function persistFactoryKey() {
  try {
    const key = readFactoryKey();
    if (key) {
      sessionStorage.setItem(STORAGE_KEY, key);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {}
}

function restoreFactoryKey() {
  try {
    const key = sessionStorage.getItem(STORAGE_KEY);
    if (key) {
      factoryKeyInput.value = key;
    }
  } catch (_) {}
}

function setActivity(message) {
  activityLog.textContent = message;
}

function renderResultItems(items) {
  resultList.innerHTML = '';

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'result-item';

    if (item.href) {
      li.innerHTML = `<strong>${item.label}:</strong> <a class="result-link" href="${item.href}" target="_blank" rel="noreferrer">${item.value}</a>`;
    } else {
      li.innerHTML = `<strong>${item.label}:</strong> <span class="mono">${item.value}</span>`;
    }

    resultList.appendChild(li);
  });
}

function renderStatus(payload) {
  const ready = Boolean(payload?.ready);
  const missingRequired = Array.isArray(payload?.missingRequired) ? payload.missingRequired : [];
  const configuredOptional = Array.isArray(payload?.configuredOptional) ? payload.configuredOptional : [];

  statusPill.textContent = ready ? 'Factory ready' : 'Factory not ready';
  statusPill.className = `status-pill ${ready ? 'ready' : 'error'}`;
  readinessValue.textContent = ready ? 'Ready' : 'Blocked';
  modeValue.textContent = payload?.deploymentMode || 'Unknown';

  const items = [];
  if (missingRequired.length) {
    missingRequired.forEach((key) => {
      items.push({ type: 'missing', text: `Missing required env: ${key}` });
    });
  } else {
    items.push({ type: 'ok', text: 'All required site factory env vars are configured.' });
  }

  if (configuredOptional.length) {
    items.push({ type: 'ok', text: `Optional envs detected: ${configuredOptional.join(', ')}` });
  }

  if (payload?.authRequired) {
    items.push({ type: 'info', text: 'Factory API key is required for provisioning requests.' });
  }

  statusList.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'status-item';
    li.textContent = item.text;
    statusList.appendChild(li);
  });
}

async function fetchStatus() {
  setActivity('Checking site factory readiness...');

  const response = await fetch('/api/site-factory-status', { cache: 'no-store' });
  const payload = await response.json();
  renderStatus(payload);
  setActivity(payload.ready ? 'Factory is ready. Fill the form and create a site.' : 'Factory setup is incomplete. Check the missing env vars on the right.');
  return payload;
}

function getSelectedColorHex() {
  const selected = String(siteColorInput.value || 'red');
  if (selected === 'custom') {
    return customColorInput.value || '#b6461a';
  }
  return COLOR_PRESETS[selected] || COLOR_PRESETS.red;
}

function getTemplateServices(template) {
  return TEMPLATE_SERVICES[template] || TEMPLATE_SERVICES.barber;
}

function updateCustomColorVisibility() {
  const isCustom = siteColorInput.value === 'custom';
  customColorField.style.display = isCustom ? '' : 'none';
}

function buildPayload() {
  const businessName = businessNameInput.value.trim();
  const slug = slugify(businessName);
  const template = String(document.getElementById('siteTemplate').value || 'barber');
  const primary = getSelectedColorHex();

  return {
    businessName,
    slug,
    siteTemplate: template,
    ownerEmail: document.getElementById('ownerEmail').value.trim(),
    ownerPhone: document.getElementById('ownerPhone').value.trim(),
    businessAddress: document.getElementById('businessAddress').value.trim(),
    adminUsername: DEFAULT_ADMIN_USERNAME,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
    theme: {
      primary,
      gradientStart: primary,
      gradientEnd: primary
    },
    services: getTemplateServices(template),
    booking: {
      start: 9,
      end: 17,
      workingDays: {
        0: false,
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: false
      }
    }
  };
}

async function provisionSite(event) {
  event.preventDefault();
  persistFactoryKey();

  const payload = buildPayload();
  if (!payload.businessName) {
    setActivity('Business name is required.');
    return;
  }

  if (!payload.ownerEmail || !payload.ownerPhone || !payload.businessAddress) {
    setActivity('Owner email, owner phone number, and business address are required.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Creating...';
  setActivity('Creating tenant on VPS, then creating the Vercel project and deployment...');

  try {
    const response = await fetch('/api/provision-site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(readFactoryKey() ? { 'x-site-factory-key': readFactoryKey() } : {})
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Provisioning failed');
    }

    setActivity(`Site created for ${result.businessName}. Project URL: ${result.project.url}`);
    renderResultItems([
      { label: 'Business', value: result.businessName },
      { label: 'Tenant ID', value: result.tenantId },
      { label: 'Template', value: payload.siteTemplate },
      { label: 'VPS Database', value: result.databaseUrl },
      { label: 'Project URL', value: result.project.url, href: result.project.url },
      { label: 'Dashboard', value: result.project.dashboardUrl, href: result.project.dashboardUrl },
      ...(result.deployment?.url ? [{ label: 'Deployment URL', value: result.deployment.url, href: result.deployment.url }] : []),
      { label: 'Checklist', value: (result.checklist || []).join(' | ') || 'No follow-up items returned.' }
    ]);
  } catch (error) {
    setActivity(error.message || 'Provisioning failed.');
    renderResultItems([
      { label: 'Error', value: error.message || 'Provisioning failed' }
    ]);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Create Site';
  }
}

siteColorInput.addEventListener('change', updateCustomColorVisibility);

factoryKeyInput.addEventListener('input', persistFactoryKey);
refreshStatusButton.addEventListener('click', fetchStatus);
form.addEventListener('submit', provisionSite);

restoreFactoryKey();
updateCustomColorVisibility();
fetchStatus().catch((error) => {
  setActivity(error.message || 'Failed to load factory status.');
});