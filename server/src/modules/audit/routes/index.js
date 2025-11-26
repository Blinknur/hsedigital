import express from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { auditValidator } from '../validators/audit.validator.js';
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { requirePermission } from '../../shared/middleware/rbac.js';
import { validateRequest, validateParams, validateQuery } from '../../shared/middleware/validation.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../../shared/middleware/caching.js';
import { requireQuota, trackUsage } from '../../shared/middleware/quota.js';
import { auditLog, captureOriginalEntity } from '../../shared/middleware/auditLog.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';

const router = express.Router();

router.use(prismaMiddleware);
router.use(authenticateToken);
router.use(tenantContext);

router.get(
  '/',
  requirePermission('audits', 'read'),
  validateQuery(auditValidator.list),
  tenantCacheMiddleware('audits', { ttl: 300 }),
  auditController.listAudits
);

router.get(
  '/:id',
  requirePermission('audits', 'read'),
  validateParams(auditValidator.id),
  auditController.getAudit
);

router.post(
  '/',
  requirePermission('audits', 'write'),
  validateRequest(auditValidator.create),
  auditLog('audit'),
  requireQuota('audits'),
  trackUsage('audits'),
  invalidateTenantCacheMiddleware('audits'),
  auditController.createAudit
);

router.put(
  '/:id',
  requirePermission('audits', 'write'),
  validateParams(auditValidator.id),
  validateRequest(auditValidator.update),
  captureOriginalEntity('audit'),
  auditLog('audit'),
  invalidateTenantCacheMiddleware('audits'),
  auditController.updateAudit
);

router.delete(
  '/:id',
  requirePermission('audits', 'delete'),
  validateParams(auditValidator.id),
  invalidateTenantCacheMiddleware('audits'),
  auditController.deleteAudit
);

export default router;
