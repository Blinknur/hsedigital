# Testing Guide - HSE Digital

## Overview

Comprehensive testing infrastructure covering all advanced features with regression, integration, and unit tests.

## Quick Commands

```bash
# Run all tests
npm test

# Run advanced features regression tests
npm run test:regression

# Run specific test suites
npm run test:e2e              # End-to-end integration
npm run test:tenant           # Tenant isolation
npm run test:load             # Load testing

# Run individual test file
npm test -- src/tests/stripe.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Stripe"
```

## New: Advanced Features Regression Test Suite

**File:** `src/tests/advanced-features-regression.test.js`

Comprehensive regression tests covering:

### 1. Stripe Billing Integration (4 tests)
- ✅ Checkout session completion
- ✅ Subscription updates (status changes)
- ✅ Subscription cancellation
- ✅ Payment failure handling

### 2. RBAC Permission Checking (2 tests)
- ✅ User permissions retrieval
- ✅ User roles retrieval

### 3. Quota Enforcement (3 tests)
- ✅ Quota checking per subscription tier
- ✅ Usage tracking and increment
- ✅ Feature access validation

### 4. Rate Limiting (1 test)
- ✅ Token bucket and fixed window middleware

### 5. WebSocket Notifications (1 test)
- ✅ Connection with JWT authentication

### 6. Background Job Processing (6 tests)
- ✅ Email queue
- ✅ Report generation queue
- ✅ Data export queue
- ✅ Webhook delivery queue
- ✅ Tenant onboarding queue
- ✅ Job status tracking

### 7. Report Generation (2 tests)
- ✅ Report record creation
- ✅ Scheduled report configuration

**Total: 19 regression tests**

## Test Structure

```
server/src/tests/
├── README.md                              # Test suite overview
├── README_ADVANCED_REGRESSION.md          # Detailed regression test docs
├── advanced-features-regression.test.js   # Main regression suite ⭐
├── stripe.test.js                         # Stripe integration tests
├── quota.test.js                          # Quota service tests
├── websocket-notifications.test.js        # WebSocket tests
├── queue.test.js                          # Queue service tests
├── report-generation.test.js              # Report generation tests
├── security.test.js                       # Security tests
├── auth.test.js                           # Authentication tests
├── tenant-isolation.test.js               # Tenant isolation tests
└── load-testing/                          # Load test scenarios
```

## Test Coverage by Feature

| Feature | Tests | Status |
|---------|-------|--------|
| **Stripe Billing** | 4 + existing | ✅ Complete |
| **RBAC Permissions** | 2 + existing | ✅ Complete |
| **Quota Enforcement** | 3 + existing | ✅ Complete |
| **Rate Limiting** | 1 + existing | ✅ Complete |
| **WebSocket Notifications** | 1 + existing | ✅ Complete |
| **Background Jobs** | 6 + existing | ✅ Complete |
| **Report Generation** | 2 + existing | ✅ Complete |
| **Tenant Isolation** | Extensive | ✅ Complete |
| **Security** | Extensive | ✅ Complete |

## Prerequisites

### Environment Setup

```bash
# Required services
- PostgreSQL 15
- Redis 7
- Node.js 18+

# Environment variables
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/hse_digital
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional (for Stripe tests)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Database Preparation

```bash
# Run migrations
npm run prisma:migrate

# Seed RBAC data
npm run seed:rbac

# Seed test data (optional)
npm run seed
```

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Start required services
redis-server

# Run tests
npm run test:regression
```

### Docker Environment

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Wait for services to be ready
sleep 10

# Run tests
docker-compose -f docker/docker-compose.yml exec app npm run test:regression

# View logs
docker-compose -f docker/docker-compose.yml logs app
```

## Test Features

### Automatic Cleanup
- All tests create and clean up their own data
- No test pollution between runs
- Safe to run multiple times

### Graceful Degradation
- Tests skip when optional services unavailable (e.g., Stripe)
- WebSocket tests timeout gracefully if server not running
- Clear messages for skipped tests

### Isolation
- Each test is independent
- Tests can run in any order
- Parallel execution supported

## Expected Output

```
Advanced Features Regression Tests
  Stripe Billing Integration
    ✓ should handle checkout.session.completed (45ms)
    ✓ should handle subscription.updated (32ms)
    ✓ should handle subscription.deleted (28ms)
    ✓ should handle payment.failed (25ms)
  RBAC Permissions
    ✓ should get user permissions (15ms)
    ✓ should get user roles (12ms)
  Quota Enforcement
    ✓ should check quotas (20ms)
    ✓ should increment usage (18ms)
    ✓ should check feature access (10ms)
  Rate Limiting
    ✓ should have rate limit middleware (5ms)
  WebSocket Notifications
    ✓ should connect with valid token (150ms)
  Background Jobs
    ✓ should queue email (25ms)
    ✓ should queue report (22ms)
    ✓ should queue data export (20ms)
    ✓ should queue webhook (18ms)
    ✓ should queue tenant onboarding (21ms)
    ✓ should get job status (520ms)
  Report Generation
    ✓ should create report record (15ms)
    ✓ should create scheduled report (12ms)

Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Time:        3.456s
```

## Troubleshooting

### Common Issues

#### Redis Connection Error
```bash
# Solution: Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7
```

#### Database Connection Failed
```bash
# Check connection string
echo $DATABASE_URL

# Verify PostgreSQL is running
psql $DATABASE_URL -c "SELECT version();"
```

#### WebSocket Tests Timeout
- Ensure application server is running
- Verify JWT_SECRET matches between test and server
- Tests will skip gracefully if server unavailable

#### Stripe Tests Skipped
- Set STRIPE_SECRET_KEY in .env to enable
- Tests automatically skip if Stripe not configured
- This is expected behavior for development

### Debug Mode

```bash
# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- --testNamePattern="should handle checkout"

# Show test names only
npm test -- --listTests
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Regression Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run prisma:migrate
      - run: npm run seed:rbac
      - run: npm run test:regression
```

## Performance

- **Typical runtime:** 3-5 seconds for all 19 tests
- **Database operations:** Minimal, with cleanup
- **Redis operations:** Lightweight counters
- **Network calls:** Mocked where appropriate

## Documentation

- **Regression Test Details:** [src/tests/README_ADVANCED_REGRESSION.md](./src/tests/README_ADVANCED_REGRESSION.md)
- **Test Suite Overview:** [src/tests/README.md](./src/tests/README.md)
- **Monitoring Tests:** [src/tests/README_MONITORING_TESTS.md](./src/tests/README_MONITORING_TESTS.md)

## Adding New Tests

### To Regression Suite

```javascript
describe('New Feature', () => {
  it('should validate new functionality', async () => {
    const result = await newFeature();
    expect(result).toHaveProperty('expected');
  });
});
```

### As Separate File

```javascript
// src/tests/new-feature.test.js
import { describe, it, expect } from '@jest/globals';

describe('New Feature Tests', () => {
  // ... tests
});
```

## Best Practices

1. **Test Independence** - Each test should work standalone
2. **Descriptive Names** - Clear test descriptions
3. **Cleanup** - Always clean up test data
4. **Assertions** - Use specific expectations
5. **Documentation** - Update README when adding tests

## Support

For testing issues:
1. Check documentation in `src/tests/`
2. Review test output for specific errors
3. Verify environment configuration
4. Check service logs (Redis, PostgreSQL)
5. Consult feature docs in `/docs`

## Changelog

### v1.0.0 - Advanced Features Regression Suite
- Added comprehensive regression test suite (19 tests)
- Stripe billing integration tests
- RBAC permission checking tests
- Quota enforcement tests
- Rate limiting validation tests
- WebSocket notification tests
- Background job processing tests
- Report generation tests
- Complete documentation

## Related Commands

```bash
# All test commands
npm test                    # Run all tests
npm run test:regression     # Advanced features regression
npm run test:e2e           # End-to-end integration
npm run test:tenant        # Tenant isolation (unit)
npm run test:tenant:integration  # Tenant isolation (integration)
npm run test:load          # Load testing
npm run test:load:smoke    # Smoke tests
npm run test:load:stress   # Stress tests

# Build and lint
npm run build              # Build application
npm run lint               # Syntax check

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run seed              # Seed database
npm run seed:rbac         # Seed RBAC data
```
