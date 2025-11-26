# Source Code Directory

This directory contains all application source code, organized by architectural layer.

## Directory Structure

```
server/src/
├── index.js                 # Application entry point
├── api/                     # HTTP interface layer
│   ├── routes/              # Express route handlers
│   └── middleware/          # Request/response middleware
├── core/                    # Business logic layer
│   └── services/            # Domain services
├── infrastructure/          # External systems layer
│   ├── database/           # Prisma client & migrations
│   ├── queue/              # Background jobs & queues
│   ├── monitoring/         # Alerts & monitoring
│   ├── config/             # Infrastructure configuration
│   └── external/           # Third-party SDKs
└── shared/                  # Shared utilities
    ├── utils/              # Common utilities (logger, cache, etc.)
    └── constants/          # Shared constants
```

## Quick Reference

### Directory Purpose

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `api/routes/` | HTTP endpoint handlers | `auth.js`, `audits.js`, `incidents.js` |
| `api/middleware/` | Request/response middleware | `auth.js`, `rbac.js`, `validation.js` |
| `core/services/` | Business logic | `authService.js`, `reportService.js` |
| `infrastructure/database/` | Database client & migrations | `db.js` (via shared/utils), `prisma/` |
| `infrastructure/queue/` | Background jobs | `jobs/emailProcessor.js`, `queues/` |
| `infrastructure/monitoring/` | Alerts & metrics | `alerts.js` |
| `infrastructure/config/` | Infrastructure config | `socket.js`, `multiRegion.js` |
| `shared/utils/` | Common utilities | `logger.js`, `cache.js`, `metrics.js` |
| `shared/constants/` | Shared constants | (future use) |

### Import Patterns

#### From Route Files (`api/routes/*.js`)
```javascript
// Middleware (same level)
import { authenticate } from '../middleware/auth.js';

// Services (core layer)
import { authService } from '../../core/services/authService.js';

// Utils (shared layer)
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';
```

#### From Middleware Files (`api/middleware/*.js`)
```javascript
// Utils (shared layer)
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';
import { cache } from '../../shared/utils/cache.js';

// Services (if needed)
import { quotaService } from '../../core/services/quotaService.js';
```

#### From Service Files (`core/services/*.js`)
```javascript
// Utils (shared layer)
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';

// Other services (same level)
import { emailService } from './emailService.js';

// Infrastructure
import { queueService } from '../../infrastructure/queue/queues/index.js';
```

#### From Job Processors (`infrastructure/queue/jobs/*.js`)
```javascript
// Services
import { emailService } from '../../../core/services/emailService.js';

// Utils
import { logger } from '../../../shared/utils/logger.js';

// Queues (sibling directory)
import { emailQueue } from '../queues/index.js';
```

### Key Principles

1. **Single Database Client**: Always import Prisma from `shared/utils/db.js`
   ```javascript
   import { prisma } from '../../shared/utils/db.js';
   ```

2. **Layer Isolation**: 
   - Routes → only call services
   - Services → only use utils and infrastructure
   - Utils → no dependencies on other layers

3. **Barrel Exports**: Use index.js files for cleaner imports
   ```javascript
   // Multiple imports
   import { logger } from '../../shared/utils/logger.js';
   import { cache } from '../../shared/utils/cache.js';
   
   // Or via barrel (if all from same module)
   import { logger, cache } from '../../shared/utils/index.js';
   ```

### Adding New Code

#### New Route
1. Create file in `api/routes/`
2. Import middleware, services, utils
3. Define Express router
4. Export router
5. Register in `index.js`

#### New Service  
1. Create file in `core/services/`
2. Import utils and infrastructure
3. Define business logic functions
4. Export functions

#### New Middleware
1. Create file in `api/middleware/`
2. Import utils as needed
3. Define middleware function
4. Export function

#### New Utility
1. Create file in `shared/utils/`
2. Define utility functions
3. Export functions
4. (Optional) Add to `shared/utils/index.js`

### File Counts

- **Routes**: 19 files
- **Middleware**: 20 files
- **Services**: 24 files
- **Utils**: 13 files
- **Tests**: 21 files
- **Total JS files**: 129 files

### Documentation

- **Architecture Details**: `../ARCHITECTURE.md`
- **Migration Guide**: `../RESTRUCTURE_MIGRATION.md`
- **Summary**: `../RESTRUCTURE_SUMMARY.md`
- **Agent Guide**: `../../AGENTS.md`

### Common Tasks

**Add a new API endpoint:**
1. Create/edit route file in `api/routes/`
2. Import service from `core/services/`
3. Register route in `index.js`

**Add business logic:**
1. Create/edit service in `core/services/`
2. Use Prisma client from `shared/utils/db.js`
3. Call from route handler

**Add a background job:**
1. Create processor in `infrastructure/queue/jobs/`
2. Register in `infrastructure/queue/jobs/index.js`
3. Trigger from service layer

**Access database:**
```javascript
import { prisma } from '../../shared/utils/db.js';

const users = await prisma.user.findMany();
```

### Need Help?

See `../RESTRUCTURE_MIGRATION.md` for detailed migration guide and troubleshooting.

---

## Modular Architecture (Alternative Pattern)

The codebase also supports a module-based architecture pattern. For details, see:
- Module structure documentation in existing modules
- Module architecture guides in the modules directory
- Examples in the auth and audit modules

Both patterns coexist during the migration phase. New features can choose either approach based on team preference and feature requirements.
