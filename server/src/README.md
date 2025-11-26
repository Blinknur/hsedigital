# Modular Architecture

This directory contains the modular architecture implementation for the HSE Digital backend.

## Quick Start

### Using Modular Routes

```javascript
// Option 1: Import from modules (recommended for new code)
import { authRoutes } from './src/modules/auth/index.js';
import { auditRoutes } from './src/modules/audit/index.js';
import { incidentRoutes } from './src/modules/incident/index.js';

app.use('/api/auth', authRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/incidents', incidentRoutes);

// Option 2: Continue using existing routes (during transition)
import authRoutes from './routes/auth.js';
import auditsRouter from './routes/audits.js';

app.use('/api/auth', authRoutes);
app.use('/api/audits', auditsRouter);
```

### Accessing Services

```javascript
// Import service from module
import { authService } from './src/modules/auth/index.js';

// Use service methods
const hashedPassword = await authService.hashPassword('mypassword');
const tokens = authService.generateTokens(user);
```

## Directory Structure

```
server/src/
├── modules/                    # Feature modules (domain-driven)
│   ├── auth/                  # Authentication & authorization
│   │   ├── routes/            # HTTP routes
│   │   ├── services/          # Business logic
│   │   ├── controllers/       # Request handlers
│   │   ├── validators/        # Input validation
│   │   └── index.js          # Module exports
│   │
│   ├── audit/                 # Safety audits
│   ├── incident/              # Incident reporting
│   ├── permit/                # Work permits
│   ├── billing/               # Billing & subscriptions
│   ├── reporting/             # Report generation
│   ├── tenant/                # Multi-tenant management
│   │
│   └── shared/                # Shared utilities
│       ├── middleware/        # Reusable middleware
│       ├── utils/            # Helper functions
│       └── config/           # Configuration
│
├── core/                      # Core infrastructure
│   ├── database/             # Database client
│   ├── monitoring/           # Logging, metrics, tracing
│   └── jobs/                 # Background jobs
│
├── app.js                    # Express app (modular)
├── MODULE_ARCHITECTURE.md    # Architecture documentation
├── DEPENDENCY_RULES.md       # Dependency guidelines
└── README.md                 # This file
```

## Module Structure

Each feature module follows this pattern:

```
module-name/
├── routes/
│   └── index.js              # Route definitions
├── services/
│   └── *.service.js          # Business logic
├── controllers/
│   └── *.controller.js       # Request handlers
├── validators/
│   └── *.validator.js        # Zod schemas
└── index.js                  # Public API
```

## Creating a New Module

1. **Create directory structure:**
```bash
mkdir -p server/src/modules/mymodule/{routes,services,controllers,validators}
```

2. **Create validator** (`validators/mymodule.validator.js`):
```javascript
import { z } from 'zod';

export const myModuleValidator = {
  create: z.object({
    name: z.string().min(1),
    description: z.string()
  }),
  
  update: z.object({
    name: z.string().optional(),
    description: z.string().optional()
  })
};
```

3. **Create service** (`services/mymodule.service.js`):
```javascript
export const myModuleService = {
  async create(prisma, tenantId, data) {
    return await prisma.myModel.create({
      data: { ...data, organizationId: tenantId }
    });
  },
  
  async list(prisma, tenantId) {
    return await prisma.myModel.findMany({
      where: { organizationId: tenantId }
    });
  }
};
```

4. **Create controller** (`controllers/mymodule.controller.js`):
```javascript
import { myModuleService } from '../services/mymodule.service.js';

export const myModuleController = {
  async create(req, res, next) {
    try {
      const result = await myModuleService.create(
        req.prisma,
        req.tenantId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
  
  async list(req, res, next) {
    try {
      const results = await myModuleService.list(
        req.prisma,
        req.tenantId
      );
      res.json(results);
    } catch (error) {
      next(error);
    }
  }
};
```

5. **Create routes** (`routes/index.js`):
```javascript
import express from 'express';
import { myModuleController } from '../controllers/mymodule.controller.js';
import { myModuleValidator } from '../validators/mymodule.validator.js';
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { validateRequest } from '../../shared/middleware/validation.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';

const router = express.Router();

router.use(prismaMiddleware);
router.use(authenticateToken);
router.use(tenantContext);

router.get('/', myModuleController.list);
router.post('/', validateRequest(myModuleValidator.create), myModuleController.create);

export default router;
```

6. **Create index** (`index.js`):
```javascript
export { default as myModuleRoutes } from './routes/index.js';
export { myModuleService } from './services/mymodule.service.js';
export { myModuleController } from './controllers/mymodule.controller.js';
export { myModuleValidator } from './validators/mymodule.validator.js';
```

7. **Register in app:**
```javascript
import { myModuleRoutes } from './src/modules/mymodule/index.js';
app.use('/api/mymodule', myModuleRoutes);
```

## Available Shared Utilities

### Middleware
```javascript
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { requirePermission, requireRole } from '../../shared/middleware/rbac.js';
import { validateRequest, validateParams, validateQuery } from '../../shared/middleware/validation.js';
import { tenantCacheMiddleware, invalidateTenantCacheMiddleware } from '../../shared/middleware/caching.js';
import { requireQuota, trackUsage } from '../../shared/middleware/quota.js';
import { auditLog, captureOriginalEntity } from '../../shared/middleware/auditLog.js';
import { authRateLimit, userRateLimit, tenantRateLimit } from '../../shared/middleware/rateLimitRedis.js';
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

## Migration Strategy

The codebase is in transition from monolithic to modular architecture:

### Phase 1: New Code (✅ Active)
- All **new features** should use the modular structure
- Create modules in `server/src/modules/`
- Follow the module pattern

### Phase 2: Gradual Migration (🔄 Ongoing)
- Migrate existing features **as needed**
- Start with high-value modules (auth, audit, incident)
- Keep backward compatibility during transition

### Phase 3: Complete Migration (⏳ Future)
- All code moved to modules
- Remove old routes directory
- Update all imports

### Using Both Systems

During transition, you can use both:

```javascript
// New modular approach
import { auditRoutes } from './src/modules/audit/index.js';
app.use('/api/audits', auditRoutes);

// Old approach (still works)
import incidentsRouter from './routes/incidents.js';
app.use('/api/incidents', incidentsRouter);
```

## Testing

Test modules in isolation:

```javascript
// test/modules/audit/audit.service.test.js
import { auditService } from '../../../src/modules/audit/index.js';
import { createMockPrisma } from '../../mocks/prisma.js';

describe('AuditService', () => {
  const mockPrisma = createMockPrisma();
  
  test('creates audit', async () => {
    const result = await auditService.createAudit(
      mockPrisma,
      'tenant-1',
      { stationId: 'station-1', auditorId: 'user-1' }
    );
    
    expect(result).toBeDefined();
  });
});
```

## Best Practices

1. **Keep controllers thin** - Business logic belongs in services
2. **Validate early** - Use validators on all inputs
3. **Single responsibility** - One service per domain concept
4. **Dependency injection** - Pass dependencies explicitly
5. **Error handling** - Use try/catch in controllers, throw in services
6. **Types** - Use JSDoc for better IDE support

## Documentation

- [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md) - Detailed architecture guide
- [DEPENDENCY_RULES.md](./DEPENDENCY_RULES.md) - Dependency guidelines and rules

## Questions?

- Check existing modules for examples
- Review documentation files
- Follow the patterns established in auth and audit modules
