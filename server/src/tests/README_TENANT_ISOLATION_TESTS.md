# Multi-Tenant Isolation Regression Tests

## Overview

Comprehensive regression test suite validating multi-tenant isolation across all system layers. These tests ensure complete data isolation between organizations and prevent unauthorized cross-tenant access.

## Test Coverage

### 1. Tenant Context Middleware Tests
- ✓ Valid tenant context extraction from JWT
- ✓ Invalid tenant rejection
- ✓ Admin x-tenant-id header functionality
- ✓ User without organization denial

### 2. Cross-Tenant Data Access Prevention Tests
- ✓ Cannot read other tenant's stations
- ✓ Cannot update other tenant's stations
- ✓ Cannot delete other tenant's stations
- ✓ Contractor queries filtered by tenant
- ✓ Audit queries filtered by tenant
- ✓ Incident queries filtered by tenant

### 3. Organization-Scoped Query Tests
- ✓ All query results belong to correct organization
- ✓ Created records auto-assigned to tenant
- ✓ User lists filtered by organization

### 4. Cache Isolation Tests
- ✓ Cache data isolated per tenant
- ✓ Cache invalidation scoped to tenant
- ✓ Cache keys unique per tenant
- ✓ Tenant validation caching

### 5. WebSocket Tenant-Specific Room Tests
- ✓ WebSocket authentication
- ✓ Notifications isolated to correct tenant rooms
- ✓ Unauthorized room subscription prevention
- ✓ Invalid token rejection
- ✓ User-specific notification delivery

### 6. Negative Test Cases (Unauthorized Access)
- ✓ Request without authentication rejected
- ✓ Malformed token rejected
- ✓ Expired token rejected
- ✓ Cannot manually set organizationId to other tenant
- ✓ Query parameter organizationId ignored
- ✓ Admin without x-tenant-id header denied
- ✓ Token with wrong secret rejected
- ✓ SQL injection attempts handled safely

## Prerequisites

### Required Services
1. **PostgreSQL Database** - Running and accessible
2. **Redis Server** - Running for cache tests
3. **Application Server** - Running on http://localhost:3001 (or set `TEST_SERVER_URL`)

### Environment Variables
```bash
# Required
JWT_SECRET=your-jwt-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/hse_platform

# Optional
TEST_SERVER_URL=http://localhost:3001  # Default
REDIS_HOST=localhost                    # Default
REDIS_PORT=6379                         # Default
```

## Running the Tests

### Quick Start

```bash
# Make sure server is running
cd server
npm run dev

# In another terminal, run tests
cd server
node src/tests/tenant-isolation-regression.test.js
```

### Docker Environment

```bash
# Start services
npm run docker:up

# Run tests inside container
docker-compose -f docker/docker-compose.yml exec app node src/tests/tenant-isolation-regression.test.js
```

### CI/CD Pipeline

```bash
# Automated test execution
npm run test:tenant-isolation
```

## Test Output

### Success Output
```
╔════════════════════════════════════════════════════════════╗
║   MULTI-TENANT ISOLATION REGRESSION TEST SUITE            ║
║   Comprehensive Security & Isolation Validation            ║
╚════════════════════════════════════════════════════════════╝

=== Setting up Multi-Tenant Isolation Test Data ===
✓ Test data setup complete

=== Test Suite 1: Tenant Context Middleware ===
✓ Test 1.1 PASSED: Valid tenant context set correctly
✓ Test 1.2 PASSED: Invalid tenant rejected
✓ Test 1.3 PASSED: Admin x-tenant-id header works
✓ Test 1.4 PASSED: User without org denied access

Suite 1 Results: 4 passed, 0 failed

[... additional suites ...]

╔════════════════════════════════════════════════════════════╗
║                    FINAL TEST RESULTS                      ║
╠════════════════════════════════════════════════════════════╣
║  Total Tests Passed:   30 / 30                             ║
║  Total Tests Failed:    0 / 30                             ║
╠════════════════════════════════════════════════════════════╣
║  Status: ✓ ALL TESTS PASSED                               ║
║  Multi-tenant isolation is SECURE                          ║
╚════════════════════════════════════════════════════════════╝
```

### Failure Output
```
✗ Test 2.1 FAILED: Was able to read other tenant station

[... failures ...]

╔════════════════════════════════════════════════════════════╗
║                    FINAL TEST RESULTS                      ║
╠════════════════════════════════════════════════════════════╣
║  Total Tests Passed:   28 / 30                             ║
║  Total Tests Failed:    2 / 30                             ║
╠════════════════════════════════════════════════════════════╣
║  Status: ✗ SOME TESTS FAILED                              ║
║  Review failures and fix isolation issues                  ║
╚════════════════════════════════════════════════════════════╝
```

## Test Data

The test suite automatically creates and cleans up:
- 3 test organizations (Alpha, Beta, Gamma)
- 4 test users (2 regular users, 1 station manager, 1 admin)
- 3 test stations across different organizations
- 2 test contractors
- 2 test audits
- 2 test incidents

All test data is isolated with unique identifiers and cleaned up after test completion.

## Troubleshooting

### Tests Fail to Connect to Server
**Problem:** Connection refused errors
**Solution:** Ensure server is running on correct port
```bash
# Check if server is running
curl http://localhost:3001/health

# Start server if needed
npm run dev
```

### Database Connection Errors
**Problem:** Cannot connect to database
**Solution:** Verify DATABASE_URL and database is running
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Errors
**Problem:** Cache tests fail
**Solution:** Verify Redis is running
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

### WebSocket Tests Timeout
**Problem:** WebSocket tests hang or timeout
**Solution:** Check CORS and WebSocket configuration
```bash
# Verify WebSocket endpoint
wscat -c ws://localhost:3001 -H "Authorization: Bearer YOUR_TOKEN"
```

### Authentication Failures
**Problem:** All authenticated requests fail
**Solution:** Verify JWT_SECRET matches between test and server
```bash
# Check environment variable
echo $JWT_SECRET
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Tenant Isolation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd server
          npm install
      
      - name: Run database migrations
        run: |
          cd server
          npx prisma db push
      
      - name: Start server
        run: |
          cd server
          npm run dev &
          sleep 10
      
      - name: Run tenant isolation tests
        run: |
          cd server
          node src/tests/tenant-isolation-regression.test.js
```

## Security Implications

### Critical Protections Validated

1. **Data Isolation**: No tenant can access another tenant's data
2. **Authentication**: All requests require valid JWT tokens
3. **Authorization**: Tenant context properly enforced
4. **Cache Isolation**: Redis cache properly segregated by tenant
5. **WebSocket Isolation**: Real-time notifications scoped to correct tenants
6. **Injection Prevention**: SQL injection attempts safely handled

### What These Tests Guarantee

✅ **Complete Tenant Isolation** - Zero data leakage between organizations  
✅ **Authentication Required** - All endpoints protected  
✅ **Authorization Enforced** - Users only access their organization's data  
✅ **Cache Security** - No cross-tenant cache poisoning  
✅ **Real-time Security** - WebSocket rooms properly isolated  
✅ **Input Validation** - Malicious input safely handled  

## Maintenance

### Running After Code Changes

Always run these tests after:
- Modifying authentication/authorization middleware
- Changing database queries
- Updating cache logic
- Modifying WebSocket handling
- Changing tenant context management

### Adding New Tests

To add new test cases:

1. Add test function following naming convention:
```javascript
async function testNewFeature() {
  console.log('\n=== Test Suite X: New Feature ===\n');
  let passed = 0, failed = 0;
  
  // Add tests here
  
  console.log(`\nSuite X Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}
```

2. Call from `runAllTests()`:
```javascript
const resultsX = await testNewFeature();
totalResults.passed += resultsX.passed;
totalResults.failed += resultsX.failed;
```

## Related Documentation

- [Multi-Tenancy Architecture](../../../docs/architecture/multi-tenancy.md)
- [Tenant Isolation Guide](../../../docs/architecture/tenant-isolation.md)
- [Row-Level Security](../../../docs/architecture/row-level-security.md)
- [WebSocket Documentation](../../../docs/features/websockets.md)
- [Security Overview](../../../docs/security/overview.md)

## Support

For issues or questions:
1. Check test output for specific failures
2. Review related documentation
3. Check server logs: `server/logs/`
4. Verify environment configuration
5. Contact security/backend team
