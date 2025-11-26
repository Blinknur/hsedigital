# HSE.Digital - Compliance & Safety Platform

Multi-tenant SaaS platform for managing audits, compliance checklists, incidents, and contractor permits for fuel station networks.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)

### Start Development Environment

```bash
# Clone and setup
git clone <repository-url>
cd hse-digital-backend

# Configure environment
cp .env.local .env
# Edit .env and set JWT_SECRET and REFRESH_SECRET

# Start all services
npm run docker:up

# Initialize database
docker-compose exec app npx prisma db push

# Access the application
open http://localhost:3001
```

That's it! The platform is now running with:
- **App**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health
- **pgAdmin**: http://localhost:5050 (admin@hse.digital / admin123)

## 📖 Documentation

Complete documentation is available in the [`/docs`](./docs) directory:

### For Developers
- **[Quick Start Guide](./docs/deployment/quick-start.md)** - Get started in 5 minutes
- **[API Reference](./docs/api/endpoints.md)** - Complete REST API documentation
- **[Architecture Overview](./docs/architecture/overview.md)** - System design and patterns

### For DevOps
- **[Docker Setup](./docs/deployment/docker.md)** - Local development environment
- **[Production Deployment](./docs/deployment/production.md)** - Deploy to production
- **[Monitoring Guide](./docs/monitoring/overview.md)** - Observability setup

### Key Features
- **[Report Generation](./docs/features/reports.md)** - PDF reports with charts
- **[WebSocket Notifications](./docs/features/websockets.md)** - Real-time updates
- **[Queue System](./docs/features/queue-system.md)** - Background job processing
- **[Multi-Tenancy](./docs/architecture/multi-tenancy.md)** - Tenant isolation
- **[Security](./docs/security/overview.md)** - Security implementation

### Browse All Documentation
**[📚 Complete Documentation Index](./docs/README.md)**

## 🏗️ Architecture

**Multi-tenant SaaS** with organization-based data isolation:
- **Backend**: Node.js 18, Express.js
- **Database**: PostgreSQL 15 (Prisma ORM)
- **Cache**: Redis 7
- **Queue**: Bull with Bull Board
- **Frontend**: React + Vite + TypeScript
- **Auth**: JWT with RBAC
- **Monitoring**: Pino, Prometheus, Sentry, OpenTelemetry, Grafana

## 🔧 Common Commands

```bash
# Docker management
npm run docker:up          # Start all services
npm run docker:down        # Stop all services
npm run docker:logs:app    # View application logs
npm run docker:restart     # Restart services

# Database
docker-compose exec app npx prisma db push    # Apply schema changes
docker-compose exec app npx prisma studio     # Open Prisma Studio

# Testing
docker-compose exec app npm test              # Run tests

# View health status
curl http://localhost:3001/api/health
```

See **[AGENTS.md](./AGENTS.md)** for complete command reference.

## 📊 Core Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-tenant isolation
- Email verification

### Compliance Management
- Station audits and inspections
- Incident reporting and tracking
- Work permit management
- Contractor management

### Reporting & Analytics
- PDF report generation with charts
- Scheduled report delivery
- Custom report templates
- Export capabilities

### Real-time Features
- WebSocket notifications
- Live audit status updates
- Real-time incident alerts

### Security
- Row-level security (RLS)
- CSRF protection
- Rate limiting (Redis-based)
- Input validation and sanitization
- Security audit logging

### Monitoring & Observability
- Structured JSON logging (Pino)
- Prometheus metrics
- Sentry error tracking
- OpenTelemetry tracing
- Health check endpoints

## 🧪 Testing

```bash
# Run all tests
cd server && npm test

# Run specific test suite
docker-compose exec app npm test -- test-name.js
```

## 🌍 Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# JWT Secrets (REQUIRED)
JWT_SECRET=your-secure-secret
REFRESH_SECRET=your-secure-refresh-secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

See [.env.example](./server/.env.example) for complete configuration.

## 🚢 Deployment

### Docker Production Build
```bash
docker build -t hse-digital:latest .
```

### Kubernetes
Health check endpoints for Kubernetes:
- **Liveness**: `/api/live`
- **Readiness**: `/api/ready`
- **Health**: `/api/health`

See **[Production Deployment Guide](./docs/deployment/production.md)** for details.

## 🔐 Security

This platform implements comprehensive security measures:
- Input validation (Zod schemas)
- SQL injection prevention
- CSRF protection
- XSS prevention
- Rate limiting
- Security headers (Helmet)
- Audit logging

See **[Security Documentation](./docs/security/overview.md)** for details.

## 📝 API Documentation

### Authentication
```bash
POST /api/auth/signup-with-org    # Create organization + owner
POST /api/auth/login               # Login
POST /api/auth/refresh             # Refresh token
```

### Core Resources
```bash
GET    /api/stations               # List stations
GET    /api/audits                 # List audits
GET    /api/incidents              # List incidents
GET    /api/work-permits           # List work permits
```

All authenticated endpoints require:
```
Authorization: Bearer <jwt-token>
x-tenant-id: <organization-id>
```

See **[API Documentation](./docs/api/endpoints.md)** for complete reference.

## 🤝 Contributing

1. Follow existing code conventions
2. Write tests for new features
3. Update documentation
4. Keep commits focused and clear

## 📄 License

Proprietary - All rights reserved

## 📞 Support

- Documentation: [/docs](./docs)
- Developer Guide: [AGENTS.md](./AGENTS.md)
- Security Issues: security@hse.digital
