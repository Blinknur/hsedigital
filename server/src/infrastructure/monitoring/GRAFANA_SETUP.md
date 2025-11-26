# Grafana Dashboard Setup Guide

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all services including Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Check services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### 2. Access Grafana

- **URL**: http://localhost:3000
- **Username**: `admin`
- **Password**: `admin123`

### 3. Dashboards Available

After login, navigate to **Dashboards** to find:

1. **HSE Digital - Platform Monitoring** (existing)
2. **HSE Digital - Tenant Monitoring** (new)
3. **HSE Digital - Cost Attribution** (new)
4. **HSE Digital - Feature Adoption** (new)

## Dashboard Overview

### 1. Tenant Monitoring Dashboard

**Purpose**: Track API usage, performance, and operational metrics per organization.

**Key Features**:
- Multi-tenant API request tracking
- Performance percentiles (p50, p95, p99)
- Error rates by tenant
- Real-time concurrent users
- Resource consumption
- Performance scores

**Use Cases**:
- Identify high-usage tenants
- Monitor SLA compliance
- Detect performance issues per tenant
- Track quota usage

### 2. Cost Attribution Dashboard

**Purpose**: Track resource costs and attribute them to specific tenants for billing.

**Key Features**:
- API call costs
- Storage costs
- Database operation costs
- Data transfer costs
- Monthly cost trends
- Cost breakdown by resource type

**Use Cases**:
- Generate billing reports
- Identify cost optimization opportunities
- Track ROI per customer
- Capacity planning

### 3. Feature Adoption Dashboard

**Purpose**: Track which features are being used and adoption rates.

**Key Features**:
- Feature usage by tenant
- Most popular features
- Feature adoption trends
- Audit & incident tracking
- Station & contractor management usage
- Feature growth rates

**Use Cases**:
- Product development priorities
- Customer success tracking
- Feature deprecation decisions
- Training needs identification

## Configuration

### Prometheus Data Source

The Prometheus datasource is automatically configured via provisioning at:
- `server/monitoring/grafana/provisioning/datasources/prometheus.yml`

### Dashboard Provisioning

Dashboards are automatically loaded from:
- `server/monitoring/grafana/provisioning/dashboards/dashboards.yml`

All dashboard JSON files in `server/monitoring/grafana/` are automatically imported.

### Custom Metrics

Add custom metrics in `server/utils/metrics.js`:

```javascript
export const myCustomMetric = new promClient.Counter({
  name: 'hse_digital_my_custom_metric',
  help: 'Description of my metric',
  labelNames: ['tenant_id', 'label1', 'label2']
});

register.registerMetric(myCustomMetric);
```

## Integration Guide

### Track Feature Usage

```javascript
import { trackFeatureUsage } from '../services/tenantMetrics.js';

// In your route handler
app.post('/api/audits', async (req, res) => {
  const { organizationId } = req.user;
  
  // Your logic here
  const audit = await createAudit(req.body);
  
  // Track the feature usage
  trackFeatureUsage(organizationId, 'audit_create', 'create');
  
  res.json(audit);
});
```

### Update Tenant Metrics

```javascript
import { updateTenantMetrics } from '../services/tenantMetrics.js';

// Update all metrics for a tenant
await updateTenantMetrics(tenantId);
```

### Track Quota Usage

```javascript
import { updateQuotaUsage } from '../services/tenantMetrics.js';

// Track API quota
await updateQuotaUsage(
  tenantId,
  'api_calls',
  currentApiCalls,
  maxApiCalls
);
```

See `server/monitoring/grafana/integration-example.js` for complete examples.

## Troubleshooting

### Dashboards Not Appearing

1. Check Grafana logs:
   ```bash
   docker logs hse_grafana
   ```

2. Verify volumes are mounted:
   ```bash
   docker inspect hse_grafana | grep -A 10 Mounts
   ```

3. Manually import dashboards:
   - Go to Dashboards → Import
   - Upload JSON files from `server/monitoring/grafana/`

### No Data in Panels

1. Check Prometheus targets:
   - Open http://localhost:9090/targets
   - Ensure `hse-digital` target is UP

2. Verify metrics endpoint:
   - Open http://localhost:3001/metrics
   - Check metrics are being exported

3. Check Prometheus query:
   - Open Grafana panel
   - Click "Query Inspector"
   - Run query directly in Prometheus

### Slow Queries

1. Reduce time range
2. Add more specific label filters
3. Use recording rules in Prometheus
4. Increase scrape interval for less critical metrics

## Customization

### Modify Existing Dashboards

1. **Via UI**:
   - Edit dashboard in Grafana
   - Save changes
   - Export JSON via Share → Export → Save to file
   - Replace JSON file in `server/monitoring/grafana/`

2. **Via JSON**:
   - Edit JSON file directly
   - Restart Grafana container:
     ```bash
     docker-compose -f docker-compose.monitoring.yml restart grafana
     ```

### Add New Dashboard

1. Create new JSON file: `server/monitoring/grafana/my-dashboard.json`
2. Follow existing dashboard structure
3. Restart Grafana to load new dashboard

### Add Variables

Variables allow filtering dashboard data:

```json
{
  "templating": {
    "list": [
      {
        "name": "tenant_id",
        "type": "query",
        "query": "label_values(metric_name, tenant_id)",
        "multi": true,
        "includeAll": true
      }
    ]
  }
}
```

## Best Practices

### Dashboard Design

1. **Group related metrics**: Use row panels to organize
2. **Consistent time ranges**: Use template variables
3. **Meaningful legends**: Use `{{label}}` format
4. **Appropriate visualizations**: 
   - Time series for trends
   - Gauges for current values
   - Pie charts for distributions
   - Tables for details

### Performance

1. **Limit time ranges**: Default to 6h or 24h
2. **Use recording rules**: Pre-compute complex queries
3. **Efficient queries**: Filter early, aggregate late
4. **Appropriate intervals**: Match query interval to scrape interval

### Alerts

Configure alerts in Grafana or Prometheus:

```yaml
# prometheus-rules.yml
- alert: HighTenantErrorRate
  expr: rate(hse_digital_tenant_errors_total[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High error rate for tenant {{ $labels.tenant_id }}"
```

## Maintenance

### Backup Dashboards

```bash
# Export all dashboards
docker exec hse_grafana grafana-cli admin export-dashboard > dashboards-backup.json
```

### Update Grafana

```bash
# Pull latest image
docker pull grafana/grafana:latest

# Restart with new image
docker-compose -f docker-compose.monitoring.yml up -d grafana
```

### Clean Old Data

Prometheus retains data based on retention period:

```yaml
# prometheus.yml
global:
  storage:
    tsdb:
      retention.time: 15d
      retention.size: 10GB
```

## Support

For issues or questions:
1. Check logs: `docker logs hse_grafana`
2. Review [Grafana Documentation](https://grafana.com/docs/)
3. Check [Prometheus Documentation](https://prometheus.io/docs/)
