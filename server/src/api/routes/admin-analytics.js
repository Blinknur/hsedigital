import express from 'express';
import { createTracedPrismaClient } from '../../shared/utils/tracedPrismaClient.js';

const router = express.Router();
const prisma = createTracedPrismaClient();

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/platform-metrics', asyncHandler(async (req, res) => {
    const [totalOrgs, orgsByPlan, recentActivity, userStats, featureUsage] = await Promise.all([
        prisma.organization.count(),
        prisma.organization.groupBy({
            by: ['subscriptionPlan'],
            _count: { id: true }
        }),
        prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                subscriptionPlan: true,
                lastActivityAt: true,
                createdAt: true
            },
            orderBy: { lastActivityAt: 'desc' },
            take: 10
        }),
        prisma.user.groupBy({
            by: ['organizationId'],
            _count: { id: true }
        }),
        Promise.all([
            prisma.audit.count(),
            prisma.incident.count(),
            prisma.workPermit.count(),
            prisma.station.count(),
            prisma.contractor.count()
        ])
    ]);

    const subscriptionDistribution = {
        free: orgsByPlan.find(p => p.subscriptionPlan === 'free')?._count.id || 0,
        pro: orgsByPlan.find(p => p.subscriptionPlan === 'pro')?._count.id || 0,
        enterprise: orgsByPlan.find(p => p.subscriptionPlan === 'enterprise')?._count.id || 0
    };

    const totalUsers = userStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const avgUsersPerOrg = totalOrgs > 0 ? (totalUsers / totalOrgs).toFixed(2) : 0;

    res.json({
        totalOrganizations: totalOrgs,
        subscriptionDistribution,
        totalUsers,
        avgUsersPerOrg: parseFloat(avgUsersPerOrg),
        recentActivity,
        featureUsage: {
            audits: featureUsage[0],
            incidents: featureUsage[1],
            workPermits: featureUsage[2],
            stations: featureUsage[3],
            contractors: featureUsage[4]
        }
    });
}));

router.get('/revenue-metrics', asyncHandler(async (req, res) => {
    const organizations = await prisma.organization.findMany({
        select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            monthlyRevenue: true,
            createdAt: true
        }
    });

    const planPricing = {
        free: 0,
        pro: 99,
        enterprise: 499
    };

    const activeOrgs = organizations.filter(o => o.subscriptionStatus === 'active');
    const mrr = activeOrgs.reduce((sum, org) => {
        return sum + (org.monthlyRevenue || planPricing[org.subscriptionPlan] || 0);
    }, 0);

    const arr = mrr * 12;
    const revenueByPlan = {
        free: 0,
        pro: activeOrgs.filter(o => o.subscriptionPlan === 'pro').length * planPricing.pro,
        enterprise: activeOrgs.filter(o => o.subscriptionPlan === 'enterprise').reduce((sum, org) => sum + (org.monthlyRevenue || planPricing.enterprise), 0)
    };

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const newOrgsLast30 = organizations.filter(o => o.createdAt >= last30Days).length;

    res.json({
        mrr: parseFloat(mrr.toFixed(2)),
        arr: parseFloat(arr.toFixed(2)),
        revenueByPlan,
        activeSubscriptions: activeOrgs.length,
        newOrganizationsLast30Days: newOrgsLast30
    });
}));

router.get('/churn-indicators', asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const organizations = await prisma.organization.findMany({
        select: {
            id: true,
            name: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            lastActivityAt: true,
            createdAt: true,
            _count: {
                select: {
                    users: true,
                    audits: true,
                    incidents: true
                }
            }
        }
    });

    const inactiveOrgs = organizations.filter(org => {
        if (!org.lastActivityAt) return true;
        return org.lastActivityAt < thirtyDaysAgo;
    });

    const atRiskOrgs = organizations.filter(org => {
        const hasLowActivity = org._count.audits < 5 && org._count.incidents < 3;
        const hasLowUsers = org._count.users <= 1;
        const isNotFree = org.subscriptionPlan !== 'free';
        return hasLowActivity && hasLowUsers && isNotFree;
    });

    const churnedOrgs = organizations.filter(o => 
        o.subscriptionStatus === 'canceled' || o.subscriptionStatus === 'inactive'
    );

    const totalActive = organizations.filter(o => o.subscriptionStatus === 'active').length;
    const churnRate = totalActive > 0 ? ((churnedOrgs.length / (totalActive + churnedOrgs.length)) * 100).toFixed(2) : 0;

    res.json({
        inactiveOrganizations: inactiveOrgs.length,
        atRiskOrganizations: atRiskOrgs.length,
        churnedOrganizations: churnedOrgs.length,
        churnRate: parseFloat(churnRate),
        inactiveOrgsList: inactiveOrgs.map(o => ({
            id: o.id,
            name: o.name,
            subscriptionPlan: o.subscriptionPlan,
            lastActivityAt: o.lastActivityAt,
            userCount: o._count.users
        })).slice(0, 20),
        atRiskOrgsList: atRiskOrgs.map(o => ({
            id: o.id,
            name: o.name,
            subscriptionPlan: o.subscriptionPlan,
            lastActivityAt: o.lastActivityAt,
            userCount: o._count.users,
            auditCount: o._count.audits,
            incidentCount: o._count.incidents
        })).slice(0, 20)
    });
}));

router.get('/system-health', asyncHandler(async (req, res) => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [auditLogs7d, auditLogs30d, errorLogs, recentAudits, recentIncidents] = await Promise.all([
        prisma.auditLog.count({
            where: { createdAt: { gte: last7Days } }
        }),
        prisma.auditLog.count({
            where: { createdAt: { gte: last30Days } }
        }),
        prisma.auditLog.count({
            where: {
                createdAt: { gte: last7Days },
                status: { gte: 400 }
            }
        }),
        prisma.audit.count({
            where: { createdAt: { gte: last7Days } }
        }),
        prisma.incident.count({
            where: { createdAt: { gte: last7Days } }
        })
    ]);

    const errorRate = auditLogs7d > 0 ? ((errorLogs / auditLogs7d) * 100).toFixed(2) : 0;

    res.json({
        apiRequestsLast7Days: auditLogs7d,
        apiRequestsLast30Days: auditLogs30d,
        errorCountLast7Days: errorLogs,
        errorRate: parseFloat(errorRate),
        auditsCreatedLast7Days: recentAudits,
        incidentsCreatedLast7Days: recentIncidents,
        systemStatus: errorRate < 5 ? 'healthy' : errorRate < 10 ? 'degraded' : 'critical'
    });
}));

router.get('/top-features', asyncHandler(async (req, res) => {
    const [auditsByOrg, incidentsByOrg, permitsByOrg, stationsByOrg] = await Promise.all([
        prisma.audit.groupBy({
            by: ['organizationId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        }),
        prisma.incident.groupBy({
            by: ['organizationId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        }),
        prisma.workPermit.groupBy({
            by: ['organizationId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        }),
        prisma.station.groupBy({
            by: ['organizationId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        })
    ]);

    const organizationIds = new Set([
        ...auditsByOrg.map(a => a.organizationId),
        ...incidentsByOrg.map(i => i.organizationId),
        ...permitsByOrg.map(p => p.organizationId),
        ...stationsByOrg.map(s => s.organizationId)
    ]);

    const organizations = await prisma.organization.findMany({
        where: { id: { in: Array.from(organizationIds) } },
        select: { id: true, name: true }
    });

    const orgMap = Object.fromEntries(organizations.map(o => [o.id, o.name]));

    res.json({
        topAuditUsers: auditsByOrg.map(a => ({
            organizationId: a.organizationId,
            organizationName: orgMap[a.organizationId] || 'Unknown',
            count: a._count.id
        })),
        topIncidentReporters: incidentsByOrg.map(i => ({
            organizationId: i.organizationId,
            organizationName: orgMap[i.organizationId] || 'Unknown',
            count: i._count.id
        })),
        topPermitUsers: permitsByOrg.map(p => ({
            organizationId: p.organizationId,
            organizationName: orgMap[p.organizationId] || 'Unknown',
            count: p._count.id
        })),
        topStationManagers: stationsByOrg.map(s => ({
            organizationId: s.organizationId,
            organizationName: orgMap[s.organizationId] || 'Unknown',
            count: s._count.id
        }))
    });
}));

router.get('/export', asyncHandler(async (req, res) => {
    const { format = 'json' } = req.query;

    const [organizations, users, audits, incidents, permits] = await Promise.all([
        prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                monthlyRevenue: true,
                createdAt: true,
                lastActivityAt: true,
                _count: {
                    select: {
                        users: true,
                        audits: true,
                        incidents: true,
                        workPermits: true,
                        stations: true
                    }
                }
            }
        }),
        prisma.user.count(),
        prisma.audit.count(),
        prisma.incident.count(),
        prisma.workPermit.count()
    ]);

    const exportData = {
        exportDate: new Date().toISOString(),
        summary: {
            totalOrganizations: organizations.length,
            totalUsers: users,
            totalAudits: audits,
            totalIncidents: incidents,
            totalPermits: permits
        },
        organizations: organizations.map(org => ({
            id: org.id,
            name: org.name,
            subscriptionPlan: org.subscriptionPlan,
            subscriptionStatus: org.subscriptionStatus,
            monthlyRevenue: org.monthlyRevenue,
            createdAt: org.createdAt,
            lastActivityAt: org.lastActivityAt,
            userCount: org._count.users,
            auditCount: org._count.audits,
            incidentCount: org._count.incidents,
            permitCount: org._count.workPermits,
            stationCount: org._count.stations
        }))
    };

    if (format === 'csv') {
        const headers = ['ID', 'Name', 'Plan', 'Status', 'MRR', 'Created', 'Last Activity', 'Users', 'Audits', 'Incidents', 'Permits', 'Stations'];
        const rows = exportData.organizations.map(org => [
            org.id,
            org.name,
            org.subscriptionPlan,
            org.subscriptionStatus,
            org.monthlyRevenue,
            org.createdAt,
            org.lastActivityAt || 'N/A',
            org.userCount,
            org.auditCount,
            org.incidentCount,
            org.permitCount,
            org.stationCount
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="admin-analytics-${Date.now()}.csv"`);
        return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="admin-analytics-${Date.now()}.json"`);
    res.json(exportData);
}));

export default router;
