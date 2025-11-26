import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version
      };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      parameters: req.parameters,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'x-tenant-id': req.headers['x-tenant-id']
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders?.()
    }),
    err: pino.stdSerializers.err
  },
  base: {
    service: 'hse-digital',
    environment: process.env.NODE_ENV || 'development'
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'apiKey'
    ],
    censor: '[REDACTED]'
  }
});

export const createChildLogger = (context) => {
  return logger.child(context);
};

export const logPerformance = (operation, durationMs, metadata = {}) => {
  logger.info({
    type: 'performance',
    operation,
    durationMs,
    ...metadata
  }, `Operation ${operation} took ${durationMs}ms`);
};

export const logSlowQuery = (query, durationMs, metadata = {}) => {
  const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
  if (durationMs > threshold) {
    logger.warn({
      type: 'slow_query',
      query,
      durationMs,
      threshold,
      ...metadata
    }, `Slow query detected: ${query} (${durationMs}ms)`);
  }
};

export const logDatabaseOperation = (model, operation, durationMs, metadata = {}) => {
  logger.debug({
    type: 'database_operation',
    model,
    operation,
    durationMs,
    ...metadata
  }, `DB ${operation} on ${model} (${durationMs}ms)`);
  
  logSlowQuery(`${model}.${operation}`, durationMs, metadata);
};
