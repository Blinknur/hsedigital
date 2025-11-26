import { auditService } from '../services/audit.service.js';
import { notificationService } from '../../shared/utils/notification.js';

export const auditController = {
  async listAudits(req, res, next) {
    try {
      const response = await auditService.listAudits(req.prisma, req.tenantId, req.query);
      res.json({ audits: response.data, pagination: response.pagination });
    } catch (error) {
      next(error);
    }
  },

  async getAudit(req, res, next) {
    try {
      const audit = await auditService.getAuditById(req.prisma, req.tenantId, req.params.id);
      res.json(audit);
    } catch (error) {
      next(error);
    }
  },

  async createAudit(req, res, next) {
    try {
      const audit = await auditService.createAudit(req.prisma, req.tenantId, req.body);
      notificationService.auditCreated(req.tenantId, audit);
      res.status(201).json(audit);
    } catch (error) {
      next(error);
    }
  },

  async updateAudit(req, res, next) {
    try {
      const { audit, previousAudit } = await auditService.updateAudit(
        req.prisma,
        req.tenantId,
        req.params.id,
        req.body
      );

      if (req.body.status && previousAudit.status !== req.body.status) {
        notificationService.auditStatusChanged(
          req.tenantId,
          audit,
          previousAudit.status,
          req.body.status
        );
      } else {
        notificationService.auditUpdated(req.tenantId, audit, req.body);
      }

      res.json(audit);
    } catch (error) {
      next(error);
    }
  },

  async deleteAudit(req, res, next) {
    try {
      const result = await auditService.deleteAudit(req.prisma, req.tenantId, req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
