import {
  assessSiteFactoryReadiness,
  buildProjectEnvVars,
  buildProvisionMetadata,
  buildSeedSiteConfig,
  createProductionDeployment,
  createTenantOnVps,
  createVercelProject,
  hashPassword,
  isAuthorizedFactoryRequest,
  json,
  parseRequestBody,
  slugify,
  upsertProjectEnv
} from './_lib/site-factory.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Site-Factory-Key, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!isAuthorizedFactoryRequest(req)) {
    json(res, 401, { error: 'Unauthorized' });
    return;
  }

  const readiness = assessSiteFactoryReadiness();
  if (!readiness.ready) {
    json(res, 400, {
      error: 'Site factory is not configured',
      readiness
    });
    return;
  }

  try {
    const body = await parseRequestBody(req);
    const businessName = String(body.businessName || '').trim();
    const ownerEmail = String(body.ownerEmail || '').trim();
    const ownerPhone = String(body.ownerPhone || '').trim();
    const businessAddress = String(body.businessAddress || '').trim();
    const siteTemplate = String(body.siteTemplate || '').trim();
    const adminPassword = String(body.adminPassword || '').trim();
    const adminUsername = String(body.adminUsername || 'admin').trim() || 'admin';
    const requestedSlug = String(body.slug || '').trim();
    const tenantId = slugify(requestedSlug || businessName);

    if (!businessName) {
      json(res, 400, { error: 'businessName is required' });
      return;
    }

    if (!tenantId) {
      json(res, 400, { error: 'A valid slug or business name is required' });
      return;
    }

    if (!ownerEmail) {
      json(res, 400, { error: 'ownerEmail is required' });
      return;
    }

    if (!ownerPhone) {
      json(res, 400, { error: 'ownerPhone is required' });
      return;
    }

    if (!businessAddress) {
      json(res, 400, { error: 'businessAddress is required' });
      return;
    }

    if (!['barber', 'detailer', 'beauty-salon'].includes(siteTemplate)) {
      json(res, 400, { error: 'siteTemplate must be one of: barber, detailer, beauty-salon' });
      return;
    }

    if (!adminPassword) {
      json(res, 400, { error: 'adminPassword is required' });
      return;
    }

    const preliminaryDatabaseUrl = `${String(process.env.SITE_FACTORY_PUBLIC_VPS_BASE_URL || '').replace(/\/+$/, '')}/tenant-db/${tenantId}`;
    const siteConfig = buildSeedSiteConfig(body, preliminaryDatabaseUrl, tenantId);
    const metadata = buildProvisionMetadata(body, tenantId);

    const tenant = await createTenantOnVps({
      tenantId,
      businessName,
      siteConfig,
      metadata
    });

    const databaseUrl = tenant.databaseUrl || preliminaryDatabaseUrl;
    const adminPasswordHash = hashPassword(adminPassword);
    const envVars = buildProjectEnvVars({
      databaseUrl,
      adminUsername,
      adminPasswordHash
    });

    const projectName = slugify(`${tenantId}-site`);
    const project = await createVercelProject({ projectName, envVars });
    await upsertProjectEnv(project.id || project.name, envVars);

    const deployment = await createProductionDeployment(project, {
      tenantId,
      databaseUrl,
      businessName
    });

    const deploymentUrl = deployment?.url ? `https://${deployment.url}` : null;
    const projectUrl = deploymentUrl || `https://${project.name}.vercel.app`;

    json(res, 201, {
      ok: true,
      tenantId,
      businessName,
      databaseUrl,
      project: {
        id: project.id,
        name: project.name,
        url: projectUrl,
        dashboardUrl: `https://vercel.com/dashboard/projects/${project.id || project.name}`
      },
      deployment: deployment
        ? {
            id: deployment.id,
            url: deploymentUrl,
            readyState: deployment.readyState || deployment.status || null
          }
        : {
            skipped: true,
            reason: 'Explicit deployment was not triggered. Set VERCEL_TEMPLATE_REPO_ID, or ensure VERCEL_TEMPLATE_REPO points to a publicly resolvable GitHub repository.'
          },
      checklist: [
        'Point any custom domain to the created Vercel project if needed.',
        'Verify the VPS tenant database is reachable from the public internet.',
        'Open the new admin panel and change default site content if more customization is needed.',
        'Set email/SMS provider variables on the new Vercel project if you use notifications.'
      ]
    });
  } catch (error) {
    json(res, 500, {
      error: error.message || 'Provisioning failed'
    });
  }
}