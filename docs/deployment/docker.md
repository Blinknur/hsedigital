# Docker Development Environment Setup

Complete guide for setting up and managing the HSE.Digital local development environment with Docker.

## 📋 Prerequisites

- Docker Desktop (v20.10+)
- Docker Compose (v2.0+)
- Node.js 18+ (for local npm scripts)
- Git

## 🏗️ Architecture Overview

The Docker setup includes:

### Services

1. **app** - Node.js application (Backend + Frontend)
   - Port: 3001
   - Multi-stage build for optimization
   - Health checks enabled
   - Auto-restart on failure

2. **postgres** - PostgreSQL 15 database
   - Port: 5432
   - Persistent volume for data
   - Health checks with pg_isready
   - UTF-8 encoding

3. **redis** - Redis 7 cache
   - Port: 6379
   - Used for rate limiting and session caching
   - Persistent data with RDB snapshots

4. **pgadmin** - Database management UI
   - Port: 5050
   - Web-based query tool
   - Visual database explorer

### Networks

- `hse_network` - Bridge network connecting all services

### Volumes

- `hse_postgres_data` - PostgreSQL data persistence
- `hse_redis_data` - Redis data persistence
- `hse_pgadmin_data` - pgAdmin configuration
- `hse_app_uploads` - User uploaded files

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd hse-digital-backend

# Copy environment template
cp .env.local .env

# Edit .env file with your configuration
nano .env  # or use your preferred editor
```

### 2. Start Services

```bash
# Start all services in detached mode
npm run docker:up

# Or use docker-compose directly
docker-compose up -d
```

### 3. Initialize Database

```bash
# Run Prisma migrations
docker-compose exec app npx prisma db push

# Seed initial data (optional)
docker-compose exec app node prisma/seed.js
```

### 4. Verify Services

```bash
# Check all services are running
npm run docker:ps

# Check application health
curl http://localhost:3001/api/health

# Expected response:
# {"status":"online","db":"connected","mode":"production"}
```

### 5. Access Applications

- **Main Application**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/health
- **pgAdmin**: http://localhost:5050
  - Email: `admin@hse.digital`
  - Password: `admin123`

## 🔧 Configuration

### Environment Variables

Create `.env` file from template and configure:

```bash
# Required variables
DATABASE_URL=postgresql://hse_admin:dev_password_123@localhost:5432/hse_platform
JWT_SECRET=your-jwt-secret-here
REFRESH_SECRET=your-refresh-secret-here
API_KEY=your-gemini-api-key

# Optional (with defaults)
PORT=3001
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:5173
```

### pgAdmin Setup (First Time)

1. Open http://localhost:5050
2. Login with credentials from .env
3. Add new server:
   - **General Tab**:
     - Name: HSE Platform
   - **Connection Tab**:
     - Host: `postgres` (Docker service name)
     - Port: `5432`
     - Database: `hse_platform`
     - Username: `hse_admin`
     - Password: `dev_password_123`
4. Save and connect

## 📝 NPM Scripts Reference

### Docker Management

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Rebuild containers (after code changes)
npm run docker:build

# Restart services
npm run docker:restart

# Clean everything (including volumes)
npm run docker:clean

# View container status
npm run docker:ps
```

### Logs

```bash
# View all logs (follow mode)
npm run docker:logs

# View app logs only
npm run docker:logs:app

# View database logs
npm run docker:logs:db

# View Redis logs
npm run docker:logs:redis
```

### Database Operations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma db push

# Generate Prisma client
docker-compose exec app npx prisma generate

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Seed database
docker-compose exec app node prisma/seed.js

# Backup database
docker-compose exec postgres pg_dump -U hse_admin hse_platform > backup.sql

# Restore database
docker-compose exec -T postgres psql -U hse_admin hse_platform < backup.sql
```

## 🐛 Troubleshooting

### Services Won't Start

**Problem**: Port already in use

```bash
# Check what's using the port
lsof -i :3001  # App
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :5050  # pgAdmin

# Kill the process or change port in docker-compose.yml
```

**Problem**: Docker daemon not running

```bash
# Start Docker Desktop
# Or on Linux:
sudo systemctl start docker
```

### Database Connection Issues

**Problem**: "Connection refused" errors

```bash
# Check PostgreSQL health
docker-compose ps postgres

# View PostgreSQL logs
npm run docker:logs:db

# Restart PostgreSQL
docker-compose restart postgres
```

**Problem**: Database doesn't exist

```bash
# Create database manually
docker-compose exec postgres psql -U hse_admin -c "CREATE DATABASE hse_platform;"
```

### Application Errors

**Problem**: "Module not found" errors

```bash
# Rebuild with fresh dependencies
npm run docker:build
npm run docker:up
```

**Problem**: Prisma client out of sync

```bash
# Regenerate Prisma client
docker-compose exec app npx prisma generate

# Restart app
docker-compose restart app
```

### Redis Connection Issues

```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG

# View Redis logs
npm run docker:logs:redis

# Flush Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

### Health Check Failures

**Problem**: Service marked as unhealthy

```bash
# Check health check logs
docker inspect hse_app | jq '.[0].State.Health'

# View recent logs
docker-compose logs --tail=50 app

# Restart the service
docker-compose restart app
```

### Volume Permission Issues

**Problem**: Cannot write to volumes

```bash
# Fix permissions (Linux/Mac)
docker-compose down
sudo chown -R $USER:$USER ./server/public/uploads
docker-compose up -d
```

## 🔄 Development Workflow

### Making Code Changes

1. **Edit code locally** - Changes are reflected via volume mounts
2. **Restart if needed**:
   ```bash
   # For server changes that need restart
   docker-compose restart app
   ```

### Testing Changes

```bash
# Run tests in container
docker-compose exec app npm test

# Or run specific test file
docker-compose exec app npm test -- path/to/test.js
```

### Debugging

```bash
# Attach to running container
docker-compose exec app sh

# Check environment variables
docker-compose exec app env

# View process list
docker-compose exec app ps aux
```

## 🔐 Security Best Practices

### For Development

- ✅ Use `.env.local` for local development
- ✅ Keep default weak passwords for local only
- ✅ Test with dummy API keys

### For Production

- ⚠️ **Never commit** `.env.production` with real secrets
- ⚠️ Use strong, random passwords (32+ characters)
- ⚠️ Disable pgAdmin in production
- ⚠️ Use managed database services (AWS RDS, etc.)
- ⚠️ Enable Redis authentication
- ⚠️ Use SSL/TLS for all connections
- ⚠️ Implement firewall rules
- ⚠️ Regular security updates

## 📊 Monitoring

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health check details
docker inspect hse_app --format='{{json .State.Health}}'
```

### Resource Usage

```bash
# View container stats
docker stats

# View specific container
docker stats hse_app
```

### Logs Management

```bash
# View logs from specific time
docker-compose logs --since 1h app

# Follow logs
docker-compose logs -f --tail=100 app

# Save logs to file
docker-compose logs app > app-logs.txt
```

## 🧹 Cleanup

### Remove Specific Service

```bash
docker-compose stop app
docker-compose rm app
```

### Clean Everything

```bash
# Stop and remove containers, networks
npm run docker:down

# Also remove volumes (DANGER: deletes data!)
npm run docker:clean

# Remove images
docker-compose down --rmi all

# Remove orphaned volumes
docker volume prune
```

### Free Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything not in use
docker system prune -a --volumes
```

## 🚀 Production Deployment

### Build Production Image

```bash
# Build optimized image
docker build -t hse-digital:latest .

# Tag for registry
docker tag hse-digital:latest registry.example.com/hse-digital:latest

# Push to registry
docker push registry.example.com/hse-digital:latest
```

### Environment-Specific Deployment

**Staging**
```bash
# Use staging environment
docker-compose --env-file .env.staging up -d

# Or with override
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

**Production**
```bash
# Use production environment with managed services
docker-compose --env-file .env.production up -d

# Recommended: Use orchestration (Kubernetes, ECS, etc.)
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `npm run docker:logs`
2. Verify environment variables: `docker-compose config`
3. Check service health: `docker-compose ps`
4. Review this guide's troubleshooting section
5. Check Docker Desktop settings
6. Consult team documentation

## 📝 Changelog

### Version 1.0.0
- Initial Docker setup with multi-stage builds
- Health checks for all services
- Redis integration for caching and rate limiting
- pgAdmin for database management
- Comprehensive documentation
