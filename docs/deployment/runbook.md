# Production Deployment Runbook

Comprehensive operational guide for deploying and managing HSE Digital platform in production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Blue-Green Deployment](#blue-green-deployment)
3. [Database Migrations](#database-migrations)
4. [Monitoring Verification](#monitoring-verification)
5. [Incident Response](#incident-response)
6. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

### 1. Secrets Rotation (Every 90 Days)

```bash
# JWT Secrets
JWT_NEW=$(openssl rand -base64 32)
REFRESH_NEW=$(openssl rand -base64 32)
kubectl create secret generic hse-jwt-secrets \
  --from-literal=JWT_SECRET="$JWT_NEW" \
  --from-literal=REFRESH_SECRET="$REFRESH_NEW" \
  --namespace=hse-production --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deployment/prod-hse-app -n hse-production

# Database Credentials
NEW_DB_URL="postgresql://user:pass@postgres:5432/hse_platform"
kubectl create secret generic hse-db-secret \
  --from-literal=DATABASE_URL="$NEW_DB_URL" \
  --namespace=hse-production --dry-run=client -o yaml | kubectl apply -f -
```

### 2. Backup Verification

```bash
# Check status
curl -H "Authorization: Bearer $TOKEN" https://api.hse.com/api/backup/health

# Create pre-deployment backup
VERSION="v1.5.0"
BACKUP="pre-deploy-${VERSION}-$(date +%Y%m%d-%H%M%S)"
kubectl exec postgres-0 -n hse-production -- pg_dump -U hse_admin -d hse_platform | gzip > "/var/backups/hse-digital/deployments/${BACKUP}.sql.gz"

# Verify and upload
gzip -t "/var/backups/hse-digital/deployments/${BACKUP}.sql.gz"
aws s3 cp "/var/backups/hse-digital/deployments/${BACKUP}.sql.gz" "s3://hse-backups/production/deployments/${BACKUP}.sql.gz"
```

### 3. Checklist

- [ ] Secrets rotated (if scheduled)
- [ ] Backup created and verified
- [ ] Backup uploaded to S3
- [ ] Infrastructure health checked
- [ ] Stakeholders notified
- [ ] Monitoring dashboards ready
- [ ] On-call team available

---

## Blue-Green Deployment

### Step 1: Identify Active Environment

```bash
ACTIVE=$(kubectl get svc hse-app-service -n hse-production -o jsonpath='{.spec.selector.slot}')
TARGET=$([[ "$ACTIVE" == "blue" ]] && echo "green" || echo "blue")
echo "Active: $ACTIVE | Target: $TARGET"
```

### Step 2: Deploy to Inactive

```bash
IMAGE="ghcr.io/org/hse-digital:v1.5.0"
kubectl set image deployment/prod-hse-app-${TARGET} app=$IMAGE -n hse-production
kubectl rollout status deployment/prod-hse-app-${TARGET} -n hse-production --timeout=10m
kubectl wait --for=condition=Ready --timeout=300s pod -l app=hse-app,slot=${TARGET} -n hse-production
```

### Step 3: Run Migrations

```bash
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-$(date +%s)
  namespace: hse-production
spec:
  template:
    spec:
      containers:
      - name: migration
        image: $IMAGE
        command: ["npx", "prisma", "migrate", "deploy"]
        envFrom:
        - secretRef:
            name: hse-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF
```

### Step 4: Smoke Tests

```bash
kubectl port-forward -n hse-production deployment/prod-hse-app-${TARGET} 8080:3001 &
PID=$!
sleep 5
curl -f http://localhost:8080/api/health || { kill $PID; exit 1; }
kill $PID
```

### Step 5: Switch Traffic

```bash
kubectl patch svc hse-app-service -n hse-production -p '{"spec":{"selector":{"slot":"'${TARGET}'"}} }'
echo "Traffic switched to $TARGET"
```

### Step 6: Monitor

```bash
for i in {1..30}; do
  kubectl logs -l app=hse-app,slot=${TARGET} -n hse-production --tail=10
  sleep 10
done
```

---

## Database Migrations

### Strategy 1: Forward-Compatible (Recommended)

```bash
npx prisma migrate deploy
kubectl set image deployment/prod-hse-app app=$NEW_IMAGE
```

### Strategy 2: With Downtime

```bash
kubectl scale deployment/prod-hse-app --replicas=0 -n hse-production
npx prisma migrate deploy
kubectl set image deployment/prod-hse-app app=$NEW_IMAGE
kubectl scale deployment/prod-hse-app --replicas=3 -n hse-production
```

### Rollback Scenarios

#### Failed Migration

```bash
kubectl logs $MIGRATION_JOB -n hse-production
```

#### Migration Succeeded, App Incompatible

```bash
cat server/prisma/migrations/<name>/down.sql | kubectl exec -i postgres-0 -n hse-production -- psql -U hse_admin -d hse_platform
kubectl rollout undo deployment/prod-hse-app -n hse-production
```

---

## Monitoring Verification

### Health Checks

```bash
curl https://api.hse.com/api/live
curl https://api.hse.com/api/ready
curl https://api.hse.com/api/health
```

### Prometheus Metrics

```bash
curl 'http://prometheus:9090/api/v1/query?query=up{job="hse-digital"}'
curl 'http://prometheus:9090/api/v1/query?query=rate(hse_digital_http_requests_total[5m])'
curl 'http://prometheus:9090/api/v1/query?query=rate(hse_digital_http_request_errors_total[5m])'
```

---

## Incident Response

### Severity Levels

- **P0 (Critical)**: Service down - RTO: 15 min
- **P1 (High)**: Major impairment - RTO: 1 hour
- **P2 (Medium)**: Minor impairment - RTO: 4 hours
- **P3 (Low)**: Cosmetic - RTO: 24 hours

### Failure Mode 1: Pods Crashing

**Symptoms**: CrashLoopBackOff, 5xx errors

**Diagnosis**:
```bash
kubectl get pods -n hse-production
kubectl describe pod <pod-name> -n hse-production
kubectl logs <pod-name> -n hse-production --previous
```

**Resolution**:
```bash
kubectl rollout undo deployment/prod-hse-app -n hse-production
```

### Failure Mode 2: Database Connection Issues

**Symptoms**: Connection refused, too many clients

**Diagnosis**:
```bash
kubectl exec postgres-0 -n hse-production -- pg_isready
kubectl exec postgres-0 -n hse-production -- psql -U hse_admin -d hse_platform -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution**:
```bash
kubectl scale deployment/prod-hse-app --replicas=1 -n hse-production
kubectl set env deployment/prod-hse-app DATABASE_POOL_SIZE=20 -n hse-production
```

### Failure Mode 3: High Error Rate

**Symptoms**: >5% errors

**Resolution**:
```bash
kubectl rollout undo deployment/prod-hse-app -n hse-production
```

### Failure Mode 4: High Latency

**Symptoms**: P95 >2s

**Resolution**:
```bash
kubectl scale deployment/prod-hse-app --replicas=5 -n hse-production
```

### Failure Mode 5: Redis Connection Failures

**Symptoms**: ECONNREFUSED

**Resolution**:
```bash
kubectl delete pod redis-0 -n hse-production
```

---

## Rollback Procedures

### Quick Rollback

```bash
kubectl rollout undo deployment/prod-hse-app -n hse-production
kubectl rollout status deployment/prod-hse-app -n hse-production
```

### Rollback to Specific Revision

```bash
kubectl rollout history deployment/prod-hse-app -n hse-production
kubectl rollout undo deployment/prod-hse-app --to-revision=2 -n hse-production
```

### Database Rollback

```bash
cat server/prisma/migrations/<migration>/down.sql | kubectl exec -i postgres-0 -n hse-production -- psql -U hse_admin -d hse_platform
```

### Full System Rollback

```bash
# 1. Stop application
kubectl scale deployment/prod-hse-app --replicas=0 -n hse-production

# 2. Restore database
./scripts/restore.sh /var/backups/hse-digital/deployments/pre-deploy-*.sql.gz

# 3. Deploy previous version
kubectl set image deployment/prod-hse-app app=ghcr.io/org/hse-digital:v1.4.0
kubectl scale deployment/prod-hse-app --replicas=3 -n hse-production
```

---

## Post-Deployment Validation

### Functional Tests

```bash
# Authentication
curl -X POST https://api.hse.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hse.com","password":"test123"}'

# Database operations
curl -H "Authorization: Bearer $TOKEN" https://api.hse.com/api/organizations

# File upload
curl -X POST https://api.hse.com/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"
```

### Performance Tests

```bash
# Load test with 100 concurrent users
ab -n 1000 -c 100 https://api.hse.com/api/health

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.hse.com/api/health
```

### Monitoring Validation

- [ ] Error rate <1%
- [ ] P95 latency <500ms
- [ ] No alerts firing
- [ ] Logs showing normal activity
- [ ] Sentry showing no new errors
- [ ] Database connections stable
- [ ] Memory usage <80%
- [ ] CPU usage <70%

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| DevOps Lead | [Phone/Email] | Primary |
| Backend Lead | [Phone/Email] | Secondary |
| CTO | [Phone/Email] | Executive |
| PagerDuty | [Phone] | 24/7 |

---

## Related Documentation

- [Backup & Disaster Recovery](./BACKUP_DISASTER_RECOVERY.md)
- [Monitoring Guide](../server/MONITORING.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Database Migration Guide](../server/prisma/README.md)
