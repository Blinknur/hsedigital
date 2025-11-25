import { setUserContext, setTenantContext, addBreadcrumb } from '../utils/sentry.js';

export const sentryContextMiddleware = (req, res, next) => {
  if (req.user) {
    setUserContext(req.user);
    addBreadcrumb('User authenticated', 'auth', 'info', {
      userId: req.user.id,
      role: req.user.role
    });
  }

  const tenantId = req.headers['x-tenant-id'] || req.user?.organizationId;
  if (tenantId) {
    setTenantContext(tenantId);
    addBreadcrumb('Tenant context set', 'tenant', 'info', {
      tenantId
    });
  }

  addBreadcrumb(`${req.method} ${req.url}`, 'http', 'info', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  next();
};
