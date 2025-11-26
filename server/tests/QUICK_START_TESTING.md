# Quick Start - API Regression Tests

## Prerequisites

1. **Server Running**
   ```bash
   cd server
   npm install
   npm run dev
   ```
   Server should be running on `http://localhost:3001`

2. **Environment Variables**
   Ensure `.env` file has:
   ```
   JWT_SECRET=your-secret-key
   REFRESH_SECRET=your-refresh-secret
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://localhost:6379
   ```

3. **Database & Redis**
   ```bash
   # Start with Docker Compose
   npm run docker:up
   
   # Or ensure PostgreSQL and Redis are running locally
   ```

## Run Tests

### Run All Regression Tests
```bash
npm run test:regression
```

### Run Individual Test Suites
```bash
# Authentication tests
npm run test:regression:auth

# Stations CRUD with tenant isolation
npm run test:regression:stations

# Audits lifecycle
npm run test:regression:audits

# Incidents with notifications
npm run test:regression:incidents

# Work permits & contractors
npm run test:regression:permits

# Users & organizations
npm run test:regression:users
```

### Run in Watch Mode
```bash
npm test -- --watch tests/api-regression-auth.test.js
```

### Run with Coverage
```bash
npm test -- --coverage tests/api-regression
```

## Expected Output

### Successful Test Run
```
PASS  tests/api-regression-auth.test.js (45.2s)
  Authentication Flow Regression Tests
    POST /api/auth/signup-with-org
      ✓ should create organization and user successfully (1234ms)
      ✓ should reject signup with duplicate subdomain (567ms)
      ✓ should reject invalid subdomain format (345ms)
      ✓ should reject signup with missing required fields (234ms)
    GET /api/auth/check-subdomain
      ✓ should return unavailable for existing subdomain (123ms)
      ✓ should return available for new subdomain (98ms)
      ✓ should reject request without subdomain parameter (87ms)
    ...

Test Suites: 6 passed, 6 total
Tests:       102 passed, 102 total
Snapshots:   0 total
Time:        123.456 s
```

### Test Failure
```
FAIL  tests/api-regression-auth.test.js
  ● Authentication Flow Regression Tests › POST /api/auth/login › should login successfully

    expect(received).toBe(expected)

    Expected: 200
    Received: 401

      at Object.<anonymous> (tests/api-regression-auth.test.js:156:28)
```

## Troubleshooting

### "Service not ready" Error
```
Error: Service not ready
```
**Solution:**
- Check if server is running: `curl http://localhost:3001/api/health`
- Start the server: `npm run dev`
- Increase timeout in test file if needed

### "Connection refused" Error
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution:**
- Verify server is running on port 3001
- Check for port conflicts
- Ensure firewall isn't blocking

### Database Connection Error
```
Error: Can't reach database server
```
**Solution:**
- Start database: `npm run docker:up`
- Check DATABASE_URL in `.env`
- Verify PostgreSQL is running

### Redis Connection Error
```
Error: Redis connection failed
```
**Solution:**
- Start Redis: `docker-compose up redis`
- Check REDIS_URL in `.env`
- Verify Redis is running on port 6379

### Tests Timeout
```
Error: Timeout - Async callback was not invoked within the 60000 ms timeout
```
**Solution:**
- Increase timeout in `beforeAll`: `beforeAll(async () => {...}, 90000)`
- Check database performance
- Verify no hanging connections

### Cleanup Errors
```
Error: Cleanup error: Foreign key constraint failed
```
**Solution:**
- Manually clean test data
- Check cascade delete rules in schema
- Verify cleanup order (child -> parent)

## Test Data

### Generated Data Format
```javascript
{
  email: "test-1234567890-abc123@example.com",
  subdomain: "test-org-1234567890-def456",
  password: "TestPassword123!",
  name: "Test User"
}
```

### Cleanup
- All test data is automatically cleaned up after tests
- Test organizations are prefixed with "Test" or generated timestamps
- No manual cleanup needed

## Common Test Patterns

### Basic Test Structure
```javascript
describe('Feature Tests', () => {
  it('should perform action successfully', async () => {
    const response = await request(API_BASE_URL)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send({ data });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Tenant Isolation Test
```javascript
it('should not access other org data', async () => {
  const response = await request(API_BASE_URL)
    .get(`/api/resources/${otherOrgResourceId}`)
    .set('Authorization', `Bearer ${org1Token}`);
  
  expect(response.status).not.toBe(200);
});
```

### Error Handling Test
```javascript
it('should reject invalid data', async () => {
  const response = await request(API_BASE_URL)
    .post('/api/endpoint')
    .send({ invalid: 'data' });
  
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('error');
});
```

## What Tests Cover

✅ **Authentication**: Signup, login, logout, token refresh, password reset
✅ **Stations**: CRUD operations with tenant isolation
✅ **Audits**: Lifecycle management, findings, status transitions
✅ **Incidents**: Creation, updates, severity handling
✅ **Work Permits**: Creation, approval workflows
✅ **Contractors**: Management and filtering
✅ **Users**: Creation, listing, security
✅ **Organizations**: Management and updates
✅ **Authorization**: Token validation, permissions
✅ **Validation**: Request/response schemas
✅ **Error Handling**: Proper status codes and messages
✅ **Tenant Isolation**: Multi-tenant data separation

## Performance

- **Total Tests**: 100+
- **Execution Time**: ~2-3 minutes (all tests)
- **Per Suite**: 20-45 seconds
- **Parallel**: Test files run in parallel
- **Fast Feedback**: Individual suites complete quickly

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run API Regression Tests
  run: |
    npm run docker:up
    npm run test:regression
```

### Expected Exit Codes
- `0`: All tests passed
- `1`: One or more tests failed

## Next Steps

1. **Run your first test**:
   ```bash
   npm run test:regression:auth
   ```

2. **Check results**:
   - Green checkmarks = passing tests
   - Red X = failing tests
   - Review error messages for failures

3. **Fix issues**:
   - Check server logs
   - Verify database state
   - Review API responses

4. **Run all tests**:
   ```bash
   npm run test:regression
   ```

5. **Integrate into workflow**:
   - Add to pre-commit hooks
   - Run in CI/CD pipeline
   - Monitor test results

## Documentation

- **Full Guide**: `API_REGRESSION_TESTS.md`
- **Summary**: `REGRESSION_TEST_SUMMARY.md`
- **This Guide**: `QUICK_START_TESTING.md`

## Support

If tests fail:
1. Check prerequisites (server, database, Redis)
2. Review error messages
3. Check API_REGRESSION_TESTS.md for detailed info
4. Verify environment variables
5. Check server logs for API errors

## Success!

If all tests pass, you'll see:
```
✓ All regression tests passed!
✓ 100+ tests covering all endpoints
✓ Tenant isolation verified
✓ Authentication flows working
✓ CRUD operations functional
✓ Error handling correct
```

Your API is working correctly! 🎉
