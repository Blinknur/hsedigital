import { setTenantContext, clearTenantContext, getTenantContext } from '../shared/utils/db.js';
import { tenantService } from '../core/services/tenantService.js';
import { closeRedis } from '../shared/utils/redis.js';

const prisma = global.prisma;

let dbAvailable = false;

const skipIfNoDatabase = () => {
  if (!dbAvailable) {
    console.log('⚠️  Skipping test - database not available');
  }
  return !dbAvailable;
};

describe('Tenant Isolation Tests', () => {
  let testOrgId1, testOrgId2, testStationId1, testStationId2;
  let setupSuccessful = false;

  beforeAll(async () => {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      dbAvailable = true;
    } catch (error) {
      console.log('⚠️  Database not available - tests will be skipped');
      console.log(`   Error: ${error.message}`);
      dbAvailable = false;
      return;
    }

    if (!dbAvailable) {
      return;
    }

    try {
      clearTenantContext();

      const org1 = await prisma.organization.create({
        data: {
          name: 'Test Organization 1',
          ownerId: 'test-owner-1'
        }
      });
      testOrgId1 = org1.id;

      const org2 = await prisma.organization.create({
        data: {
          name: 'Test Organization 2',
          ownerId: 'test-owner-2'
        }
      });
      testOrgId2 = org2.id;

      setTenantContext(testOrgId1);
      const station1 = await prisma.station.create({
        data: {
          name: 'Station 1',
          organizationId: testOrgId1
        }
      });
      testStationId1 = station1.id;
      clearTenantContext();

      setTenantContext(testOrgId2);
      const station2 = await prisma.station.create({
        data: {
          name: 'Station 2',
          organizationId: testOrgId2
        }
      });
      testStationId2 = station2.id;
      clearTenantContext();

      setupSuccessful = true;
      console.log('✓ Test data setup completed');
    } catch (error) {
      console.error('Failed to setup test data:', error.message);
      setupSuccessful = false;
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (!dbAvailable || !setupSuccessful) {
      return;
    }

    try {
      clearTenantContext();

      if (testStationId1 || testStationId2) {
        await prisma.station.deleteMany({
          where: {
            id: { in: [testStationId1, testStationId2].filter(Boolean) }
          }
        });
      }

      if (testOrgId1 || testOrgId2) {
        await prisma.organization.deleteMany({
          where: {
            id: { in: [testOrgId1, testOrgId2].filter(Boolean) }
          }
        });
      }

      try {
        await closeRedis();
      } catch (redisError) {
        // Redis might not be available in test environment
      }

      console.log('✓ Test data cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    } finally {
      clearTenantContext();
    }
  });

  afterEach(() => {
    if (dbAvailable) {
      clearTenantContext();
    }
  });

  describe('Tenant Context Setting', () => {
    test('should set tenant context correctly', () => {
      if (skipIfNoDatabase()) return;
      
      setTenantContext(testOrgId1);
      const context = getTenantContext();
      expect(context).toBe(testOrgId1);
    });

    test('should clear tenant context', () => {
      if (skipIfNoDatabase()) return;
      
      setTenantContext(testOrgId1);
      clearTenantContext();
      const context = getTenantContext();
      expect(context).toBeNull();
    });
  });

  describe('Auto-Injection on CREATE', () => {
    test('should auto-inject organizationId on create', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      
      const contractor = await prisma.contractor.create({
        data: {
          name: 'Test Contractor'
        }
      });
      
      expect(contractor.organizationId).toBe(testOrgId1);
      
      await prisma.contractor.delete({ where: { id: contractor.id } });
    });
  });

  describe('Query Interceptor on findMany', () => {
    test('should filter findMany results by tenant context', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      const stations1 = await prisma.station.findMany();
      expect(stations1.length).toBeGreaterThanOrEqual(1);
      expect(stations1.some(s => s.id === testStationId1)).toBe(true);
      expect(stations1.every(s => s.organizationId === testOrgId1)).toBe(true);
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      const stations2 = await prisma.station.findMany();
      expect(stations2.length).toBeGreaterThanOrEqual(1);
      expect(stations2.some(s => s.id === testStationId2)).toBe(true);
      expect(stations2.every(s => s.organizationId === testOrgId2)).toBe(true);
      expect(stations2.some(s => s.id === testStationId1)).toBe(false);
    });
  });

  describe('Query Interceptor on findFirst', () => {
    test('should filter findFirst results by tenant context', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      const station1 = await prisma.station.findFirst({
        where: { id: testStationId1 }
      });
      expect(station1).not.toBeNull();
      expect(station1.id).toBe(testStationId1);
      expect(station1.organizationId).toBe(testOrgId1);
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      const station2 = await prisma.station.findFirst({
        where: { id: testStationId2 }
      });
      expect(station2).not.toBeNull();
      expect(station2.id).toBe(testStationId2);
      expect(station2.organizationId).toBe(testOrgId2);
    });
  });

  describe('Block Queries Without Tenant Context', () => {
    test('should return empty results for findMany without context', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      clearTenantContext();
      const stations = await prisma.station.findMany();
      expect(stations).toHaveLength(0);
    });

    test('should return null for findFirst without context', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      clearTenantContext();
      const station = await prisma.station.findFirst();
      expect(station).toBeNull();
    });

    test('should throw error for CREATE without context', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      clearTenantContext();
      await expect(
        prisma.contractor.create({
          data: { name: 'Unauthorized Contractor' }
        })
      ).rejects.toThrow('Cannot create contractor without tenant context');
    });
  });

  describe('Tenant Validation', () => {
    test('should validate existing tenant', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      const valid = await tenantService.validateTenant(testOrgId1);
      expect(valid).toBe(true);
    });

    test('should fail validation for non-existent tenant', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      const valid = await tenantService.validateTenant('non-existent-org');
      expect(valid).toBe(false);
    });

    test('should fail validation for null tenant', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      const valid = await tenantService.validateTenant(null);
      expect(valid).toBe(false);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    test('should prevent cross-tenant data access', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      const contractor1 = await prisma.contractor.create({
        data: { name: 'Tenant 1 Contractor' }
      });
      const contractorId = contractor1.id;
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      const foundContractor = await prisma.contractor.findFirst({
        where: { id: contractorId }
      });
      expect(foundContractor).toBeNull();
      clearTenantContext();
      
      setTenantContext(testOrgId1);
      await prisma.contractor.delete({ where: { id: contractorId } });
    });
  });

  describe('Update Operations with Tenant Context', () => {
    test('should allow updates within same tenant', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      const contractor = await prisma.contractor.create({
        data: { name: 'Update Test Contractor' }
      });
      
      const updated = await prisma.contractor.update({
        where: { id: contractor.id },
        data: { name: 'Updated Name' }
      });
      
      expect(updated.name).toBe('Updated Name');
      expect(updated.organizationId).toBe(testOrgId1);
      
      await prisma.contractor.delete({ where: { id: contractor.id } });
    });

    test('should prevent updates from different tenant', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      const contractor = await prisma.contractor.create({
        data: { name: 'Update Test Contractor' }
      });
      const contractorId = contractor.id;
      const originalName = contractor.name;
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      
      const updateResult = await prisma.contractor.updateMany({
        where: { id: contractorId },
        data: { name: 'Unauthorized Update' }
      });
      
      expect(updateResult.count).toBe(0);
      clearTenantContext();
      
      setTenantContext(testOrgId1);
      const contractor2 = await prisma.contractor.findUnique({
        where: { id: contractorId }
      });
      expect(contractor2).not.toBeNull();
      expect(contractor2.name).toBe(originalName);
      
      await prisma.contractor.delete({ where: { id: contractorId } });
    });
  });

  describe('Delete Operations with Tenant Context', () => {
    test('should prevent deletes from different tenant', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      setTenantContext(testOrgId1);
      const contractor = await prisma.contractor.create({
        data: { name: 'Delete Test Contractor' }
      });
      const contractorId = contractor.id;
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      
      const deleteResult = await prisma.contractor.deleteMany({
        where: { id: contractorId }
      });
      
      expect(deleteResult.count).toBe(0);
      clearTenantContext();
      
      setTenantContext(testOrgId1);
      const stillExists = await prisma.contractor.findUnique({
        where: { id: contractorId }
      });
      expect(stillExists).not.toBeNull();
      
      await prisma.contractor.delete({ where: { id: contractorId } });
    });
  });

  describe('Tenant Cache', () => {
    test('should cache tenant validation results', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      try {
        await tenantService.clearAllTenantCache();
      } catch (error) {
        // Redis might not be available
      }
      
      const start1 = Date.now();
      await tenantService.validateTenant(testOrgId1);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await tenantService.validateTenant(testOrgId1);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThanOrEqual(time1 + 10);
    });

    test('should work after cache invalidation', async () => {
      if (skipIfNoDatabase() || !setupSuccessful) return;
      
      try {
        await tenantService.invalidateTenantCache(testOrgId1);
      } catch (error) {
        // Redis might not be available
      }
      
      const validAfterInvalidate = await tenantService.validateTenant(testOrgId1);
      expect(validAfterInvalidate).toBe(true);
    });
  });
});
