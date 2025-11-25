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
   - API Metrics: http://localhost:3001/metrics
   - pgAdmin: http://localhost:5050 (login with credentials from .env)

### Quick Start with Full Monitoring Stack

For production-like monitoring setup with Prometheus, Grafana, and Loki:

```bash
# Start full monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access services
open http://localhost:3001      # Application
open http://localhost:3000      # Grafana (admin/admin123)
open http://localhost:9090      # Prometheus
```

See [server/MONITORING.md](server/MONITORING.md) for detailed monitoring documentation.

## 📊 Monitoring & Observability

This platform includes comprehensive monitoring and observability:

- **Structured JSON Logging**: Pino with automatic PII redaction
- **Health Check Endpoints**: `/api/health`, `/api/ready`, `/api/live`
- **Prometheus Metrics**: `/metrics` endpoint for scraping
- **Error Tracking**: Sentry integration (optional)
- **Performance Monitoring**: Slow query detection and tracking
- **Alerting**: Slack and PagerDuty integration
- **Dashboards**: Pre-built Grafana dashboards

**Key Monitoring Endpoints**:
- `GET /api/health` - Complete health status with DB/Redis checks
- `GET /api/ready` - Kubernetes readiness probe
- `GET /api/live` - Kubernetes liveness probe
- `GET /metrics` - Prometheus metrics export

**Documentation**: See [server/MONITORING.md](server/MONITORING.md) for complete guide.

## 🏗️ Architecture

- **Multi-tenant SaaS**: Organization-based isolation
- **REST API**: Express.js with middleware-based request processing
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache**: Redis 7 for rate limiting and sessions
- **Authentication**: JWT with role-based access control (RBAC)
- **Security**: Helmet, rate limiting, CSRF protection, input sanitization
- **Monitoring**: Pino logging, Prometheus metrics, Sentry errors

## 🔐 Security Features

- **Row-Level Security (RLS)**: Database-level tenant isolation
- **RBAC**: Fine-grained permission system
- **Rate Limiting**: Redis-based per-tenant, per-user, and IP-based
- **CSRF Protection**: Token-based protection for state-changing operations
- **Input Sanitization**: XSS and SQL injection prevention
- **Audit Logging**: All sensitive operations logged
- **JWT Authentication**: Secure token-based auth with refresh tokens

## 📦 Tech Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: PostgreSQL 15 (with Prisma ORM)
- **Cache**: Redis 7
- **Frontend**: React + Vite + TypeScript
- **Authentication**: JWT with bcrypt
- **Monitoring**: Pino (logs), Prometheus (metrics), Sentry (errors), Grafana (dashboards)
- **Containerization**: Docker + Docker Compose
- **Security**: Helmet, express-rate-limit, CORS, CSRF protection

## 📖 API Documentation

Comprehensive API documentation available in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

### Core Endpoints

**Authentication**:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/refresh` - Refresh access token

**Monitoring**:
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness probe
- `GET /api/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

**Resources** (authenticated):
- Stations: `/api/stations`
- Audits: `/api/audits`
- Incidents: `/api/incidents`
- Work Permits: `/api/work-permits`
- Contractors: `/api/contractors`

All authenticated endpoints require:
```
Authorization: Bearer <jwt-token>
x-tenant-id: <organization-id>
```

## 🧪 Testing

```bash
# Run all tests
cd server && npm test

# Run specific test suite
npm run test:tenant
npm run test:tenant:integration
```

## 🚢 Deployment

### Docker Production Build

```bash
# Build production image
docker build -t hse-digital:latest .

# Or with docker-compose
npm run docker:build
```

### Environment Variables

Required environment variables for production:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# JWT Secrets (MUST CHANGE IN PRODUCTION)
JWT_SECRET=your-secure-secret
REFRESH_SECRET=your-secure-refresh-secret

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Monitoring (Optional but Recommended)
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

# See server/.env.example for complete list
```

### Kubernetes Deployment

The application includes health check endpoints for Kubernetes:

```yaml
livenessProbe:
  httpGet:
    path: /api/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

## 📚 Documentation

- [API Documentation](API_DOCUMENTATION.md)
- [Monitoring & Observability](server/MONITORING.md)
- [Security Guide](server/SECURITY.md)
- [Tenant Architecture](server/TENANT_ARCHITECTURE.md)
- [Docker Setup](DOCKER_SETUP.md)
- [Agent Guide](AGENTS.md)

## 🛠️ Development

### Local Development

```bash
# Install dependencies
cd server && npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Docker Management Commands

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

### Database Management

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Run migrations
npm run prisma:migrate

# Seed database
npm run seed
```

## 🤝 Contributing

1. Follow existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

Proprietary - All rights reserved

## 🔗 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
