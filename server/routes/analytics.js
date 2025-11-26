import express from 'express';
import prisma from '../utils/db.js';
import { authenticateToken, tenantContext } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import analyticsService from '../services/analyticsService.js';

const router = express.Router();

router.get(
  '/kpis',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const { startDate, endDate, period = '30d' } = req.query;
      
      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        start = new Date();
        if (period === '7d') start.setDate(end.getDate() - 7);
        else if (period === '30d') start.setDate(end.getDate() - 30);
        else if (period === '90d') start.setDate(end.getDate() - 90);
        else if (period === '1y') start.setFullYear(end.getFullYear() - 1);
      }

      const kpis = await analyticsService.generateKPIs(req.tenantId, start, end);

      res.json({
        period: { start, end },
        kpis
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      res.status(500).json({ error: 'Failed to fetch KPIs' });
    }
  }
);

router.get(
  '/safety-trends',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const { periods = 12 } = req.query;
      
      const trends = await analyticsService.analyzeSafetyTrends(
        req.tenantId,
        parseInt(periods)
      );

      res.json(trends);
    } catch (error) {
      console.error('Error fetching safety trends:', error);
      res.status(500).json({ error: 'Failed to fetch safety trends' });
    }
  }
);

router.get(
  '/station-performance',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const { startDate, endDate, period = '30d' } = req.query;
      
      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        start = new Date();
        if (period === '7d') start.setDate(end.getDate() - 7);
        else if (period === '30d') start.setDate(end.getDate() - 30);
        else if (period === '90d') start.setDate(end.getDate() - 90);
      }

      const performance = await analyticsService.compareStationPerformance(
        req.tenantId,
        start,
        end
      );

      res.json({
        period: { start, end },
        ...performance
      });
    } catch (error) {
      console.error('Error fetching station performance:', error);
      res.status(500).json({ error: 'Failed to fetch station performance' });
    }
  }
);

router.get(
  '/predictive-maintenance',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const predictions = await analyticsService.predictMaintenanceNeeds(req.tenantId);

      for (const prediction of predictions) {
        const existingAlert = await prisma.maintenanceAlert.findFirst({
          where: {
            organizationId: req.tenantId,
            stationId: prediction.stationId,
            isResolved: false
          }
        });

        if (!existingAlert && prediction.priority !== 'Low') {
          await prisma.maintenanceAlert.create({
            data: {
              organizationId: req.tenantId,
              stationId: prediction.stationId,
              alertType: 'predictive_maintenance',
              priority: prediction.priority,
              message: prediction.recommendation,
              predictedDate: prediction.predictedDate,
              confidence: prediction.confidence,
              metadata: {
                riskScore: prediction.riskScore,
                predictedIssues: prediction.predictedIssues
              }
            }
          });
        }
      }

      res.json({ predictions });
    } catch (error) {
      console.error('Error fetching predictive maintenance:', error);
      res.status(500).json({ error: 'Failed to fetch predictive maintenance' });
    }
  }
);

router.get(
  '/dashboard-data',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      
      const end = new Date();
      const start = new Date();
      if (period === '7d') start.setDate(end.getDate() - 7);
      else if (period === '30d') start.setDate(end.getDate() - 30);
      else if (period === '90d') start.setDate(end.getDate() - 90);
      else if (period === '1y') start.setFullYear(end.getFullYear() - 1);

      const [kpis, safetyTrends, stationPerformance, predictions] = await Promise.all([
        analyticsService.generateKPIs(req.tenantId, start, end),
        analyticsService.analyzeSafetyTrends(req.tenantId, 6),
        analyticsService.compareStationPerformance(req.tenantId, start, end),
        analyticsService.predictMaintenanceNeeds(req.tenantId)
      ]);

      const response = {
        period: { start, end },
        kpis,
        safetyTrends,
        stationPerformance: {
          topPerformers: stationPerformance.topPerformers,
          needsAttention: stationPerformance.needsAttention,
          totalStations: stationPerformance.stations.length
        },
        predictiveMaintenance: {
          alerts: predictions.filter(p => p.priority === 'Critical' || p.priority === 'High').slice(0, 5),
          totalAlerts: predictions.length
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
);

router.get(
  '/widgets',
  authenticateToken,
  tenantContext,
  async (req, res) => {
    try {
      const widgets = await prisma.dashboardWidget.findMany({
        where: {
          organizationId: req.tenantId,
          userId: req.user.id
        },
        orderBy: [
          { position: 'asc' }
        ]
      });

      res.json({ widgets });
    } catch (error) {
      console.error('Error fetching widgets:', error);
      res.status(500).json({ error: 'Failed to fetch widgets' });
    }
  }
);

router.post(
  '/widgets',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'write'),
  async (req, res) => {
    try {
      const { widgetType, title, config, position } = req.body;

      const widget = await prisma.dashboardWidget.create({
        data: {
          organizationId: req.tenantId,
          userId: req.user.id,
          widgetType,
          title,
          config: config || {},
          position: position || { x: 0, y: 0, w: 4, h: 3 }
        }
      });

      res.status(201).json(widget);
    } catch (error) {
      console.error('Error creating widget:', error);
      res.status(500).json({ error: 'Failed to create widget' });
    }
  }
);

router.put(
  '/widgets/:id',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, config, position, isVisible } = req.body;

      const updated = await prisma.dashboardWidget.updateMany({
        where: {
          id,
          organizationId: req.tenantId,
          userId: req.user.id
        },
        data: {
          ...(title !== undefined && { title }),
          ...(config !== undefined && { config }),
          ...(position !== undefined && { position }),
          ...(isVisible !== undefined && { isVisible })
        }
      });

      if (updated.count === 0) {
        return res.status(404).json({ error: 'Widget not found' });
      }

      const widget = await prisma.dashboardWidget.findFirst({
        where: { id, organizationId: req.tenantId, userId: req.user.id }
      });

      res.json(widget);
    } catch (error) {
      console.error('Error updating widget:', error);
      res.status(500).json({ error: 'Failed to update widget' });
    }
  }
);

router.delete(
  '/widgets/:id',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'write'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await prisma.dashboardWidget.deleteMany({
        where: {
          id,
          organizationId: req.tenantId,
          userId: req.user.id
        }
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: 'Widget not found' });
      }

      res.json({ message: 'Widget deleted successfully' });
    } catch (error) {
      console.error('Error deleting widget:', error);
      res.status(500).json({ error: 'Failed to delete widget' });
    }
  }
);

router.get(
  '/export',
  authenticateToken,
  tenantContext,
  requirePermission('analytics', 'read'),
  async (req, res) => {
    try {
      const { format = 'json', period = '30d' } = req.query;
      
      const end = new Date();
      const start = new Date();
      if (period === '7d') start.setDate(end.getDate() - 7);
      else if (period === '30d') start.setDate(end.getDate() - 30);
      else if (period === '90d') start.setDate(end.getDate() - 90);
      else if (period === '1y') start.setFullYear(end.getFullYear() - 1);

      const [kpis, safetyTrends, stationPerformance, predictions] = await Promise.all([
        analyticsService.generateKPIs(req.tenantId, start, end),
        analyticsService.analyzeSafetyTrends(req.tenantId, 12),
        analyticsService.compareStationPerformance(req.tenantId, start, end),
        analyticsService.predictMaintenanceNeeds(req.tenantId)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        organization: req.tenantId,
        period: { start, end },
        kpis,
        safetyTrends,
        stationPerformance: stationPerformance.stations,
        predictiveMaintenance: predictions
      };

      if (format === 'csv') {
        const headers = ['Station', 'Region', 'Performance Score', 'Audit Score', 'Incidents', 'Risk Category'];
        const rows = stationPerformance.stations.map(s => [
          s.name,
          s.region,
          s.performanceScore,
          s.avgAuditScore.toFixed(2),
          s.incidentCount,
          s.riskCategory
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.csv"`);
        return res.send(csv);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics' });
    }
  }
);

export default router;
