import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    beforeSend(event, hint) {
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === 'http' && breadcrumb.data) {
        delete breadcrumb.data.authorization;
        delete breadcrumb.data.cookie;
      }
      return breadcrumb;
    }
  });

  console.log('✅ Sentry error tracking initialized');
};

export const sentryRequestHandler = () => Sentry.Handlers.requestHandler();

export const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();

export const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    if (error.status === 404 || error.statusCode === 404) {
      return false;
    }
    return true;
  }
});

export const captureException = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: {
      custom: context
    }
  });
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

export const setTenantContext = (tenantId, organizationName) => {
  Sentry.setTag('tenant_id', tenantId);
  if (organizationName) {
    Sentry.setTag('organization_name', organizationName);
  }
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

export { Sentry };
