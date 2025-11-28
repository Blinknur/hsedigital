# Production Incident Response Toolkit

Comprehensive toolkit for managing production incidents in containerized environments.

## Overview

The incident response toolkit provides automated scripts and integrations for:
- **Zero-downtime container restarts** with health checks and connection draining
- **Database connection pool monitoring** with dynamic adjustment
- **Memory leak detection** with automated restart and heap dump creation
- **Log aggregation** for debugging production issues
- **Automated diagnostic collection** when critical alerts fire

## Components

### 1. Zero-Downtime Restart (`zero-downtime-restart.sh`)

Performs rolling restart of containers with health checks and connection draining.

**Usage:**
```bash
cd scripts/incident-response

# Restart app with default settings
./zero-downtime-restart.sh app

# Custom timeouts
./zero-downtime-restart.sh --timeout 180 --grace 60 app

# Force restart (emergency)
./zero-downtime-restart.sh --force app
```

**Options:**
- `-t, --timeout SECONDS`: Health check timeout (default: 120)
- `-g, --grace SECONDS`: Grace period before restart (default: 30)
- `-d, --drain SECONDS`: Connection drain timeout (default: 60)
- `-f, --force`: Skip health checks and force restart
- `-v, --verbose`: Verbose output

**Features:**
- Pre-restart health checks
- Active connection monitoring and draining
- Automatic database backup (for postgres restarts)
- Post-restart health verification
- Diagnostic data collection

### 2. Database Pool Monitor (`db-pool-monitor.sh`)

Monitors and adjusts database connection pool without redeployment.

**Usage:**
```bash
cd scripts/incident-response

# Check current pool status
./db-pool-monitor.sh status

# Adjust pool size
./db-pool-monitor.sh adjust 20

# Auto-optimize based on metrics
./db-pool-monitor.sh optimize

# Continuous monitoring
./db-pool-monitor.sh watch 10

# Check for alerts
./db-pool-monitor.sh alert-check --threshold 90

# Export metrics
./db-pool-monitor.sh export
```

**Commands:**
- `status`: Show current pool status with active/idle connections
- `adjust SIZE`: Adjust pool size (5-100 connections)
- `optimize`: Auto-optimize based on utilization patterns
- `watch [INTERVAL]`: Continuously monitor (default: 5s)
- `alert-check`: Check for pool exhaustion alerts
- `export`: Export pool metrics to JSON

**Metrics Monitored:**
- Active connections
- Idle connections
- Waiting connections
- Slow queries (>5s)
- Pool utilization percentage

### 3. Memory Leak Detector (`memory-leak-detector.sh`)

Detects memory leaks and optionally triggers automatic restarts.

**Usage:**
```bash
cd scripts/incident-response

# Quick memory check
./memory-leak-detector.sh check

# Continuous monitoring with auto-restart
./memory-leak-detector.sh monitor --auto-restart

# Create heap dump for analysis
./memory-leak-detector.sh heap-dump

# Custom threshold
./memory-leak-detector.sh check -t 2048
```

**Options:**
- `-c, --container NAME`: Container to monitor (default: hse_app)
- `-t, --threshold MB`: Memory threshold in MB (default: 1024)
- `-a, --auto-restart`: Automatically restart on leak detection

**Features:**
- Memory usage tracking over time
- Leak pattern detection (consistent growth)
- Heap snapshot creation for Chrome DevTools
- Automated restart on detection
- Pre-restart diagnostic collection

### 4. Log Aggregator (`log-aggregator.sh`)

Query and aggregate production logs for debugging.

**Usage:**
```bash
cd scripts/incident-response

# Show errors from last 30 minutes
./log-aggregator.sh errors 30

# Search for pattern
./log-aggregator.sh search "database connection"

# Filter by tenant
./log-aggregator.sh tenant org_abc123

# Show performance issues
./log-aggregator.sh performance

# Export all logs
./log-aggregator.sh export

# Tail logs in real-time
./log-aggregator.sh tail
```

**Commands:**
- `errors [MINUTES]`: Show errors from last N minutes (default: 60)
- `search PATTERN`: Search logs for pattern (case-insensitive)
- `tenant TENANT_ID`: Filter logs by tenant ID
- `performance`: Show slow queries and high latency requests
- `export`: Export logs to file
- `tail`: Tail logs in real-time

### 5. Alert Diagnostics (`alert-diagnostics.sh`)

Automatically collect diagnostic data when alerts fire.

**Usage:**
```bash
cd scripts/incident-response

# Collect diagnostics for alert type
./alert-diagnostics.sh database
./alert-diagnostics.sh memory
./alert-diagnostics.sh performance

# Full system diagnostic
./alert-diagnostics.sh full
```

**Collected Data:**
- Container status and stats
- Recent logs (app, database, redis)
- Database connection stats
- Memory usage breakdown
- Performance metrics
- Slow query analysis

**Output:**
- Individual files in `data/diagnostics/alert-{type}-{timestamp}/`
- Compressed archive: `alert-{type}-{timestamp}.tar.gz`

## Integration with Alerting System

### Automatic Diagnostic Collection

The toolkit integrates with the alerting service to automatically collect diagnostics when critical alerts fire.

**Alerting Service Integration:**

```javascript
import { incidentResponseService } from './incidentResponseService.js';

// In alertingService.js
async sendAlert({ type, severity, title, message, metadata, channels, tenantId }) {
    // ... existing alert logic ...
    
    if (severity === 'CRITICAL' || severity === 'ERROR') {
        await incidentResponseService.handleCriticalAlert(type, {
            severity, title, message, metadata, tenantId
        });
    }
}
```

### API Endpoints

**Get Incident History:**
```bash
GET /api/incident-response/incidents
```

Response:
```json
{
  "active": [
    {
      "id": "database_pool-1701234567890",
      "type": "database_pool",
      "startedAt": "2024-01-15T10:30:00Z",
      "status": "investigating",
      "diagnosticsPath": "/path/to/diagnostics"
    }
  ],
  "history": [...]
}
```

**Check Database Pool Health:**
```bash
GET /api/incident-response/pool-health
```

Response:
```json
{
  "alert": false,
  "usage_percent": 45,
  "active_connections": 9,
  "configured_size": 20,
  "threshold": 80,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Get Pool Metrics:**
```bash
GET /api/incident-response/pool-metrics
```

**Manually Trigger Diagnostic Collection:**
```bash
POST /api/incident-response/collect-diagnostics
Content-Type: application/json

{
  "alertType": "manual",
  "alertData": {
    "reason": "Investigating performance issue"
  }
}
```

**Resolve Incident:**
```bash
POST /api/incident-response/incidents/:incidentId/resolve
```

## Automated Responses

The system automatically responds to different alert types:

### Database Pool Exhaustion
- Collects pool diagnostics
- At 95% usage: Attempts pool optimization
- Creates diagnostic bundle

### Memory Alerts
- Creates heap dump for analysis
- Collects memory metrics
- At critical levels: Triggers zero-downtime restart

### High Error Rate
- Collects recent error logs
- Aggregates error patterns
- Creates diagnostic bundle

### Redis Failure
- Logs connection status
- Monitors application degradation
- Collects connection diagnostics

## Alert Thresholds

### Database Pool
- **70%**: WARNING - Monitor closely
- **85%**: ERROR - Consider scaling
- **95%**: CRITICAL - Immediate action required

### Memory
- **1024 MB**: Default threshold
- **20% growth**: Leak detection trigger
- **Consistent increase**: Pattern-based detection

### Error Rate
- **10 errors/min**: WARNING
- **50 errors/5min**: ERROR
- **100 errors/5min**: CRITICAL

## Best Practices

### Regular Monitoring
```bash
# Watch database pool health
./db-pool-monitor.sh watch 30

# Monitor memory continuously
./memory-leak-detector.sh monitor
```

### Incident Response Workflow

1. **Alert Fires** → Automatic diagnostic collection
2. **Review Diagnostics** → Check logs and metrics
3. **Apply Fix** → Use appropriate script
4. **Verify Resolution** → Monitor metrics
5. **Mark Resolved** → Update incident status

### Preventive Maintenance

```bash
# Daily health checks
./db-pool-monitor.sh status
./memory-leak-detector.sh check

# Weekly optimization
./db-pool-monitor.sh optimize

# Monthly analysis
./log-aggregator.sh performance > /tmp/perf-report.txt
```

## Diagnostic Data Storage

All diagnostic data is stored in:
```
data/
  diagnostics/
    incident-{timestamp}/
    alert-{type}-{timestamp}/
    heap-{timestamp}/
    logs-{timestamp}/
  backups/
    incident-{timestamp}/
```

**Data Retention:**
- Keep last 30 days of diagnostics
- Archive older data
- Clean up disk space regularly

## Troubleshooting

### Scripts Not Executable
```bash
chmod +x scripts/incident-response/*.sh
```

### Docker Permission Issues
```bash
# Add user to docker group
sudo usermod -aG docker $USER
```

### Missing Dependencies
```bash
# Install jq for JSON parsing
sudo apt-get install jq

# Install bc for calculations
sudo apt-get install bc
```

### Container Not Found
```bash
# Check container names
docker ps -a

# Update container names in scripts if needed
```

## Monitoring Dashboard Integration

### Prometheus Metrics

The incident response service exposes metrics:
- `hse_digital_incidents_total`
- `hse_digital_diagnostics_collected_total`
- `hse_digital_automated_responses_total`

### Grafana Alerts

Configure Grafana to trigger diagnostic collection:
```yaml
alert:
  - alert: HighDatabasePoolUsage
    expr: hse_digital_database_pool_usage > 85
    annotations:
      webhook: http://app:3001/api/incident-response/collect-diagnostics
```

## Emergency Procedures

### Critical Memory Leak
```bash
# 1. Create heap dump
./memory-leak-detector.sh heap-dump

# 2. Restart with zero downtime
./zero-downtime-restart.sh app

# 3. Monitor recovery
./memory-leak-detector.sh check
```

### Database Pool Exhaustion
```bash
# 1. Check current status
./db-pool-monitor.sh status -v

# 2. Increase pool size immediately
./db-pool-monitor.sh adjust 30

# 3. Restart to apply
./zero-downtime-restart.sh app
```

### High Error Rate
```bash
# 1. Collect recent errors
./log-aggregator.sh errors 15

# 2. Export full logs
./log-aggregator.sh export

# 3. Analyze patterns
grep -i "error" /path/to/logs.txt | sort | uniq -c
```

## See Also

- [Monitoring Setup](../monitoring/setup.md)
- [Security Overview](../security/overview.md)
- [Backup & Recovery](../deployment/backup-disaster-recovery.md)
- [Architecture Overview](../architecture/overview.md)
