import { createCheckoutSession as stripeCreateCheckoutSession, createPortalSession as stripeCreatePortalSession } from '../../../../services/tracedStripeService.js';

export const billingService = {
  async createCheckoutSession(planId, organizationId, email) {
    return await stripeCreateCheckoutSession(planId, organizationId, email);
  },

  async createPortalSession(organizationId) {
    return await stripeCreatePortalSession(organizationId);
  },
};
