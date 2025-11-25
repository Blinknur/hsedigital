import { PrismaClient } from '@prisma/client';
import { logger, logDatabaseOperation } from './logger.js';
import { databaseQueryDuration, databaseQueryTotal } from './metrics.js';

export const createInstrumentedPrismaClient = () => {
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

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
