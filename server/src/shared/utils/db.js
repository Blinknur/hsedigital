import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { logger, logDatabaseOperation } from './logger.js';
import { databaseQueryDuration, databaseQueryTotal } from './metrics.js';
import { withSpan, addSpanAttributes, recordException } from './tracing.js';

const isTracingEnabled = process.env.OTEL_ENABLED === 'true';

const tenantContext = new AsyncLocalStorage();

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  client.$on('query', (e) => {
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

  client.$on('error', (e) => {
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

    if (process.env.NODE_ENV !== 'test') {
      import('../../core/services/alertingService.js').then(({ advancedAlertingService }) => {
        const error = new Error(e.message);
        advancedAlertingService.trackErrorRate(error).catch(() => {});
      }).catch(() => {});
    }
  });

  client.$on('warn', (e) => {
    logger.warn({
      type: 'database_warning',
      message: e.message,
      target: e.target
    }, 'Database warning');
  });

  if (isTracingEnabled) {
    const modelNames = Object.keys(client).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      typeof client[key] === 'object'
    );

    modelNames.forEach(modelName => {
      const model = client[modelName];
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

    client.$use(async (params, next) => {
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

  return client;
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function setTenantContext(tenantId) {
  tenantContext.enterWith(tenantId);
}

export function clearTenantContext() {
  tenantContext.enterWith(null);
}

export function getTenantContext() {
  return tenantContext.getStore();
}

const modelsWithTenantIsolation = [
  'audit', 'incident', 'station', 'contractor', 'chemicalInventory',
  'inspectionChecklist', 'maintenanceRecord', 'trainingRecord',
  'emergencyContact', 'safetyDocument', 'user', 'role', 'activity',
  'notification', 'report', 'invoice', 'webhook', 'apiKey'
];

const modelsWithoutTenantId = ['organization', 'refreshToken'];

prisma.$use(async (params, next) => {
  const currentTenantId = getTenantContext();
  const modelName = params.model;
  
  if (!modelName || modelsWithoutTenantId.includes(modelName)) {
    return next(params);
  }
  
  if (!modelsWithTenantIsolation.includes(modelName)) {
    return next(params);
  }
  
  const action = params.action;
  
  if (action === 'create' || action === 'createMany') {
    if (!currentTenantId) {
      throw new Error(`Cannot create ${modelName} without tenant context`);
    }
    
    if (action === 'create') {
      if (!params.args.data.organizationId) {
        params.args.data.organizationId = currentTenantId;
      }
    } else if (action === 'createMany') {
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map(item => ({
          ...item,
          organizationId: item.organizationId || currentTenantId
        }));
      }
    }
  }
  
  if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate'].includes(action)) {
    if (currentTenantId) {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      
      if (!params.args.where.organizationId) {
        params.args.where.organizationId = currentTenantId;
      }
    } else {
      params.args = params.args || {};
      params.args.where = params.args.where || {};
      
      if (action === 'findMany') {
        params.args.where.organizationId = '__NO_TENANT__';
      } else if (action === 'findFirst' || action === 'findUnique') {
        params.args.where.organizationId = '__NO_TENANT__';
      }
    }
  }
  
  return next(params);
});

export { prisma };
export default prisma;
