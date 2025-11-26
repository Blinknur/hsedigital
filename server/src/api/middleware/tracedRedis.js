import Redis from 'ioredis';
import { withSpan, addSpanAttributes, recordException } from '../../shared/utils/tracing.js';

const isTracingEnabled = process.env.OTEL_ENABLED === 'true';

export const createTracedRedisClient = (config) => {
  const redis = new Redis(config);

  if (isTracingEnabled) {
    const commandsToTrace = [
      'get', 'set', 'del', 'exists', 'expire', 'ttl',
      'incr', 'decr', 'incrby', 'decrby',
      'hget', 'hset', 'hdel', 'hgetall', 'hkeys', 'hvals',
      'lpush', 'rpush', 'lpop', 'rpop', 'lrange', 'llen',
      'sadd', 'srem', 'smembers', 'sismember',
      'zadd', 'zrem', 'zrange', 'zrangebyscore', 'zscore',
      'multi', 'exec', 'pipeline'
    ];

    commandsToTrace.forEach(command => {
      const originalCommand = redis[command];
      if (typeof originalCommand === 'function') {
        redis[command] = function (...args) {
          if (!isTracingEnabled) {
            return originalCommand.apply(this, args);
          }

          const spanName = `redis.${command}`;
          const key = args[0];
          
          return withSpan(
            spanName,
            {
              'db.system': 'redis',
              'db.operation': command,
              'db.redis.key': typeof key === 'string' ? key : String(key),
              'net.peer.name': config.host || 'localhost',
              'net.peer.port': config.port || 6379
            },
            async (span) => {
              const startTime = Date.now();
              
              try {
                const result = await originalCommand.apply(this, args);
                const duration = Date.now() - startTime;
                
                span.setAttribute('db.duration_ms', duration);
                
                return result;
              } catch (error) {
                recordException(error, {
                  'db.operation': command,
                  'db.redis.key': typeof key === 'string' ? key : String(key)
                });
                throw error;
              }
            }
          );
        };
      }
    });
  }

  return redis;
};

export const createTracedRedis = (config = {}) => {
  const redisConfig = {
    host: config.host || process.env.REDIS_HOST || 'localhost',
    port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
    password: config.password || process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    ...config
  };

  const redis = createTracedRedisClient(redisConfig);

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('✓ Redis connected with tracing enabled');
  });

  return redis;
};
