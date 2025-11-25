# Backup Testing Procedures

## Overview

Regular testing of backup and restore procedures is critical to ensure data recoverability and minimize downtime during disaster scenarios.

## Testing Schedule

| Test Type | Frequency | Duration | Responsibility |
|-----------|-----------|----------|----------------|
| Integrity Check | Daily | 5 min | Automated |
| Restore Test | Weekly | 30 min | DevOps |
| DR Drill | Monthly | 2 hours | Team Lead |
| Full DR Test | Quarterly | 4 hours | CTO/Team |

---

## Daily Integrity Check

**Automated via cron**

```bash
#!/bin/bash
# /etc/cron.daily/backup-integrity-check

BACKUP_DIR="/var/backups/hse-digital"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/daily/*.sql.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found" | mail -s "Backup Alert" admin@company.com
    exit 1
fi

./scripts/restore.sh --verify-only "$LATEST_BACKUP"

if [ $? -eq 0 ]; then
    echo "Backup integrity verified: $LATEST_BACKUP"
else
    echo "ERROR: Backup integrity check failed" | mail -s "Backup Alert" admin@company.com
    exit 1
fi
```

---

## Weekly Restore Test

**Every Sunday at 4 AM**

### Automated Test Script

```bash
#!/bin/bash
# scripts/weekly-backup-test.sh

set -euo pipefail

BACKUP_DIR="/var/backups/hse-digital"
TEST_DB="hse_platform_test"
LOG_FILE="/var/log/backup-test-$(date +%Y%m%d).log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# 1. Find latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/daily/*.sql.gz | head -1)
log "Testing backup: $LATEST_BACKUP"

# 2. Verify integrity
log "Step 1: Verifying backup integrity"
./scripts/restore.sh --verify-only "$LATEST_BACKUP"
if [ $? -ne 0 ]; then
    error "Integrity check failed"
    exit 1
fi
log "✓ Integrity verified"

# 3. Restore to test database
log "Step 2: Restoring to test database"
./scripts/restore.sh --target-db "$TEST_DB" --no-pre-backup "$LATEST_BACKUP"
if [ $? -ne 0 ]; then
    error "Restore failed"
    exit 1
fi
log "✓ Restore completed"

# 4. Validate data
log "Step 3: Validating data"
USER_COUNT=$(docker-compose exec -T postgres psql -U hse_admin -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"User\";")
ORG_COUNT=$(docker-compose exec -T postgres psql -U hse_admin -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"Organization\";")

log "Users: $USER_COUNT"
log "Organizations: $ORG_COUNT"

if [ $USER_COUNT -lt 1 ]; then
    error "Data validation failed: No users found"
    exit 1
fi
log "✓ Data validated"

# 5. Test queries
log "Step 4: Testing sample queries"
docker-compose exec -T postgres psql -U hse_admin -d "$TEST_DB" -c "SELECT id, email, role FROM \"User\" LIMIT 5;" >> "$LOG_FILE"
log "✓ Queries successful"

# 6. Cleanup
log "Step 5: Cleaning up test database"
docker-compose exec -T postgres psql -U hse_admin -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;"
log "✓ Cleanup completed"

log "=========================================="
log "Weekly backup test PASSED"
log "=========================================="

# Send success notification
echo "Weekly backup test passed for $LATEST_BACKUP" | mail -s "Backup Test Success" admin@company.com
```

### Add to crontab

```bash
# Weekly backup test - Sunday at 4 AM
0 4 * * 0 /path/to/scripts/weekly-backup-test.sh
```

---

## Monthly DR Drill

**First Monday of each month**

### Preparation (1 week before)

- [ ] Review and update DR documentation
- [ ] Schedule 2-hour maintenance window
- [ ] Notify stakeholders
- [ ] Prepare test scenarios
- [ ] Verify backup availability

### DR Drill Procedure

#### 1. Pre-Drill Checklist

```bash
# Verify current system state
docker-compose ps
curl http://localhost:3001/api/health

# List available backups
./scripts/restore.sh --list

# Select test backup (1 week old)
DRILL_BACKUP="/var/backups/hse-digital/weekly/weekly-YYYY-WXX.sql.gz"
```

#### 2. Simulate Disaster

```bash
# Stop application (simulating failure)
docker-compose stop app postgres

# Optionally: Remove data volume (destructive test)
# docker volume rm hse_postgres_data
```

#### 3. Execute Recovery

**Start timer** ⏱️

```bash
START_TIME=$(date +%s)

# Step 1: Verify backup integrity (2 min)
./scripts/restore.sh --verify-only "$DRILL_BACKUP"

# Step 2: Start database service
docker-compose up -d postgres

# Step 3: Wait for database ready
until docker-compose exec postgres pg_isready; do sleep 2; done

# Step 4: Restore database (15-30 min depending on size)
./scripts/restore.sh --no-pre-backup "$DRILL_BACKUP"

# Step 5: Start application services
docker-compose up -d app

# Step 6: Verify health
sleep 10
curl http://localhost:3001/api/health

END_TIME=$(date +%s)
RECOVERY_TIME=$((END_TIME - START_TIME))
```

#### 4. Validation Tests

```bash
# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test123"}'

# Test data retrieval
curl http://localhost:3001/api/stations \
  -H "Authorization: Bearer <token>"

# Test database queries
docker-compose exec postgres psql -U hse_admin -d hse_platform \
  -c "SELECT COUNT(*) FROM \"User\";"
docker-compose exec postgres psql -U hse_admin -d hse_platform \
  -c "SELECT COUNT(*) FROM \"Organization\";"
docker-compose exec postgres psql -U hse_admin -d hse_platform \
  -c "SELECT COUNT(*) FROM \"Audit\";"
```

#### 5. Performance Testing

```bash
# Basic load test (optional)
ab -n 100 -c 10 http://localhost:3001/api/health

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/stations
```

#### 6. DR Drill Report

Record the following metrics:

```markdown
## DR Drill Report - [Date]

### Metrics
- **Recovery Time Objective (RTO)**: [actual] vs [target: 2 hours]
- **Recovery Point Objective (RPO)**: [actual data loss] vs [target: 24 hours]
- **Backup Size**: [size]
- **Restore Duration**: [duration]
- **Validation Time**: [duration]

### Test Results
- [ ] Backup integrity verified
- [ ] Database restored successfully
- [ ] Application started successfully
- [ ] Authentication working
- [ ] Data queries successful
- [ ] API endpoints responsive

### Issues Encountered
1. [Issue description]
   - Impact: [severity]
   - Resolution: [how resolved]
   
### Lessons Learned
- [Learning 1]
- [Learning 2]

### Action Items
- [ ] [Action item 1] - [Owner] - [Due date]
- [ ] [Action item 2] - [Owner] - [Due date]

### Sign-off
- Drill Lead: [Name] [Date]
- CTO: [Name] [Date]
```

---

## Quarterly Full DR Test

**End of each quarter**

### Full Environment Rebuild

#### 1. Setup Clean Environment

```bash
# On new/isolated server or staging environment

# Clone repository
git clone https://github.com/your-org/hse-digital.git
cd hse-digital

# Build from scratch
docker-compose build --no-cache

# Verify services start
docker-compose up -d
```

#### 2. Restore from Off-Site Backup

```bash
# Download from S3
aws s3 cp s3://backup-bucket/backups/hse-digital/monthly/monthly-YYYY-MM.sql.gz ./

# Restore
./scripts/restore.sh --no-pre-backup monthly-YYYY-MM.sql.gz
```

#### 3. Full Application Validation

```bash
# Test all critical endpoints
./tests/integration-tests.sh

# Manual UAT
- [ ] User login
- [ ] Create organization
- [ ] Create audit
- [ ] Generate report
- [ ] File upload
- [ ] Email notifications
```

#### 4. Load Testing

```bash
# Install k6 or similar tool
curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz -L | tar xvz

# Run load test
k6 run load-test.js
```

#### 5. Security Verification

```bash
# Run security scan
docker run --rm -v $(pwd):/src aquasec/trivy fs /src

# Verify HTTPS
curl -I https://staging.hse.digital

# Check headers
curl -I http://localhost:3001/api/health
```

---

## Test Scenarios

### Scenario 1: Single Table Recovery

**Objective**: Restore a single table without full restore

```bash
# 1. Export table from backup
docker-compose exec postgres pg_restore \
  -U hse_admin \
  -d temp_db \
  --table="Audit" \
  backup.dump

# 2. Dump specific table
docker-compose exec postgres pg_dump \
  -U hse_admin \
  -d temp_db \
  -t "Audit" \
  > audit_table.sql

# 3. Restore to production
docker-compose exec -T postgres psql \
  -U hse_admin \
  -d hse_platform \
  < audit_table.sql
```

### Scenario 2: Tenant Data Recovery

**Objective**: Restore single tenant without affecting others

```bash
# 1. Backup target tenant
TENANT_ID="abc123"
./scripts/backup.sh --tenant $TENANT_ID

# 2. Simulate data loss
docker-compose exec postgres psql -U hse_admin -d hse_platform \
  -c "DELETE FROM \"Audit\" WHERE \"organizationId\" = '$TENANT_ID';"

# 3. Restore tenant
./scripts/restore.sh --tenant $TENANT_ID \
  /var/backups/hse-digital/tenant-specific/tenant-$TENANT_ID-latest.sql.gz

# 4. Verify
docker-compose exec postgres psql -U hse_admin -d hse_platform \
  -c "SELECT COUNT(*) FROM \"Audit\" WHERE \"organizationId\" = '$TENANT_ID';"
```

### Scenario 3: Ransomware Response

**Objective**: Recover from compromised system

```bash
# 1. Isolate system
docker-compose down
# Disconnect network

# 2. Forensic backup (if safe)
dd if=/dev/sda1 of=/external/forensic.img

# 3. Clean rebuild on new infrastructure
# (Use clean server with fresh OS)

# 4. Restore from known-good backup (pre-breach)
./scripts/restore.sh /backup/offsite/pre-breach-backup.sql.gz

# 5. Apply all security updates
apt-get update && apt-get upgrade -y

# 6. Rotate all credentials
./scripts/rotate-secrets.sh

# 7. Monitor for anomalies
./scripts/monitor-activity.sh
```

---

## Success Criteria

### Backup Health

- [ ] Daily backups completing successfully
- [ ] All backups pass integrity checks
- [ ] S3 uploads successful (if enabled)
- [ ] Storage capacity >20% free
- [ ] Backup logs clean (no errors)

### Restore Capability

- [ ] Restore completes within RTO (2 hours)
- [ ] Data loss within RPO (24 hours)
- [ ] Application fully functional after restore
- [ ] All data tables present and queryable
- [ ] No data corruption detected

### Team Readiness

- [ ] DR documentation up-to-date
- [ ] Team trained on procedures
- [ ] Contact lists current
- [ ] Escalation paths defined
- [ ] Lessons learned incorporated

---

## Failure Response

### If Test Fails

1. **Document the failure**
   - What failed
   - When it failed
   - Error messages
   - System state

2. **Immediate containment**
   - Stop further testing
   - Preserve evidence
   - Alert team lead

3. **Root cause analysis**
   - Review logs
   - Check configurations
   - Verify dependencies

4. **Remediation plan**
   - Fix identified issues
   - Update procedures
   - Re-test

5. **Post-mortem**
   - Team review
   - Process improvements
   - Documentation updates

---

## Continuous Improvement

### Metrics to Track

- Recovery time trends
- Backup size trends
- Failure rates
- Test coverage
- Team response times

### Quarterly Review

- Review all test results
- Identify patterns
- Update procedures
- Train team members
- Adjust schedules/scopes

---

## Compliance Documentation

Maintain records of:

- All test executions
- Results and metrics
- Issues and resolutions
- Sign-offs and approvals
- Procedure updates

Required for:
- SOC 2 audits
- ISO 27001 compliance
- Customer due diligence
- Insurance requirements
