# Backend Restructure Migration Guide

## Overview

The backend has been reorganized into a clean, modular structure with proper separation of concerns. This document explains the changes and how to work with the new structure.

## What Changed

### Directory Structure

**Before:**
```
server/
├── index.js
├── routes/
├── middleware/
├── services/
├── utils/
├── jobs/
├── queues/
├── monitoring/
├── config/
└── prisma/
```

**After:**
```
server/
├── src/
│   ├── index.js
│   ├── api/
│   │   ├── routes/
│   │   └── middleware/
│   ├── core/
│   │   └── services/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── queue/
│   │   ├── monitoring/
│   │   ├── config/
│   │   └── external/
│   └── shared/
│       ├── utils/
│       └── constants/
├── prisma/              # Kept at root for Prisma CLI
└── package.json
```

### Key Changes

1. **Entry Point**: `server/index.js` → `server/src/index.js`
2. **Prisma Client**: Single source of truth at `src/shared/utils/db.js`
3. **Removed Duplicates**: 
   - `utils/prismaClient.js` ❌
   - `utils/tracedPrismaClient.js` ❌
   - `utils/prisma-instrumented.js` ❌
   - All were re-exports of `utils/db.js`

## Import Path Updates

### From Routes Files

**Before:**
```javascript
import { prisma } from '../utils/db.js';
import { authService } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
```

**After:**
```javascript
import { prisma } from '../../shared/utils/db.js';
import { authService } from '../../core/services/authService.js';
import { authenticate } from '../middleware/auth.js';
```

### From Middleware Files

**Before:**
```javascript
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { cache } from '../utils/cache.js';
```

**After:**
```javascript
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';
import { cache } from '../../shared/utils/cache.js';
```

### From Services Files

**Before:**
```javascript
import { prisma } from '../utils/db.js';
import { queueService } from './queueService.js';
```

**After:**
```javascript
import { prisma } from '../../shared/utils/db.js';
import { queueService } from './queueService.js';
```

## Database Access

### ✅ Correct: Single Source of Truth

```javascript
// Always import from db.js
import { prisma } from '../../shared/utils/db.js';
// or via barrel export
import { prisma } from '../../shared/utils/index.js';
```

### ❌ Incorrect: Old Duplicate Files

```javascript
// These files no longer exist
import { prisma } from '../utils/prismaClient.js';  // ❌
import { prisma } from '../utils/tracedPrismaClient.js';  // ❌
```

## Development Commands

All commands remain the same, but entry point has changed:

```bash
# Start server
npm start              # Runs: node src/index.js

# Development mode
npm run dev            # Runs: nodemon src/index.js

# Lint
npm run lint           # Checks: src/index.js, src/shared/utils/sentry.js, etc.

# Tests
npm test

# Prisma commands (unchanged)
npm run prisma:generate
npm run prisma:push
npm run seed
```

## Docker

The Dockerfile has been updated to use the new entry point:

```dockerfile
CMD ["node", "server/src/index.js"]
```

No other Docker changes required.

## Adding New Code

### Adding a New Route

1. Create file in `src/api/routes/`
2. Import middleware from `../middleware/`
3. Import services from `../../core/services/`
4. Import utils from `../../shared/utils/`
5. Register route in `src/index.js`

Example:
```javascript
// src/api/routes/myFeature.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { myService } from '../../core/services/myService.js';
import { prisma } from '../../shared/utils/db.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const data = await myService.getData();
  res.json(data);
});

export default router;
```

### Adding a New Service

1. Create file in `src/core/services/`
2. Import utils from `../../shared/utils/`
3. Import infrastructure from `../../infrastructure/`
4. Export service functions

Example:
```javascript
// src/core/services/myService.js
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';
import { queueService } from '../../infrastructure/queue/queues/index.js';

export async function getData() {
  logger.info('Fetching data');
  return await prisma.myModel.findMany();
}
```

### Adding a New Middleware

1. Create file in `src/api/middleware/`
2. Import utils from `../../shared/utils/`
3. Export middleware function

Example:
```javascript
// src/api/middleware/myMiddleware.js
import { logger } from '../../shared/utils/logger.js';

export const myMiddleware = (req, res, next) => {
  logger.info('Middleware executed');
  next();
};
```

### Adding a New Utility

1. Create file in `src/shared/utils/`
2. Add export to `src/shared/utils/index.js` for barrel export
3. Import from `../../shared/utils/` in other modules

## Testing

Test files in `src/tests/` should import from the src directory:

```javascript
// src/tests/myFeature.test.js
import { prisma } from '../shared/utils/db.js';
import { myService } from '../core/services/myService.js';
```

## Benefits

1. **Clear Separation**: API, business logic, and infrastructure are separate
2. **No Duplication**: Single Prisma client instance
3. **Better Organization**: Easy to find files by purpose
4. **Scalable**: Easy to add features without cluttering root directory
5. **Testable**: Business logic isolated from HTTP concerns

## Troubleshooting

### Import errors

If you see import errors:
1. Check the file's location in the new structure
2. Update the relative path based on the new directory depth
3. Use ARCHITECTURE.md as reference

### Prisma client not found

Always import from:
```javascript
import { prisma } from '../../shared/utils/db.js';
```

Never from the old duplicate files.

### Module not found

- Verify file is in the correct new location
- Check relative path depth (more `../` needed from deeper directories)
- Ensure file was copied to `src/` directory

## Rollback

If you need to rollback to the old structure, the original files are still in their old locations (root of server/).

## Questions

See `server/ARCHITECTURE.md` for detailed architecture documentation.
