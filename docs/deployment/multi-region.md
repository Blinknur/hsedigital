# Multi-Region Setup Guide

## Quick Start

This guide walks through setting up the HSE Digital multi-region deployment architecture.

## Prerequisites

- Kubernetes clusters in target regions (US-East, EU-West, AP-Southeast)
- PostgreSQL 15+ with replication support
- Redis 7+ with cluster/sentinel support
- CDN provider account (Cloudflare, CloudFront, or Fastly)
- DNS with geo-routing capability (Route53, Cloudflare DNS)

## Step 1: Environment Configuration

Copy the multi-region environment template:

```bash
cp .env.multiregion.example .env.multiregion
```

Edit `.env.multiregion` and configure:

1. **Database URLs** for each region (primary + replica)
2. **Redis cluster nodes** or sentinel endpoints
3. **CDN endpoints** for each region
4. **Load balancer endpoints**
5. **Failover configuration** (thresholds, timeouts)

## Step 2: Database Setup

### Primary Database (US-East)

```sql
-- Enable replication
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET max_replication_slots = 10;

-- Create replication slots
SELECT pg_create_physical_replication_slot('replica_eu_west');
SELECT pg_create_physical_replication_slot('replica_ap_southeast');

-- Create replication user
CREATE USER replication_user WITH REPLICATION PASSWORD 'secure_password';
```

### Replica Databases (EU-West, AP-Southeast)

```bash
# Stop replica if running
pg_ctl stop -D /var/lib/postgresql/data

# Create base backup from primary
pg_basebackup -h us-east-primary-db -D /var/lib/postgresql/data \
  -U replication_user -P --wal-method=stream

# Configure standby
cat > /var/lib/postgresql/data/standby.signal << EOF
EOF

cat > /var/lib/postgresql/data/postgresql.auto.conf << EOF
primary_conninfo = 'host=us-east-primary-db port=5432 user=replication_user password=secure_password'
primary_slot_name = 'replica_eu_west'
EOF

# Start replica
pg_ctl start -D /var/lib/postgresql/data
```

### Verify Replication

```sql
-- On primary
SELECT * FROM pg_stat_replication;

-- On replica
SELECT pg_is_in_recovery();
SELECT pg_last_wal_replay_lsn();
```

## Step 3: Redis Cluster Setup

### Option A: Redis Cluster Mode

```bash
# Create cluster with 3 masters + 3 replicas per region
redis-cli --cluster create \
  us-east-redis-1:6379 \
  us-east-redis-2:6379 \
  us-east-redis-3:6379 \
  us-east-redis-4:6379 \
  us-east-redis-5:6379 \
  us-east-redis-6:6379 \
  --cluster-replicas 1

# Verify cluster
redis-cli -c -h us-east-redis-1 cluster info
redis-cli -c -h us-east-redis-1 cluster nodes
```

### Option B: Redis Sentinel Mode

```bash
# Start Redis masters
redis-server --port 6379 --appendonly yes

# Configure sentinel
cat > sentinel.conf << EOF
port 26379
sentinel monitor mymaster us-east-redis-1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 10000
EOF

# Start sentinel
redis-sentinel sentinel.conf
```

## Step 4: Kubernetes Deployment

### Deploy to Each Region

```bash
# US East (Primary)
export KUBECONFIG=~/.kube/us-east-config
kubectl create namespace hse-digital
kubectl apply -k k8s/overlays/us-east/

# EU West
export KUBECONFIG=~/.kube/eu-west-config
kubectl create namespace hse-digital
kubectl apply -k k8s/overlays/eu-west/

# AP Southeast
export KUBECONFIG=~/.kube/ap-southeast-config
kubectl create namespace hse-digital
kubectl apply -k k8s/overlays/ap-southeast/
```

### Verify Deployments

```bash
# Check pods
kubectl get pods -n hse-digital

# Check services
kubectl get svc -n hse-digital

# Check health
kubectl exec -it deploy/hse-app -n hse-digital -- curl localhost:3001/api/health
```

## Step 5: CDN Configuration

### Cloudflare Setup

```bash
# Add DNS records for each region
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CNAME",
    "name": "cdn",
    "content": "cdn.cloudflare.net",
    "proxied": true
  }'

# Configure cache rules
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -d '{
    "targets": [{"target": "url", "constraint": {"operator": "matches", "value": "*.hse.digital/assets/*"}}],
    "actions": [{"id": "cache_level", "value": "cache_everything"}],
    "priority": 1,
    "status": "active"
  }'
```

### AWS CloudFront Setup

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name us-east-lb.hse.digital \
  --default-cache-behavior file://cache-behavior.json

# Get distribution ID
DIST_ID=$(aws cloudfront list-distributions --query 'DistributionList.Items[0].Id' --output text)
```

## Step 6: DNS & Load Balancing

### AWS Route53 Geo-Routing

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.hse.digital",
        "Type": "A",
        "SetIdentifier": "US-East",
        "GeoLocation": {
          "ContinentCode": "NA"
        },
        "AliasTarget": {
          "HostedZoneId": "Z1234567890ABC",
          "DNSName": "us-east-lb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.hse.digital",
        "Type": "A",
        "SetIdentifier": "EU-West",
        "GeoLocation": {
          "ContinentCode": "EU"
        },
        "AliasTarget": {
          "HostedZoneId": "Z1234567890ABC",
          "DNSName": "eu-west-lb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

Apply DNS changes:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id ${HOSTED_ZONE_ID} \
  --change-batch file://geo-routing.json
```

## Step 7: Enable Multi-Region Features

Update application environment:

```bash
kubectl set env deployment/hse-app \
  -n hse-digital \
  ENABLE_MULTI_REGION=true \
  DEPLOYMENT_REGION=US_EAST \
  CDN_ENABLED=true \
  AUTO_FAILOVER_ENABLED=true
```

## Step 8: Testing

### Test Geo-Routing

```bash
# From US
curl -H "cf-ipcountry: US" https://api.hse.digital/api/regions/status

# From EU
curl -H "cf-ipcountry: DE" https://api.hse.digital/api/regions/status

# From Asia
curl -H "cf-ipcountry: SG" https://api.hse.digital/api/regions/status
```

### Test Database Replication

```bash
# Write to primary
curl -X POST https://api.hse.digital/api/stations \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name":"Test Station"}'

# Read from replica (should see new data within seconds)
curl https://eu-west.hse.digital/api/stations \
  -H "Authorization: Bearer ${TOKEN}"
```

### Test Failover

```bash
# Get current status
curl https://api.hse.digital/api/regions/health/failover

# Simulate failure (stop primary region pods)
kubectl scale deployment/hse-app --replicas=0 -n hse-digital

# Verify failover occurred
curl https://api.hse.digital/api/regions/health/failover
# Should show isFailedOver: true
```

## Step 9: Monitoring Setup

### Prometheus Metrics

```yaml
# prometheus-config.yaml
scrape_configs:
  - job_name: 'hse-digital-us-east'
    static_configs:
      - targets: ['us-east-app:9090']
    
  - job_name: 'hse-digital-eu-west'
    static_configs:
      - targets: ['eu-west-app:9090']
```

### Grafana Dashboards

Import the multi-region dashboard:

```bash
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana-multiregion-dashboard.json
```

## Step 10: Backup & DR

### Configure Cross-Region Backups

```bash
# Create S3 bucket for backups
aws s3 mb s3://hse-digital-backups-us-east
aws s3 mb s3://hse-digital-backups-eu-west

# Enable replication
aws s3api put-bucket-replication \
  --bucket hse-digital-backups-us-east \
  --replication-configuration file://replication-config.json

# Schedule automated backups
kubectl apply -f k8s/backup-cronjob.yaml
```

## Troubleshooting

### Database Replication Lag

```sql
-- Check lag
SELECT pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- If lag is high, check network and disk I/O
```

### Redis Cluster Issues

```bash
# Check cluster health
redis-cli --cluster check us-east-redis-1:6379

# Fix cluster issues
redis-cli --cluster fix us-east-redis-1:6379
```

### CDN Cache Issues

```bash
# Purge cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -d '{"purge_everything":true}'
```

## Production Checklist

- [ ] Database replication configured and verified
- [ ] Redis clusters deployed in all regions
- [ ] CDN configured with proper cache rules
- [ ] Geo-routing DNS records created
- [ ] Health checks passing in all regions
- [ ] Monitoring and alerting configured
- [ ] Backup and DR procedures tested
- [ ] Runbook reviewed by team
- [ ] Load testing completed
- [ ] Security audit performed

## Next Steps

- Review [MULTI_REGION_RUNBOOK.md](./MULTI_REGION_RUNBOOK.md) for operational procedures
- Review [MULTI_REGION_ARCHITECTURE.md](./MULTI_REGION_ARCHITECTURE.md) for architecture details
- Set up monitoring dashboards
- Configure alerting rules
- Schedule regular DR drills
