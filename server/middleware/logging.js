import pinoHttp from 'pino-http';
import { logger } from '../utils/logger.js';

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'info';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration'
  },
  customProps: (req, res) => ({
    tenantId: req.headers['x-tenant-id'] || null,
    userId: req.user?.id || null,
    organizationId: req.user?.organizationId || null,
    userRole: req.user?.role || null
  }),
  autoLogging: {
    ignore: (req) => {
      return req.url === '/api/health' || req.url === '/metrics';
    }
  }
});
