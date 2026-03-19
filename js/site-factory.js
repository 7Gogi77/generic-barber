const STORAGE_KEY = 'site_factory_api_key';

const form = document.getElementById('siteFactoryForm');
const businessNameInput = document.getElementById('businessName');
const slugInput = document.getElementById('slug');
const factoryKeyInput = document.getElementById('factoryKey');
const submitButton = document.getElementById('submitButton');
const refreshStatusButton = document.getElementById('refreshStatusButton');
const statusPill = document.getElementById('statusPill');
const statusList = document.getElementById('statusList');
const activityLog = document.getElementById('activityLog');
const resultList = document.getElementById('resultList');
const readinessValue = document.getElementById('readinessValue');
const modeValue = document.getElementById('modeValue');

let slugTouched = false;

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

function parseServices(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', price = '', duration = '', desc = ''] = line.split('|').map((part) => part.trim());
      return {
        name,
        price,
        duration: Number.parseInt(duration || '30', 10),
        desc
      };
    })
    .filter((item) => item.name);
}

function readWorkingDays() {
  const values = new Set(
    Array.from(document.querySelectorAll('input[name="day"]:checked')).map((input) => input.value)
  );

  const result = {};
  ['0', '1', '2', '3', '4', '5', '6'].forEach((day) => {
    result[day] = values.has(day);
  });

  return result;
}

function buildPayload() {
  const businessName = businessNameInput.value.trim();
  const slug = slugInput.value.trim() || slugify(businessName);

  return {
    businessName,
    slug,
    tagline: document.getElementById('tagline').value.trim(),
    ownerEmail: document.getElementById('ownerEmail').value.trim(),
    ownerPhone: document.getElementById('ownerPhone').value.trim(),
    customDomain: document.getElementById('customDomain').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    adminUsername: document.getElementById('adminUsername').value.trim(),
    adminPassword: document.getElementById('adminPassword').value,
    theme: {
      primary: document.getElementById('primaryColor').value,
      gradientStart: document.getElementById('primaryColor').value,
      gradientEnd: document.getElementById('gradientEnd').value
    },
    services: parseServices(document.getElementById('services').value),
    booking: {
      start: Number.parseInt(document.getElementById('startHour').value || '9', 10),
      end: Number.parseInt(document.getElementById('endHour').value || '17', 10),
      workingDays: readWorkingDays()
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

businessNameInput.addEventListener('input', () => {
  if (!slugTouched) {
    slugInput.value = slugify(businessNameInput.value);
  }
});

slugInput.addEventListener('input', () => {
  slugTouched = slugInput.value.trim().length > 0;
});

factoryKeyInput.addEventListener('input', persistFactoryKey);
refreshStatusButton.addEventListener('click', fetchStatus);
form.addEventListener('submit', provisionSite);

restoreFactoryKey();
fetchStatus().catch((error) => {
  setActivity(error.message || 'Failed to load factory status.');
});