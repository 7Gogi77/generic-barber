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

const TEMPLATE_LABELS = {
  barber: 'Barber',
  detailer: 'Detailer',
  'beauty-salon': 'Beauty Salon'
};

const form = document.getElementById('siteFactoryForm');
const businessNameInput = document.getElementById('businessName');
const siteColorInput = document.getElementById('siteColor');
const customColorField = document.getElementById('customColorField');
const customColorInput = document.getElementById('customColor');
const submitButton = document.getElementById('submitButton');
const refreshStatusButton = document.getElementById('refreshStatusButton');
const refreshSitesButton = document.getElementById('refreshSitesButton');
const statusPill = document.getElementById('statusPill');
const statusList = document.getElementById('statusList');
const activityLog = document.getElementById('activityLog');
const resultList = document.getElementById('resultList');
const sitesList = document.getElementById('sitesList');
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
  const templateRepo = String(payload?.templateRepo || '').trim();
  const templateRepoRef = String(payload?.templateRepoRef || '').trim();
  const templateRepoId = String(payload?.templateRepoId || '').trim();

  statusPill.textContent = ready ? 'Factory ready' : 'Factory not ready';
  statusPill.className = `status-pill ${ready ? 'ready' : 'error'}`;
  readinessValue.textContent = ready ? 'Ready' : 'Blocked';
  modeValue.textContent = payload?.deploymentMode || 'Unknown';

  const items = [];
  if (missingRequired.length) {
    missingRequired.forEach((key) => {
      items.push({ text: `Missing required env: ${key}` });
    });
  } else {
    items.push({ text: 'All required site factory env vars are configured.' });
  }

  if (configuredOptional.length) {
    items.push({ text: `Optional envs detected: ${configuredOptional.join(', ')}` });
  }

  if (templateRepo) {
    items.push({ text: `Template repo: ${templateRepo}${templateRepoRef ? ` @ ${templateRepoRef}` : ''}` });
  }

  if (templateRepoId) {
    items.push({ text: `Template repo ID: ${templateRepoId}` });
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
  setActivity(payload.ready ? 'Factory is ready. Fill the form and create a site.' : 'Factory setup is incomplete. Check missing env vars.');
  return payload;
}

function getSelectedColorHex() {
  const selected = String(siteColorInput.value || 'red');
  if (selected === 'custom') {
    return customColorInput.value || '#b6461a';
  }
  return COLOR_PRESETS[selected] || COLOR_PRESETS.red;
}

function getThemeMode() {
  const el = document.getElementById('siteTheme');
  return el ? String(el.value || 'dark') : 'dark';
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
  const themeMode = getThemeMode();

  return {
    businessName,
    slug,
    siteTemplate: template,
    ownerEmail: document.getElementById('ownerEmail').value.trim(),
    ownerPhone: document.getElementById('ownerPhone').value.trim(),
    businessAddress: document.getElementById('businessAddress').value.trim(),
    adminUsername: DEFAULT_ADMIN_USERNAME,
    adminPassword: DEFAULT_ADMIN_PASSWORD,
    themeMode,
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

function formatDate(value) {
  if (!value) return 'n/a';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function editButton(tenant) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost-btn';
  button.style.padding = '6px 10px';
  button.textContent = 'Edit';
  button.addEventListener('click', async () => {
    const businessName = window.prompt('Business Name', tenant.businessName || tenant.tenantId);
    if (businessName === null) return;

    const ownerEmail = window.prompt('Owner Email', tenant.ownerEmail || '');
    if (ownerEmail === null) return;

    const ownerPhone = window.prompt('Owner Phone Number', tenant.ownerPhone || '');
    if (ownerPhone === null) return;

    const businessAddress = window.prompt('Business Address', tenant.businessAddress || '');
    if (businessAddress === null) return;

    const siteTemplate = window.prompt('Template (barber, detailer, beauty-salon)', tenant.siteTemplate || 'barber');
    if (siteTemplate === null) return;

    try {
      const response = await fetch(`/api/sites?tenantId=${encodeURIComponent(tenant.tenantId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPhone: ownerPhone.trim(),
          businessAddress: businessAddress.trim(),
          siteTemplate: siteTemplate.trim()
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update site');
      }

      setActivity(`Updated site ${tenant.tenantId}.`);
      await fetchSites();
    } catch (error) {
      setActivity(error.message || 'Failed to update site.');
    }
  });

  return button;
}

function deleteButton(tenant) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost-btn';
  button.style.padding = '6px 10px';
  button.style.borderColor = 'rgba(181, 52, 47, 0.3)';
  button.style.color = '#b5342f';
  button.textContent = 'Delete';
  button.addEventListener('click', async () => {
    const confirmed = window.confirm(`Delete site ${tenant.tenantId}? This removes the VPS tenant data.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/sites?tenantId=${encodeURIComponent(tenant.tenantId)}&deleteProject=true`, {
        method: 'DELETE'
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete site');
      }

      setActivity(`Deleted site ${tenant.tenantId}${payload.projectDeleted ? ' and linked Vercel project' : ''}.`);
      await fetchSites();
    } catch (error) {
      setActivity(error.message || 'Failed to delete site.');
    }
  });

  return button;
}

function renderSites(sites) {
  sitesList.innerHTML = '';

  if (!Array.isArray(sites) || !sites.length) {
    sitesList.innerHTML = '<li class="result-item">No sites found yet.</li>';
    return;
  }

  sites.forEach((site) => {
    const li = document.createElement('li');
    li.className = 'result-item';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '8px';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${site.businessName || site.tenantId}</strong><br><span class="mono">${site.tenantId}</span>`;
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.appendChild(editButton(site));
    actions.appendChild(deleteButton(site));
    header.appendChild(actions);

    const details = document.createElement('div');
    details.style.marginTop = '8px';
    details.className = 'mono';
    details.style.fontSize = '12px';
    details.textContent = `Template: ${TEMPLATE_LABELS[site.siteTemplate] || site.siteTemplate || 'n/a'} | Updated: ${formatDate(site.updatedAt)}`;

    li.appendChild(header);
    li.appendChild(details);

    if (site.projectUrl) {
      const linkWrap = document.createElement('div');
      linkWrap.style.marginTop = '6px';
      linkWrap.innerHTML = `<a class="result-link" href="${site.projectUrl}" target="_blank" rel="noreferrer">Open site</a>`;
      li.appendChild(linkWrap);
    }

    sitesList.appendChild(li);
  });
}

async function fetchSites() {
  const response = await fetch('/api/sites', { cache: 'no-store' });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load sites');
  }

  renderSites(payload.sites || []);
  return payload;
}

async function provisionSite(event) {
  event.preventDefault();

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
  setActivity('Creating tenant on VPS, creating project on Vercel, and waiting for deployment...');

  try {
    const response = await fetch('/api/provision-site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Provisioning failed');
    }

    const deploymentState = result.deployment?.readyState || (result.deployment?.skipped ? 'Skipped' : 'Pending');
    setActivity(`Site created for ${result.businessName}. Deployment state: ${deploymentState}`);
    renderResultItems([
      { label: 'Business', value: result.businessName },
      { label: 'Tenant ID', value: result.tenantId },
      { label: 'Template', value: TEMPLATE_LABELS[payload.siteTemplate] || payload.siteTemplate },
      { label: 'VPS Database', value: result.databaseUrl },
      { label: 'Project URL', value: result.project.url, href: result.project.url },
      { label: 'Dashboard', value: result.project.dashboardUrl, href: result.project.dashboardUrl },
      ...(result.deployment?.url ? [{ label: 'Deployment URL', value: result.deployment.url, href: result.deployment.url }] : []),
      { label: 'Deployment State', value: deploymentState },
      ...(result.deployment?.reason ? [{ label: 'Deployment Note', value: result.deployment.reason }] : [])
    ]);

    await fetchSites();
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
refreshStatusButton.addEventListener('click', () => {
  fetchStatus().catch((error) => {
    setActivity(error.message || 'Failed to refresh status.');
  });
});
refreshSitesButton?.addEventListener('click', () => {
  fetchSites().catch((error) => {
    setActivity(error.message || 'Failed to load sites.');
  });
});
form.addEventListener('submit', provisionSite);

updateCustomColorVisibility();
fetchStatus().catch((error) => {
  setActivity(error.message || 'Failed to load factory status.');
});
fetchSites().catch((error) => {
  setActivity(error.message || 'Failed to load sites.');
});