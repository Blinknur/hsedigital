import { authHelpers } from './auth.helpers.js';

export const generateTestEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

export const generateTestSubdomain = () => `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`;

export const generateTestPassword = () => 'TestPassword123!';

export const generateTestPhone = () => `+923${Math.floor(Math.random() * 1000000000)}`;

export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await waitFor(delay);
    }
  }
};

export const testDataHelpers = {
  generateTestEmail,
  generateTestSubdomain,
  generateTestPassword,
  generateTestPhone,
  waitFor,
  retryOperation,

  createTestOrganization: (prisma) => async (overrides = {}) => {
    return await prisma.organization.create({
      data: {
        name: overrides.name || 'Test Organization',
        slug: overrides.slug || generateTestSubdomain(),
        ownerId: overrides.ownerId || `test-owner-${Date.now()}`,
        subscriptionPlan: overrides.subscriptionPlan || 'free',
        subscriptionStatus: overrides.subscriptionStatus || 'active',
        ...overrides,
      }
    });
  },

  createTestUser: (prisma) => async (organizationId, overrides = {}) => {
    const password = overrides.password || generateTestPassword();
    const hashedPassword = await authHelpers.hashPassword(password);

    return await prisma.user.create({
      data: {
        name: overrides.name || 'Test User',
        email: overrides.email || generateTestEmail(),
        password: hashedPassword,
        role: overrides.role || 'Admin',
        organizationId,
        isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
        ...overrides,
      }
    });
  },

  createTestStation: (prisma) => async (organizationId, overrides = {}) => {
    return await prisma.station.create({
      data: {
        name: overrides.name || 'Test Station',
        brand: overrides.brand || 'TestBrand',
        region: overrides.region || 'Test Region',
        address: overrides.address || '123 Test Street',
        location: overrides.location || { lat: 0, lng: 0 },
        riskCategory: overrides.riskCategory || 'Low',
        auditFrequency: overrides.auditFrequency || 'Annually',
        isActive: overrides.isActive !== undefined ? overrides.isActive : true,
        organizationId,
        ...overrides,
      }
    });
  },

  createTestAudit: (prisma) => async (organizationId, stationId, auditorId, overrides = {}) => {
    return await prisma.audit.create({
      data: {
        stationId,
        auditorId,
        organizationId,
        scheduledDate: overrides.scheduledDate || new Date(),
        status: overrides.status || 'Scheduled',
        auditType: overrides.auditType || 'Regular',
        ...overrides,
      }
    });
  },

  createTestIncident: (prisma) => async (organizationId, stationId, reportedById, overrides = {}) => {
    return await prisma.incident.create({
      data: {
        stationId,
        reportedById,
        organizationId,
        title: overrides.title || 'Test Incident',
        description: overrides.description || 'Test incident description',
        severity: overrides.severity || 'Low',
        status: overrides.status || 'Open',
        occurredAt: overrides.occurredAt || new Date(),
        ...overrides,
      }
    });
  },

  createTestContractor: (prisma) => async (organizationId, overrides = {}) => {
    return await prisma.contractor.create({
      data: {
        name: overrides.name || 'Test Contractor',
        licenseNumber: overrides.licenseNumber || `LIC-${Date.now()}`,
        specialization: overrides.specialization || 'General',
        contactPerson: overrides.contactPerson || 'Test Contact',
        email: overrides.email || generateTestEmail(),
        phone: overrides.phone || generateTestPhone(),
        status: overrides.status || 'Active',
        organizationId,
        ...overrides,
      }
    });
  },

  createTestForm: (prisma) => async (organizationId, overrides = {}) => {
    return await prisma.form.create({
      data: {
        name: overrides.name || 'Test Form',
        frequency: overrides.frequency || 'Daily',
        schema: overrides.schema || { components: [] },
        organizationId,
        ...overrides,
      }
    });
  },
};
