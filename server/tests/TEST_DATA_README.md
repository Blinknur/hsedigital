# Test Data Management System

Comprehensive test data seeding and fixture management for HSE Digital.

## Quick Start

### Seed Test Database
npm run test:seed

### Refresh Test Data
npm run test:seed:refresh

### Cleanup Test Data
npm run test:seed:cleanup

## Test Data Structure

### Organizations
- Free: QuickFuel Station (1 station)
- Pro: FastGas Regional (5 stations)
- Enterprise: Total Parco Pakistan (8 stations)
- Enterprise: Shell Pakistan Ltd (3 stations)

### Users (20+ users across all orgs)
- Admins, Compliance Managers, Station Managers, Auditors, Contractors

### Stations (18 total)
- Low/Medium/High risk categories
- Various regions and audit frequencies

## Using Fixtures

```javascript
import { organizationFixtures, userFixtures } from '../fixtures/index.js';

const org = organizationFixtures.enterpriseOrganization;
const user = userFixtures.enterpriseOrgOwner;
```

## Test Isolation

```javascript
import { createTestContext } from '../helpers/test-isolation.helpers.js';

describe('Test Suite', () => {
  let context;

  beforeEach(() => {
    context = createTestContext('test');
  });

  afterEach(async () => {
    await context.cleanup();
  });

  it('creates isolated data', async () => {
    const org = await context.createOrganization();
    const user = await context.createUser(org.id);
    // Test logic - auto cleanup after
  });
});
```

## Best Practices

1. Use TestContext for test isolation
2. Always cleanup in afterEach
3. Seed database before test runs
4. Use fixtures for read-only tests
5. Create test data for write tests

See fixtures/ and helpers/ directories for more details.
