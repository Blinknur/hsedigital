# PostgreSQL RLS Migrations

This directory contains SQL migrations for implementing Row-Level Security (RLS) in the HSE.Digital platform.

## Files

### `001_rls_policies.sql`
Main RLS migration that creates:
- Database roles (`hse_app_role`, `hse_admin_role`)
- Session context function (`get_current_organization_id()`)
- RLS policies for all tenant-scoped tables
- Performance indexes on `organizationId` columns

### `test_rls.sql`
Comprehensive test suite to verify:
- RLS is enabled on correct tables
- Tenant isolation works correctly
- Admin bypass functionality
- Insert/Update/Delete operations respect RLS
- Index usage for performance

### `apply_rls.sh`
Bash script to apply RLS migration and verify installation.

## Quick Start

### 1. Apply RLS Migration

**Using the script (recommended):**
```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/hse_platform"
./prisma/migrations/apply_rls.sh
```

**Manual application:**
```bash
psql $DATABASE_URL -f prisma/migrations/001_rls_policies.sql
```

### 2. Run Tests

```bash
psql $DATABASE_URL -f prisma/migrations/test_rls.sql
```

### 3. Update Application Configuration

**Environment variables:**
```bash
# Application connection (uses hse_app_role)
DATABASE_URL="postgresql://hse_app_role:app_password@localhost:5432/hse_platform"

# Admin connection (uses hse_admin_role, bypasses RLS)
DATABASE_URL_ADMIN="postgresql://hse_admin_role:admin_password@localhost:5432/hse_platform"
```

### 4. Update Application Code

**Add RLS middleware to routes:**
```javascript
import { rlsContext } from './middleware/rlsContext.js';

app.get('/api/stations', authenticateToken, rlsContext, async (req, res) => {
    const stations = await req.db.transaction(async (tx) => {
        return await tx.station.findMany();
    });
    res.json(stations);
});
```

## Important Notes

### Password Security

⚠️ **CRITICAL**: The migration creates roles with default passwords `change_me_in_production` and `change_me_in_production_admin`. 

**Before deploying to production, change these passwords:**

```sql
ALTER ROLE hse_app_role WITH PASSWORD 'your_secure_app_password';
ALTER ROLE hse_admin_role WITH PASSWORD 'your_secure_admin_password';
```

### Database Permissions

The migration must be run by a database superuser (e.g., `postgres` user) because it:
- Creates database roles
- Grants permissions
- Enables RLS on tables
- Creates policies

### Compatibility

- Requires PostgreSQL 9.5+ (RLS support)
- Compatible with Prisma 5.x
- Works with both connection pooling and direct connections

## Troubleshooting

### Issue: "permission denied for table"

**Cause:** `hse_app_role` doesn't have required permissions.

**Solution:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hse_app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hse_app_role;
```

### Issue: Queries return no results

**Cause:** Organization context not set.

**Solution:** Ensure you're setting the session variable:
```javascript
await tx.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
```

### Issue: Admin can't see all data

**Cause:** Admin role doesn't have BYPASSRLS privilege.

**Solution:**
```sql
ALTER ROLE hse_admin_role BYPASSRLS;
```

### Issue: RLS policies not working

**Cause:** RLS not enabled on tables.

**Solution:**
```sql
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stations" ENABLE ROW LEVEL SECURITY;
-- etc. for all tenant-scoped tables
```

## Architecture Documentation

For detailed RLS architecture documentation, see:
- **[RLS Architecture](../../docs/RLS_ARCHITECTURE.md)** - Complete RLS documentation
- **[Tenant Architecture](../../server/TENANT_ARCHITECTURE.md)** - Application-level tenant isolation

## Performance

### Expected Overhead
- Query overhead: < 5% with proper indexes
- Index size: ~5-10% of table size per indexed column

### Monitoring

Check RLS performance:
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE SELECT * FROM stations WHERE "organizationId" = 'org-123';

-- Verify index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'stations' 
AND indexname LIKE '%organization%';
```

## Rollback

To remove RLS (not recommended in production):

```sql
-- Disable RLS on tables
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "stations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "audits" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "incidents" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "contractors" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "form_definitions" DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS users_tenant_isolation_select ON "users";
DROP POLICY IF EXISTS users_tenant_isolation_insert ON "users";
DROP POLICY IF EXISTS users_tenant_isolation_update ON "users";
DROP POLICY IF EXISTS users_tenant_isolation_delete ON "users";
-- Repeat for all tables

-- Drop helper function
DROP FUNCTION IF EXISTS get_current_organization_id();

-- Drop roles (WARNING: will disconnect active connections)
DROP ROLE IF EXISTS hse_app_role;
DROP ROLE IF EXISTS hse_admin_role;
```
