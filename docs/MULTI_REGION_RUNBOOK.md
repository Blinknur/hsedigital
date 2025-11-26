# Multi-Region Deployment Runbook

## Overview

This runbook provides operational procedures for managing the HSE Digital multi-region deployment architecture.

## Architecture Summary

### Regions
- **US East (Virginia)** - Primary Region
- **EU West (Ireland)** - Secondary Region
- **AP Southeast (Singapore)** - Secondary Region

### Components
1. Database Layer: PostgreSQL with streaming replication
2. Cache Layer: Redis Cluster across regions
3. CDN: Static asset distribution
4. Load Balancers: Regional traffic distribution
5. Geo-Routing: Automatic region selection
6. Failover Manager: Automated health checks and failover

---

## 1. Deployment Procedures

### 1.1 Initial Multi-Region Setup

```bash
# Deploy to US East (Primary)
export DEPLOYMENT_REGION=US_EAST
kubectl apply -k k8s/overlays/us-east/

# Deploy to EU West
export DEPLOYMENT_REGION=EU_WEST
kubectl apply -k k8s/overlays/eu-west/

# Deploy to AP Southeast
export DEPLOYMENT_REGION=AP_SOUTHEAST
kubectl apply -k k8s/overlays/ap-southeast/
```

### 1.2 Configure Database Replication

```sql
-- On primary database
SELECT pg_create_physical_replication_slot('replica_eu');
SELECT pg_create_physical_replication_slot('replica_ap');
```

### 1.3 Setup Redis Cluster

```bash
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  --cluster-replicas 1
```

---

## 2. Database Operations

### 2.1 Monitor Replication Lag

```sql
SELECT client_addr, state, 
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

**Thresholds:**
- Acceptable: < 100MB
- Warning: > 500MB
- Critical: > 1GB

### 2.2 Promote Replica to Primary

```bash
# Promote replica
psql -U postgres -c "SELECT pg_promote();"

# Update app config
kubectl set env deployment/hse-app \
  DATABASE_URL="postgresql://user:pass@new-primary:5432/db"
```

---

## 3. Redis Cluster Operations

### 3.1 Monitor Cluster Health

```bash
redis-cli cluster info
redis-cli cluster nodes
redis-cli info replication
```

### 3.2 Add Node to Cluster

```bash
redis-cli --cluster add-node new-node:6379 existing:6379
redis-cli --cluster rebalance existing:6379
```

---

## 4. CDN Operations

### 4.1 Purge CDN Cache

```bash
# Cloudflare
curl -X POST "https://api.cloudflare.com/client/v4/zones/{id}/purge_cache" \
  -H "Authorization: Bearer {token}" \
  -d '{"purge_everything":true}'

# AWS CloudFront
aws cloudfront create-invalidation \
  --distribution-id {id} --paths "/*"
```

---

## 5. Failover Procedures

### 5.1 Automatic Failover

System auto-fails when:
- 3 consecutive health check failures
- Database unavailable
- Redis unavailable
- Response time > 10s

**Check status:**
```bash
curl https://api.hse.digital/api/health/failover
```

### 5.2 Manual Failover - Planned Maintenance

**Step 1: Verify Secondary Health**
```bash
curl https://eu-west.hse.digital/api/health
```

**Step 2: Update DNS**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id {zone} \
  --change-batch file://failover-dns.json
```

**Step 3: Promote Database**
```bash
psql -h eu-west-db -c "SELECT pg_promote();"
```

**Step 4: Monitor Traffic**
```bash
kubectl top pods -n hse-digital
```

### 5.3 Emergency Failover - Region Failure

**Immediate Actions (< 5 min):**

1. **Alert Team**
```bash
curl -X POST {slack_webhook} \
  -d '{"text":"CRITICAL: Region failure - initiating failover"}'
```

2. **Promote Secondary Database**
```bash
psql -h eu-west-db -c "SELECT pg_promote();"
kubectl set env deployment/hse-app \
  DATABASE_URL="postgresql://...@eu-west-db:5432/db" \
  DEPLOYMENT_REGION=EU_WEST
```

3. **Update Global DNS**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id {zone} \
  --change-batch file://emergency-failover.json
```

4. **Scale Secondary Region**
```bash
kubectl scale deployment/hse-app --replicas=10
```

---

## 6. Monitoring & Alerts

### 6.1 Key Metrics

**Database:**
- Replication lag
- Connection pool usage
- Query latency

**Redis:**
- Memory usage
- Hit/miss ratio
- Cluster health

**Application:**
- Request latency by region
- Error rates
- Active connections

### 6.2 Health Check Endpoints

```bash
# Overall health
GET /api/health

# Database health
GET /api/health/database

# Redis health
GET /api/health/redis

# Failover status
GET /api/health/failover
```

---

## 7. Rollback Procedures

### 7.1 Application Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/hse-app -n hse-digital

# Verify
kubectl rollout status deployment/hse-app
```

### 7.2 Database Rollback

```bash
# If migration failed, restore from backup
pg_restore -h db-host -U postgres -d hse_platform backup.dump
```

---

## 8. Disaster Recovery

### 8.1 Complete Region Loss

1. Promote healthy region to primary
2. Update all DNS records
3. Scale up remaining regions
4. Notify stakeholders
5. Establish new replication topology

### 8.2 Data Corruption

1. Stop writes to affected region
2. Restore from most recent backup
3. Replay WAL logs if available
4. Verify data integrity
5. Resume operations

---

## 9. Maintenance Windows

### 9.1 Scheduled Maintenance

**Best Practices:**
- Schedule during low-traffic periods
- Update one region at a time
- Wait 30+ minutes between regions
- Monitor error rates continuously
- Have rollback plan ready

**Template:**
```bash
# 1. Drain region
kubectl drain nodes --region {region}

# 2. Perform maintenance
# ... 

# 3. Uncordon and verify
kubectl uncordon nodes --region {region}
curl https://{region}.hse.digital/api/health
```

---

## 10. Troubleshooting

### 10.1 High Latency

**Check:**
1. Database replication lag
2. Redis memory usage
3. Network connectivity
4. CDN hit rates

**Fix:**
```bash
# Check app logs
kubectl logs -f deployment/hse-app --tail=100

# Check database
psql -c "SELECT * FROM pg_stat_activity WHERE state='active';"

# Check Redis
redis-cli --latency
```

### 10.2 Failed Health Checks

```bash
# Check pod status
kubectl get pods -n hse-digital

# Check pod logs
kubectl logs pod-name -n hse-digital

# Check events
kubectl get events -n hse-digital --sort-by='.lastTimestamp'
```

### 10.3 Database Connection Issues

```bash
# Check connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
psql -c "SHOW max_connections;"

# Kill idle connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND state_change < now() - interval '5 minutes';"
```

---

## 11. Contact Information

**On-Call Engineer:** +1-XXX-XXX-XXXX
**Slack Channel:** #hse-digital-ops
**PagerDuty:** https://hsedigital.pagerduty.com
**Status Page:** https://status.hse.digital

---

## 12. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-01-XX | 1.0 | Initial runbook | DevOps Team |
