import { incidentService } from '../services/incident.service.js';
import { notificationService } from '../../shared/utils/notification.js';

export const incidentController = {
  async listIncidents(req, res, next) {
    try {
      const response = await incidentService.listIncidents(req.prisma, req.tenantId, req.user.id, req.query);
      res.json({ incidents: response.data, pagination: response.pagination });
    } catch (error) {
      next(error);
    }
  },

  async getIncident(req, res, next) {
    try {
      const incident = await incidentService.getIncidentById(req.prisma, req.tenantId, req.params.id);
      res.json(incident);
    } catch (error) {
      next(error);
    }
  },

  async createIncident(req, res, next) {
    try {
      const incident = await incidentService.createIncident(req.prisma, req.tenantId, req.user.id, req.body);
      notificationService.incidentCreated(req.tenantId, incident);
      res.status(201).json(incident);
    } catch (error) {
      next(error);
    }
  },

  async updateIncident(req, res, next) {
    try {
      const { incident, previousIncident } = await incidentService.updateIncident(
        req.prisma,
        req.tenantId,
        req.params.id,
        req.body
      );

      if (req.body.status && previousIncident.status !== req.body.status) {
        notificationService.incidentStatusChanged(
          req.tenantId,
          incident,
          previousIncident.status,
          req.body.status
        );
      } else {
        notificationService.incidentUpdated(req.tenantId, incident, req.body);
      }

      res.json(incident);
    } catch (error) {
      next(error);
    }
  },

  async deleteIncident(req, res, next) {
    try {
      const result = await incidentService.deleteIncident(req.prisma, req.tenantId, req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
