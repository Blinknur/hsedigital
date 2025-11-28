# Deployment Documentation

Deployment guides, operations, and infrastructure documentation.

## Documents

### Getting Started
- **[Quick Start](./quick-start.md)** - Get started quickly
- **[Setup Guide](./setup-guide.md)** - Complete setup instructions

### Production
- **[Production Deployment](./production.md)** - Production deployment guide (Kubernetes)
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

# Install dependencies
npm install
cd server && npm install

# Configure environment
cp server/.env.example server/.env
# Edit .env: Set required variables
# - DATABASE_URL
# - JWT_SECRET
# - REFRESH_SECRET
# - REDIS_HOST
# - REDIS_PORT

# Initialize database
cd server
npx prisma generate
npx prisma db push

# Start development server
npm run dev

# Access application
open http://localhost:3001
```

## Production Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Kubernetes/EKS cluster (for production)

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

## Development Commands

```bash
# Start server
npm run dev                    # Development mode
npm start                      # Production mode

# Database
npx prisma generate            # Generate Prisma client
npx prisma db push             # Apply schema changes

# Testing
npm test                       # Run all tests
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
```

## Quick Links

- [Quick Start Guide](./quick-start.md)
- [Production Deployment](./production.md)
- [Monitoring Setup](../monitoring/overview.md)
