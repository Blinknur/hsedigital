import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, tenantContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { buildCursorPagination, formatCursorResponse } from '../utils/pagination.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../middleware/caching.js';
import { requireQuota, trackUsage } from '../middleware/quota.js';
import { validateRequest, validateParams, auditSchema, idParamSchema } from '../middleware/validation.js';
import { auditLog, captureOriginalEntity } from '../middleware/auditLog.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'read'),
  tenantCacheMiddleware('audits', { ttl: 300 }),
  async (req, res) => {
    try {
      const { stationId, auditorId, status, cursor, limit = 50 } = req.query;

      const where = { organizationId: req.tenantId };
      
      if (stationId) where.stationId = stationId;
      if (auditorId) where.auditorId = auditorId;
      if (status) where.status = status;

      const paginationOptions = buildCursorPagination({
        cursor,
        limit,
        orderBy: { scheduledDate: 'desc' },
        cursorField: 'id'
      });

      const audits = await prisma.audit.findMany({
        where,
        ...paginationOptions,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true,
              brand: true
            }
          },
          auditor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const response = formatCursorResponse(audits, limit, 'id');
      res.json({ audits: response.data, pagination: response.pagination });
    } catch (error) {
      console.error('Error fetching audits:', error);
      res.status(500).json({ error: 'Failed to fetch audits' });
    }
  }
);

router.get(
  '/:id',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'read'),
  validateParams(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const audit = await prisma.audit.findFirst({
        where: {
          id,
          organizationId: req.tenantId
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true,
              brand: true,
              address: true
            }
          },
          auditor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!audit) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      res.json(audit);
    } catch (error) {
      console.error('Error fetching audit:', error);
      res.status(500).json({ error: 'Failed to fetch audit' });
    }
  }
);

router.post(
  '/',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'write'),
  validateRequest(auditSchema),
  auditLog('audit'),
  requireQuota('audits'),
  trackUsage('audits'),
  invalidateTenantCacheMiddleware('audits'),
  async (req, res) => {
    try {
      const audit = await prisma.audit.create({
        data: {
          organizationId: req.tenantId,
          ...req.validatedData,
          scheduledDate: new Date(req.validatedData.scheduledDate),
          completedDate: req.validatedData.completedDate ? new Date(req.validatedData.completedDate) : null,
          auditNumber: `AUD-${Date.now()}`
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true,
              brand: true
            }
          },
          auditor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      res.status(201).json(audit);
    } catch (error) {
      console.error('Error creating audit:', error);
      res.status(500).json({ error: 'Failed to create audit' });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'write'),
  validateParams(idParamSchema),
  validateRequest(auditSchema.partial()),
  captureOriginalEntity('audit'),
  auditLog('audit'),
  invalidateTenantCacheMiddleware('audits'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.validatedData };
      
      if (updateData.scheduledDate) updateData.scheduledDate = new Date(updateData.scheduledDate);
      if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);
      
      const updated = await prisma.audit.updateMany({
        where: {
          id,
          organizationId: req.tenantId
        },
        data: updateData
      });

      if (updated.count === 0) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      const audit = await prisma.audit.findFirst({
        where: { id, organizationId: req.tenantId },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true,
              brand: true
            }
          },
          auditor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.json(audit);
    } catch (error) {
      console.error('Error updating audit:', error);
      res.status(500).json({ error: 'Failed to update audit' });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  tenantContext,
  requirePermission('audits', 'delete'),
  validateParams(idParamSchema),
  invalidateTenantCacheMiddleware('audits'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await prisma.audit.deleteMany({
        where: {
          id,
          organizationId: req.tenantId
        }
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: 'Audit not found' });
      }

      res.json({ message: 'Audit deleted successfully' });
    } catch (error) {
      console.error('Error deleting audit:', error);
      res.status(500).json({ error: 'Failed to delete audit' });
    }
  }
);

export default router;
