import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { logger } from './logger.js';

const isTracingEnabled = process.env.OTEL_ENABLED === 'true';
const serviceName = process.env.OTEL_SERVICE_NAME || 'hse-digital-backend';
const serviceVersion = process.env.npm_package_version || '1.0.0';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

export class TenantAwareTraceIdRatioBasedSampler {
  constructor() {
    this.tierSampleRates = {
      enterprise: parseFloat(process.env.TRACE_SAMPLE_RATE_ENTERPRISE || '1.0'),
      professional: parseFloat(process.env.TRACE_SAMPLE_RATE_PROFESSIONAL || '0.5'),
      starter: parseFloat(process.env.TRACE_SAMPLE_RATE_STARTER || '0.1'),
      free: parseFloat(process.env.TRACE_SAMPLE_RATE_FREE || '0.01'),
      default: parseFloat(process.env.TRACE_SAMPLE_RATE_DEFAULT || '0.1')
    };

    this.pathSampleRates = {
      '/api/health': 0.0,
      '/metrics': 0.0,
      '/api/webhooks': 1.0,
      '/api/billing': 1.0,
      '/api/ai/generate': 1.0,
      '/api/auth': 0.5,
      default: parseFloat(process.env.TRACE_SAMPLE_RATE_DEFAULT || '0.1')
    };
  }

  shouldSample(context, traceId, spanName, spanKind, attributes, links) {
    const httpTarget = attributes['http.target'] || attributes['url.path'] || '';
    const tenantTier = attributes['tenant.tier'] || 'default';

    let pathRate = this.pathSampleRates.default;
    for (const [path, rate] of Object.entries(this.pathSampleRates)) {
      if (path !== 'default' && httpTarget.startsWith(path)) {
        pathRate = rate;
        break;
      }
    }

    const tierRate = this.tierSampleRates[tenantTier] || this.tierSampleRates.default;

    const finalRate = Math.max(pathRate, tierRate);

    if (finalRate === 0) {
      return { decision: 0 };
    }

    if (finalRate === 1) {
      return { decision: 1 };
    }

    const traceIdBytes = traceId.substring(16);
    const traceIdValue = parseInt(traceIdBytes, 16);
    const maxTraceIdValue = Math.pow(2, 64) - 1;
    const threshold = finalRate * maxTraceIdValue;

    if (traceIdValue <= threshold) {
      return { decision: 1, attributes: { 'sampling.rate': finalRate } };
    }

    return { decision: 0 };
  }

  toString() {
    return 'TenantAwareTraceIdRatioBasedSampler';
  }
}

let sdk;
let tracer;

export const initializeTracing = async () => {
  if (!isTracingEnabled) {
    logger.info('OpenTelemetry tracing is disabled');
    return null;
  }

  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = await import('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = await import('@opentelemetry/semantic-conventions');
    const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-node');

    const traceExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {}
    });

    const sampler = new TenantAwareTraceIdRatioBasedSampler();

    sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
        'deployment.environment': process.env.NODE_ENV || 'development',
        'service.namespace': 'hse-digital'
      }),
      spanProcessor: new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000
      }),
      sampler,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (req) => {
              const url = req.url || '';
              return url === '/metrics' || url === '/api/health';
            },
            requestHook: (span, request) => {
              span.setAttribute('http.client_ip', request.socket?.remoteAddress || 'unknown');
            },
            responseHook: (span, response) => {
              span.setAttribute('http.status_code', response.statusCode);
            }
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
            requestHook: (span, info) => {
              const { request } = info;
              if (request.user) {
                span.setAttribute('user.id', request.user.id);
                span.setAttribute('user.email', request.user.email);
                span.setAttribute('user.role', request.user.role);
              }
              if (request.tenantId) {
                span.setAttribute('tenant.id', request.tenantId);
              }
            }
          },
          '@opentelemetry/instrumentation-ioredis': {
            enabled: true,
            dbStatementSerializer: (cmdName, cmdArgs) => {
              return `${cmdName} ${cmdArgs.slice(0, 2).join(' ')}`;
            }
          }
        })
      ]
    });

    sdk.start();
    tracer = trace.getTracer(serviceName, serviceVersion);

    logger.info({
      service: serviceName,
      version: serviceVersion,
      endpoint: otlpEndpoint
    }, '✅ OpenTelemetry tracing initialized');

    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down successfully'))
        .catch((error) => logger.error({ err: error }, 'Error shutting down OpenTelemetry SDK'));
    });

    return tracer;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize OpenTelemetry tracing');
    return null;
  }
};

export const getTracer = () => {
  if (!tracer) {
    tracer = trace.getTracer(serviceName, serviceVersion);
  }
  return tracer;
};

export const withSpan = async (name, attributes = {}, fn) => {
  if (!isTracingEnabled) {
    return await fn();
  }

  const tracer = getTracer();
  return await tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
};

export const addSpanAttributes = (attributes) => {
  if (!isTracingEnabled) return;

  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        currentSpan.setAttribute(key, value);
      }
    });
  }
};

export const addSpanEvent = (name, attributes = {}) => {
  if (!isTracingEnabled) return;

  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent(name, attributes);
  }
};

export const recordException = (error, attributes = {}) => {
  if (!isTracingEnabled) return;

  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.recordException(error, attributes);
    currentSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
  }
};

export const getActiveSpan = () => {
  return trace.getActiveSpan();
};

export const getCurrentTraceId = () => {
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().traceId;
  }
  return null;
};

export const getCurrentSpanId = () => {
  const span = trace.getActiveSpan();
  if (span) {
    return span.spanContext().spanId;
  }
  return null;
};

export { context, trace, SpanStatusCode };
