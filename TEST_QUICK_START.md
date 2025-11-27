# Test Quick Start Guide

## TL;DR - Run Tests Now

```bash
# One command to run all tests
npm test
```

That's it! This will:
1. Start the Docker test environment
2. Run all tests
3. Keep the environment running for subsequent test runs

---

## Understanding the Test Setup

### Why Docker?

The test suite requires:
- ✅ PostgreSQL database with specific credentials
- ✅ Redis for caching tests
- ✅ Isolated environment (doesn't affect your dev database)
- ✅ Consistent across all developer machines

**Docker provides all of this automatically.**

### What's Running?

When you run tests, Docker starts:

| Service | Purpose | Port | Credentials |
|---------|---------|------|-------------|
| `postgres-test` | Test database | 5433 | `hse_test:test_password` |
| `redis-test` | Test cache | 6380 | None |
| `app-test` | Test app container | 3002 | N/A |

**Note:** These ports are different from development (5432, 6379, 3001) to avoid conflicts.

---

## Common Test Commands

### Run Tests

```bash
# All tests (recommended)
npm test

# Unit tests only (fast)
npm run test:unit

# Integration tests only
npm run test:integration

# Regression tests
npm run test:regression
```

### Manage Test Environment

```bash
# Start test environment (without running tests)
npm run test:setup

# View logs
npm run test:logs

# Stop test environment
npm run test:stop
```

### Direct Script Usage

```bash
# More options available
./scripts/run-tests.sh help

# Examples
./scripts/run-tests.sh docker       # Run all tests
./scripts/run-tests.sh unit         # Unit tests
./scripts/run-tests.sh setup        # Start environment
./scripts/run-tests.sh stop         # Stop environment
```

---

## Troubleshooting

### "Docker is not running"

**Solution:** Start Docker Desktop

```bash
# macOS
open -a Docker

# Then wait 30 seconds and try again
npm test
```

### "Port already in use"

**Check what's running:**
```bash
docker ps
lsof -i :5433  # Check PostgreSQL test port
lsof -i :6380  # Check Redis test port
lsof -i :3002  # Check app test port
```

**Solution:** Stop conflicting containers
```bash
npm run test:stop
docker ps  # Verify nothing's using test ports
npm test   # Try again
```

### "Tests are slow"

First run downloads Docker images and builds the container. Subsequent runs are much faster.

**First run:** ~2-3 minutes  
**Subsequent runs:** ~30 seconds

### "I want to run tests locally (without Docker)"

This is **not recommended** but possible:

**Requirements:**
1. Local PostgreSQL running on port 5432
2. Local Redis running on port 6379
3. Database credentials matching `.env` file

**Steps:**
```bash
# 1. Ensure PostgreSQL and Redis are running locally
# 2. Run tests
npm run test:local
```

**Why not recommended?**
- Tests may modify your development database
- Requires manual setup of credentials
- Not portable across developer machines
- Different from CI/CD environment

---

## Advanced Usage

### Run Tests Inside Container

```bash
# Start environment
npm run test:setup

# Run tests inside the container (fastest for repeated runs)
docker-compose -f docker/docker-compose.test.yml exec app-test npm test

# Run specific test file
docker-compose -f docker/docker-compose.test.yml exec app-test npm test -- tests/auth.test.js

# Run with coverage
docker-compose -f docker/docker-compose.test.yml exec app-test npm run test:coverage
```

### Check Service Health

```bash
docker-compose -f docker/docker-compose.test.yml ps

# Should show all services as "Up" and "healthy"
```

### Clean Everything

```bash
# Stop test environment
npm run test:stop

# Remove volumes (complete reset)
docker-compose -f docker/docker-compose.test.yml down -v
```

---

## Integration with Development Workflow

### Recommended Workflow

1. **Before starting work:**
   ```bash
   npm run test:setup
   ```

2. **Make your changes**

3. **Run relevant tests:**
   ```bash
   npm run test:unit        # Quick feedback
   ```

4. **Before committing:**
   ```bash
   npm test                 # Full test suite
   npm run lint             # Check code style
   ```

5. **End of day (optional):**
   ```bash
   npm run test:stop        # Save resources
   ```

### CI/CD

The same Docker test environment is used in CI/CD, ensuring consistency:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    docker-compose -f docker/docker-compose.test.yml up -d
    docker-compose -f docker/docker-compose.test.yml exec -T app-test npm test
```

---

## Configuration Files

### Environment Variables

Test environment uses these credentials (defined in `docker-compose.test.yml`):

```yaml
DATABASE_URL: postgresql://hse_test:test_password@postgres-test:5432/hse_test
JWT_SECRET: test-secret-key
REFRESH_SECRET: test-refresh-secret
REDIS_HOST: redis-test
REDIS_PORT: 6379
```

**You don't need to configure these manually** - they're set automatically in Docker.

### Test Configuration

- **Jest Config:** `server/jest.config.js`
- **Global Setup:** `server/tests/setup/global-setup.js`
- **Global Teardown:** `server/tests/setup/global-teardown.js`

---

## Node.js Compatibility

✅ **Node.js v25.2.1 is fully compatible**

All dependencies support Node.js v25:
- Jest 29.7.0
- Prisma 5.22.0
- All testing utilities

**No need to downgrade or update anything.**

---

## Next Steps

1. **Run tests now:**
   ```bash
   npm test
   ```

2. **Read full investigation:**
   See `TEST_INVESTIGATION.md` for detailed analysis

3. **Check documentation:**
   - `AGENTS.md` - Full command reference
   - `docker/README.md` - Docker configuration details
   - `server/jest.config.js` - Test configuration

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Run all tests | `npm test` |
| Run unit tests | `npm run test:unit` |
| Run integration tests | `npm run test:integration` |
| Start test env | `npm run test:setup` |
| Stop test env | `npm run test:stop` |
| View logs | `npm run test:logs` |
| Get help | `./scripts/run-tests.sh help` |

---

**Happy Testing! 🧪**
