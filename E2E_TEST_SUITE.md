# E2E Integration Test Suite - Implementation Summary

## Overview

This document describes the end-to-end integration test suite for HSE.Digital, covering critical user journeys with full containerized environment support and test data isolation.

## Files Created

### 1. Main Test Suite
**File:** `server/tests/e2e-integration.test.js`

Comprehensive E2E test suite covering:
- User signup with organization creation
- Authentication and JWT token management
- Stripe checkout session creation
- Stripe webhook simulation (subscription activation)
- Station creation with tenant isolation
- Audit creation and file upload support
- Audit updates with findings and scores
- Incident reporting
- Email notification system
- Tenant isolation verification

### 2. Test Helpers
**File:** `server/tests/test-helpers.js`

Reusable utilities for:
- Generating unique test emails and subdomains
- Creating test organizations, users, and stations
- Retry logic for flaky operations
- Wait/delay utilities

### 3. Docker Test Environment
**File:** `docker-compose.test.yml`

Isolated test environment with:
- PostgreSQL test database (port 5433)
- Redis test instance (port 6380)
- Application container with test configuration
- Health checks for all services
- Automatic Prisma schema push on startup

### 4. Test Runner Script
**File:** `scripts/run-e2e-tests.sh`

Automated test execution supporting:
- Docker environment (recommended)
- Local environment
- Service health checking
- Automatic cleanup
- Detailed logging

### 5. Documentation
**File:** `server/tests/README.md`

Comprehensive guide covering:
- Test architecture and coverage
- Running tests in different environments
- Configuration and environment variables
- Test isolation strategies
- Troubleshooting guide
- CI/CD integration examples
- Best practices

### 6. CI/CD Workflow
**File:** `.github/workflows/e2e-tests.yml`

GitHub Actions workflow for:
- Automated E2E test execution on push/PR
- PostgreSQL and Redis service containers
- Application startup and health checks
- Test result artifacts
- Failure diagnostics

## Test Coverage

### Critical User Journeys

1. **Signup with Stripe Checkout**
   - Organization creation with unique subdomain
   - Admin user registration
   - Email verification bypass for testing
   - Stripe checkout session creation
   - Webhook simulation for subscription activation
   - Plan upgrade to "professional"

2. **Audit Creation with File Uploads**
   - Station provisioning
   - Audit record creation
   - File upload endpoint validation
   - Findings attachment
   - Status transitions (Scheduled → In Progress)
   - Score calculation and updates

3. **Incident Reporting with Notifications**
   - Incident creation with severity levels
   - Reporter assignment
   - Email notification generation
   - Alert delivery (mocked in test environment)

4. **Tenant Isolation**
   - Cross-tenant data access prevention
   - Organization-scoped queries
   - Data leakage verification

## Running Tests

### Quick Start (Docker)
```bash
npm run test:e2e
```

### Local Environment
```bash
npm run test:e2e:local
```

### Manual Docker
```bash
./scripts/run-e2e-tests.sh
```

### CI/CD
Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

## Test Data Isolation

### Strategy
- Unique timestamps in all identifiers
- Isolated test database
- Automatic cleanup in finally blocks
- No cross-test contamination

### Example
```javascript
const subdomain = `test-org-${Date.now()}`;
const email = `test-${Date.now()}@example.com`;
```

## Dependencies Added

- `supertest@^6.3.3` - HTTP assertion library

## Configuration

### Environment Variables
```bash
API_BASE_URL=http://localhost:3001
TEST_DATABASE_URL=postgresql://hse_test:test_password@localhost:5432/hse_test
JWT_SECRET=test-secret-key
REFRESH_SECRET=test-refresh-secret
```

### NPM Scripts
```json
"test:e2e": "./scripts/run-e2e-tests.sh"
"test:e2e:local": "TEST_ENV=local ./scripts/run-e2e-tests.sh"
"test:e2e:docker": "docker-compose exec app npm run test:e2e"
```

## Architecture

### Request Flow
```
Test Suite → makeRequest() → HTTP Client → API Endpoint
                                              ↓
                                         Prisma Client
                                              ↓
                                      PostgreSQL (Test DB)
```

### Test Context
```javascript
{
    organizationId: 'clx...',
    userId: 'clx...',
    accessToken: 'eyJhbGc...',
    stationId: 'clx...',
    auditId: 'clx...',
    incidentId: 'clx...'
}
```

## Test Execution Flow

1. Wait for service health
2. Create organization and user (signup)
3. Authenticate and obtain JWT token
4. Test Stripe integration
5. Create station
6. Create and update audit
7. Create incident and send notification
8. Verify tenant isolation
9. Cleanup all test data
10. Report results

## Success Criteria

✅ All 10 tests must pass:
1. Signup with Organization
2. User Login
3. Stripe Checkout Session Creation
4. Stripe Webhook Simulation
5. Create Station
6. Create Audit
7. Update Audit with Findings
8. Create Incident
9. Incident Notification
10. Tenant Isolation

## Monitoring

Tests automatically track:
- Individual test pass/fail status
- Total execution time
- Service health status
- API response codes
- Database operations

## Security

- Test credentials are isolated
- No production data access
- Stripe test mode only
- Email notifications mocked
- Automatic data cleanup

## Future Enhancements

- [ ] Parallel test execution
- [ ] Performance benchmarking
- [ ] Load testing integration
- [ ] Screenshot capture on failure
- [ ] Test coverage reporting
- [ ] Multi-browser testing
- [ ] API contract testing
- [ ] Database snapshot/restore

## Troubleshooting

### Service Not Starting
```bash
docker-compose -f docker-compose.test.yml logs app-test
```

### Database Connection Issues
```bash
docker-compose -f docker-compose.test.yml exec postgres-test psql -U hse_test -d hse_test
```

### Test Failures
Check logs for detailed error messages and stack traces.

## Maintenance

- Update tests when API changes
- Keep test data minimal
- Monitor test execution time
- Review failures in CI/CD
- Update documentation as needed

## Support

For issues or questions:
1. Check `server/tests/README.md` for detailed documentation
2. Review test output and logs
3. Validate environment configuration
4. Consult service health endpoints
