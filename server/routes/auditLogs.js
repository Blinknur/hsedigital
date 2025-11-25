import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, tenantContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get(
  '/',
  authenticateToken,
  tenantContext,
  requirePermission('audit_logs', 'read'),
  async (req, res) => {
    try {
      const {
        userId,
        action,
        entityType,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const where = {
        organizationId: req.tenantId
      };

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
      }

      if (entityType) {
        where.entityType = entityType;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            organizationId: true,
            userId: true,
            action: true,
            entityType: true,
            entityId: true,
            changes: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true
          }
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

router.get(
  '/stats',
  authenticateToken,
  tenantContext,
  requirePermission('audit_logs', 'read'),
  async (req, res) => {
    try {
      const where = {
        organizationId: req.tenantId
      };

      const { startDate, endDate } = req.query;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [
        totalLogs,
        actionCounts,
        entityTypeCounts,
        topUsers
      ] = await Promise.all([
        prisma.auditLog.count({ where }),
        
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        
        prisma.auditLog.groupBy({
          by: ['entityType'],
          where,
          _count: { entityType: true }
        }),
        
        prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10
        })
      ]);

      res.json({
        totalLogs,
        actionCounts: actionCounts.map(a => ({ action: a.action, count: a._count.action })),
        entityTypeCounts: entityTypeCounts.map(e => ({ entityType: e.entityType, count: e._count.entityType })),
        topUsers: topUsers.map(u => ({ userId: u.userId, count: u._count.userId }))
      });
    } catch (error) {
      console.error('Error fetching audit log stats:', error);
      res.status(500).json({ error: 'Failed to fetch audit log stats' });
    }
  }
);

export default router;
