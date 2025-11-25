# Monitoring & Observability Guide

## Overview

This platform includes comprehensive monitoring and observability features:

- **Structured Logging**: JSON logging with Pino
- **Metrics**: Prometheus metrics export
- **Error Tracking**: Sentry integration with advanced multi-tenant features
- **Performance Monitoring**: Tier-based transaction sampling and profiling
- **Health Checks**: Health, readiness, and liveness endpoints
- **Alerting**: Custom alerting with Slack and PagerDuty integration
- **Dashboards**: Pre-built Grafana dashboards
- **Source Maps**: Automatic release tracking for debugging minified code

## Components

### 1. Sentry Integration (Enhanced)

**Location**: `server/utils/sentry.js`, `server/middleware/sentry.js`

**Features**:
- **Request Context Enrichment**: Automatically captures user, tenant, organization info
- **Multi-Tenant Error Fingerprinting**: Custom fingerprinting based on tenant ID and error type
- **Release Tracking**: Auto-detects git version for source map support
- **Tier-Based Performance Sampling**: Adjusts transaction sampling by subscription tier
  - Free: 1% traces, 0% profiling
  - Starter: 5% traces, 1% profiling
  - Professional: 25% traces, 10% profiling
  - Enterprise: 100% traces, 50% profiling
- **Smart Filtering**: Excludes health checks, ignores 4xx errors
- **PII Scrubbing**: Removes sensitive data (passwords, tokens, cookies)

**Setup**:
```bash
# Set environment variables
SENTRY_DSN=your-sentry-dsn
SENTRY_RELEASE=hse-digital@1.0.0-abc123  # Auto-detected from git
SENTRY_DIST=production
```

**Usage**:
```javascript
import { captureException, setUserContext, addBreadcrumb } from './utils/sentry.js';

// Manual exception capture
captureException(error, {
  tenantId: 'org_123',
  organizationName: 'Acme Corp',
  userId: 'user_456'
});

// Add context breadcrumbs
addBreadcrumb('Data processed', 'processing', 'info', { recordCount: 100 });
```

**Source Maps**:
Frontend source maps are generated during build (configured in `vite.config.ts`):
```bash
# Root build with release tracking
npm run build:sourcemaps

# Or manual frontend build
cd src && vite build
```

**Multi-Tenant Error Fingerprinting**:
Errors are automatically fingerprinted by:
1. Tenant ID
2. Error type (exception class)
3. Error message (first 50 chars)
4. Optional resource name

This ensures errors are grouped by tenant for better debugging in multi-tenant environments.

**Performance Sampling by Tier**:
Transaction and profile sampling rates automatically adjust based on organization subscription tier:

| Tier         | Trace Sample Rate | Profile Sample Rate | Use Case |
|--------------|-------------------|---------------------|----------|
| Free         | 1%                | 0%                  | Basic error tracking |
| Starter      | 5%                | 1%                  | Light performance monitoring |
| Professional | 25%               | 10%                 | Comprehensive monitoring |
| Enterprise   | 100%              | 50%                 | Full observability |

Special routes:
- Health checks: 0.1% sampling
- Metrics endpoint: 0% sampling (disabled)
- Webhooks: 100% sampling (critical)
- Billing/backup: 2x tier rate (capped at 100%)

### 2. Structured Logging (Pino)

**Location**: `server/utils/logger.js`, `server/middleware/logging.js`

**Features**:
- JSON-formatted logs
- Automatic PII redaction (passwords, tokens, auth headers)
- Request/response logging with timing
- Slow query detection
- Context-aware logging (tenant, user)

**Usage**:
```javascript
import { logger } from './utils/logger.js';

logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ err, context }, 'Operation failed');
logger.warn({ duration: 5000 }, 'Slow operation detected');
```

**Environment Variables**:
- `LOG_LEVEL`: Set log level (debug, info, warn, error) - default: `info`

### 2. Health Check Endpoints

**Location**: `server/routes/health.js`

**Endpoints**:

#### `/api/health`
Complete health status including database and Redis connectivity.

**Response**:
```json
{
  "status": "healthy",
  "service": "hse-digital",
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "message": "Database connection successful" },
    "redis": { "status": "healthy", "message": "Redis connection successful" },
    "uptime": 3600,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "responseTime": "45ms"
}
```

#### `/api/ready`
Kubernetes readiness probe - checks if service is ready to accept traffic.

**Response**:
```json
{
  "status": "ready",
  "message": "Service is ready to accept traffic"
}
```

#### `/api/live`
Kubernetes liveness probe - checks if service is alive.

**Response**:
```json
{
  "status": "alive",
  "message": "Service is alive",
  "uptime": 3600,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Prometheus Metrics

**Location**: `server/utils/metrics.js`, `server/middleware/metrics.js`, `/metrics`

**Exposed Metrics**:

- `hse_digital_http_request_duration_seconds` - HTTP request latency histogram
- `hse_digital_http_requests_total` - Total HTTP requests counter
- `hse_digital_http_request_errors_total` - HTTP errors counter
- `hse_digital_active_connections` - Active connections gauge
- `hse_digital_database_query_duration_seconds` - Database query latency histogram
- `hse_digital_database_queries_total` - Database queries counter
- `hse_digital_cache_hits_total` - Cache hits counter
- `hse_digital_cache_misses_total` - Cache misses counter
- `hse_digital_rate_limit_hits_total` - Rate limit hits counter
- `hse_digital_auth_attempts_total` - Authentication attempts counter
- `hse_digital_auth_failures_total` - Authentication failures counter
- `hse_digital_tenant_requests_total` - Tenant requests counter
- `hse_digital_tenant_latency_seconds` - Per-tenant latency histogram
- `hse_digital_tenant_errors_total` - Per-tenant errors counter

**Access**: `http://localhost:3001/metrics`

### 4. Sentry Error Tracking

**Location**: `server/utils/sentry.js`, `server/middleware/sentry.js`

**Features**:
- Automatic error capture
- Performance monitoring
- User context tracking
- Tenant context tracking
- Breadcrumb tracking
- PII filtering (auth headers, cookies)

**Environment Variables**:
```bash
SENTRY_DSN=https://your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

**Usage**:
```javascript
import { captureException, addBreadcrumb } from './utils/sentry.js';

addBreadcrumb('User action', 'user', 'info', { action: 'click' });
captureException(error, { userId: 123, tenantId: 'abc' });
```

### 5. Database Query Monitoring

**Location**: `server/utils/prisma-instrumented.js`

**Features**:
- Automatic query timing
- Slow query detection
- Query error tracking
- Metrics integration

**Environment Variables**:
- `SLOW_QUERY_THRESHOLD_MS`: Threshold for slow query alerts (default: 1000ms)

### 6. Alerting System

**Location**: `server/monitoring/alerts.js`

**Features**:
- Alert deduplication (5-minute cooldown)
- Slack webhook integration
- PagerDuty integration
- Multiple alert types

**Alert Types**:
- High error rate
- Slow response time
- Slow database queries
- Critical errors
- Service down

**Environment Variables**:
```bash
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_RESPONSE_TIME_MS=5000
ALERT_DB_QUERY_TIME_MS=2000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key
```

**Usage**:
```javascript
import { alertManager } from './monitoring/alerts.js';

alertManager.checkErrorRate(errors, total);
alertManager.checkResponseTime(duration, endpoint);
alertManager.criticalError(error, context);
alertManager.serviceDown('Database');
```

## Docker Monitoring Stack

### Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f app
```

### Services

- **App**: `http://localhost:3001`
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3000` (admin/admin123)
- **Loki**: `http://localhost:3100`

### Grafana Dashboard

Pre-built dashboard available at `server/monitoring/grafana/dashboard.json`

**Panels**:
1. Request Rate (per minute)
2. Error Rate (per minute)
3. Request Latency (p50, p95, p99)
4. Active Connections
5. Database Query Latency (p95)
6. Database Query Rate
7. Cache Hit Rate
8. Rate Limit Hits
9. Authentication Attempts
10. Authentication Failures
11. Tenant Request Rate
12. Tenant Latency (p95)
13. Tenant Error Rate
14. System Memory Usage

**Import Dashboard**:
1. Go to Grafana UI: `http://localhost:3000`
2. Login with admin/admin123
3. Click "+" → "Import"
4. Upload `server/monitoring/grafana/dashboard.json`

## Prometheus Alerting Rules

**Location**: `server/monitoring/grafana/prometheus-rules.yml`

**Rules**:
- **HighErrorRate**: Error rate > 5% for 2 minutes
- **HighLatency**: P95 latency > 5s for 5 minutes
- **DatabaseSlowQueries**: P95 query time > 2s for 5 minutes
- **HighDatabaseErrorRate**: DB error rate > 0.1 queries/sec for 2 minutes
- **ServiceDown**: Service unreachable for 1 minute
- **HighMemoryUsage**: Memory usage > 1GB for 5 minutes
- **HighAuthFailureRate**: Auth failures > 0.5/sec for 2 minutes
- **HighRateLimitHits**: Rate limit hits > 1/sec for 5 minutes
- **LowCacheHitRate**: Cache hit rate < 50% for 10 minutes
- **TenantHighErrorRate**: Tenant error rate > 0.1/sec for 5 minutes
- **TenantHighLatency**: Tenant P95 latency > 3s for 5 minutes

## Production Deployment

### Environment Configuration

```bash
# Logging
LOG_LEVEL=info
SLOW_QUERY_THRESHOLD_MS=1000

# Sentry
SENTRY_DSN=https://your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Alerting
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_RESPONSE_TIME_MS=5000
ALERT_DB_QUERY_TIME_MS=2000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key
```

### Kubernetes Health Checks

```yaml
livenessProbe:
  httpGet:
    path: /api/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Best Practices

1. **Log Levels**: Use appropriate log levels (debug for development, info for production)
2. **Metric Labels**: Keep metric labels cardinality low (avoid unique IDs)
3. **Alert Fatigue**: Configure appropriate thresholds to avoid alert spam
4. **Dashboard Review**: Regularly review dashboards for anomalies
5. **Slow Queries**: Investigate and optimize queries exceeding threshold
6. **Error Tracking**: Triage Sentry errors by frequency and impact
7. **Tenant Isolation**: Monitor per-tenant metrics for fair resource usage

## Troubleshooting

### High Memory Usage

1. Check Prometheus metrics: `process_resident_memory_bytes`
2. Review slow queries and optimize
3. Check for memory leaks in application code
4. Consider scaling horizontally

### High Error Rate

1. Check Grafana dashboard for error spike
2. Review Sentry for error details
3. Check logs for patterns: `docker-compose logs -f app`
4. Verify database/Redis connectivity

### Slow Queries

1. Check slow query logs
2. Review Prometheus database metrics
3. Add database indexes
4. Optimize query logic
5. Consider caching

### Service Down

1. Check health endpoints
2. Review logs: `docker-compose logs -f app`
3. Verify database connectivity: `docker-compose exec postgres pg_isready`
4. Verify Redis connectivity: `docker-compose exec redis redis-cli ping`

## Support

For issues or questions, contact the platform team or refer to the main README.
