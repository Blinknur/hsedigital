import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10);
const connectionTimeout = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10);
const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10000', 10);

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

export { prisma };
export default prisma;
