# Test Scripts

This directory contains scripts for running and managing regression tests.

## Scripts

### `run-regression-tests.js`
Main test runner script that executes categorized test suites.

**Usage:**
```bash
node scripts/run-regression-tests.js <mode>
```

**Modes:**
- `all` - Run all tests (default)
- `fast` - Run fast tests (unit tests, <5s each)
- `critical` - Run critical tests (auth, tenant isolation, billing)
- `unit` - Run unit tests only
- `integration` - Run integration tests only

**Example:**
```bash
# Run critical tests
node scripts/run-regression-tests.js critical

# Via npm script
npm run test:regression:critical
```

### `generate-test-summary.js`
Generates markdown summary report from test results and coverage data.

**Usage:**
```bash
node scripts/generate-test-summary.js
```

**Output:**
- `test-results/summary.md` - Markdown summary report

**Requirements:**
- Tests must be run first to generate coverage data
- Requires `coverage/coverage-summary.json`

### `validate-test-setup.js`
Validates that all test infrastructure is properly configured.

**Usage:**
```bash
node scripts/validate-test-setup.js
```

**Checks:**
- Configuration files exist
- npm scripts are defined
- Dependencies are installed
- GitHub Actions workflow exists

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

## NPM Scripts

These scripts are available via `npm run`:

```bash
# Run full regression suite
npm run test:regression

# Run fast tests (unit tests)
npm run test:regression:fast

# Run critical tests
npm run test:regression:critical

# Run unit tests
npm run test:regression:unit

# Run integration tests
npm run test:regression:integration

# Generate coverage report
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

## Test Categories

Test categories are defined in `.test-tags.json`:

```json
{
  "critical": ["auth.test.js", "tenant-isolation.test.js", "stripe.test.js"],
  "fast": ["auth.test.js", "analytics.test.js", "queue.test.js"],
  "slow": ["e2e-integration.test.js", "report-generation.test.js"]
}
```

## Adding New Tests

1. Create test file in `src/tests/`
2. Add test file to appropriate category in `.test-tags.json`
3. Run validation: `node scripts/validate-test-setup.js`
4. Test locally: `npm run test:regression:fast`

## Output Files

Tests generate the following output:

```
coverage/
├── index.html          # HTML coverage report
├── lcov.info          # LCOV format for CI
└── coverage-summary.json  # JSON summary

test-results/
├── index.html         # HTML test results
├── junit.xml         # JUnit XML for CI
└── summary.md        # Markdown summary
```

## CI/CD Integration

GitHub Actions workflow automatically:
- Runs critical and fast tests on PRs
- Runs full regression on main branch
- Uploads coverage reports
- Creates failure notifications

See `.github/workflows/regression-tests.yml` for details.

## Troubleshooting

### Tests not found
Ensure test files match pattern in `jest.config.js`:
```javascript
testMatch: ['**/src/tests/**/*.test.js']
```

### Coverage not generated
Create output directories:
```bash
mkdir -p coverage test-results
```

### Script permissions
Make scripts executable:
```bash
chmod +x scripts/*.js
```

## Documentation

- `../REGRESSION_TESTING.md` - Complete testing guide
- `./test-runner-example.md` - Usage examples
- `../../REGRESSION_TESTING_SETUP.md` - Setup summary
