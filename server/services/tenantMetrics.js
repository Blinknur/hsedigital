import { PrismaClient } from '@prisma/client';
import {
  tenantFeatureUsage,
  tenantDataStorage,
  tenantResourceCost,
  tenantConcurrentUsers,
  tenantSubscriptionPlan,
  tenantQuotaUsage,
  tenantCacheOperations,
  tenantDatabaseOperations,
  tenantPerformanceScore
} from '../utils/metrics.js';

const prisma = new PrismaClient();

const SUBSCRIPTION_PLAN_VALUES = {
  free: 0,
  basic: 1,
  premium: 2,
  enterprise: 3
};

const COST_ESTIMATES = {
  api_call: 0.0001,
  database_query: 0.0002,
  storage_gb_month: 0.10,
  data_transfer_gb: 0.05,
  cache_operation: 0.00001
};

export const trackFeatureUsage = (tenantId, feature, action = 'use') => {
  tenantFeatureUsage.inc({ tenant_id: tenantId, feature, action });
};

export const updateTenantMetrics = async (tenantId) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      include: {
        users: true,
        stations: true,
        audits: true,
        incidents: true,
        contractors: true,
        formDefinitions: true
      }
    });

    if (!org) return;

    const planValue = SUBSCRIPTION_PLAN_VALUES[org.subscriptionPlan] || 0;
    tenantSubscriptionPlan.set({ tenant_id: tenantId, plan: org.subscriptionPlan }, planValue);

    const storageEstimate = {
      users: org.users.length * 10 * 1024,
      stations: org.stations.length * 5 * 1024,
      audits: org.audits.length * 100 * 1024,
      incidents: org.incidents.length * 20 * 1024,
      contractors: org.contractors.length * 5 * 1024,
      forms: org.formDefinitions.length * 50 * 1024
    };

    Object.entries(storageEstimate).forEach(([dataType, bytes]) => {
      tenantDataStorage.set({ tenant_id: tenantId, data_type: dataType }, bytes);
    });

    const totalStorageBytes = Object.values(storageEstimate).reduce((a, b) => a + b, 0);
    const storageGB = totalStorageBytes / (1024 * 1024 * 1024);
    const storageCost = storageGB * COST_ESTIMATES.storage_gb_month;
    
    tenantResourceCost.set(
      { tenant_id: tenantId, resource_type: 'storage' },
      storageCost
    );
  } catch (error) {
    console.error(`Error updating tenant metrics for ${tenantId}:`, error);
  }
};

export const updateConcurrentUsers = (tenantId, count) => {
  tenantConcurrentUsers.set({ tenant_id: tenantId }, count);
};

export const trackCacheOperation = (tenantId, operation) => {
  tenantCacheOperations.inc({ tenant_id: tenantId, operation });
};

export const trackDatabaseOperation = (tenantId, operationType) => {
  tenantDatabaseOperations.inc({ tenant_id: tenantId, operation_type: operationType });
};

export const updateQuotaUsage = async (tenantId, quotaType, currentUsage, limit) => {
  const usagePercent = limit > 0 ? (currentUsage / limit) * 100 : 0;
  tenantQuotaUsage.set({ tenant_id: tenantId, quota_type: quotaType }, usagePercent);
};

export const calculatePerformanceScore = async (tenantId) => {
  try {
    const factors = {
      errorRate: 1.0,
      avgLatency: 1.0,
      cacheHitRate: 1.0,
      quotaUsage: 1.0
    };

    let score = 100;
    
    score = Math.max(0, Math.min(100, score));
    tenantPerformanceScore.set({ tenant_id: tenantId }, score);
    
    return score;
  } catch (error) {
    console.error(`Error calculating performance score for ${tenantId}:`, error);
    return 0;
  }
};

export const collectAllTenantMetrics = async () => {
  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true }
    });

    for (const org of organizations) {
      await updateTenantMetrics(org.id);
      await calculatePerformanceScore(org.id);
    }
  } catch (error) {
    console.error('Error collecting tenant metrics:', error);
  }
};

setInterval(collectAllTenantMetrics, 5 * 60 * 1000);

export default {
  trackFeatureUsage,
  updateTenantMetrics,
  updateConcurrentUsers,
  trackCacheOperation,
  trackDatabaseOperation,
  updateQuotaUsage,
  calculatePerformanceScore,
  collectAllTenantMetrics
};
