# HSE Digital Monitoring Stack

## Quick Start

### Development (Local)

```bash
# Start the application with monitoring
npm run dev

# Access monitoring endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/ready
curl http://localhost:3001/api/live
curl http://localhost:3001/metrics
```

### Production (Docker with Full Monitoring Stack)

```bash
# Start full monitoring stack (app + prometheus + grafana + loki)
docker-compose -f docker-compose.monitoring.yml up -d

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f app

# Check health
curl http://localhost:3001/api/health

# Access dashboards
open http://localhost:3000  # Grafana (admin/admin123)
open http://localhost:9090  # Prometheus
```

## Components

### Application Monitoring

- **Structured Logging**: JSON logs with Pino
- **Metrics Export**: Prometheus metrics at `/metrics`
- **Error Tracking**: Sentry integration (optional)
- **Health Checks**: `/api/health`, `/api/ready`, `/api/live`
- **Slow Query Detection**: Automatic logging of slow database queries
- **Alerting**: Slack and PagerDuty integration

### External Monitoring Services

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Promtail**: Log shipping

## Architecture

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌────────────────────────────────┐ │
│  │  Middleware Stack:             │ │
│  │  • Sentry Request Handler      │ │
│  │  • HTTP Logger (Pino)          │ │
│  │  • Metrics Collector           │ │
│  │  • Sentry Context              │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌────────────────────────────────┐ │
│  │  Instrumented Prisma Client    │ │
│  │  • Query timing                │ │
│  │  • Slow query detection        │ │
│  │  • Error tracking              │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
       │         │         │
       ▼         ▼         ▼
   Logs      Metrics    Errors
     │          │          │
     ▼          ▼          ▼
  Loki    Prometheus   Sentry
     │          │
     └────┬─────┘
          ▼
       Grafana
```

## Metrics Collected

### HTTP Metrics
- `hse_digital_http_request_duration_seconds` - Request latency (histogram)
- `hse_digital_http_requests_total` - Total requests (counter)
- `hse_digital_http_request_errors_total` - Errors (counter)
- `hse_digital_active_connections` - Active connections (gauge)

### Database Metrics
- `hse_digital_database_query_duration_seconds` - Query latency (histogram)
- `hse_digital_database_queries_total` - Total queries (counter)

### Cache Metrics
- `hse_digital_cache_hits_total` - Cache hits (counter)
- `hse_digital_cache_misses_total` - Cache misses (counter)

### Security Metrics
- `hse_digital_rate_limit_hits_total` - Rate limit hits (counter)
- `hse_digital_auth_attempts_total` - Auth attempts (counter)
- `hse_digital_auth_failures_total` - Auth failures (counter)

### Tenant Metrics
- `hse_digital_tenant_requests_total` - Per-tenant requests (counter)
- `hse_digital_tenant_latency_seconds` - Per-tenant latency (histogram)
- `hse_digital_tenant_errors_total` - Per-tenant errors (counter)

## Alert Rules

See `grafana/prometheus-rules.yml` for all alert rules.

### Critical Alerts
- **HighErrorRate**: Error rate > 5% for 2 minutes
- **ServiceDown**: Service unreachable for 1 minute
- **HighDatabaseErrorRate**: DB errors > 0.1/sec for 2 minutes

### Warning Alerts
- **HighLatency**: P95 latency > 5s for 5 minutes
- **DatabaseSlowQueries**: P95 query time > 2s for 5 minutes
- **HighMemoryUsage**: Memory > 1GB for 5 minutes
- **HighAuthFailureRate**: Auth failures > 0.5/sec for 2 minutes
- **TenantHighErrorRate**: Tenant errors > 0.1/sec for 5 minutes

### Info Alerts
- **HighRateLimitHits**: Rate limits > 1/sec for 5 minutes
- **LowCacheHitRate**: Cache hit rate < 50% for 10 minutes

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error
SLOW_QUERY_THRESHOLD_MS=1000      # Threshold for slow query alerts

# Sentry (Error Tracking)
SENTRY_DSN=                       # Sentry DSN URL
SENTRY_TRACES_SAMPLE_RATE=0.1     # Trace sampling rate (0-1)
SENTRY_PROFILES_SAMPLE_RATE=0.1   # Profile sampling rate (0-1)

# Alerting Thresholds
ALERT_ERROR_RATE_THRESHOLD=0.05   # 5% error rate
ALERT_RESPONSE_TIME_MS=5000       # 5 seconds
ALERT_DB_QUERY_TIME_MS=2000       # 2 seconds
ALERT_RATE_LIMIT_HITS=100         # 100 hits

# Alert Integrations
SLACK_WEBHOOK_URL=                # Slack webhook for alerts
PAGERDUTY_INTEGRATION_KEY=        # PagerDuty integration key
```

## Dashboards

### Grafana Dashboard

Pre-configured dashboard includes:
- Request rate and error rate
- Latency percentiles (p50, p95, p99)
- Active connections
- Database query performance
- Cache hit rate
- Rate limit hits
- Authentication metrics
- Per-tenant metrics
- System resource usage

**Import**: Upload `grafana/dashboard.json` to Grafana

## Best Practices

1. **Set appropriate alert thresholds** for your traffic patterns
2. **Monitor slow queries** and optimize regularly
3. **Review error rates** by tenant for fair resource usage
4. **Configure Sentry** for detailed error tracking
5. **Set up Slack/PagerDuty** for critical alerts
6. **Review dashboards** regularly for anomalies
7. **Keep metric cardinality low** - avoid high-cardinality labels

## Troubleshooting

### No metrics appearing in Prometheus

1. Check app is exposing metrics: `curl http://localhost:3001/metrics`
2. Verify Prometheus config: `docker-compose -f docker-compose.monitoring.yml exec prometheus cat /etc/prometheus/prometheus.yml`
3. Check Prometheus targets: http://localhost:9090/targets

### High memory usage

1. Check Prometheus metrics: `process_resident_memory_bytes`
2. Review slow query logs
3. Check for database connection leaks
4. Consider horizontal scaling

### Alerts not firing

1. Verify Prometheus alert rules loaded: http://localhost:9090/rules
2. Check alert thresholds in environment variables
3. Verify Slack/PagerDuty credentials
4. Check alert cooldown period (5 minutes default)

## Development

### Testing Locally

```bash
# Start dependencies
docker-compose up -d postgres redis

# Run application
npm run dev

# Generate some traffic
curl http://localhost:3001/api/health
curl http://localhost:3001/metrics

# View logs
tail -f logs/app.log
```

### Adding New Metrics

1. Define metric in `utils/metrics.js`
2. Register metric in registry
3. Instrument code to collect metric
4. Update Grafana dashboard
5. Add alert rules if needed

Example:
```javascript
// utils/metrics.js
export const myMetric = new promClient.Counter({
  name: 'hse_digital_my_metric_total',
  help: 'Description of my metric',
  labelNames: ['label1', 'label2']
});

register.registerMetric(myMetric);

// In your code
myMetric.inc({ label1: 'value1', label2: 'value2' });
```

## Support

See main [MONITORING.md](../MONITORING.md) for detailed documentation.
