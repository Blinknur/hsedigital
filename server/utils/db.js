import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
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
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

prisma.$on('query', (e) => {
  const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
  if (e.duration > threshold) {
    logger.warn({
      type: 'slow_query',
      query: e.query,
      duration: e.duration,
      params: e.params
    }, `Slow query detected: ${e.duration}ms`);
  }
});

prisma.$on('error', (e) => {
  logger.error({ err: e }, 'Prisma error');
});

prisma.$on('warn', (e) => {
  logger.warn({
    type: 'database_warning',
    message: e.message
  }, 'Database warning');
});

export default prisma;
