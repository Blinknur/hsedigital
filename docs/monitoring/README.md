# Monitoring Documentation

Observability, monitoring, and alerting documentation.

## Documents

- **[Monitoring Overview](./overview.md)** - Complete monitoring guide
- **[Setup Guide](./setup.md)** - Monitoring stack setup
- **[Distributed Tracing](./tracing.md)** - OpenTelemetry tracing
- **[Tracing Examples](./tracing-examples.md)** - Tracing implementation examples

## Monitoring Stack

### Logging
- **Pino** - Structured JSON logging
- **Loki** - Log aggregation (optional)
- PII redaction
- Request/response logging

### Metrics
- **Prometheus** - Metrics collection
- Custom application metrics
- System metrics
- Per-tenant metrics

### Error Tracking
- **Sentry** - Error and performance tracking
- Source maps support
- User context tracking
- Tenant-specific error fingerprinting

### Tracing
- **OpenTelemetry** - Distributed tracing
- **Jaeger** - Tracing UI
- Automatic instrumentation
- Custom spans

### Dashboards
- **Grafana** - Pre-built dashboards
- Real-time metrics visualization
- Alerting rules

### Alerting
- **Slack** - Team notifications
- **PagerDuty** - On-call alerting
- Custom alert rules

## Quick Start

### Start Monitoring Stack
```bash
# Start with full monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access UIs
open http://localhost:3000      # Grafana (admin/admin123)
open http://localhost:9090      # Prometheus
open http://localhost:16686     # Jaeger
```

### Health Check Endpoints
```bash
# Complete health check
curl http://localhost:3001/api/health

# Readiness probe
curl http://localhost:3001/api/ready

# Liveness probe
curl http://localhost:3001/api/live

# Prometheus metrics
curl http://localhost:3001/metrics
```

## Key Metrics

### Application Metrics
- `hse_digital_http_request_duration_seconds` - Request latency
- `hse_digital_http_requests_total` - Total requests
- `hse_digital_http_request_errors_total` - Error count
- `hse_digital_active_connections` - Active connections

### Database Metrics
- `hse_digital_database_query_duration_seconds` - Query latency
- `hse_digital_database_queries_total` - Query count

### Cache Metrics
- `hse_digital_cache_hits_total` - Cache hits
- `hse_digital_cache_misses_total` - Cache misses

### Tenant Metrics
- `hse_digital_tenant_requests_total` - Per-tenant requests
- `hse_digital_tenant_latency_seconds` - Per-tenant latency
- `hse_digital_tenant_errors_total` - Per-tenant errors

## Configuration

### Environment Variables
```bash
# Logging
LOG_LEVEL=info

# Sentry
SENTRY_DSN=https://...
SENTRY_TRACES_SAMPLE_RATE=0.1

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_INTEGRATION_KEY=...
ALERT_ERROR_RATE_THRESHOLD=0.05
```

## Grafana Dashboards

Pre-built dashboard available at `server/monitoring/grafana/dashboard.json`

**Key Panels:**
1. Request Rate
2. Error Rate
3. Request Latency (p50, p95, p99)
4. Database Performance
5. Cache Hit Rate
6. Tenant Metrics

**Import Dashboard:**
1. Open Grafana: http://localhost:3000
2. Login: admin/admin123
3. Import `server/monitoring/grafana/dashboard.json`

## Alerting Rules

**Critical Alerts:**
- High error rate (>5% for 2 minutes)
- Service down (1 minute)
- Database slow queries (>2s for 5 minutes)
- High latency (>5s for 5 minutes)

**Warning Alerts:**
- High auth failure rate
- Low cache hit rate
- High rate limit hits
- Tenant high latency

## Troubleshooting

### High Error Rate
1. Check Grafana dashboard
2. Review Sentry for error details
3. Check logs: `docker-compose logs -f app`
4. Verify DB/Redis connectivity

### Slow Queries
1. Check Prometheus database metrics
2. Review slow query logs
3. Add database indexes
4. Optimize query logic

### High Memory Usage
1. Check Prometheus metrics
2. Review slow queries
3. Check for memory leaks
4. Consider horizontal scaling

## Quick Links

- [Complete Monitoring Guide](./overview.md)
- [Tracing Setup](./tracing.md)
- [Alerting Configuration](./overview.md#alerting-system)
