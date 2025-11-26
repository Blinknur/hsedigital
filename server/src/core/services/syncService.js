import prisma from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';
import { getRedisClient } from '../../shared/utils/redis.js';

const SYNC_KEY_PREFIX = 'sync:';
const SYNC_TTL = 7 * 24 * 60 * 60;

export class SyncService {
  constructor() {
    this.redis = null;
  }

  async getRedis() {
    if (!this.redis) {
      this.redis = await getRedisClient();
    }
    return this.redis;
  }

  async getLastSyncTimestamp(userId, resource) {
    try {
      const redis = await this.getRedis();
      const key = `${SYNC_KEY_PREFIX}${userId}:${resource}`;
      const timestamp = await redis.get(key);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      logger.error({ error, userId, resource }, 'Failed to get last sync timestamp');
      return null;
    }
  }

  async setLastSyncTimestamp(userId, resource, timestamp = new Date()) {
    try {
      const redis = await this.getRedis();
      const key = `${SYNC_KEY_PREFIX}${userId}:${resource}`;
      await redis.setex(key, SYNC_TTL, timestamp.toISOString());
    } catch (error) {
      logger.error({ error, userId, resource }, 'Failed to set last sync timestamp');
    }
  }

  async getChanges(tenantId, resource, lastSync, options = {}) {
    const { limit = 100, includeDeleted = false } = options;
    
    try {
      const where = {
        organizationId: tenantId,
        updatedAt: lastSync ? { gt: lastSync } : undefined
      };

      let data;
      
      switch (resource) {
        case 'stations':
          data = await prisma.station.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'asc' }
          });
          break;
          
        case 'audits':
          data = await prisma.audit.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'asc' },
            include: {
              station: { select: { id: true, name: true } },
              auditor: { select: { id: true, name: true } }
            }
          });
          break;
          
        case 'incidents':
          data = await prisma.incident.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'asc' },
            include: {
              station: { select: { id: true, name: true } },
              reporter: { select: { id: true, name: true } }
            }
          });
          break;
          
        case 'workPermits':
          data = await prisma.workPermit.findMany({
            where,
            take: limit,
            orderBy: { updatedAt: 'asc' }
          });
          break;
          
        default:
          throw new Error(`Unsupported resource: ${resource}`);
      }

      return {
        resource,
        data,
        hasMore: data.length === limit,
        lastSyncTime: new Date().toISOString()
      };
    } catch (error) {
      logger.error({ error, tenantId, resource }, 'Failed to get changes');
      throw error;
    }
  }

  async batchSync(tenantId, userId, resources, lastSyncTimes = {}) {
    const results = {};
    
    for (const resource of resources) {
      const lastSync = lastSyncTimes[resource] 
        ? new Date(lastSyncTimes[resource])
        : await this.getLastSyncTimestamp(userId, resource);
      
      results[resource] = await this.getChanges(tenantId, resource, lastSync);
      await this.setLastSyncTimestamp(userId, resource);
    }
    
    return results;
  }

  async recordConflict(tenantId, resource, resourceId, clientData, serverData) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: clientData.userId,
          organizationId: tenantId,
          action: 'SYNC_CONFLICT',
          resource,
          resourceId,
          ipAddress: 'mobile-app',
          userAgent: 'mobile-sync',
          status: 409,
          metadata: {
            clientData,
            serverData,
            resolvedAt: null
          }
        }
      });
    } catch (error) {
      logger.error({ error }, 'Failed to record sync conflict');
    }
  }
}

export const syncService = new SyncService();
