# Docker Configuration

Production-optimized Docker setup for HSE Digital platform.

## Quick Start

```bash
# Set required environment variables
export JWT_SECRET="your-jwt-secret"
export REFRESH_SECRET="your-refresh-secret"

# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Check status
docker-compose -f docker/docker-compose.yml ps

# View logs
docker-compose -f docker/docker-compose.yml logs -f app
```

## Files

- **Dockerfile** - Multi-stage production build with security hardening
- **docker-compose.yml** - Main application stack
- **docker-compose.monitoring.yml** - Monitoring stack (Prometheus, Grafana, Loki)
- **docker-compose.test.yml** - Test environment
- **docker-compose.multiregion.yml** - Multi-region deployment
- **PRODUCTION_OPTIMIZATION.md** - Comprehensive production guide

## Security Features

✅ **Read-only root filesystem** - Prevents runtime modifications
✅ **Non-root user (UID 1000)** - Principle of least privilege
✅ **Minimal capabilities** - Only NET_BIND_SERVICE enabled
✅ **no-new-privileges** - Prevents privilege escalation
✅ **Resource limits** - CPU and memory constraints
✅ **Graceful shutdown** - Proper signal handling (30s grace period)

## Performance Optimizations

- **Node.js memory tuning** - `--max-old-space-size=512`
- **Thread pool optimization** - `UV_THREADPOOL_SIZE=4`
- **Multi-stage builds** - Minimal production image
- **dumb-init** - Proper PID 1 signal handling
- **Health checks** - Automatic container health monitoring

## Resource Limits

### Application Container
- CPU: 2.0 cores (limit) / 1.0 core (reservation)
- Memory: 1GB (limit) / 512MB (reservation)

### Database Container
- CPU: 2.0 cores (limit) / 1.0 core (reservation)
- Memory: 2GB (limit) / 1GB (reservation)

### Redis Container
- CPU: 1.0 core (limit) / 0.5 core (reservation)
- Memory: 512MB (limit) / 256MB (reservation)

## Monitoring

Start the monitoring stack:

```bash
docker-compose -f docker/docker-compose.monitoring.yml up -d
```

Access services:
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

### Available Dashboards

1. **Container Resource Usage** (`hse-container-resources`)
   - CPU, Memory, Network I/O
   - Node.js runtime metrics
   - HTTP request metrics

2. **Tenant Monitoring** (`hse-tenant-monitoring`)
   - Per-tenant usage patterns
   - API call tracking
   - Performance metrics

3. **Cost Attribution** (`hse-cost-attribution`)
   - Resource cost estimation
   - Usage-based billing data

## Volumes

Persistent data stored in named volumes:

- `hse_postgres_data` - Database data
- `hse_redis_data` - Cache data
- `hse_app_uploads` - User uploads
- `hse_app_reports` - Generated reports
- `hse_app_logs` - Application logs
- `hse_app_tmp` - Temporary files

## Verification

### Check Security Settings

```bash
# Verify read-only filesystem
docker inspect hse_app | grep ReadonlyRootfs

# Verify non-root user
docker exec hse_app whoami  # Should return: appuser

# Check capabilities
docker inspect hse_app | grep -A 10 CapDrop
```

### Test Graceful Shutdown

```bash
# Monitor logs
docker logs -f hse_app &

# Send SIGTERM
docker stop hse_app

# Should see graceful shutdown sequence in logs
```

### Monitor Resources

```bash
# Real-time stats
docker stats hse_app hse_db hse_cache

# Check Node.js memory limit
docker exec hse_app node -e "console.log(require('v8').getHeapStatistics())"
```

## Troubleshooting

### Permission Errors

```bash
# Fix volume permissions
docker exec -u root hse_app chown -R appuser:appuser /app/server/public
```

### Container Won't Start

```bash
# Check logs
docker logs hse_app

# Inspect configuration
docker inspect hse_app

# Verify environment variables
docker exec hse_app env | grep -E "JWT_SECRET|NODE_OPTIONS"
```

### High Resource Usage

```bash
# Check current usage
docker stats --no-stream

# Adjust limits in docker-compose.yml if needed
```

## Production Deployment

See **PRODUCTION_OPTIMIZATION.md** for comprehensive production deployment guide.

Key steps:
1. Set all required environment variables
2. Build production image
3. Deploy with resource limits
4. Verify security settings
5. Configure monitoring
6. Test graceful shutdown
7. Set up log aggregation
8. Configure alerts

## Support

For detailed information:
- Production guide: `docker/PRODUCTION_OPTIMIZATION.md`
- Monitoring setup: `server/monitoring/README.md`
- Grafana dashboards: `server/monitoring/grafana/README.md`
