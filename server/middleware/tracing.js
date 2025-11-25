import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { getTracer, addSpanAttributes, getCurrentTraceId, getCurrentSpanId } from '../utils/tracing.js';

export const tracingMiddleware = async (req, res, next) => {
  const tracer = getTracer();
  
  const spanName = `${req.method} ${req.route?.path || req.path}`;
  
  const span = tracer.startSpan(spanName, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.route': req.route?.path || req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.user_agent': req.get('user-agent') || 'unknown',
      'http.client_ip': req.ip || req.socket?.remoteAddress || 'unknown',
      'net.peer.ip': req.ip || req.socket?.remoteAddress || 'unknown'
    }
  });

  const ctx = trace.setSpan(context.active(), span);

  context.with(ctx, () => {
    const traceId = getCurrentTraceId();
    const spanId = getCurrentSpanId();
    
    if (traceId) {
      res.setHeader('X-Trace-Id', traceId);
      req.traceId = traceId;
    }
    
    if (spanId) {
      res.setHeader('X-Span-Id', spanId);
      req.spanId = spanId;
    }

    const originalSend = res.send;
    res.send = function (data) {
      span.setAttribute('http.status_code', res.statusCode);
      
      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      
      span.end();
      return originalSend.call(this, data);
    };

    const originalJson = res.json;
    res.json = function (data) {
      span.setAttribute('http.status_code', res.statusCode);
      
      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      
      span.end();
      return originalJson.call(this, data);
    };

    res.on('finish', () => {
      if (!span.ended) {
        span.setAttribute('http.status_code', res.statusCode);
        
        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        
        span.end();
      }
    });

    res.on('close', () => {
      if (!span.ended) {
        span.setAttribute('http.status_code', res.statusCode);
        span.end();
      }
    });

    next();
  });
};

export const enrichTracingContext = (req, res, next) => {
  const attributes = {};

  if (req.user) {
    attributes['user.id'] = req.user.id;
    attributes['user.email'] = req.user.email;
    attributes['user.role'] = req.user.role;
  }

  if (req.tenantId) {
    attributes['tenant.id'] = req.tenantId;
  }

  if (req.params && Object.keys(req.params).length > 0) {
    Object.entries(req.params).forEach(([key, value]) => {
      attributes[`http.route.param.${key}`] = value;
    });
  }

  if (req.query && Object.keys(req.query).length > 0) {
    Object.entries(req.query).forEach(([key, value]) => {
      if (!key.toLowerCase().includes('password') && 
          !key.toLowerCase().includes('token') && 
          !key.toLowerCase().includes('secret')) {
        attributes[`http.query.${key}`] = String(value);
      }
    });
  }

  addSpanAttributes(attributes);
  next();
};

export const addTenantTierToSpan = async (prisma) => {
  return async (req, res, next) => {
    if (req.tenantId && prisma) {
      try {
        const org = await prisma.organization.findUnique({
          where: { id: req.tenantId },
          select: { subscriptionPlan: true, subscriptionStatus: true }
        });
        
        if (org) {
          addSpanAttributes({
            'tenant.tier': org.subscriptionPlan || 'free',
            'tenant.subscription_status': org.subscriptionStatus || 'unknown'
          });
        }
      } catch (error) {
        console.error('Failed to fetch tenant tier for tracing:', error);
      }
    }
    next();
  };
};
