# Comprehensive Monitoring Integration Tests

## Overview
This test suite provides comprehensive coverage for monitoring integration including:
- Health check endpoints under failure scenarios
- Prometheus metrics accuracy validation
- Sentry error capture with proper context
- Structured logging output verification

## Test Coverage

### 1. Health Check Endpoints - Normal Operation
Tests that verify the health, readiness, and liveness endpoints return correct status when all services are operational.

**Tests:**
- `should return healthy status when all services are available` - Validates complete health check response structure
- `should return ready status when service is ready` - Verifies readiness endpoint
- `should return alive status on liveness check` - Checks liveness probe

### 2. Health Check Endpoints - Database Failure Scenarios
Tests that validate graceful handling of database failures.

**Tests:**
- `should handle database connection errors gracefully` - Tests invalid database URL handling
- `should handle database connection timeout gracefully` - Validates timeout behavior with unreachable database

### 3. Health Check Endpoints - Redis Failure Scenarios
Tests that validate graceful handling of Redis failures.

**Tests:**
- `should handle Redis connection errors gracefully` - Tests invalid Redis host handling
- `should handle Redis connection timeout gracefully` - Validates timeout behavior with unreachable Redis
- `should detect Redis disconnection after initial connection` - Tests reconnection logic

### 4. Prometheus Metrics Accuracy
Tests that validate all Prometheus metrics are properly exposed and tracked.

**Tests:**
- `should expose Prometheus metrics endpoint` - Verifies metrics endpoint availability
- `should include all required HTTP metrics` - Validates HTTP request tracking metrics
- `should include tenant-specific metrics` - Checks multi-tenant metrics
- `should include database metrics` - Validates database query metrics
- `should include cache metrics` - Checks Redis cache hit/miss metrics
- `should include authentication metrics` - Validates auth attempt tracking
- `should include rate limit metrics` - Checks rate limiting metrics
- `should include default Node.js metrics` - Validates process metrics
- `should increment request counter on API calls` - Tests metrics increment behavior
- `should track request duration with histogram buckets` - Validates histogram buckets

### 5. Sentry Error Capture
Tests that validate Sentry error tracking with proper context.

**Tests:**
- `should capture exception with basic error context` - Tests error capture with custom context
- `should set user context with proper fields` - Validates user context setting
- `should set tenant context with tags` - Tests tenant tagging
- `should add breadcrumbs for tracking user actions` - Validates breadcrumb tracking
- `should capture HTTP request breadcrumbs` - Tests HTTP breadcrumb capture
- `should capture database operation breadcrumbs` - Validates DB operation breadcrumbs

### 6. Structured Logging Output
Tests that verify logging infrastructure is working correctly.

**Tests:**
- `should verify database connection through Prisma` - Tests database connectivity
- `should verify Redis connection` - Tests Redis connectivity

## Running the Tests

### Prerequisites
Ensure the application server is running:
```bash
# Using Docker (recommended)
npm run docker:up

# Or locally
cd server && npm run dev
```

### Run All Monitoring Tests
```bash
cd server
npm test -- monitoring.test.js
```

### Run Specific Test Suite
```bash
# Health checks only
npm test -- monitoring.test.js -t "Health Check"

# Metrics only
npm test -- monitoring.test.js -t "Prometheus Metrics"

# Sentry only
npm test -- monitoring.test.js -t "Sentry Error Capture"
```

## Test Configuration

### Environment Variables
- `TEST_BASE_URL` - Base URL for the application (default: `http://localhost:3001`)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `DATABASE_URL` - PostgreSQL connection string

### Test Isolation
- Each test suite uses isolated Prisma and Redis clients
- Sentry is mocked to avoid external API calls during testing
- Tests clean up connections in `afterAll` hooks

## Expected Behavior

### Successful Test Run
When all services are healthy and the server is running:
- All health endpoint tests should pass
- All metrics should be present in the `/metrics` endpoint
- Sentry mock calls should be tracked correctly
- Database and Redis connections should succeed

### Failure Scenarios
The test suite includes intentional failure scenarios:
- Invalid database URLs should throw errors gracefully
- Unreachable Redis hosts should timeout appropriately
- Connection timeouts should be handled within acceptable time ranges

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Monitoring Tests
  run: |
    docker-compose up -d
    docker-compose exec -T app npm test -- monitoring.test.js
```

## Troubleshooting

### Tests Timeout
If tests timeout, ensure:
1. Application server is running on the correct port
2. Database is accessible
3. Redis is running and accessible

### Connection Errors
If you see connection errors:
1. Verify `.env` configuration
2. Check Docker container status: `docker-compose ps`
3. Review logs: `npm run docker:logs:app`

### Metrics Not Found
If Prometheus metrics tests fail:
1. Verify metrics middleware is enabled
2. Check `/metrics` endpoint manually
3. Ensure prom-client is properly configured

## Maintenance

When adding new monitoring features:
1. Add corresponding tests to the appropriate describe block
2. Update this README with new test descriptions
3. Ensure tests are isolated and don't depend on external state
4. Mock external services (like Sentry) to avoid API rate limits

## Related Documentation
- [MONITORING.md](../MONITORING.md) - Complete monitoring setup guide
- [AGENTS.md](../../AGENTS.md) - Development commands and setup
- [Health Routes](../routes/health.js) - Health check implementation
- [Metrics Utilities](../utils/metrics.js) - Prometheus metrics definitions
- [Sentry Utilities](../utils/sentry.js) - Sentry integration
