import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger.js';

const TIER_SAMPLE_RATES = {
  free: 0.01,
  starter: 0.05,
  professional: 0.25,
  enterprise: 1.0
};

const TIER_PROFILE_RATES = {
  free: 0.0,
  starter: 0.01,
  professional: 0.1,
  enterprise: 0.5
};

import { execSync } from 'child_process';

const getRelease = () => {
  if (process.env.SENTRY_RELEASE) {
    return process.env.SENTRY_RELEASE;
  }
  
  try {
    const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const gitTag = execSync('git describe --tags --always').toString().trim();
    return `hse-digital@${gitTag}-${gitHash}`;
  } catch (error) {
    return `hse-digital@${process.env.npm_package_version || '1.0.0'}`;
  }
};

export const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    logger.warn('⚠️  SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  const release = getRelease();

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release,
    dist: process.env.SENTRY_DIST,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ 
        app,
        shouldHandleError(error) {
          return error.status >= 500 || !error.status;
        }
      }),
      new ProfilingIntegration(),
    ],
    tracesSampler: (samplingContext) => {
      const { transactionContext, parentSampled, request } = samplingContext;
      
      if (parentSampled !== undefined) {
        return parentSampled;
      }

      const tenantTier = request?.headers?.['x-tenant-tier'] || 'free';
      const tierRate = TIER_SAMPLE_RATES[tenantTier] || TIER_SAMPLE_RATES.free;

      if (transactionContext.name?.includes('/api/health')) {
        return 0.001;
      }

      if (transactionContext.name?.includes('/metrics')) {
        return 0.0;
      }

      if (transactionContext.name?.includes('/api/webhooks')) {
        return 1.0;
      }

      if (transactionContext.name?.includes('/api/billing') || 
          transactionContext.name?.includes('/api/backup')) {
        return Math.min(tierRate * 2, 1.0);
      }

      if (request?.method === 'GET') {
        return tierRate * 0.5;
      }

      return tierRate;
    },
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-csrf-token'];
        }
        if (event.request.data) {
          const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken'];
          sensitiveFields.forEach(field => {
            if (event.request.data[field]) {
              event.request.data[field] = '[Filtered]';
            }
          });
        }
      }

      if (error && typeof error === 'object') {
        const tenantId = error.tenantId || event.tags?.tenant_id;
        const organizationName = error.organizationName || event.tags?.organization_name;
        const userId = error.userId || event.user?.id;

        if (tenantId) {
          event.fingerprint = [
            '{{ default }}',
            tenantId,
            event.exception?.values?.[0]?.type || 'Error',
            event.exception?.values?.[0]?.value || 'Unknown'
          ];
        }

        if (error.isOperational === false) {
          event.level = 'fatal';
        }
      }

      if (event.exception?.values?.[0]) {
        const exception = event.exception.values[0];
        if (exception.value?.includes('ECONNREFUSED') || 
            exception.value?.includes('ETIMEDOUT')) {
          event.tags = event.tags || {};
          event.tags.error_category = 'network';
        }
        if (exception.value?.includes('prisma') || 
            exception.value?.includes('database')) {
          event.tags = event.tags || {};
          event.tags.error_category = 'database';
        }
      }

      return event;
    },
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        delete breadcrumb.data.authorization;
        delete breadcrumb.data.cookie;
      }

      if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
        return null;
      }

      return breadcrumb;
    },
    ignoreErrors: [
      'CSRF token validation failed',
      'Invalid CSRF token',
      /^4\d\d$/,
      'Not Found',
      'Unauthorized'
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
    beforeSendTransaction(transaction) {
      if (transaction.transaction?.includes('/api/health')) {
        return null;
      }
      return transaction;
    }
  });

  logger.info({
    release,
    environment: process.env.NODE_ENV,
    dist: process.env.SENTRY_DIST
  }, '✅ Sentry error tracking initialized with release tracking');
};

export const sentryRequestHandler = () => Sentry.Handlers.requestHandler({
  user: ['id', 'email', 'role', 'organizationId'],
  ip: true,
  request: ['method', 'url', 'query', 'headers']
});

export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();

export const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    if (error.status === 404 || error.statusCode === 404) {
      return false;
    }
    if (error.status < 500 && error.statusCode < 500) {
      return false;
    }
    return true;
  }
});

export const captureException = (error, context = {}) => {
  const eventId = Sentry.captureException(error, {
    contexts: {
      custom: context
    },
    tags: {
      tenant_id: context.tenantId,
      organization_name: context.organizationName,
      error_type: error.constructor.name
    }
  });
  
  logger.error({
    error,
    context,
    sentryEventId: eventId
  }, 'Exception captured by Sentry');

  return eventId;
};

export const setUserContext = (user) => {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    role: user.role,
    organizationId: user.organizationId
  });
};

export const setTenantContext = (tenantId, organizationName, subscriptionPlan) => {
  Sentry.setTag('tenant_id', tenantId);
  if (organizationName) {
    Sentry.setTag('organization_name', organizationName);
  }
  if (subscriptionPlan) {
    Sentry.setTag('subscription_plan', subscriptionPlan);
  }
  
  Sentry.setContext('tenant', {
    id: tenantId,
    name: organizationName,
    plan: subscriptionPlan
  });
};

export const setRequestContext = (req) => {
  Sentry.setContext('request', {
    method: req.method,
    url: req.url,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer')
  });
};

export const addBreadcrumb = (message, category, level = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000
  });
};

export const startTransaction = (name, op, data = {}) => {
  return Sentry.startTransaction({
    name,
    op,
    data
  });
};

export const getCurrentScope = () => {
  return Sentry.getCurrentScope();
};

export const withScope = (callback) => {
  return Sentry.withScope(callback);
};

export const setFingerprint = (fingerprint) => {
  Sentry.getCurrentScope().setFingerprint(fingerprint);
};

export const customFingerprint = (tenantId, errorType, errorMessage, resource = null) => {
  const parts = ['{{ default }}', tenantId, errorType];
  if (resource) {
    parts.push(resource);
  }
  if (errorMessage) {
    parts.push(errorMessage.substring(0, 50));
  }
  return parts;
};

export { Sentry };
