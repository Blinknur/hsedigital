import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { dbConnectionEstablished } from '../../jest.setup.js';
import prisma from '../shared/utils/db.js';
import {
  createCheckoutSession,
  handleCheckoutComplete,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed
} from '../core/services/stripeService.js';

describe('Stripe Integration', () => {
  let testOrgId;

  beforeAll(async () => {
    if (!dbConnectionEstablished) {
      console.log('⚠️  Skipping Stripe integration tests - database not available');
      return;
    }

    try {
      const testOrg = await prisma.organization.create({
        data: {
          name: 'Test Stripe Org',
          ownerId: 'test-owner-stripe-' + Date.now(),
          subscriptionPlan: 'free',
          subscriptionStatus: 'active'
        }
      });
      testOrgId = testOrg.id;
    } catch (error) {
      console.warn('⚠️  Failed to create test organization:', error.message);
    }
  });

  afterAll(async () => {
    if (testOrgId) {
      try {
        await prisma.organization.delete({ where: { id: testOrgId } });
      } catch (error) {
      }
    }
  });

  it('should handle checkout complete event', async () => {
    if (!dbConnectionEstablished || !testOrgId) {
      console.log('Skipping: Database not available');
      return;
    }

    const mockSession = {
      client_reference_id: testOrgId,
      customer: 'cus_test_123',
      subscription: 'sub_test_123',
      metadata: {
        organizationId: testOrgId,
        planId: 'professional'
      }
    };

    await handleCheckoutComplete(mockSession);

    const org = await prisma.organization.findUnique({ where: { id: testOrgId } });

    expect(org.stripeCustomerId).toBe('cus_test_123');
    expect(org.stripeSubscriptionId).toBe('sub_test_123');
    expect(org.subscriptionPlan).toBe('professional');
    expect(org.subscriptionStatus).toBe('active');
  });

  it('should handle subscription updated event', async () => {
    if (!dbConnectionEstablished || !testOrgId) {
      console.log('Skipping: Database not available');
      return;
    }

    const mockSubscription = {
      id: 'sub_test_123',
      status: 'past_due',
      metadata: {
        planId: 'professional'
      }
    };

    await handleSubscriptionUpdated(mockSubscription);

    const org = await prisma.organization.findUnique({ where: { id: testOrgId } });

    expect(org.subscriptionStatus).toBe('past_due');
  });

  it('should handle subscription deleted event', async () => {
    if (!dbConnectionEstablished || !testOrgId) {
      console.log('Skipping: Database not available');
      return;
    }

    const mockSubscription = {
      id: 'sub_test_123',
      status: 'canceled',
      metadata: {
        planId: 'professional'
      }
    };

    await handleSubscriptionDeleted(mockSubscription);

    const org = await prisma.organization.findUnique({ where: { id: testOrgId } });

    expect(org.subscriptionStatus).toBe('canceled');
    expect(org.subscriptionPlan).toBe('free');
    expect(org.stripeSubscriptionId).toBeNull();
  });

  it('should handle payment failed event', async () => {
    if (!dbConnectionEstablished || !testOrgId) {
      console.log('Skipping: Database not available');
      return;
    }

    await prisma.organization.update({
      where: { id: testOrgId },
      data: {
        stripeSubscriptionId: 'sub_test_123',
        subscriptionStatus: 'active'
      }
    });

    const mockInvoice = {
      subscription: 'sub_test_123'
    };

    await handlePaymentFailed(mockInvoice);

    const org = await prisma.organization.findUnique({ where: { id: testOrgId } });

    expect(org.subscriptionStatus).toBe('past_due');
  });
});
