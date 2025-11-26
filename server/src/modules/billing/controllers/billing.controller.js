import { billingService } from '../services/billing.service.js';

export const billingController = {
  async createCheckoutSession(req, res, next) {
    try {
      const { planId } = req.body;
      const user = req.user;

      if (!user || !user.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!planId) {
        return res.status(400).json({ error: 'Plan ID required' });
      }

      const session = await billingService.createCheckoutSession(planId, user.organizationId, user.email);
      res.json(session);
    } catch (error) {
      next(error);
    }
  },

  async createPortalSession(req, res, next) {
    try {
      const user = req.user;

      if (!user || !user.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = await billingService.createPortalSession(user.organizationId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  },
};
