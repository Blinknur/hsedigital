import { getTestPrisma } from './db.helpers.js';
import { generateTestEmail, generateTestSubdomain } from './test-data.helpers.js';
import bcrypt from 'bcrypt';

const prisma = getTestPrisma();
const testResourceRegistry = new Map();

export class TestContext {
  constructor(testName) {
    this.testName = testName;
    this.resources = {
      organizations: [],
      users: [],
      stations: [],
      audits: [],
      incidents: [],
      contractors: [],
      workPermits: [],
    };
  }

  registerResource(type, id) {
    if (!this.resources[type]) {
      this.resources[type] = [];
    }
    this.resources[type].push(id);
  }

  async cleanup() {
    console.log(`🧹 Cleaning up test: ${this.testName}`);

    try {
      const cleanupOrder = [
        'workPermits',
        'incidents',
        'audits',
        'contractors',
        'stations',
        'users',
        'organizations',
      ];

      for (const resourceType of cleanupOrder) {
        const ids = this.resources[resourceType];
        if (ids && ids.length > 0) {
          await this.cleanupResource(resourceType, ids);
        }
      }

      console.log(`✅ Cleanup completed for test: ${this.testName}`);
    } catch (error) {
      console.error(`❌ Cleanup failed for test: ${this.testName}`, error);
      throw error;
    }
  }

  async cleanupResource(type, ids) {
    const resourceMap = {
      organizations: prisma.organization,
      users: prisma.user,
      stations: prisma.station,
      audits: prisma.audit,
      incidents: prisma.incident,
      contractors: prisma.contractor,
      workPermits: prisma.workPermit,
    };

    const resource = resourceMap[type];
    if (!resource) return;

    try {
      await resource.deleteMany({
        where: { id: { in: ids } },
      });
      console.log(`  ✓ Cleaned ${ids.length} ${type}`);
    } catch (error) {
      console.warn(`  ⚠ Failed to cleanup ${type}:`, error.message);
    }
  }

  async createOrganization(data = {}) {
    const org = await prisma.organization.create({
      data: {
        name: data.name || `Test Org ${Date.now()}`,
        slug: data.slug || generateTestSubdomain(),
        ownerId: data.ownerId || `owner-${Date.now()}`,
        subscriptionPlan: data.subscriptionPlan || 'free',
        subscriptionStatus: data.subscriptionStatus || 'active',
        ...data,
      },
    });

    this.registerResource('organizations', org.id);
    return org;
  }

  async createUser(organizationId, data = {}) {
    const password = data.password || 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name || `Test User ${Date.now()}`,
        email: data.email || generateTestEmail(),
        password: hashedPassword,
        role: data.role || 'Admin',
        organizationId,
        isEmailVerified: data.isEmailVerified !== undefined ? data.isEmailVerified : true,
        assignedStationIds: data.assignedStationIds || [],
        ...data,
      },
    });

    this.registerResource('users', user.id);
    return { ...user, plainPassword: password };
  }

  async createStation(organizationId, data = {}) {
    const station = await prisma.station.create({
      data: {
        name: data.name || `Test Station ${Date.now()}`,
        brand: data.brand || 'TestBrand',
        region: data.region || 'Test Region',
        address: data.address || '123 Test St',
        location: data.location || { lat: 0, lng: 0 },
        riskCategory: data.riskCategory || 'Low',
        auditFrequency: data.auditFrequency || 'Annually',
        isActive: data.isActive !== undefined ? data.isActive : true,
        organizationId,
        ...data,
      },
    });

    this.registerResource('stations', station.id);
    return station;
  }

  async createAudit(organizationId, stationId, auditorId, data = {}) {
    const audit = await prisma.audit.create({
      data: {
        organizationId,
        stationId,
        auditorId,
        auditNumber: data.auditNumber || `AUD-${Date.now()}`,
        scheduledDate: data.scheduledDate || new Date(),
        status: data.status || 'Scheduled',
        formId: data.formId || 'form-test-1',
        findings: data.findings || [],
        overallScore: data.overallScore || 0,
        ...data,
      },
    });

    this.registerResource('audits', audit.id);
    return audit;
  }

  async createIncident(organizationId, stationId, reporterId, data = {}) {
    const incident = await prisma.incident.create({
      data: {
        organizationId,
        stationId,
        reporterId,
        incidentType: data.incidentType || 'General',
        severity: data.severity || 'Low',
        description: data.description || 'Test incident',
        status: data.status || 'Open',
        reportedAt: data.reportedAt || new Date(),
        ...data,
      },
    });

    this.registerResource('incidents', incident.id);
    return incident;
  }

  async createContractor(organizationId, data = {}) {
    const contractor = await prisma.contractor.create({
      data: {
        name: data.name || `Test Contractor ${Date.now()}`,
        licenseNumber: data.licenseNumber || `LIC-${Date.now()}`,
        specialization: data.specialization || 'General',
        contactPerson: data.contactPerson || 'Test Contact',
        email: data.email || generateTestEmail(),
        status: data.status || 'Active',
        organizationId,
        ...data,
      },
    });

    this.registerResource('contractors', contractor.id);
    return contractor;
  }

  async createWorkPermit(organizationId, stationId, requestedBy, data = {}) {
    const permit = await prisma.workPermit.create({
      data: {
        organizationId,
        stationId,
        requestedBy,
        permitType: data.permitType || 'General',
        description: data.description || 'Test work permit',
        status: data.status || 'Pending',
        validFrom: data.validFrom || new Date(),
        validTo: data.validTo || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ...data,
      },
    });

    this.registerResource('workPermits', permit.id);
    return permit;
  }
}

export function createTestContext(testName) {
  const context = new TestContext(testName);
  testResourceRegistry.set(testName, context);
  return context;
}

export async function cleanupAllTests() {
  console.log('🧹 Cleaning up all test contexts...');
  
  for (const [testName, context] of testResourceRegistry.entries()) {
    await context.cleanup();
  }
  
  testResourceRegistry.clear();
  console.log('✅ All test contexts cleaned up');
}

export const withTestContext = (testFn) => {
  return async () => {
    const context = createTestContext(testFn.name || 'anonymous');
    
    try {
      await testFn(context);
    } finally {
      await context.cleanup();
    }
  };
};
