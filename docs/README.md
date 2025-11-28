# HSE.Digital Documentation

Comprehensive documentation for the HSE.Digital compliance and safety platform.

## 📚 Documentation Structure

### [Architecture](./architecture/)
Technical architecture and design patterns
- [Overview](./architecture/overview.md) - System architecture overview
- [Multi-Tenancy](./architecture/multi-tenancy.md) - Multi-tenant architecture and tenant isolation
- [Tenant Isolation](./architecture/tenant-isolation.md) - Data isolation strategies
- [Row-Level Security](./architecture/row-level-security.md) - Database-level security
- [Multi-Region](./architecture/multi-region.md) - Multi-region deployment architecture
- [Performance](./architecture/performance.md) - Performance optimization strategies

### [API Reference](./api/)
API documentation and integration guides
- [API Endpoints](./api/endpoints.md) - Complete REST API reference
- [Mobile API](./api/mobile.md) - Mobile-specific API documentation
- [OpenAPI Spec](./api/openapi.yaml) - OpenAPI 3.0 specification

### [Deployment](./deployment/)
Deployment guides and operations
- [Quick Start](./deployment/quick-start.md) - Get started quickly
- [Setup Guide](./deployment/setup-guide.md) - Complete setup instructions
- [Production Deployment](./deployment/production.md) - Production deployment guide (Kubernetes)
- [Deployment Runbook](./deployment/runbook.md) - Step-by-step deployment procedures
- [Multi-Region Setup](./deployment/multi-region.md) - Multi-region deployment guide
- [Multi-Region Runbook](./deployment/multi-region-runbook.md) - Multi-region operations
- [Backup & Disaster Recovery](./deployment/backup-disaster-recovery.md) - Backup strategies
- [Backup Testing](./deployment/backup-testing.md) - Backup testing procedures
- [Capacity Planning](./deployment/capacity-planning.md) - Scaling and capacity planning
- [Load Testing](./deployment/load-testing.md) - Load testing and performance

### [Security](./security/)
Security implementation and best practices
- [Security Overview](./security/overview.md) - Comprehensive security guide
- [Security Integration](./security/integration.md) - Security middleware integration
- [Environment Variables](./security/environment-variables.md) - Secure configuration
- [Token Hashing](./security/token-hashing.md) - Token security implementation
- [Audit Logging](./security/audit-logging.md) - Security audit logging

### [Monitoring](./monitoring/)
Observability and monitoring
- [Monitoring Overview](./monitoring/overview.md) - Complete monitoring guide
- [Setup Guide](./monitoring/setup.md) - Monitoring stack setup
- [Distributed Tracing](./monitoring/tracing.md) - OpenTelemetry tracing
- [Tracing Examples](./monitoring/tracing-examples.md) - Tracing implementation examples

### [Features](./features/)
Feature-specific documentation
- [Report Generation](./features/reports.md) - PDF report generation engine
- [Reports Quick Start](./features/reports-quick-start.md) - Get started with reports
- [WebSocket Notifications](./features/websockets.md) - Real-time notifications
- [WebSocket Quick Start](./features/websockets-quick-start.md) - WebSocket setup
- [Queue System](./features/queue-system.md) - Background job processing
- [Quota System](./features/quota-system.md) - Usage limits and quotas
- [Notifications](./features/notifications.md) - Notification system
- [Stripe Billing](./features/stripe-billing.md) - Payment integration
- [Stripe Integration Guide](./features/stripe-integration-guide.md) - Stripe setup
- [Tenant Migration](./features/tenant-migration.md) - Tenant migration API
- [E2E Testing](./features/e2e-testing.md) - End-to-end testing suite
- [Analytics Dashboard](./features/analytics-dashboard.md) - Analytics and reporting
- [Analytics Implementation](./features/analytics-implementation.md) - Analytics setup

## 🚀 Quick Links

### Getting Started
- [Quick Start Guide](./deployment/quick-start.md) - Start developing quickly
- [API Documentation](./api/endpoints.md) - API reference

### For Developers
- [Architecture Overview](./architecture/overview.md) - Understand the system
- [API Reference](./api/endpoints.md) - REST API documentation
- [Security Guide](./security/overview.md) - Security best practices

### For DevOps
- [Production Deployment](./deployment/production.md) - Deploy to production
- [Monitoring Setup](./monitoring/overview.md) - Set up observability
- [Backup & DR](./deployment/backup-disaster-recovery.md) - Disaster recovery

### For System Administrators
- [Multi-Tenancy](./architecture/multi-tenancy.md) - Tenant management
- [Security Overview](./security/overview.md) - Security configuration
- [Capacity Planning](./deployment/capacity-planning.md) - Scaling guide

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

## 🔧 Tech Stack

- **Backend**: Node.js 18, Express.js
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache**: Redis 7
- **Queue**: Bull with Bull Board
- **Frontend**: React, Vite, TypeScript
- **Auth**: JWT with bcrypt
- **Monitoring**: Pino, Prometheus, Sentry, OpenTelemetry, Grafana
- **Deployment**: Kubernetes/EKS

## 📖 Additional Resources

- [Main README](../README.md) - Project overview
- [Agent Guide](../AGENTS.md) - Development commands and workflows
- [Database Schema](./schema.sql) - Database structure

## 🆘 Support

For questions or issues:
1. Check the relevant documentation section
2. Review the [API Documentation](./api/endpoints.md)
3. Check the troubleshooting sections in deployment guides
4. Contact the development team

## 📝 Contributing

When updating documentation:
1. Keep it concise and clear
2. Include code examples
3. Update the table of contents
4. Follow the existing structure
5. Test all commands and examples
