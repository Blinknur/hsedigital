
# HSE.Digital - Compliance & Safety Platform

HSE.Digital is a unified SaaS platform for managing audits, compliance checklists, incidents, and contractor permits for fuel station networks.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- Docker & Docker Compose

### Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hse-digital-backend
   ```

2. **Configure environment variables**
   ```bash
   # Copy the local environment template
   cp .env.local .env
   
   # Edit .env with your local configuration
   # At minimum, update API_KEY for Gemini AI
   ```

3. **Start all services with Docker**
   ```bash
   npm run docker:up
   ```

   This will start:
   - **App** (Node.js Backend + Frontend) on `http://localhost:3001`
   - **PostgreSQL** database on `localhost:5432`
   - **Redis** cache on `localhost:6379`
   - **pgAdmin** database management on `http://localhost:5050`

4. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma db push
   ```

5. **Access the application**
   - Main App: http://localhost:3001
   - API Health: http://localhost:3001/api/health
   - pgAdmin: http://localhost:5050 (login with credentials from .env)

### Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs (all services)
npm run docker:logs

# View logs (specific service)
npm run docker:logs:app
npm run docker:logs:db
npm run docker:logs:redis

# Rebuild containers
npm run docker:build

# Restart services
npm run docker:restart

# Stop and remove volumes (clean slate)
npm run docker:clean

# View running containers
npm run docker:ps
```

### Local Development (Without Docker)

If you prefer to run services locally:

1. **Install dependencies**
   ```bash
   npm install
   cd server && npm install
   ```

2. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker for databases only
   docker-compose up -d postgres redis
   
   # Or install PostgreSQL and Redis locally
   ```

3. **Configure environment**
   ```bash
   cp .env.local .env
   # Update DATABASE_URL, REDIS_HOST, etc.
   ```

4. **Run migrations**
   ```bash
   npm run prisma:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗 Project Structure

*   `/src` (implied root): React Frontend code.
*   `/api`: Frontend API client & Mock services.
*   `/server`: Node.js/Express Backend.
*   `/prisma`: Database schema.
*   `/components`: UI Components.

## 🐳 Docker Services

### Application Stack
- **app**: Node.js backend + frontend (port 3001)
  - Multi-stage build for optimized production image
  - Health checks enabled
  - Volume-mounted uploads directory

### Infrastructure
- **postgres**: PostgreSQL 15 database (port 5432)
  - Persistent data storage
  - Health checks with pg_isready
  - Automatic backup-ready

- **redis**: Redis 7 cache (port 6379)
  - Used for rate limiting and session caching
  - Persistence enabled (saves every 60 seconds)
  - Health checks enabled

- **pgadmin**: Database management UI (port 5050)
  - Visual query builder and database explorer
  - Only enabled in development/staging
  - Login: admin@hse.digital / admin123 (configurable)

### Health Checks
All services include health checks to ensure stability:
- **App**: HTTP check on `/api/health`
- **PostgreSQL**: pg_isready command
- **Redis**: PING command
- **pgAdmin**: HTTP ping endpoint

## 🔧 Environment Configuration

Three environment files are provided:

### `.env.local` (Development)
- Local development with Docker
- Test API keys and dummy credentials
- Ethereal email for testing

### `.env.staging` (Staging)
- Pre-production testing environment
- Managed database and Redis instances
- Real email service (SendGrid)
- Stripe test mode

### `.env.production` (Production)
- Production-ready configuration
- Strong cryptographic secrets
- Managed services (AWS RDS, Redis Cloud)
- Stripe live mode
- Monitoring and analytics enabled

**⚠️ Security Note**: Never commit `.env.production` with real secrets. Use environment variables or secret management services (AWS Secrets Manager, HashiCorp Vault, etc.).

## 🛡 Security & Architecture

*   **Frontend:** React (Vite) + TypeScript.
*   **Backend:** Node.js (Express) with Helmet security headers and Rate Limiting.
*   **Database:** PostgreSQL with Row-Level Security (RLS) for multi-tenancy.
*   **Auth:** JWT-based authentication with refresh tokens.
*   **Caching:** Redis for rate limiting and session management.
*   **Containerization:** Docker multi-stage builds for optimized production images.

## 🔍 Troubleshooting

### Common Issues

**Services won't start**
```bash
# Check if ports are already in use
lsof -i :3001  # App
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :5050  # pgAdmin

# Clean and restart
npm run docker:clean
npm run docker:up
```

**Database connection errors**
```bash
# Verify PostgreSQL is healthy
docker-compose ps
npm run docker:logs:db

# Reset database
npm run docker:down
docker volume rm hse_postgres_data
npm run docker:up
```

**Can't connect to pgAdmin**
- Default login: `admin@hse.digital` / `admin123`
- First time: Add server manually
  - Host: `postgres` (container name)
  - Port: `5432`
  - Username: `hse_admin`
  - Password: `dev_password_123`

**Redis connection errors**
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### Health Check Endpoints

```bash
# Application health
curl http://localhost:3001/api/health

# Expected response:
# {"status":"online","db":"connected","mode":"development"}
```

## 🚢 Deployment

### Building for Production

```bash
# Build production Docker image
docker build -t hse-digital:latest .

# Test production build locally
docker run -p 3001:3001 --env-file .env.production hse-digital:latest
```

### Environment-Specific Deployment

**Staging**
```bash
docker-compose --env-file .env.staging up -d
```

**Production**
```bash
# Use managed services for database and Redis
# Deploy container to cloud platform (AWS ECS, DigitalOcean, Railway, etc.)
docker-compose --env-file .env.production up -d
```

### Database Migrations

```bash
# Development
npm run prisma:push

# Production (use migrations instead of push)
npx prisma migrate deploy
```

## 🎯 Mission Roadmap (V1 to Launch)

We are currently transitioning from **Build** to **Launch Readiness**.

### ✅ 3. Architecture & Technical Foundation
- [x] Frontend Stack: React / Vite / Tailwind.
- [x] Backend Stack: Node.js / Express.
- [x] Multi-tenancy: Organization-based isolation wired into API context.

### ✅ 4. Development & CI/CD Pipeline
- [x] Linting & Basic Tests setup.
- [x] Monorepo structure prepared.

### ✅ 5. V1 Build & Internal QA
- [x] **Authentication**: JWT Login & Sign Up flows.
- [x] **Core Features**: Audits, Checklists, Incidents, Permits.
- [x] **Roles**: Admin, Manager, Auditor, Contractor.

### 🔄 6. Beta Launch & Customer Feedback Loop
- [ ] Deploy to staging environment (Vercel/Render).
- [ ] Instrument analytics (PostHog/Amplitude).

### 🔄 7. Monetization & Billing Setup
- [x] **Pricing UI**: Plans displayed in Settings.
- [x] **Billing Flow**: Frontend connected to Backend API.
- [ ] **Stripe**: Replace backend mock `paymentService` with real Stripe SDK.

### 🔄 8. Security, Compliance & Trust Layer
- [x] **Security Headers**: Helmet & Rate Limiting configured.
- [ ] **Database**: Provision managed PostgreSQL (AWS RDS).
- [ ] **Backups**: Configure automated daily backups.

### 🔜 9. Launch Readiness & GTM Execution
- [ ] SEO Landing Pages (deployed).
- [ ] Onboarding Email Flows (SendGrid integration).

### 🔜 10. Growth & Scale Enablement
- [ ] Churn recovery workflows.
- [ ] Scale infrastructure based on load.

## 📚 Documentation

*   **[Architecture Blueprint](docs/architecture.md)**: Technical foundation.
*   **[API Specification](docs/openapi.yaml)**: REST API endpoints.
*   **[Database Schema](docs/schema.sql)**: SQL structure.

---

## 📋 Multi-Tenant SaaS Audit & Implementation Backlog

A comprehensive audit has been conducted to identify missing components required for a production-ready multi-tenant SaaS application.

### Audit Documents

- **[SaaS Audit Report](SAAS_AUDIT_REPORT.md)** - Comprehensive audit of missing components (32 identified gaps)
- **[Prioritized Backlog Part 1](PRIORITIZED_BACKLOG_PART1.md)** - Items 1-20 (Foundation, Multi-Tenancy, Auth)
- **[Prioritized Backlog Part 2](PRIORITIZED_BACKLOG_PART2.md)** - Items 21-48 (Billing, Rate Limiting, Security)
- **[Prioritized Backlog Part 3](PRIORITIZED_BACKLOG_PART3.md)** - Items 49-77 (Infrastructure, Admin, Testing)

### Key Audit Findings

- **Total Work Items:** 77 implementation-ready tasks
- **Priority Breakdown:**
  - P0 Critical: 15 items (blockers)
  - P1 High: 28 items (production-ready requirements)
  - P2 Medium: 27 items (operational efficiency)
  - P3 Low: 7 items (nice-to-have enhancements)
- **Timeline:** 4-6 months with 3-5 developer team
- **MVP Timeline:** 2-3 months focusing on 30 critical items

### Implementation Phases

1. **Phase 0:** Foundation & Technology Selection
2. **Phase 1:** Core Multi-Tenancy
3. **Phase 2:** Authentication & Authorization
4. **Phase 3:** Subscription & Billing
5. **Phase 4:** API Rate Limiting
6. **Phase 5:** Resource Isolation & Configuration
7. **Phase 6:** Security & Compliance
8. **Phase 7:** Infrastructure & Operations
9. **Phase 8:** Admin Tools & Support
10. **Phase 9:** Testing & Quality Assurance
11. **Phase 10:** Optional Enhancements

See the detailed audit report and backlog files for complete implementation guidance.
