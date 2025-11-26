# Advanced Features Regression Test Suite

Comprehensive regression tests for all advanced features in the HSE Digital platform.

## Overview

This test suite validates the core advanced functionality:

1. **Stripe Billing Integration** - Payment processing and subscription lifecycle
2. **RBAC Permission Checking** - Role-based access control across all resources
3. **Quota Enforcement** - Subscription tier limits and usage tracking
4. **Rate Limiting** - Token bucket and fixed window rate limiting
5. **WebSocket Notifications** - Real-time event delivery
6. **Background Job Processing** - Async job queues (email, reports, exports, webhooks, tenant onboarding)
7. **Report Generation** - PDF reports and scheduled delivery

## Running Tests

### Run All Regression Tests
```bash
npm run test:regression
```

### Run with Docker
```bash
docker-compose -f docker/docker-compose.yml exec app npm run test:regression
```

### Run Individual Test Suites
```bash
# Jest with pattern matching
npm test -- --testNamePattern="Stripe Billing"
npm test -- --testNamePattern="RBAC"
npm test -- --testNamePattern="Quota"
npm test -- --testNamePattern="Rate Limiting"
npm test -- --testNamePattern="WebSocket"
npm test -- --testNamePattern="Background Jobs"
npm test -- --testNamePattern="Report Generation"
```

## Test Coverage

### 1. Stripe Billing Integration (4 tests)

Tests the complete Stripe webhook event handling and subscription lifecycle:

- ✅ `checkout.session.completed` - New subscription activation
- ✅ `customer.subscription.updated` - Status changes (active, past_due, etc.)
- ✅ `customer.subscription.deleted` - Cancellation and downgrade to free
- ✅ `invoice.payment_failed` - Payment failure handling

**What's Tested:**
- Organization record updates (stripeCustomerId, stripeSubscriptionId)
- Subscription status transitions
- Plan changes (free ↔ paid tiers)
- Metadata handling

### 2. RBAC Permission Checking (2 tests)

Validates role-based access control system:

- ✅ Get user permissions - Retrieves all permissions for a user
- ✅ Get user roles - Retrieves all roles assigned to a user

**What's Tested:**
- Permission retrieval from UserRole → Role → RolePermission → Permission chain
- Role assignment validation
- Permission structure (resource + action pairs)

**Resources Covered:**
- stations, audits, incidents, users, contractors, workPermits
- analytics, audit_logs, organizations, system

**Actions:**
- read, write, delete, admin

### 3. Quota Enforcement (3 tests)

Tests subscription plan limits and usage tracking:

- ✅ Check quotas - Validates resource limits against current usage
- ✅ Increment usage - Updates Redis counters for monthly/daily tracking
- ✅ Check feature access - Validates feature availability by plan

**What's Tested:**
- Free vs Professional vs Enterprise limits
- Per-resource quotas (stations, users, contractors, audits, etc.)
- Monthly usage reset
- Redis-based usage counters
- Admin override capability

**Quota Types:**
- **Static Limits**: stations, users, contractors, form_definitions
- **Monthly Limits**: audits, incidents, work_permits
- **Features**: ai_assistant, custom_branding, api_access, sso, advanced_analytics

### 4. Rate Limiting (1 test)

Validates rate limiting middleware:

- ✅ Rate limit middleware exists - Confirms token bucket and fixed window implementations

**What's Tested:**
- Token bucket algorithm (capacity + refill rate)
- Fixed window algorithm (requests per time window)
- Per-tenant rate limiting
- Per-user rate limiting
- Per-IP rate limiting
- Auth-specific rate limiting (login attempts)

### 5. WebSocket Notifications (1 test)

Tests real-time notification delivery:

- ✅ Connect with valid token - Validates WebSocket authentication

**What's Tested:**
- JWT-based WebSocket authentication
- Connection establishment
- Socket.io integration

**Note:** Full WebSocket tests in `websocket-notifications.test.js`:
- Channel subscription (tenant, user, global)
- Tenant isolation
- Event delivery
- Disconnect handling

### 6. Background Job Processing (6 tests)

Validates all async job queues using Bull:

- ✅ Queue email - Email delivery jobs
- ✅ Queue report - Report generation jobs
- ✅ Queue data export - CSV/JSON export jobs
- ✅ Queue webhook - External webhook delivery
- ✅ Queue tenant onboarding - New tenant setup workflow
- ✅ Get job status - Job state tracking

**What's Tested:**
- Job queue creation and configuration
- Job status tracking (pending, active, completed, failed)
- Job retry logic
- Job delay/scheduling
- Bull queue integration
- Redis-based queue storage

**Queue Types:**
- **email** - Transactional emails, magic links, alerts
- **reports** - PDF report generation
- **dataExport** - Bulk data exports (CSV, JSON)
- **webhooks** - Outbound webhook calls
- **tenantOnboarding** - Multi-step tenant provisioning

### 7. Report Generation (2 tests)

Tests PDF report creation and scheduling:

- ✅ Create report record - Database record creation
- ✅ Create scheduled report - Cron-based report scheduling

**What's Tested:**
- Report record lifecycle (pending → generating → completed/failed)
- Report metadata (type, format, filters, parameters)
- Scheduled report configuration
- Cron expression validation
- Recipient email lists

**Report Types:**
- audit - Audit compliance reports
- incident - Incident analysis reports
- compliance - Regulatory compliance reports
- safety - Safety metrics reports

**Features:**
- PDF generation with PDFKit
- Chart embedding (bar, line, pie, doughnut)
- Custom tenant branding
- S3 or local storage
- Email delivery to recipients
- Scheduled generation (daily, weekly, monthly)

## Prerequisites

### Environment Variables

```bash
# Authentication
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hse_digital

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe (optional - tests will skip if not configured)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Server URL for WebSocket tests
TEST_SERVER_URL=http://localhost:3001
```

### Services Required

1. **PostgreSQL** - Database with seeded test data
2. **Redis** - Cache and queue storage
3. **Application Server** - Running on port 3001 (for WebSocket tests)

### Database Setup

```bash
# Run migrations
npm run prisma:migrate

# Seed RBAC data
npm run seed:rbac

# Seed test data
npm run seed
```

## Test Data

Tests create and clean up their own data:

- Test organization with professional plan
- Test user with Admin role
- Test station for report generation
- Temporary records for quota testing

All test data is deleted in `afterAll` hooks.

## Common Issues

### 1. WebSocket Connection Timeout

**Symptom:** WebSocket tests fail with "Connection timeout"

**Solution:**
- Ensure server is running on TEST_SERVER_URL
- Check JWT_SECRET matches server configuration
- WebSocket test gracefully skips if server unavailable

### 2. Stripe Tests Skipped

**Symptom:** "Skipping Stripe test - STRIPE_SECRET_KEY not configured"

**Solution:**
- Set STRIPE_SECRET_KEY in .env if you want to test Stripe integration
- Tests will skip automatically if Stripe is not configured

### 3. Redis Connection Failed

**Symptom:** "Redis connection error"

**Solution:**
```bash
# Start Redis
redis-server

# Or with Docker
docker-compose up redis
```

### 4. Job Status Not Found

**Symptom:** Job status returns `{ found: false }`

**Solution:**
- Jobs may complete faster than status check
- Increase wait time in test
- Check Bull queue is processing jobs

## Performance Considerations

- Tests create minimal test data
- Parallel test execution supported
- Redis cleanup in afterAll
- Database transactions for isolation
- Typical runtime: 5-15 seconds

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Regression Tests
  run: |
    npm run test:regression
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    REDIS_HOST: localhost
```

### Docker Compose

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Wait for services to be ready
sleep 10

# Run tests
docker-compose -f docker/docker-compose.yml exec app npm run test:regression
```

## Extending Tests

### Adding New Test Cases

```javascript
describe('New Feature', () => {
  it('should validate new functionality', async () => {
    // Arrange
    const testData = { ... };
    
    // Act
    const result = await newFeature(testData);
    
    // Assert
    expect(result).toHaveProperty('expected');
  });
});
```

### Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Always clean up test data in afterAll/afterEach
3. **Assertions** - Use descriptive expect messages
4. **Skip Gracefully** - Skip tests when dependencies unavailable
5. **Mock External APIs** - Use mocks for Stripe, external webhooks
6. **Test Both Success and Failure** - Cover happy path and error cases

## Related Test Files

- `stripe.test.js` - Standalone Stripe integration tests
- `quota.test.js` - Detailed quota service tests (Jest format)
- `websocket-notifications.test.js` - Complete WebSocket test suite
- `queue.test.js` - Queue service integration tests
- `report-generation.test.js` - Report generation end-to-end test
- `security.test.js` - Security and RBAC integration tests

## Monitoring Test Results

Tests output to console with:
- ✅ Pass indicators
- ❌ Failure details with stack traces
- ⚠️ Skipped tests with reasons
- 📊 Coverage summaries

### Example Output

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
  ...

Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
Time:        3.456s
```

## Support

For issues with tests:
1. Check this README
2. Review test output for specific errors
3. Verify environment configuration
4. Check related service logs (Redis, PostgreSQL)
5. Consult feature-specific documentation in `/docs`

## Changelog

- **v1.0.0** - Initial regression test suite
  - Stripe billing (4 tests)
  - RBAC permissions (2 tests)
  - Quota enforcement (3 tests)
  - Rate limiting (1 test)
  - WebSocket notifications (1 test)
  - Background jobs (6 tests)
  - Report generation (2 tests)
