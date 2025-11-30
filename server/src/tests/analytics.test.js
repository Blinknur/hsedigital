import { describe, it, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import analyticsService from '../core/services/analyticsService.js';
import prisma from '../shared/utils/db.js';
import { cacheManager } from '../shared/utils/cache.js';

describe('Analytics Service', () => {
  let testOrgId;
  let testStationId;
  let testUserId;

  beforeEach(async () => {
    try {
      const testOrg = await prisma.organization.create({
        data: {
          name: 'Test Analytics Org',
          slug: `test-analytics-${Date.now()}`,
          ownerId: 'test-owner'
        }
      });
      testOrgId = testOrg.id;

      const testUser = await prisma.user.create({
        data: {
          email: `analytics-test-${Date.now()}@example.com`,
          name: 'Test Auditor',
          password: 'hashed',
          organizationId: testOrgId
        }
      });
      testUserId = testUser.id;

      const testStation = await prisma.station.create({
        data: {
          name: 'Test Station',
          brand: 'Test Brand',
          region: 'Test Region',
          address: '123 Test St',
          location: { lat: 0, lng: 0 },
          organizationId: testOrgId
        }
      });
      testStationId = testStation.id;
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterEach(async () => {
    try {
      await cacheManager.invalidatePattern('cache:*');
      
      if (testOrgId) {
        await prisma.incident.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.audit.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.station.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
      }
      
      testOrgId = null;
      testStationId = null;
      testUserId = null;
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  afterAll(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });

  describe('calculateAuditCompletionRate', () => {
    it('should calculate completion rate correctly', async () => {
      try {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        await prisma.audit.createMany({
          data: [
            {
              organizationId: testOrgId,
              stationId: testStationId,
              auditorId: testUserId,
              auditNumber: `TEST-${Date.now()}-1`,
              scheduledDate: new Date('2024-06-01'),
              completedDate: new Date('2024-06-02'),
              status: 'Completed',
              formId: 'test-form',
              findings: []
            },
            {
              organizationId: testOrgId,
              stationId: testStationId,
              auditorId: testUserId,
              auditNumber: `TEST-${Date.now()}-2`,
              scheduledDate: new Date('2024-06-15'),
              status: 'Scheduled',
              formId: 'test-form',
              findings: []
            }
          ]
        });

        const rate = await analyticsService.calculateAuditCompletionRate(
          testOrgId,
          startDate,
          endDate
        );

        expect(rate).toBe(50);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });

    it('should return 0 for no audits', async () => {
      try {
        const rate = await analyticsService.calculateAuditCompletionRate(
          'non-existent-org',
          new Date(),
          new Date()
        );

        expect(rate).toBe(0);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('calculateIncidentResponseTimes', () => {
    it('should calculate average response times by severity', async () => {
      try {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const reportedAt = new Date('2024-06-01T10:00:00Z');
        const resolvedAt = new Date('2024-06-01T14:00:00Z');

        await prisma.incident.create({
          data: {
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
        });

        const times = await analyticsService.calculateIncidentResponseTimes(
          testOrgId,
          startDate,
          endDate
        );

        expect(times.total).toBeGreaterThan(0);
        expect(times.average).toBeGreaterThan(0);
        expect(times.bySeverity).toHaveProperty('High');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('predictMaintenanceNeeds', () => {
    it('should generate predictions for stations with sufficient data', async () => {
      try {
        for (let i = 0; i < 5; i++) {
          await prisma.audit.create({
            data: {
              organizationId: testOrgId,
              stationId: testStationId,
              auditorId: testUserId,
              auditNumber: `PRED-${Date.now()}-${i}`,
              scheduledDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
              completedDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
              status: 'Completed',
              formId: 'test-form',
              findings: [],
              overallScore: 65 - i * 2
            }
          });
        }

        await prisma.incident.createMany({
          data: Array.from({ length: 6 }, (_, i) => ({
            organizationId: testOrgId,
            stationId: testStationId,
            reporterId: testUserId,
            title: 'Equipment Issue',
            description: 'Pump malfunction',
            severity: 'Medium',
            status: 'Open',
            reportedAt: new Date(Date.now() - i * 10 * 24 * 60 * 60 * 1000)
          }))
        });

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
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('compareStationPerformance', () => {
    it('should compare and rank stations', async () => {
      try {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const performance = await analyticsService.compareStationPerformance(
          testOrgId,
          startDate,
          endDate
        );

        expect(performance).toHaveProperty('stations');
        expect(performance).toHaveProperty('topPerformers');
        expect(performance).toHaveProperty('needsAttention');
        expect(Array.isArray(performance.stations)).toBe(true);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('analyzeSafetyTrends', () => {
    it('should analyze trends over multiple periods', async () => {
      try {
        const trends = await analyticsService.analyzeSafetyTrends(testOrgId, 6);

        expect(trends).toHaveProperty('trends');
        expect(trends).toHaveProperty('direction');
        expect(trends).toHaveProperty('changePercent');
        expect(Array.isArray(trends.trends)).toBe(true);
        expect(['improving', 'declining', 'stable']).toContain(trends.direction);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });

  describe('generateKPIs', () => {
    it('should generate comprehensive KPIs', async () => {
      try {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

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
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });
});
