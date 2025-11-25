# Grafana Tenant Monitoring Dashboards

Comprehensive Grafana dashboards for tenant-specific monitoring in the HSE Digital multi-tenant platform.

## Available Dashboards

### 1. Tenant API Usage Patterns
**File:** `tenant-api-usage-dashboard.json`  
**UID:** `hse-tenant-api-usage`  
**Purpose:** Monitor API usage patterns across tenants

**Features:**
- Total API calls by tenant with filtering
- HTTP method distribution (GET, POST, PUT, DELETE)
- Top 10 most called endpoints
- Status code distribution (2xx, 4xx, 5xx)
- Response time percentiles (p50, p95, p99)
- Error rate tracking
- Peak usage time analysis
- Concurrent user monitoring
- Real-time request rate metrics

**Use Cases:**
- Identify high-traffic tenants
- Monitor API consumption patterns
- Detect anomalous usage spikes
- Track endpoint popularity
- Analyze traffic patterns for capacity planning

### 2. Tenant Performance & SLA Monitoring
**File:** `tenant-performance-dashboard.json`  
**UID:** `hse-tenant-performance`  
**Purpose:** Track performance metrics and SLA compliance per tenant

**Features:**
- Performance score gauge (0-100)
- Response time percentiles (p50, p95, p99) by tenant
- Error rate tracking and percentage
- Success rate gauges with SLA thresholds
- Quota usage monitoring
- Database operations per tenant
- Real-time performance trends

**SLA Thresholds:**
- Success Rate: 99%+ (green), 95-99% (yellow), <95% (red)
- p95 Response Time: <500ms (green), 500ms-1s (yellow), >1s (red)
- p99 Response Time: <1s (green), 1-2s (yellow), >2s (red)

**Use Cases:**
- Monitor SLA compliance
- Identify performance degradation
- Track tenant-specific latency issues
- Validate performance improvements

### 3. Comprehensive Tenant Analytics
**File:** `comprehensive-tenant-dashboard.json`  
**UID:** `hse-comprehensive-tenant`  
**Purpose:** Single-pane view of all tenant metrics

**Features:**
- Health summary with key metrics
- API usage patterns
- Feature adoption tracking
- Performance percentiles
- Error type analysis
- Resource usage (storage, database, cache)
- Cost estimates by resource type
- Quota usage indicators
- Concurrent user counts

**Use Cases:**
- Executive dashboards
- Customer success monitoring
- Quick health checks
- Tenant onboarding tracking

### 4. Feature Adoption Dashboard
**File:** `feature-adoption-dashboard.json`  
**UID:** `hse-feature-adoption`  
**Purpose:** Track feature usage and adoption rates

**Features:**
- Feature usage trends by tenant
- Most popular features (top 10)
- Feature adoption rate statistics
- Active features per tenant
- Feature usage distribution (pie chart)
- Usage heatmaps
- Audit feature tracking (creation/completion)
- Incident management metrics
- Station & contractor management usage
- Feature growth rate analysis

**Use Cases:**
- Product development prioritization
- Feature deprecation decisions
- Customer training needs identification
- ROI analysis for features

### 5. Cost Attribution Dashboard
**File:** `cost-attribution-dashboard.json`  
**UID:** `hse-cost-attribution`  
**Purpose:** Track and attribute costs to tenants for billing

**Features:**
- Total estimated cost by tenant
- Cost breakdown by resource type
- Cost distribution pie charts
- Monthly cost trends
- API call volume and costs
- Storage usage and costs ($/GB/month)
- Database operation costs
- Data transfer costs (ingress/egress)
- Cost summary tables

**Cost Estimates:**
- API Call: $0.0001 per call
- Database Query: $0.0002 per query
- Storage: $0.10 per GB/month
- Data Transfer: $0.05 per GB
- Cache Operation: $0.00001 per operation

**Use Cases:**
- Generate billing reports
- Identify cost optimization opportunities
- Track per-customer ROI
- Capacity planning
- Budget forecasting

### 6. Tenant Monitoring Dashboard (Legacy)
**File:** `tenant-monitoring-dashboard.json`  
**UID:** `hse-tenant-monitoring`  
**Purpose:** Original comprehensive tenant monitoring

## Dashboard Variables

All dashboards support the following template variables:

### tenant_id
- **Type:** Query-based dropdown
- **Query:** `label_values(hse_digital_tenant_api_calls_total, tenant_id)`
- **Multi-select:** Yes (most dashboards)
- **Include All:** Yes (most dashboards)
- **Purpose:** Filter data by specific tenant(s)

### endpoint
- **Type:** Query-based dropdown (API usage dashboards)
- **Query:** `label_values(hse_digital_tenant_api_calls_total{tenant_id=~"$tenant_id"}, endpoint)`
- **Multi-select:** Yes
- **Purpose:** Filter by specific API endpoints

### interval
- **Type:** Interval selector
- **Options:** 1m, 5m, 10m, 30m, 1h, 6h, 12h, 1d
- **Auto:** Yes (adapts to time range)
- **Purpose:** Control aggregation granularity

### feature
- **Type:** Query-based dropdown (feature adoption)
- **Query:** `label_values(hse_digital_tenant_feature_usage_total, feature)`
- **Purpose:** Filter by specific features

## Automated Provisioning

### Configuration Files

**Datasource:** `provisioning/datasources/prometheus.yml`
```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
```

**Dashboards:** `provisioning/dashboards/provisioning.yml`
```yaml
apiVersion: 1
providers:
  - name: 'HSE Digital Dashboards'
    folder: 'Tenant Monitoring'
    type: file
    options:
      path: /etc/grafana/provisioning/dashboards
```

### Docker Volume Mounts

In `docker-compose.monitoring.yml`:
```yaml
grafana:
  volumes:
    - ./server/monitoring/grafana:/etc/grafana/provisioning/dashboards
    - ./server/monitoring/grafana/provisioning/datasources:/etc/grafana/provisioning/datasources
    - ./server/monitoring/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards
```

### Auto-Loading

1. All `*.json` files in `server/monitoring/grafana/` are automatically loaded
2. Dashboards refresh every 10 seconds (`updateIntervalSeconds: 10`)
3. UI updates are allowed (`allowUiUpdates: true`)
4. Dashboards are organized in "Tenant Monitoring" folder

## Metrics Reference

### API Metrics
- `hse_digital_tenant_api_calls_total` - Total API calls counter
- `hse_digital_tenant_latency_seconds` - Response time histogram
- `hse_digital_tenant_errors_total` - Error count by type
- `hse_digital_http_request_duration_seconds` - HTTP request duration

### Feature Metrics
- `hse_digital_tenant_feature_usage_total` - Feature usage counter

### Performance Metrics
- `hse_digital_tenant_performance_score` - Overall performance score (0-100)
- `hse_digital_tenant_concurrent_users` - Active users gauge

### Resource Metrics
- `hse_digital_tenant_data_storage_bytes` - Storage usage by data type
- `hse_digital_tenant_database_operations_total` - DB operation counter
- `hse_digital_tenant_cache_operations_total` - Cache operation counter
- `hse_digital_tenant_data_transfer_bytes_total` - Data transfer counter

### Cost Metrics
- `hse_digital_tenant_resource_cost_estimate` - Estimated cost by resource type

### Quota Metrics
- `hse_digital_tenant_quota_usage_percent` - Quota usage percentage
- `hse_digital_tenant_subscription_plan` - Subscription plan indicator

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify Grafana is running
docker-compose -f docker-compose.monitoring.yml ps grafana

# Check logs
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### 2. Access Grafana

- **URL:** http://localhost:3000
- **Username:** admin
- **Password:** admin123

### 3. Navigate to Dashboards

1. Click "Dashboards" in the left sidebar
2. Select "Browse"
3. Open "Tenant Monitoring" folder
4. Choose a dashboard

### 4. Select Tenant

1. Use the "Tenant/Organization" dropdown at the top
2. Select one or more tenants
3. Adjust time range as needed
4. Modify interval for aggregation

## Customization

### Modify Existing Dashboard

1. **Via Grafana UI:**
   - Open dashboard
   - Click settings icon (gear) → "JSON Model"
   - Make changes
   - Copy JSON
   - Save to file: `server/monitoring/grafana/dashboard-name.json`

2. **Via File:**
   - Edit JSON file directly
   - Restart Grafana: `docker-compose -f docker-compose.monitoring.yml restart grafana`

### Add New Panel

```json
{
  "title": "My Custom Panel",
  "type": "timeseries",
  "id": 99,
  "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
  "targets": [
    {
      "expr": "your_prometheus_query",
      "legendFormat": "{{label}}"
    }
  ]
}
```

### Panel Types

- **timeseries** - Time-series line/area charts
- **stat** - Single value with sparkline
- **gauge** - Gauge/dial visualization
- **bargauge** - Horizontal/vertical bar gauges
- **piechart** - Pie/donut charts
- **table** - Tabular data
- **heatmap** - Heat map visualization
- **row** - Collapsible row container

## Alert Configuration

Alerts are configured in `prometheus-rules.yml`. Example tenant alerts:

```yaml
groups:
  - name: tenant_alerts
    interval: 30s
    rules:
      - alert: HighTenantErrorRate
        expr: |
          (sum(rate(hse_digital_tenant_errors_total[5m])) by (tenant_id) 
          / sum(rate(hse_digital_tenant_api_calls_total[5m])) by (tenant_id)) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate for tenant {{ $labels.tenant_id }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

## Best Practices

### Dashboard Design
1. Use consistent time ranges across panels
2. Group related metrics with row panels
3. Place most important metrics at the top
4. Use appropriate visualization types
5. Add meaningful panel descriptions

### Performance
1. Limit time ranges (default: 6-24h)
2. Use appropriate intervals for aggregation
3. Avoid overly complex queries
4. Use recording rules for expensive queries
5. Limit number of series in panels

### Query Optimization
1. Filter early with label selectors
2. Use rate() for counters
3. Aggregate with sum/avg/max by labels
4. Use histogram_quantile() for percentiles
5. Avoid regex when possible

## Troubleshooting

### No Data in Panels

1. **Check Prometheus connection:**
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. **Verify metrics endpoint:**
   ```bash
   curl http://localhost:3001/metrics
   ```

3. **Check Prometheus queries:**
   - Open panel edit mode
   - Click "Query Inspector"
   - Test query in Prometheus UI

### Dashboards Not Loading

1. **Check Grafana logs:**
   ```bash
   docker logs hse_grafana
   ```

2. **Verify volume mounts:**
   ```bash
   docker inspect hse_grafana | grep -A 10 Mounts
   ```

3. **Validate JSON:**
   ```bash
   cat dashboard.json | jq .
   ```

### Slow Queries

1. Reduce time range
2. Increase interval
3. Add more specific label filters
4. Check Prometheus performance
5. Consider recording rules

## Maintenance

### Backup Dashboards

```bash
# Backup all JSON files
tar -czf grafana-dashboards-$(date +%Y%m%d).tar.gz server/monitoring/grafana/*.json
```

### Update Grafana

```bash
# Pull latest image
docker pull grafana/grafana:latest

# Restart with new image
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

### Export Dashboard

1. Open dashboard in Grafana
2. Click share icon
3. Go to "Export" tab
4. Click "Save to file"
5. Save as `.json` in `server/monitoring/grafana/`

## Support

For issues or questions:
1. Check [Grafana Documentation](https://grafana.com/docs/)
2. Review [Prometheus Documentation](https://prometheus.io/docs/)
3. See `server/monitoring/GRAFANA_SETUP.md` for detailed setup
4. Check existing dashboards for examples
