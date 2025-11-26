import { PrismaClient } from '@prisma/client';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

let prismaInstance = null;

export const getTestPrisma = () => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: { url: TEST_DATABASE_URL }
      },
      log: process.env.DEBUG_TESTS === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
};

export const dbHelpers = {
  getPrisma: getTestPrisma,

  connect: async () => {
    const prisma = getTestPrisma();
    await prisma.$connect();
    return prisma;
  },

  disconnect: async () => {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      prismaInstance = null;
    }
  },

  cleanDatabase: async () => {
    const prisma = getTestPrisma();
    
    const tableNames = [
      'UserRole',
      'RolePermission',
      'AuditLog',
      'Notification',
      'Incident',
      'Audit',
      'Form',
      'Contractor',
      'Station',
      'User',
      'Organization',
      'Permission',
      'Role',
    ];

    for (const tableName of tableNames) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
      } catch (error) {
        console.warn(`Could not clean table ${tableName}:`, error.message);
      }
    }
  },

  cleanupTestData: async (resourceType, ids) => {
    const prisma = getTestPrisma();
    
    if (!ids || ids.length === 0) return;

    const resourceMap = {
      users: prisma.user,
      organizations: prisma.organization,
      stations: prisma.station,
      audits: prisma.audit,
      incidents: prisma.incident,
      contractors: prisma.contractor,
      forms: prisma.form,
      notifications: prisma.notification,
    };

    const resource = resourceMap[resourceType];
    if (!resource) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    try {
      await resource.deleteMany({
        where: { id: { in: Array.isArray(ids) ? ids : [ids] } }
      });
    } catch (error) {
      console.warn(`Failed to cleanup ${resourceType}:`, error.message);
    }
  },

  executeRaw: async (query, ...params) => {
    const prisma = getTestPrisma();
    return await prisma.$executeRawUnsafe(query, ...params);
  },

  queryRaw: async (query, ...params) => {
    const prisma = getTestPrisma();
    return await prisma.$queryRawUnsafe(query, ...params);
  },

  transaction: async (callback) => {
    const prisma = getTestPrisma();
    return await prisma.$transaction(callback);
  },
};

export const {
  connect,
  disconnect,
  cleanDatabase,
  cleanupTestData,
  executeRaw,
  queryRaw,
  transaction,
} = dbHelpers;
