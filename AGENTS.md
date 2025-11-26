# Agent Guide

## Commands

**Setup:**
```bash
# Local development
npm install
cd server && npm install
cp .env.local .env

# IMPORTANT: Configure required environment variables in .env:
# - JWT_SECRET (required) - Secret key for JWT access tokens
# - REFRESH_SECRET (required) - Secret key for JWT refresh tokens
# The server will not start without these variables configured.

# Docker setup (recommended)
npm run docker:up
docker-compose exec app npx prisma db push
```

**Build:**
```bash
# Docker production build
docker build -t hse-digital:latest .

# Or with docker-compose
npm run docker:build
```

**Lint:**
```bash
# To be added - ESLint configuration pending
npm run lint
```

**Test:**
```bash
# Run tests in Docker
docker-compose exec app npm test

# Local tests (requires dependencies)
cd server && npm test

# Quick syntax check
cd server && npm run lint
```

**Dev Server:**
```bash
# Local development
npm run dev

# Docker development
npm run docker:up
npm run docker:logs:app
```

**Docker Management:**
```bash
npm run docker:up          # Start all services
npm run docker:down        # Stop all services
npm run docker:logs        # View all logs
npm run docker:logs:app    # View app logs
npm run docker:logs:db     # View database logs
npm run docker:logs:redis  # View Redis logs
npm run docker:build       # Rebuild containers
npm run docker:restart     # Restart services
npm run docker:clean       # Clean all volumes
npm run docker:ps          # List containers
```

## Tech Stack
- **Language:** JavaScript (Node.js 18+)
- **Backend Framework:** Express.js
- **Database:** PostgreSQL 15 (with Prisma ORM)
- **Cache:** Redis 7
- **Queue:** Bull (with Bull Board dashboard)
- **Frontend:** React + Vite + TypeScript
- **Authentication:** JWT
- **Containerization:** Docker + Docker Compose
- **Security:** Helmet, express-rate-limit, CORS
- **Monitoring:** Pino (logging), Prometheus (metrics), Sentry (errors + performance), OpenTelemetry (tracing), Grafana (dashboards)
- **Reports:** PDFKit (PDF generation), Puppeteer (chart rendering), AWS S3 (storage), Cron (scheduling)

## Architecture
- **Structure:** Multi-tenant SaaS with organization-based isolation
- **Pattern:** REST API with middleware-based request processing
- **Database:** Relational with RBAC (Role-Based Access Control)
- **Caching:** Redis for rate limiting and session management
- **Background Jobs:** Bull queue system for async processing (emails, reports, exports, webhooks, tenant onboarding)
- **File Storage:** Local filesystem with volume mounts (Docker)
- **Multi-stage Docker:** Optimized production builds

## Services
- **app:** Node.js backend + frontend (port 3001)
- **postgres:** PostgreSQL database (port 5432)
- **redis:** Redis cache (port 6379)
- **jaeger:** Distributed tracing UI (port 16686)
- **pgadmin:** Database management UI (port 5050)
- **prometheus:** Metrics collection (port 9090) - optional
- **grafana:** Monitoring dashboards (port 3000) - optional
- **loki:** Log aggregation (port 3100) - optional

## Code Style
- Follow existing conventions in the codebase
- No comments unless necessary for complex logic
- Use ES6+ features and async/await
- Middleware-based architecture for Express routes
- Environment-based configuration

## Features

### Report Generation Engine
Advanced PDF report generation with chart visualization, tenant branding, and scheduled delivery.

**Documentation:**
- Quick Start: `server/REPORTS_QUICK_START.md`
- Full API Reference: `server/REPORTS_DOCUMENTATION.md`

**Key Capabilities:**
- PDF reports for audits, incidents, and compliance
- Chart embedding (bar, line, pie, doughnut)
- Custom tenant branding and templates
- S3 or local filesystem storage
- Scheduled reports via cron expressions
- Email delivery to recipients

**Test:**
```bash
cd server && node tests/report-generation.test.js
```
