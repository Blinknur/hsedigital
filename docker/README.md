# Docker Configuration

This directory contains all Docker-related configuration files for the HSE Digital platform.

## Directory Structure

```
docker/
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # Main development/production stack
├── docker-compose.test.yml       # Testing environment
├── docker-compose.monitoring.yml # Monitoring stack (Prometheus, Grafana, Loki)
├── docker-compose.multiregion.yml # Multi-region deployment
└── README.md                     # This file
```

## Docker Compose Files

### docker-compose.yml (Main Stack)
**Services:**
- `app` - Node.js backend + React frontend
- `postgres` - PostgreSQL 15 database
- `redis` - Redis 7 cache and queue
- `pgadmin` - Database management UI
- `jaeger` - Distributed tracing

**Ports:**
- 3001 - Application
- 5432 - PostgreSQL
- 6379 - Redis
- 5050 - pgAdmin
- 16686 - Jaeger UI

**Usage:**
```bash
cd .. # Go to project root
docker-compose -f docker/docker-compose.yml up -d
docker-compose -f docker/docker-compose.yml logs -f app
```

### docker-compose.test.yml (Testing)
**Services:**
- `app-test` - Application in test mode
- `postgres-test` - Test database
- `redis-test` - Test cache

**Ports:**
- 3002 - Test application
- 5433 - Test database
- 6380 - Test Redis

**Usage:**
```bash
cd ..
docker-compose -f docker/docker-compose.test.yml up -d
docker-compose -f docker/docker-compose.test.yml exec app-test npm test
```

### docker-compose.monitoring.yml (Monitoring Stack)
**Additional Services:**
- `prometheus` - Metrics collection
- `grafana` - Dashboards and visualization
- `loki` - Log aggregation
- `promtail` - Log shipping

**Ports:**
- 9090 - Prometheus
- 3000 - Grafana
- 3100 - Loki

**Usage:**
```bash
cd ..
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.monitoring.yml up -d
```

### docker-compose.multiregion.yml (Multi-Region)
**Services:**
- `app-us-east` - US East application instance
- `app-eu-west` - EU West application instance
- `postgres-primary` - Primary database with replication
- `postgres-replica-eu` - EU replica database
- `redis-us-east` - US East Redis
- `redis-eu-west` - EU West Redis
- `nginx-lb` - Load balancer

**Usage:**
```bash
cd ..
docker-compose -f docker/docker-compose.multiregion.yml up -d
```

## Dockerfile

Multi-stage build optimized for production:

**Stage 1 (builder):**
- Install all dependencies
- Generate Prisma client
- Build frontend with source maps (if Vite available)
- Create dist directory (ensures COPY operations succeed)

**Stage 2 (production):**
- Install production dependencies only
- Copy built artifacts
- Configure health checks
- Expose port 3001

**Build:**
```bash
cd ..
docker build -f docker/Dockerfile -t hse-digital:latest .
```

**Rebuild containers after Dockerfile changes:**
```bash
# Test environment
docker-compose -f docker/docker-compose.test.yml down
docker-compose -f docker/docker-compose.test.yml build --no-cache
docker-compose -f docker/docker-compose.test.yml up -d

# Main environment
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml build --no-cache
docker-compose -f docker/docker-compose.yml up -d
```

**Recent Changes:**
- *Nov 2024*: Fixed build failure when frontend dependencies missing. The Dockerfile now creates an empty `dist` directory if the frontend build fails, preventing COPY errors.

## Quick Start

### Local Development
```bash
# From project root
cp config/environments/.env.development .env

# Edit .env with required values (JWT_SECRET, REFRESH_SECRET)

# Start services
docker-compose -f docker/docker-compose.yml up -d

# Initialize database
docker-compose -f docker/docker-compose.yml exec app npx prisma db push

# View logs
docker-compose -f docker/docker-compose.yml logs -f app
```

### Production Deployment
```bash
# From project root
cp config/environments/.env.production .env

# Update all CHANGE_ME values in .env

# Build production image
docker build -f docker/Dockerfile -t hse-digital:latest .

# Start production stack
docker-compose -f docker/docker-compose.yml up -d
```

### With Monitoring
```bash
# Start main stack + monitoring
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://localhost:3000 (admin/admin123)
# Prometheus: http://localhost:9090
# Jaeger: http://localhost:16686
```

## Environment Variables

Docker Compose files read from `.env` file in project root.

**Required variables:**
- `JWT_SECRET` - JWT signing secret
- `REFRESH_SECRET` - Refresh token secret

**Optional with defaults:**
- `POSTGRES_USER` (default: hse_admin)
- `POSTGRES_PASSWORD` (default: dev_password_123)
- `POSTGRES_DB` (default: hse_platform)
- `REDIS_PASSWORD` (default: empty)
- `CLIENT_URL` (default: http://localhost:3001)

See [config/README.md](../config/README.md) for full environment variable documentation.

## Volume Management

**Persistent volumes:**
- `hse_postgres_data` - Database data
- `hse_redis_data` - Redis persistence
- `hse_pgadmin_data` - pgAdmin settings
- `hse_app_uploads` - User uploads
- `hse_backup_data` - Backup storage

**List volumes:**
```bash
docker volume ls | grep hse
```

**Backup volume:**
```bash
docker run --rm -v hse_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

**Clean volumes (WARNING: deletes all data):**
```bash
cd ..
docker-compose -f docker/docker-compose.yml down -v
```

## Networking

All services run on `hse_network` bridge network, allowing inter-service communication by service name.

**Examples:**
- Database: `postgres:5432`
- Redis: `redis:6379`
- Application: `app:3001`

## Health Checks

All services have health checks configured:

**Check service health:**
```bash
cd ..
docker-compose -f docker/docker-compose.yml ps
```

**Health check endpoints:**
- App: `http://localhost:3001/api/health`
- Postgres: `pg_isready` command
- Redis: `redis-cli ping`
- pgAdmin: `/misc/ping`

## Troubleshooting

### Services won't start
```bash
# Check logs
cd ..
docker-compose -f docker/docker-compose.yml logs

# Check specific service
docker-compose -f docker/docker-compose.yml logs app

# Restart services
docker-compose -f docker/docker-compose.yml restart
```

### Database connection errors
```bash
# Check postgres is healthy
docker-compose -f docker/docker-compose.yml ps postgres

# Test connection
docker-compose -f docker/docker-compose.yml exec postgres psql -U hse_admin -d hse_platform -c "SELECT 1"
```

### Redis connection errors
```bash
# Check redis is healthy
docker-compose -f docker/docker-compose.yml ps redis

# Test connection
docker-compose -f docker/docker-compose.yml exec redis redis-cli ping
```

### Application errors
```bash
# View real-time logs
docker-compose -f docker/docker-compose.yml logs -f app

# Check environment variables
docker-compose -f docker/docker-compose.yml exec app printenv

# Access shell
docker-compose -f docker/docker-compose.yml exec app sh
```

### Clean restart
```bash
cd ..
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d
```

### Complete reset (WARNING: deletes all data)
```bash
cd ..
docker-compose -f docker/docker-compose.yml down -v
docker system prune -a
docker-compose -f docker/docker-compose.yml up -d
```

## Production Considerations

### Security
1. **Use secrets management** - Don't store secrets in .env files
2. **Limit exposed ports** - Only expose necessary ports
3. **Use specific image tags** - Avoid `latest` tag
4. **Run as non-root** - Configure USER in Dockerfile
5. **Scan images** - Use `docker scan` or Snyk

### Performance
1. **Resource limits** - Set CPU and memory limits
2. **Optimize builds** - Use build cache effectively
3. **Multi-stage builds** - Reduce final image size
4. **Health checks** - Configure appropriate intervals

### Monitoring
1. **Enable monitoring stack** - Use docker-compose.monitoring.yml
2. **Configure alerts** - Set up Prometheus alerting
3. **Log aggregation** - Use Loki for centralized logs
4. **Metrics** - Monitor container metrics

## NPM Scripts (from project root)

For convenience, use these npm scripts:

```bash
npm run docker:up          # Start services
npm run docker:down        # Stop services
npm run docker:logs        # View all logs
npm run docker:logs:app    # View app logs
npm run docker:logs:db     # View database logs
npm run docker:logs:redis  # View Redis logs
npm run docker:build       # Rebuild containers
npm run docker:restart     # Restart services
npm run docker:clean       # Clean volumes
npm run docker:ps          # List containers
npm run docker:health      # Check health
```

## Related Documentation

- [Configuration Guide](../config/README.md) - Environment configuration
- [AGENTS.md](../AGENTS.md) - Development commands
- [DOCKER_SETUP.md](../DOCKER_SETUP.md) - Detailed Docker setup
- [Server Documentation](../server/README.md) - Backend documentation
