# Performance Optimization Guide

## Overview

This document describes the performance optimizations implemented in the HSE Digital platform, including Redis caching, connection pooling, N+1 query elimination, and cursor-based pagination.

## 1. Redis Caching

### Configuration

Redis caching is configured through environment variables:

```env
REDIS_URL=redis://localhost:6379
DATABASE_CONNECTION_LIMIT=10
DATABASE_CONNECTION_TIMEOUT=5000
DATABASE_POOL_TIMEOUT=10000
```

### Cache Manager

The `CacheManager` class (`server/utils/cache.js`) provides a comprehensive caching API:

```javascript
import { cacheManager } from './utils/cache.js';

// Simple get/set
await cacheManager.set(key, value, ttl);
const data = await cacheManager.get(key);

// Get or fetch pattern
const data = await cacheManager.getOrFetch(key, async () => {
  return await fetchFromDatabase();
}, ttl);

// Tenant-specific caching
await cacheManager.setTenantData(tenantId, 'resource', 'identifier', data);
const cached = await cacheManager.getTenantData(tenantId, 'resource', 'identifier');

// Batch operations
await cacheManager.mset([[key1, value1], [key2, value2]]);
const values = await cacheManager.mget([key1, key2]);

// Pattern-based invalidation
await cacheManager.invalidatePattern('cache:tenant:*:audits:*');
await cacheManager.invalidateTenantCache(tenantId, 'resource');
```

### Cache TTLs

- Default: 300 seconds (5 minutes)
- Tenant data: 600 seconds (10 minutes)
- Audit logs: 180 seconds (3 minutes)
- Audit log stats: 300 seconds (5 minutes)

### Caching Middleware

#### Tenant Cache Middleware

Automatically caches tenant-scoped API responses:

```javascript
import { tenantCacheMiddleware } from './middleware/caching.js';

router.get(
  '/api/resource',
  authenticateToken,
  tenantContext,
  tenantCacheMiddleware('resource_name', { ttl: 300 }),
  async (req, res) => {
    // Handler logic
  }
);
```

#### Cache Invalidation Middleware

Automatically invalidates cache on write operations:

```javascript
import { invalidateTenantCacheMiddleware } from './middleware/caching.js';

router.post(
  '/api/resource',
  authenticateToken,
  tenantContext,
  invalidateTenantCacheMiddleware('resource_name'),
  async (req, res) => {
    // Create resource
  }
);
```

### Tenant Service Caching

The `tenantService.js` module provides cached access to frequently-used tenant data:

```javascript
import { getTenantById, getTenantWithUsers, invalidateTenantCache } from './services/tenantService.js';

// Cached tenant lookup
const tenant = await getTenantById(tenantId);

// Cached tenant with users
const tenantWithUsers = await getTenantWithUsers(tenantId);

// Batch tenant lookup with caching
const tenants = await batchGetTenants([id1, id2, id3]);

// Invalidate all tenant caches
await invalidateTenantCache(tenantId);
```

## 2. Database Connection Pooling

### Prisma Client Configuration

The Prisma client is configured with optimized connection pool settings:

```javascript
// server/utils/prismaClient.js
const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10);
const connectionTimeout = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10);
const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '10000', 10);
```

### Connection Pool Best Practices

1. **Singleton Pattern**: Use a single Prisma client instance across the application
2. **Connection Limits**: Set based on database capacity and expected load
3. **Timeouts**: Configure appropriate connection and pool timeouts
4. **Monitoring**: Track slow queries and connection pool metrics

### Environment Variables

```env
DATABASE_CONNECTION_LIMIT=10      # Max connections in pool
DATABASE_CONNECTION_TIMEOUT=5000  # Connection timeout in ms
DATABASE_POOL_TIMEOUT=10000       # Pool timeout in ms
SLOW_QUERY_THRESHOLD_MS=1000      # Log queries slower than this
```

## 3. N+1 Query Elimination

### Problem

N+1 queries occur when fetching a list of items, then making additional queries for each item's relations:

```javascript
// BAD: N+1 queries
const audits = await prisma.audit.findMany({ where });
for (const audit of audits) {
  audit.station = await prisma.station.findUnique({ where: { id: audit.stationId } });
  audit.auditor = await prisma.user.findUnique({ where: { id: audit.auditorId } });
}
```

### Solution: Use `include`

Always use Prisma's `include` to fetch relations in a single query:

```javascript
// GOOD: Single query with joins
const audits = await prisma.audit.findMany({
  where,
  include: {
    station: {
      select: {
        id: true,
        name: true,
        region: true,
        brand: true
      }
    },
    auditor: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  }
});
```

### Implemented in Routes

- **Audits** (`/api/audits`): Includes station and auditor relations
- **Incidents** (`/api/incidents`): Includes station and reporter relations
- **Audit Logs** (`/api/admin/audit-logs`): Optimized select to minimize data transfer

### Select Field Optimization

Only select fields that are needed:

```javascript
const users = await prisma.user.findMany({
  where,
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    // Don't select password, tokens, etc.
  }
});
```

## 4. Cursor-Based Pagination

### Why Cursor Pagination?

- **Performance**: Constant time complexity O(1) vs offset O(n)
- **Consistency**: No skipped/duplicated items during pagination
- **Scalability**: Works efficiently with large datasets
- **Real-time**: Handles insertions/deletions correctly

### Pagination Utilities

```javascript
import { buildCursorPagination, formatCursorResponse } from './utils/pagination.js';

// Build pagination options
const paginationOptions = buildCursorPagination({
  cursor: req.query.cursor,
  limit: req.query.limit || 50,
  orderBy: { createdAt: 'desc' },
  cursorField: 'id'
});

// Execute query
const items = await prisma.model.findMany({
  where,
  ...paginationOptions
});

// Format response
const response = formatCursorResponse(items, limit, 'id');
res.json({ data: response.data, pagination: response.pagination });
```

### API Usage

**Initial Request:**
```bash
GET /api/audits?limit=50
```

**Response:**
```json
{
  "audits": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6ImNsdHh5ejEyMyJ9",
    "hasMore": true,
    "count": 50
  }
}
```

**Next Page Request:**
```bash
GET /api/audits?limit=50&cursor=eyJpZCI6ImNsdHh5ejEyMyJ9
```

### Cursor Encoding

Cursors are base64-encoded JSON objects:

```javascript
// Encoding
const cursor = encodeCursor({ id: 'cltxyz123' });

// Decoding
const data = decodeCursor(cursor);
// Returns: { id: 'cltxyz123' }
```

### Implemented Endpoints

- `GET /api/audits` - Cursor-based pagination with caching
- `GET /api/incidents` - Cursor-based pagination with caching
- `GET /api/admin/audit-logs` - Cursor-based pagination with caching

### Offset Pagination Support

For backwards compatibility, offset pagination is still available:

```javascript
import { buildOffsetPagination, formatOffsetResponse } from './utils/pagination.js';

const { skip, take, orderBy } = buildOffsetPagination({
  page: req.query.page,
  limit: req.query.limit,
  orderBy: { createdAt: 'desc' }
});

const [items, total] = await Promise.all([
  prisma.model.findMany({ where, skip, take, orderBy }),
  prisma.model.count({ where })
]);

const response = formatOffsetResponse(items, total, page, limit);
```

## 5. Performance Monitoring

### Slow Query Detection

Queries exceeding the threshold are automatically logged:

```javascript
prisma.$on('query', (e) => {
  const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
  if (e.duration > threshold) {
    logger.warn({
      type: 'slow_query',
      query: e.query,
      duration: e.duration,
      params: e.params
    }, `Slow query detected: ${e.duration}ms`);
  }
});
```

### Cache Metrics

Monitor cache hit/miss rates:

```javascript
logger.debug({ cacheKey }, 'Cache hit');  // On cache hit
logger.debug({ cacheKey }, 'Cache miss'); // On cache miss
```

### Query Performance Metrics

Track database query performance with Prometheus:

```javascript
databaseQueryDuration.observe({ model, operation, tenant_id }, durationSeconds);
databaseQueryTotal.inc({ model, operation, tenant_id, status });
```

## 6. Best Practices

### Caching Strategy

1. **Cache Read-Heavy Data**: Organizations, stations, contractors
2. **Short TTLs for Dynamic Data**: Audits, incidents (3-5 minutes)
3. **Invalidate on Write**: Clear cache after create/update/delete
4. **Tenant Isolation**: Use tenant-scoped cache keys

### Query Optimization

1. **Use Indexes**: Ensure indexes on frequently queried fields
2. **Limit Result Sets**: Always use pagination
3. **Select Only Needed Fields**: Don't fetch entire objects
4. **Batch Operations**: Use `mget`/`mset` for multiple items
5. **Avoid N+1**: Always use `include` for relations

### Connection Pooling

1. **Set Appropriate Limits**: Based on database capacity
2. **Monitor Pool Usage**: Track connection pool metrics
3. **Use Singleton Pattern**: Single Prisma client instance
4. **Handle Timeouts**: Graceful degradation on timeout

### Pagination

1. **Use Cursors for Large Datasets**: Better performance
2. **Limit Maximum Page Size**: Cap at 100 items
3. **Consistent Ordering**: Required for cursor pagination
4. **Include Total Count Only When Needed**: Expensive operation

## 7. Migration Guide

### Converting to Cached Endpoints

1. Add cache middleware:
```javascript
import { tenantCacheMiddleware } from './middleware/caching.js';

router.get('/api/resource', 
  authenticateToken,
  tenantContext,
  tenantCacheMiddleware('resource', { ttl: 300 }),
  handler
);
```

2. Add invalidation on write:
```javascript
import { invalidateTenantCacheMiddleware } from './middleware/caching.js';

router.post('/api/resource',
  authenticateToken,
  tenantContext,
  invalidateTenantCacheMiddleware('resource'),
  handler
);
```

### Converting to Cursor Pagination

1. Import utilities:
```javascript
import { buildCursorPagination, formatCursorResponse } from '../utils/pagination.js';
```

2. Update query:
```javascript
const paginationOptions = buildCursorPagination({
  cursor: req.query.cursor,
  limit: req.query.limit,
  orderBy: { createdAt: 'desc' },
  cursorField: 'id'
});

const items = await prisma.model.findMany({
  where,
  ...paginationOptions
});
```

3. Format response:
```javascript
const response = formatCursorResponse(items, limit, 'id');
res.json({ data: response.data, pagination: response.pagination });
```

## 8. Troubleshooting

### Cache Issues

**Problem**: Stale data in cache
**Solution**: Reduce TTL or invalidate cache more aggressively

**Problem**: Redis connection errors
**Solution**: Check `REDIS_URL` and Redis server status

### Performance Issues

**Problem**: Slow queries
**Solution**: Check indexes, reduce result set size, use select

**Problem**: High memory usage
**Solution**: Reduce connection pool size, implement pagination

**Problem**: Connection pool exhaustion
**Solution**: Increase `DATABASE_CONNECTION_LIMIT` or optimize queries

## 9. Testing

Run performance tests:

```bash
# Test Redis connection
docker-compose exec app node -e "import('./utils/redis.js').then(m => m.getRedisClient().ping())"

# Test cache operations
npm test -- cache

# Monitor slow queries
tail -f logs/app.log | grep slow_query
```

## 10. Monitoring

Key metrics to monitor:

- Cache hit/miss ratio
- Query duration (p50, p95, p99)
- Connection pool utilization
- Redis memory usage
- API response times

Use Prometheus + Grafana dashboards to visualize these metrics.
