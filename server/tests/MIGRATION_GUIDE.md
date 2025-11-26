# Test Migration Guide

Guide for migrating existing tests to the new unified test infrastructure.

## Overview

The new test infrastructure provides:
- **Jest** as the test framework
- **Shared helpers** for authentication, database operations, and test data
- **Fixtures** for common test data patterns
- **Cleanup managers** for automatic resource cleanup
- **Seeding utilities** for complex test scenarios

## Quick Migration Checklist

- [ ] Update imports to use new helpers
- [ ] Replace manual cleanup with CleanupManager
- [ ] Use test data helpers instead of manual creation
- [ ] Apply fixtures where applicable
- [ ] Update beforeAll/afterAll hooks
- [ ] Ensure proper Jest assertions

## Step-by-Step Migration

### 1. Update Imports

#### Before:
```javascript
import prisma from '../utils/db.js';
import { authService } from '../services/authService.js';
```

#### After:
```javascript
import { 
  getTestPrisma, 
  createCleanupManager,
  authHelpers,
  testDataHelpers,
  generateTestEmail,
  generateTestSubdomain
} from './helpers/index.js';
```

### 2. Setup Test Suite

#### Before:
```javascript
describe('My Tests', () => {
  let testOrgId;
  let testUserId;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: `test-${Date.now()}`,
        ownerId: 'owner'
      }
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
  });
});
```

#### After:
```javascript
describe('My Tests', () => {
  let prisma;
  let cleanup;
  let testOrg;
  let testUser;

  beforeAll(async () => {
    prisma = getTestPrisma();
    cleanup = createCleanupManager();

    testOrg = await testDataHelpers.createTestOrganization(prisma)();
    cleanup.track('organizations', testOrg.id);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });
});
```

### 3. Create Test Data

#### Before:
```javascript
const user = await prisma.user.create({
  data: {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: await bcrypt.hash('password', 10),
    role: 'Admin',
    organizationId: testOrgId,
    isEmailVerified: true
  }
});
```

#### After:
```javascript
const user = await testDataHelpers.createTestUser(prisma)(testOrg.id, {
  role: 'Admin',
  email: generateTestEmail(),
});
cleanup.track('users', user.id);
```

### 4. Use Fixtures

#### Before:
```javascript
const station = await prisma.station.create({
  data: {
    name: 'High Risk Station',
    brand: 'TestBrand',
    region: 'North',
    address: '123 Test St',
    location: { lat: 0, lng: 0 },
    riskCategory: 'High',
    auditFrequency: 'Quarterly',
    isActive: true,
    organizationId: testOrgId
  }
});
```

#### After:
```javascript
import { stationFixtures } from './fixtures/index.js';

const station = await prisma.station.create({
  data: {
    ...stationFixtures.highRiskStation,
    organizationId: testOrg.id,
  }
});
cleanup.track('stations', station.id);
```

### 5. Authentication

#### Before:
```javascript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const hashedPassword = await bcrypt.hash('password', 10);
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
```

#### After:
```javascript
const hashedPassword = await authHelpers.hashPassword('password');
const tokens = authHelpers.generateTokens(user);
const { accessToken, refreshToken } = tokens;
```

### 6. Cleanup Resources

#### Before:
```javascript
afterAll(async () => {
  await prisma.incident.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.audit.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.station.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
  await prisma.organization.delete({ where: { id: testOrgId } });
  await prisma.$disconnect();
});
```

#### After:
```javascript
afterAll(async () => {
  await cleanup.cleanup();
});
```

### 7. Database Seeding

#### Before:
```javascript
// Manual creation of multiple related records
const org = await prisma.organization.create({ data: orgData });
const users = [];
for (let i = 0; i < 5; i++) {
  const user = await prisma.user.create({ data: userData });
  users.push(user);
}
// ... more manual creation
```

#### After:
```javascript
const seededData = await seedTestDatabase({
  organizations: 1,
  usersPerOrg: 5,
  stationsPerOrg: 3,
  auditsPerStation: 2,
});

cleanup.trackMultiple({
  organizations: seededData.organizations.map(o => o.id),
  users: seededData.users.map(u => u.id),
  stations: seededData.stations.map(s => s.id),
  audits: seededData.audits.map(a => a.id),
});
```

## Complete Example

### Before Migration:

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '../utils/db.js';
import bcrypt from 'bcrypt';

describe('User Tests', () => {
  let testOrgId;
  let testUserId;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: `test-org-${Date.now()}`,
        ownerId: 'test-owner',
        subscriptionPlan: 'free'
      }
    });
    testOrgId = org.id;

    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: await bcrypt.hash('password123', 10),
        role: 'Admin',
        organizationId: testOrgId,
        isEmailVerified: true
      }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
  });

  it('should create user', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user).toBeDefined();
    expect(user.role).toBe('Admin');
  });
});
```

### After Migration:

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  getTestPrisma,
  createCleanupManager,
  testDataHelpers,
} from './helpers/index.js';

describe('User Tests', () => {
  let prisma;
  let cleanup;
  let testOrg;
  let testUser;

  beforeAll(async () => {
    prisma = getTestPrisma();
    cleanup = createCleanupManager();

    testOrg = await testDataHelpers.createTestOrganization(prisma)({
      subscriptionPlan: 'free',
    });
    cleanup.track('organizations', testOrg.id);

    testUser = await testDataHelpers.createTestUser(prisma)(testOrg.id, {
      role: 'Admin',
    });
    cleanup.track('users', testUser.id);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  it('should create user', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(user).toBeDefined();
    expect(user.role).toBe('Admin');
  });
});
```

## Common Patterns

### Pattern 1: Create Organization with Users

```javascript
const org = await testDataHelpers.createTestOrganization(prisma)();
cleanup.track('organizations', org.id);

const admin = await testDataHelpers.createTestUser(prisma)(org.id, {
  role: 'Admin',
});

const manager = await testDataHelpers.createTestUser(prisma)(org.id, {
  role: 'Station Manager',
});

cleanup.track('users', [admin.id, manager.id]);
```

### Pattern 2: Complete Test Scenario

```javascript
const org = await testDataHelpers.createTestOrganization(prisma)();
const user = await testDataHelpers.createTestUser(prisma)(org.id);
const station = await testDataHelpers.createTestStation(prisma)(org.id);
const audit = await testDataHelpers.createTestAudit(prisma)(
  org.id,
  station.id,
  user.id
);

cleanup.trackMultiple({
  organizations: [org.id],
  users: [user.id],
  stations: [station.id],
  audits: [audit.id],
});
```

### Pattern 3: Using Fixtures with Overrides

```javascript
import { stationFixtures, userFixtures } from './fixtures/index.js';

const station = await prisma.station.create({
  data: {
    ...stationFixtures.highRiskStation,
    name: 'Custom Station Name',
    organizationId: org.id,
  }
});

const user = await testDataHelpers.createTestUser(prisma)(org.id, {
  ...userFixtures.complianceManager,
  email: generateTestEmail(),
});
```

## Troubleshooting

### Issue: Test timeout

**Solution:** Increase timeout for specific test or globally

```javascript
it('long running test', async () => {
  // test code
}, 60000); // 60 seconds
```

### Issue: Resources not cleaned up

**Solution:** Ensure cleanup is tracked

```javascript
const resource = await createResource();
cleanup.track('resourceType', resource.id);
```

### Issue: Import errors

**Solution:** Update import paths

```javascript
// Use relative path from tests directory
import { getTestPrisma } from './helpers/index.js';
```

### Issue: Database connection errors

**Solution:** Check environment variables

```bash
# .env
DATABASE_URL=postgresql://...
TEST_DATABASE_URL=postgresql://...
```

## Next Steps

1. Start with simple test files
2. Migrate one test suite at a time
3. Run tests frequently to catch issues early
4. Update test documentation as you go
5. Share learnings with the team

## Resources

- [Test Infrastructure README](./README.md)
- [Example Test File](./example.test.js)
- [Jest Documentation](https://jestjs.io/)
