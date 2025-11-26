# Migration Guide: Monolithic to Modular Architecture

This guide helps you migrate existing code from the monolithic structure to the new modular architecture.

## Quick Reference

| Old Location | New Location |
|-------------|-------------|
| `server/routes/auth.js` | `server/src/modules/auth/routes/index.js` |
| `server/services/authService.js` | `server/src/modules/auth/services/auth.service.js` |
| `server/middleware/validation.js` (schemas) | `server/src/modules/*/validators/*.validator.js` |
| Direct route handlers | `server/src/modules/*/controllers/*.controller.js` |
| `server/middleware/*` (shared) | `server/src/modules/shared/middleware/*` |
| `server/utils/*` (shared) | `server/src/modules/shared/utils/*` |
| `server/utils/db.js` | `server/src/core/database/client.js` |

## Step-by-Step Migration

### Example: Migrating the Stations Feature

#### Before (Monolithic)

```javascript
// server/index.js
app.get('/api/stations', authenticateToken, tenantContext, tenantRateLimit, 
  requirePermission('stations', 'read'), asyncHandler(async (req, res) => {
    const where = {};
    if (req.tenantId) where.organizationId = req.tenantId;
    if (req.query.region) where.region = req.query.region;
    const stations = await prisma.station.findMany({ 
      where, 
      orderBy: { name: 'asc' } 
    });
    res.json(stations);
}));

app.post('/api/stations', authenticateToken, tenantContext, tenantRateLimit,
  requirePermission('stations', 'write'), validateRequest(stationSchema), 
  requireQuota('stations'), asyncHandler(async (req, res) => {
    const station = await prisma.station.create({
      data: {
        ...req.validatedData,
        organizationId: req.tenantId
      }
    });
    res.status(201).json(station);
}));
```

#### After (Modular)

**1. Create validator** (`src/modules/station/validators/station.validator.js`):
```javascript
import { z } from 'zod';

export const stationValidator = {
  create: z.object({
    name: z.string().min(1, 'Name is required'),
    region: z.string().min(1, 'Region is required'),
    address: z.string().optional(),
    brand: z.string().optional(),
  }),

  update: z.object({
    name: z.string().optional(),
    region: z.string().optional(),
    address: z.string().optional(),
    brand: z.string().optional(),
  }),

  list: z.object({
    region: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  }),

  id: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
};
```

**2. Create service** (`src/modules/station/services/station.service.js`):
```javascript
import { buildCursorPagination, formatCursorResponse } from '../../shared/utils/pagination.js';

export const stationService = {
  async listStations(prisma, tenantId, filters = {}) {
    const where = {};
    if (tenantId) where.organizationId = tenantId;
    if (filters.region) where.region = filters.region;

    const stations = await prisma.station.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    return stations;
  },

  async getStationById(prisma, tenantId, stationId) {
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        organizationId: tenantId
      }
    });

    if (!station) {
      const error = new Error('Station not found');
      error.statusCode = 404;
      throw error;
    }

    return station;
  },

  async createStation(prisma, tenantId, stationData) {
    const station = await prisma.station.create({
      data: {
        ...stationData,
        organizationId: tenantId
      }
    });

    return station;
  },

  async updateStation(prisma, tenantId, stationId, updateData) {
    await prisma.station.updateMany({
      where: { id: stationId, organizationId: tenantId },
      data: updateData
    });

    const updated = await prisma.station.findUnique({ 
      where: { id: stationId } 
    });

    if (!updated) {
      const error = new Error('Station not found');
      error.statusCode = 404;
      throw error;
    }

    return updated;
  },

  async deleteStation(prisma, tenantId, stationId) {
    const deleted = await prisma.station.deleteMany({
      where: { id: stationId, organizationId: tenantId }
    });

    if (deleted.count === 0) {
      const error = new Error('Station not found');
      error.statusCode = 404;
      throw error;
    }

    return { message: 'Station deleted' };
  },
};
```

**3. Create controller** (`src/modules/station/controllers/station.controller.js`):
```javascript
import { stationService } from '../services/station.service.js';

export const stationController = {
  async listStations(req, res, next) {
    try {
      const stations = await stationService.listStations(
        req.prisma,
        req.tenantId,
        req.query
      );
      res.json(stations);
    } catch (error) {
      next(error);
    }
  },

  async getStation(req, res, next) {
    try {
      const station = await stationService.getStationById(
        req.prisma,
        req.tenantId,
        req.params.id
      );
      res.json(station);
    } catch (error) {
      next(error);
    }
  },

  async createStation(req, res, next) {
    try {
      const station = await stationService.createStation(
        req.prisma,
        req.tenantId,
        req.body
      );
      res.status(201).json(station);
    } catch (error) {
      next(error);
    }
  },

  async updateStation(req, res, next) {
    try {
      const station = await stationService.updateStation(
        req.prisma,
        req.tenantId,
        req.params.id,
        req.body
      );
      res.json(station);
    } catch (error) {
      next(error);
    }
  },

  async deleteStation(req, res, next) {
    try {
      const result = await stationService.deleteStation(
        req.prisma,
        req.tenantId,
        req.params.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
```

**4. Create routes** (`src/modules/station/routes/index.js`):
```javascript
import express from 'express';
import { stationController } from '../controllers/station.controller.js';
import { stationValidator } from '../validators/station.validator.js';
import { authenticateToken, tenantContext } from '../../shared/middleware/auth.js';
import { requirePermission } from '../../shared/middleware/rbac.js';
import { validateRequest, validateParams, validateQuery } from '../../shared/middleware/validation.js';
import { tenantRateLimit } from '../../shared/middleware/rateLimitRedis.js';
import { requireQuota } from '../../shared/middleware/quota.js';
import { prismaMiddleware } from '../../shared/middleware/prisma.js';

const router = express.Router();

router.use(prismaMiddleware);
router.use(authenticateToken);
router.use(tenantContext);
router.use(tenantRateLimit);

router.get(
  '/',
  requirePermission('stations', 'read'),
  validateQuery(stationValidator.list),
  stationController.listStations
);

router.get(
  '/:id',
  requirePermission('stations', 'read'),
  validateParams(stationValidator.id),
  stationController.getStation
);

router.post(
  '/',
  requirePermission('stations', 'write'),
  validateRequest(stationValidator.create),
  requireQuota('stations'),
  stationController.createStation
);

router.put(
  '/:id',
  requirePermission('stations', 'write'),
  validateParams(stationValidator.id),
  validateRequest(stationValidator.update),
  stationController.updateStation
);

router.delete(
  '/:id',
  requirePermission('stations', 'delete'),
  validateParams(stationValidator.id),
  stationController.deleteStation
);

export default router;
```

**5. Create module index** (`src/modules/station/index.js`):
```javascript
export { default as stationRoutes } from './routes/index.js';
export { stationService } from './services/station.service.js';
export { stationController } from './controllers/station.controller.js';
export { stationValidator } from './validators/station.validator.js';
```

**6. Update main app**:
```javascript
// server/index.js or server/src/app.js
import { stationRoutes } from './src/modules/station/index.js';

// Replace old route definitions with:
app.use('/api/stations', stationRoutes);
```

## Migration Checklist

When migrating a feature:

- [ ] Create module directory structure
- [ ] Extract validation schemas → `validators/`
- [ ] Extract business logic → `services/`
- [ ] Create controllers from route handlers → `controllers/`
- [ ] Create routes file → `routes/index.js`
- [ ] Create module index → `index.js`
- [ ] Update imports in main app
- [ ] Test the migrated feature
- [ ] Update any dependent code
- [ ] Remove old code (optional, can wait)

## Common Patterns

### Pattern 1: Route Handler → Controller

**Before:**
```javascript
app.get('/api/resource', async (req, res) => {
  const data = await prisma.resource.findMany();
  res.json(data);
});
```

**After:**
```javascript
// controller
export const resourceController = {
  async list(req, res, next) {
    try {
      const data = await resourceService.list(req.prisma);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
};
```

### Pattern 2: Inline Validation → Validator

**Before:**
```javascript
const schema = z.object({
  name: z.string().min(1)
});

app.post('/api/resource', validateRequest(schema), handler);
```

**After:**
```javascript
// validators/resource.validator.js
export const resourceValidator = {
  create: z.object({
    name: z.string().min(1)
  })
};

// routes/index.js
router.post('/', validateRequest(resourceValidator.create), controller.create);
```

### Pattern 3: Direct Database Access → Service

**Before:**
```javascript
app.post('/api/resource', async (req, res) => {
  const result = await prisma.resource.create({
    data: req.body
  });
  res.json(result);
});
```

**After:**
```javascript
// services/resource.service.js
export const resourceService = {
  async create(prisma, data) {
    return await prisma.resource.create({ data });
  }
};

// controllers/resource.controller.js
export const resourceController = {
  async create(req, res, next) {
    try {
      const result = await resourceService.create(req.prisma, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};
```

## Gradual Migration Strategy

You don't have to migrate everything at once:

### Phase 1: Start with New Features
- Build all new features using modular structure
- Leave existing code as-is

### Phase 2: Migrate High-Traffic Routes
- Identify most-used endpoints
- Migrate them to improve performance and maintainability

### Phase 3: Migrate by Module
- Migrate one complete feature at a time
- Test thoroughly after each migration

### Phase 4: Clean Up
- Once all code is migrated, remove old directories
- Update documentation

## Testing Migrated Code

```javascript
// test/modules/station/station.service.test.js
import { stationService } from '../../../src/modules/station/index.js';
import { createMockPrisma } from '../../mocks/prisma.js';

describe('StationService', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('creates station', async () => {
    mockPrisma.station.create.mockResolvedValue({
      id: '1',
      name: 'Test Station'
    });

    const result = await stationService.createStation(
      mockPrisma,
      'tenant-1',
      { name: 'Test Station' }
    );

    expect(result.name).toBe('Test Station');
  });
});
```

## Troubleshooting

### Import Errors

**Problem:** `Cannot find module`

**Solution:** Check import paths are relative to module location:
```javascript
// Wrong
import { authService } from 'modules/auth/services/auth.service.js';

// Correct
import { authService } from '../../shared/utils/auth.js';
```

### Circular Dependencies

**Problem:** Module A imports Module B which imports Module A

**Solution:** Extract shared logic to `modules/shared/`

### Middleware Not Working

**Problem:** Middleware not executing

**Solution:** Ensure `prismaMiddleware` is first:
```javascript
router.use(prismaMiddleware);
router.use(authenticateToken);
```

## Need Help?

- Check existing modules (auth, audit, incident) for examples
- Review [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md)
- Review [DEPENDENCY_RULES.md](./DEPENDENCY_RULES.md)
