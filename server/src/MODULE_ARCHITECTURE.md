# Module Architecture

## Overview

This application follows a modular architecture pattern with clear separation of concerns and dependency rules. Each feature module is self-contained with its own routes, services, controllers, and validators.

## Directory Structure

```
server/src/
├── core/                    # Core infrastructure
│   ├── database/           # Database configuration and utilities
│   ├── monitoring/         # Monitoring, logging, and tracing
│   └── jobs/              # Background job processing
├── modules/                # Feature modules
│   ├── auth/              # Authentication & authorization
│   ├── tenant/            # Multi-tenant organization management
│   ├── audit/             # Safety audits
│   ├── incident/          # Incident reporting
│   ├── permit/            # Work permits
│   ├── billing/           # Billing & subscriptions
│   ├── reporting/         # Report generation
│   └── shared/            # Shared utilities
│       ├── middleware/    # Shared middleware
│       ├── utils/         # Shared utilities
│       └── config/        # Shared configuration
└── app.js                 # Application entry point
```

## Module Structure

Each feature module follows this structure:

```
module-name/
├── routes/                # HTTP route definitions
│   └── index.js          # Main routes export
├── services/             # Business logic
│   └── *.service.js      # Service implementations
├── controllers/          # Request handlers
│   └── *.controller.js   # Controller implementations
├── validators/           # Input validation schemas
│   └── *.validator.js    # Zod validation schemas
└── index.js              # Module export (routes, services)
```

## Dependency Rules

### Allowed Dependencies

1. **Modules → Core**: All modules can depend on core infrastructure
2. **Modules → Shared**: All modules can depend on shared utilities
3. **Within Module**: Controllers → Services → Database

### Forbidden Dependencies

1. **Core → Modules**: Core cannot depend on feature modules
2. **Module → Module**: Feature modules cannot directly depend on each other
3. **Routes → Database**: Routes must go through services

## Module Descriptions

### Auth Module
- User registration and login
- JWT token management
- Password reset flows
- Email verification
- Refresh token rotation

**Exports**: `authRoutes`, `authService`, `authController`, `authValidator`

### Tenant Module
- Organization CRUD
- Tenant provisioning
- Subdomain management
- User management within orgs
- Tenant metrics

**Exports**: `tenantRoutes`, `tenantService`, `tenantController`, `tenantValidator`

### Audit Module
- Safety audit scheduling
- Audit execution
- Audit reporting
- Compliance tracking

**Exports**: `auditRoutes`, `auditService`, `auditController`, `auditValidator`

### Incident Module
- Incident reporting
- Incident tracking
- Severity classification
- Resolution workflows

**Exports**: `incidentRoutes`, `incidentService`, `incidentController`, `incidentValidator`

### Permit Module
- Work permit requests
- Approval workflows
- Contractor management
- Station assignments

**Exports**: `permitRoutes`, `permitService`, `permitController`, `permitValidator`

### Billing Module
- Stripe integration
- Subscription management
- Usage tracking
- Quota enforcement

**Exports**: `billingRoutes`, `billingService`, `billingController`, `billingValidator`

### Reporting Module
- PDF report generation
- Scheduled reports
- Chart rendering
- S3 storage integration

**Exports**: `reportingRoutes`, `reportingService`, `reportingController`, `reportingValidator`

## Shared Module

Contains utilities used across multiple modules:

- **Middleware**: Authentication, RBAC, rate limiting, validation, caching
- **Utils**: Pagination, logging, error handling, helpers
- **Config**: Environment variables, feature flags

## Core Infrastructure

### Database
- Prisma client singleton
- Connection pooling
- Transaction management
- Replica management

### Monitoring
- Logging (Pino)
- Metrics (Prometheus)
- Error tracking (Sentry)
- Distributed tracing (OpenTelemetry)
- Alerting

### Jobs
- Background job processing (Bull)
- Job queues (email, reports, webhooks)
- Job scheduling (cron)

## Integration Pattern

Modules are integrated via the main application file:

```javascript
import { authRoutes } from './modules/auth/index.js';
import { tenantRoutes } from './modules/tenant/index.js';
// ...

app.use('/api/auth', authRoutes);
app.use('/api/tenants', authMiddleware, tenantRoutes);
```

## Best Practices

1. **Single Responsibility**: Each module handles one domain area
2. **Encapsulation**: Internal module details are not exposed
3. **Dependency Injection**: Services receive dependencies (e.g., database) as parameters
4. **Validation at Boundary**: Validate all inputs at the controller level
5. **Error Handling**: Use consistent error handling patterns
6. **Testing**: Each module can be tested in isolation

## Migration Guide

When moving existing code:

1. Identify the domain/feature area
2. Move routes to `modules/{name}/routes/`
3. Move services to `modules/{name}/services/`
4. Extract controllers from routes
5. Move validators to `modules/{name}/validators/`
6. Update imports in main application file
7. Test the module independently

## Example: Auth Module

```javascript
// modules/auth/controllers/auth.controller.js
export const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
};

// modules/auth/routes/index.js
import { authController } from '../controllers/auth.controller.js';
import { authValidator } from '../validators/auth.validator.js';

const router = express.Router();
router.post('/login', validateRequest(authValidator.login), authController.login);

export default router;

// modules/auth/index.js
export { default as authRoutes } from './routes/index.js';
export { authService } from './services/auth.service.js';
```
