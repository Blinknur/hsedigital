import { cacheManager } from '../../shared/utils/cache.js';
import { logger } from '../../shared/utils/logger.js';

export const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300,
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = () => true,
    namespace = 'api'
  } = options;

  return async (req, res, next) => {
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    try {
      const cacheKey = cacheManager.generateKey(namespace, keyGenerator(req));
      const cachedData = await cacheManager.get(cacheKey);

      if (cachedData) {
        logger.debug({ cacheKey }, 'Serving from cache');
        return res.json(cachedData);
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cacheManager.set(cacheKey, data, ttl).catch(err => {
          logger.error({ err, cacheKey }, 'Failed to cache response');
        });
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error({ error }, 'Cache middleware error');
      next();
    }
  };
};

export const tenantCacheMiddleware = (resource, options = {}) => {
  const { ttl = 600 } = options;
  
  return cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const tenantId = req.tenantId || req.user?.organizationId;
      const identifier = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      return cacheManager.getTenantKey(tenantId, resource, identifier);
    },
    condition: (req) => !!req.tenantId || !!req.user?.organizationId,
    namespace: 'tenant'
  });
};

export const invalidateCacheMiddleware = (options = {}) => {
  const {
    keyGenerator = (req) => `${req.originalUrl}`,
    namespace = 'api',
    pattern = null
  } = options;

  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      try {
        if (pattern) {
          await cacheManager.invalidatePattern(pattern(req));
        } else {
          const cacheKey = cacheManager.generateKey(namespace, keyGenerator(req));
          await cacheManager.del(cacheKey);
        }
      } catch (error) {
        logger.error({ error }, 'Cache invalidation error');
      }
      return originalJson(data);
    };
    next();
  };
};

export const invalidateTenantCacheMiddleware = (resource) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      try {
        const tenantId = req.tenantId || req.user?.organizationId;
        if (tenantId) {
          await cacheManager.invalidateTenantCache(tenantId, resource);
        }
      } catch (error) {
        logger.error({ error }, 'Tenant cache invalidation error');
      }
      return originalJson(data);
    };
    next();
  };
};
