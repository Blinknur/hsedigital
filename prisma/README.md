# Prisma Schema Documentation

## Overview

This file documents the Prisma schema structure for the HSE.Digital application.

**Location:** Root-level Prisma schema at `prisma/schema.prisma`  
**Primary Schema:** Actual migrations and operations should use `server/prisma/schema.prisma`

## Note

This schema mirrors the one in `server/prisma/schema.prisma`. For detailed migration documentation, seed scripts, and operational guides, please refer to:

- **Migrations**: `server/prisma/README.md`
- **Migration Guide**: `server/MIGRATION_GUIDE.md`
- **Quick Start**: `server/QUICK_START.md`

## Schema Structure

### RBAC Models
- `Role` - User roles (Admin, Compliance Manager, etc.)
- `Permission` - Granular permissions (resource + action)
- `RolePermission` - Role-to-permission mappings
- `UserRole` - User-to-role assignments

### Core Models
- `Organization` - Tenant organizations
- `User` - User accounts with authentication fields
- `Station` - Fuel stations
- `Contractor` - Third-party contractors
- `Audit` - Compliance audits
- `FormDefinition` - Dynamic form templates
- `Incident` - Safety incidents

## Key Features

### Authentication Fields (User)
- Email verification workflow
- Password reset functionality
- Refresh token management
- Email uniqueness

### Stripe Integration (Organization)
- Customer ID tracking
- Subscription management
- Unique constraints

### Multi-tenancy
- All tenant-scoped models include `organizationId`
- Indexes on `organizationId` for performance
- Cascade delete behavior

### RBAC System
- Flexible role-based access control
- System vs. custom roles
- Granular resource-action permissions
- Many-to-many relationships

## For Operations

Please use the server directory for all Prisma operations:

```bash
cd server

# Generate client
npm run prisma:generate

# Apply migrations
npm run prisma:migrate

# Seed database
npm run seed
```

## See Also

- [Server Prisma README](../server/prisma/README.md) - Detailed migration docs
- [Migration Guide](../server/MIGRATION_GUIDE.md) - How to apply/rollback migrations
- [Quick Start](../server/QUICK_START.md) - Setup instructions
