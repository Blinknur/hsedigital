import { 
  httpRequestDuration, 
  httpRequestTotal, 
  httpRequestErrors,
  activeConnections,
  tenantRequestsTotal,
  tenantLatency,
  tenantErrorsTotal
} from '../utils/metrics.js';

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const tenantId = req.headers['x-tenant-id'] || 'unknown';
  
  activeConnections.inc({ tenant_id: tenantId });

  const originalSend = res.send;
  res.send = function(data) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
      tenant_id: tenantId
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    tenantRequestsTotal.inc({ tenant_id: tenantId, endpoint: route });
    tenantLatency.observe({ tenant_id: tenantId, endpoint: route }, duration);

    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.inc({ 
        ...labels, 
        error_type: errorType 
      });
      tenantErrorsTotal.inc({ 
        tenant_id: tenantId, 
        error_type: errorType 
      });
    }

    activeConnections.dec({ tenant_id: tenantId });
    
    return originalSend.call(this, data);
  };

  res.on('close', () => {
    if (!res.headersSent) {
      activeConnections.dec({ tenant_id: tenantId });
    }
  });

  next();
};
