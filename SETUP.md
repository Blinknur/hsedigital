# HSE.Digital - Local Development Setup Guide

This guide provides step-by-step instructions for setting up and running the HSE.Digital multi-tenant SaaS application in your local development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Starting the Application](#starting-the-application)
5. [Database Setup](#database-setup)
6. [Verification](#verification)
7. [Development Workflow](#development-workflow)
8. [Docker Management](#docker-management)
9. [Troubleshooting](#troubleshooting)
10. [Available npm Scripts](#available-npm-scripts)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js**: Version 18 or higher
  - Check version: `node --version`
  - Download: https://nodejs.org/

- **npm**: Version 8 or higher (comes with Node.js)
  - Check version: `npm --version`

- **Docker**: Version 20.10 or higher
  - Check version: `docker --version`
  - Download: https://www.docker.com/products/docker-desktop

- **Docker Compose**: Version 2.0 or higher
  - Check version: `docker-compose --version`
  - Included with Docker Desktop

### Optional Tools

- **Git**: For cloning the repository
- **PostgreSQL Client**: For direct database access (optional, pgAdmin is included)
- **Redis CLI**: For Redis debugging (optional)

---

## Initial Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd hse-digital-backend
```

### Step 2: Install Root Dependencies

```bash
npm install
```

**What this does**: Installs the root-level dependencies and scripts for Docker management.

### Step 3: Install Server Dependencies

```bash
cd server
npm install
cd ..
```

**What this does**: Installs all backend dependencies including Express, Prisma, JWT, Stripe, Redis, and monitoring tools.

---

## Environment Configuration

### Step 4: Create Environment File

Copy the example environment file and configure it for local development:

```bash
cp server/.env.example server/.env
```

### Step 5: Configure Required Environment Variables

Open `server/.env` in your text editor and configure the following variables:

#### Database Configuration (Required)

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://hse_admin:dev_password_123@localhost:5432/hse_platform

# Database credentials (used by Docker Compose)
POSTGRES_USER=hse_admin
POSTGRES_PASSWORD=dev_password_123
POSTGRES_DB=hse_platform
```

**Note**: These default credentials are for local development only. **MUST** be changed for production.

#### JWT Secrets (Required)

```bash
# JWT authentication secrets - MUST change in production
JWT_SECRET=dev-secret-key-change-in-prod
REFRESH_SECRET=dev-refresh-secret-key
```

**Security Warning**: Generate strong, unique secrets for production using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Redis Configuration (Required)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**Note**: Leave `REDIS_PASSWORD` empty for local development. Set a strong password in production.

#### Application URLs (Required)

```bash
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

#### Google Gemini AI (Required for AI Features)

```bash
API_KEY=your-gemini-api-key-here
```

**How to get a Gemini API key**:
1. Visit https://makersuite.google.com/app/apikey
2. Create or select a project
3. Generate an API key
4. Copy the key to your `.env` file

**Note**: AI assistant features will not work without a valid API key.

#### Stripe Payment Integration (Optional for local dev)

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_STARTER=price_starter_id
STRIPE_PRICE_PROFESSIONAL=price_professional_id
STRIPE_PRICE_ENTERPRISE=price_enterprise_id
```

**How to get Stripe test keys**:
1. Sign up at https://stripe.com
2. Navigate to Developers → API keys
3. Copy your test secret key (starts with `sk_test_`)
4. For webhook secret, set up a webhook endpoint and copy the signing secret

**Note**: You can skip Stripe configuration if not testing billing/subscription features.

#### Email Configuration (Optional)

```bash
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your.email@ethereal.email
SMTP_PASS=your_password
```

**How to get test email credentials**:
1. Visit https://ethereal.email
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials to your `.env` file

**Note**: Ethereal.email is a fake SMTP service for testing. Emails won't actually be delivered.

#### pgAdmin Configuration (Optional)

```bash
PGADMIN_EMAIL=admin@hse.digital
PGADMIN_PASSWORD=admin123
```

These credentials are used to log into pgAdmin at http://localhost:5050.

#### Monitoring & Observability (Optional)

```bash
# Logging
LOG_LEVEL=info
SLOW_QUERY_THRESHOLD_MS=1000

# Sentry Error Tracking (optional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Alerting Thresholds
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_RESPONSE_TIME_MS=5000
ALERT_DB_QUERY_TIME_MS=2000
ALERT_RATE_LIMIT_HITS=100

# Slack Webhook for alerts (optional)
SLACK_WEBHOOK_URL=

# PagerDuty for critical alerts (optional)
PAGERDUTY_INTEGRATION_KEY=
```

**Note**: Monitoring and logging features work without these, but alerts won't be sent externally.

#### Audit Log Configuration

```bash
AUDIT_LOG_RETENTION_DAYS=365
```

---

## Starting the Application

### Step 6: Start Docker Services

Start PostgreSQL, Redis, pgAdmin, and the application using Docker Compose:

```bash
npm run docker:up
```

**What this does**:
- Pulls required Docker images (first time only)
- Creates Docker volumes for data persistence
- Starts PostgreSQL on port 5432
- Starts Redis on port 6379
- Starts pgAdmin on port 5050
- Builds and starts the application on port 3001

**Wait for services to be ready** (about 30-60 seconds on first run).

Verify services are running:

```bash
npm run docker:ps
```

You should see output like:
```
NAME                IMAGE                    STATUS
hse_app             hse-digital:latest       Up
hse_db              postgres:15-alpine       Up (healthy)
hse_cache           redis:7-alpine           Up (healthy)
hse_pgadmin         dpage/pgadmin4:latest    Up (healthy)
```

---

## Database Setup

### Step 7: Run Database Migrations

Apply the database schema using Prisma migrations:

```bash
cd server
npx prisma migrate dev
```

**What this does**:
- Creates all database tables (User, Organization, Station, Audit, Incident, WorkPermit, etc.)
- Applies Row-Level Security (RLS) policies for tenant isolation
- Sets up indexes for query performance
- Creates foreign key constraints for data integrity

**Alternative**: If migrations fail or you want a quick setup, use `prisma db push`:

```bash
npx prisma db push
```

**Note**: `db push` is faster but doesn't create migration history files.

### Step 8: Seed the Database

Populate the database with default roles, permissions, and optionally sample data:

```bash
npm run seed
```

**What this creates**:
- **Default Roles**: Admin, Manager, User, Auditor
- **Permissions**: Full CRUD permissions for stations, audits, incidents, work permits, contractors, users
- **Role-Permission Mappings**: Assigns appropriate permissions to each role
- **Sample Data** (optional): Test organization and users

**Alternative comprehensive seed**:

```bash
npm run seed:rbac
```

This creates a more comprehensive RBAC setup with additional granular permissions.

### Step 9: Generate Prisma Client (if needed)

Generate the Prisma client (should already be done during install, but run if needed):

```bash
npx prisma generate
```

---

## Verification

### Step 10: Verify the Application is Running

#### Check Health Endpoints

Test the health check endpoint:

```bash
curl http://localhost:3001/api/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "uptime": 123.456,
  "version": "1.0.0"
}
```

Test other health endpoints:

```bash
# Readiness probe (for Kubernetes)
curl http://localhost:3001/api/ready

# Liveness probe (for Kubernetes)
curl http://localhost:3001/api/live
```

#### Access the Application

Open your browser and navigate to:

- **Main Application**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **Prometheus Metrics**: http://localhost:3001/metrics
- **pgAdmin**: http://localhost:5050
  - Email: `admin@hse.digital` (or value from .env)
  - Password: `admin123` (or value from .env)

#### Test API Endpoints

Register a new user and organization:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "organizationName": "Test Organization"
  }'
```

Login with the credentials:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

**Expected response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "organizationId": "..."
  }
}
```

#### Check Docker Logs

View application logs to ensure everything started correctly:

```bash
npm run docker:logs:app
```

You should see:
```
🚀 Server running on http://localhost:3001
✅ Monitoring enabled: Logs (Pino), Metrics (Prometheus), Errors (Sentry), Alerts (Custom)
Initialized instrumented Prisma client
```

---

## Development Workflow

### Local Development (Without Docker)

If you prefer to run the application locally without Docker (but still use Docker for databases):

#### 1. Start Only Database Services

```bash
docker-compose up -d postgres redis
```

This starts only PostgreSQL and Redis, not the application.

#### 2. Update DATABASE_URL

Ensure `server/.env` has the correct connection string for localhost:

```bash
DATABASE_URL=postgresql://hse_admin:dev_password_123@localhost:5432/hse_platform
REDIS_HOST=localhost
```

#### 3. Start the Development Server

```bash
cd server
npm run dev
```

**What this does**: Starts the application with `nodemon` for auto-reloading on file changes.

The server will restart automatically when you save files.

### Making Code Changes

1. Make your changes in the `server/` directory
2. If using `npm run dev`, the server will automatically reload
3. Check logs for errors: `npm run docker:logs:app` (if using Docker) or check the terminal
4. Test your changes using curl or Postman

### Database Schema Changes

#### 1. Update the Prisma Schema

Edit `server/prisma/schema.prisma` to add/modify models:

```prisma
model NewModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

#### 2. Create a Migration

```bash
cd server
npx prisma migrate dev --name your_migration_name
```

#### 3. Apply the Migration

```bash
npx prisma migrate deploy
```

### Accessing the Database

#### Using pgAdmin

1. Open http://localhost:5050
2. Login with credentials from `.env`
3. Add a new server:
   - **Name**: HSE Platform
   - **Host**: `postgres` (if using Docker) or `localhost`
   - **Port**: 5432
   - **Database**: `hse_platform`
   - **Username**: `hse_admin`
   - **Password**: `dev_password_123`

#### Using Prisma Studio

```bash
cd server
npx prisma studio
```

This opens a web-based database GUI at http://localhost:5555.

---

## Docker Management

### Available Docker Commands

All commands can be run from the project root:

#### Start Services

```bash
npm run docker:up
```

Starts all services (app, postgres, redis, pgadmin) in detached mode.

#### Stop Services

```bash
npm run docker:down
```

Stops all running services but preserves data volumes.

#### View Logs

```bash
# All services
npm run docker:logs

# Specific services
npm run docker:logs:app      # Application logs
npm run docker:logs:db       # PostgreSQL logs
npm run docker:logs:redis    # Redis logs
```

#### Rebuild Containers

```bash
npm run docker:build
```

Rebuilds all Docker images without using cache. Use this after changing dependencies or Dockerfile.

#### Restart Services

```bash
npm run docker:restart
```

Restarts all running services.

#### Clean Up Everything

```bash
npm run docker:clean
```

**Warning**: This removes all containers AND volumes, deleting all data. Use for a fresh start.

#### Check Service Status

```bash
npm run docker:ps
```

Lists all running containers with their status.

#### Check Health

```bash
npm run docker:health
```

Checks the health status of all services.

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Port Conflicts

**Issue**: Error message like "Port 5432 is already in use" or "Port 3001 is already allocated"

**Solutions**:

- **Check what's using the port**:
  ```bash
  # On macOS/Linux
  lsof -i :5432
  lsof -i :3001
  
  # On Windows
  netstat -ano | findstr :5432
  netstat -ano | findstr :3001
  ```

- **Stop the conflicting service**:
  ```bash
  # Stop local PostgreSQL
  sudo systemctl stop postgresql  # Linux
  brew services stop postgresql   # macOS
  
  # Stop local Redis
  sudo systemctl stop redis       # Linux
  brew services stop redis        # macOS
  ```

- **Change the port** in `docker-compose.yml`:
  ```yaml
  ports:
    - "5433:5432"  # Map to different host port
  ```
  
  Then update `DATABASE_URL` in `server/.env` to use the new port.

#### 2. Database Connection Errors

**Issue**: "Can't reach database server" or "Connection refused"

**Solutions**:

- **Wait for services to start**: Database takes 10-30 seconds to initialize
  ```bash
  npm run docker:logs:db
  # Wait for "database system is ready to accept connections"
  ```

- **Check database is running**:
  ```bash
  npm run docker:ps
  # Ensure postgres container shows "Up (healthy)"
  ```

- **Verify DATABASE_URL**:
  ```bash
  # In server/.env, ensure correct format:
  DATABASE_URL=postgresql://hse_admin:dev_password_123@localhost:5432/hse_platform
  
  # If running app in Docker, use service name:
  DATABASE_URL=postgresql://hse_admin:dev_password_123@postgres:5432/hse_platform
  ```

- **Reset database**:
  ```bash
  npm run docker:clean
  npm run docker:up
  cd server && npx prisma db push && npm run seed
  ```

#### 3. Missing Environment Variables

**Issue**: "Environment variable not found" or features not working

**Solutions**:

- **Verify .env file exists**:
  ```bash
  ls -la server/.env
  ```

- **Copy from example if missing**:
  ```bash
  cp server/.env.example server/.env
  ```

- **Check required variables are set**:
  ```bash
  cd server
  cat .env | grep -E "DATABASE_URL|JWT_SECRET|REDIS_HOST"
  ```

- **Restart after changing .env**:
  ```bash
  npm run docker:restart
  # Or if running locally:
  # Stop the server and run npm run dev again
  ```

#### 4. Prisma Migration Errors

**Issue**: "Migration failed" or "Schema drift detected"

**Solutions**:

- **Reset the database**:
  ```bash
  cd server
  npx prisma migrate reset
  ```

- **Use db push for development**:
  ```bash
  npx prisma db push
  ```

- **Clear Prisma cache**:
  ```bash
  rm -rf node_modules/.prisma
  npx prisma generate
  ```

#### 5. Docker Build Failures

**Issue**: "Docker build failed" or "Cannot find module"

**Solutions**:

- **Clear Docker cache and rebuild**:
  ```bash
  npm run docker:build
  ```

- **Remove all Docker artifacts**:
  ```bash
  docker system prune -a
  npm run docker:up
  ```

- **Check Docker has enough resources**:
  - Docker Desktop → Settings → Resources
  - Increase Memory to at least 4GB
  - Increase Disk space if needed

#### 6. Redis Connection Errors

**Issue**: "Redis connection failed" or "ECONNREFUSED"

**Solutions**:

- **Check Redis is running**:
  ```bash
  npm run docker:logs:redis
  ```

- **Verify Redis configuration**:
  ```bash
  # In server/.env:
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=
  ```

- **Test Redis connection**:
  ```bash
  docker exec -it hse_cache redis-cli ping
  # Should return: PONG
  ```

#### 7. Seed Script Failures

**Issue**: "Seed failed" or "Unique constraint violation"

**Solutions**:

- **Clear existing data**:
  ```bash
  cd server
  npx prisma migrate reset
  npm run seed
  ```

- **Check seed script logs**:
  ```bash
  cd server
  npm run seed 2>&1 | tee seed.log
  ```

#### 8. Permission Denied Errors

**Issue**: "EACCES: permission denied" for uploads or logs

**Solutions**:

- **Fix upload directory permissions**:
  ```bash
  mkdir -p server/public/uploads
  chmod 755 server/public/uploads
  ```

- **Run with correct user** (if using Docker):
  ```bash
  # Add to docker-compose.yml under app service:
  user: "${UID}:${GID}"
  ```

#### 9. Module Not Found Errors

**Issue**: "Cannot find module" after installing dependencies

**Solutions**:

- **Reinstall dependencies**:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  
  cd server
  rm -rf node_modules package-lock.json
  npm install
  ```

- **Check Node.js version**:
  ```bash
  node --version  # Should be v18 or higher
  ```

#### 10. API Requests Fail with CORS Errors

**Issue**: Browser console shows CORS policy errors

**Solutions**:

- **Update CORS_ORIGIN** in `server/.env`:
  ```bash
  CORS_ORIGIN=http://localhost:5173
  # Or allow all for development:
  CORS_ORIGIN=*
  ```

- **Restart the server** after changing CORS settings

### Getting Help

If you encounter issues not covered here:

1. **Check logs**:
   ```bash
   npm run docker:logs:app
   ```

2. **Verify all services are healthy**:
   ```bash
   npm run docker:ps
   ```

3. **Review documentation**:
   - [API Documentation](API_DOCUMENTATION.md)
   - [Monitoring Guide](server/MONITORING.md)
   - [Docker Setup](DOCKER_SETUP.md)

4. **Contact the development team** with:
   - Error messages
   - Steps to reproduce
   - Your system information (OS, Node version, Docker version)

---

## Available npm Scripts

### Root Level Scripts

These commands run from the project root directory:

#### Docker Management

```bash
npm run docker:up          # Start all services in detached mode
npm run docker:down        # Stop all services (preserves volumes)
npm run docker:logs        # View logs from all services
npm run docker:logs:app    # View application logs only
npm run docker:logs:db     # View PostgreSQL logs only
npm run docker:logs:redis  # View Redis logs only
npm run docker:build       # Rebuild all Docker images (no cache)
npm run docker:restart     # Restart all running services
npm run docker:clean       # Remove containers and volumes (destructive)
npm run docker:ps          # List all containers and their status
npm run docker:health      # Check health status of all services
```

#### Build & Test

```bash
npm run build              # Build Docker production image
npm test                   # Run tests (placeholder)
npm run lint               # Run linter (placeholder)
```

### Server Level Scripts

These commands run from the `server/` directory:

#### Development

```bash
npm run dev                # Start development server with auto-reload
npm start                  # Start production server
```

#### Database Management

```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:push        # Push schema to database (no migrations)
npm run prisma:migrate     # Create and apply new migration
npm run prisma:migrate:deploy  # Apply migrations in production
npm run seed               # Seed database with default data
npm run seed:rbac          # Seed with comprehensive RBAC setup
```

#### Testing

```bash
npm test                   # Run all tests
npm run test:tenant        # Run tenant isolation unit tests
npm run test:tenant:integration  # Run tenant integration tests
npm run test:migrations    # Test database migrations
```

#### Custom Scripts

```bash
npm run prisma:migrate:custom    # Run custom migrations (up)
npm run prisma:rollback:custom   # Rollback custom migrations (down)
npm run rls:apply          # Apply Row-Level Security policies
npm run rls:test           # Test RLS implementation
```

### Backup Scripts

These commands handle database backups (from root directory):

```bash
npm run backup             # Create full database backup
npm run backup:tenant      # Create tenant-specific backup
npm run restore            # Restore database from backup
npm run restore:list       # List available backups
npm run backup:test        # Test weekly backup functionality
```

### Usage Examples

#### Starting Fresh

```bash
# Complete fresh start
npm run docker:clean
npm run docker:up
cd server
npx prisma migrate dev
npm run seed
cd ..
npm run docker:logs:app
```

#### Development Workflow

```bash
# Start services
npm run docker:up

# Watch logs in another terminal
npm run docker:logs:app

# Make code changes...
# Application auto-reloads with nodemon

# Stop when done
npm run docker:down
```

#### Database Reset

```bash
# Reset and reseed database
cd server
npx prisma migrate reset
npm run seed
cd ..
```

#### Production Build

```bash
# Build Docker image
npm run build

# Or with docker-compose
npm run docker:build
```

---

## Quick Start Summary

For experienced developers, here's the TL;DR:

```bash
# 1. Clone and install
git clone <repository-url>
cd hse-digital-backend
npm install
cd server && npm install && cd ..

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your API keys

# 3. Start services
npm run docker:up

# 4. Setup database
cd server
npx prisma migrate dev
npm run seed
cd ..

# 5. Verify
curl http://localhost:3001/api/health

# 6. Access application
open http://localhost:3001
```

**Key URLs**:
- Application: http://localhost:3001
- pgAdmin: http://localhost:5050
- Health Check: http://localhost:3001/api/health
- Metrics: http://localhost:3001/metrics

---

## Next Steps

After successfully setting up the application:

1. **Review Documentation**:
   - [API Documentation](API_DOCUMENTATION.md) - Complete API reference
   - [Monitoring Guide](server/MONITORING.md) - Observability and monitoring
   - [Security Guide](server/SECURITY.md) - Security best practices
   - [Agent Guide](AGENTS.md) - Development commands and workflows

2. **Explore Features**:
   - Create organizations and users
   - Set up stations and audits
   - Test RBAC permissions
   - Try the AI assistant features

3. **Development**:
   - Review the codebase structure
   - Understand the multi-tenant architecture
   - Learn the RBAC system
   - Explore monitoring and logging

4. **Production Deployment**:
   - Review [DOCKER_SETUP.md](DOCKER_SETUP.md) for production configuration
   - Set up proper secrets and environment variables
   - Configure monitoring and alerting
   - Set up backup strategies

---

## Additional Resources

- **Prisma Documentation**: https://www.prisma.io/docs
- **Express.js Guide**: https://expressjs.com/
- **Docker Documentation**: https://docs.docker.com/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Redis Documentation**: https://redis.io/docs/
- **Stripe API**: https://stripe.com/docs/api
- **Google Gemini AI**: https://ai.google.dev/

---

## Support

For issues, questions, or contributions:

- Review existing documentation
- Check troubleshooting section
- Examine Docker logs: `npm run docker:logs`
- Contact the development team

**Happy Coding! 🚀**
