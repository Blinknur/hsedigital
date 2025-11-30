import prisma from '../../shared/utils/db.js';
import { cacheManager } from '../../shared/utils/cache.js';
import { logger } from '../../shared/utils/logger.js';

const TENANT_CACHE_TTL = 600;

export const getTenantById = async (tenantId) => {
  const cacheKey = cacheManager.getTenantKey(tenantId, 'organization', '');
  
  return cacheManager.getOrFetch(cacheKey, async () => {
    const tenant = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return tenant;
  }, TENANT_CACHE_TTL);
};

export const getTenantWithUsers = async (tenantId) => {
  const cacheKey = cacheManager.getTenantKey(tenantId, 'organization_users', '');
  
  return cacheManager.getOrFetch(cacheKey, async () => {
    const tenant = await prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
    
    return tenant;
  }, TENANT_CACHE_TTL);
};

export const getTenantStations = async (tenantId) => {
  const cacheKey = cacheManager.getTenantKey(tenantId, 'stations', 'all');
  
  return cacheManager.getOrFetch(cacheKey, async () => {
    const stations = await prisma.station.findMany({
      where: { organizationId: tenantId, isActive: true },
      orderBy: { name: 'asc' }
    });
    
    return stations;
  }, TENANT_CACHE_TTL);
};

export const getTenantContractors = async (tenantId) => {
  const cacheKey = cacheManager.getTenantKey(tenantId, 'contractors', 'all');
  
  return cacheManager.getOrFetch(cacheKey, async () => {
    const contractors = await prisma.contractor.findMany({
      where: { organizationId: tenantId },
      orderBy: { name: 'asc' }
    });
    
    return contractors;
  }, TENANT_CACHE_TTL);
};

export const invalidateTenantCache = async (tenantId) => {
  await cacheManager.invalidateTenantCache(tenantId);
  logger.info({ tenantId }, 'Tenant cache invalidated');
};

export const batchGetTenants = async (tenantIds) => {
  const cacheKeys = tenantIds.map(id => cacheManager.getTenantKey(id, 'organization', ''));
  const cachedValues = await cacheManager.mget(cacheKeys);
  
  const missingIndices = [];
  const result = new Map();
  
  cachedValues.forEach((value, index) => {
    if (value !== null) {
      result.set(tenantIds[index], value);
    } else {
      missingIndices.push(index);
    }
  });
  
  if (missingIndices.length > 0) {
    const missingIds = missingIndices.map(i => tenantIds[i]);
    const tenants = await prisma.organization.findMany({
      where: { id: { in: missingIds } },
      select: {
        id: true,
        name: true,
        ownerId: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    const cacheEntries = tenants.map(tenant => [
      cacheManager.getTenantKey(tenant.id, 'organization', ''),
      tenant
    ]);
    
    if (cacheEntries.length > 0) {
      await cacheManager.mset(cacheEntries, TENANT_CACHE_TTL);
    }
    
    tenants.forEach(tenant => {
      result.set(tenant.id, tenant);
    });
  }
  
  return result;
};

export const validateTenant = async (tenantId) => {
  if (!tenantId) {
    return false;
  }
  
  try {
    const tenant = await getTenantById(tenantId);
    return tenant !== null;
  } catch (error) {
    logger.error({ tenantId, error }, 'Error validating tenant');
    return false;
  }
};

export const clearAllTenantCache = async () => {
  await cacheManager.flushAll();
  logger.info('All tenant cache cleared');
};

export const tenantService = {
  getTenantById,
  getTenantWithUsers,
  getTenantStations,
  getTenantContractors,
  invalidateTenantCache,
  batchGetTenants,
  validateTenant,
  clearAllTenantCache
};
