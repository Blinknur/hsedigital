# HSE Digital Test Suite

Comprehensive test coverage for the HSE Digital platform.

## Test Files

### Regression Tests

**`advanced-features-regression.test.js`** - Comprehensive regression tests for all advanced features
- Stripe billing integration (checkout, webhooks, subscription lifecycle)
- RBAC permission checking across all resources
- Quota enforcement per subscription tier
- Rate limiting validation
- WebSocket notifications
- Background job processing (email, reports, exports, webhooks, tenant onboarding)
- Report generation with PDF and scheduling

**Run:** `npm run test:regression`

**Documentation:** [README_ADVANCED_REGRESSION.md](./README_ADVANCED_REGRESSION.md)

### Feature-Specific Tests

- **`stripe.test.js`** - Stripe integration tests (webhook handlers, subscription lifecycle)
- **`stripe-unit.test.js`** - Unit tests for Stripe service functions
- **`quota.test.js`** - Quota service tests (Jest format)
- **`websocket-notifications.test.js`** - WebSocket real-time notification tests
- **`queue.test.js`** - Background job queue tests
- **`report-generation.test.js`** - PDF report generation end-to-end tests

### Security & Access Control

- **`security.test.js`** - Security hardening tests (CSRF, XSS, SQL injection, rate limiting)
- **`auth.test.js`** - Authentication and authorization tests
- **`token-hashing.test.js`** - Token security implementation tests
- **`audit-log.test.js`** - Audit logging functionality tests

### Data & Isolation

- **`tenant-isolation.test.js`** - Multi-tenant data isolation tests (integration)
- **`tenant-isolation.unit.test.js`** - Tenant isolation unit tests
- **`tenantMigration.test.js`** - Tenant migration API tests

### Performance & Monitoring

- **`performance.test.js`** - Performance benchmarks
- **`monitoring.test.js`** - Monitoring and alerting tests
- **`tracing.test.js`** - OpenTelemetry tracing tests
- **`analytics.test.js`** - Analytics service tests

### Integration & E2E

- **`e2e-integration.test.js`** - End-to-end integration tests
- **`mobile-api.test.js`** - Mobile API endpoint tests

### Load Testing

**Directory:** `load-testing/`
- Smoke, stress, spike, endurance, concurrent tenant tests

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
npm run test:regression        # Advanced features regression
npm run test:e2e              # End-to-end integration
npm run test:tenant           # Tenant isolation (unit)
npm run test:tenant:integration # Tenant isolation (integration)
npm run test:load             # All load tests
```

### Run Individual Test Files
```bash
npm test -- src/tests/stripe.test.js
npm test -- src/tests/quota.test.js
npm test -- src/tests/security.test.js
```

### Run Tests with Pattern Matching
```bash
npm test -- --testNamePattern="Stripe"
npm test -- --testNamePattern="RBAC"
npm test -- --testNamePattern="WebSocket"
```

## Test Environment Setup

### Prerequisites

1. **PostgreSQL** database running
2. **Redis** running
3. **Environment variables** configured (see .env.example)

### Required Environment Variables

```bash
# Auth
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hse_digital

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Database Setup

```bash
# Run migrations
npm run prisma:migrate

# Seed RBAC permissions
npm run seed:rbac

# Seed test data
npm run seed
```

## Docker Testing

### Run tests in Docker
```bash
# Start services
docker-compose -f docker/docker-compose.yml up -d

# Run tests
docker-compose -f docker/docker-compose.yml exec app npm test

# Run specific suite
docker-compose -f docker/docker-compose.yml exec app npm run test:regression
```

## Test Coverage

| Feature | Test File | Coverage |
|---------|-----------|----------|
| Stripe Billing | `advanced-features-regression.test.js`, `stripe.test.js` | ✅ Complete |
| RBAC Permissions | `advanced-features-regression.test.js`, `security.test.js` | ✅ Complete |
| Quota Enforcement | `advanced-features-regression.test.js`, `quota.test.js` | ✅ Complete |
| Rate Limiting | `advanced-features-regression.test.js`, `security.test.js` | ✅ Complete |
| WebSocket | `advanced-features-regression.test.js`, `websocket-notifications.test.js` | ✅ Complete |
| Background Jobs | `advanced-features-regression.test.js`, `queue.test.js` | ✅ Complete |
| Report Generation | `advanced-features-regression.test.js`, `report-generation.test.js` | ✅ Complete |
| Tenant Isolation | `tenant-isolation.test.js`, `tenant-isolation.unit.test.js` | ✅ Complete |
| Security | `security.test.js`, `token-hashing.test.js` | ✅ Complete |
| Authentication | `auth.test.js` | ✅ Complete |
| Mobile API | `mobile-api.test.js` | ✅ Complete |

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Suite
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
      - run: npm test
```

## Test Best Practices

1. **Isolation** - Each test creates and cleans up its own data
2. **Independence** - Tests can run in any order
3. **Idempotency** - Tests can be run multiple times
4. **Fast Execution** - Tests complete in seconds
5. **Clear Assertions** - Descriptive expect statements
6. **Error Handling** - Graceful handling of missing services

## Troubleshooting

### Redis Connection Failed
```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7
```

### Database Connection Failed
```bash
# Check DATABASE_URL is set correctly
echo $DATABASE_URL

# Run migrations
npm run prisma:migrate
```

### WebSocket Tests Timeout
- Ensure server is running on TEST_SERVER_URL
- Check JWT_SECRET matches server config
- Tests will skip gracefully if unavailable

### Stripe Tests Skipped
- Set STRIPE_SECRET_KEY to enable Stripe tests
- Tests automatically skip if not configured

## Documentation

- **Advanced Regression Tests:** [README_ADVANCED_REGRESSION.md](./README_ADVANCED_REGRESSION.md)
- **Monitoring Tests:** [README_MONITORING_TESTS.md](./README_MONITORING_TESTS.md)
- **Load Testing:** [load-testing/README.md](./load-testing/README.md)

## Contributing

When adding new features:

1. Add regression tests to `advanced-features-regression.test.js`
2. Create feature-specific test file if needed
3. Update test coverage table
4. Document test requirements and setup
5. Ensure tests pass in CI/CD pipeline

## Support

For test-related issues:
1. Check relevant README documentation
2. Review test output for specific errors
3. Verify environment setup
4. Check service logs (Redis, PostgreSQL, application)
5. Consult feature documentation in `/docs`
