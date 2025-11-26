import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { authRoutes } from './modules/auth/index.js';
import { auditRoutes } from './modules/audit/index.js';
import { incidentRoutes } from './modules/incident/index.js';
import { billingRoutes } from './modules/billing/index.js';
import { reportingRoutes } from './modules/reporting/index.js';
import { tenantRoutes } from './modules/tenant/index.js';

import { securityHeaders, additionalSecurityHeaders } from '../../middleware/security.js';
import { sanitizeRequest } from '../../middleware/sanitization.js';
import { csrfProtection, generateCSRFMiddleware } from '../../middleware/csrf.js';
import { auditLogger } from '../../middleware/auditLog.js';
import { ipRateLimit } from '../../middleware/rateLimitRedis.js';
import { httpLogger } from '../../middleware/logging.js';
import { metricsMiddleware } from '../../middleware/metrics.js';
import { tracingMiddleware, enrichTracingContext } from '../../middleware/tracing.js';
import { sentryContextMiddleware, sentryPerformanceMiddleware } from '../../middleware/sentry.js';
import { geoLocationMiddleware, cdnHeadersMiddleware, geoRoutingHeaders } from '../../middleware/geoRouting.js';
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from '../../utils/sentry.js';
import { logger } from '../../utils/logger.js';
import { alertManager } from '../../monitoring/alerts.js';
import { advancedAlertingService } from '../../services/alertingService.js';

import healthRoutes from '../../routes/health.js';
import metricsRoutes from '../../routes/metrics.js';
import webhookRoutes from '../../routes/webhooks.js';

const app = express();

const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const reportsDir = path.join(__dirname, '../../public/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

initSentry(app);

app.use(sentryRequestHandler());
app.use(sentryTracingHandler());
app.use(securityHeaders());
app.use(additionalSecurityHeaders);
app.use(compression());
app.use(httpLogger);
app.use(metricsMiddleware);
app.use(tracingMiddleware);
app.use(cookieParser());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-csrf-token', 'x-session-id', 'x-trace-id', 'x-span-id', 'traceparent', 'tracestate'],
  credentials: true,
  exposedHeaders: ['x-trace-id', 'x-span-id']
}));

app.use('/api/webhooks', webhookRoutes);
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeRequest());
app.use(generateCSRFMiddleware());
app.use('/api/', csrfProtection());
app.use('/api/', ipRateLimit);
app.use(auditLogger());
app.use(sentryContextMiddleware);
app.use(sentryPerformanceMiddleware);
app.use(enrichTracingContext);
app.use(geoLocationMiddleware);
app.use(cdnHeadersMiddleware);
app.use(geoRoutingHeaders);

app.use('/uploads', express.static(uploadDir));
app.use('/reports', express.static(reportsDir));

app.use('/api', healthRoutes);
app.use('/', metricsRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/organizations', tenantRoutes);

const frontendPath = path.join(__dirname, '../../../dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads') || req.url.startsWith('/reports')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.use(sentryErrorHandler());

app.use((err, req, res, next) => {
  const errorContext = {
    method: req.method,
    url: req.url,
    tenantId: req.tenantId,
    userId: req.user?.id,
    statusCode: err.statusCode || 500
  };

  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    },
    tenantId: req.tenantId,
    userId: req.user?.id
  }, 'Unhandled error');

  if (err.statusCode >= 500 || !err.statusCode) {
    alertManager.criticalError(err, errorContext);

    advancedAlertingService.trackErrorRate(err).catch(e =>
      logger.error({ error: e }, 'Failed to track error rate')
    );
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: err.message || 'Internal Server Error' });
});

export default app;
