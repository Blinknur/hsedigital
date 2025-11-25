# Monitoring & Observability Implementation Summary

## Overview

Successfully implemented comprehensive monitoring and observability for the HSE Digital platform with structured logging, metrics export, error tracking, health checks, alerting, and dashboards.

## Components Implemented

### 1. Structured JSON Logging (Pino)

**Files Created**:
- `server/utils/logger.js` - Core logger configuration with PII redaction
- `server/middleware/logging.js` - HTTP request/response logging middleware

**Features**:
- JSON-formatted logs with structured fields
- Automatic PII redaction (passwords, tokens, auth headers)
- Request/response logging with timing
- Slow query detection and logging
- Context-aware logging (tenant, user, organization)
- Configurable log levels via `LOG_LEVEL` env var

**Usage**:
```javascript
import { logger } from './utils/logger.js';
logger.info({ userId, action }, 'User logged in');
```

### 2. Health Check Endpoints

**Files Created**:
- `server/routes/health.js` - Health, readiness, and liveness endpoints

**Endpoints**:
- `GET /api/health` - Complete health status with DB/Redis connectivity
- `GET /api/ready` - Kubernetes readiness probe
- `GET /api/live` - Kubernetes liveness probe

**Response Example**:
```json
{
  "status": "healthy",
  "service": "hse-digital",
  "environment": "production",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" }
  },
  "uptime": 3600,
  "responseTime": "45ms"
}
```

### 3. Prometheus Metrics Export

**Files Created**:
- `server/utils/metrics.js` - Metric definitions and registry
- `server/middleware/metrics.js` - Request metrics collection middleware
- `server/routes/metrics.js` - Metrics export endpoint

**Metrics Exposed** (at `GET /metrics`):
- `hse_digital_http_request_duration_seconds` - Request latency histogram
- `hse_digital_http_requests_total` - Total requests counter
- `hse_digital_http_request_errors_total` - HTTP errors counter
- `hse_digital_active_connections` - Active connections gauge
- `hse_digital_database_query_duration_seconds` - DB query latency histogram
- `hse_digital_database_queries_total` - DB queries counter
- `hse_digital_cache_hits_total` / `cache_misses_total` - Cache metrics
- `hse_digital_rate_limit_hits_total` - Rate limit hits counter
- `hse_digital_auth_attempts_total` / `auth_failures_total` - Auth metrics
- `hse_digital_tenant_requests_total` - Per-tenant requests
- `hse_digital_tenant_latency_seconds` - Per-tenant latency
- `hse_digital_tenant_errors_total` - Per-tenant errors

**Labels**: All metrics include tenant_id for multi-tenant isolation tracking

### 4. Sentry Error Tracking Integration

**Files Created**:
- `server/utils/sentry.js` - Sentry initialization and utilities
- `server/middleware/sentry.js` - Sentry context middleware

**Features**:
- Automatic error capture with stack traces
- Performance monitoring and profiling
- User context tracking (user ID, email, role, organization)
- Tenant context tracking
- Breadcrumb tracking for request flow
- Automatic PII filtering (auth headers, cookies)
- Configurable sampling rates

**Environment Variables**:
```bash
SENTRY_DSN=https://your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### 5. Performance Monitoring for Database Queries

**Files Created**:
- `server/utils/prisma-instrumented.js` - Instrumented Prisma client

**Features**:
- Automatic query timing and logging
- Slow query detection (configurable threshold)
- Query error tracking
- Integration with Prometheus metrics
- Detailed query logging in development

**Environment Variables**:
```bash
SLOW_QUERY_THRESHOLD_MS=1000  # Default: 1 second
```

### 6. Alerting System

**Files Created**:
- `server/monitoring/alerts.js` - Alert manager with integrations

**Features**:
- Alert deduplication (5-minute cooldown)
- Slack webhook integration
- PagerDuty integration for critical alerts
- Multiple alert types (error rate, latency, DB issues, service down)
- Configurable thresholds

**Alert Types**:
- High error rate detection
- Slow response time alerts
- Slow database query alerts
- Critical error notifications
- Service down alerts

**Environment Variables**:
```bash
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_RESPONSE_TIME_MS=5000
ALERT_DB_QUERY_TIME_MS=2000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key
```

### 7. Grafana Dashboard & Prometheus Rules

**Files Created**:
- `server/monitoring/grafana/dashboard.json` - Pre-built Grafana dashboard
- `server/monitoring/grafana/prometheus-rules.yml` - Alert rules for Prometheus

**Dashboard Panels** (14 total):
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

**Prometheus Alert Rules** (11 rules):
- HighErrorRate (>5% for 2m) - Critical
- HighLatency (p95 >5s for 5m) - Warning
- DatabaseSlowQueries (p95 >2s for 5m) - Warning
- HighDatabaseErrorRate (>0.1/sec for 2m) - Critical
- ServiceDown (>1m) - Critical
- HighMemoryUsage (>1GB for 5m) - Warning
- HighAuthFailureRate (>0.5/sec for 2m) - Warning
- HighRateLimitHits (>1/sec for 5m) - Info
- LowCacheHitRate (<50% for 10m) - Info
- TenantHighErrorRate (>0.1/sec for 5m) - Warning
- TenantHighLatency (p95 >3s for 5m) - Warning

### 8. Docker Monitoring Stack

**Files Created**:
- `docker-compose.monitoring.yml` - Full monitoring stack with Prometheus, Grafana, Loki
- `prometheus.yml` - Prometheus configuration
- `promtail-config.yml` - Promtail log shipper configuration

**Services**:
- **app**: Node.js application (port 3001)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)
- **prometheus**: Metrics collection (port 9090)
- **grafana**: Visualization (port 3000)
- **loki**: Log aggregation (port 3100)
- **promtail**: Log shipper

**Quick Start**:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 9. Documentation

**Files Created**:
- `server/MONITORING.md` - Complete monitoring documentation
- `server/monitoring/README.md` - Quick reference guide
- `server/MONITORING_SETUP_SUMMARY.md` - This file

## Integration Points

### Modified Files

**`server/index.js`** - Main application file:
- Added Sentry initialization (first middleware)
- Added structured logging middleware (Pino)
- Added metrics collection middleware
- Added Sentry context middleware
- Replaced Prisma client with instrumented version
- Added health and metrics routes
- Enhanced error handler with logging and alerting
- Added graceful shutdown handling
- Added unhandled rejection/exception handlers

**`server/.env.example`** - Environment template:
- Added monitoring configuration variables
- Added Sentry configuration
- Added alerting configuration
- Added log level configuration

**`server/package.json`**:
- Added dependencies: pino, pino-http, prom-client, @sentry/node, @sentry/profiling-node

**`.gitignore`**:
- Added monitoring data directories (prometheus_data, grafana_data, loki_data)

**`AGENTS.md`**:
- Updated tech stack to include monitoring tools
- Updated services list with monitoring services
- Updated test command path

**`README.md`**:
- Added monitoring section
- Added health check endpoint documentation
- Added monitoring stack quick start
- Updated architecture section
- Added monitoring to tech stack

## Environment Variables

All monitoring features are configurable via environment variables. See `server/.env.example` for complete list.

**Key Variables**:
```bash
# Logging
LOG_LEVEL=info
SLOW_QUERY_THRESHOLD_MS=1000

# Sentry (Optional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Alerting (Optional)
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_RESPONSE_TIME_MS=5000
ALERT_DB_QUERY_TIME_MS=2000
SLACK_WEBHOOK_URL=
PAGERDUTY_INTEGRATION_KEY=
```

## Testing

**Created Test File**:
- `server/tests/monitoring.test.js` - Integration tests for monitoring endpoints

**Test Coverage**:
- Health endpoint validation
- Readiness endpoint validation
- Liveness endpoint validation
- Metrics endpoint validation
- Database connectivity
- Redis connectivity

**Run Tests**:
```bash
cd server && npm test
```

## Deployment

### Kubernetes Configuration

Health check endpoints are ready for Kubernetes:

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

### Production Checklist

- [ ] Set `LOG_LEVEL=info` in production
- [ ] Configure `SENTRY_DSN` for error tracking
- [ ] Set up `SLACK_WEBHOOK_URL` for alerts
- [ ] Configure `PAGERDUTY_INTEGRATION_KEY` for critical alerts
- [ ] Adjust alert thresholds based on traffic patterns
- [ ] Deploy Prometheus and Grafana stack
- [ ] Import Grafana dashboard from `server/monitoring/grafana/dashboard.json`
- [ ] Configure Prometheus alert rules from `server/monitoring/grafana/prometheus-rules.yml`
- [ ] Set up log aggregation (Loki or alternative)
- [ ] Configure metrics retention policies
- [ ] Set up regular dashboard reviews

## Architecture Benefits

1. **Observability**: Full visibility into system behavior
2. **Performance**: Identify bottlenecks and slow queries
3. **Reliability**: Early detection of issues via alerting
4. **Multi-tenancy**: Per-tenant metrics for fair usage tracking
5. **Security**: Auth failure tracking and anomaly detection
6. **Scalability**: Metrics-driven capacity planning
7. **Debugging**: Structured logs with full context
8. **Compliance**: Audit trail via structured logging

## Monitoring Endpoints Summary

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `/api/health` | Full health check | No |
| `/api/ready` | Readiness probe | No |
| `/api/live` | Liveness probe | No |
| `/metrics` | Prometheus metrics | No |

## Next Steps

1. **Configure Sentry**: Sign up and add DSN to environment
2. **Set up Alerting**: Configure Slack/PagerDuty webhooks
3. **Deploy Monitoring Stack**: Use docker-compose.monitoring.yml
4. **Import Dashboard**: Load Grafana dashboard from JSON
5. **Tune Thresholds**: Adjust alert thresholds based on real traffic
6. **Monitor & Iterate**: Review dashboards regularly and refine

## Support

For detailed documentation, see:
- [server/MONITORING.md](server/MONITORING.md) - Complete guide
- [server/monitoring/README.md](server/monitoring/README.md) - Quick reference
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Pino Documentation](https://getpino.io/)
