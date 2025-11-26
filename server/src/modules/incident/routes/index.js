import express from 'express';
import { incidentController } from '../controllers/incident.controller.js';
import { incidentValidator } from '../validators/incident.validator.js';
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { requirePermission } from '../../shared/middleware/rbac.js';
import { validateRequest, validateParams, validateQuery } from '../../shared/middleware/validation.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../../shared/middleware/caching.js';
import { requireQuota, trackUsage } from '../../shared/middleware/quota.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';

const router = express.Router();

router.use(prismaMiddleware);
router.use(authenticateToken);
router.use(tenantContext);

router.get(
  '/',
  requirePermission('incidents', 'read'),
  validateQuery(incidentValidator.list),
  tenantCacheMiddleware('incidents', { ttl: 300 }),
  incidentController.listIncidents
);

router.get(
  '/:id',
  requirePermission('incidents', 'read'),
  validateParams(incidentValidator.id),
  incidentController.getIncident
);

router.post(
  '/',
  requirePermission('incidents', 'write'),
  validateRequest(incidentValidator.create),
  requireQuota('incidents'),
  trackUsage('incidents'),
  invalidateTenantCacheMiddleware('incidents'),
  incidentController.createIncident
);

router.put(
  '/:id',
  requirePermission('incidents', 'write'),
  validateParams(incidentValidator.id),
  validateRequest(incidentValidator.update),
  invalidateTenantCacheMiddleware('incidents'),
  incidentController.updateIncident
);

router.delete(
  '/:id',
  requirePermission('incidents', 'delete'),
  validateParams(incidentValidator.id),
  invalidateTenantCacheMiddleware('incidents'),
  incidentController.deleteIncident
);

export default router;
