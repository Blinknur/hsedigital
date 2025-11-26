# Multi-Region Architecture

## Overview

The HSE Digital platform implements a comprehensive multi-region deployment architecture to provide global low-latency access, high availability, and disaster recovery capabilities.

## Architecture Components

### 1. Regional Distribution

**Primary Region: US East (Virginia)**
- Full read-write capabilities
- Primary database with streaming replication
- Redis cluster (3 master + 3 replica nodes)
- CDN origin servers
- 5 application instances

**Secondary Regions:**
- **EU West (Ireland)** - 3 application instances
- **AP Southeast (Singapore)** - 3 application instances

Each region includes:
- Database replica for read operations
- Independent Redis cluster
- CDN edge caching
- Regional load balancer

### 2. Database Architecture

```
┌─────────────────────┐
│   Primary (US-East) │
│   Read/Write DB     │
└──────────┬──────────┘
           │ Streaming Replication
           ├───────────────────────────┐
           │                           │
┌──────────▼──────────┐    ┌──────────▼──────────┐
│  Replica (EU-West)  │    │ Replica (AP-SE)     │
│  Read-Only          │    │ Read-Only           │
└─────────────────────┘    └─────────────────────┘
```

**Features:**
- Streaming replication for near real-time data sync
- Read replicas handle SELECT queries
- Automatic failover promotion
- Replication lag monitoring
- Connection pooling per region

### 3. Redis Cluster Architecture

```
Region: US-East               Region: EU-West              Region: AP-SE
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Master 1     │             │ Master 1     │             │ Master 1     │
│ Slots: 0-5k  │             │ Slots: 0-5k  │             │ Slots: 0-5k  │
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
┌──────▼───────┐             ┌──────▼───────┐             ┌──────▼───────┐
│ Replica 1    │             │ Replica 1    │             │ Replica 1    │
└──────────────┘             └──────────────┘             └──────────────┘
```

**Features:**
- Independent clusters per region
- Sentinel-based high availability
- Cross-region sync for session data (optional)
- Automatic failover within region
- Memory-based caching with persistence

### 4. CDN Integration

**Static Assets:**
- JavaScript bundles
- CSS stylesheets
- Images and fonts
- Upload files

**Configuration:**
- Cache TTL: 1 year for static assets
- Dynamic content: 1 hour cache
- API responses: No cache
- Compression: Gzip + Brotli enabled

**Providers Supported:**
- Cloudflare
- AWS CloudFront
- Fastly
- Custom CDN

### 5. Geo-Based Routing

**Request Flow:**
```
User Request
    │
    ▼
┌─────────────────┐
│  Global DNS     │  ← Geo-location detection
│  (Route53/CF)   │
└────────┬────────┘
         │
    ┌────┴────┬─────────┐
    ▼         ▼         ▼
US-East   EU-West   AP-SE
```

**Routing Rules:**
- North/South America → US East
- Europe/Africa → EU West
- Asia/Oceania → AP Southeast
- Tenant preference override available

**Headers Used:**
- `cf-ipcountry` (Cloudflare)
- `cloudfront-viewer-country` (AWS)
- `x-vercel-ip-country` (Vercel)
- Custom `x-geo-country`

### 6. Failover Strategy

**Health Check Criteria:**
- HTTP endpoint responds (200 OK)
- Database connection successful
- Redis connection successful
- Response time < 10 seconds

**Automatic Failover:**
1. 3 consecutive failures detected (90 seconds)
2. Mark region as unhealthy
3. Route traffic to healthy region
4. Promote replica if database primary fails
5. Monitor for recovery

**Failback:**
- Wait 5 minutes after primary recovery
- Gradually shift traffic back
- Re-establish replication
- Resume normal operation

## Data Flow

### Read Operations
```
User → Regional LB → App Instance → Read Replica → Response
                                 ↓
                              Redis Cache (if cached)
```

### Write Operations
```
User → Regional LB → App Instance → Primary DB (US-East) → Response
                                 ↓
                    Replicate to EU-West & AP-SE
```

### Static Assets
```
User → CDN Edge → Origin (Regional) → S3/Storage
        ↓
    (Cache Hit - served from edge)
```

## Tenant Isolation

**Multi-Tenant Strategy:**
- Organization-based isolation at application level
- Shared database with tenant_id filtering
- Row-Level Security (RLS) in PostgreSQL
- Separate Redis namespaces per tenant

**Regional Preferences:**
- Tenants can specify preferred region
- Data residency compliance (GDPR, etc.)
- Override automatic geo-routing
- Stored in organization metadata

## Monitoring & Observability

**Key Metrics:**
- Request latency by region
- Database replication lag
- Redis memory usage
- CDN cache hit ratio
- Failover events
- Error rates per region

**Health Endpoints:**
- `/api/health` - Overall health
- `/api/health/database` - DB status
- `/api/health/redis` - Cache status
- `/api/health/failover` - Failover state
- `/api/regions/status` - Multi-region status

## Security Considerations

**Network Security:**
- VPC peering between regions
- Private subnets for databases
- TLS encryption for data in transit
- VPN for cross-region admin access

**Data Security:**
- Encryption at rest (AES-256)
- Encrypted replication streams
- Secrets management per region
- Regular security audits

## Performance Optimization

**Database:**
- Connection pooling (20 connections per instance)
- Query result caching
- Index optimization
- Prepared statements

**Application:**
- Regional instance scaling (HPA)
- Keep-alive connections
- Response compression
- Async processing for heavy operations

**CDN:**
- Edge caching for static assets
- Image optimization
- HTTP/2 & HTTP/3 support
- Smart routing to nearest edge

## Disaster Recovery

**RTO (Recovery Time Objective):** < 5 minutes
**RPO (Recovery Point Objective):** < 1 minute

**Backup Strategy:**
- Continuous WAL archiving
- Daily full backups
- Cross-region backup replication
- 30-day retention period

**Recovery Procedures:**
1. Detect failure
2. Promote replica to primary
3. Update DNS records
4. Scale up secondary region
5. Notify stakeholders
6. Investigate root cause

## Cost Optimization

**Strategies:**
- Right-size instances per region
- Use spot instances for dev/test
- CDN caching reduces origin traffic
- Compress data in transit
- Archive old data to cold storage

**Regional Pricing:**
- US East: Standard pricing
- EU West: ~10% premium
- AP Southeast: ~15% premium

## Deployment Process

**Rolling Deployment:**
1. Deploy to US East
2. Monitor for 30 minutes
3. Deploy to EU West
4. Monitor for 30 minutes
5. Deploy to AP Southeast
6. Verify all regions healthy

**Blue-Green Deployment:**
- Maintain parallel environment
- Test in blue environment
- Switch traffic via DNS
- Rollback if issues detected

## Future Enhancements

- [ ] Active-active multi-master database
- [ ] Cross-region read-your-writes consistency
- [ ] Additional regions (AU, SA, AF)
- [ ] Edge compute functions
- [ ] GraphQL federation per region
- [ ] Real-time replication for critical data
- [ ] Automated chaos engineering tests
