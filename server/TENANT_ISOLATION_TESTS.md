# Tenant Isolation Tests - Setup and Execution Guide

## Overview

The tenant isolation tests verify that multi-tenant data isolation works correctly at the database middleware level, ensuring that:
- Tenants can only access their own data
- CREATE operations require tenant context
- Query operations are automatically filtered by tenant
- Cross-tenant data access is prevented

## Prerequisites

### Required Services

1. **PostgreSQL** (v14+)
2. **Redis** (v6+)

### Quick Service Setup

#### macOS (Homebrew)

```bash
# Install services (if not already installed)
brew install postgresql@14 redis

# Start services
brew services start postgresql@14
brew services start redis

# Verify services are running
pg_isready -h localhost -p 5432
redis-cli ping
```

#### Linux (Ubuntu/Debian)

```bash
# Install services
sudo apt-get update
sudo apt-get install postgresql redis-server

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server

# Verify services
pg_isready
redis-cli ping
```

## Database Setup

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./scripts/setup-test-db.sh

# Or use the Node.js runner
node scripts/run-tenant-tests.js
```

### Option 2: Manual Setup

```bash
# 1. Create database (if it doesn't exist)
createdb -U hse_admin hse_platform

# If you need to create the user first:
psql -U postgres -c "CREATE USER hse_admin WITH PASSWORD 'dev_password_123';"
psql -U postgres -c "ALTER USER hse_admin CREATEDB;"

# 2. Setup Prisma schema
export DATABASE_URL="postgresql://hse_admin:dev_password_123@localhost:5432/hse_platform"
npx prisma generate
npx prisma db push

# 3. Verify connection
psql $DATABASE_URL -c "SELECT 1;"
```

## Running the Tests

### All Integration Tests (includes tenant isolation)

```bash
npm run test:integration
```

### Specific Test Suites

```bash
# Tenant isolation tests specifically
npm test -- src/tests/tenant-isolation.test.js

# With verbose output
npm test -- src/tests/tenant-isolation.test.js --verbose

# With coverage
npm test -- src/tests/tenant-isolation.test.js --coverage
```

### Test Patterns

```bash
# Run specific test group
npm test -- src/tests/tenant-isolation.test.js -t "Tenant Context Setting"

# Run single test
npm test -- src/tests/tenant-isolation.test.js -t "should set tenant context correctly"
```

## Understanding the Tests

### Test Structure

The test file is organized into these sections:

1. **Tenant Context Setting** - Basic context management
2. **Auto-Injection on CREATE** - Automatic organizationId injection
3. **Query Interceptor on findMany** - Filtering multiple results
4. **Query Interceptor on findFirst** - Filtering single results
5. **Block Queries Without Tenant Context** - Security tests
6. **Tenant Validation** - Tenant existence checks
7. **Cross-Tenant Isolation** - Preventing cross-tenant access
8. **Update Operations with Tenant Context** - Update filtering
9. **Delete Operations with Tenant Context** - Delete filtering
10. **Tenant Cache** - Caching behavior

### What Gets Tested

#### ✅ Expected Behavior

- **With tenant context set**: Users see only their organization's data
- **Without tenant context**: Queries return empty results (not errors)
- **CREATE without context**: Throws error (security)
- **Cross-tenant queries**: Return null/empty (isolation)

#### 🔒 Security Validations

- Tenant A cannot read Tenant B's data
- Tenant A cannot update Tenant B's data
- Tenant A cannot delete Tenant B's data
- CREATE operations require explicit tenant context

## Troubleshooting

### Database Connection Failed

```
Error: Can't reach database server at localhost:5432
```

**Solutions:**

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql     # Linux

# Check port is correct
lsof -i :5432
```

### Redis Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis           # macOS
sudo systemctl start redis-server   # Linux

# Check port
lsof -i :6379
```

### Tests Skipped

```
⚠️  Skipping test - database not available
```

**This is expected behavior when:**
- Database is not running
- Database connection fails during setup
- Test data creation fails

The tests are designed to skip gracefully rather than fail.

### Permission Denied

```
Error: permission denied to create database
```

**Solutions:**

```bash
# Grant permissions to your user
psql -U postgres -c "ALTER USER hse_admin CREATEDB;"

# Or use postgres user to create database
createdb -U postgres hse_platform
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hse_platform TO hse_admin;"
```

### Database Already Exists but Schema is Wrong

```bash
# Reset the database
dropdb hse_platform
createdb hse_platform
npx prisma db push
```

### Tests Hang or Timeout

```bash
# Force exit and check for open handles
npm test -- src/tests/tenant-isolation.test.js --forceExit --detectOpenHandles
```

## Expected Test Results

### All Tests Passing

```
PASS src/tests/tenant-isolation.test.js
  Tenant Isolation Tests
    Tenant Context Setting
      ✓ should set tenant context correctly (5ms)
      ✓ should clear tenant context (2ms)
    Auto-Injection on CREATE
      ✓ should auto-inject organizationId on create (45ms)
    Query Interceptor on findMany
      ✓ should filter findMany results by tenant context (52ms)
    Query Interceptor on findFirst
      ✓ should filter findFirst results by tenant context (38ms)
    Block Queries Without Tenant Context
      ✓ should return empty results for findMany without context (15ms)
      ✓ should return null for findFirst without context (12ms)
      ✓ should throw error for CREATE without context (18ms)
    Tenant Validation
      ✓ should validate existing tenant (25ms)
      ✓ should fail validation for non-existent tenant (20ms)
      ✓ should fail validation for null tenant (8ms)
    Cross-Tenant Isolation
      ✓ should prevent cross-tenant data access (65ms)
    Update Operations with Tenant Context
      ✓ should allow updates within same tenant (48ms)
      ✓ should prevent updates from different tenant (55ms)
    Delete Operations with Tenant Context
      ✓ should prevent deletes from different tenant (52ms)
    Tenant Cache
      ✓ should cache tenant validation results (35ms)
      ✓ should work after cache invalidation (28ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Time:        2.5s
```

### Database Not Available (Expected)

```
⚠️  Database not available - tests will be skipped
   Error: Can't reach database server at localhost:5432

Test Suites: 1 skipped, 1 total
Tests:       17 skipped, 17 total
```

## Test Maintenance

### Adding New Tests

When adding new tenant isolation tests:

1. Follow the existing pattern with `skipIfNoDatabase()` guard
2. Always clear tenant context in cleanup
3. Use `setupSuccessful` flag for data-dependent tests
4. Clean up any created test data in the test itself

Example:

```javascript
test('should validate new behavior', async () => {
  if (skipIfNoDatabase() || !setupSuccessful) return;
  
  setTenantContext(testOrgId1);
  
  // Your test code here
  
  clearTenantContext();
});
```

### Updating Test Data

If you need to modify the test data setup:

1. Update `beforeAll` hook
2. Update `afterAll` cleanup
3. Ensure `setupSuccessful` flag is set correctly
4. Test both success and failure scenarios

## CI/CD Integration

### GitHub Actions

The tests run automatically in CI when:
- Pull requests are created
- Code is pushed to main/develop
- Manually triggered

CI setup includes:
- PostgreSQL service container
- Redis service container
- Automatic schema setup
- Test data seeding

### Local Pre-commit

Before committing changes:

```bash
# Run critical tests including tenant isolation
npm run test:regression:critical

# Or just tenant isolation
npm test -- src/tests/tenant-isolation.test.js
```

## Related Documentation

- `ARCHITECTURE.md` - System architecture overview
- `docs/architecture/multi-tenancy.md` - Multi-tenant design
- `docs/architecture/tenant-isolation.md` - Isolation strategies
- `RUNNING_TESTS.md` - General test running guide
- `src/shared/utils/db.js` - Prisma middleware implementation

## Support

If you encounter issues:

1. Check this documentation
2. Review test output for specific errors
3. Verify services are running (PostgreSQL, Redis)
4. Check database connection string
5. Review `jest.setup.js` for global test configuration

## Quick Reference

```bash
# Complete setup and test
./scripts/setup-test-db.sh && npm run test:integration

# Just run tests (services already running)
npm test -- src/tests/tenant-isolation.test.js

# Debug failing test
npm test -- src/tests/tenant-isolation.test.js --verbose --no-coverage

# Watch mode for development
npm test -- src/tests/tenant-isolation.test.js --watch
```
