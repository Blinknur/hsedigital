import Redis from 'ioredis';
import prisma from './utils/db.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

const RATE_LIMIT_PLANS = {
  free: {
    requestsPerHour: 100,
    requestsPerDay: 1000,
    concurrentRequests: 5
  },
  basic: {
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    concurrentRequests: 10
  },
  pro: {
    requestsPerHour: 5000,
    requestsPerDay: 50000,
    concurrentRequests: 25
  },
  enterprise: {
    requestsPerHour: 20000,
    requestsPerDay: 200000,
    concurrentRequests: 100
  }
};

class TokenBucketRateLimiter {
  async consumeToken(key, capacity, refillRate, refillInterval = 1000) {
    const now = Date.now();
    const tokenKey = `ratelimit:tokens:${key}`;
    const timestampKey = `ratelimit:timestamp:${key}`;

    const script = `
      local tokenKey = KEYS[1]
      local timestampKey = KEYS[2]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local refillInterval = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      local requested = tonumber(ARGV[5])

      local tokens = tonumber(redis.call('GET', tokenKey))
      local lastRefill = tonumber(redis.call('GET', timestampKey))

      if not tokens then
        tokens = capacity
      end

      if not lastRefill then
        lastRefill = now
      end

      local timePassed = now - lastRefill
      local refills = math.floor(timePassed / refillInterval)
      
      if refills > 0 then
        tokens = math.min(capacity, tokens + (refills * refillRate))
        lastRefill = lastRefill + (refills * refillInterval)
      end

      if tokens >= requested then
        tokens = tokens - requested
        redis.call('SET', tokenKey, tokens, 'PX', 86400000)
        redis.call('SET', timestampKey, lastRefill, 'PX', 86400000)
        return {1, tokens, capacity, math.ceil((capacity - tokens) / refillRate * refillInterval)}
      else
        return {0, tokens, capacity, math.ceil((capacity - tokens) / refillRate * refillInterval)}
      end
    `;

    const result = await redis.eval(
      script,
      2,
      tokenKey,
      timestampKey,
      capacity,
      refillRate,
      refillInterval,
      now,
      1
    );

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      limit: result[2],
      resetIn: result[3]
    };
  }

  async getRateLimitInfo(key, capacity) {
    const tokenKey = `ratelimit:tokens:${key}`;
    const tokens = await redis.get(tokenKey);
    const remaining = tokens !== null ? parseInt(tokens) : capacity;
    
    return {
      remaining,
      limit: capacity
    };
  }
}

const rateLimiter = new TokenBucketRateLimiter();

async function getPlanLimits(organizationId) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true }
    });
    
    const plan = org?.subscriptionTier?.toLowerCase() || 'free';
    return RATE_LIMIT_PLANS[plan] || RATE_LIMIT_PLANS.free;
  } catch (error) {
    console.error('Error fetching plan limits:', error);
    return RATE_LIMIT_PLANS.free;
  }
}

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizationId = user.organizationId || 'default';
    const userId = user.id;

    const limits = await getPlanLimits(organizationId);

    const tenantKeyHour = `tenant:${organizationId}:hour`;
    const tenantKeyDay = `tenant:${organizationId}:day`;
    const userKeyHour = `user:${userId}:hour`;

    const tenantHourlyResult = await rateLimiter.consumeToken(
      tenantKeyHour,
      limits.requestsPerHour,
      Math.ceil(limits.requestsPerHour / 60),
      60000
    );

    if (!tenantHourlyResult.allowed) {
      res.set({
        'X-RateLimit-Limit': limits.requestsPerHour.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + tenantHourlyResult.resetIn).toISOString(),
        'Retry-After': Math.ceil(tenantHourlyResult.resetIn / 1000).toString()
      });
      return res.status(429).json({
        error: 'Rate limit exceeded for organization',
        limit: limits.requestsPerHour,
        resetIn: tenantHourlyResult.resetIn
      });
    }

    const tenantDailyResult = await rateLimiter.consumeToken(
      tenantKeyDay,
      limits.requestsPerDay,
      Math.ceil(limits.requestsPerDay / 1440),
      60000
    );

    if (!tenantDailyResult.allowed) {
      res.set({
        'X-RateLimit-Limit': limits.requestsPerDay.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + tenantDailyResult.resetIn).toISOString(),
        'Retry-After': Math.ceil(tenantDailyResult.resetIn / 1000).toString()
      });
      return res.status(429).json({
        error: 'Daily rate limit exceeded for organization',
        limit: limits.requestsPerDay,
        resetIn: tenantDailyResult.resetIn
      });
    }

    const userHourlyResult = await rateLimiter.consumeToken(
      userKeyHour,
      Math.floor(limits.requestsPerHour / 10),
      Math.ceil(limits.requestsPerHour / 600),
      60000
    );

    if (!userHourlyResult.allowed) {
      res.set({
        'X-RateLimit-Limit': Math.floor(limits.requestsPerHour / 10).toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + userHourlyResult.resetIn).toISOString(),
        'Retry-After': Math.ceil(userHourlyResult.resetIn / 1000).toString()
      });
      return res.status(429).json({
        error: 'Rate limit exceeded for user',
        limit: Math.floor(limits.requestsPerHour / 10),
        resetIn: userHourlyResult.resetIn
      });
    }

    res.set({
      'X-RateLimit-Limit': limits.requestsPerHour.toString(),
      'X-RateLimit-Remaining': tenantHourlyResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString()
    });

    await redis.incr(`analytics:requests:${organizationId}:${new Date().toISOString().split('T')[0]}`);
    await redis.incr(`analytics:requests:user:${userId}:${new Date().toISOString().split('T')[0]}`);

    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    next();
  }
};

export const getRateLimitStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizationId = user.organizationId || 'default';
    const userId = user.id;
    const limits = await getPlanLimits(organizationId);

    const tenantHourInfo = await rateLimiter.getRateLimitInfo(
      `tenant:${organizationId}:hour`,
      limits.requestsPerHour
    );
    const tenantDayInfo = await rateLimiter.getRateLimitInfo(
      `tenant:${organizationId}:day`,
      limits.requestsPerDay
    );
    const userHourInfo = await rateLimiter.getRateLimitInfo(
      `user:${userId}:hour`,
      Math.floor(limits.requestsPerHour / 10)
    );

    res.json({
      plan: limits,
      tenant: {
        hourly: tenantHourInfo,
        daily: tenantDayInfo
      },
      user: {
        hourly: userHourInfo
      }
    });
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    res.status(500).json({ error: 'Failed to fetch rate limit status' });
  }
};

export const getRateLimitAnalytics = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const organizationId = req.query.organizationId || user.organizationId || 'default';
    const days = parseInt(req.query.days || '7');
    const analytics = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const requests = await redis.get(`analytics:requests:${organizationId}:${dateStr}`);
      analytics.push({
        date: dateStr,
        requests: parseInt(requests || '0')
      });
    }

    res.json({
      organizationId,
      analytics: analytics.reverse()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

export { redis, RATE_LIMIT_PLANS };
