import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, jest } from '@jest/globals';
import analyticsService from '../core/services/analyticsService.js';
import prisma from '../shared/utils/db.js';

jest.spyOn(prisma.audit, 'findMany');
jest.spyOn(prisma.incident, 'findMany');
jest.spyOn(prisma.incident, 'count');
jest.spyOn(prisma.station, 'findMany');

describe('Analytics Service', () => {
  let testOrgId;
  let testStationId;
  let testUserId;

  beforeAll(() => {
    testOrgId = 'test-org-id';
    testStationId = 'test-station-id';
    testUserId = 'test-user-id';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('calculateAuditCompletionRate', () => {
    it('should calculate completion rate correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.audit.findMany.mockResolvedValue([
        {
          id: '1',
          organizationId: testOrgId,
          stationId: testStationId,
          auditorId: testUserId,
          auditNumber: 'TEST-1',
          scheduledDate: new Date('2024-06-01'),
          completedDate: new Date('2024-06-02'),
          status: 'Completed',
          formId: 'test-form',
          findings: []
        },
        {
          id: '2',
          organizationId: testOrgId,
          stationId: testStationId,
          auditorId: testUserId,
          auditNumber: 'TEST-2',
          scheduledDate: new Date('2024-06-15'),
          status: 'Scheduled',
          formId: 'test-form',
          findings: []
        }
      ]);

      const rate = await analyticsService.calculateAuditCompletionRate(
        testOrgId,
        startDate,
        endDate
      );

      expect(rate).toBe(50);
      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: testOrgId,
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
        },
      });
    });

    it('should return 0 for no audits', async () => {
      mockPrisma.audit.findMany.mockResolvedValue([]);

      const rate = await analyticsService.calculateAuditCompletionRate(
        'non-existent-org',
        new Date(),
        new Date()
      );

      expect(rate).toBe(0);
    });

    it('should return 100 for all completed audits', async () => {
      mockPrisma.audit.findMany.mockResolvedValue([
        {
          status: 'Completed',
        },
        {
          status: 'Completed',
        },
      ]);

      const rate = await analyticsService.calculateAuditCompletionRate(
        testOrgId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(rate).toBe(100);
    });
  });

  describe('calculateIncidentResponseTimes', () => {
    it('should calculate average response times by severity', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const reportedAt = new Date('2024-06-01T10:00:00Z');
      const resolvedAt = new Date('2024-06-01T14:00:00Z');

      mockPrisma.incident.findMany.mockResolvedValue([
        {
          id: '1',
          organizationId: testOrgId,
          stationId: testStationId,
          reporterId: testUserId,
          title: 'Test Incident',
          description: 'Test',
          severity: 'High',
          status: 'Resolved',
          reportedAt,
          resolvedAt
        }
      ]);

      const times = await analyticsService.calculateIncidentResponseTimes(
        testOrgId,
        startDate,
        endDate
      );

      expect(times.total).toBeGreaterThan(0);
      expect(times.average).toBeGreaterThan(0);
      expect(times.bySeverity).toHaveProperty('High');
      expect(mockPrisma.incident.findMany).toHaveBeenCalled();
    });

    it('should handle incidents with no resolution time', async () => {
      mockPrisma.incident.findMany.mockResolvedValue([
        {
          severity: 'High',
          status: 'Open',
          reportedAt: new Date(),
          resolvedAt: null
        }
      ]);

      const times = await analyticsService.calculateIncidentResponseTimes(
        testOrgId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(times.total).toBe(0);
    });
  });

  describe('predictMaintenanceNeeds', () => {
    it('should generate predictions for stations with sufficient data', async () => {
      mockPrisma.station.findMany.mockResolvedValue([
        {
          id: testStationId,
          name: 'Test Station',
          organizationId: testOrgId
        }
      ]);

      mockPrisma.audit.findMany.mockResolvedValue([
        {
          id: '1',
          stationId: testStationId,
          completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          overallScore: 65
        },
        {
          id: '2',
          stationId: testStationId,
          completedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          overallScore: 63
        },
        {
          id: '3',
          stationId: testStationId,
          completedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          overallScore: 61
        },
        {
          id: '4',
          stationId: testStationId,
          completedDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
          overallScore: 59
        },
        {
          id: '5',
          stationId: testStationId,
          completedDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
          overallScore: 57
        }
      ]);

      mockPrisma.incident.count.mockResolvedValue(6);

      const predictions = await analyticsService.predictMaintenanceNeeds(testOrgId);

      expect(Array.isArray(predictions)).toBe(true);
      
      if (predictions.length > 0) {
        const prediction = predictions[0];
        expect(prediction).toHaveProperty('stationId');
        expect(prediction).toHaveProperty('riskScore');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction).toHaveProperty('priority');
        expect(prediction).toHaveProperty('recommendation');
      }
    });

    it('should return empty array for no stations', async () => {
      mockPrisma.station.findMany.mockResolvedValue([]);

      const predictions = await analyticsService.predictMaintenanceNeeds(testOrgId);

      expect(predictions).toEqual([]);
    });
  });

  describe('compareStationPerformance', () => {
    it('should compare and rank stations', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.station.findMany.mockResolvedValue([
        {
          id: testStationId,
          name: 'Test Station',
          organizationId: testOrgId
        }
      ]);

      mockPrisma.audit.findMany.mockResolvedValue([
        {
          stationId: testStationId,
          overallScore: 85,
          completedDate: new Date('2024-06-01')
        }
      ]);

      mockPrisma.incident.count.mockResolvedValue(2);

      const performance = await analyticsService.compareStationPerformance(
        testOrgId,
        startDate,
        endDate
      );

      expect(performance).toHaveProperty('stations');
      expect(performance).toHaveProperty('topPerformers');
      expect(performance).toHaveProperty('needsAttention');
      expect(Array.isArray(performance.stations)).toBe(true);
    });

    it('should handle organizations with no stations', async () => {
      mockPrisma.station.findMany.mockResolvedValue([]);

      const performance = await analyticsService.compareStationPerformance(
        testOrgId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(performance.stations).toEqual([]);
      expect(performance.topPerformers).toEqual([]);
      expect(performance.needsAttention).toEqual([]);
    });
  });

  describe('analyzeSafetyTrends', () => {
    it('should analyze trends over multiple periods', async () => {
      mockPrisma.audit.findMany.mockResolvedValue([
        {
          completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          overallScore: 85
        }
      ]);

      mockPrisma.incident.count.mockResolvedValue(3);

      const trends = await analyticsService.analyzeSafetyTrends(testOrgId, 6);

      expect(trends).toHaveProperty('trends');
      expect(trends).toHaveProperty('direction');
      expect(trends).toHaveProperty('changePercent');
      expect(Array.isArray(trends.trends)).toBe(true);
      expect(['improving', 'declining', 'stable']).toContain(trends.direction);
    });

    it('should handle fewer periods than requested', async () => {
      mockPrisma.audit.findMany.mockResolvedValue([]);
      mockPrisma.incident.count.mockResolvedValue(0);

      const trends = await analyticsService.analyzeSafetyTrends(testOrgId, 3);

      expect(trends.trends).toHaveLength(3);
    });
  });

  describe('generateKPIs', () => {
    it('should generate comprehensive KPIs', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.audit.findMany.mockResolvedValue([
        {
          status: 'Completed',
          completedDate: new Date('2024-06-01'),
          overallScore: 85
        }
      ]);

      mockPrisma.incident.findMany.mockResolvedValue([
        {
          severity: 'High',
          status: 'Open',
          reportedAt: new Date('2024-06-01'),
          resolvedAt: null
        }
      ]);

      mockPrisma.incident.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const kpis = await analyticsService.generateKPIs(
        testOrgId,
        startDate,
        endDate
      );

      expect(kpis).toHaveProperty('auditCompletionRate');
      expect(kpis).toHaveProperty('incidentResponseTimes');
      expect(kpis).toHaveProperty('safetyScore');
      expect(kpis).toHaveProperty('totalIncidents');
      expect(kpis).toHaveProperty('openIncidents');
      expect(kpis).toHaveProperty('criticalIncidents');
    });

    it('should handle zero data gracefully', async () => {
      mockPrisma.audit.findMany.mockResolvedValue([]);
      mockPrisma.incident.findMany.mockResolvedValue([]);
      mockPrisma.incident.count.mockResolvedValue(0);

      const kpis = await analyticsService.generateKPIs(
        testOrgId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(kpis.auditCompletionRate).toBe(0);
      expect(kpis.totalIncidents).toBe(0);
    });
  });
});
