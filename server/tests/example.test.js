import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  getTestPrisma,
  createCleanupManager,
  authHelpers,
  testDataHelpers,
  generateTestEmail,
  generateTestSubdomain,
  seedTestDatabase,
  cleanupSeededData,
  organizationFixtures,
  userFixtures,
  stationFixtures,
  waitFor,
  retryOperation,
} from './helpers/index.js';

describe('Example Test Suite - Demonstrating Test Infrastructure', () => {
  let prisma;
  let cleanup;
  let testOrg;
  let testUser;
  let accessToken;

  beforeAll(async () => {
    prisma = getTestPrisma();
    cleanup = createCleanupManager();
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Basic Test Structure', () => {
    it('should create organization using helper', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)({
        name: 'Example Org',
        subscriptionPlan: 'pro',
      });
      cleanup.track('organizations', org.id);

      expect(org).toBeDefined();
      expect(org.subscriptionPlan).toBe('pro');
    });

    it('should create user with authentication', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)();
      cleanup.track('organizations', org.id);

      const user = await testDataHelpers.createTestUser(prisma)(org.id, {
        role: 'Admin',
        email: generateTestEmail(),
      });
      cleanup.track('users', user.id);

      expect(user).toBeDefined();
      expect(user.role).toBe('Admin');
      expect(user.organizationId).toBe(org.id);

      const tokens = authHelpers.generateTokens(user);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');

      const decoded = authHelpers.verifyAccessToken(tokens.accessToken);
      expect(decoded.userId).toBe(user.id);
    });
  });

  describe('Using Fixtures', () => {
    it('should create organization from fixture', async () => {
      const org = await prisma.organization.create({
        data: {
          ...organizationFixtures.enterpriseOrganization,
          slug: generateTestSubdomain(),
          ownerId: 'test-owner',
        }
      });
      cleanup.track('organizations', org.id);

      expect(org.subscriptionPlan).toBe('enterprise');
      expect(org.ssoConfig).toBeDefined();
    });

    it('should create multiple users from fixtures', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)();
      cleanup.track('organizations', org.id);

      const admin = await testDataHelpers.createTestUser(prisma)(org.id, {
        ...userFixtures.adminUser,
        email: generateTestEmail(),
      });

      const manager = await testDataHelpers.createTestUser(prisma)(org.id, {
        ...userFixtures.stationManager,
        email: generateTestEmail(),
      });

      cleanup.track('users', [admin.id, manager.id]);

      expect(admin.role).toBe('Admin');
      expect(manager.role).toBe('Station Manager');
    });

    it('should create station with risk categories', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)();
      cleanup.track('organizations', org.id);

      const highRiskStation = await prisma.station.create({
        data: {
          ...stationFixtures.highRiskStation,
          organizationId: org.id,
        }
      });
      cleanup.track('stations', highRiskStation.id);

      expect(highRiskStation.riskCategory).toBe('High');
      expect(highRiskStation.auditFrequency).toBe('Quarterly');
    });
  });

  describe('Database Seeding', () => {
    it('should seed comprehensive test data', async () => {
      const seededData = await seedTestDatabase({
        organizations: 2,
        usersPerOrg: 3,
        stationsPerOrg: 2,
        auditsPerStation: 1,
        incidentsPerStation: 1,
      });

      cleanup.trackMultiple({
        organizations: seededData.organizations.map(o => o.id),
        users: seededData.users.map(u => u.id),
        stations: seededData.stations.map(s => s.id),
        audits: seededData.audits.map(a => a.id),
        incidents: seededData.incidents.map(i => i.id),
      });

      expect(seededData.organizations).toHaveLength(2);
      expect(seededData.users).toHaveLength(6);
      expect(seededData.stations).toHaveLength(4);
      expect(seededData.audits.length).toBeGreaterThan(0);
      expect(seededData.incidents.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Helpers', () => {
    it('should hash and compare passwords', async () => {
      const password = 'SecurePassword123!';
      const hashed = await authHelpers.hashPassword(password);

      expect(hashed).not.toBe(password);

      const isValid = await authHelpers.comparePassword(password, hashed);
      expect(isValid).toBe(true);

      const isInvalid = await authHelpers.comparePassword('WrongPassword', hashed);
      expect(isInvalid).toBe(false);
    });

    it('should generate and verify tokens', async () => {
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        organizationId: 'org-123',
      };

      const accessToken = authHelpers.generateAccessToken(user);
      const refreshToken = authHelpers.generateRefreshToken(user.id);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const decodedAccess = authHelpers.verifyAccessToken(accessToken);
      expect(decodedAccess.userId).toBe(user.id);
      expect(decodedAccess.email).toBe(user.email);

      const decodedRefresh = authHelpers.verifyRefreshToken(refreshToken);
      expect(decodedRefresh.userId).toBe(user.id);
    });

    it('should generate unique tokens', () => {
      const token1 = authHelpers.generateEmailVerificationToken();
      const token2 = authHelpers.generateEmailVerificationToken();

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64);
    });

    it('should hash tokens consistently', () => {
      const token = authHelpers.generatePasswordResetToken();
      const hash1 = authHelpers.hashToken(token);
      const hash2 = authHelpers.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('Utility Functions', () => {
    it('should wait for specified duration', async () => {
      const startTime = Date.now();
      await waitFor(100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should retry operations on failure', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Not yet');
        }
        return 'success';
      };

      const result = await retryOperation(operation, 5, 10);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should generate unique test data', () => {
      const email1 = generateTestEmail();
      const email2 = generateTestEmail();
      const subdomain1 = generateTestSubdomain();
      const subdomain2 = generateTestSubdomain();

      expect(email1).not.toBe(email2);
      expect(subdomain1).not.toBe(subdomain2);
      expect(email1).toMatch(/@example\.com$/);
      expect(subdomain1).toMatch(/^test-org-/);
    });
  });

  describe('Cleanup Manager', () => {
    let localCleanup;

    beforeEach(() => {
      localCleanup = createCleanupManager();
    });

    afterEach(async () => {
      await localCleanup.cleanup();
    });

    it('should track and cleanup resources', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)();
      localCleanup.track('organizations', org.id);

      const user = await testDataHelpers.createTestUser(prisma)(org.id);
      localCleanup.track('users', user.id);

      const station = await testDataHelpers.createTestStation(prisma)(org.id);
      localCleanup.track('stations', station.id);

      const orgBefore = await prisma.organization.findUnique({ where: { id: org.id } });
      expect(orgBefore).toBeDefined();

      await localCleanup.cleanup();

      const orgAfter = await prisma.organization.findUnique({ where: { id: org.id } });
      expect(orgAfter).toBeNull();
    });

    it('should track multiple resources at once', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)();
      
      const users = await Promise.all([
        testDataHelpers.createTestUser(prisma)(org.id),
        testDataHelpers.createTestUser(prisma)(org.id),
        testDataHelpers.createTestUser(prisma)(org.id),
      ]);

      localCleanup.trackMultiple({
        organizations: [org.id],
        users: users.map(u => u.id),
      });

      await localCleanup.cleanup();

      const remainingUsers = await prisma.user.findMany({
        where: { id: { in: users.map(u => u.id) } }
      });

      expect(remainingUsers).toHaveLength(0);
    });
  });

  describe('Complex Test Scenario', () => {
    it('should handle complete user workflow', async () => {
      const org = await testDataHelpers.createTestOrganization(prisma)({
        subscriptionPlan: 'enterprise',
      });
      cleanup.track('organizations', org.id);

      const admin = await testDataHelpers.createTestUser(prisma)(org.id, {
        role: 'Admin',
      });
      cleanup.track('users', admin.id);

      const tokens = authHelpers.generateTokens(admin);
      const decoded = authHelpers.verifyAccessToken(tokens.accessToken);

      expect(decoded.userId).toBe(admin.id);
      expect(decoded.organizationId).toBe(org.id);

      const station = await testDataHelpers.createTestStation(prisma)(org.id, {
        riskCategory: 'High',
      });
      cleanup.track('stations', station.id);

      const audit = await testDataHelpers.createTestAudit(prisma)(
        org.id,
        station.id,
        admin.id,
        { status: 'Scheduled' }
      );
      cleanup.track('audits', audit.id);

      const incident = await testDataHelpers.createTestIncident(prisma)(
        org.id,
        station.id,
        admin.id,
        { severity: 'High' }
      );
      cleanup.track('incidents', incident.id);

      const allCreated = await prisma.organization.findUnique({
        where: { id: org.id },
        include: {
          users: true,
          stations: {
            include: {
              audits: true,
              incidents: true,
            }
          }
        }
      });

      expect(allCreated.users).toHaveLength(1);
      expect(allCreated.stations).toHaveLength(1);
      expect(allCreated.stations[0].audits).toHaveLength(1);
      expect(allCreated.stations[0].incidents).toHaveLength(1);
    });
  });
});
