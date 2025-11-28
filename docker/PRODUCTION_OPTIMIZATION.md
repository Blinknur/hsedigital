# Production Docker Runtime Optimization

Comprehensive guide for production Docker deployment with enhanced security, performance, and monitoring.

## Overview

This document covers the production optimizations implemented for the HSE Digital platform:

1. **Read-only root filesystem** - Enhanced container security
2. **Non-root user execution** - Principle of least privilege
3. **Graceful shutdown handling** - Proper signal handling for containerized environments
4. **Memory optimization** - Node.js tuning for container constraints
5. **Resource monitoring** - Container resource usage dashboards

## Security Hardening

### Read-Only Root Filesystem

The application container runs with a read-only root filesystem (`read_only: true`) to prevent runtime modifications.

**Writable Volumes:**
- `/app/server/public/uploads` - User uploaded files
- `/app/server/public/reports` - Generated PDF reports
- `/app/logs` - Application logs
- `/tmp/app` - Temporary application files
- `/tmp` - System temporary directory (tmpfs)

**Benefits:**
- Prevents malicious code injection
- Ensures immutable container state
- Compliance with security best practices
- Reduces attack surface

### Non-Root User

Containers run as user `appuser` (UID 1000) instead of root.

```dockerfile
USER appuser
```

**Security Capabilities:**
```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

### Signal Handling with dumb-init

Using `dumb-init` as PID 1 to properly handle signals:

```dockerfile
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "--trace-warnings", "--trace-deprecation", "server/src/index.js"]
```

**Benefits:**
- Proper SIGTERM/SIGINT forwarding
- Zombie process reaping
- Clean container shutdown

## Performance Optimization

### Node.js Memory Limits

**Environment Variables:**
```bash
NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=64"
UV_THREADPOOL_SIZE=4
```

**Configuration Details:**
- `max-old-space-size=512`: Limits heap to 512MB (suitable for 1GB container)
- `max-semi-space-size=64`: Optimizes young generation size
- `UV_THREADPOOL_SIZE=4`: Balances I/O performance vs memory

### Container Resource Limits

**App Container:**
```yaml
resources:
  limits:
    cpus: '2.0'
    memory: 1G
  reservations:
    cpus: '1.0'
    memory: 512M
```

**Database Container:**
```yaml
resources:
  limits:
    cpus: '2.0'
    memory: 2G
  reservations:
    cpus: '1.0'
    memory: 1G
```

**Redis Container:**
```yaml
resources:
  limits:
    cpus: '1.0'
    memory: 512M
  reservations:
    cpus: '0.5'
    memory: 256M
```

### Graceful Shutdown

Enhanced shutdown mechanism with 30-second grace period:

```yaml
stop_grace_period: 30s
```

**Shutdown Sequence:**
1. SIGTERM received
2. Stop accepting new connections
3. Close HTTP server (wait for active connections)
4. Close WebSocket connections
5. Shutdown background jobs
6. Disconnect from database
7. Exit with code 0

**Timeout Protection:**
- 25-second internal timeout
- Forces exit if graceful shutdown hangs
- Prevents zombie containers

## Monitoring & Observability

### Container Resource Dashboard

**Location:** `server/monitoring/grafana/container-resource-dashboard.json`

**Dashboard UID:** `hse-container-resources`

**Metrics Tracked:**

1. **CPU Usage**
   - `rate(hse_digital_process_cpu_seconds_total[5m]) * 100`
   - Real-time CPU percentage
   - Per-container breakdown

2. **Memory Usage**
   - `hse_digital_process_resident_memory_bytes` - RSS memory
   - `hse_digital_nodejs_heap_size_used_bytes` - Heap usage
   - `hse_digital_nodejs_heap_size_total_bytes` - Total heap

3. **Network I/O**
   - `rate(hse_digital_tenant_data_transfer_bytes_total{direction="inbound"}[5m])`
   - `rate(hse_digital_tenant_data_transfer_bytes_total{direction="outbound"}[5m])`

4. **Active Connections**
   - `hse_digital_active_connections`
   - Real-time connection count

5. **HTTP Metrics**
   - Request rate: `rate(hse_digital_http_requests_total[5m])`
   - p95 latency: `histogram_quantile(0.95, rate(hse_digital_http_request_duration_seconds_bucket[5m]))`

6. **Node.js Runtime**
   - GC duration: `rate(hse_digital_nodejs_gc_duration_seconds_sum[5m])`
   - Event loop lag: `hse_digital_nodejs_eventloop_lag_seconds`
   - Database operations: `rate(hse_digital_database_queries_total[5m])`

### Accessing Dashboards

1. Start monitoring stack:
   ```bash
   docker-compose -f docker/docker-compose.monitoring.yml up -d
   ```

2. Access Grafana:
   - URL: http://localhost:3000
   - Username: admin
   - Password: admin123

3. Navigate to "Container Resource Usage" dashboard

## Deployment

### Build Optimized Image

```bash
# Build production image
docker build -f docker/Dockerfile -t hse-digital:latest .

# Or using docker-compose
docker-compose -f docker/docker-compose.yml build --no-cache
```

### Deploy with Resource Limits

```bash
# Set required environment variables
export JWT_SECRET="your-secure-secret"
export REFRESH_SECRET="your-refresh-secret"

# Start services
docker-compose -f docker/docker-compose.yml up -d

# Verify deployment
docker-compose -f docker/docker-compose.yml ps
curl http://localhost:3001/api/health
```

### Verify Security Settings

```bash
# Check read-only filesystem
docker inspect hse_app | grep -A 5 "ReadonlyRootfs"

# Check user
docker exec hse_app whoami  # Should return: appuser

# Check capabilities
docker inspect hse_app | grep -A 20 "CapDrop"

# Test write to read-only location (should fail)
docker exec hse_app touch /app/test.txt  # Permission denied

# Test write to volume (should succeed)
docker exec hse_app touch /app/server/public/uploads/test.txt
```

## Testing

### Graceful Shutdown Test

```bash
# Start container
docker-compose up -d

# Monitor logs
docker-compose logs -f app &

# Send SIGTERM
docker-compose stop app

# Expected log output:
# SIGTERM received, initiating graceful shutdown
# Stopping report scheduler...
# Closing HTTP server (waiting for active connections)...
# HTTP server closed successfully
# Closing WebSocket connections...
# WebSocket server closed
# Disconnecting from database...
# Database connection closed
# Graceful shutdown completed successfully
```

### Memory Limit Test

```bash
# Monitor memory usage
docker stats hse_app

# Check Node.js heap limit
docker exec hse_app node -e "console.log(v8.getHeapStatistics())"

# Verify max-old-space-size is 512MB
docker exec hse_app node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024)"
```

### Load Testing

```bash
# Install artillery (if not already installed)
npm install -g artillery

# Run load test
article run scripts/load-test.yml

# Monitor container resources during test
watch -n 1 'docker stats --no-stream hse_app'
```

## Troubleshooting

### Container Won't Start

**Permission Errors:**
```bash
# Check volume permissions
docker exec hse_app ls -la /app/server/public/uploads

# Fix permissions if needed
docker exec -u root hse_app chown -R appuser:appuser /app/server/public
```

**Read-Only Filesystem Issues:**
```bash
# Check if application tries to write to read-only locations
docker logs hse_app | grep "EROFS\|read-only"

# Identify problematic paths and add to volumes
```

### High Memory Usage

```bash
# Check heap usage
docker exec hse_app node -e "console.log(process.memoryUsage())"

# Enable heap profiling
docker exec hse_app node --heap-prof server/src/index.js

# Adjust NODE_OPTIONS if needed
export NODE_OPTIONS="--max-old-space-size=768 --max-semi-space-size=96"
```

### Slow Shutdown

```bash
# Check active connections during shutdown
docker exec hse_app netstat -an | grep ESTABLISHED

# Reduce stop_grace_period if appropriate
# Edit docker-compose.yml:
stop_grace_period: 15s
```

### Resource Limits Too Restrictive

```bash
# Monitor actual usage
docker stats hse_app --no-stream

# Adjust limits in docker-compose.yml
resources:
  limits:
    cpus: '3.0'      # Increase if CPU-bound
    memory: 2G       # Increase if memory-bound
```

## Best Practices

### Security

1. **Never run as root** - Always use non-root user
2. **Minimal capabilities** - Drop all, add only what's needed
3. **Read-only filesystem** - Enable for all production containers
4. **Secrets management** - Use Docker secrets or environment variables
5. **Regular updates** - Keep base images updated

### Performance

1. **Right-size resources** - Monitor and adjust based on actual usage
2. **Connection pooling** - Reuse database connections
3. **Caching strategy** - Use Redis for frequently accessed data
4. **Health checks** - Implement proper health check endpoints
5. **Graceful degradation** - Handle resource exhaustion gracefully

### Monitoring

1. **Metrics collection** - Export Prometheus metrics
2. **Log aggregation** - Centralize logs with Loki/ELK
3. **Alerting** - Set up alerts for resource thresholds
4. **Dashboards** - Create role-specific dashboards
5. **Distributed tracing** - Use OpenTelemetry for request tracing

## Production Checklist

- [ ] Environment variables configured (JWT_SECRET, REFRESH_SECRET)
- [ ] Resource limits set appropriately
- [ ] Read-only filesystem enabled
- [ ] Non-root user configured
- [ ] Volume mounts for writable directories
- [ ] Health checks configured
- [ ] Graceful shutdown tested
- [ ] Monitoring dashboards accessible
- [ ] Alerts configured
- [ ] Backup strategy in place
- [ ] Log rotation configured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules applied
- [ ] Security scanning completed

## References

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Node.js in Containers](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Prometheus Monitoring](https://prometheus.io/docs/practices/naming/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Container Resource Management](https://docs.docker.com/config/containers/resource_constraints/)

## Support

For issues or questions:
1. Check container logs: `docker-compose logs -f app`
2. Review metrics in Grafana dashboards
3. Inspect container configuration: `docker inspect hse_app`
4. Test health endpoint: `curl http://localhost:3001/api/health`
