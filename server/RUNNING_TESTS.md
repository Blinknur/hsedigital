# Running Regression Tests - Quick Guide

## Prerequisites

You need either:
- **Docker** (recommended) - for isolated test environment
- **Local PostgreSQL + Redis** - if you prefer local services

## Quick Start (Docker)

```bash
# Start test services and run all tests
./scripts/docker-test-runner.sh test:all

# Or step by step:
./scripts/docker-test-runner.sh start      # Start PostgreSQL & Redis
npm run test:regression                     # Run tests
./scripts/docker-test-runner.sh stop       # Stop services
```

## Available Test Commands

```bash
# Fast tests (5-10 seconds)
npm run test:regression:fast

# Critical tests (15-20 seconds)
npm run test:regression:critical

# Full regression suite (45-60 seconds)
npm run test:regression

# Specific test suites
npm run test:regression:auth
npm run test:regression:stations
npm run test:regression:audits
npm run test:regression:incidents
npm run test:regression:permits
npm run test:regression:users
npm run test:regression:advanced

# Single test file
npm test -- tests/analytics.test.js

# With coverage
npm run test:coverage
```

## Docker Test Runner Commands

```bash
./scripts/docker-test-runner.sh start         # Start services
./scripts/docker-test-runner.sh stop          # Stop services
./scripts/docker-test-runner.sh clean         # Remove containers
./scripts/docker-test-runner.sh status        # Check status
./scripts/docker-test-runner.sh test          # Run tests
./scripts/docker-test-runner.sh test:critical # Run critical tests
./scripts/docker-test-runner.sh test:fast     # Run fast tests
./scripts/docker-test-runner.sh test:all      # Run full suite
./scripts/docker-test-runner.sh help          # Show help
```

## What Gets Tested

### Unit Tests (Fast)
- Authentication service
- Tenant isolation logic
- Quota enforcement
- Token hashing
- Analytics calculations
- Queue service
- Stripe unit tests

### Integration Tests (Slow)
- API endpoints
- Database operations
- WebSocket connections
- Report generation
- E2E workflows
- Performance tests

### Critical Tests
- Authentication flows
- Multi-tenant isolation
- Payment processing
- Security features
- Token security

## Expected Results

### All Passing
```
Test Suites: 25 passed, 25 total
Tests:       150+ passed, 150+ total
Time:        45-60s (full suite)
Coverage:    >60% (all metrics)
```

### Test Breakdown by Category
- **Fast tests:** 7 files, ~10s
- **Critical tests:** 7 files, ~20s
- **Integration tests:** 11 files, ~30s

## Common Issues & Solutions

### "Can't reach database server"
```bash
# Solution: Start PostgreSQL
./scripts/docker-test-runner.sh start
```

### "Redis connection failed"
```bash
# Solution: Redis container not running
./scripts/docker-test-runner.sh start
```

### "ECONNREFUSED" on API tests
```bash
# Solution: Start the application server
npm run dev   # In separate terminal

# Or use Docker
docker-compose -f ../docker/docker-compose.yml up
```

### Tests hang or timeout
```bash
# Solution: Force exit and check for open handles
npm test -- --forceExit --detectOpenHandles
```

### "Subdomain already taken"
```bash
# Solution: Clean up test data
./scripts/docker-test-runner.sh clean
./scripts/docker-test-runner.sh start
```

## Environment Variables

Required for tests:
```bash
NODE_ENV=test
DATABASE_URL=postgresql://hse_test:test_password@localhost:5433/hse_test
JWT_SECRET=test-jwt-secret-key-for-testing
REFRESH_SECRET=test-refresh-secret-key-for-testing
CLIENT_URL=http://localhost:3001
REDIS_HOST=localhost
REDIS_PORT=6380
```

The docker-test-runner script sets these automatically.

## Test Results Location

After running tests:
- **HTML Report:** `test-results/index.html`
- **Coverage Report:** `coverage/index.html`
- **JUnit XML:** `test-results/junit.xml`
- **Coverage JSON:** `coverage/coverage-summary.json`

View reports:
```bash
open test-results/index.html
open coverage/index.html
```

## CI/CD Testing

Tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Nightly at 2 AM UTC
- Manual workflow dispatch

See `.github/workflows/regression-tests.yml` for details.

## Debugging Failed Tests

### Run single test with verbose output
```bash
npm test -- tests/analytics.test.js --verbose
```

### Run with debug logs
```bash
DEBUG_TESTS=true npm test -- tests/analytics.test.js
```

### Check database state
```bash
# Connect to test database
docker exec -it hse_test_postgres psql -U hse_test -d hse_test

# Or if using local PostgreSQL
psql postgresql://hse_test:test_password@localhost:5432/hse_test
```

### Check Redis state
```bash
# Connect to Redis
docker exec -it hse_test_redis redis-cli

# Check keys
KEYS *
```

## Manual Service Setup (Without Docker)

If you prefer local services:

```bash
# 1. Start PostgreSQL (adjust for your OS)
sudo service postgresql start
# Or on macOS with Homebrew:
brew services start postgresql@15

# 2. Start Redis
sudo service redis-server start
# Or on macOS:
brew services start redis

# 3. Create test database
createdb -U postgres hse_test
psql -U postgres -d hse_test -c "CREATE USER hse_test WITH PASSWORD 'test_password';"
psql -U postgres -d hse_test -c "GRANT ALL PRIVILEGES ON DATABASE hse_test TO hse_test;"

# 4. Set environment variables
export DATABASE_URL="postgresql://hse_test:test_password@localhost:5432/hse_test"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export JWT_SECRET="test-jwt-secret-key-for-testing"
export REFRESH_SECRET="test-refresh-secret-key-for-testing"

# 5. Setup database schema
npx prisma generate
npx prisma db push

# 6. Run tests
npm test
```

## Performance Tips

### Speed up test execution
```bash
# Run in parallel (default)
npm test

# Limit workers for stability
npm test -- --maxWorkers=2

# Run only changed tests
npm test -- --onlyChanged
```

### Reduce test output
```bash
# Silent mode (only errors)
npm test -- --silent

# No coverage (faster)
npm test -- --no-coverage
```

## Test Coverage

View coverage:
```bash
npm run test:coverage
open coverage/index.html
```

Coverage thresholds (must maintain):
- Lines: 60%
- Statements: 60%
- Functions: 60%
- Branches: 60%

## Continuous Testing

### Watch mode for development
```bash
npm run test:watch
```

### Run tests on file change
```bash
npm test -- --watch
```

## Checklist Before Pushing

- [ ] Run critical tests: `npm run test:regression:critical`
- [ ] All tests pass
- [ ] Coverage above 60%
- [ ] No new flaky tests (run 3x to verify)
- [ ] Test services cleaned up: `./scripts/docker-test-runner.sh clean`

## Getting Help

1. Check `TEST_REGRESSION_ANALYSIS.md` for detailed analysis
2. Check `TESTING.md` for comprehensive testing guide
3. Check `REGRESSION_TESTING.md` for CI/CD details
4. Review test output and error messages
5. Check GitHub Actions logs if CI fails

## Quick Reference Card

```bash
# Start everything and test
./scripts/docker-test-runner.sh test:all

# Development workflow
./scripts/docker-test-runner.sh start
npm run test:watch
# Make changes, tests auto-run
./scripts/docker-test-runner.sh stop

# Before commit
npm run test:regression:critical

# Check status
./scripts/docker-test-runner.sh status

# Clean up
./scripts/docker-test-runner.sh clean
```
