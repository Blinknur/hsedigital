# Configuration Migration Guide

This guide explains the changes to configuration and environment management in the HSE Digital platform.

## What Changed?

### Directory Structure
```
OLD STRUCTURE:
├── .env.example
├── .env.multiregion.example
├── server/.env.example
├── docker-compose.yml
├── docker-compose.test.yml
├── docker-compose.monitoring.yml
├── docker-compose.multiregion.yml
└── Dockerfile

NEW STRUCTURE:
├── .env.example (consolidated)
├── config/
│   ├── index.js (centralized config loader)
│   ├── environments/
│   │   ├── .env.development
│   │   ├── .env.staging
│   │   ├── .env.production
│   │   └── .env.multiregion
│   └── README.md
└── docker/
    ├── Dockerfile
    ├── docker-compose.yml
    ├── docker-compose.test.yml
    ├── docker-compose.monitoring.yml
    ├── docker-compose.multiregion.yml
    └── README.md
```

### Key Changes

1. **Consolidated Environment Files**
   - All `.env.example` files merged into single root `.env.example`
   - Environment-specific templates in `config/environments/`
   - Removed `server/.env.example` and `.env.multiregion.example`

2. **Docker Configuration**
   - All Docker files moved to `docker/` directory
   - Updated paths in docker-compose files
   - Updated npm scripts to reference new locations

3. **Centralized Configuration**
   - New `config/index.js` for centralized config loading
   - Typed configuration object with defaults
   - Environment validation at startup

4. **Documentation**
   - `config/README.md` - Complete environment documentation
   - `docker/README.md` - Docker setup and usage
   - This migration guide

## Migration Steps

### For Developers (Local Development)

1. **Update your .env file:**
   ```bash
   # Backup your current .env
   cp .env .env.backup
   
   # Copy new development template
   cp config/environments/.env.development .env
   
   # Copy your custom values from .env.backup to .env
   # Focus on: JWT_SECRET, REFRESH_SECRET, API_KEY, STRIPE_SECRET_KEY, etc.
   ```

2. **Update Docker commands:**
   ```bash
   # OLD
   docker-compose up -d
   
   # NEW
   docker-compose -f docker/docker-compose.yml up -d
   # OR use npm scripts (already updated)
   npm run docker:up
   ```

3. **Update any custom scripts:**
   - Replace `docker-compose.yml` with `docker/docker-compose.yml`
   - Replace `Dockerfile` with `docker/Dockerfile`

### For CI/CD Pipelines

1. **Update build commands:**
   ```bash
   # OLD
   docker build -t app:latest .
   
   # NEW
   docker build -f docker/Dockerfile -t app:latest .
   ```

2. **Update docker-compose references:**
   ```bash
   # OLD
   docker-compose -f docker-compose.production.yml up -d
   
   # NEW
   docker-compose -f docker/docker-compose.yml up -d
   ```

3. **Update environment file sourcing:**
   ```bash
   # Use appropriate environment template
   cp config/environments/.env.production .env
   # Then inject secrets from your secret manager
   ```

### For Staging/Production Deployments

1. **Choose appropriate environment template:**
   ```bash
   # Staging
   cp config/environments/.env.staging .env
   
   # Production
   cp config/environments/.env.production .env
   
   # Multi-region
   cp config/environments/.env.multiregion .env
   ```

2. **Update all CHANGE_ME values:**
   - Replace all placeholder values with actual secrets
   - Use secret management service (AWS Secrets Manager, Vault, etc.)
   - Never commit actual secrets to repository

3. **Verify configuration:**
   ```bash
   # Test that app starts without errors
   npm start
   
   # Check that all required env vars are set
   # App will exit with error if JWT_SECRET or REFRESH_SECRET missing
   ```

## NPM Scripts (Already Updated)

All npm scripts in `package.json` have been updated:

```bash
npm run docker:up          # Now uses docker/docker-compose.yml
npm run docker:down        # Now uses docker/docker-compose.yml
npm run docker:logs        # Now uses docker/docker-compose.yml
npm run docker:build       # Now uses docker/docker-compose.yml
# ... etc
```

## Breaking Changes

### 1. Docker Compose File Paths
**Impact:** CI/CD pipelines, scripts, documentation

**Before:**
```bash
docker-compose up -d
```

**After:**
```bash
docker-compose -f docker/docker-compose.yml up -d
# OR
npm run docker:up
```

### 2. Dockerfile Path
**Impact:** Build scripts, CI/CD pipelines

**Before:**
```bash
docker build -t app:latest .
```

**After:**
```bash
docker build -f docker/Dockerfile -t app:latest .
```

### 3. Environment File Locations
**Impact:** Setup documentation, onboarding

**Before:**
```bash
cp .env.local .env
cp server/.env.example server/.env
```

**After:**
```bash
cp config/environments/.env.development .env
```

### 4. Configuration Import (Code)
**Impact:** Server code using process.env directly

**Before:**
```javascript
import dotenv from 'dotenv';
dotenv.config();
const PORT = process.env.PORT || 3001;
```

**After:**
```javascript
import config from '../config/index.js';
const PORT = config.port;
```

## New Features

### 1. Centralized Configuration
Import config anywhere in the application:

```javascript
import config from '../config/index.js';

console.log(config.port);
console.log(config.database.connectionLimit);
console.log(config.jwt.secret);
console.log(config.integrations.stripe.secretKey);
```

### 2. Environment-Specific Templates
Easy switching between environments:

```bash
# Development
cp config/environments/.env.development .env

# Staging
cp config/environments/.env.staging .env

# Production
cp config/environments/.env.production .env
```

### 3. Automatic Validation
Application validates required environment variables at startup:

```javascript
import { validateRequiredEnvVars } from '../config/index.js';
validateRequiredEnvVars(); // Exits if JWT_SECRET or REFRESH_SECRET missing
```

### 4. Type-Safe Configuration
Configuration object with proper types and defaults:

```javascript
config.database.connectionLimit  // Always a number
config.monitoring.otel.enabled   // Always a boolean
config.jwt.secret                // Always a string (or undefined)
```

## Troubleshooting

### Application won't start after migration

**Check:**
1. `.env` file exists in project root
2. `JWT_SECRET` and `REFRESH_SECRET` are set in `.env`
3. Docker paths updated in scripts

**Solution:**
```bash
# Ensure .env exists
cp config/environments/.env.development .env

# Add required secrets
echo "JWT_SECRET=your-secret-here" >> .env
echo "REFRESH_SECRET=your-refresh-secret-here" >> .env
```

### Docker commands fail

**Error:** `Cannot find docker-compose.yml`

**Solution:**
```bash
# Use new paths
docker-compose -f docker/docker-compose.yml up -d

# Or use npm scripts
npm run docker:up
```

### Missing environment variables

**Error:** `Missing required environment variables: JWT_SECRET`

**Solution:**
```bash
# Check your .env file has all required variables
# See config/README.md for complete list
cp config/environments/.env.development .env
# Edit .env and set JWT_SECRET and REFRESH_SECRET
```

## Rollback Instructions

If you need to rollback to the old structure:

```bash
# This is not recommended, but if necessary:
git checkout HEAD~1 -- .env.example server/.env.example .env.multiregion.example
git checkout HEAD~1 -- docker-compose.yml docker-compose.*.yml Dockerfile
git checkout HEAD~1 -- package.json

# Remove new directories
rm -rf config/ docker/

# Restore your .env from backup
cp .env.backup .env
```

## Support

For questions or issues:

1. Check [config/README.md](../config/README.md) for configuration documentation
2. Check [docker/README.md](../docker/README.md) for Docker documentation
3. Check [AGENTS.md](../AGENTS.md) for updated development commands
4. Review this migration guide
5. Contact the development team

## Timeline

- **Migration Date:** 2024
- **Deprecation Period:** None (immediate)
- **Old Structure Support:** Removed
