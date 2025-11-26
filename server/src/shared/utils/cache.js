import { getRedisClient } from './redis.js';
import { logger } from './logger.js';

const DEFAULT_TTL = 300;
const TENANT_DATA_TTL = 600;

export class CacheManager {
  constructor() {
    this.redis = getRedisClient();
  }

  generateKey(namespace, identifier) {
    return `cache:${namespace}:${identifier}`;
  }

  async get(key) {
    try {
      const data = await this.redis.get(key);
      if (data) {
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(data);
      }
      logger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      logger.debug({ key, ttl }, 'Cache set');
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      logger.debug({ key }, 'Cache deleted');
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug({ pattern, count: keys.length }, 'Cache pattern invalidated');
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Cache pattern invalidation error');
    }
  }

  async getOrFetch(key, fetchFn, ttl = DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  getTenantKey(tenantId, resource, identifier = '') {
    return this.generateKey(`tenant:${tenantId}:${resource}`, identifier);
  }

  async getTenantData(tenantId, resource, identifier = '') {
    const key = this.getTenantKey(tenantId, resource, identifier);
    return this.get(key);
  }

  async setTenantData(tenantId, resource, identifier = '', value, ttl = TENANT_DATA_TTL) {
    const key = this.getTenantKey(tenantId, resource, identifier);
    return this.set(key, value, ttl);
  }

  async invalidateTenantCache(tenantId, resource = '*') {
    const pattern = this.generateKey(`tenant:${tenantId}:${resource}`, '*');
    return this.invalidatePattern(pattern);
  }

  async mget(keys) {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      logger.error({ error, keys }, 'Cache mget error');
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = DEFAULT_TTL) {
    try {
      const pipeline = this.redis.pipeline();
      for (const [key, value] of keyValuePairs) {
        pipeline.setex(key, ttl, JSON.stringify(value));
      }
      await pipeline.exec();
      logger.debug({ count: keyValuePairs.length, ttl }, 'Cache mset');
    } catch (error) {
      logger.error({ error }, 'Cache mset error');
    }
  }
}

export const cacheManager = new CacheManager();
