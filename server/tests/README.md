# Test Infrastructure

Unified test infrastructure for HSE.Digital backend with Jest framework, shared fixtures, database seeding utilities, and authentication helpers.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Configuration](#configuration)
- [Writing Tests](#writing-tests)
- [Test Helpers](#test-helpers)
- [Fixtures](#fixtures)
- [Database Management](#database-management)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- auth.test.js

# Run tests with coverage
npm test -- --coverage

# Run tests matching pattern
npm test -- --testNamePattern="should create user"
```

## Test Structure

```
tests/
├── setup/                    # Global setup and teardown
│   ├── global-setup.js      # Runs once before all tests
│   ├── global-teardown.js   # Runs once after all tests
│   └── jest.setup.js        # Jest configuration
├── helpers/                  # Test helper functions
│   ├── auth.helpers.js      # Authentication utilities
│   ├── db.helpers.js        # Database utilities
│   ├── test-data.helpers.js # Test data generators
│   └── index.js             # Aggregated exports
├── fixtures/                 # Shared test data
│   ├── organizations.fixture.js
│   ├── users.fixture.js
│   ├── stations.fixture.js
│   └── index.js
├── utils/                    # Utility functions
│   ├── seed.utils.js        # Database seeding
│   └── cleanup.utils.js     # Resource cleanup
└── *.test.js                # Test files

```

## Configuration

### jest.config.js

```javascript
{
  testEnvironment: 'node',
  testTimeout: 30000,
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
}
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/hse_digital
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/hse_digital_test
JWT_SECRET=your-jwt-secret
REFRESH_SECRET=your-refresh-secret

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
DEBUG_TESTS=false
```

## Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getTestPrisma, createCleanupManager, authHelpers, generateTestEmail } from './helpers/index.js';

describe('Feature Tests', () => {
  let prisma;
  let cleanup;

  beforeAll(async () => {
    prisma = getTestPrisma();
    cleanup = createCleanupManager();
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  beforeEach(() => {
    // Reset mocks if needed
  });

  it('should test something', async () => {
    // Arrange
    const org = await prisma.organization.create({
      data: { name: 'Test Org', slug: 'test-org' }
    });
    cleanup.track('organizations', org.id);

    // Act
    const result = await someFunction(org.id);

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Using Fixtures

```javascript
import { organizationFixtures, userFixtures } from './fixtures/index.js';

it('should create organization with fixture data', async () => {
  const org = await prisma.organization.create({
    data: {
      ...organizationFixtures.freeOrganization,
      slug: generateTestSubdomain(),
      ownerId: 'test-owner'
    }
  });
  
  expect(org.subscriptionPlan).toBe('free');
});
```

### Using Test Data Helpers

```javascript
import { testDataHelpers } from './helpers/index.js';

it('should create test user', async () => {
  const org = await testDataHelpers.createTestOrganization(prisma)();
  const user = await testDataHelpers.createTestUser(prisma)(org.id, {
    role: 'Admin',
    email: 'custom@example.com'
  });
  
  expect(user.organizationId).toBe(org.id);
});
```

## Test Helpers

### Authentication Helpers

```javascript
import { authHelpers } from './helpers/index.js';

// Hash passwords
const hashedPassword = await authHelpers.hashPassword('password123');

// Generate tokens
const tokens = authHelpers.generateTokens(user);
const { accessToken, refreshToken } = tokens;

// Verify tokens
const decoded = authHelpers.verifyAccessToken(accessToken);

// Create auth headers
const headers = authHelpers.createAuthHeader(accessToken);
```

### Database Helpers

```javascript
import { dbHelpers } from './helpers/index.js';

// Get Prisma instance
const prisma = dbHelpers.getPrisma();

// Clean entire database
await dbHelpers.cleanDatabase();

// Cleanup specific resources
await dbHelpers.cleanupTestData('users', [userId1, userId2]);

// Execute raw SQL
await dbHelpers.executeRaw('DELETE FROM "User" WHERE email LIKE $1', 'test%');

// Run transaction
await dbHelpers.transaction(async (tx) => {
  await tx.user.create({ data: userData });
  await tx.organization.create({ data: orgData });
});
```

### Cleanup Manager

```javascript
import { createCleanupManager } from './helpers/index.js';

describe('Tests with cleanup', () => {
  let cleanup;

  beforeAll(() => {
    cleanup = createCleanupManager();
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  it('tracks and cleans resources', async () => {
    const org = await prisma.organization.create({ data: orgData });
    cleanup.track('organizations', org.id);

    const user = await prisma.user.create({ data: userData });
    cleanup.track('users', user.id);

    // Cleanup runs automatically in afterAll
  });
});
```

## Fixtures

### Available Fixtures

- **organizationFixtures**: `freeOrganization`, `proOrganization`, `enterpriseOrganization`, `suspendedOrganization`
- **userFixtures**: `adminUser`, `complianceManager`, `stationManager`, `auditor`, `contractor`
- **stationFixtures**: `lowRiskStation`, `mediumRiskStation`, `highRiskStation`, `inactiveStation`
- **auditFixtures**: `scheduledAudit`, `completedAudit`, `failedAudit`
- **incidentFixtures**: `lowSeverityIncident`, `highSeverityIncident`, `criticalIncident`
- **contractorFixtures**: `electricalContractor`, `mechanicalContractor`, `civilContractor`
- **formFixtures**: `dailyChecklist`, `weeklyInspection`

## Database Management

### Seeding Test Data

```javascript
import { seedTestDatabase, seedRBACData } from './helpers/index.js';

beforeAll(async () => {
  // Seed with custom options
  const seededData = await seedTestDatabase({
    organizations: 2,
    usersPerOrg: 3,
    stationsPerOrg: 5,
    auditsPerStation: 2,
    incidentsPerStation: 1
  });

  // Seed RBAC data
  const { roles, permissions } = await seedRBACData();
});
```

### Cleaning Up

```javascript
import { cleanupSeededData } from './helpers/index.js';

afterAll(async () => {
  await cleanupSeededData(seededData);
});
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- auth.test.js
npm test -- security.test.js
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="authentication"
```

### Run Tests for Specific File
```bash
npm test -- --testPathPattern="auth"
```

### Debug Tests
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Best Practices

### 1. Use beforeAll/afterAll for Setup/Teardown

```javascript
describe('Feature', () => {
  beforeAll(async () => {
    // Setup once
  });

  afterAll(async () => {
    // Cleanup once
  });
});
```

### 2. Track Created Resources

Always track resources you create for cleanup:

```javascript
const org = await prisma.organization.create({ data: orgData });
cleanup.track('organizations', org.id);
```

### 3. Use Unique Test Data

Generate unique data to avoid conflicts:

```javascript
import { generateTestEmail, generateTestSubdomain } from './helpers/index.js';

const email = generateTestEmail(); // test-1234567890-abc@example.com
const slug = generateTestSubdomain(); // test-org-1234567890-xyz
```

### 4. Test in Isolation

Each test should be independent:

```javascript
// ❌ Bad - tests depend on each other
it('creates user', () => { /* ... */ });
it('updates user', () => { /* uses user from previous test */ });

// ✅ Good - each test is independent
it('creates user', () => { /* creates own user */ });
it('updates user', () => { /* creates own user, then updates */ });
```

### 5. Use Descriptive Test Names

```javascript
// ❌ Bad
it('works', () => { /* ... */ });

// ✅ Good
it('should create organization with valid data', () => { /* ... */ });
it('should reject invalid email format', () => { /* ... */ });
```

### 6. Group Related Tests

```javascript
describe('User Authentication', () => {
  describe('Login', () => {
    it('should login with valid credentials', () => { /* ... */ });
    it('should reject invalid password', () => { /* ... */ });
  });

  describe('Logout', () => {
    it('should invalidate token on logout', () => { /* ... */ });
  });
});
```

### 7. Handle Async Operations

Always use async/await:

```javascript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### 8. Clean Up After Tests

```javascript
afterEach(async () => {
  // Clean up after each test if needed
});

afterAll(async () => {
  // Clean up after all tests
  await cleanup.cleanup();
});
```

## Troubleshooting

### Tests Timing Out

Increase timeout in test or config:

```javascript
it('long running test', async () => {
  // Test code
}, 60000); // 60 second timeout
```

### Database Connection Issues

Check environment variables:

```bash
echo $DATABASE_URL
echo $TEST_DATABASE_URL
```

### Redis Connection Issues

Skip Redis-dependent tests if Redis is unavailable:

```javascript
const redisAvailable = process.env.REDIS_HOST !== undefined;

(redisAvailable ? it : it.skip)('should use Redis', async () => {
  // Test using Redis
});
```

### Open Handles Warning

Ensure all connections are closed:

```javascript
afterAll(async () => {
  await cleanup.cleanup();
  await prisma.$disconnect();
});
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
