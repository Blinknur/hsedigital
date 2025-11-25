# HSE.Digital Backend

## Distributed Tracing with OpenTelemetry

This backend includes comprehensive distributed tracing using OpenTelemetry that tracks:

- **HTTP Requests**: Full request lifecycle with user/tenant context
- **Database Queries**: All Prisma operations with performance metrics
- **Redis Operations**: Cache hits, rate limiting, and session management
- **External API Calls**: Stripe payments, email delivery, AI service requests
- **Custom Business Logic**: With manual span creation

### Features

- **Tenant-Aware Sampling**: Different sample rates by subscription tier
- **Path-Based Sampling**: Higher rates for critical paths (webhooks, billing, AI)
- **Automatic Instrumentation**: HTTP, Express, Redis, and database operations
- **Manual Instrumentation**: Custom spans for business logic and external APIs
- **Trace Context Propagation**: Trace IDs in response headers and logs

### Configuration

Add to your `.env`:

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=hse-digital-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Sampling rates by tenant tier
TRACE_SAMPLE_RATE_ENTERPRISE=1.0
TRACE_SAMPLE_RATE_PROFESSIONAL=0.5
TRACE_SAMPLE_RATE_STARTER=0.1
TRACE_SAMPLE_RATE_FREE=0.01
TRACE_SAMPLE_RATE_DEFAULT=0.1
```

### Viewing Traces

With Docker Compose:
1. Start services: `docker-compose up -d`
2. Access Jaeger UI: http://localhost:16686
3. Select "hse-digital-backend" service
4. View traces with full request context

### Trace Attributes

Each trace includes:
- `tenant.id`, `tenant.tier`, `tenant.subscription_status`
- `user.id`, `user.email`, `user.role`
- `http.method`, `http.route`, `http.status_code`
- `db.system`, `db.operation`, `db.model`, `db.duration_ms`
- Custom attributes for AI, email, and payment operations

### Using Traces in Code

```javascript
import { withSpan, addSpanAttributes, addSpanEvent } from './utils/tracing.js';

// Wrap async operations
await withSpan('custom.operation', { 'custom.attr': 'value' }, async (span) => {
  // Your code here
  addSpanEvent('important_event', { detail: 'info' });
  return result;
});
```

# HSE.Digital Backend - Tenant Isolation

## Overview

This backend implements comprehensive multi-tenant isolation with automatic tenant context injection, query interception, and Redis-based caching.

## Tenant Isolation Features

### 1. Enhanced Tenant Context Middleware
- Validates organizationId exists in database
- Caches validation results in Redis (5-minute TTL)
- Logs all tenant context switches
- Blocks access to invalid tenants

### 2. Prisma Middleware for Auto-Injection
- Automatically injects `organizationId` on all CREATE operations
- Enforces tenant filters on all READ operations (findMany, findFirst, findUnique)
- Blocks UPDATE/DELETE operations without tenant context
- Applies to models: Station, Contractor, Audit, FormDefinition, Incident, WorkPermit

### 3. Query Interceptor
- Blocks queries missing `organizationId` filter
- Returns empty results for unauthorized access attempts
- Throws errors on mutation attempts without tenant context

### 4. Redis-Based Tenant Cache
- Caches tenant validation results (5-minute TTL)
- Falls back gracefully if Redis is unavailable
- Provides cache invalidation methods
- Improves performance for repeated tenant checks

### 5. Tenant Logging
- Logs all tenant context switches to `logs/tenant-access.log`
- Records access denied attempts
- Tracks query blocks and tenant injections
- JSON format for easy parsing and analysis

## Installation

```bash
npm install
```

## Configuration

Add Redis configuration to your `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Usage

### Import Enhanced Prisma Client

```javascript
import { prisma, setTenantContext, clearTenantContext } from './utils/prismaClient.js';

// Set tenant context
setTenantContext('org-id-123');

// All queries now automatically filtered by organizationId
const stations = await prisma.station.findMany();

// Clear context when done
clearTenantContext();
```

### Use Tenant Middleware in Routes

```javascript
import { applyTenantContext } from './middleware/tenantMiddleware.js';

app.use('/api/*', authenticateToken, tenantContext, applyTenantContext);
```

### Validate Tenants

```javascript
import { tenantService } from './services/tenantService.js';

const isValid = await tenantService.validateTenant('org-id-123');
```

## Testing

Run tenant isolation tests:

```bash
npm run test:tenant
```

## Architecture

### Tenant Context Flow

1. User authenticates → JWT contains `organizationId`
2. `authenticateToken` middleware validates JWT
3. `tenantContext` middleware:
   - Validates organizationId in database (with Redis cache)
   - Logs tenant switch
   - Sets `req.tenantId`
4. `applyTenantContext` middleware sets global context
5. Prisma middleware intercepts all queries
6. Context cleared after response

### Security Guarantees

- ✅ No query can access data without valid tenant context
- ✅ CREATE operations automatically get organizationId
- ✅ Cross-tenant queries return empty results
- ✅ Invalid tenants are blocked before reaching database
- ✅ All tenant access is logged for audit trail

## Logging

Tenant access logs are written to `server/logs/tenant-access.log`:

```json
{
  "type": "TENANT_SWITCH",
  "userId": "user-123",
  "userEmail": "user@example.com",
  "tenantId": "org-123",
  "path": "/api/stations",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Performance

- Redis caching reduces database load for tenant validation
- Cache TTL: 5 minutes (configurable)
- Graceful fallback if Redis is unavailable
- Query interception adds minimal overhead (<1ms per query)

## Maintenance

### Clear Tenant Cache

```javascript
await tenantService.clearAllTenantCache();
```

### Invalidate Specific Tenant

```javascript
await tenantService.invalidateTenantCache('org-id-123');
```

### View Logs

```bash
tail -f server/logs/tenant-access.log
```
