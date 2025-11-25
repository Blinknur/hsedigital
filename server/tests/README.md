# End-to-End Integration Test Suite

## Overview

This E2E test suite validates critical user journeys in the HSE.Digital platform running against a fully containerized environment with test data isolation.

## Test Coverage

### Critical User Journeys

1. **User Signup with Organization**
   - Creates new organization with subdomain
   - Registers admin user
   - Validates organization provisioning

2. **User Authentication**
   - Email verification bypass for testing
   - JWT token generation and validation
   - Session management

3. **Stripe Integration**
   - Checkout session creation
   - Webhook simulation (checkout.session.completed)
   - Subscription activation
   - Plan upgrade flow

4. **Station Management**
   - Station creation with multi-tenant isolation
   - Organization-scoped data access

5. **Audit Creation with File Uploads**
   - Audit record creation
   - File upload simulation
   - Findings attachment
   - Score calculation

6. **Audit Updates**
   - Status transitions
   - Findings addition
   - Photo attachments
   - Overall score updates

7. **Incident Reporting**
   - Incident creation
   - Severity classification
   - Reporter assignment

8. **Incident Notifications**
   - Email alert generation
   - Notification delivery (mocked in test env)
   - Alert content validation

9. **Tenant Isolation**
   - Cross-tenant data access prevention
   - Organization-scoped queries
   - Data leakage prevention

10. **Data Cleanup**
    - Automatic test data removal
    - Database state reset
    - No test pollution

## Running Tests

### Local Development Environment

```bash
# Run against local running instance
cd server
npm run test:e2e
```

### Docker Environment (Recommended)

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be healthy
docker-compose -f docker-compose.test.yml ps

# Run E2E tests
docker-compose -f docker-compose.test.yml exec app-test npm run test:e2e

# View logs
docker-compose -f docker-compose.test.yml logs -f app-test

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

### Production-like Environment

```bash
# Run against main docker-compose
npm run docker:up
npm run docker:logs:app

# In another terminal
docker-compose exec app npm run test:e2e

# Cleanup
npm run docker:down
```

## Test Configuration

### Environment Variables

- `API_BASE_URL`: Base URL for API requests (default: `http://localhost:3001`)
- `TEST_DATABASE_URL`: Database connection for test data (default: uses `DATABASE_URL`)
- `JWT_SECRET`: Secret for JWT token generation
- `STRIPE_SECRET_KEY`: Stripe API key (optional, tests handle missing config)
- `SMTP_HOST`: Email server (optional, notifications are mocked if not configured)

### Test Isolation

Each test run:
- Creates unique organization with timestamp-based subdomain
- Generates unique email addresses
- Uses isolated database transactions where possible
- Cleans up all created data automatically

### Data Isolation Strategy

```javascript
// Unique identifiers prevent collisions
const subdomain = `test-org-${Date.now()}`;
const email = `test-${Date.now()}@example.com`;

// Cleanup ensures no test pollution
await cleanupTestData();
```

## Test Output

### Success Output
```
╔═══════════════════════════════════════════════╗
║   E2E Integration Test Suite                 ║
║   Critical User Journeys                     ║
╚═══════════════════════════════════════════════╝

✓ Service is ready

=== Test 1: Signup with Organization ===
✅ Signup successful
  - Organization ID: clx...
  - User ID: clx...

=== Test 2: User Login ===
✅ Login successful

=== Test 3: Stripe Checkout Session Creation ===
✅ Stripe checkout session created

...

==================================================
✅ ALL E2E TESTS PASSED
==================================================
```

### Failure Output
```
❌ Test suite error: Connection timeout

==================================================
❌ 3 TEST(S) FAILED:
  - Signup failed
  - Login failed
  - Stripe checkout failed
==================================================
```

## Test Architecture

### Request Helper
```javascript
const makeRequest = (method, path, data, token) => {
    // HTTP client for API calls
    // Handles authentication
    // Parses JSON responses
};
```

### Service Health Check
```javascript
const waitForService = async (maxAttempts = 30) => {
    // Polls /api/health endpoint
    // Waits up to 60 seconds
    // Throws if service doesn't start
};
```

### Test Context
```javascript
let testContext = {
    organizationId: null,
    userId: null,
    accessToken: null,
    stationId: null,
    auditId: null,
    incidentId: null
};
```

## Extending Tests

### Adding New Test Cases

```javascript
const testNewFeature = async () => {
    console.log('\n=== Test N: New Feature ===');
    
    // Test implementation
    const result = await makeRequest('POST', '/api/new-endpoint', {
        // test data
    }, testContext.accessToken);
    
    if (result.status === 200) {
        console.log('✅ New feature test passed');
        return true;
    } else {
        console.error('❌ New feature test failed');
        return false;
    }
};

// Add to test suite
async function runE2ETests() {
    // ...
    if (!await testNewFeature()) errors.push('New feature failed');
    // ...
}
```

### Test Helpers

Use `test-helpers.js` for common operations:

```javascript
import { 
    generateTestEmail, 
    createTestOrganization,
    retryOperation 
} from './test-helpers.js';

// Generate unique test data
const email = generateTestEmail();

// Retry flaky operations
await retryOperation(async () => {
    // operation that might fail
}, 3, 1000);
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start test environment
        run: docker-compose -f docker-compose.test.yml up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Run E2E tests
        run: docker-compose -f docker-compose.test.yml exec -T app-test npm run test:e2e
      
      - name: Cleanup
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v
```

## Troubleshooting

### Tests Timing Out

- Increase `waitForService` maxAttempts
- Check service health: `docker-compose ps`
- View logs: `docker-compose logs app`

### Database Connection Errors

- Ensure Prisma schema is pushed: `npx prisma db push`
- Check DATABASE_URL environment variable
- Verify PostgreSQL is running and healthy

### Authentication Failures

- Verify JWT_SECRET is set
- Check token generation in authService
- Ensure email verification is bypassed in tests

### Tenant Isolation Failures

- Review Prisma middleware in `prismaClient.js`
- Check organizationId is set correctly
- Verify RLS policies (if applicable)

## Best Practices

1. **Always cleanup test data** - Use try/finally blocks
2. **Use unique identifiers** - Prevent test collisions
3. **Mock external services** - Email, payments, etc.
4. **Test realistic scenarios** - Mirror production workflows
5. **Keep tests independent** - No test should depend on another
6. **Validate tenant isolation** - Always test multi-tenancy
7. **Handle async properly** - Use await, not callbacks
8. **Log meaningful output** - Help debugging failures
9. **Test error paths** - Not just happy paths
10. **Keep tests fast** - Use parallelization where possible

## Monitoring & Metrics

Tests automatically track:
- Total execution time
- Individual test durations
- Success/failure rates
- API response times
- Database query performance

## Security Considerations

- Test credentials are hardcoded (never use in production)
- Test database is isolated from production
- Stripe test mode keys only
- No real emails sent in test environment
- All test data is automatically deleted

## Support

For issues or questions:
1. Check test logs for detailed error messages
2. Review service health endpoints
3. Validate environment configuration
4. Consult main application documentation
