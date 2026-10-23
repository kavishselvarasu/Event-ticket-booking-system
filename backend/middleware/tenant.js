import { query } from '../config/db.js';

export async function resolveTenant(req, res, next) {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] || req.query.tenant || req.query.tenantSlug;
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;

    let tenant = null;

    if (tenantSlug) {
      const resSlug = await query('SELECT * FROM tenants WHERE slug = $1', [tenantSlug]);
      if (resSlug.rows.length > 0) {
        tenant = resSlug.rows[0];
      }
    } else if (tenantId) {
      const resId = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
      if (resId.rows.length > 0) {
        tenant = resId.rows[0];
      }
    } else if (req.user && req.user.tenant_id) {
      const resUser = await query('SELECT * FROM tenants WHERE id = $1', [req.user.tenant_id]);
      if (resUser.rows.length > 0) {
        tenant = resUser.rows[0];
      }
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    next();
  }
}

export function requireTenant(req, res, next) {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'TENANT_REQUIRED',
      message: 'Active tenant context (X-Tenant-Slug or X-Tenant-ID header) is required for this operation'
    });
  }
  next();
}
