import prisma from '../../shared/utils/db.js';

const calculateAuditCompletionRate = async (organizationId, startDate, endDate) => {
  const scheduled = await prisma.audit.count({
    where: {
      organizationId,
      scheduledDate: { gte: startDate, lte: endDate }
    }
  });

  const completed = await prisma.audit.count({
    where: {
      organizationId,
      scheduledDate: { gte: startDate, lte: endDate },
      status: 'Completed'
    }
  });

  return scheduled > 0 ? (completed / scheduled) * 100 : 0;
};

const calculateIncidentResponseTimes = async (organizationId, startDate, endDate) => {
  const incidents = await prisma.incident.findMany({
    where: {
      organizationId,
      reportedAt: { gte: startDate, lte: endDate },
      resolvedAt: { not: null }
    },
    select: {
      reportedAt: true,
      resolvedAt: true,
      severity: true
    }
  });

  const responseTimes = incidents.map(i => {
    const hours = (new Date(i.resolvedAt) - new Date(i.reportedAt)) / (1000 * 60 * 60);
    return { hours, severity: i.severity };
  });

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, rt) => sum + rt.hours, 0) / responseTimes.length
    : 0;

  const bySeverity = {
    Critical: responseTimes.filter(rt => rt.severity === 'Critical'),
    High: responseTimes.filter(rt => rt.severity === 'High'),
    Medium: responseTimes.filter(rt => rt.severity === 'Medium'),
    Low: responseTimes.filter(rt => rt.severity === 'Low')
  };

  const avgBySeverity = {};
  Object.entries(bySeverity).forEach(([severity, times]) => {
    avgBySeverity[severity] = times.length > 0
      ? times.reduce((sum, rt) => sum + rt.hours, 0) / times.length
      : 0;
  });

  return {
    average: avgResponseTime,
    bySeverity: avgBySeverity,
    total: responseTimes.length
  };
};

const analyzeSafetyTrends = async (organizationId, periods = 6) => {
  const trends = [];
  const now = new Date();

  for (let i = periods - 1; i >= 0; i--) {
    const endDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);

    const [incidents, audits, criticalIncidents] = await Promise.all([
      prisma.incident.count({
        where: {
          organizationId,
          reportedAt: { gte: startDate, lt: endDate }
        }
      }),
      prisma.audit.findMany({
        where: {
          organizationId,
          completedDate: { gte: startDate, lt: endDate },
          status: 'Completed'
        },
        select: { overallScore: true }
      }),
      prisma.incident.count({
        where: {
          organizationId,
          reportedAt: { gte: startDate, lt: endDate },
          severity: { in: ['Critical', 'High'] }
        }
      })
    ]);

    const avgScore = audits.length > 0
      ? audits.reduce((sum, a) => sum + a.overallScore, 0) / audits.length
      : 0;

    trends.push({
      period: startDate.toISOString().substring(0, 7),
      incidentCount: incidents,
      criticalIncidents,
      avgAuditScore: avgScore,
      auditCount: audits.length
    });
  }

  const trend = trends.length >= 2
    ? trends[trends.length - 1].incidentCount - trends[trends.length - 2].incidentCount
    : 0;

  return {
    trends,
    direction: trend < 0 ? 'improving' : trend > 0 ? 'declining' : 'stable',
    changePercent: trends.length >= 2 && trends[trends.length - 2].incidentCount > 0
      ? ((trend / trends[trends.length - 2].incidentCount) * 100).toFixed(2)
      : 0
  };
};

const compareStationPerformance = async (organizationId, startDate, endDate) => {
  const stations = await prisma.station.findMany({
    where: { organizationId, isActive: true },
    include: {
      audits: {
        where: {
          completedDate: { gte: startDate, lte: endDate },
          status: 'Completed'
        },
        select: { overallScore: true }
      },
      incidents: {
        where: {
          reportedAt: { gte: startDate, lte: endDate }
        },
        select: { severity: true }
      }
    }
  });

  const performance = stations.map(station => {
    const avgScore = station.audits.length > 0
      ? station.audits.reduce((sum, a) => sum + a.overallScore, 0) / station.audits.length
      : 0;

    const criticalIncidents = station.incidents.filter(
      i => i.severity === 'Critical' || i.severity === 'High'
    ).length;

    const score = avgScore - (criticalIncidents * 5);

    return {
      id: station.id,
      name: station.name,
      region: station.region,
      brand: station.brand,
      avgAuditScore: avgScore,
      auditCount: station.audits.length,
      incidentCount: station.incidents.length,
      criticalIncidents,
      performanceScore: Math.max(0, Math.min(100, score)),
      riskCategory: station.riskCategory
    };
  });

  performance.sort((a, b) => b.performanceScore - a.performanceScore);

  return {
    stations: performance,
    topPerformers: performance.slice(0, 5),
    needsAttention: performance.filter(s => s.performanceScore < 60 || s.criticalIncidents > 3)
  };
};

const predictMaintenanceNeeds = async (organizationId) => {
  const stations = await prisma.station.findMany({
    where: { organizationId, isActive: true },
    include: {
      audits: {
        orderBy: { completedDate: 'desc' },
        take: 10,
        where: { status: 'Completed' },
        select: {
          overallScore: true,
          findings: true,
          completedDate: true
        }
      },
      incidents: {
        orderBy: { reportedAt: 'desc' },
        take: 20,
        select: {
          incidentType: true,
          severity: true,
          reportedAt: true,
          description: true
        }
      }
    }
  });

  const predictions = [];

  for (const station of stations) {
    if (station.audits.length < 3) continue;

    const scores = station.audits.map(a => a.overallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const trend = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0;

    const recentIncidents = station.incidents.filter(i => {
      const daysSince = (new Date() - new Date(i.reportedAt)) / (1000 * 60 * 60 * 24);
      return daysSince <= 90;
    });

    const maintenanceKeywords = ['equipment', 'leak', 'malfunction', 'failure', 'breakdown', 'pump', 'tank', 'dispenser'];
    const maintenanceIncidents = recentIncidents.filter(i => {
      const text = (i.description || '' + i.incidentType || '').toLowerCase();
      return maintenanceKeywords.some(keyword => text.includes(keyword));
    });

    let riskScore = 0;
    let predictedIssues = [];

    if (avgScore < 70) riskScore += 30;
    else if (avgScore < 80) riskScore += 15;

    if (trend < -10) {
      riskScore += 25;
      predictedIssues.push('Declining audit scores indicate increasing maintenance needs');
    }

    if (recentIncidents.length > 5) {
      riskScore += 20;
      predictedIssues.push(`High incident rate: ${recentIncidents.length} incidents in 90 days`);
    }

    if (maintenanceIncidents.length > 2) {
      riskScore += 25;
      predictedIssues.push(`Recurring maintenance issues detected`);
    }

    const lastAuditDays = station.audits.length > 0
      ? (new Date() - new Date(station.audits[0].completedDate)) / (1000 * 60 * 60 * 24)
      : 365;

    if (lastAuditDays > 180) {
      riskScore += 15;
      predictedIssues.push('Audit overdue');
    }

    if (riskScore > 30) {
      const daysUntil = Math.max(7, Math.floor((100 - riskScore) * 3));
      const predictedDate = new Date();
      predictedDate.setDate(predictedDate.getDate() + daysUntil);

      predictions.push({
        stationId: station.id,
        stationName: station.name,
        region: station.region,
        riskScore,
        confidence: Math.min(95, riskScore + 20),
        predictedDate,
        priority: riskScore > 70 ? 'Critical' : riskScore > 50 ? 'High' : 'Medium',
        predictedIssues,
        recommendation: riskScore > 70
          ? 'Immediate inspection required'
          : riskScore > 50
          ? 'Schedule maintenance within 2 weeks'
          : 'Plan preventive maintenance',
        recentIncidentCount: recentIncidents.length,
        avgAuditScore: avgScore
      });
    }
  }

  predictions.sort((a, b) => b.riskScore - a.riskScore);

  return predictions;
};

const generateKPIs = async (organizationId, startDate, endDate) => {
  const [completionRate, responseTimes, safetyTrends, stationPerformance] = await Promise.all([
    calculateAuditCompletionRate(organizationId, startDate, endDate),
    calculateIncidentResponseTimes(organizationId, startDate, endDate),
    analyzeSafetyTrends(organizationId, 6),
    compareStationPerformance(organizationId, startDate, endDate)
  ]);

  const [totalIncidents, openIncidents, criticalIncidents] = await Promise.all([
    prisma.incident.count({
      where: {
        organizationId,
        reportedAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.incident.count({
      where: {
        organizationId,
        reportedAt: { gte: startDate, lte: endDate },
        status: 'Open'
      }
    }),
    prisma.incident.count({
      where: {
        organizationId,
        reportedAt: { gte: startDate, lte: endDate },
        severity: { in: ['Critical', 'High'] }
      }
    })
  ]);

  return {
    auditCompletionRate: completionRate,
    incidentResponseTimes: responseTimes,
    safetyScore: safetyTrends.trends.length > 0
      ? safetyTrends.trends[safetyTrends.trends.length - 1].avgAuditScore
      : 0,
    totalIncidents,
    openIncidents,
    criticalIncidents,
    topPerformingStations: stationPerformance.topPerformers.length,
    stationsNeedingAttention: stationPerformance.needsAttention.length
  };
};

const createAnalyticsSnapshot = async (organizationId) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

  const [kpis, safetyTrends, stationPerformance, predictions] = await Promise.all([
    generateKPIs(organizationId, startDate, endDate),
    analyzeSafetyTrends(organizationId, 12),
    compareStationPerformance(organizationId, startDate, endDate),
    predictMaintenanceNeeds(organizationId)
  ]);

  const snapshot = await prisma.analyticsSnapshot.create({
    data: {
      organizationId,
      snapshotDate: now,
      metrics: {
        period: { start: startDate, end: endDate },
        stationCount: stationPerformance.stations.length
      },
      kpis,
      trends: safetyTrends,
      predictions: predictions.slice(0, 10)
    }
  });

  return snapshot;
};

export default {
  calculateAuditCompletionRate,
  calculateIncidentResponseTimes,
  analyzeSafetyTrends,
  compareStationPerformance,
  predictMaintenanceNeeds,
  generateKPIs,
  createAnalyticsSnapshot
};
