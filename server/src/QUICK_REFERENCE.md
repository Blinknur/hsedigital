# Quick Reference Card - Modular Architecture

## Module Creation Checklist

### 1. Create Directory Structure
```bash
mkdir -p server/src/modules/mymodule/{routes,services,controllers,validators}
```

### 2. Create Validator (`validators/mymodule.validator.js`)
```javascript
import { z } from 'zod';

export const myModuleValidator = {
  create: z.object({ /* fields */ }),
  update: z.object({ /* fields */ }).partial(),
  list: z.object({ /* query params */ }),
  id: z.object({ id: z.string().min(1) }),
};
```

### 3. Create Service (`services/mymodule.service.js`)
```javascript
export const myModuleService = {
  async list(prisma, tenantId, filters) { /* ... */ },
  async getById(prisma, tenantId, id) { /* ... */ },
  async create(prisma, tenantId, data) { /* ... */ },
  async update(prisma, tenantId, id, data) { /* ... */ },
  async delete(prisma, tenantId, id) { /* ... */ },
};
```

### 4. Create Controller (`controllers/mymodule.controller.js`)
```javascript
import { myModuleService } from '../services/mymodule.service.js';

export const myModuleController = {
  async list(req, res, next) {
    try {
      const result = await myModuleService.list(req.prisma, req.tenantId, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
  // ... more methods
};
```

### 5. Create Routes (`routes/index.js`)
```javascript
import express from 'express';
import { myModuleController } from '../controllers/mymodule.controller.js';
import { myModuleValidator } from '../validators/mymodule.validator.js';
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { validateRequest, validateParams } from '../../shared/middleware/validation.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';

const router = express.Router();

router.use(prismaMiddleware);
router.use(authenticateToken);
router.use(tenantContext);

router.get('/', validateQuery(myModuleValidator.list), myModuleController.list);
router.post('/', validateRequest(myModuleValidator.create), myModuleController.create);

export default router;
```

### 6. Create Module Index (`index.js`)
```javascript
export { default as myModuleRoutes } from './routes/index.js';
export { myModuleService } from './services/mymodule.service.js';
export { myModuleController } from './controllers/mymodule.controller.js';
export { myModuleValidator } from './validators/mymodule.validator.js';
```

### 7. Register in App
```javascript
// server/index.js or server/src/app.js
import { myModuleRoutes } from './src/modules/mymodule/index.js';
app.use('/api/mymodule', myModuleRoutes);
```

## Available Shared Utilities

### Middleware
```javascript
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { requirePermission, requireRole } from '../../shared/middleware/rbac.js';
import { validateRequest, validateParams, validateQuery } from '../../shared/middleware/validation.js';
import { requireQuota, trackUsage } from '../../shared/middleware/quota.js';
import { authRateLimit, userRateLimit, tenantRateLimit } from '../../shared/middleware/rateLimitRedis.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../../shared/middleware/caching.js';
import { auditLog, captureOriginalEntity } from '../../shared/middleware/auditLog.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';
```

### Utilities
```javascript
import { buildCursorPagination, formatCursorResponse } from '../../shared/utils/pagination.js';
import { emailService } from '../../shared/utils/email.js';
import { notificationService } from '../../shared/utils/notification.js';
```

### Database
```javascript
import prisma from '../../core/database/client.js';
```

## Common Patterns

### Error Handling in Services
```javascript
if (!resource) {
  const error = new Error('Resource not found');
  error.statusCode = 404;
  throw error;
}
```

### Pagination
```javascript
const paginationOptions = buildCursorPagination({
  cursor: req.query.cursor,
  limit: req.query.limit || 50,
  orderBy: { createdAt: 'desc' },
  cursorField: 'id'
});

const items = await prisma.model.findMany({ where, ...paginationOptions });
const response = formatCursorResponse(items, limit, 'id');
```

### Tenant Context
```javascript
// In service
const where = { organizationId: tenantId };
if (filters.stationId) where.stationId = filters.stationId;

const items = await prisma.model.findMany({ where });
```

## Commands

```bash
# Validate module structure
node src/scripts/validate-modules.js

# Syntax check
npm run lint

# Run tests
npm test
```

## Dependency Rules

✅ **Allowed**:
- Modules → Shared utilities
- Modules → Core infrastructure
- Services → Database

❌ **Forbidden**:
- Module → Other modules (use events or shared services)
- Controllers → Database directly
- Core → Modules

## File Organization

```
module-name/
├── routes/index.js       # HTTP endpoints
├── services/*.service.js # Business logic
├── controllers/*.controller.js # Request handlers
├── validators/*.validator.js # Zod schemas
└── index.js             # Public exports
```

## Documentation

- **MODULE_ARCHITECTURE.md** - Full guide
- **DEPENDENCY_RULES.md** - Rules and patterns
- **MIGRATION_GUIDE.md** - Migration steps
- **README.md** - Quick start
- **INDEX.md** - File index

## Example Modules

Look at these for reference:
- **auth/** - Complete authentication module
- **audit/** - CRUD with pagination
- **incident/** - Event tracking
- **billing/** - Third-party integration
