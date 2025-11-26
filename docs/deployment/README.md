# Deployment Documentation

Deployment guides, operations, and infrastructure documentation.

## Documents

### Getting Started
- **[Quick Start](./quick-start.md)** - Get started in 5 minutes
- **[Setup Guide](./setup-guide.md)** - Complete setup instructions
- **[Docker Setup](./docker.md)** - Local development with Docker

### Production
- **[Production Deployment](./production.md)** - Production deployment guide
- **[Deployment Runbook](./runbook.md)** - Step-by-step deployment procedures
- **[Load Testing](./load-testing.md)** - Load testing and performance validation

### Multi-Region
- **[Multi-Region Setup](./multi-region.md)** - Multi-region deployment guide
- **[Multi-Region Runbook](./multi-region-runbook.md)** - Multi-region operations

### Operations
- **[Backup & Disaster Recovery](./backup-disaster-recovery.md)** - Backup strategies and DR procedures
- **[Backup Testing](./backup-testing.md)** - Backup testing and validation
- **[Capacity Planning](./capacity-planning.md)** - Scaling and capacity planning

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd hse-digital-backend

# Configure environment
cp .env.local .env
# Edit .env: Set JWT_SECRET and REFRESH_SECRET

# Start services
npm run docker:up

# Initialize database
docker-compose exec app npx prisma db push

# Access application
open http://localhost:3001
```

## Production Deployment

### Prerequisites
- Docker & Docker Compose (or Kubernetes)
- PostgreSQL 15+
- Redis 7+
- Node.js 18+ (for builds)

### Environment Variables
Required for production:
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
REFRESH_SECRET=<strong-random-secret>
REDIS_HOST=redis-host
REDIS_PORT=6379
```

### Health Checks
- **Liveness**: `GET /api/live`
- **Readiness**: `GET /api/ready`
- **Health**: `GET /api/health`

## Docker Commands

```bash
# Development
npm run docker:up              # Start all services
npm run docker:down            # Stop services
npm run docker:logs:app        # View logs

# Production
docker build -t hse-digital:latest .
docker-compose -f docker-compose.prod.yml up -d
```

## Quick Links

- [Quick Start Guide](./quick-start.md)
- [Production Deployment](./production.md)
- [Monitoring Setup](../monitoring/overview.md)
