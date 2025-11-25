# Prisma Migration Guide

## Quick Start

### 1. Generate Prisma Client
After any schema changes, regenerate the client:
```bash
npm run prisma:generate
```

### 2. Apply Migrations

#### Development (with Prisma Migrate)
```bash
# Create and apply new migration
npm run prisma:migrate

# Apply existing migrations
npx prisma migrate dev
```

#### Production
```bash
# Apply migrations without interactive prompts
npm run prisma:migrate:deploy
```

#### Custom Migration Runner (Manual Control)
```bash
# Apply all custom migrations
npm run prisma:migrate:custom

# Rollback all custom migrations
npm run prisma:rollback:custom

# Or use the shell script
./prisma/apply-migrations.sh up
./prisma/apply-migrations.sh down
```

### 3. Seed Database
```bash
# Full seed with mock data
npm run seed

# RBAC system only
npm run seed:rbac
```

### 4. Test Migrations
```bash
npm run test:migrations
```

## Migration Files

### Structure
```
prisma/migrations/
├── migration_lock.toml
├── 20240101000000_add_user_auth_fields/
│   ├── migration.sql  (up migration)
│   └── down.sql       (rollback)
├── 20240101000001_add_organization_stripe_fields/
│   ├── migration.sql
│   └── down.sql
└── 20240101000002_add_tenant_indexes/
    ├── migration.sql
    └── down.sql
```

## Available Migrations

### Migration 1: User Authentication Fields
**File:** `20240101000000_add_user_auth_fields`
**Purpose:** Add email verification and password reset functionality

**Fields Added:**
- `emailVerificationToken` - Unique token for email verification
- `isEmailVerified` - Boolean flag (default: false)
- `passwordResetToken` - Unique token for password reset
- `passwordResetTokenExpiry` - Token expiration timestamp
- `refreshTokens` - Array of active JWT refresh tokens

**Apply:**
```sql
ALTER TABLE "users" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetTokenExpiry" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "refreshTokens" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");
```

**Rollback:**
```sql
DROP INDEX "users_passwordResetToken_key";
DROP INDEX "users_emailVerificationToken_key";
ALTER TABLE "users" DROP COLUMN "refreshTokens";
ALTER TABLE "users" DROP COLUMN "passwordResetTokenExpiry";
ALTER TABLE "users" DROP COLUMN "passwordResetToken";
ALTER TABLE "users" DROP COLUMN "isEmailVerified";
ALTER TABLE "users" DROP COLUMN "emailVerificationToken";
```

---

### Migration 2: Organization Stripe Fields
**File:** `20240101000001_add_organization_stripe_fields`
**Purpose:** Enable Stripe billing integration

**Fields Added:**
- `stripeCustomerId` - Stripe customer identifier (unique)
- `stripeSubscriptionId` - Stripe subscription identifier (unique)

**Apply:**
```sql
ALTER TABLE "organizations" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "organizations" ADD COLUMN "stripeSubscriptionId" TEXT;

CREATE UNIQUE INDEX "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");
CREATE UNIQUE INDEX "organizations_stripeSubscriptionId_key" ON "organizations"("stripeSubscriptionId");
```

**Rollback:**
```sql
DROP INDEX "organizations_stripeSubscriptionId_key";
DROP INDEX "organizations_stripeCustomerId_key";
ALTER TABLE "organizations" DROP COLUMN "stripeSubscriptionId";
ALTER TABLE "organizations" DROP COLUMN "stripeCustomerId";
```

---

### Migration 3: Tenant-Scoped Indexes
**File:** `20240101000002_add_tenant_indexes`
**Purpose:** Optimize multi-tenant queries with indexes

**Indexes Added:**
- `users.organizationId`
- `stations.organizationId`
- `contractors.organizationId`
- `audits.organizationId`, `audits.stationId`, `audits.auditorId`
- `form_definitions.organizationId`
- `incidents.organizationId`, `incidents.stationId`, `incidents.reporterId`
- `work_permits.organizationId`, `work_permits.stationId`, `work_permits.requestedBy`

**Apply:**
```sql
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "stations_organizationId_idx" ON "stations"("organizationId");
CREATE INDEX "contractors_organizationId_idx" ON "contractors"("organizationId");
CREATE INDEX "audits_organizationId_idx" ON "audits"("organizationId");
CREATE INDEX "audits_stationId_idx" ON "audits"("stationId");
CREATE INDEX "audits_auditorId_idx" ON "audits"("auditorId");
CREATE INDEX "form_definitions_organizationId_idx" ON "form_definitions"("organizationId");
CREATE INDEX "incidents_organizationId_idx" ON "incidents"("organizationId");
CREATE INDEX "incidents_stationId_idx" ON "incidents"("stationId");
CREATE INDEX "incidents_reporterId_idx" ON "incidents"("reporterId");
CREATE INDEX "work_permits_organizationId_idx" ON "work_permits"("organizationId");
CREATE INDEX "work_permits_stationId_idx" ON "work_permits"("stationId");
CREATE INDEX "work_permits_requestedBy_idx" ON "work_permits"("requestedBy");
```

**Rollback:**
```sql
DROP INDEX "work_permits_requestedBy_idx";
DROP INDEX "work_permits_stationId_idx";
DROP INDEX "work_permits_organizationId_idx";
DROP INDEX "incidents_reporterId_idx";
DROP INDEX "incidents_stationId_idx";
DROP INDEX "incidents_organizationId_idx";
DROP INDEX "form_definitions_organizationId_idx";
DROP INDEX "audits_auditorId_idx";
DROP INDEX "audits_stationId_idx";
DROP INDEX "audits_organizationId_idx";
DROP INDEX "contractors_organizationId_idx";
DROP INDEX "stations_organizationId_idx";
DROP INDEX "users_organizationId_idx";
```

## Common Workflows

### Creating a New Migration

1. **Modify schema.prisma**
   ```prisma
   model User {
     // ... existing fields
     newField String?
   }
   ```

2. **Create migration**
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

3. **Create rollback script**
   ```bash
   # Manually create down.sql in migration folder
   echo "ALTER TABLE \"users\" DROP COLUMN \"newField\";" > \
     prisma/migrations/MIGRATION_FOLDER/down.sql
   ```

4. **Test migration**
   ```bash
   npm run test:migrations
   ```

### Rolling Back Migrations

#### Using Prisma Migrate
```bash
# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

#### Using Custom Rollback
```bash
# Rollback custom migrations
npm run prisma:rollback:custom

# Or manually
psql $DATABASE_URL -f prisma/migrations/MIGRATION_NAME/down.sql
```

### Checking Migration Status
```bash
npx prisma migrate status
```

### Resolving Migration Issues

#### Migration already applied
```bash
npx prisma migrate resolve --applied "MIGRATION_NAME"
```

#### Schema drift detected
```bash
# Option 1: Reset and reapply
npx prisma migrate reset

# Option 2: Create new migration
npx prisma migrate dev --name fix_schema_drift
```

## Production Deployment

### Pre-deployment Checklist
- [ ] Backup database
- [ ] Test migrations in staging
- [ ] Review all migration SQL files
- [ ] Check for breaking changes
- [ ] Coordinate with team on downtime

### Deployment Steps

1. **Backup database**
   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Apply migrations**
   ```bash
   npm run prisma:migrate:deploy
   ```

3. **Verify migration**
   ```bash
   npx prisma migrate status
   ```

4. **Run post-migration tests**
   ```bash
   npm run test:migrations
   ```

### Rollback in Production

1. **Restore from backup**
   ```bash
   psql $DATABASE_URL < backup-TIMESTAMP.sql
   ```

2. **Or use rollback scripts**
   ```bash
   npm run prisma:rollback:custom
   ```

## Best Practices

1. **Always backup before migrations**
2. **Test in development first**
3. **Keep rollback scripts updated**
4. **Use transactions** (Prisma does this automatically)
5. **Version control all migrations**
6. **Document breaking changes**
7. **Coordinate with team**
8. **Monitor post-migration**

## Troubleshooting

### "Migration already applied"
```bash
npx prisma migrate resolve --applied "MIGRATION_NAME"
```

### "Schema drift detected"
Your database schema doesn't match schema.prisma:
```bash
npx prisma db pull  # Pull current DB schema
npx prisma migrate dev --name sync_schema
```

### "Cannot connect to database"
Check your DATABASE_URL in .env file

### "Migration failed"
1. Check the error message
2. Rollback using down.sql
3. Fix the issue
4. Re-apply migration

## Additional Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema without migrations (dev only)
npm run prisma:push

# Open Prisma Studio
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

## Support

For more information, see:
- [prisma/README.md](./prisma/README.md)
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
