import express from 'express';
import prisma from '../../shared/utils/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../middleware/caching.js';
import { getTenantById, getTenantWithUsers, invalidateTenantCache } from '../../core/services/tenantService.js';

const router = express.Router();

router.get(
  '/:id',
  authenticateToken,
  requirePermission('organizations', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await getTenantById(id);

      if (!tenant) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(tenant);
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  }
);

router.get(
  '/:id/users',
  authenticateToken,
  requirePermission('organizations', 'read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await getTenantWithUsers(id);

      if (!tenant) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json(tenant);
    } catch (error) {
      console.error('Error fetching organization users:', error);
      res.status(500).json({ error: 'Failed to fetch organization users' });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requirePermission('organizations', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, subscriptionPlan } = req.body;

      const updated = await prisma.organization.update({
        where: { id },
        data: { name, subscriptionPlan }
      });

      await invalidateTenantCache(id);

      res.json(updated);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

export default router;
