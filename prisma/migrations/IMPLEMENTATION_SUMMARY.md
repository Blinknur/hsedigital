# PostgreSQL Row-Level Security (RLS) Implementation Summary

## Overview

This document summarizes the PostgreSQL Row-Level Security (RLS) implementation for the HSE.Digital platform. RLS provides database-level tenant isolation, ensuring that all queries are automatically filtered by `organizationId` at the PostgreSQL layer.

## What Was Implemented

### 1. SQL Migration File (`001_rls_policies.sql`)

**Location:** `prisma/migrations/001_rls_policies.sql`

**Components:**
- ✅ Database role creation (`hse_app_role`, `hse_admin_role`)
- ✅ Session context function (`get_current_organization_id()`)
- ✅ RLS enablement on all tenant-scoped tables
- ✅ RLS policies for SELECT, INSERT, UPDATE, DELETE operations
- ✅ Performance indexes on `organizationId` columns
- ✅ Proper grants for application and admin roles

**Tables with RLS:**
- `users` (nullable organizationId for global admins)
- `stations`
- `audits`
- `incidents`
- `contractors`
- `form_definitions`

### 2. Database Roles

#### Application Role (`hse_app_role`)
- **Purpose:** Used by the application for normal operations
- **Security:** Subject to RLS policies
- **Permissions:** SELECT, INSERT, UPDATE, DELETE on all tables
- **Connection:** `postgresql://hse_app_role:password@host:5432/hse_platform`

#### Admin Role (`hse_admin_role`)
- **Purpose:** Used for administrative operations and debugging
- **Security:** Has `BYPASSRLS` privilege
- **Permissions:** Full access across all organizations
- **Connection:** `postgresql://hse_admin_role:admin_password@host:5432/hse_platform`

### 3. RLS Policies

Each tenant-scoped table has 4 policies:

1. **SELECT Policy:** Filters rows by `organizationId`
2. **INSERT Policy:** Validates `organizationId` matches context
3. **UPDATE Policy:** Ensures updates only affect own organization's data
4. **DELETE Policy:** Prevents deletion of other organizations' data

**Policy Logic:**
```sql
-- Example for stations table
CREATE POLICY stations_tenant_isolation_select ON "stations"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());
```

### 4. Application Integration

**Middleware:** `server/middleware/rlsContext.js`

**Features:**
- `rlsContext` - Express middleware to set RLS context
- `withRlsContext()` - Helper function for service layer
- `withAdminAccess()` - Helper function for admin operations

**Usage:**
```javascript
app.get('/api/stations', authenticateToken, rlsContext, async (req, res) => {
    const stations = await req.db.transaction(async (tx) => {
        return await tx.station.findMany();
    });
    res.json(stations);
});
```

### 5. Testing Infrastructure

**Test Suite:** `server/test-rls-implementation.js`

**Tests:**
- ✅ Verify RLS is enabled on correct tables
- ✅ Test tenant isolation (org can only see own data)
- ✅ Test cross-tenant blocking (cannot access other org's data)
- ✅ Test queries without context (return empty results)
- ✅ Test update/delete restrictions
- ✅ Test helper function
- ✅ Verify performance indexes exist

**SQL Test Suite:** `prisma/migrations/test_rls.sql`

Comprehensive SQL-based tests for direct database verification.

### 6. Documentation

**Created:**
- ✅ `docs/RLS_ARCHITECTURE.md` - Complete RLS architecture documentation
- ✅ `prisma/migrations/README.md` - Migration guide and troubleshooting
- ✅ `prisma/migrations/IMPLEMENTATION_SUMMARY.md` - This file

**Updated:**
- ✅ `README.md` - Added RLS to security section
- ✅ `server/package.json` - Added npm scripts for RLS

### 7. Deployment Scripts

**Apply Script:** `prisma/migrations/apply_rls.sh`

Bash script to:
- ✅ Apply RLS migration
- ✅ Verify database connection
- ✅ Verify RLS enablement
- ✅ Verify roles creation
- ✅ Provide next steps

**Usage:**
```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/hse_platform"
./prisma/migrations/apply_rls.sh
```

## Admin Bypass Implementation

### Use Cases for Admin Bypass

1. **System-wide Reports:** Aggregate data across all organizations
2. **Customer Support:** View specific customer data for troubleshooting
3. **Data Exports:** Export data for specific organizations
4. **Migrations:** Perform database migrations
5. **Auditing:** Review system-wide activity

### How to Use Admin Bypass

```javascript
import { withAdminAccess } from './middleware/rlsContext.js';

// Admin route that sees all organizations
app.get('/api/admin/all-stations', authenticateToken, requireAdmin, async (req, res) => {
    const allStations = await withAdminAccess(async (adminPrisma) => {
        return await adminPrisma.station.findMany({
            include: {
                organization: { select: { name: true } }
            }
        });
    });
    res.json(allStations);
});
```

### Security Considerations

**Admin Role Security:**
- Store `hse_admin_role` credentials in secure vault (AWS Secrets Manager, etc.)
- Rotate credentials regularly
- Log all admin role usage
- Require additional authentication for admin operations
- Use separate connection for admin operations

## How to Deploy

### Step 1: Prepare Database

```bash
# Export database connection string
export DATABASE_URL="postgresql://postgres:your_password@host:5432/hse_platform"
```

### Step 2: Apply RLS Migration

```bash
# Using the apply script (recommended)
cd prisma/migrations
./apply_rls.sh

# Or manually
psql $DATABASE_URL -f prisma/migrations/001_rls_policies.sql
```

### Step 3: Update Application Configuration

**Environment Variables:**

```bash
# Application connection (uses hse_app_role)
DATABASE_URL="postgresql://hse_app_role:secure_app_password@host:5432/hse_platform"

# Admin connection (uses hse_admin_role, bypasses RLS)
DATABASE_URL_ADMIN="postgresql://hse_admin_role:secure_admin_password@host:5432/hse_platform"
```

**⚠️ IMPORTANT:** Change default passwords before production deployment:

```sql
ALTER ROLE hse_app_role WITH PASSWORD 'your_secure_app_password';
ALTER ROLE hse_admin_role WITH PASSWORD 'your_secure_admin_password';
```

### Step 4: Update Application Code

**Add RLS middleware to existing routes:**

```javascript
// Before
app.get('/api/stations', authenticateToken, async (req, res) => {
    const stations = await prisma.station.findMany({
        where: { organizationId: req.user.organizationId }
    });
    res.json(stations);
});

// After (RLS automatically filters)
import { rlsContext } from './middleware/rlsContext.js';

app.get('/api/stations', authenticateToken, rlsContext, async (req, res) => {
    const stations = await req.db.transaction(async (tx) => {
        return await tx.station.findMany(); // Auto-filtered by RLS
    });
    res.json(stations);
});
```

### Step 5: Test RLS Implementation

```bash
# Run automated test suite
cd server
npm run rls:test

# Or run SQL tests manually
psql $DATABASE_URL -f prisma/migrations/test_rls.sql
```

## Testing RLS with Direct SQL Queries

### Test 1: Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'stations', 'audits', 'incidents', 'contractors', 'form_definitions');
```

Expected: All tables should have `rowsecurity = true`

### Test 2: Test Tenant Isolation

```sql
-- Connect as hse_app_role
SET ROLE hse_app_role;

-- Set organization context
SET LOCAL app.current_organization_id = 'org-123';

-- Query stations (should only see org-123 stations)
SELECT id, name, "organizationId" FROM stations;
```

### Test 3: Test Cross-Tenant Blocking

```sql
-- Set context to org-1
SET LOCAL app.current_organization_id = 'org-1';

-- Try to insert station for org-2 (should fail)
INSERT INTO stations (id, "organizationId", name, brand, region, address, location, "createdAt", "updatedAt")
VALUES ('test', 'org-2', 'Test', 'Brand', 'Region', 'Address', '{}', NOW(), NOW());
-- Expected: Policy violation error
```

### Test 4: Test Admin Bypass

```sql
-- Connect as admin
SET ROLE hse_admin_role;

-- Query without setting context (should see all organizations)
SELECT id, name, "organizationId" FROM stations;
-- Expected: All stations across all organizations
```

## Performance Impact

### Expected Overhead

- **Query Overhead:** < 5% with proper indexes
- **Index Size:** 5-10% of table size per indexed column
- **Connection Overhead:** Negligible (session variable is lightweight)

### Monitoring Performance

```sql
-- Check if index is being used
EXPLAIN ANALYZE 
SELECT * FROM stations 
WHERE "organizationId" = 'org-123';

-- Should show "Index Scan using idx_stations_organization_id"
```

## Troubleshooting

### Issue: No rows returned after enabling RLS

**Cause:** Organization context not set

**Solution:**
```javascript
await tx.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
```

### Issue: Permission denied errors

**Cause:** App role doesn't have required permissions

**Solution:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hse_app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hse_app_role;
```

### Issue: Admin can't see all data

**Cause:** BYPASSRLS not set on admin role

**Solution:**
```sql
ALTER ROLE hse_admin_role BYPASSRLS;
```

## Files Created/Modified

### New Files

1. `prisma/migrations/001_rls_policies.sql` - Main RLS migration
2. `prisma/migrations/test_rls.sql` - SQL test suite
3. `prisma/migrations/apply_rls.sh` - Apply script
4. `prisma/migrations/README.md` - Migration documentation
5. `prisma/migrations/IMPLEMENTATION_SUMMARY.md` - This file
6. `server/middleware/rlsContext.js` - Express middleware
7. `server/test-rls-implementation.js` - Automated test suite
8. `docs/RLS_ARCHITECTURE.md` - Architecture documentation

### Modified Files

1. `README.md` - Added RLS to security section
2. `server/package.json` - Added npm scripts
3. `.gitignore` - Added test/cache entries

## NPM Scripts

```bash
# Apply RLS migration
npm run rls:apply

# Run RLS tests
npm run rls:test
```

## Next Steps

1. ✅ **Review Documentation:** Read `docs/RLS_ARCHITECTURE.md`
2. ⏳ **Apply Migration:** Run `./prisma/migrations/apply_rls.sh`
3. ⏳ **Update Environment Variables:** Set `DATABASE_URL` and `DATABASE_URL_ADMIN`
4. ⏳ **Change Default Passwords:** Update role passwords for production
5. ⏳ **Integrate Middleware:** Add `rlsContext` to existing routes
6. ⏳ **Run Tests:** Execute `npm run rls:test` to verify
7. ⏳ **Monitor Performance:** Check query execution plans
8. ⏳ **Deploy to Staging:** Test in staging environment first

## Security Best Practices

1. **Never commit database credentials** to version control
2. **Use separate credentials** for dev/staging/production
3. **Rotate admin credentials** regularly
4. **Log all admin access** for audit trail
5. **Use connection pooling** for better performance
6. **Monitor RLS violations** in application logs
7. **Regular security audits** of RLS policies

## Support & Documentation

- **RLS Architecture:** `docs/RLS_ARCHITECTURE.md`
- **Tenant Architecture:** `server/TENANT_ARCHITECTURE.md`
- **Migration Guide:** `prisma/migrations/README.md`
- **Test Suite:** `server/test-rls-implementation.js`
- **SQL Tests:** `prisma/migrations/test_rls.sql`

## Conclusion

PostgreSQL Row-Level Security has been successfully implemented for the HSE.Digital platform, providing:

✅ Database-level tenant isolation
✅ Automatic query filtering by organizationId
✅ Admin bypass for system operations
✅ Comprehensive testing infrastructure
✅ Production-ready migration scripts
✅ Complete documentation

The implementation adds an additional security boundary beyond application-level checks, significantly enhancing the platform's multi-tenant security posture.
