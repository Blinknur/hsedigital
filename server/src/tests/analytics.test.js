import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mockPrisma = {
  audit: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  incident: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  station: {
    findMany: jest.fn(),
  },
  analyticsSnapshot: {
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
};

const dbPath = resolve(__dirname, '../shared/utils/db.js');
jest.unstable_mockModule(dbPath, () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  mget: jest.fn().mockResolvedValue([]),
  pipeline: jest.fn().mockReturnValue({
    setex: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  }),
  quit: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn(),
  on: jest.fn(),
};

const redisPath = resolve(__dirname, '../shared/utils/redis.js');
jest.unstable_mockModule(redisPath, () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

const { default: analyticsService } = await import('../core/services/analyticsService.js');

describe('Analytics Service', () => {
  let testOrgId;
  let testStationId;
  let testUserId;

  beforeAll(() => {
    testOrgId = 'test-org-id';
    testStationId = 'test-station-id';
    testUserId = 'test-user-id';
  });

  beforeEach(async () => {
    try {
      jest.clearAllMocks();
      
      if (mockPrisma.audit.findMany.mockClear) {
        mockPrisma.audit.findMany.mockClear();
      }
      if (mockPrisma.audit.count.mockClear) {
        mockPrisma.audit.count.mockClear();
      }
      if (mockPrisma.incident.findMany.mockClear) {
        mockPrisma.incident.findMany.mockClear();
      }
      if (mockPrisma.incident.count.mockClear) {
        mockPrisma.incident.count.mockClear();
      }
      if (mockPrisma.station.findMany.mockClear) {
        mockPrisma.station.findMany.mockClear();
      }
      if (mockPrisma.analyticsSnapshot.create.mockClear) {
        mockPrisma.analyticsSnapshot.create.mockClear();
      }
      
      if (mockRedis.get.mockClear) {
        mockRedis.get.mockClear();
      }
      if (mockRedis.set.mockClear) {
        mockRedis.set.mockClear();
      }
      if (mockRedis.setex.mockClear) {
        mockRedis.setex.mockClear();
      }
      if (mockRedis.del.mockClear) {
        mockRedis.del.mockClear();
      }
      if (mockRedis.keys.mockClear) {
        mockRedis.keys.mockClear();
      }
      
      mockPrisma.audit.findMany.mockReset();
      mockPrisma.audit.count.mockReset();
      mockPrisma.incident.findMany.mockReset();
      mockPrisma.incident.count.mockReset();
      mockPrisma.station.findMany.mockReset();
      mockPrisma.analyticsSnapshot.create.mockReset();
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);
      mockRedis.keys.mockResolvedValue([]);
    } catch (error) {
      console.error('Error in beforeEach cleanup:', error);
    }
  });

  afterEach(async () => {
    try {
      await Promise.resolve();
    } catch (error) {
      console.error('Error in afterEach:', error);
    }
  });

  afterAll(async () => {
    try {
      if (mockPrisma.$disconnect) {
        await mockPrisma.$disconnect();
      }
      if (mockRedis.quit) {
        await mockRedis.quit();
      }
      jest.restoreAllMocks();
    } catch (error) {
      console.error('Error in afterAll cleanup:', error);
    }
  });

  describe('calculateAuditCompletionRate', () => {
    it('should calculate completion rate correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.audit.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const rate = await analyticsService.calculateAuditCompletionRate(
        testOrgId,
        startDate,
        endDate
      );

      expect(rate).toBe(50);
      expect(mockPrisma.audit.count).toHaveBeenCalledTimes(2);
    });

    it('should return 0 for no audits', async () => {
      mockPrisma.audit.count.mockResolvedValue(0);

      const rate = await analyticsService.calculateAuditCompletionRate(
        'non-existent-org',
        new Date(),
        new Date()
      );

      expect(rate).toBe(0);
    });

    it('should return 100 for all completed audits', async () => {
      mockPrisma.audit.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);

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
      mockPrisma.incident.findMany.mockResolvedValue([]);

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
          organizationId: testOrgId,
          isActive: true,
          audits: [
            {
              id: '1',
              overallScore: 65,
              findings: [],
              completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            },
            {
              id: '2',
              overallScore: 63,
              findings: [],
              completedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            },
            {
              id: '3',
              overallScore: 61,
              findings: [],
              completedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            },
            {
              id: '4',
              overallScore: 59,
              findings: [],
              completedDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
            },
            {
              id: '5',
              overallScore: 57,
              findings: [],
              completedDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000)
            }
          ],
          incidents: [
            {
              incidentType: 'Equipment Failure',
              severity: 'High',
              reportedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              description: 'Pump malfunction'
            },
            {
              incidentType: 'Equipment Failure',
              severity: 'Medium',
              reportedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
              description: 'Tank leak'
            },
            {
              incidentType: 'Equipment Failure',
              severity: 'High',
              reportedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              description: 'Dispenser breakdown'
            }
          ]
        }
      ]);

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
          organizationId: testOrgId,
          region: 'North',
          brand: 'TestBrand',
          riskCategory: 'Low',
          isActive: true,
          audits: [
            {
              overallScore: 85
            }
          ],
          incidents: [
            {
              severity: 'Low'
            },
            {
              severity: 'Medium'
            }
          ]
        }
      ]);

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
      mockPrisma.incident.count.mockResolvedValue(3);
      mockPrisma.audit.findMany.mockResolvedValue([
        {
          completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          overallScore: 85
        }
      ]);

      const trends = await analyticsService.analyzeSafetyTrends(testOrgId, 6);

      expect(trends).toHaveProperty('trends');
      expect(trends).toHaveProperty('direction');
      expect(trends).toHaveProperty('changePercent');
      expect(Array.isArray(trends.trends)).toBe(true);
      expect(['improving', 'declining', 'stable']).toContain(trends.direction);
    });

    it('should handle fewer periods than requested', async () => {
      mockPrisma.incident.count.mockResolvedValue(0);
      mockPrisma.audit.findMany.mockResolvedValue([]);

      const trends = await analyticsService.analyzeSafetyTrends(testOrgId, 3);

      expect(trends.trends).toHaveLength(3);
    });
  });

  describe('generateKPIs', () => {
    it('should generate comprehensive KPIs', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.audit.count.mockResolvedValue(5);
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

      mockPrisma.incident.count.mockResolvedValue(5);
      
      mockPrisma.station.findMany.mockResolvedValue([
        {
          id: testStationId,
          name: 'Test Station',
          organizationId: testOrgId,
          region: 'North',
          brand: 'TestBrand',
          riskCategory: 'Low',
          isActive: true,
          audits: [
            {
              overallScore: 85
            }
          ],
          incidents: [
            {
              severity: 'Low'
            }
          ]
        }
      ]);

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
      mockPrisma.audit.count.mockResolvedValue(0);
      mockPrisma.audit.findMany.mockResolvedValue([]);
      mockPrisma.incident.findMany.mockResolvedValue([]);
      mockPrisma.incident.count.mockResolvedValue(0);
      mockPrisma.station.findMany.mockResolvedValue([]);

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
