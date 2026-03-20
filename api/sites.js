import {
  deleteTenantOnVps,
  deleteVercelProject,
  getTenantFromVps,
  isAuthorizedFactoryRequest,
  json,
  listTenantsFromVps,
  updateTenantOnVps
} from './_lib/site-factory.js';

function mapTenantRecord(record = {}) {
  const tenantId = String(record.tenantId || '').trim();
  const meta = record.meta && typeof record.meta === 'object' ? record.meta : {};

  return {
    tenantId,
    businessName: record.businessName || tenantId,
    databaseUrl: record.databaseUrl || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    projectId: meta.projectId || null,
    projectName: meta.projectName || null,
    projectUrl: meta.projectUrl || null,
    dashboardUrl: meta.dashboardUrl || null,
    deploymentId: meta.deploymentId || null,
    deploymentUrl: meta.deploymentUrl || null,
    deploymentState: meta.deploymentState || null,
    ownerEmail: meta.ownerEmail || null,
    ownerPhone: meta.ownerPhone || null,
    businessAddress: meta.businessAddress || null,
    siteTemplate: meta.siteTemplate || null
  };
}

function getTenantId(req) {
  return String(req.query?.tenantId || '').trim().toLowerCase();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Site-Factory-Key, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!['GET', 'PATCH', 'DELETE'].includes(req.method || '')) {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!isAuthorizedFactoryRequest(req)) {
    json(res, 401, { error: 'Unauthorized' });
    return;
  }

  try {
    if (req.method === 'GET' && !req.query?.tenantId) {
      const registry = await listTenantsFromVps();
      const sites = Object.values(registry || {})
        .filter((record) => {
          const meta = record?.meta && typeof record.meta === 'object' ? record.meta : {};
          return !meta.deleted;
        })
        .map((record) => mapTenantRecord(record))
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

      json(res, 200, {
        ok: true,
        count: sites.length,
        sites
      });
      return;
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      json(res, 400, { error: 'tenantId is required' });
      return;
    }

    if (req.method === 'GET') {
      const payload = await getTenantFromVps(tenantId);
      json(res, 200, {
        ok: true,
        tenantId,
        ...payload
      });
      return;
    }

    if (req.method === 'PATCH') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const next = {
        ...(body.businessName ? { businessName: String(body.businessName).trim() } : {}),
        ...(body.ownerEmail ? { ownerEmail: String(body.ownerEmail).trim() } : {}),
        ...(body.ownerPhone ? { ownerPhone: String(body.ownerPhone).trim() } : {}),
        ...(body.businessAddress ? { businessAddress: String(body.businessAddress).trim() } : {}),
        ...(body.siteTemplate ? { siteTemplate: String(body.siteTemplate).trim() } : {}),
        ...(body.theme && typeof body.theme === 'object' ? { siteConfig: { theme: body.theme } } : {}),
        meta: {
          ...(body.ownerEmail ? { ownerEmail: String(body.ownerEmail).trim() } : {}),
          ...(body.ownerPhone ? { ownerPhone: String(body.ownerPhone).trim() } : {}),
          ...(body.businessAddress ? { businessAddress: String(body.businessAddress).trim() } : {}),
          ...(body.siteTemplate ? { siteTemplate: String(body.siteTemplate).trim() } : {})
        }
      };

      const payload = await updateTenantOnVps(tenantId, next);
      json(res, 200, {
        ok: true,
        tenantId,
        ...payload
      });
      return;
    }

    const deleteProject = String(req.query?.deleteProject || '').toLowerCase() === 'true';
    let projectDelete = null;

    if (deleteProject) {
      try {
        const current = await getTenantFromVps(tenantId);
        const projectRef = current?.tenant?.meta?.projectId || current?.tenant?.meta?.projectName || null;
        if (projectRef) {
          projectDelete = await deleteVercelProject(projectRef);
        }
      } catch {
        projectDelete = null;
      }
    }

    const payload = await deleteTenantOnVps(tenantId);
    json(res, 200, {
      ok: true,
      tenantId,
      deleted: true,
      projectDeleted: Boolean(projectDelete),
      ...payload
    });
  } catch (error) {
    json(res, 500, {
      error: error.message || 'Site operation failed'
    });
  }
}
