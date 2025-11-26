# Dependency Rules

## Module Dependency Policy

This document defines the allowed and forbidden dependencies between different layers of the application.

## Dependency Hierarchy

```
┌─────────────────────────────────────┐
│         Feature Modules             │
│  (auth, tenant, audit, incident,    │
│   permit, billing, reporting)       │
└────────────┬────────────────────────┘
             │ ✓ Can depend on
             ▼
┌─────────────────────────────────────┐
│        Shared Module                │
│  (middleware, utils, config)        │
└────────────┬────────────────────────┘
             │ ✓ Can depend on
             ▼
┌─────────────────────────────────────┐
│         Core Infrastructure         │
│  (database, monitoring, jobs)       │
└─────────────────────────────────────┘
```

## ✅ Allowed Dependencies

### Feature Modules CAN:
- ✓ Import from `modules/shared/*`
- ✓ Import from `core/*`
- ✓ Import utilities from within the same module
- ✓ Use Express, third-party libraries, Node.js built-ins

### Shared Module CAN:
- ✓ Import from `core/*`
- ✓ Import from existing middleware/services outside modules (during transition)
- ✓ Use Express, third-party libraries, Node.js built-ins

### Core Infrastructure CAN:
- ✓ Import Node.js built-ins
- ✓ Import third-party libraries
- ✓ NO imports from feature modules or shared module

## ❌ Forbidden Dependencies

### Feature Modules CANNOT:
- ✗ Import from other feature modules directly
  - ❌ `modules/auth/services/auth.service.js` → `modules/tenant/services/tenant.service.js`
  - ✓ Instead: Extract common functionality to shared module

- ✗ Bypass services and access database directly from controllers
  - ❌ `controller.js` → `prisma.user.create()`
  - ✓ Instead: `controller.js` → `service.js` → `prisma.user.create()`

- ✗ Import from implementation details of other modules
  - ❌ `modules/auth/routes/index.js` → `modules/audit/services/audit.service.js`

### Shared Module CANNOT:
- ✗ Import from feature modules
  - ❌ `shared/middleware/auth.js` → `modules/auth/services/auth.service.js`
  - ✓ Instead: Keep shared middleware generic

### Core Infrastructure CANNOT:
- ✗ Import from feature modules
- ✗ Import from shared module
- ✗ Have business logic
  - ❌ `core/database/client.js` → `modules/auth/services/auth.service.js`

## Inter-Module Communication

When modules need to communicate:

### Option 1: Events/Hooks (Recommended)
```javascript
// modules/audit/services/audit.service.js
import { eventEmitter } from '../../shared/utils/events.js';

async function createAudit(data) {
  const audit = await prisma.audit.create({ data });
  eventEmitter.emit('audit:created', audit);
  return audit;
}

// modules/tenant/services/metrics.service.js
import { eventEmitter } from '../../shared/utils/events.js';

eventEmitter.on('audit:created', (audit) => {
  updateTenantMetrics(audit.organizationId);
});
```

### Option 2: Shared Services
```javascript
// modules/shared/services/notification.service.js
export const notificationService = {
  notifyAuditCreated(audit) {
    // Send notifications
  }
};

// Used by multiple modules
import { notificationService } from '../../shared/services/notification.service.js';
```

### Option 3: Dependency Injection
```javascript
// Pass dependencies explicitly
export const createAuditService = (notificationService) => ({
  async createAudit(data) {
    const audit = await prisma.audit.create({ data });
    notificationService.notify(audit);
    return audit;
  }
});
```

## Layered Architecture

### Controller Layer
- Handles HTTP requests/responses
- Validates input (via validators)
- Calls service layer
- Returns responses
- **NO** direct database access
- **NO** business logic

### Service Layer
- Contains business logic
- Performs database operations
- Handles transactions
- Orchestrates multiple operations
- Can call other services **within the same module**
- Can emit events for cross-module communication

### Validator Layer
- Defines input schemas (Zod)
- Used by controllers
- Pure data validation only
- **NO** business logic

### Routes Layer
- Defines HTTP endpoints
- Applies middleware
- Maps routes to controllers
- **NO** business logic

## Testing Boundaries

Each module should be testable in isolation:

```javascript
// modules/audit/services/audit.service.test.js
import { auditService } from './audit.service.js';
import { mockPrisma } from '../../../test/mocks/prisma.js';

test('creates audit', async () => {
  const result = await auditService.createAudit(mockPrisma, 'tenant-1', {
    stationId: 'station-1',
    auditorId: 'user-1'
  });
  
  expect(result).toBeDefined();
});
```

## Migration Strategy

When moving existing code:

1. **Identify module**: Determine which feature module the code belongs to
2. **Extract service logic**: Move business logic to service layer
3. **Create controllers**: Extract request handling from routes to controllers
4. **Create validators**: Move validation schemas to validator files
5. **Update routes**: Keep routes thin, delegate to controllers
6. **Update imports**: Use new module paths
7. **Test**: Ensure module works in isolation

## Enforcement

### Manual Review
- Code reviews should check for forbidden dependencies
- Look for cross-module imports

### Automated Checking (Future)
Consider tools like:
- ESLint with `eslint-plugin-import`
- Dependency cruiser
- Custom lint rules

### Example ESLint Rule
```javascript
// .eslintrc.js
rules: {
  'import/no-restricted-paths': ['error', {
    zones: [
      { target: './src/modules/auth', from: './src/modules/audit' },
      { target: './src/modules/audit', from: './src/modules/auth' },
      { target: './src/core', from: './src/modules' },
    ]
  }]
}
```

## Benefits

1. **Clear Separation**: Each module has clear responsibilities
2. **Testability**: Modules can be tested in isolation
3. **Maintainability**: Changes are localized to specific modules
4. **Scalability**: New features added as new modules
5. **Team Collaboration**: Teams can work on different modules independently
6. **Reduced Coupling**: Modules don't directly depend on each other

## Questions?

If you're unsure about a dependency:
1. Ask: "Could this module work without this dependency?"
2. Ask: "Is this shared functionality needed by multiple modules?"
3. Ask: "Does this violate the dependency hierarchy?"

When in doubt, extract to shared module or use events for communication.
