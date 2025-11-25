import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    lazyConnect: true
});

let redisAvailable = false;

redis.connect().then(() => {
    redisAvailable = true;
    console.log('✓ Redis connected for tenant caching');
}).catch((err) => {
    console.warn('⚠️ Redis connection failed, tenant caching disabled:', err.message);
    redisAvailable = false;
});

const TENANT_CACHE_TTL = 300;

export const tenantService = {
    async validateTenant(organizationId) {
        if (!organizationId) return false;

        const cacheKey = `tenant:${organizationId}`;

        if (redisAvailable) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached !== null) {
                    return cached === 'true';
                }
            } catch (error) {
                console.error('Redis get error:', error);
            }
        }

        const organization = await prisma.organization.findUnique({
            where: { id: organizationId }
        });

        const isValid = !!organization;

        if (redisAvailable) {
            try {
                await redis.setex(cacheKey, TENANT_CACHE_TTL, String(isValid));
            } catch (error) {
                console.error('Redis set error:', error);
            }
        }

        return isValid;
    },

    async invalidateTenantCache(organizationId) {
        if (!redisAvailable) return;
        
        try {
            const cacheKey = `tenant:${organizationId}`;
            await redis.del(cacheKey);
        } catch (error) {
            console.error('Redis delete error:', error);
        }
    },

    async getTenantInfo(organizationId) {
        const cacheKey = `tenant:info:${organizationId}`;

        if (redisAvailable) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (error) {
                console.error('Redis get error:', error);
            }
        }

        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                id: true,
                name: true,
                subscriptionPlan: true,
                createdAt: true
            }
        });

        if (!organization) return null;

        if (redisAvailable) {
            try {
                await redis.setex(cacheKey, TENANT_CACHE_TTL, JSON.stringify(organization));
            } catch (error) {
                console.error('Redis set error:', error);
            }
        }

        return organization;
    },

    async clearAllTenantCache() {
        if (!redisAvailable) return;
        
        try {
            const keys = await redis.keys('tenant:*');
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (error) {
            console.error('Redis clear error:', error);
        }
    }
};
