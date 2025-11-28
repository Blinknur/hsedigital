# HSE.Digital - Compliance & Safety Platform

Multi-tenant SaaS platform for managing audits, compliance checklists, incidents, and contractor permits for fuel station networks.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Start Development Environment

```bash
# Clone and setup
git clone <repository-url>
cd hse-digital-backend

# Install dependencies
npm install
cd server && npm install

# Configure environment
cp .env.example .env
# Edit .env and set required variables:
# - DATABASE_URL
# - JWT_SECRET
# - REFRESH_SECRET
# - REDIS_HOST
# - REDIS_PORT

# Initialize database
npx prisma generate
npx prisma db push

# Start the server
npm run dev
```

The platform is now running at:
- **App**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

## 📖 Documentation

Complete documentation is available in the [`/docs`](./docs) directory:

### For Developers
- **[Quick Start Guide](./docs/deployment/quick-start.md)** - Get started quickly
- **[API Reference](./docs/api/endpoints.md)** - Complete REST API documentation
- **[Architecture Overview](./docs/architecture/overview.md)** - System design and patterns

### For DevOps
- **[Production Deployment](./docs/deployment/production.md)** - Deploy to production (Kubernetes)
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
# Development
npm run dev                # Start development server
npm start                  # Start production server

# Database
npx prisma generate        # Generate Prisma client
npx prisma db push         # Apply schema changes
npx prisma studio          # Open Prisma Studio

# Testing
npm test                   # Run all tests
npm run test:unit          # Run unit tests
npm run test:integration   # Run integration tests

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
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
```

## 🌍 Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/database

# JWT Secrets (REQUIRED)
JWT_SECRET=your-secure-secret
REFRESH_SECRET=your-secure-refresh-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

See [server/.env.example](./server/.env.example) for complete configuration.

## 🚢 Deployment

### Production Deployment
The application is deployed to Kubernetes/EKS for production. See the **[Production Deployment Guide](./docs/deployment/production.md)** for complete instructions.

### Health Check Endpoints
For container orchestration platforms:
- **Liveness**: `/api/live`
- **Readiness**: `/api/ready`
- **Health**: `/api/health`

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
