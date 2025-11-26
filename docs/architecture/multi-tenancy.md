# Tenant Architecture Documentation

## Overview

This document describes the multi-tenant architecture implemented for the HSE.Digital platform. The system provides secure data isolation between organizations (tenants) while allowing authorized users to access only their organization's data.

## Key Components

### 1. Tenant Context Middleware

**Location:** `server/index.js` - `authenticateToken()` function

**Purpose:** Extracts `organizationId` from JWT tokens and injects it into the request context.

```javascript
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);
        
        // Extract organizationId from JWT payload
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            organizationId: decoded.organizationId || null
        };
        
        next();
    });
};
```

**How it works:**
1. Extracts JWT from Authorization header
2. Verifies token signature
3. Extracts user info including `organizationId`
4. Injects into `req.user` for downstream middleware

### 2. Tenant Context Injection

**Location:** `server/index.js` - `tenantContext()` middleware

**Purpose:** Sets tenant ID based on user role and JWT claims.

```javascript
const tenantContext = async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    // Admin users can specify tenant via x-tenant-id header
    if (user.role === 'Admin' && !user.organizationId) {
        req.tenantId = req.headers['x-tenant-id'] || null;
        return next();
    }
    
    // Regular users must have organizationId from JWT
    if (!user.organizationId) {
        return res.status(403).json({ error: 'Access Denied: No Organization Context' });
    }
    
    // Set tenant ID from JWT organizationId
    req.tenantId = user.organizationId;
    next();
};
```

**Access Patterns:**
- **Regular Users:** Automatically scoped to their `organizationId` from JWT
- **Admin Users:** Can specify any tenant via `x-tenant-id` header
- **No Organization:** Access denied unless user is Admin

### 3. Prisma Tenant Middleware

**Location:** `server/index.js` - Prisma middleware setup

**Purpose:** Automatically filters all database queries by `organizationId`.

```javascript
prisma.$use(async (params, next) => {
    const tenantModels = ['Station', 'Contractor', 'Audit', 'FormDefinition', 'Incident', 'WorkPermit'];
    
    if (!tenantModels.includes(params.model)) {
        return next(params);
    }

    const tenantId = params.args.tenantId;
    delete params.args.tenantId;

    if (!tenantId) {
        return next(params);
    }

    // Inject organizationId filter for read operations
    if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = {
            ...params.args.where,
            organizationId: tenantId
        };
    }

    if (params.action === 'findMany' || params.action === 'count') {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};
        params.args.where = {
            ...params.args.where,
            organizationId: tenantId
        };
    }

    // Inject organizationId for write operations
    if (params.action === 'create') {
        params.args.data = {
            ...params.args.data,
            organizationId: tenantId
        };
    }

    // ... (updateMany, delete, etc.)

    return next(params);
});
```

**Supported Operations:**
- `findUnique`, `findFirst` - Adds `organizationId` to WHERE clause
- `findMany`, `count` - Adds `organizationId` to WHERE clause
- `create` - Automatically sets `organizationId` in data
- `createMany` - Sets `organizationId` for all records
- `update`, `updateMany`, `delete`, `deleteMany` - Filters by `organizationId`

### 4. Tenant-Scoped Query Helper

**Location:** `server/index.js` - `withTenant()` function

**Purpose:** Provides a convenient way to create tenant-scoped Prisma clients.

```javascript
const withTenant = (prismaClient, tenantId) => {
    return new Proxy(prismaClient, {
        get(target, prop) {
            if (typeof target[prop] === 'object' && target[prop] !== null) {
                return new Proxy(target[prop], {
                    get(model, action) {
                        if (typeof model[action] === 'function') {
                            return function(args = {}) {
                                // Inject tenantId into args
                                return model[action]({ ...args, tenantId });
                            };
                        }
                        return model[action];
                    }
                });
            }
            return target[prop];
        }
    });
};
```

**Usage in Routes:**
```javascript
app.get('/api/stations', authenticateToken, tenantContext, async (req, res) => {
    const db = withTenant(prisma, req.tenantId);
    const stations = await db.station.findMany({ where: { region: 'North' } });
    // Automatically filtered by organizationId
    res.json(stations);
});
```

### 5. Tenant Provisioning Service

**Location:** `server/services/tenantProvisioning.js`

**Purpose:** Manages tenant lifecycle including creation, configuration, and deactivation.

**Key Methods:**

#### `createTenant()`
Creates a new organization and links to owner user.
```javascript
await tenantService.createTenant({
    name: 'Acme Corp',
    ownerId: 'user-123',
    subscriptionPlan: 'enterprise',
    ssoConfig: { enabled: true, domain: 'acme.com' }
});
```

#### `provisionCompleteTenant()`
Creates organization with initial users, stations, and data.
```javascript
await tenantService.provisionCompleteTenant({
    organization: { name: 'Acme Corp', subscriptionPlan: 'pro' },
    owner: { name: 'John Doe', email: 'john@acme.com', password: 'secure' },
    users: [{ name: 'Jane Smith', email: 'jane@acme.com', ... }],
    stations: [{ name: 'Station A', region: 'North', ... }]
});
```

#### `updateSubscription()`
Changes organization subscription plan.

#### `configureSso()`
Updates SSO configuration for organization.

#### `deactivateTenant()`
Soft-deletes tenant (deactivates stations, preserves data).

#### `getTenantStats()`
Returns statistics for a tenant (user count, station count, etc.).

#### `listTenants()`
Lists all organizations with optional filters.

## API Endpoints

### Tenant Management (Admin Only)

All tenant management endpoints require `Admin` role.

#### Create Tenant
```
POST /api/admin/tenants
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "New Organization",
  "ownerId": "user-123",
  "subscriptionPlan": "pro",
  "ssoConfig": { "enabled": false }
}
```

#### Provision Complete Tenant
```
POST /api/admin/tenants/provision
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "organization": { "name": "Acme Corp", "subscriptionPlan": "enterprise" },
  "owner": { "name": "John", "email": "john@acme.com", "password": "secure123" },
  "users": [...],
  "stations": [...]
}
```

#### List Tenants
```
GET /api/admin/tenants?subscriptionPlan=enterprise
Authorization: Bearer <admin-token>
```

#### Get Tenant Statistics
```
GET /api/admin/tenants/{tenantId}/stats
Authorization: Bearer <admin-token>
```

#### Update Subscription
```
PUT /api/admin/tenants/{tenantId}/subscription
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "subscriptionPlan": "enterprise"
}
```

#### Configure SSO
```
PUT /api/admin/tenants/{tenantId}/sso
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "enabled": true,
  "domain": "acme.com",
  "provider": "okta"
}
```

#### Deactivate Tenant
```
DELETE /api/admin/tenants/{tenantId}
Authorization: Bearer <admin-token>
```

## Database Schema

### Organization Model
```prisma
model Organization {
  id               String   @id @default(cuid())
  name             String
  ownerId          String
  subscriptionPlan String   @default("free")
  ssoConfig        Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  users         User[]
  stations      Station[]
  contractors   Contractor[]
  audits        Audit[]
  forms         FormDefinition[]
  incidents     Incident[]
  workPermits   WorkPermit[]
}
```

All tenant-scoped models include:
```prisma
organizationId String
organization   Organization @relation(fields: [organizationId], references: [id])
```

## Security Considerations

### 1. JWT Security
- `organizationId` stored in JWT payload
- JWTs signed with `JWT_SECRET`
- Tokens expire after 1 hour
- Refresh tokens valid for 7 days

### 2. Data Isolation
- All queries automatically filtered by `organizationId`
- Middleware prevents cross-tenant data access
- Admin users require explicit `x-tenant-id` header

### 3. Authorization Levels
- **Admin:** Can access any tenant via header
- **Compliance Manager:** Limited to own organization
- **Station Manager:** Limited to own organization + assigned stations
- **Contractor:** Limited to own organization + contractor data

### 4. Query Safety
- WHERE clauses automatically include `organizationId`
- CREATE operations automatically set `organizationId`
- UPDATE/DELETE operations filtered by `organizationId`

## Testing

Run the test suite:
```bash
cd server
node test-tenant-functionality.js
```

Tests verify:
1. JWT extraction and organizationId injection
2. Prisma middleware automatic filtering
3. Tenant data isolation (no cross-contamination)
4. Tenant provisioning service operations
5. Admin cross-tenant access patterns

## Usage Examples

### Example 1: Query Tenant-Scoped Data
```javascript
app.get('/api/audits', authenticateToken, tenantContext, async (req, res) => {
    const db = withTenant(prisma, req.tenantId);
    const audits = await db.audit.findMany({
        where: { status: 'Scheduled' },
        orderBy: { scheduledDate: 'desc' }
    });
    // Automatically filtered to user's organization
    res.json(audits);
});
```

### Example 2: Create Tenant-Scoped Record
```javascript
app.post('/api/stations', authenticateToken, tenantContext, async (req, res) => {
    const db = withTenant(prisma, req.tenantId);
    const station = await db.station.create({
        data: {
            name: req.body.name,
            region: req.body.region,
            // organizationId automatically added by middleware
        }
    });
    res.status(201).json(station);
});
```

### Example 3: Admin Cross-Tenant Query
```javascript
// Admin user accessing specific tenant
const token = generateToken({ id: 'admin-1', role: 'Admin', organizationId: null });

fetch('/api/stations', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': 'org-2'  // Specify tenant
    }
});
```

## Migration Guide

To add tenant isolation to existing routes:

1. **Add middleware:**
   ```javascript
   app.get('/api/resource', authenticateToken, tenantContext, handler);
   ```

2. **Use withTenant helper:**
   ```javascript
   const db = withTenant(prisma, req.tenantId);
   const data = await db.model.findMany();
   ```

3. **Remove manual organizationId filters:**
   ```javascript
   // Before:
   await prisma.station.findMany({ where: { organizationId: req.tenantId } });
   
   // After:
   const db = withTenant(prisma, req.tenantId);
   await db.station.findMany();  // Automatic filtering
   ```

## Performance Considerations

- **Index organizationId:** Ensure all tenant-scoped tables have indexes on `organizationId`
- **Connection Pooling:** Prisma manages connection pool automatically
- **Query Optimization:** Tenant filter adds minimal overhead (indexed column)
- **Caching:** Consider Redis for tenant-specific cache keys

## Future Enhancements

1. **Database-per-tenant:** Migrate to separate databases for larger tenants
2. **Tenant-specific Feature Flags:** Control feature access per organization
3. **Usage Tracking:** Monitor API calls and storage per tenant
4. **Audit Logging:** Track all tenant access and modifications
5. **Data Export:** Allow tenants to export their complete dataset
