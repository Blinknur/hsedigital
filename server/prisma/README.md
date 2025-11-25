# Prisma Migrations & Seed Documentation

## Overview

This directory contains the Prisma schema, migrations, and seed scripts for the HSE.Digital backend.

## Structure

```
prisma/
├── schema.prisma                 # Main Prisma schema definition
├── migrations/                   # Database migration files
│   ├── migration_lock.toml      # Migration provider lock
│   ├── 20240101000000_add_user_auth_fields/
│   │   ├── migration.sql        # Up migration
│   │   └── down.sql             # Down migration (rollback)
│   ├── 20240101000001_add_organization_stripe_fields/
│   │   ├── migration.sql
│   │   └── down.sql
│   └── 20240101000002_add_tenant_indexes/
│       ├── migration.sql
│       └── down.sql
├── seed.js                       # Original seed with mock data
└── seed-comprehensive.js         # Comprehensive RBAC-only seed
```

## Migrations

### Available Migrations

#### 1. `20240101000000_add_user_auth_fields`
Adds authentication and email verification fields to the User model:
- `emailVerificationToken` - Token for email verification
- `isEmailVerified` - Boolean flag for email verification status
- `passwordResetToken` - Token for password reset flow
- `passwordResetTokenExpiry` - Expiry timestamp for reset token
- `refreshTokens` - Array of active refresh tokens

**Apply:** Adds fields with unique constraints
**Rollback:** Removes all added fields and constraints

#### 2. `20240101000001_add_organization_stripe_fields`
Adds Stripe integration fields to the Organization model:
- `stripeCustomerId` - Stripe customer ID
- `stripeSubscriptionId` - Stripe subscription ID

**Apply:** Adds fields with unique constraints
**Rollback:** Removes Stripe-related fields

#### 3. `20240101000002_add_tenant_indexes`
Adds performance indexes for tenant-scoped queries:
- Indexes on `organizationId` for: Users, Stations, Contractors, Audits, FormDefinitions, Incidents, WorkPermits
- Additional foreign key indexes for: stationId, auditorId, reporterId, requestedBy

**Apply:** Creates all tenant-scoped indexes
**Rollback:** Drops all created indexes

### Running Migrations

```bash
# Generate Prisma Client after schema changes
npm run prisma:generate

# Push schema changes to database (development)
npm run prisma:push

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database and apply all migrations
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

### Manual Migration Rollback

To rollback a migration manually:

```bash
# Run the down.sql file for the migration you want to rollback
psql $DATABASE_URL -f server/prisma/migrations/MIGRATION_FOLDER/down.sql
```

## Seed Scripts

### seed.js (Original)
Contains comprehensive mock data including:
- Organizations (3)
- Users (9) with different roles
- Stations (6) across different regions
- Contractors (3)
- Form definitions (1)
- RBAC roles, permissions, and mappings

**Run:**
```bash
npm run seed
# or
node server/prisma/seed.js
```

### seed-comprehensive.js (RBAC Only)
Focuses on comprehensive RBAC system setup with:
- 6 system roles (Admin, Compliance Manager, Station Manager, Contractor, Auditor, Viewer)
- 36 granular permissions across all resources
- Complete role-permission mappings

**Run:**
```bash
node server/prisma/seed-comprehensive.js
```

### Seed Data Summary

#### Roles
- **Admin**: Full system access
- **Compliance Manager**: Audit management and oversight
- **Station Manager**: Station operations and incidents
- **Contractor**: View work and submit reports
- **Auditor**: Conduct audits and generate reports
- **Viewer**: Read-only access

#### Permissions (36 total)
- Organizations: read, write, delete, manage
- Users: read, write, delete, manage-roles
- Stations: read, write, delete
- Audits: read, write, delete, conduct, approve
- Incidents: read, write, delete, resolve
- Contractors: read, write, delete
- Forms: read, write, delete, submit
- Work Permits: read, write, delete, approve
- Reports: read, generate, export
- Analytics: read, advanced

## Schema Features

### Multi-tenancy
All tenant-scoped models include:
- `organizationId` foreign key
- Index on `organizationId` for query performance
- Proper cascade delete behavior

### Authentication
User model includes:
- Email verification workflow
- Password reset workflow
- Refresh token management
- Email uniqueness constraints

### Stripe Integration
Organization model includes:
- Customer ID for billing
- Subscription ID for plan management
- Unique constraints to prevent duplicates

### RBAC System
- Flexible role-based access control
- System vs. custom roles
- Granular resource-action permissions
- Many-to-many role-permission relationships
- Many-to-many user-role assignments

## Best Practices

1. **Always backup before migrations**: Create database backup before applying migrations in production
2. **Test migrations locally**: Run migrations in development environment first
3. **Use transactions**: Prisma migrations are transactional by default
4. **Version control**: All migration files are tracked in Git
5. **Review generated SQL**: Check migration.sql before applying
6. **Keep rollback scripts**: Always maintain down.sql for each migration
7. **Document changes**: Update this README when adding new migrations

## Troubleshooting

### Migration conflicts
```bash
# Mark migration as applied without running
npx prisma migrate resolve --applied "MIGRATION_NAME"

# Roll back and reapply
npx prisma migrate reset
```

### Schema drift
```bash
# Check for schema drift
npx prisma migrate status

# Reset and reapply all migrations
npx prisma migrate reset
```

### Seed errors
```bash
# Clear and reseed
npx prisma migrate reset --skip-seed
npm run seed
```

## Environment Variables

Required environment variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

## Additional Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
