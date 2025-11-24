# Redis-Based Distributed Rate Limiting

## Overview

This implementation provides enterprise-grade distributed rate limiting using Redis and the Token Bucket algorithm. It supports per-tenant and per-user rate limits, plan-based configurations, standard rate limit headers, and monitoring/analytics capabilities.

## Features

### 1. Token Bucket Algorithm
- **Distributed**: Uses Redis Lua scripts for atomic operations
- **Smooth refill**: Tokens refill gradually over time
- **Burst handling**: Allows burst requests up to bucket capacity
- **Multi-level**: Separate buckets for hourly, daily, and per-user limits

### 2. Plan-Based Rate Limits

| Plan       | Requests/Hour | Requests/Day | Concurrent |
|------------|---------------|--------------|------------|
| Free       | 100           | 1,000        | 5          |
| Basic      | 1,000         | 10,000       | 10         |
| Pro        | 5,000         | 50,000       | 25         |
| Enterprise | 20,000        | 200,000      | 100        |

### 3. Standard Rate Limit Headers

All rate-limited endpoints return:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when the limit resets
- `Retry-After`: Seconds to wait before retrying (on 429 errors)

### 4. Multi-Level Rate Limiting

**Per-Tenant (Organization)**:
- Hourly limit based on subscription plan
- Daily limit based on subscription plan
- Protects against one organization consuming all resources

**Per-User**:
- 10% of organization's hourly limit per user
- Prevents individual users from monopolizing tenant quota
- Fair distribution across team members

### 5. Monitoring & Analytics

**Status Endpoint** (`GET /api/rate-limit/status`):
```json
{
  "plan": {
    "requestsPerHour": 5000,
    "requestsPerDay": 50000,
    "concurrentRequests": 25
  },
  "tenant": {
    "hourly": { "remaining": 4850, "limit": 5000 },
    "daily": { "remaining": 48500, "limit": 50000 }
  },
  "user": {
    "hourly": { "remaining": 485, "limit": 500 }
  }
}
```

**Analytics Endpoint** (`GET /api/rate-limit/analytics?days=7`):
```json
{
  "organizationId": "org-456",
  "analytics": [
    { "date": "2024-01-20", "requests": 4523 },
    { "date": "2024-01-21", "requests": 5102 }
  ]
}
```

## Usage

### Apply Rate Limiting to Routes

```javascript
import { rateLimitMiddleware } from './rateLimit.js';

// Apply to specific routes
app.get('/api/data', authenticateToken, rateLimitMiddleware, handler);

// Or apply globally
app.use('/api/', authenticateToken, rateLimitMiddleware);
```

### Environment Variables

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Redis Keys Structure

```
ratelimit:tokens:tenant:{orgId}:hour     # Tenant hourly token bucket
ratelimit:tokens:tenant:{orgId}:day      # Tenant daily token bucket
ratelimit:tokens:user:{userId}:hour      # User hourly token bucket
ratelimit:timestamp:tenant:{orgId}:hour  # Tenant hourly refill timestamp
ratelimit:timestamp:tenant:{orgId}:day   # Tenant daily refill timestamp
ratelimit:timestamp:user:{userId}:hour   # User hourly refill timestamp
analytics:requests:{orgId}:{date}        # Daily request count per org
analytics:requests:user:{userId}:{date}  # Daily request count per user
```

## Implementation Details

### Token Bucket Algorithm

The token bucket refills at a constant rate:
- **Capacity**: Maximum tokens (request limit)
- **Refill Rate**: Tokens added per interval
- **Refill Interval**: Time between refills (60 seconds for hourly limits)

Example for Pro plan (5000 requests/hour):
- Capacity: 5000 tokens
- Refill Rate: ~83 tokens/minute
- Refill Interval: 60 seconds

### Atomic Operations

All rate limit checks use Redis Lua scripts to ensure:
- **Atomicity**: Token consumption and refill in single operation
- **Consistency**: No race conditions in distributed environment
- **Performance**: Single round-trip to Redis

### Error Handling

- Falls back to allowing requests if Redis is unavailable
- Logs errors without blocking API requests
- Returns proper HTTP 429 status with retry information

## Testing

```bash
npm test -- rateLimit.test.js
```

## Performance Considerations

- **Redis Lua Scripts**: Single network round-trip per check
- **Key Expiration**: Automatic cleanup after 24 hours
- **Connection Pooling**: ioredis handles connection reuse
- **Graceful Degradation**: Continues operation if Redis fails

## Monitoring

Monitor these Redis metrics:
- Command latency (should be < 1ms)
- Memory usage (keys auto-expire)
- Connection count
- Error rate

## Future Enhancements

- [ ] Distributed circuit breaker integration
- [ ] Adaptive rate limits based on system load
- [ ] Geolocation-based rate limits
- [ ] Real-time alerting for rate limit violations
- [ ] Rate limit bypass for IP whitelisting
