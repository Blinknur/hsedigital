import { setTenantContext, clearTenantContext, getTenantContext } from '../shared/utils/db.js';
import { tenantService } from '../core/services/tenantService.js';

const prisma = global.prisma;

describe('Tenant Isolation Tests', () => {
  let testOrgId1, testOrgId2, testStationId1, testStationId2;

  beforeAll(async () => {
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

    const station1 = await prisma.station.create({
      data: {
        name: 'Station 1',
        organizationId: testOrgId1
      }
    });
    testStationId1 = station1.id;

    const station2 = await prisma.station.create({
      data: {
        name: 'Station 2',
        organizationId: testOrgId2
      }
    });
    testStationId2 = station2.id;
  });

  afterAll(async () => {
    await prisma.station.deleteMany({
      where: {
        id: { in: [testStationId1, testStationId2] }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        id: { in: [testOrgId1, testOrgId2] }
      }
    });
  });

  afterEach(() => {
    clearTenantContext();
  });

  describe('Tenant Context Setting', () => {
    test('should set tenant context correctly', () => {
      setTenantContext(testOrgId1);
      const context = getTenantContext();
      expect(context).toBe(testOrgId1);
    });

    test('should clear tenant context', () => {
      setTenantContext(testOrgId1);
      clearTenantContext();
      const context = getTenantContext();
      expect(context).toBeNull();
    });
  });

  describe('Auto-Injection on CREATE', () => {
    test('should auto-inject organizationId on create', async () => {
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
      setTenantContext(testOrgId1);
      const stations1 = await prisma.station.findMany();
      expect(stations1).toHaveLength(1);
      expect(stations1[0].id).toBe(testStationId1);
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      const stations2 = await prisma.station.findMany();
      expect(stations2).toHaveLength(1);
      expect(stations2[0].id).toBe(testStationId2);
    });
  });

  describe('Query Interceptor on findFirst', () => {
    test('should filter findFirst results by tenant context', async () => {
      setTenantContext(testOrgId1);
      const station1 = await prisma.station.findFirst();
      expect(station1).not.toBeNull();
      expect(station1.id).toBe(testStationId1);
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      const station2 = await prisma.station.findFirst();
      expect(station2).not.toBeNull();
      expect(station2.id).toBe(testStationId2);
    });
  });

  describe('Block Queries Without Tenant Context', () => {
    test('should return empty results for findMany without context', async () => {
      clearTenantContext();
      const stations = await prisma.station.findMany();
      expect(stations).toHaveLength(0);
    });

    test('should return null for findFirst without context', async () => {
      clearTenantContext();
      const station = await prisma.station.findFirst();
      expect(station).toBeNull();
    });

    test('should throw error for CREATE without context', async () => {
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
      const valid = await tenantService.validateTenant(testOrgId1);
      expect(valid).toBe(true);
    });

    test('should fail validation for non-existent tenant', async () => {
      const valid = await tenantService.validateTenant('non-existent-org');
      expect(valid).toBe(false);
    });

    test('should fail validation for null tenant', async () => {
      const valid = await tenantService.validateTenant(null);
      expect(valid).toBe(false);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    test('should prevent cross-tenant data access', async () => {
      setTenantContext(testOrgId1);
      const contractor1 = await prisma.contractor.create({
        data: { name: 'Tenant 1 Contractor' }
      });
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      const foundContractor = await prisma.contractor.findFirst({
        where: { id: contractor1.id }
      });
      expect(foundContractor).toBeNull();
      clearTenantContext();
      
      setTenantContext(testOrgId1);
      await prisma.contractor.delete({ where: { id: contractor1.id } });
    });
  });

  describe('Update Operations with Tenant Context', () => {
    test('should allow updates within same tenant', async () => {
      setTenantContext(testOrgId1);
      const contractor = await prisma.contractor.create({
        data: { name: 'Update Test Contractor' }
      });
      
      await prisma.contractor.update({
        where: { id: contractor.id },
        data: { name: 'Updated Name' }
      });
      
      const updated = await prisma.contractor.findUnique({
        where: { id: contractor.id }
      });
      
      expect(updated.name).toBe('Updated Name');
      
      await prisma.contractor.delete({ where: { id: contractor.id } });
    });

    test('should prevent updates from different tenant', async () => {
      setTenantContext(testOrgId1);
      const contractor = await prisma.contractor.create({
        data: { name: 'Update Test Contractor' }
      });
      const contractorId = contractor.id;
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      await expect(
        prisma.contractor.update({
          where: { id: contractorId },
          data: { name: 'Unauthorized Update' }
        })
      ).rejects.toThrow();
      clearTenantContext();
      
      setTenantContext(testOrgId1);
      await prisma.contractor.delete({ where: { id: contractorId } });
    });
  });

  describe('Delete Operations with Tenant Context', () => {
    test('should prevent deletes from different tenant', async () => {
      setTenantContext(testOrgId1);
      const contractor = await prisma.contractor.create({
        data: { name: 'Delete Test Contractor' }
      });
      const contractorId = contractor.id;
      clearTenantContext();
      
      setTenantContext(testOrgId2);
      await expect(
        prisma.contractor.delete({
          where: { id: contractorId }
        })
      ).rejects.toThrow();
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
      await tenantService.clearAllTenantCache();
      
      const start1 = Date.now();
      await tenantService.validateTenant(testOrgId1);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      await tenantService.validateTenant(testOrgId1);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThanOrEqual(time1);
    });

    test('should work after cache invalidation', async () => {
      await tenantService.invalidateTenantCache(testOrgId1);
      const validAfterInvalidate = await tenantService.validateTenant(testOrgId1);
      expect(validAfterInvalidate).toBe(true);
    });
  });
});
