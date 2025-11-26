# Backend Architecture

## Directory Structure

The backend has been reorganized into a clean, modular structure following domain-driven design principles:

```
server/
├── src/                          # All application source code
│   ├── index.js                  # Application entry point
│   │
│   ├── api/                      # API layer (HTTP interface)
│   │   ├── routes/               # Express route handlers
│   │   │   ├── auth.js
│   │   │   ├── audits.js
│   │   │   ├── incidents.js
│   │   │   └── ...
│   │   └── middleware/           # Express middleware
│   │       ├── auth.js           # Authentication
│   │       ├── rbac.js           # Role-based access control
│   │       ├── validation.js     # Request validation
│   │       ├── rateLimitRedis.js # Rate limiting
│   │       └── ...
│   │
│   ├── core/                     # Core business logic
│   │   └── services/             # Business logic services
│   │       ├── authService.js
│   │       ├── reportService.js
│   │       ├── stripeService.js
│   │       └── ...
│   │
│   ├── infrastructure/           # External integrations & infrastructure
│   │   ├── database/            
│   │   │   ├── index.js          # Prisma client export
│   │   │   └── prisma/           # Prisma migrations & seeds
│   │   ├── queue/
│   │   │   ├── jobs/             # Background job processors
│   │   │   └── queues/           # Queue configuration
│   │   ├── monitoring/
│   │   │   └── alerts.js         # Alert management
│   │   ├── config/
│   │   │   ├── socket.js         # WebSocket configuration
│   │   │   └── multiRegion.js    # Multi-region setup
│   │   └── external/
│   │       └── sdks/             # Third-party SDKs
│   │
│   ├── shared/                   # Shared utilities and constants
│   │   ├── utils/                # Utility functions
│   │   │   ├── db.js             # Single source of truth for Prisma
│   │   │   ├── logger.js         # Logging utilities
│   │   │   ├── cache.js          # Caching utilities
│   │   │   └── ...
│   │   └── constants/            # Shared constants
│   │
│   ├── tests/                    # Test files
│   └── examples/                 # Example usage code
│
├── prisma/                       # Prisma schema (kept at root for CLI)
│   └── schema.prisma
│
├── package.json
└── ...
```

## Key Principles

### 1. Single Source of Truth for Database
- **Location**: `src/shared/utils/db.js`
- All Prisma client instances import from this file
- Includes logging, metrics, and tracing instrumentation
- Singleton pattern prevents multiple connections

### 2. Separation of Concerns

#### API Layer (`src/api/`)
- HTTP request/response handling
- Route definitions
- Middleware (auth, validation, rate limiting)
- No business logic

#### Core Layer (`src/core/`)
- Business logic and domain services
- Orchestrates infrastructure layer
- No direct HTTP concerns
- Reusable across different interfaces (REST, GraphQL, etc.)

#### Infrastructure Layer (`src/infrastructure/`)
- External service integrations (Stripe, AWS S3, etc.)
- Database access and migrations
- Queue management
- Monitoring and alerting
- Configuration

#### Shared Layer (`src/shared/`)
- Cross-cutting concerns
- Utilities used by multiple layers
- Constants and types

### 3. Import Paths

From any file in `src/`, use relative imports:

```javascript
// From routes
import { prisma } from '../../shared/utils/db.js';
import { authService } from '../../core/services/authService.js';
import { authenticate } from '../middleware/auth.js';

// From services
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';

// From middleware
import { prisma } from '../../shared/utils/db.js';
import { cache } from '../../shared/utils/cache.js';
```

### 4. Barrel Exports

Key modules provide barrel exports for cleaner imports:

```javascript
// Instead of multiple imports
import { prisma } from '../../shared/utils/db.js';
import { logger } from '../../shared/utils/logger.js';

// Use barrel export
import { prisma, logger } from '../../shared/utils/index.js';
```

## Benefits of This Structure

1. **Maintainability**: Clear separation makes code easier to understand and modify
2. **Testability**: Business logic isolated from HTTP concerns
3. **Scalability**: Easy to add new features without affecting existing code
4. **Reusability**: Core services can be used by different interfaces
5. **Single Source of Truth**: Prisma client centralized in one location

## Migration Notes

- Main entry point moved from `server/index.js` to `server/src/index.js`
- All imports updated to reflect new structure
- Duplicate Prisma client files removed (prismaClient.js, tracedPrismaClient.js, prisma-instrumented.js)
- Package.json updated with new entry point
- Prisma schema remains at `server/prisma/schema.prisma` for CLI compatibility

## Development

```bash
# Start server
npm start

# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint/syntax check
npm run lint
```
