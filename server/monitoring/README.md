# Tenant-Specific Monitoring & Cost Attribution

This directory contains comprehensive monitoring dashboards for tenant-specific tracking, including API usage patterns, feature adoption metrics, performance percentiles, error rates, and cost attribution.

## Overview

The HSE Digital platform provides three custom Grafana dashboards for tenant-specific monitoring:

1. **Tenant Monitoring Dashboard** - Per-organization API usage, performance, and reliability metrics
2. **Cost Attribution Dashboard** - Resource cost tracking and billing attribution per tenant
3. **Feature Adoption Dashboard** - Feature usage patterns and adoption metrics

## Dashboards

### 1. Tenant Monitoring Dashboard (`tenant-monitoring-dashboard.json`)

**Purpose**: Track per-tenant API usage patterns, performance metrics, and operational health.

**Key Panels**:
- API Requests by Tenant (per minute)
- API Requests by HTTP Method
- Request Latency Percentiles (p50, p95, p99)
- Error Rate by Tenant
- Feature Usage by Tenant
- Data Storage by Tenant
- Concurrent Users
- Resource Cost Estimates
- Performance Score (0-100)
- Quota Usage Percentage

**Variables**:
- `tenant_id`: Filter by organization ID
- `interval`: Time aggregation interval

### 2. Cost Attribution Dashboard (`cost-attribution-dashboard.json`)

**Purpose**: Track resource consumption and attribute costs to specific tenants for billing and capacity planning.

**Key Panels**:
- Total Estimated Cost by Tenant
- Cost by Resource Type (storage, compute, network)
- Cost Distribution (pie chart)
- Monthly Cost Trends
- API Call Volume & Estimated Cost
- Data Storage (GB) & Storage Cost
- Database Operations & Database Cost
- Data Transfer (GB) & Transfer Cost
- Cost Summary Table

**Cost Factors**:
- API calls: $0.0001 per call
- Database queries: $0.0002 per query
- Storage: $0.10 per GB/month
- Data transfer: $0.05 per GB
- Cache operations: $0.00001 per operation

### 3. Feature Adoption Dashboard (`feature-adoption-dashboard.json`)

**Purpose**: Track feature usage patterns and adoption rates across tenants.

**Key Panels**:
- Feature Usage by Tenant
- Most Popular Features (top 10)
- Feature Adoption Rate
- Total Feature Usage Count
- Active Features per Tenant
- Feature Usage Distribution (pie chart)
- Feature Usage Heatmap
- Audit Creation & Completion Rates
- Incident Reporting & Resolution Rates
- Station & Contractor Management Usage
- New Feature Adoption (last 7 days)
- Feature Growth Rate

**Variables**:
- `tenant_id`: Filter by organization ID
- `feature`: Filter by feature name

## Metrics Collected

### API Usage Metrics
- `hse_digital_tenant_api_calls_total`: Total API calls per tenant
- `hse_digital_tenant_requests_total`: Total requests per endpoint
- `hse_digital_tenant_latency_seconds`: Request latency histogram

### Performance Metrics
- `hse_digital_tenant_latency_seconds_bucket`: Latency percentiles
- `hse_digital_tenant_performance_score`: Overall performance score (0-100)
- `hse_digital_tenant_errors_total`: Error count by type

### Feature Usage Metrics
- `hse_digital_tenant_feature_usage_total`: Feature usage counter
- `hse_digital_tenant_concurrent_users`: Active concurrent users

### Resource & Cost Metrics
- `hse_digital_tenant_data_storage_bytes`: Storage usage in bytes
- `hse_digital_tenant_resource_cost_estimate`: Estimated cost by resource type
- `hse_digital_tenant_data_transfer_bytes_total`: Data transfer by direction
- `hse_digital_tenant_database_operations_total`: Database operation count
- `hse_digital_tenant_cache_operations_total`: Cache operation count
- `hse_digital_tenant_quota_usage_percent`: Quota usage percentage

### Subscription Metrics
- `hse_digital_tenant_subscription_plan`: Subscription tier (0=free, 1=basic, 2=premium, 3=enterprise)

## Setup

### Prerequisites
- Docker and Docker Compose
- Prometheus for metrics collection
- Grafana for visualization

### Installation

1. **Start monitoring stack**:
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Access Grafana**:
   - URL: http://localhost:3000
   - Username: `admin`
   - Password: `admin123`

3. **Dashboards are auto-provisioned** via the provisioning directory.

### Manual Dashboard Import

If auto-provisioning doesn't work:

1. Log into Grafana
2. Go to Dashboards → Import
3. Upload JSON files:
   - `tenant-monitoring-dashboard.json`
   - `cost-attribution-dashboard.json`
   - `feature-adoption-dashboard.json`

## Usage

### Tracking Feature Usage

In your application code, track feature usage:

```javascript
import { trackFeatureUsage } from '../services/tenantMetrics.js';

// Track when a user creates an audit
trackFeatureUsage(organizationId, 'audit_create', 'create');

// Track when a user views incidents
trackFeatureUsage(organizationId, 'incident_view', 'view');

// Track when a user manages stations
trackFeatureUsage(organizationId, 'station_manage', 'update');
```

### Updating Tenant Metrics

Metrics are automatically collected every 5 minutes. To manually trigger:

```javascript
import { updateTenantMetrics, calculatePerformanceScore } from '../services/tenantMetrics.js';

await updateTenantMetrics(tenantId);
await calculatePerformanceScore(tenantId);
```

### Tracking Quota Usage

```javascript
import { updateQuotaUsage } from '../services/tenantMetrics.js';

// Update API quota usage
await updateQuotaUsage(tenantId, 'api_calls', currentCalls, maxCalls);

// Update storage quota
await updateQuotaUsage(tenantId, 'storage', usedBytes, limitBytes);
```

## Dashboard Queries

### Example PromQL Queries

**API requests per tenant (last hour)**:
```promql
sum(increase(hse_digital_tenant_api_calls_total[1h])) by (tenant_id)
```

**P95 latency by tenant**:
```promql
histogram_quantile(0.95, 
  sum(rate(hse_digital_tenant_latency_seconds_bucket[5m])) by (tenant_id, le)
)
```

**Total cost estimate per tenant**:
```promql
sum(hse_digital_tenant_resource_cost_estimate) by (tenant_id)
```

**Feature adoption rate**:
```promql
count(count(hse_digital_tenant_feature_usage_total) by (tenant_id))
```

## Alerts

Prometheus alerting rules are configured in `prometheus-rules.yml`:

- High error rate per tenant
- High latency per tenant
- Quota usage exceeding thresholds
- Cost anomalies
- Feature adoption drops

## Cost Attribution Model

Cost estimates are calculated based on:

1. **API Usage**: Number of API calls × $0.0001
2. **Database Operations**: Number of queries × $0.0002
3. **Storage**: GB stored × $0.10/month
4. **Data Transfer**: GB transferred × $0.05
5. **Cache Operations**: Operations × $0.00001

These are estimates for capacity planning and can be adjusted in `server/services/tenantMetrics.js`.

## Performance Optimization

To optimize dashboard performance:

1. **Use appropriate time ranges**: Shorter ranges load faster
2. **Filter by tenant**: Use tenant_id variable to reduce data
3. **Adjust scrape intervals**: Increase intervals for less critical metrics
4. **Use recording rules**: Pre-compute expensive queries in Prometheus

## Troubleshooting

### Dashboards not appearing
- Check Grafana logs: `docker logs hse_grafana`
- Verify provisioning directory is mounted correctly
- Ensure JSON files are valid

### No data in panels
- Check Prometheus is scraping metrics: http://localhost:9090/targets
- Verify application is exposing metrics at `/metrics` endpoint
- Check Prometheus datasource configuration in Grafana

### Slow queries
- Reduce time range
- Add more specific filters
- Use recording rules for complex queries
- Increase Prometheus resources

## Development

### Adding New Metrics

1. Define metric in `server/utils/metrics.js`
2. Track metric in appropriate middleware/service
3. Register metric with Prometheus registry
4. Create dashboard panel with PromQL query

### Modifying Dashboards

1. Edit JSON files directly, or
2. Modify in Grafana UI and export JSON
3. Update provisioning files
4. Restart Grafana container

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
