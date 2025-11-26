import express from 'express';
import prisma from '../../shared/utils/db.js';
import { authenticateToken, tenantContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { buildCursorPagination, formatCursorResponse } from '../../shared/utils/pagination.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../middleware/caching.js';
import { requireQuota, trackUsage } from '../middleware/quota.js';
import { validateRequest, validateParams, incidentSchema, idParamSchema } from '../middleware/validation.js';
import { notificationService } from '../../core/services/notificationService.js';

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  tenantContext,
  requirePermission('incidents', 'read'),
  tenantCacheMiddleware('incidents', { ttl: 300 }),
  async (req, res) => {
    try {
      const { stationId, severity, status, cursor, limit = 50 } = req.query;

      const where = { organizationId: req.tenantId };
      
      if (stationId) where.stationId = stationId;
      if (severity) where.severity = severity;
      if (status) where.status = status;

      const paginationOptions = buildCursorPagination({
        cursor,
        limit,
        orderBy: { reportedAt: 'desc' },
        cursorField: 'id'
      });

      const incidents = await prisma.incident.findMany({
        where,
        ...paginationOptions,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const response = formatCursorResponse(incidents, limit, 'id');
      res.json({ incidents: response.data, pagination: response.pagination });
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ error: 'Failed to fetch incidents' });
    }
  }
);

router.get(
  '/:id',
  authenticateToken,
  tenantContext,
  requirePermission('incidents', 'read'),
  validateParams(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const incident = await prisma.incident.findFirst({
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
              address: true
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      res.json(incident);
    } catch (error) {
      console.error('Error fetching incident:', error);
      res.status(500).json({ error: 'Failed to fetch incident' });
    }
  }
);

router.post(
  '/',
  authenticateToken,
  tenantContext,
  requirePermission('incidents', 'write'),
  validateRequest(incidentSchema),
  requireQuota('incidents'),
  trackUsage('incidents'),
  invalidateTenantCacheMiddleware('incidents'),
  async (req, res) => {
    try {
      const incident = await prisma.incident.create({
        data: {
          organizationId: req.tenantId,
          reporterId: req.user.id,
          ...req.validatedData
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      notificationService.incidentCreated(req.tenantId, incident);
      
      res.status(201).json(incident);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ error: 'Failed to create incident' });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  tenantContext,
  requirePermission('incidents', 'write'),
  validateParams(idParamSchema),
  validateRequest(incidentSchema.partial()),
  invalidateTenantCacheMiddleware('incidents'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingIncident = await prisma.incident.findFirst({
        where: { id, organizationId: req.tenantId }
      });

      if (!existingIncident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      const updated = await prisma.incident.updateMany({
        where: {
          id,
          organizationId: req.tenantId
        },
        data: req.validatedData
      });

      const incident = await prisma.incident.findFirst({
        where: { id, organizationId: req.tenantId },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              region: true
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (req.validatedData.status && existingIncident.status !== req.validatedData.status) {
        notificationService.incidentStatusChanged(
          req.tenantId, 
          incident, 
          existingIncident.status, 
          req.validatedData.status
        );
      } else {
        notificationService.incidentUpdated(req.tenantId, incident, req.validatedData);
      }

      res.json(incident);
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ error: 'Failed to update incident' });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  tenantContext,
  requirePermission('incidents', 'delete'),
  validateParams(idParamSchema),
  invalidateTenantCacheMiddleware('incidents'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await prisma.incident.deleteMany({
        where: {
          id,
          organizationId: req.tenantId
        }
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
      console.error('Error deleting incident:', error);
      res.status(500).json({ error: 'Failed to delete incident' });
    }
  }
);

export default router;
