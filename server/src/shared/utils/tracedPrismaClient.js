import prisma from './db.js';

export function createTracedPrismaClient() {
  return prisma;
}

export { prisma };
export default prisma;
