import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Stripe Integration Unit Tests', () => {
  describe('stripeService', () => {
    it('should export required functions', async () => {
      const stripeService = await import('../core/services/stripeService.js');
      expect(stripeService.createCheckoutSession).toBeDefined();
      expect(stripeService.createPortalSession).toBeDefined();
      expect(stripeService.handleCheckoutComplete).toBeDefined();
      expect(stripeService.handleSubscriptionUpdated).toBeDefined();
      expect(stripeService.handleSubscriptionDeleted).toBeDefined();
      expect(stripeService.handlePaymentFailed).toBeDefined();
      expect(stripeService.constructWebhookEvent).toBeDefined();
    });
  });

  describe('billing routes', () => {
    it('should exist and export router', async () => {
      const billingRoutes = await import('../api/routes/billing.js');
      expect(billingRoutes.default).toBeDefined();
    });
  });

  describe('webhook routes', () => {
    it('should exist and export router', async () => {
      const webhookRoutes = await import('../api/routes/webhooks.js');
      expect(webhookRoutes.default).toBeDefined();
    });
  });

  describe('emailService', () => {
    it('should export required functions', async () => {
      const emailService = await import('../core/services/emailService.js');
      expect(emailService.sendMagicLink).toBeDefined();
      expect(emailService.sendAlert).toBeDefined();
    });
  });

  describe('index.js configuration', () => {
    it('should import billing and webhook routes', () => {
      const indexPath = path.resolve(__dirname, '../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');

      expect(content).toContain('billingRoutes');
      expect(content).toContain('webhookRoutes');
      expect(content).toContain('/api/billing');
      expect(content).toContain('/api/webhooks');
    });
  });

  describe('.env.example configuration', () => {
    it('should include Stripe configuration', () => {
      const envPath = path.resolve(__dirname, '../../.env.example');
      const content = fs.readFileSync(envPath, 'utf8');

      expect(content).toContain('STRIPE_SECRET_KEY');
      expect(content).toContain('STRIPE_WEBHOOK_SECRET');
      expect(content).toContain('CLIENT_URL');
    });
  });

  describe('Prisma schema', () => {
    it('should include Stripe fields', () => {
      const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
      const content = fs.readFileSync(schemaPath, 'utf8');

      expect(content).toContain('stripeCustomerId');
      expect(content).toContain('stripeSubscriptionId');
      expect(content).toContain('subscriptionStatus');
    });
  });
});
