import { createTracedRedis } from './tracedRedis.js';

const redis = createTracedRedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        if (times > 3) {
            console.error('Redis connection failed after 3 retries');
            return null;
        }
        return Math.min(times * 50, 2000);
    }
});

const tokenBucketRateLimit = (options = {}) => {
    const {
        capacity = 100,
        refillRate = 10,
        refillInterval = 1000,
        keyPrefix = 'rate_limit',
        identifierFn = (req) => req.tenantId || req.user?.id || req.ip,
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options;
    
    return async (req, res, next) => {
        try {
            const identifier = identifierFn(req);
            const key = `${keyPrefix}:${identifier}`;
            
            const now = Date.now();
            const result = await redis.multi()
                .hgetall(key)
                .exec();
            
            let bucket = result[0][1] || {};
            
            let tokens = parseFloat(bucket.tokens || capacity);
            let lastRefill = parseInt(bucket.lastRefill || now);
            
            const elapsed = now - lastRefill;
            const tokensToAdd = (elapsed / refillInterval) * refillRate;
            tokens = Math.min(capacity, tokens + tokensToAdd);
            
            if (tokens < 1) {
                const waitTime = Math.ceil((1 - tokens) * (refillInterval / refillRate));
                
                res.setHeader('X-RateLimit-Limit', capacity);
                res.setHeader('X-RateLimit-Remaining', 0);
                res.setHeader('X-RateLimit-Reset', new Date(now + waitTime).toISOString());
                res.setHeader('Retry-After', Math.ceil(waitTime / 1000));
                
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: Math.ceil(waitTime / 1000)
                });
            }
            
            tokens -= 1;
            
            await redis.multi()
                .hset(key, 'tokens', tokens)
                .hset(key, 'lastRefill', now)
                .expire(key, Math.ceil(capacity / refillRate * refillInterval / 1000))
                .exec();
            
            res.setHeader('X-RateLimit-Limit', capacity);
            res.setHeader('X-RateLimit-Remaining', Math.floor(tokens));
            res.setHeader('X-RateLimit-Reset', new Date(now + refillInterval).toISOString());
            
            next();
        } catch (error) {
            console.error('Rate limit error:', error);
            next();
        }
    };
};

const fixedWindowRateLimit = (options = {}) => {
    const {
        windowMs = 60000,
        max = 100,
        keyPrefix = 'rate_limit_fixed',
        identifierFn = (req) => req.tenantId || req.user?.id || req.ip
    } = options;
    
    return async (req, res, next) => {
        try {
            const identifier = identifierFn(req);
            const now = Date.now();
            const windowStart = Math.floor(now / windowMs) * windowMs;
            const key = `${keyPrefix}:${identifier}:${windowStart}`;
            
            const current = await redis.incr(key);
            
            if (current === 1) {
                await redis.pexpire(key, windowMs);
            }
            
            const remaining = Math.max(0, max - current);
            const resetTime = windowStart + windowMs;
            
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', remaining);
            res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
            
            if (current > max) {
                res.setHeader('Retry-After', Math.ceil((resetTime - now) / 1000));
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: Math.ceil((resetTime - now) / 1000)
                });
            }
            
            next();
        } catch (error) {
            console.error('Rate limit error:', error);
            next();
        }
    };
};

export const tenantRateLimit = tokenBucketRateLimit({
    capacity: 1000,
    refillRate: 100,
    refillInterval: 1000,
    keyPrefix: 'tenant_rate_limit',
    identifierFn: (req) => req.tenantId || 'no_tenant'
});

export const userRateLimit = tokenBucketRateLimit({
    capacity: 100,
    refillRate: 10,
    refillInterval: 1000,
    keyPrefix: 'user_rate_limit',
    identifierFn: (req) => req.user?.id || req.ip
});

export const ipRateLimit = fixedWindowRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    keyPrefix: 'ip_rate_limit',
    identifierFn: (req) => req.ip
});

export const authRateLimit = fixedWindowRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyPrefix: 'auth_rate_limit',
    identifierFn: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
});

export { redis, tokenBucketRateLimit, fixedWindowRateLimit };
