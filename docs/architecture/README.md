# Architecture Documentation

System architecture, design patterns, and technical documentation.

## Documents

- **[Overview](./overview.md)** - High-level system architecture and design
- **[Multi-Tenancy](./multi-tenancy.md)** - Multi-tenant architecture and implementation
- **[Tenant Isolation](./tenant-isolation.md)** - Data isolation strategies and patterns
- **[Row-Level Security](./row-level-security.md)** - Database-level security implementation
- **[Multi-Region](./multi-region.md)** - Multi-region deployment architecture
- **[Performance](./performance.md)** - Performance optimization strategies

## Key Concepts

### Multi-Tenant Architecture
The platform uses organization-based multi-tenancy with:
- JWT-based tenant context
- Automatic query filtering via Prisma middleware
- Row-level security at database level
- Tenant-scoped API endpoints

### Data Isolation
Multiple layers of data isolation:
- Application-level filtering
- Database-level RLS policies
- Tenant context middleware
- Audit logging

### Performance
Optimized for multi-tenant scale:
- Connection pooling
- Redis caching
- Query optimization
- Indexed tenant columns

## Quick Links

- [Multi-Tenancy Guide](./multi-tenancy.md)
- [Security Architecture](../security/overview.md)
- [API Documentation](../api/endpoints.md)
