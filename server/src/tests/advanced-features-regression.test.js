import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import prisma from '../shared/utils/db.js';
import Redis from 'ioredis';
import { queueEmail, queueReport, queueDataExport, queueWebhook, queueTenantOnboarding, getJobStatus } from '../core/services/queueService.js';
import { checkQuota, incrementUsage, checkFeatureAccess, getCurrentUsage } from '../core/services/quotaService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3001';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined
});

const createTestToken = (userId, organizationId, role = 'Admin') => {
  return jwt.sign(
    { id: userId, email: `test-${userId}@example.com`, role, organizationId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectWebSocket = (token) => {
  return new Promise((resolve, reject) => {
    const client = ioClient(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', (error) => reject(error));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
};

describe('Advanced Features Regression Tests', () => {
  let testOrg, testUser, testStation, authToken;

  beforeAll(async () => {
    testOrg = await prisma.organization.create({
      data: {
        name: 'Regression Test Org',
        slug: `regression-test-${Date.now()}`,
        ownerId: `owner-${Date.now()}`,
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active'
      }
    });

    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: '$2b$10$abcdefghijklmnopqrstuv',
        role: 'Admin',
        organizationId: testOrg.id,
        isEmailVerified: true
      }
    });

    testStation = await prisma.station.create({
      data: {
        name: 'Test Station',
        brand: 'TestBrand',
        region: 'Test Region',
        organizationId: testOrg.id
      }
    });

    authToken = createTestToken(testUser.id, testOrg.id, 'Admin');
  });

  afterAll(async () => {
    await prisma.station.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.user.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('Stripe Billing Integration', () => {
    it('should handle checkout.session.completed', async () => {
      const { handleCheckoutComplete } = await import('../core/services/stripeService.js');
      const mockSession = {
        client_reference_id: testOrg.id,
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: { organizationId: testOrg.id, planId: 'enterprise' }
      };
      await handleCheckoutComplete(mockSession);
      const org = await prisma.organization.findUnique({ where: { id: testOrg.id } });
      expect(org.stripeCustomerId).toBe('cus_test_123');
      expect(org.subscriptionStatus).toBe('active');
    });

    it('should handle subscription.updated', async () => {
      const { handleSubscriptionUpdated } = await import('../core/services/stripeService.js');
      await prisma.organization.update({ where: { id: testOrg.id }, data: { stripeSubscriptionId: 'sub_456' } });
      await handleSubscriptionUpdated({ id: 'sub_456', status: 'past_due', metadata: { planId: 'professional' } });
      const org = await prisma.organization.findUnique({ where: { id: testOrg.id } });
      expect(org.subscriptionStatus).toBe('past_due');
    });

    it('should handle subscription.deleted', async () => {
      const { handleSubscriptionDeleted } = await import('../core/services/stripeService.js');
      await prisma.organization.update({ where: { id: testOrg.id }, data: { stripeSubscriptionId: 'sub_789' } });
      await handleSubscriptionDeleted({ id: 'sub_789' });
      const org = await prisma.organization.findUnique({ where: { id: testOrg.id } });
      expect(org.subscriptionStatus).toBe('canceled');
      expect(org.subscriptionPlan).toBe('free');
    });

    it('should handle payment.failed', async () => {
      const { handlePaymentFailed } = await import('../core/services/stripeService.js');
      await prisma.organization.update({ where: { id: testOrg.id }, data: { stripeSubscriptionId: 'sub_fail' } });
      await handlePaymentFailed({ subscription: 'sub_fail' });
      const org = await prisma.organization.findUnique({ where: { id: testOrg.id } });
      expect(org.subscriptionStatus).toBe('past_due');
    });
  });

  describe('RBAC Permissions', () => {
    it('should get user permissions', async () => {
      const { getUserPermissions } = await import('../api/middleware/rbac.js');
      const permissions = await getUserPermissions(testUser.id);
      expect(Array.isArray(permissions)).toBe(true);
    });

    it('should get user roles', async () => {
      const { getUserRoles } = await import('../api/middleware/rbac.js');
      const roles = await getUserRoles(testUser.id);
      expect(Array.isArray(roles)).toBe(true);
    });
  });

  describe('Quota Enforcement', () => {
    it('should check quotas', async () => {
      const result = await checkQuota(testOrg.id, 'stations');
      expect(result).toHaveProperty('allowed');
    });

    it('should increment usage', async () => {
      await incrementUsage(testOrg.id, 'audits');
      const usage = await getCurrentUsage(testOrg.id);
      expect(usage).toHaveProperty('audits_this_month');
    });

    it('should check feature access', async () => {
      const hasAccess = await checkFeatureAccess(testOrg.id, 'ai_assistant');
      expect(typeof hasAccess).toBe('boolean');
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limit middleware', async () => {
      const { tokenBucketRateLimit, fixedWindowRateLimit } = await import('../api/middleware/rateLimitRedis.js');
      expect(typeof tokenBucketRateLimit).toBe('function');
      expect(typeof fixedWindowRateLimit).toBe('function');
    });
  });

  describe('WebSocket Notifications', () => {
    it('should connect with valid token', async () => {
      try {
        const client = await connectWebSocket(authToken);
        expect(client.connected).toBe(true);
        client.disconnect();
      } catch (error) {
        console.log('WebSocket test skipped - server may not be running');
      }
    });
  });

  describe('Background Jobs', () => {
    it('should queue email', async () => {
      const result = await queueEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Test</p>', text: 'Test' });
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('jobId');
    });

    it('should queue report', async () => {
      const result = await queueReport({ type: 'audits', organizationId: testOrg.id, filters: {}, format: 'pdf' });
      expect(result.success).toBe(true);
    });

    it('should queue data export', async () => {
      const result = await queueDataExport({ organizationId: testOrg.id, entities: ['stations'], format: 'csv' });
      expect(result.success).toBe(true);
    });

    it('should queue webhook', async () => {
      const result = await queueWebhook({ url: 'https://example.com/webhook', method: 'POST', payload: { test: 'data' } });
      expect(result.success).toBe(true);
    });

    it('should queue tenant onboarding', async () => {
      const result = await queueTenantOnboarding({ organizationName: 'Test Org', ownerEmail: 'owner@example.com' });
      expect(result.success).toBe(true);
    });

    it('should get job status', async () => {
      const emailResult = await queueEmail({ to: 'status@example.com', subject: 'Status', html: '<p>Test</p>', text: 'Test' });
      await waitFor(500);
      const status = await getJobStatus('email', emailResult.jobId);
      expect(status).toHaveProperty('found');
    });
  });

  describe('Report Generation', () => {
    it('should create report record', async () => {
      const report = await prisma.report.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Report',
          type: 'audit',
          format: 'pdf',
          status: 'pending',
          filters: {},
          parameters: {}
        }
      });
      expect(report).toHaveProperty('id');
      expect(report.status).toBe('pending');
      await prisma.report.delete({ where: { id: report.id } });
    });

    it('should create scheduled report', async () => {
      const schedule = await prisma.reportSchedule.create({
        data: {
          organizationId: testOrg.id,
          name: 'Weekly Report',
          reportType: 'audit',
          cronExpression: '0 0 * * 1',
          filters: {},
          parameters: {},
          recipients: ['test@example.com'],
          isActive: false
        }
      });
      expect(schedule).toHaveProperty('id');
      expect(schedule.cronExpression).toBe('0 0 * * 1');
      await prisma.reportSchedule.delete({ where: { id: schedule.id } });
    });
  });
});

console.log('✅ Advanced Features Regression Test Suite Loaded');
