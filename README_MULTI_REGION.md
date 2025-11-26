# Multi-Region Deployment Architecture

## Overview

HSE Digital now supports multi-region deployment for global low-latency access, high availability, and disaster recovery.

## Features Implemented

### ✅ Database Read Replicas
- PostgreSQL streaming replication across regions
- Automatic replica health monitoring
- Read/write splitting for optimal performance
- Replication lag tracking and alerts

### ✅ Redis Cluster Setup
- Multi-region Redis clusters with automatic failover
- Support for both Redis Cluster and Sentinel modes
- Cross-region session replication (optional)
- Health monitoring and automatic recovery

### ✅ CDN Integration
- Static asset distribution via CDN (Cloudflare/CloudFront/Fastly)
- Automatic cache invalidation on deployment
- Regional origin servers for optimal routing
- Compression (Gzip + Brotli) enabled

### ✅ Geo-Based Tenant Routing
- Automatic region selection based on client location
- Support for multiple CDN provider geo-headers
- Tenant-specific region preferences
- Cross-region request proxying

### ✅ Cross-Region Failover
- Automated health checks every 30 seconds
- Failover after 3 consecutive failures
- Automatic promotion of database replicas
- Failback to primary region when recovered
- Manual failover API for planned maintenance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Global CDN                            │
│              (Cloudflare / CloudFront)                       │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
    ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
    │ US-East │        │ EU-West │       │ AP-SE   │
    │ Primary │        │Secondary│       │Secondary│
    └────┬────┘        └────┬────┘       └────┬────┘
         │                  │                  │
    ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
    │ Primary │  Rep   │ Replica │  Rep  │ Replica │
    │Database │───────▶│Database │◀──────│Database │
    └─────────┘        └─────────┘       └─────────┘
```

## Quick Start

### 1. Local Multi-Region Testing

```bash
# Start multi-region docker compose
docker-compose -f docker-compose.multiregion.yml up -d

# Verify all regions are running
curl http://localhost:3001/api/regions/status  # US-East
curl http://localhost:3002/api/regions/status  # EU-West
```

### 2. Production Deployment

See [docs/MULTI_REGION_SETUP.md](docs/MULTI_REGION_SETUP.md) for detailed setup instructions.

```bash
# Copy environment template
cp .env.multiregion.example .env.multiregion

# Configure database URLs, Redis clusters, CDN endpoints
vim .env.multiregion

# Deploy to each region
kubectl apply -k k8s/overlays/us-east/
kubectl apply -k k8s/overlays/eu-west/
kubectl apply -k k8s/overlays/ap-southeast/
```

## API Endpoints

### Multi-Region Status
```bash
GET /api/regions/status
# Returns current region, all regions, and health status
```

### List All Regions
```bash
GET /api/regions
# Returns list of configured regions
```

### Get Tenant Region
```bash
GET /api/regions/tenant/:tenantId/region
# Returns the region assigned to a tenant
```

### Set Tenant Region Preference
```bash
POST /api/regions/tenant/:tenantId/region
Content-Type: application/json

{
  "regionKey": "EU_WEST"
}
```

### Health Checks
```bash
GET /api/regions/health/database   # Database health
GET /api/regions/health/redis      # Redis health
GET /api/regions/health/failover   # Failover status
```

### Manual Failover
```bash
POST /api/regions/failover/manual
Content-Type: application/json

{
  "targetRegionId": "eu-west-1"
}
```

## Configuration

### Environment Variables

```bash
# Enable multi-region features
ENABLE_MULTI_REGION=true

# Current deployment region
DEPLOYMENT_REGION=US_EAST

# Database URLs (per region)
DATABASE_URL_US_EAST_PRIMARY=postgresql://...
DATABASE_URL_US_EAST_REPLICA=postgresql://...

# Redis configuration
REDIS_MODE=cluster  # or 'sentinel' or 'standalone'
REDIS_CLUSTER_US_EAST=node1:6379,node2:6379,node3:6379

# CDN configuration
CDN_ENABLED=true
CDN_PROVIDER=cloudflare
CDN_ENDPOINT_US_EAST=https://cdn-us-east.hse.digital

# Failover configuration
AUTO_FAILOVER_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
MAX_CONSECUTIVE_FAILURES=3
FAILBACK_ENABLED=true
FAILBACK_DELAY=300000

# Geo-routing
ENABLE_CROSS_REGION_PROXY=true
```

## Database Schema Updates

Added `regionPreference` field to Organization model:

```prisma
model Organization {
  // ... existing fields
  regionPreference   String?  // e.g., "US_EAST", "EU_WEST", "AP_SOUTHEAST"
}
```

Run migration:
```bash
npx prisma db push
```

## Monitoring

### Prometheus Metrics
- `db_query_duration` - Database query latency
- `redis_command_duration` - Redis command latency
- `http_request_duration` - Request latency by region
- `failover_events` - Failover occurrences

### Health Check Endpoints
Monitor these endpoints in your uptime monitoring tool:
- https://us-east.hse.digital/api/health
- https://eu-west.hse.digital/api/health
- https://ap-southeast.hse.digital/api/health

## Runbooks

- **[MULTI_REGION_ARCHITECTURE.md](docs/MULTI_REGION_ARCHITECTURE.md)** - Detailed architecture documentation
- **[MULTI_REGION_SETUP.md](docs/MULTI_REGION_SETUP.md)** - Complete setup guide
- **[MULTI_REGION_RUNBOOK.md](docs/MULTI_REGION_RUNBOOK.md)** - Operational procedures and troubleshooting

## Files Created/Modified

### New Files
- `server/config/multiRegion.js` - Multi-region configuration
- `server/utils/databaseReplicaManager.js` - Database replica management
- `server/utils/redisClusterManager.js` - Redis cluster management
- `server/services/failoverManager.js` - Automatic failover orchestration
- `server/middleware/geoRouting.js` - Geo-based routing middleware
- `server/routes/multiRegion.js` - Multi-region API routes
- `k8s/overlays/us-east/` - US East Kubernetes config
- `k8s/overlays/eu-west/` - EU West Kubernetes config
- `k8s/overlays/ap-southeast/` - AP Southeast Kubernetes config
- `docker-compose.multiregion.yml` - Local multi-region testing
- `.env.multiregion.example` - Environment template
- `docs/MULTI_REGION_ARCHITECTURE.md` - Architecture docs
- `docs/MULTI_REGION_RUNBOOK.md` - Operations runbook
- `docs/MULTI_REGION_SETUP.md` - Setup guide

### Modified Files
- `server/index.js` - Integrated multi-region components
- `prisma/schema.prisma` - Added regionPreference to Organization
- `.gitignore` - Added .env.multiregion

## Testing

### Unit Tests
```bash
cd server && npm test
```

### Integration Tests
```bash
# Test multi-region endpoints
npm run test:e2e
```

### Load Tests
```bash
# Test across regions
npm run test:load
```

## Cost Considerations

- **Database**: Primary + 2 replicas (3x database cost)
- **Redis**: 3 clusters (3x Redis cost)
- **Compute**: Multiple regions (2-3x compute cost)
- **CDN**: Reduced origin traffic saves bandwidth
- **Data Transfer**: Cross-region replication incurs egress fees

## Security

- TLS encryption for all cross-region communication
- VPC peering for secure database replication
- Encrypted Redis connections
- CDN DDoS protection
- Regular security audits

## Support

For issues or questions:
- Check the [troubleshooting section](docs/MULTI_REGION_RUNBOOK.md#10-troubleshooting)
- Review [architecture docs](docs/MULTI_REGION_ARCHITECTURE.md)
- Contact DevOps team

## Future Enhancements

- [ ] Active-active multi-master writes
- [ ] More regions (Australia, South America, Africa)
- [ ] Edge compute functions
- [ ] Real-time cross-region data sync
- [ ] Automated chaos engineering tests
