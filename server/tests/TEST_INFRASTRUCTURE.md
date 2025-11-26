# Test Infrastructure Summary

## Overview

Unified test infrastructure consolidation completed for HSE.Digital backend. All tests now use Jest framework with shared fixtures, database seeding utilities, authentication helpers, and automatic cleanup management.

## What Was Done

### 1. Jest Configuration (`jest.config.js`)
- ✅ Created comprehensive Jest configuration
- ✅ Set coverage thresholds (60% for all metrics)
- ✅ Configured ES modules support
- ✅ Set test timeout to 30 seconds
- ✅ Added global setup and teardown scripts
- ✅ Configured test path patterns

### 2. Global Setup (`tests/setup/`)
- ✅ `global-setup.js` - Verifies database and Redis connections before tests
- ✅ `global-teardown.js` - Cleanup after all tests complete
- ✅ `jest.setup.js` - Jest environment configuration and console filtering

### 3. Test Helpers (`tests/helpers/`)

#### Authentication Helpers (`auth.helpers.js`)
- ✅ `hashPassword()` - Bcrypt password hashing
- ✅ `comparePassword()` - Password verification
- ✅ `generateAccessToken()` - JWT access token generation
- ✅ `generateRefreshToken()` - JWT refresh token generation
- ✅ `generateTokens()` - Generate both tokens
- ✅ `verifyAccessToken()` - Verify access tokens
- ✅ `verifyRefreshToken()` - Verify refresh tokens
- ✅ `generateEmailVerificationToken()` - Email verification tokens
- ✅ `generatePasswordResetToken()` - Password reset tokens
- ✅ `hashToken()` - SHA-256 token hashing
- ✅ `createAuthHeader()` - Generate Authorization headers

#### Database Helpers (`db.helpers.js`)
- ✅ `getTestPrisma()` - Get Prisma client instance
- ✅ `connect()` - Connect to test database
- ✅ `disconnect()` - Disconnect from database
- ✅ `cleanDatabase()` - Clean all test data
- ✅ `cleanupTestData()` - Cleanup specific resources
- ✅ `executeRaw()` - Execute raw SQL
- ✅ `queryRaw()` - Query with raw SQL
- ✅ `transaction()` - Run database transactions

#### Test Data Helpers (`test-data.helpers.js`)
- ✅ `generateTestEmail()` - Unique email addresses
- ✅ `generateTestSubdomain()` - Unique subdomains
- ✅ `generateTestPassword()` - Test passwords
- ✅ `generateTestPhone()` - Phone numbers
- ✅ `waitFor()` - Async delay utility
- ✅ `retryOperation()` - Retry failed operations
- ✅ `createTestOrganization()` - Create test organizations
- ✅ `createTestUser()` - Create test users
- ✅ `createTestStation()` - Create test stations
- ✅ `createTestAudit()` - Create test audits
- ✅ `createTestIncident()` - Create test incidents
- ✅ `createTestContractor()` - Create test contractors
- ✅ `createTestForm()` - Create test forms

### 4. Fixtures (`tests/fixtures/`)
- ✅ `organizations.fixture.js` - Organization templates (free, pro, enterprise, suspended)
- ✅ `users.fixture.js` - User role templates (admin, manager, auditor, contractor)
- ✅ `stations.fixture.js` - Station templates (low/medium/high risk, inactive)
- ✅ `index.js` - Audit, incident, contractor, and form fixtures

### 5. Utilities (`tests/utils/`)

#### Seed Utilities (`seed.utils.js`)
- ✅ `seedTestDatabase()` - Seed comprehensive test data
- ✅ `seedRBACData()` - Seed roles and permissions
- ✅ `cleanupSeededData()` - Cleanup seeded data

#### Cleanup Utilities (`cleanup.utils.js`)
- ✅ `TestCleanupManager` - Track and cleanup resources
- ✅ `cleanupTestResources()` - Cleanup specific resources
- ✅ `createCleanupManager()` - Factory function

### 6. Documentation
- ✅ `README.md` - Comprehensive test infrastructure guide
- ✅ `MIGRATION_GUIDE.md` - Step-by-step migration instructions
- ✅ `TEST_INFRASTRUCTURE.md` - This summary document

### 7. Example Tests
- ✅ `example.test.js` - Demonstrates all features
- ✅ `analytics.test.js` - Migrated to use new infrastructure

### 8. Updated Scripts (package.json)
- ✅ `npm test` - Run all tests
- ✅ `npm run test:watch` - Watch mode
- ✅ `npm run test:coverage` - With coverage report
- ✅ `npm run test:verbose` - Verbose output
- ✅ `npm run test:unit` - Run unit tests
- ✅ `npm run test:integration` - Run integration tests

## Directory Structure

```
server/tests/
├── setup/
│   ├── global-setup.js          # Global setup
│   ├── global-teardown.js       # Global teardown
│   └── jest.setup.js            # Jest configuration
├── helpers/
│   ├── auth.helpers.js          # Authentication utilities
│   ├── db.helpers.js            # Database utilities
│   ├── test-data.helpers.js    # Test data generators
│   └── index.js                 # Aggregated exports
├── fixtures/
│   ├── organizations.fixture.js # Organization templates
│   ├── users.fixture.js         # User templates
│   ├── stations.fixture.js      # Station templates
│   └── index.js                 # All fixtures
├── utils/
│   ├── seed.utils.js            # Database seeding
│   └── cleanup.utils.js         # Resource cleanup
├── load-testing/                # Load testing suite (unchanged)
├── README.md                    # Test infrastructure guide
├── MIGRATION_GUIDE.md           # Migration instructions
├── TEST_INFRASTRUCTURE.md       # This file
├── example.test.js              # Example test
├── analytics.test.js            # Migrated test
└── *.test.js                    # Other test files
```

## Key Features

### 1. Automatic Cleanup
```javascript
const cleanup = createCleanupManager();
const org = await createOrg();
cleanup.track('organizations', org.id);
// Automatically cleaned up in afterAll
```

### 2. Shared Fixtures
```javascript
import { stationFixtures } from './fixtures/index.js';
const station = await prisma.station.create({
  data: { ...stationFixtures.highRiskStation, organizationId: org.id }
});
```

### 3. Test Data Generators
```javascript
const email = generateTestEmail(); // test-1234567890-abc@example.com
const subdomain = generateTestSubdomain(); // test-org-1234567890-xyz
```

### 4. Authentication Helpers
```javascript
const tokens = authHelpers.generateTokens(user);
const decoded = authHelpers.verifyAccessToken(tokens.accessToken);
```

### 5. Database Seeding
```javascript
const seededData = await seedTestDatabase({
  organizations: 2,
  usersPerOrg: 3,
  stationsPerOrg: 5,
});
```

## Usage Examples

### Basic Test
```javascript
import { getTestPrisma, createCleanupManager, testDataHelpers } from './helpers/index.js';

describe('My Tests', () => {
  let prisma, cleanup;

  beforeAll(async () => {
    prisma = getTestPrisma();
    cleanup = createCleanupManager();
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  it('should work', async () => {
    const org = await testDataHelpers.createTestOrganization(prisma)();
    cleanup.track('organizations', org.id);
    expect(org).toBeDefined();
  });
});
```

### Using Fixtures
```javascript
import { organizationFixtures, userFixtures } from './fixtures/index.js';

const org = await prisma.organization.create({
  data: { ...organizationFixtures.enterpriseOrganization, slug: 'test-org' }
});

const user = await testDataHelpers.createTestUser(prisma)(org.id, {
  ...userFixtures.adminUser,
  email: generateTestEmail()
});
```

### With Authentication
```javascript
const user = await testDataHelpers.createTestUser(prisma)(org.id);
const tokens = authHelpers.generateTokens(user);
const headers = authHelpers.createAuthHeader(tokens.accessToken);

// Use in requests
const response = await request(app)
  .get('/api/profile')
  .set(headers);
```

## Test Patterns

### Pattern 1: Simple Resource Creation
```javascript
const org = await testDataHelpers.createTestOrganization(prisma)();
cleanup.track('organizations', org.id);
```

### Pattern 2: Related Resources
```javascript
const org = await testDataHelpers.createTestOrganization(prisma)();
const user = await testDataHelpers.createTestUser(prisma)(org.id);
const station = await testDataHelpers.createTestStation(prisma)(org.id);

cleanup.trackMultiple({
  organizations: [org.id],
  users: [user.id],
  stations: [station.id],
});
```

### Pattern 3: Bulk Seeding
```javascript
const data = await seedTestDatabase({
  organizations: 3,
  usersPerOrg: 5,
  stationsPerOrg: 10,
});

cleanup.trackMultiple({
  organizations: data.organizations.map(o => o.id),
  users: data.users.map(u => u.id),
  stations: data.stations.map(s => s.id),
});
```

## Coverage Thresholds

Current configuration requires:
- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%
- **Statements**: 60%

Run with coverage:
```bash
npm run test:coverage
```

## Best Practices

1. **Always use CleanupManager** - Track all created resources
2. **Use test data helpers** - Don't manually create test data
3. **Apply fixtures** - Reuse common test data patterns
4. **Generate unique data** - Use generators for emails, subdomains
5. **Test in isolation** - Each test should be independent
6. **Use beforeAll/afterAll** - Setup and teardown properly
7. **Handle async** - Always use async/await
8. **Descriptive names** - Use clear test descriptions

## Migration Status

### Migrated Tests
- ✅ `analytics.test.js` - Fully migrated

### Pending Migration
- ⏳ `auth.test.js`
- ⏳ `audit-log.test.js`
- ⏳ `e2e-integration.test.js`
- ⏳ `mobile-api.test.js`
- ⏳ `monitoring.test.js`
- ⏳ `performance.test.js`
- ⏳ `queue.test.js`
- ⏳ `quota.test.js`
- ⏳ `report-generation.test.js`
- ⏳ `security.test.js`
- ⏳ `stripe.test.js`
- ⏳ `stripe-unit.test.js`
- ⏳ `tenant-isolation.test.js`
- ⏳ `tenant-isolation.unit.test.js`
- ⏳ `tenantMigration.test.js`
- ⏳ `token-hashing.test.js`
- ⏳ `tracing.test.js`
- ⏳ `websocket-notifications.test.js`

## Next Steps

1. ✅ Complete infrastructure setup
2. ⏳ Migrate remaining test files
3. ⏳ Remove duplicate tests in `src/tests/`
4. ⏳ Update CI/CD pipeline
5. ⏳ Add more fixtures as needed
6. ⏳ Improve coverage to meet thresholds

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test
npm test -- analytics.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create user"

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Troubleshooting

### Tests timing out
- Increase timeout in jest.config.js or per-test
- Check for hanging connections

### Database connection issues
- Verify DATABASE_URL and TEST_DATABASE_URL
- Ensure PostgreSQL is running

### Redis connection issues
- Verify REDIS_HOST and REDIS_PORT
- Tests will warn if Redis is unavailable

### Import errors
- Check relative paths from tests directory
- Ensure helpers are exported from index.js

### Cleanup not working
- Verify resources are tracked: `cleanup.track(type, id)`
- Check cleanup is called in afterAll

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Test README](./README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Example Test](./example.test.js)
