# Agent Guide

## Commands

**Setup:**
```bash
# Install dependencies
npm install
cd server && npm install

# Copy environment template
cp server/.env.example server/.env

# IMPORTANT: Configure required environment variables in .env:
# - DATABASE_URL (required) - PostgreSQL connection string
# - JWT_SECRET (required) - Secret key for JWT access tokens
# - REFRESH_SECRET (required) - Secret key for JWT refresh tokens
# - REDIS_HOST (required) - Redis host
# - REDIS_PORT (required) - Redis port
# The server will not start without these variables configured.

# Generate Prisma client and setup database
cd server
npx prisma generate
npx prisma db push
```

**Build:**
```bash
# No build step required for Node.js backend
npm run build  # Placeholder for frontend build
```

**Lint:**
```bash
npm run lint
```

**Test:**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit                    # Unit tests only
npm run test:integration             # Integration tests only
npm run test:regression              # Regression tests

# Quick syntax check
cd server && npm run lint
```

**Dev Server:**
```bash
# Start development server
npm run dev

# Server runs on http://localhost:3001
```

## Tech Stack
- **Language:** JavaScript (Node.js 18+)
- **Backend Framework:** Express.js
- **Database:** PostgreSQL 15 (with Prisma ORM)
- **Cache:** Redis 7
- **Queue:** Bull (with Bull Board dashboard)
- **Frontend:** React + Vite + TypeScript
- **Authentication:** JWT
- **Security:** Helmet, express-rate-limit, CORS
- **Monitoring:** Pino (logging), Prometheus (metrics), Sentry (errors + performance), OpenTelemetry (tracing), Grafana (dashboards)
- **Reports:** PDFKit (PDF generation), Puppeteer (chart rendering), AWS S3 (storage), Cron (scheduling)

## Architecture
- **Structure:** Multi-tenant SaaS with organization-based isolation
- **Pattern:** REST API with middleware-based request processing
- **Code Organization:** Modular structure with separation of concerns
  - `src/api/` - HTTP routes and middleware
  - `src/core/` - Business logic services
  - `src/infrastructure/` - External integrations (database, queue, monitoring)
  - `src/shared/` - Utilities and constants
- **Database:** Relational with RBAC (Role-Based Access Control)
  - Single source of truth for Prisma client: `src/shared/utils/db.js`
- **Caching:** Redis for rate limiting and session management
- **Background Jobs:** Bull queue system for async processing (emails, reports, exports, webhooks, tenant onboarding)
- **File Storage:** Local filesystem or S3

**See:** `server/ARCHITECTURE.md` for detailed structure documentation

## Services (Production)
Production deployment uses Kubernetes/EKS with:
- **app:** Node.js backend + frontend
- **postgres:** PostgreSQL database (managed RDS recommended)
- **redis:** Redis cache (ElastiCache or in-cluster)
- **jaeger:** Distributed tracing UI (optional)
- **prometheus:** Metrics collection (optional)
- **grafana:** Monitoring dashboards (optional)
- **loki:** Log aggregation (optional)

## Code Style
- Follow existing conventions in the codebase
- No comments unless necessary for complex logic
- Use ES6+ features and async/await
- Middleware-based architecture for Express routes
- Environment-based configuration

## Documentation Structure

All documentation is organized in the `/docs` directory:

### Architecture (`/docs/architecture/`)
- **overview.md** - System architecture overview
- **multi-tenancy.md** - Multi-tenant architecture and tenant isolation
- **tenant-isolation.md** - Data isolation strategies
- **row-level-security.md** - Database-level security
- **multi-region.md** - Multi-region deployment architecture
- **performance.md** - Performance optimization strategies

### API Reference (`/docs/api/`)
- **endpoints.md** - Complete REST API reference
- **mobile.md** - Mobile-specific API documentation
- **openapi.yaml** - OpenAPI 3.0 specification

### Deployment (`/docs/deployment/`)
- **quick-start.md** - Get started quickly
- **production.md** - Production deployment guide (Kubernetes)
- **runbook.md** - Step-by-step deployment procedures
- **multi-region.md** - Multi-region deployment
- **multi-region-runbook.md** - Multi-region operations
- **backup-disaster-recovery.md** - Backup strategies
- **backup-testing.md** - Backup testing procedures
- **capacity-planning.md** - Scaling and capacity planning

### Security (`/docs/security/`)
- **overview.md** - Comprehensive security guide
- **integration.md** - Security middleware integration
- **environment-variables.md** - Secure configuration
- **token-hashing.md** - Token security implementation
- **audit-logging.md** - Security audit logging

### Monitoring (`/docs/monitoring/`)
- **overview.md** - Complete monitoring guide
- **setup.md** - Monitoring stack setup
- **tracing.md** - OpenTelemetry tracing
- **tracing-examples.md** - Tracing implementation examples

### Features (`/docs/features/`)
- **reports.md** - PDF report generation engine
- **reports-quick-start.md** - Get started with reports
- **websockets.md** - Real-time notifications
- **websockets-quick-start.md** - WebSocket setup
- **queue-system.md** - Background job processing
- **quota-system.md** - Usage limits and quotas
- **notifications.md** - Notification system
- **stripe-billing.md** - Payment integration
- **stripe-integration-guide.md** - Stripe setup
- **tenant-migration.md** - Tenant migration API

## Key Features

### Report Generation Engine
Advanced PDF report generation with chart visualization, tenant branding, and scheduled delivery.

**Documentation:**
- Quick Start: [`docs/features/reports-quick-start.md`](docs/features/reports-quick-start.md)
- Full API Reference: [`docs/features/reports.md`](docs/features/reports.md)

**Key Capabilities:**
- PDF reports for audits, incidents, and compliance
- Chart embedding (bar, line, pie, doughnut)
- Custom tenant branding and templates
- S3 or local filesystem storage
- Scheduled reports via cron expressions
- Email delivery to recipients

**Test:**
```bash
cd server && node src/tests/report-generation.test.js
```

### WebSocket Notifications
Real-time notifications for audit updates, incident alerts, and system events.

**Documentation:**
- Quick Start: [`docs/features/websockets-quick-start.md`](docs/features/websockets-quick-start.md)
- Full Guide: [`docs/features/websockets.md`](docs/features/websockets.md)

### Multi-Tenant Architecture
Organization-based data isolation with row-level security.

**Documentation:**
- Architecture: [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md)
- Isolation Guide: [`docs/architecture/tenant-isolation.md`](docs/architecture/tenant-isolation.md)

### Security Implementation
Comprehensive security with CSRF protection, rate limiting, and audit logging.

**Documentation:**
- Security Overview: [`docs/security/overview.md`](docs/security/overview.md)
- Integration Guide: [`docs/security/integration.md`](docs/security/integration.md)

### Monitoring & Observability
Full observability with Prometheus, Sentry, OpenTelemetry, and Grafana.

**Documentation:**
- Monitoring Guide: [`docs/monitoring/overview.md`](docs/monitoring/overview.md)
- Setup Instructions: [`docs/monitoring/setup.md`](docs/monitoring/setup.md)

## Quick Reference

### API Documentation
- Full API Reference: [`docs/api/endpoints.md`](docs/api/endpoints.md)
- Mobile API: [`docs/api/mobile.md`](docs/api/mobile.md)

### Deployment Guides
- Quick Start: [`docs/deployment/quick-start.md`](docs/deployment/quick-start.md)
- Production: [`docs/deployment/production.md`](docs/deployment/production.md)

### Development Workflow
1. Check [`docs/deployment/quick-start.md`](docs/deployment/quick-start.md) for setup
2. Review [`docs/api/endpoints.md`](docs/api/endpoints.md) for API reference
3. Follow [`docs/architecture/overview.md`](docs/architecture/overview.md) for system design
4. Implement features following existing patterns
5. Test using `npm test`
6. Update documentation as needed

## Backend Structure

The backend follows a modular architecture with clear separation of concerns:

```
server/src/
├── index.js                 # Application entry point
├── api/                     # HTTP interface layer
│   ├── routes/              # Express route handlers
│   └── middleware/          # Request/response middleware
├── core/                    # Business logic layer
│   └── services/            # Domain services
├── infrastructure/          # External systems layer
│   ├── database/           # Prisma client & migrations
│   ├── queue/              # Background jobs & queues
│   ├── monitoring/         # Alerts & monitoring
│   ├── config/             # Infrastructure configuration
│   └── external/           # Third-party SDKs
└── shared/                  # Shared utilities
    ├── utils/              # Common utilities (logger, cache, etc.)
    └── constants/          # Shared constants
```

**Key Principle:** All database access goes through `src/shared/utils/db.js` (single source of truth for Prisma client).

**Documentation:**
- Architecture details: `server/ARCHITECTURE.md`
- Migration guide: `server/RESTRUCTURE_MIGRATION.md`

## Additional Resources

- **[Complete Documentation Index](docs/README.md)** - Browse all documentation
- **[Main README](README.md)** - Project overview and quick start
- **[OpenAPI Spec](docs/api/openapi.yaml)** - API specification
