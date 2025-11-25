# Row-Level Security (RLS) Architecture

## Overview

This document describes the PostgreSQL Row-Level Security (RLS) implementation for the HSE.Digital platform. RLS provides database-level tenant isolation, ensuring that queries are automatically filtered by `organizationId` at the database layer, adding an additional security boundary beyond application-level checks.

## Architecture Components

### 1. Database Roles

#### Application Role (`hse_app_role`)

**Purpose:** Primary role used by the application to connect to the database.

**Permissions:**
- `LOGIN`: Can authenticate to the database
- `CONNECT ON DATABASE`: Can connect to `hse_platform` database
- `USAGE ON SCHEMA public`: Can use the public schema
- `SELECT, INSERT, UPDATE, DELETE ON ALL TABLES`: Standard CRUD operations
- `USAGE, SELECT ON ALL SEQUENCES`: Can use auto-increment sequences

**Security:**
- All queries executed by this role are subject to RLS policies
- Cannot see data outside the current organization context
- Cannot bypass RLS policies

**Connection String:**
```
postgresql://hse_app_role:password@host:5432/hse_platform
```

#### Admin Role (`hse_admin_role`)

**Purpose:** Administrative role for system maintenance, debugging, and cross-tenant operations.

**Permissions:**
- All permissions of `hse_app_role`
- `BYPASSRLS`: Can bypass all RLS policies

**Security:**
- Should only be used for administrative operations
- Not subject to RLS filtering
- Can see and modify data across all organizations

**Use Cases:**
- Database migrations
- System-wide reports
- Data exports
- Customer support operations (with proper authorization)
- Debugging production issues

### 2. Session Context

#### Session Variable: `app.current_organization_id`

RLS policies use a PostgreSQL session variable to determine the current tenant context.

**Setting the Context:**
```sql
SET LOCAL app.current_organization_id = 'org-123';
```

**Important:**
- Use `SET LOCAL` (not `SET`) to scope the variable to the current transaction
- Must be set at the beginning of each transaction/request
- Variable persists only for the duration of the transaction

#### Helper Function: `get_current_organization_id()`

```sql
CREATE FUNCTION get_current_organization_id()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_organization_id', TRUE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Usage in Policies:**
- Returns the current organization ID from the session variable
- Returns `NULL` if variable is not set
- Used in all RLS policy `USING` and `WITH CHECK` clauses

### 3. RLS Policies

#### Policy Structure

Each tenant-scoped table has four policies:

1. **SELECT Policy**: Controls which rows can be read
2. **INSERT Policy**: Controls which rows can be created
3. **UPDATE Policy**: Controls which rows can be modified
4. **DELETE Policy**: Controls which rows can be deleted

#### Policy Naming Convention

```
{table}_tenant_isolation_{operation}
```

Examples:
- `stations_tenant_isolation_select`
- `audits_tenant_isolation_insert`
- `contractors_tenant_isolation_update`

#### Policy Logic

**Standard Tables (stations, audits, incidents, contractors, form_definitions):**

```sql
CREATE POLICY {table}_tenant_isolation_select ON "{table}"
    FOR SELECT
    TO hse_app_role
    USING ("organizationId" = get_current_organization_id());
```

**Users Table (special case for global admins):**

```sql
CREATE POLICY users_tenant_isolation_select ON "users"
    FOR SELECT
    TO hse_app_role
    USING (
        "organizationId" IS NULL -- Global users
        OR "organizationId" = get_current_organization_id()
    );
```

### 4. Tenant-Scoped Tables

The following tables have RLS enabled:

| Table | organizationId | Notes |
|-------|---------------|-------|
| `users` | Nullable | NULL for global admins |
| `stations` | Required | Always scoped to org |
| `audits` | Required | Always scoped to org |
| `incidents` | Required | Always scoped to org |
| `contractors` | Required | Always scoped to org |
| `form_definitions` | Required | Always scoped to org |

### 5. Non-Tenant Tables

The following tables do NOT have RLS enabled (system-wide data):

- `organizations` - Organization master data
- `roles` - System roles (RBAC)
- `permissions` - System permissions (RBAC)
- `role_permissions` - Role-permission mappings
- `user_roles` - User-role assignments

**Security Note:** Access to these tables should be controlled at the application level.

### 6. Performance Optimization

#### Indexes

All tenant-scoped tables have indexes on `organizationId`:

```sql
CREATE INDEX idx_users_organization_id ON "users"("organizationId");
CREATE INDEX idx_stations_organization_id ON "stations"("organizationId");
CREATE INDEX idx_audits_organization_id ON "audits"("organizationId");
CREATE INDEX idx_incidents_organization_id ON "incidents"("organizationId");
CREATE INDEX idx_contractors_organization_id ON "contractors"("organizationId");
CREATE INDEX idx_form_definitions_organization_id ON "form_definitions"("organizationId");
```

**Benefits:**
- Fast filtering by `organizationId`
- Efficient RLS policy evaluation
- Minimal performance overhead

#### Query Planner

PostgreSQL's query planner:
- Incorporates RLS policies into query plans
- Uses indexes on `organizationId` for filtering
- Adds minimal overhead (typically < 5%)

## Application Integration

### Node.js/Prisma Integration

#### Option 1: Transaction-Scoped Context

```javascript
async function withOrgContext(organizationId, callback) {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
    return await callback(tx);
  });
}

// Usage
app.get('/api/stations', async (req, res) => {
  const stations = await withOrgContext(req.user.organizationId, async (tx) => {
    return await tx.station.findMany();
  });
  res.json(stations);
});
```

#### Option 2: Express Middleware

```javascript
export const rlsContext = async (req, res, next) => {
  const organizationId = req.user?.organizationId;
  
  if (!organizationId) {
    return res.status(403).json({ error: 'No organization context' });
  }
  
  req.db = {
    transaction: async (callback) => {
      return await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
        return await callback(tx);
      });
    }
  };
  
  next();
};
```

## Security Considerations

### 1. Defense in Depth

RLS provides an additional security layer but should not be the only defense:

- **Application Layer**: JWT-based authentication, middleware checks
- **Database Layer**: RLS policies (this document)
- **Network Layer**: VPC, security groups, firewall rules

### 2. Session Variable Security

**Threats:**
- SQL injection could set `app.current_organization_id`
- Compromised connection could change organization context

**Mitigations:**
- Always use parameterized queries
- Validate `organizationId` at application layer
- Use `SET LOCAL` (transaction-scoped) not `SET` (session-scoped)
- Monitor for suspicious organization context changes

### 3. Admin Role Security

**Best Practices:**
- Store `hse_admin_role` credentials in secure vault
- Use admin role only for specific operations
- Log all admin role usage
- Require additional authentication for admin operations
- Rotate admin credentials regularly

## Testing

### Running RLS Tests

```bash
# Apply RLS migration
psql -U postgres -d hse_platform -f prisma/migrations/001_rls_policies.sql

# Run test suite
psql -U postgres -d hse_platform -f prisma/migrations/test_rls.sql
```

### Test Scenarios

#### Test 1: Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

#### Test 2: Verify Tenant Isolation
```sql
SET ROLE hse_app_role;
SET LOCAL app.current_organization_id = 'org-1';
SELECT * FROM stations;
```

#### Test 3: Verify Admin Bypass
```sql
SET ROLE hse_admin_role;
SELECT * FROM stations; -- Should see ALL stations
```

## Migration Guide

### Step 1: Apply RLS Migration

```bash
psql -U postgres -d hse_platform -f prisma/migrations/001_rls_policies.sql
```

### Step 2: Update Application Configuration

**Environment Variables:**
```bash
DATABASE_URL="postgresql://hse_app_role:secure_password@localhost:5432/hse_platform"
DATABASE_URL_ADMIN="postgresql://hse_admin_role:admin_password@localhost:5432/hse_platform"
```

### Step 3: Test RLS Policies

```bash
psql -U postgres -d hse_platform -f prisma/migrations/test_rls.sql
```

## Troubleshooting

### No Rows Returned

**Problem:** Queries return empty results when RLS is enabled.

**Solution:** Ensure `app.current_organization_id` is set:
```javascript
await prisma.$executeRaw`SET LOCAL app.current_organization_id = ${organizationId}`;
```

### Permission Denied

**Problem:** `permission denied for table` error.

**Solution:** Grant permissions to `hse_app_role`:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hse_app_role;
```

### Admin Cannot See Data

**Problem:** Admin role still filtered by RLS.

**Solution:** Ensure `BYPASSRLS` is set:
```sql
ALTER ROLE hse_admin_role BYPASSRLS;
```
