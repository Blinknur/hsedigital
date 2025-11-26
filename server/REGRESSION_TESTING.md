# Regression Testing Guide

Comprehensive automated regression testing suite with categorized tests, HTML coverage reports, and CI/CD integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Quick Start](#quick-start)
- [NPM Scripts](#npm-scripts)
- [GitHub Actions](#github-actions)
- [Coverage Reports](#coverage-reports)
- [Test Configuration](#test-configuration)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)

## Overview

The regression testing suite provides:
- ✅ **Categorized tests**: Critical, fast, slow, unit, integration
- 📊 **HTML coverage reports**: Visual coverage analysis
- 🔄 **CI/CD integration**: Automated testing on PRs and merges
- 📧 **Failure notifications**: Automatic issue creation on failures
- 📈 **Test summaries**: Detailed markdown reports

## Test Categories

Tests are organized into categories defined in `.test-tags.json`:

### Critical Tests
Core functionality that must always work:
- `auth.test.js` - Authentication and authorization
- `tenant-isolation.test.js` - Multi-tenant data isolation
- `stripe.test.js` - Billing and payment processing
- `security.test.js` - Security features
- `token-hashing.test.js` - Token security

### Fast Tests
Quick unit tests (< 5s each):
- Authentication tests
- Token hashing
- Analytics tests
- Queue tests
- Quota tests

### Slow Tests
Integration and E2E tests (> 10s):
- E2E integration tests
- Report generation
- WebSocket notifications
- Performance tests
- Monitoring tests

### Unit Tests
Isolated component tests with no external dependencies

### Integration Tests
Tests that verify interactions between components

## Quick Start

### Local Development

```bash
# Install dependencies (includes test reporters)
cd server && npm install

# Run all regression tests
npm run test:regression

# Run fast tests (excludes slow integration tests)
npm run test:regression:fast

# Run critical tests only (auth, tenant isolation, billing)
npm run test:regression:critical

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Docker

```bash
# Run tests in Docker
docker-compose -f docker/docker-compose.yml exec app npm run test:regression:fast

# Run critical tests
docker-compose -f docker/docker-compose.yml exec app npm run test:regression:critical
```

## NPM Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run test:regression` | Full regression suite | Before releases, nightly builds |
| `npm run test:regression:fast` | Fast tests only | During development, PR checks |
| `npm run test:regression:critical` | Critical tests | Pre-deploy verification |
| `npm run test:regression:unit` | Unit tests only | Component development |
| `npm run test:regression:integration` | Integration tests | API development |
| `npm run test:coverage` | Generate coverage report | Code quality checks |
| `npm run test:watch` | Watch mode | Active development |

## GitHub Actions

### Workflow: `regression-tests.yml`

Automated testing runs on:
- ✅ Pull requests to `main` and `develop`
- ✅ Pushes to `main` and `develop`
- ✅ Nightly schedule (2 AM UTC)
- ✅ Manual workflow dispatch

### Jobs

#### 1. Critical Tests (15 min timeout)
Runs on **all PRs** and pushes:
- Auth tests
- Tenant isolation tests
- Billing tests
- Security tests

**Artifacts:**
- Coverage report (30 days)
- Test results (30 days)
- JUnit XML

#### 2. Fast Tests (10 min timeout)
Runs on **all PRs** and pushes:
- Unit tests
- Quick integration tests

**Artifacts:**
- Coverage report (14 days)
- Test results (14 days)

#### 3. Full Regression (30 min timeout)
Runs only on **pushes to main**:
- All test categories
- Comprehensive coverage
- Uploads to Codecov

**Artifacts:**
- Full coverage report (90 days)
- Complete test results (90 days)

#### 4. Failure Notifications
Automatic notifications on test failures:
- PR comments with failure details
- GitHub issues for main branch failures
- Links to workflow logs and artifacts

## Coverage Reports

### HTML Reports

After running tests, open the HTML coverage report:

```bash
# Generate coverage
npm run test:coverage

# Open in browser
open coverage/index.html
```

The HTML report includes:
- Line-by-line coverage visualization
- File tree with coverage percentages
- Uncovered lines highlighted in red
- Branch coverage details

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60
  }
}
```

### Test Results

HTML test results are generated in `test-results/index.html`:

```bash
# View test results
open test-results/index.html
```

Includes:
- Test execution time
- Pass/fail status
- Console logs
- Failure messages
- Stack traces

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
export default {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/tests/**'],
  coverageReporters: ['html', 'text', 'lcov', 'json-summary'],
  reporters: ['default', 'jest-html-reporter', 'jest-junit'],
  testTimeout: 30000
};
```

### Test Tags (`.test-tags.json`)

Categorizes tests for selective execution:

```json
{
  "critical": ["auth.test.js", "tenant-isolation.test.js"],
  "fast": ["auth.test.js", "analytics.test.js"],
  "slow": ["e2e-integration.test.js", "report-generation.test.js"]
}
```

### Environment Variables

Required for tests:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
JWT_SECRET=test-secret
REFRESH_SECRET=test-refresh-secret
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Writing Tests

### Test Structure

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Component', () => {
    it('should do something', async () => {
      const response = await request(app)
        .get('/api/endpoint')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
```

### Categorizing Tests

Add your test file to `.test-tags.json`:

```json
{
  "critical": ["your-critical-test.test.js"],
  "fast": ["your-unit-test.test.js"],
  "slow": ["your-integration-test.test.js"]
}
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Mocking**: Mock external services
4. **Naming**: Use descriptive test names
5. **Assertions**: Use specific assertions
6. **Coverage**: Aim for >60% coverage

### Example Test

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import prisma from '../utils/db.js';
import { authService } from '../services/authService.js';

describe('Authentication', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: await authService.hashPassword('TestPass123!'),
        name: 'Test User',
        role: 'Admin',
        isEmailVerified: true
      }
    });
  });

  afterEach(async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('should authenticate valid credentials', async () => {
    const result = await authService.login('test@example.com', 'TestPass123!');
    
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should reject invalid credentials', async () => {
    await expect(
      authService.login('test@example.com', 'WrongPassword')
    ).rejects.toThrow('Invalid credentials');
  });
});
```

## Troubleshooting

### Tests Failing Locally

```bash
# Check environment variables
cat .env

# Ensure database is running
docker ps | grep postgres

# Regenerate Prisma client
npx prisma generate

# Clear Jest cache
npx jest --clearCache

# Run single test file
npm test -- src/tests/auth.test.js
```

### Coverage Not Generated

```bash
# Ensure coverage directory exists
mkdir -p coverage test-results

# Run with explicit coverage flag
npm test -- --coverage

# Check file permissions
ls -la coverage/
```

### CI/CD Failures

1. **Check workflow logs**: Actions tab → Failed workflow → View logs
2. **Download artifacts**: Coverage and test result artifacts
3. **Verify environment**: Ensure all env vars are set in GitHub secrets
4. **Database connection**: Check service container health

### Common Issues

#### Database Connection Errors
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Timeout Errors
```javascript
// Increase timeout in jest.config.js
testTimeout: 60000 // 60 seconds
```

#### Memory Issues
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

## Continuous Improvement

### Adding New Tests

1. Write test in `src/tests/`
2. Add to appropriate category in `.test-tags.json`
3. Run locally: `npm run test:regression:fast`
4. Commit and create PR
5. CI will run tests automatically

### Updating Thresholds

Edit `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70, // Increase from 60
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

### Custom Reporters

Add custom reporters in `jest.config.js`:

```javascript
reporters: [
  'default',
  ['jest-html-reporter', { /* options */ }],
  ['jest-junit', { /* options */ }],
  ['./custom-reporter.js', { /* options */ }]
]
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Code Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)

---

**Last Updated:** $(date +%Y-%m-%d)
