# API Regression Test Suite

Comprehensive API endpoint regression tests covering all authentication flows, CRUD operations, tenant isolation, and error handling.

## Test Files

### 1. Authentication Flows (`api-regression-auth.test.js`)
Tests all authentication endpoints with proper validation:

- **POST /api/auth/signup-with-org**
  - ✅ Create organization and user successfully
  - ✅ Reject duplicate subdomain
  - ✅ Reject invalid subdomain format
  - ✅ Reject missing required fields
  - ✅ Validate password requirements
  - ✅ No password in response

- **GET /api/auth/check-subdomain**
  - ✅ Return unavailable for existing subdomain
  - ✅ Return available for new subdomain
  - ✅ Reject request without subdomain parameter

- **POST /api/auth/verify-email**
  - ✅ Verify user email with valid token
  - ✅ Reject invalid/expired tokens

- **POST /api/auth/login**
  - ✅ Login successfully with verified email
  - ✅ Return access and refresh tokens
  - ✅ Reject login with invalid password
  - ✅ Reject login with non-existent email
  - ✅ Reject login with missing credentials
  - ✅ Reject login with unverified email

- **POST /api/auth/refresh**
  - ✅ Refresh access token with valid refresh token
  - ✅ Rotate refresh tokens
  - ✅ Reject refresh with invalid token
  - ✅ Reject refresh without token

- **POST /api/auth/password-reset-request**
  - ✅ Accept password reset request for existing user
  - ✅ Return success for non-existent email (security)
  - ✅ Reject request without email

- **POST /api/auth/logout**
  - ✅ Logout successfully
  - ✅ Revoke refresh token
  - ✅ Handle logout without refresh token

- **POST /api/auth/resend-verification**
  - ✅ Resend verification email for unverified user
  - ✅ Reject for already verified users

### 2. Stations CRUD with Tenant Isolation (`api-regression-stations.test.js`)
Tests station management with strict tenant isolation:

- **POST /api/stations**
  - ✅ Create station for org1
  - ✅ Create station for org2
  - ✅ Reject unauthorized creation
  - ✅ Reject invalid data schema
  - ✅ Validate required fields
  - ✅ Validate location format

- **GET /api/stations**
  - ✅ Return only org1 stations (tenant isolation)
  - ✅ Return only org2 stations (tenant isolation)
  - ✅ Filter by region
  - ✅ Reject unauthorized access
  - ✅ Return empty array when no stations

- **PUT /api/stations/:id**
  - ✅ Update own station
  - ✅ NOT update other org station (tenant isolation)
  - ✅ Reject invalid update data
  - ✅ Validate partial schema updates

- **DELETE /api/stations/:id**
  - ✅ Delete own station
  - ✅ NOT delete other org station (tenant isolation)
  - ✅ Reject unauthorized deletion
  - ✅ Return 404 for non-existent station

### 3. Audits Lifecycle (`api-regression-audits.test.js`)
Tests audit management with status transitions and findings:

- **POST /api/audits**
  - ✅ Create audit with valid data
  - ✅ Set initial status to Scheduled
  - ✅ Set initial score to 0
  - ✅ Reject without authentication
  - ✅ Reject with missing required fields
  - ✅ Validate audit number uniqueness

- **GET /api/audits**
  - ✅ Return all audits for organization
  - ✅ Filter audits by station
  - ✅ Filter audits by status
  - ✅ Filter audits by date range
  - ✅ Tenant isolation enforcement

- **GET /api/audits/:id**
  - ✅ Return specific audit
  - ✅ Reject access to non-existent audit
  - ✅ Reject access to other org audit

- **PUT /api/audits/:id**
  - ✅ Update audit status
  - ✅ Update audit with findings
  - ✅ Add multiple findings with severity
  - ✅ Add photos to findings
  - ✅ Update overall score
  - ✅ Set completion date
  - ✅ Validate status transitions
  - ✅ Reject invalid status values

- **DELETE /api/audits/:id**
  - ✅ Delete audit
  - ✅ Reject unauthorized deletion
  - ✅ Cascade delete related data

### 4. Incidents with Notifications (`api-regression-incidents.test.js`)
Tests incident management with notification triggers:

- **POST /api/incidents**
  - ✅ Create incident with valid data
  - ✅ Set severity levels (Low, Medium, High, Critical)
  - ✅ Set initial status to Open
  - ✅ Reject without authentication
  - ✅ Reject invalid severity values
  - ✅ Validate required fields

- **GET /api/incidents**
  - ✅ Return all incidents for organization
  - ✅ Filter by severity
  - ✅ Filter by status
  - ✅ Filter by station
  - ✅ Tenant isolation enforcement

- **PUT /api/incidents/:id**
  - ✅ Update incident status
  - ✅ Progress through status transitions
  - ✅ Resolve incident with resolution date
  - ✅ Update severity
  - ✅ Add resolution notes

- **DELETE /api/incidents/:id**
  - ✅ Delete incident
  - ✅ Reject unauthorized deletion

### 5. Work Permits & Contractors (`api-regression-permits-contractors.test.js`)
Tests permit and contractor management:

- **POST /api/work-permits**
  - ✅ Create work permit with valid dates
  - ✅ Set permit type (Hot Work, Confined Space, etc.)
  - ✅ Set validity period
  - ✅ Reject without authentication
  - ✅ Validate date ranges

- **GET /api/work-permits**
  - ✅ Return all permits for organization
  - ✅ Filter by station
  - ✅ Filter by status
  - ✅ Tenant isolation enforcement

- **PUT /api/work-permits/:id**
  - ✅ Update permit status
  - ✅ Approve/reject permits
  - ✅ Extend validity period

- **POST /api/contractors**
  - ✅ Create contractor with license info
  - ✅ Set specialization
  - ✅ Set contact information
  - ✅ Reject without authentication

- **GET /api/contractors**
  - ✅ Return all contractors for organization
  - ✅ Filter by status
  - ✅ Tenant isolation enforcement

### 6. Users & Organizations (`api-regression-users-orgs.test.js`)
Tests user and organization management:

- **POST /api/users**
  - ✅ Create user in organization
  - ✅ Set role and region
  - ✅ Don't expose password in response
  - ✅ Reject without authentication

- **GET /api/users**
  - ✅ Return all users in organization
  - ✅ Don't expose password field
  - ✅ Don't expose sensitive tokens
  - ✅ Tenant isolation enforcement

- **GET /api/organizations/me**
  - ✅ Return current organization
  - ✅ Reject without authentication

- **PUT /api/organizations/me**
  - ✅ Update organization details
  - ✅ Reject without authentication
  - ✅ Validate update schema

- **GET /api/organizations/:id**
  - ✅ Return organization by id
  - ✅ Enforce access control

## Key Testing Principles

### 1. Request/Response Schema Validation
- All endpoints validate request body schemas
- Response schemas are consistent and documented
- Required fields are enforced
- Data types are validated
- Enum values are checked

### 2. Error Handling
- Proper HTTP status codes (400, 401, 403, 404, 409, 500)
- Consistent error message format
- Validation errors include field details
- Security-appropriate error messages (no information leakage)

### 3. Authorization & Authentication
- All protected endpoints require valid JWT
- Expired tokens are rejected
- Invalid tokens are rejected
- Missing tokens return 401
- Authorization checks prevent unauthorized access

### 4. Tenant Isolation
- Multi-tenant data isolation enforced at every endpoint
- Organization A cannot access Organization B data
- Tenant context automatically applied to queries
- Cross-tenant operations explicitly blocked and tested
- Isolation verified for GET, POST, PUT, DELETE operations

### 5. Data Validation
- Input sanitization prevents injection attacks
- Field length limits enforced
- Format validation (email, subdomain, dates)
- Required field validation
- Type coercion handled safely

## Running Tests

### Run All Regression Tests
```bash
npm test -- api-regression
```

### Run Specific Test Suite
```bash
npm test -- api-regression-auth.test.js
npm test -- api-regression-stations.test.js
npm test -- api-regression-audits.test.js
npm test -- api-regression-incidents.test.js
npm test -- api-regression-permits-contractors.test.js
npm test -- api-regression-users-orgs.test.js
```

### Run in Docker
```bash
docker-compose -f docker/docker-compose.yml exec app npm test -- api-regression
```

### Watch Mode
```bash
npm test -- --watch api-regression
```

## Test Coverage

Total Tests: 100+
- Authentication: 25+ tests
- Stations CRUD: 15+ tests
- Audits Lifecycle: 20+ tests
- Incidents: 12+ tests
- Work Permits: 8+ tests
- Contractors: 6+ tests
- Users: 8+ tests
- Organizations: 6+ tests

## Prerequisites

1. **Service Running**: API server must be running on `http://localhost:3001`
2. **Database**: PostgreSQL must be accessible
3. **Redis**: Redis must be running for rate limiting
4. **Environment**: `.env` file configured with JWT secrets

## Test Data Management

- Tests create isolated test organizations
- Each test suite has its own cleanup in `afterAll`
- Test data uses unique identifiers (timestamps + random strings)
- Cleanup handles cascading deletes
- Database state is preserved between test files

## CI/CD Integration

These tests are designed for CI/CD pipelines:
- Fast execution (parallel test files)
- Deterministic results
- Proper cleanup
- Clear failure messages
- Exit codes for automation

## Best Practices

1. **Isolation**: Each test file is independent
2. **Cleanup**: All test data is cleaned up after tests
3. **Idempotent**: Tests can be run multiple times
4. **Fast**: Tests run in parallel where possible
5. **Clear**: Test names clearly describe what is being tested
6. **Comprehensive**: Cover happy paths and error cases
7. **Realistic**: Use realistic test data and scenarios

## Troubleshooting

### Tests Fail to Start
- Check if API server is running: `curl http://localhost:3001/api/health`
- Verify database connection
- Check Redis connection
- Ensure `.env` has required variables

### Tests Timeout
- Increase timeout in `beforeAll` (default 90s)
- Check service startup time
- Verify database performance

### Random Failures
- Check for test data conflicts
- Verify cleanup is working
- Look for race conditions
- Check tenant isolation

### Cleanup Errors
- Manually clean test data: `DELETE FROM organizations WHERE name LIKE '%Test%'`
- Check foreign key constraints
- Verify cascade delete rules
