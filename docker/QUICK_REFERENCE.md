# Docker Quick Reference Guide

Quick command reference for HSE Digital Docker operations.

## 🚀 Quick Start

```bash
# Setup
cp docker/.env.example .env
vim .env  # Set JWT_SECRET and REFRESH_SECRET

# Start development
docker-compose -f docker/docker-compose.yml --profile development up -d

# Start production
docker-compose -f docker/docker-compose.yml --profile production up -d
```

## 📦 Build Commands

### Build Specific Variant

```bash
# Slim (default, recommended)
docker build -f docker/Dockerfile --build-arg BUILD_VARIANT=slim -t app:slim .

# Bullseye (maximum compatibility)
docker build -f docker/Dockerfile --build-arg BUILD_VARIANT=bullseye -t app:bullseye .

# Alpine (minimal size)
docker build -f docker/Dockerfile --build-arg BUILD_VARIANT=alpine -t app:alpine .
```

### Build All Variants

```bash
# Using script
./docker/build-all-variants.sh

# Using Makefile
cd docker && make build-all
```

### Build Stages

```bash
# Development
docker build -f docker/Dockerfile --target development -t app:dev .

# Production
docker build -f docker/Dockerfile --target production -t app:prod .

# Production with debug tools
docker build -f docker/Dockerfile --target production-debug -t app:debug .

# Test
docker build -f docker/Dockerfile --target test -t app:test .
```

## 🏃 Run Commands

### Docker Compose Profiles

```bash
# Development (hot reload, all tools)
docker-compose -f docker/docker-compose.yml --profile development up -d

# Production (minimal)
docker-compose -f docker/docker-compose.yml --profile production up -d

# Production with debug tools
docker-compose -f docker/docker-compose.yml --profile production-debug up -d

# Production + Admin tools (pgAdmin)
docker-compose -f docker/docker-compose.yml --profile production --profile admin up -d

# Minimal (no Jaeger)
docker-compose -f docker/docker-compose.yml --profile minimal up -d
```

### Using Makefile

```bash
cd docker

make up-dev              # Development
make up-prod             # Production
make up-prod-debug       # Production + debug
make up-admin            # Production + admin
make down                # Stop all
make restart             # Restart
```

## 📊 Monitoring Commands

```bash
# View logs
docker-compose -f docker/docker-compose.yml logs -f

# View specific service logs
docker-compose -f docker/docker-compose.yml logs -f app
docker-compose -f docker/docker-compose.yml logs -f postgres
docker-compose -f docker/docker-compose.yml logs -f redis

# Check status
docker-compose -f docker/docker-compose.yml ps

# Check health
curl http://localhost:3001/api/health

# Resource usage
docker stats
```

## 🔧 Maintenance Commands

```bash
# Access container shell
docker-compose -f docker/docker-compose.yml exec app sh
docker-compose -f docker/docker-compose.yml exec app-dev sh

# Database shell
docker-compose -f docker/docker-compose.yml exec postgres psql -U hse_admin -d hse_platform

# Run migrations
docker-compose -f docker/docker-compose.yml exec app npx prisma db push

# Run tests
docker-compose -f docker/docker-compose.test.yml up --abort-on-container-exit

# Restart service
docker-compose -f docker/docker-compose.yml restart app

# Rebuild and restart
docker-compose -f docker/docker-compose.yml up -d --build app
```

## 🧹 Cleanup Commands

```bash
# Stop services
docker-compose -f docker/docker-compose.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker/docker-compose.yml down -v

# Remove images
docker rmi hse-digital:slim hse-digital:bullseye hse-digital:alpine

# Clean Docker system
docker system prune -f

# Full cleanup (including volumes)
docker system prune -a --volumes
```

## 🔍 Inspection Commands

```bash
# List images
docker images | grep hse-digital

# Compare sizes
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep hse-digital

# Inspect image
docker image inspect hse-digital:slim

# View layers
docker history hse-digital:slim

# Check build arguments
docker image inspect hse-digital:slim --format='{{.Config.Labels}}'
```

## 🧪 Testing Commands

```bash
# Run all tests
docker-compose -f docker/docker-compose.test.yml up --abort-on-container-exit

# Run tests in running container
docker-compose -f docker/docker-compose.yml exec app npm test

# Test specific variant
docker run --rm -e NODE_ENV=test hse-digital:slim npm test

# Test health
docker run --rm -p 3001:3001 hse-digital:slim &
sleep 10
curl http://localhost:3001/api/health
```

## 🎯 Common Workflows

### Development Workflow

```bash
# 1. Start development environment
make -C docker up-dev

# 2. Watch logs
make -C docker logs-app

# 3. Access shell for debugging
make -C docker shell

# 4. Run migrations
docker-compose -f docker/docker-compose.yml exec app-dev npx prisma db push

# 5. Stop when done
make -C docker down
```

### Production Deployment

```bash
# 1. Build production image
docker build -f docker/Dockerfile --build-arg BUILD_VARIANT=slim -t app:1.0.0 .

# 2. Tag for registry
docker tag app:1.0.0 registry.example.com/app:1.0.0
docker tag app:1.0.0 registry.example.com/app:latest

# 3. Push to registry
docker push registry.example.com/app:1.0.0
docker push registry.example.com/app:latest

# 4. Deploy
docker-compose -f docker/docker-compose.yml --profile production up -d

# 5. Verify
curl http://localhost:3001/api/health
```

### Comparing Variants

```bash
# Build all
./docker/build-all-variants.sh

# Compare sizes
docker images | grep hse-digital | sort -k2

# Test each
for variant in slim bullseye alpine; do
  echo "Testing $variant..."
  docker run --rm hse-digital:$variant node --version
  docker run --rm hse-digital:$variant npm --version
done
```

## 📝 Environment Variables

### Build-Time

```bash
NODE_VERSION=18          # Node.js version
BUILD_VARIANT=slim       # Base image variant
BUILD_ENV=production     # Build environment
ENABLE_DEBUG_TOOLS=false # Include debug tools
ENABLE_SOURCEMAPS=false  # Build with sourcemaps
```

### Runtime

```bash
NODE_ENV=production                  # Environment
PORT=3001                            # Application port
DATABASE_URL=postgresql://...        # Database connection
JWT_SECRET=your-secret               # JWT secret (required)
REFRESH_SECRET=your-secret           # Refresh secret (required)
REDIS_HOST=redis                     # Redis host
REDIS_PORT=6379                      # Redis port
```

## 🆘 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker/docker-compose.yml logs app

# Check events
docker events --since 1h

# Inspect container
docker inspect <container-id>
```

### Build fails

```bash
# Clear cache
docker build --no-cache -f docker/Dockerfile .

# Check Dockerfile syntax
docker build -f docker/Dockerfile --target production -t test . 2>&1 | grep -i error

# Try different variant
docker build -f docker/Dockerfile --build-arg BUILD_VARIANT=bullseye .
```

### Database connection issues

```bash
# Check database is running
docker-compose -f docker/docker-compose.yml ps postgres

# Test connection
docker-compose -f docker/docker-compose.yml exec postgres pg_isready

# Check environment variables
docker-compose -f docker/docker-compose.yml exec app printenv | grep DATABASE_URL
```

## 📚 Resources

- [Full Documentation](README.md)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
