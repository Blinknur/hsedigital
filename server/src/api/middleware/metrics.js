import { 
  httpRequestDuration, 
  httpRequestTotal, 
  httpRequestErrors,
  activeConnections,
  tenantRequestsTotal,
  tenantLatency,
  tenantErrorsTotal,
  tenantApiCalls,
  tenantDataTransfer
} from '../../shared/utils/metrics.js';

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const tenantId = req.headers['x-tenant-id'] || req.user?.organizationId || 'unknown';
  
  activeConnections.inc({ tenant_id: tenantId });

  const requestSize = parseInt(req.headers['content-length'] || '0', 10);
  if (requestSize > 0) {
    tenantDataTransfer.inc({ tenant_id: tenantId, direction: 'inbound' }, requestSize);
  }

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
    tenantApiCalls.inc({
      tenant_id: tenantId,
      endpoint: route,
      method: req.method,
      status_code: res.statusCode
    });

    const responseSize = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
    if (responseSize > 0) {
      tenantDataTransfer.inc({ tenant_id: tenantId, direction: 'outbound' }, responseSize);
    }

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
