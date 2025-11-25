import { PrismaClient } from '@prisma/client';
import { logger, logDatabaseOperation } from './logger.js';
import { databaseQueryDuration, databaseQueryTotal } from './metrics.js';
import { withSpan, addSpanAttributes, recordException } from './tracing.js';

const isTracingEnabled = process.env.OTEL_ENABLED === 'true';

export const createTracedPrismaClient = () => {
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  if (isTracingEnabled) {
    const modelNames = Object.keys(prisma).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      typeof prisma[key] === 'object'
    );

    modelNames.forEach(modelName => {
      const model = prisma[modelName];
      const operations = ['findUnique', 'findFirst', 'findMany', 'create', 'createMany', 
                          'update', 'updateMany', 'upsert', 'delete', 'deleteMany', 
                          'count', 'aggregate', 'groupBy'];

      operations.forEach(operation => {
        if (typeof model[operation] === 'function') {
          const originalMethod = model[operation].bind(model);
          
          model[operation] = async function (...args) {
            return await withSpan(
              `prisma.${modelName}.${operation}`,
              {
                'db.system': 'postgresql',
                'db.name': process.env.DATABASE_NAME || 'hse_digital',
                'db.operation': operation,
                'db.model': modelName,
                'db.prisma': 'true'
              },
              async (span) => {
                const startTime = Date.now();
                
                try {
                  if (args[0]) {
                    const queryInfo = JSON.stringify(args[0]);
                    if (queryInfo.length < 1000) {
                      span.setAttribute('db.statement', queryInfo);
                    }
                  }

                  const result = await originalMethod(...args);
                  
                  const duration = Date.now() - startTime;
                  span.setAttribute('db.duration_ms', duration);
                  
                  databaseQueryDuration.observe(
                    { model: modelName, operation, tenant_id: 'unknown' },
                    duration / 1000
                  );
                  
                  databaseQueryTotal.inc({ 
                    model: modelName, 
                    operation, 
                    tenant_id: 'unknown',
                    status: 'success'
                  });

                  return result;
                } catch (error) {
                  recordException(error, {
                    'db.model': modelName,
                    'db.operation': operation
                  });
                  
                  databaseQueryTotal.inc({ 
                    model: modelName, 
                    operation, 
                    tenant_id: 'unknown',
                    status: 'error'
                  });
                  
                  throw error;
                }
              }
            );
          };
        }
      });
    });

    prisma.$use(async (params, next) => {
      return await withSpan(
        `prisma.${params.model || 'unknown'}.${params.action}`,
        {
          'db.system': 'postgresql',
          'db.operation': params.action,
          'db.model': params.model || 'unknown'
        },
        async () => {
          const startTime = Date.now();
          const result = await next(params);
          const duration = Date.now() - startTime;
          
          addSpanAttributes({
            'db.duration_ms': duration
          });
          
          return result;
        }
      );
    });
  }

  prisma.$on('query', (e) => {
    const durationMs = e.duration;
    const durationSeconds = durationMs / 1000;

    logger.debug({
      type: 'database_query',
      query: e.query,
      params: e.params,
      duration: durationMs,
      target: e.target
    });

    databaseQueryDuration.observe(
      { 
        model: e.target || 'unknown', 
        operation: 'query',
        tenant_id: 'unknown'
      }, 
      durationSeconds
    );

    databaseQueryTotal.inc({ 
      model: e.target || 'unknown', 
      operation: 'query',
      tenant_id: 'unknown',
      status: 'success'
    });

    const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
    if (durationMs > threshold) {
      logger.warn({
        type: 'slow_query',
        query: e.query,
        params: e.params,
        duration: durationMs,
        threshold,
        target: e.target
      }, `Slow query detected: ${durationMs}ms`);
    }
  });

  prisma.$on('error', (e) => {
    logger.error({
      type: 'database_error',
      message: e.message,
      target: e.target
    }, 'Database error occurred');

    databaseQueryTotal.inc({ 
      model: e.target || 'unknown', 
      operation: 'query',
      tenant_id: 'unknown',
      status: 'error'
    });
  });

  prisma.$on('warn', (e) => {
    logger.warn({
      type: 'database_warning',
      message: e.message,
      target: e.target
    }, 'Database warning');
  });

  return prisma;
};
