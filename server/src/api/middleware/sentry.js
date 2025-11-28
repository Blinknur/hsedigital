import { setUserContext, setTenantContext, addBreadcrumb, setRequestContext, customFingerprint, setFingerprint } from '../../shared/utils/sentry.js';
import prisma from '../../shared/utils/db.js';

export const sentryContextMiddleware = async (req, res, next) => {
  try {
    if (req.user) {
      setUserContext(req.user);
      addBreadcrumb('User authenticated', 'auth', 'info', {
        userId: req.user.id,
        role: req.user.role,
        email: req.user.email
      });
    }

    const tenantId = req.headers['x-tenant-id'] || req.user?.organizationId || req.tenantId;
    
    if (tenantId) {
      let organizationData = null;
      
      try {
        organizationData = await prisma.organization.findUnique({
          where: { id: tenantId },
          select: {
            name: true,
            subscriptionPlan: true,
            subscriptionStatus: true
          }
        });
      } catch (dbError) {
        addBreadcrumb('Failed to fetch organization data', 'database', 'warning', {
          tenantId,
          error: dbError.message
        });
      }

      if (organizationData) {
        setTenantContext(
          tenantId, 
          organizationData.name, 
          organizationData.subscriptionPlan
        );
        
        req.headers['x-tenant-tier'] = organizationData.subscriptionPlan;
        
        addBreadcrumb('Tenant context enriched', 'tenant', 'info', {
          tenantId,
          organizationName: organizationData.name,
          subscriptionPlan: organizationData.subscriptionPlan,
          subscriptionStatus: organizationData.subscriptionStatus
        });
      } else {
        setTenantContext(tenantId);
        addBreadcrumb('Tenant context set (basic)', 'tenant', 'info', {
          tenantId
        });
      }
    }

    setRequestContext(req);

    addBreadcrumb(`${req.method} ${req.url}`, 'http', 'info', {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = { ...req.body };
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken', 'authorization'];
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '[Filtered]';
        }
      });
      
      addBreadcrumb('Request body', 'http.data', 'debug', {
        bodyKeys: Object.keys(req.body),
        bodySize: JSON.stringify(req.body).length
      });
    }

    if (tenantId && req.user) {
      const fingerprint = customFingerprint(
        tenantId,
        'request',
        `${req.method} ${req.path}`,
        req.user.id
      );
      setFingerprint(fingerprint);
    }

    next();
  } catch (error) {
    addBreadcrumb('Sentry context middleware error', 'error', 'error', {
      error: error.message
    });
    next();
  }
};

export const sentryPerformanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    addBreadcrumb('Request completed', 'http.response', 'info', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    if (duration > 5000) {
      addBreadcrumb('Slow request detected', 'performance', 'warning', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        threshold: '5000ms'
      });
    }
  });
  
  next();
};
