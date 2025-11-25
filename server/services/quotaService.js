import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
    import('./alertingService.js').then(({ advancedAlertingService }) => {
        advancedAlertingService.checkRedisFailure(err).catch(() => {});
    }).catch(() => {});
});

let quotaConfig = null;

async function loadQuotaConfig() {
    if (!quotaConfig) {
        const configPath = path.join(__dirname, '../config/quota.json');
        const data = await fs.readFile(configPath, 'utf8');
        quotaConfig = JSON.parse(data);
    }
    return quotaConfig;
}

export async function getPlanLimits(planName) {
    const config = await loadQuotaConfig();
    return config.plans[planName] || config.plans['free'];
}

export async function getPlanFeatures(planName) {
    const plan = await getPlanLimits(planName);
    return plan.features;
}

export async function checkFeatureAccess(organizationId, featureName) {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true }
    });
    
    if (!org) return false;
    
    const features = await getPlanFeatures(org.subscriptionPlan);
    return features[featureName] === true;
}

export async function getCurrentUsage(organizationId) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const [stations, users, contractors, formDefinitions] = await Promise.all([
        prisma.station.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId } }),
        prisma.contractor.count({ where: { organizationId } }),
        prisma.formDefinition.count({ where: { organizationId } })
    ]);
    
    const monthlyKeys = [
        `usage:${organizationId}:audits:${currentMonth}`,
        `usage:${organizationId}:incidents:${currentMonth}`,
        `usage:${organizationId}:work_permits:${currentMonth}`
    ];
    
    const monthlyValues = await Promise.all(
        monthlyKeys.map(key => redis.get(key).then(val => parseInt(val || '0')))
    );
    
    return {
        stations,
        users,
        contractors,
        form_definitions: formDefinitions,
        audits_this_month: monthlyValues[0],
        incidents_this_month: monthlyValues[1],
        work_permits_this_month: monthlyValues[2]
    };
}

export async function checkQuota(organizationId, resource, adminOverride = false) {
    if (adminOverride) return { allowed: true, reason: 'admin_override' };
    
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true }
    });
    
    if (!org) {
        return { allowed: false, reason: 'organization_not_found' };
    }
    
    const plan = await getPlanLimits(org.subscriptionPlan);
    const usage = await getCurrentUsage(organizationId);
    
    const resourceLimitMap = {
        'stations': { limit: plan.limits.stations, current: usage.stations },
        'users': { limit: plan.limits.users, current: usage.users },
        'contractors': { limit: plan.limits.contractors, current: usage.contractors },
        'form_definitions': { limit: plan.limits.form_definitions, current: usage.form_definitions },
        'audits': { limit: plan.limits.audits_per_month, current: usage.audits_this_month },
        'incidents': { limit: plan.limits.incidents_per_month, current: usage.incidents_this_month },
        'work_permits': { limit: plan.limits.work_permits_per_month, current: usage.work_permits_this_month }
    };
    
    const resourceData = resourceLimitMap[resource];
    if (!resourceData) {
        return { allowed: true, reason: 'resource_not_tracked' };
    }
    
    if (resourceData.limit === -1) {
        return { allowed: true, reason: 'unlimited' };
    }
    
    const percentage = (resourceData.current / resourceData.limit) * 100;
    
    if (percentage >= 80) {
        import('./alertingService.js').then(({ advancedAlertingService }) => {
            advancedAlertingService.checkQuotaBreach(
                organizationId,
                resource,
                resourceData.current,
                resourceData.limit,
                percentage
            ).catch(() => {});
        }).catch(() => {});
    }
    
    if (resourceData.current >= resourceData.limit) {
        return { 
            allowed: false, 
            reason: 'quota_exceeded',
            limit: resourceData.limit,
            current: resourceData.current,
            plan: org.subscriptionPlan
        };
    }
    
    return { 
        allowed: true, 
        limit: resourceData.limit, 
        current: resourceData.current,
        remaining: resourceData.limit - resourceData.current 
    };
}

export async function incrementUsage(organizationId, resource) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = `${currentMonth}-${String(now.getDate()).padStart(2, '0')}`;
    
    const monthlyKey = `usage:${organizationId}:${resource}:${currentMonth}`;
    const dailyKey = `usage:${organizationId}:${resource}:${currentDay}`;
    
    await Promise.all([
        redis.incr(monthlyKey),
        redis.incr(dailyKey),
        redis.expire(monthlyKey, 60 * 60 * 24 * 35),
        redis.expire(dailyKey, 60 * 60 * 24 * 2)
    ]);
}

export async function getUsageStats(organizationId) {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { subscriptionPlan: true }
    });
    
    if (!org) return null;
    
    const plan = await getPlanLimits(org.subscriptionPlan);
    const usage = await getCurrentUsage(organizationId);
    
    return {
        plan: {
            name: plan.name,
            subscriptionPlan: org.subscriptionPlan
        },
        limits: plan.limits,
        features: plan.features,
        usage: {
            stations: { current: usage.stations, limit: plan.limits.stations },
            users: { current: usage.users, limit: plan.limits.users },
            contractors: { current: usage.contractors, limit: plan.limits.contractors },
            form_definitions: { current: usage.form_definitions, limit: plan.limits.form_definitions },
            audits_this_month: { current: usage.audits_this_month, limit: plan.limits.audits_per_month },
            incidents_this_month: { current: usage.incidents_this_month, limit: plan.limits.incidents_per_month },
            work_permits_this_month: { current: usage.work_permits_this_month, limit: plan.limits.work_permits_per_month }
        }
    };
}

export async function resetMonthlyUsage(organizationId) {
    const pattern = `usage:${organizationId}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
        await redis.del(...keys);
    }
    
    return { reset: keys.length };
}
