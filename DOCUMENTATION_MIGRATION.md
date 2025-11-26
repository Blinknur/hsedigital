# Documentation Migration Guide

This document maps old documentation locations to new locations in the `/docs` directory.

## Documentation Reorganization

All technical documentation has been moved from the root and `server/` directories to `/docs` with proper categorization.

## File Location Map

### Root Directory → `/docs`

| Old Location | New Location | Category |
|--------------|--------------|----------|
| `API_DOCUMENTATION.md` | `docs/api/endpoints.md` | API |
| `DOCKER_SETUP.md` | `docs/deployment/docker.md` | Deployment |
| `SETUP.md` | `docs/deployment/setup-guide.md` | Deployment |
| `E2E_TEST_SUITE.md` | `docs/features/e2e-testing.md` | Features |
| `README_BACKUP.md` | (Consolidated) | - |
| `README_MULTI_REGION.md` | (Consolidated) | - |

### Server Directory → `/docs`

| Old Location | New Location | Category |
|--------------|--------------|----------|
| `server/TENANT_ARCHITECTURE.md` | `docs/architecture/multi-tenancy.md` | Architecture |
| `server/TENANT_ISOLATION_GUIDE.md` | `docs/architecture/tenant-isolation.md` | Architecture |
| `server/PERFORMANCE_OPTIMIZATION.md` | `docs/architecture/performance.md` | Architecture |
| `server/MOBILE_API.md` | `docs/api/mobile.md` | API |
| `server/QUICK_START.md` | `docs/deployment/quick-start.md` | Deployment |
| `server/TENANT_MIGRATION_API.md` | `docs/features/tenant-migration.md` | Features |
| `server/SECURITY.md` | `docs/security/overview.md` | Security |
| `server/SECURITY_INTEGRATION.md` | `docs/security/integration.md` | Security |
| `server/SECURITY_ENV_VARS.md` | `docs/security/environment-variables.md` | Security |
| `server/SECURITY_TOKEN_HASHING.md` | `docs/security/token-hashing.md` | Security |
| `server/MONITORING.md` | `docs/monitoring/overview.md` | Monitoring |
| `server/MONITORING_SETUP_SUMMARY.md` | `docs/monitoring/setup.md` | Monitoring |
| `server/TRACING.md` | `docs/monitoring/tracing.md` | Monitoring |
| `server/TRACING_EXAMPLE.md` | `docs/monitoring/tracing-examples.md` | Monitoring |
| `server/REPORTS_DOCUMENTATION.md` | `docs/features/reports.md` | Features |
| `server/REPORTS_QUICK_START.md` | `docs/features/reports-quick-start.md` | Features |
| `server/WEBSOCKET_NOTIFICATIONS.md` | `docs/features/websockets.md` | Features |
| `server/WEBSOCKET_QUICK_START.md` | `docs/features/websockets-quick-start.md` | Features |
| `server/QUEUE_SYSTEM.md` | `docs/features/queue-system.md` | Features |
| `server/QUOTA_SYSTEM.md` | `docs/features/quota-system.md` | Features |
| `server/NOTIFICATIONS_README.md` | `docs/features/notifications.md` | Features |
| `server/STRIPE_INTEGRATION.md` | `docs/features/stripe-billing.md` | Features |

### Docs Directory → Reorganized

| Old Location | New Location | Category |
|--------------|--------------|----------|
| `docs/RLS_ARCHITECTURE.md` | `docs/architecture/row-level-security.md` | Architecture |
| `docs/architecture.md` | `docs/architecture/overview.md` | Architecture |
| `docs/MULTI_REGION_ARCHITECTURE.md` | `docs/architecture/multi-region.md` | Architecture |
| `docs/DEPLOYMENT_RUNBOOK.md` | `docs/deployment/production.md` | Deployment |
| `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` | `docs/deployment/runbook.md` | Deployment |
| `docs/MULTI_REGION_SETUP.md` | `docs/deployment/multi-region.md` | Deployment |
| `docs/MULTI_REGION_RUNBOOK.md` | `docs/deployment/multi-region-runbook.md` | Deployment |
| `docs/BACKUP_DISASTER_RECOVERY.md` | `docs/deployment/backup-disaster-recovery.md` | Deployment |
| `docs/BACKUP_TESTING.md` | `docs/deployment/backup-testing.md` | Deployment |
| `docs/CAPACITY_PLANNING.md` | `docs/deployment/capacity-planning.md` | Deployment |
| `docs/LOAD_TESTING_SUMMARY.md` | `docs/deployment/load-testing.md` | Deployment |
| `docs/AUDIT_LOGGING.md` | `docs/security/audit-logging.md` | Security |
| `docs/STRIPE_INTEGRATION.md` | `docs/features/stripe-integration-guide.md` | Features |
| `docs/ANALYTICS_DASHBOARD.md` | `docs/features/analytics-dashboard.md` | Features |
| `docs/ANALYTICS_IMPLEMENTATION_SUMMARY.md` | `docs/features/analytics-implementation.md` | Features |
| `docs/openapi.yaml` | `docs/api/openapi.yaml` | API |

## New Documentation Structure

```
/docs
├── README.md                        # Documentation index
├── architecture/                    # System architecture
│   ├── README.md
│   ├── overview.md
│   ├── multi-tenancy.md
│   ├── tenant-isolation.md
│   ├── row-level-security.md
│   ├── multi-region.md
│   └── performance.md
├── api/                            # API documentation
│   ├── README.md
│   ├── endpoints.md
│   ├── mobile.md
│   └── openapi.yaml
├── deployment/                     # Deployment guides
│   ├── README.md
│   ├── quick-start.md
│   ├── setup-guide.md
│   ├── docker.md
│   ├── production.md
│   ├── runbook.md
│   ├── multi-region.md
│   ├── multi-region-runbook.md
│   ├── backup-disaster-recovery.md
│   ├── backup-testing.md
│   ├── capacity-planning.md
│   └── load-testing.md
├── security/                       # Security documentation
│   ├── README.md
│   ├── overview.md
│   ├── integration.md
│   ├── environment-variables.md
│   ├── token-hashing.md
│   └── audit-logging.md
├── monitoring/                     # Monitoring & observability
│   ├── README.md
│   ├── overview.md
│   ├── setup.md
│   ├── tracing.md
│   └── tracing-examples.md
└── features/                       # Feature documentation
    ├── README.md
    ├── reports.md
    ├── reports-quick-start.md
    ├── websockets.md
    ├── websockets-quick-start.md
    ├── queue-system.md
    ├── quota-system.md
    ├── notifications.md
    ├── stripe-billing.md
    ├── stripe-integration-guide.md
    ├── tenant-migration.md
    ├── e2e-testing.md
    ├── analytics-dashboard.md
    └── analytics-implementation.md
```

## Quick Reference

### For Developers
- Start here: [`docs/deployment/quick-start.md`](docs/deployment/quick-start.md)
- API Reference: [`docs/api/endpoints.md`](docs/api/endpoints.md)
- Architecture: [`docs/architecture/overview.md`](docs/architecture/overview.md)

### For DevOps
- Docker Setup: [`docs/deployment/docker.md`](docs/deployment/docker.md)
- Production: [`docs/deployment/production.md`](docs/deployment/production.md)
- Monitoring: [`docs/monitoring/overview.md`](docs/monitoring/overview.md)

### For Security
- Security Guide: [`docs/security/overview.md`](docs/security/overview.md)
- Configuration: [`docs/security/environment-variables.md`](docs/security/environment-variables.md)

## Main Entry Points

- **[README.md](README.md)** - Project overview and quick start
- **[AGENTS.md](AGENTS.md)** - Developer commands and workflows
- **[docs/README.md](docs/README.md)** - Complete documentation index

## Notes

### Summary Files
The following summary files have been consolidated into their main documentation:
- `*_SUMMARY.md` files → Merged into main docs
- `README_*.md` files → Consolidated or moved

### Duplicate Documentation
Duplicate files have been consolidated:
- `STRIPE_INTEGRATION.md` (root) → Kept in features
- `STRIPE_INTEGRATION.md` (server) → Merged with features version
- Multiple README files → Consolidated into single README.md

### Removed Files
Old documentation files in root and server directories should be removed after verification.

## Migration Checklist

- [x] Create `/docs` directory structure
- [x] Move architecture documentation
- [x] Move API documentation
- [x] Move deployment guides
- [x] Move security documentation
- [x] Move monitoring documentation
- [x] Move feature documentation
- [x] Create README.md for each category
- [x] Update main README.md
- [x] Update AGENTS.md
- [x] Create docs/README.md index
- [ ] Remove old documentation files (manual step)
- [ ] Update any hardcoded documentation links in code

## Finding Documentation

Use the new documentation index at [`docs/README.md`](docs/README.md) to browse all available documentation.

Each category has its own README with links to all documents in that section:
- [`docs/architecture/README.md`](docs/architecture/README.md)
- [`docs/api/README.md`](docs/api/README.md)
- [`docs/deployment/README.md`](docs/deployment/README.md)
- [`docs/security/README.md`](docs/security/README.md)
- [`docs/monitoring/README.md`](docs/monitoring/README.md)
- [`docs/features/README.md`](docs/features/README.md)
