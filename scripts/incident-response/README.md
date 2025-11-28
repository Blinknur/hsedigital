# Incident Response Toolkit

Quick reference for production incident response scripts.

## Quick Start

### Prerequisites
```bash
# Install dependencies
sudo apt-get install jq bc curl

# Ensure scripts are executable
chmod +x scripts/incident-response/*.sh
```

### Common Tasks

**Check system health:**
```bash
./db-pool-monitor.sh status
./memory-leak-detector.sh check
./log-aggregator.sh errors 30
```

**Restart application:**
```bash
./zero-downtime-restart.sh app
```

**Handle database pool exhaustion:**
```bash
./db-pool-monitor.sh status -v
./db-pool-monitor.sh adjust 25
```

**Investigate memory leak:**
```bash
./memory-leak-detector.sh heap-dump
./zero-downtime-restart.sh app
```

**Debug production issues:**
```bash
./log-aggregator.sh search "error pattern"
./log-aggregator.sh performance
./log-aggregator.sh export
```

## Scripts Overview

| Script | Purpose | Common Usage |
|--------|---------|--------------|
| `zero-downtime-restart.sh` | Restart containers safely | `./zero-downtime-restart.sh app` |
| `db-pool-monitor.sh` | Monitor/adjust DB pool | `./db-pool-monitor.sh status` |
| `memory-leak-detector.sh` | Detect memory leaks | `./memory-leak-detector.sh check` |
| `log-aggregator.sh` | Query production logs | `./log-aggregator.sh errors 60` |
| `alert-diagnostics.sh` | Collect diagnostics | `./alert-diagnostics.sh database` |

## Emergency Procedures

### Critical Alert Fired

1. Check what triggered it:
```bash
./log-aggregator.sh errors 15
```

2. Collect diagnostics:
```bash
./alert-diagnostics.sh full
```

3. If needed, restart:
```bash
./zero-downtime-restart.sh app
```

### Database Connection Errors

```bash
# Check pool status
./db-pool-monitor.sh status -v

# Increase pool size
./db-pool-monitor.sh adjust 30

# Apply with restart
./zero-downtime-restart.sh app
```

### High Memory Usage

```bash
# Create heap dump for analysis
./memory-leak-detector.sh heap-dump

# Restart if critical
./zero-downtime-restart.sh --force app
```

## Integration with Monitoring

The scripts integrate with the alerting service. Critical alerts automatically trigger diagnostic collection.

**API endpoints:**
- `GET /api/incident-response/incidents` - View incidents
- `GET /api/incident-response/pool-health` - Check pool health
- `POST /api/incident-response/collect-diagnostics` - Manual collection

## Documentation

Full documentation: [docs/operations/incident-response-toolkit.md](../../docs/operations/incident-response-toolkit.md)

## Support

For issues or questions, check the main documentation or contact the platform team.
