# Backup and Disaster Recovery Guide

## Overview

This document provides comprehensive guidance on database backup, restoration, and disaster recovery procedures for HSE.Digital platform.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Backup Scripts](#backup-scripts)
3. [Restore Procedures](#restore-procedures)
4. [Disaster Recovery](#disaster-recovery)
5. [Monitoring](#monitoring)
6. [Testing Procedures](#testing-procedures)

---

## Backup Strategy

### Backup Types

1. **Full Backups** - Complete database dumps
   - Daily at 2:00 AM UTC
   - Retention: 7 days
   - Location: `/var/backups/hse-digital/daily/`

2. **Weekly Backups** - Promoted from daily
   - Every Sunday
   - Retention: 30 days
   - Location: `/var/backups/hse-digital/weekly/`

3. **Monthly Backups** - Promoted from weekly
   - First day of each month
   - Retention: 365 days
   - Location: `/var/backups/hse-digital/monthly/`

4. **Tenant-Specific Backups** - Organization-level backups
   - On-demand or scheduled
   - Retention: 90 days
   - Location: `/var/backups/hse-digital/tenant-specific/`

### Storage Locations

- **Local**: `/var/backups/hse-digital/` (Docker volume: `hse_backup_data`)
- **Off-site**: S3-compatible storage (optional)

---

## Backup Scripts

### Configuration

Edit `scripts/backup-config.sh`:

```bash
export BACKUP_DIR="/var/backups/hse-digital"
export USE_DOCKER="true"
export DOCKER_CONTAINER="hse_db"

export DB_HOST="localhost"
export DB_PORT="5432"
export DB_USER="hse_admin"
export DB_PASSWORD="your_password"
export DB_NAME="hse_platform"

export DAILY_RETENTION="7"
export WEEKLY_RETENTION="30"
export MONTHLY_RETENTION="365"
export TENANT_RETENTION="90"

export S3_ENABLED="false"
export S3_BUCKET="my-backup-bucket"
export S3_PREFIX="backups/hse-digital"
export S3_REGION="us-east-1"
export S3_STORAGE_CLASS="STANDARD_IA"

export NOTIFICATION_EMAIL=""
export NOTIFICATION_WEBHOOK=""
```

### Running Backups

#### Full Database Backup

```bash
./scripts/backup.sh
```

#### Tenant-Specific Backup

```bash
./scripts/backup.sh --tenant <tenant_id>
```

### Automated Backups with Cron

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/hse-backup.log 2>&1

# Weekly cleanup on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/backup.sh --cleanup
```

### S3 Integration

#### Prerequisites

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
```

#### Enable S3 Backups

```bash
# In backup-config.sh
export S3_ENABLED="true"
export S3_BUCKET="my-company-backups"
export S3_PREFIX="hse-digital"
export S3_REGION="us-east-1"
```

---

## Restore Procedures

### List Available Backups

```bash
./scripts/restore.sh --list
```

### Full Database Restore

#### Standard Restore (Overwrites Existing DB)

```bash
./scripts/restore.sh /var/backups/hse-digital/daily/backup-20240101-120000.sql.gz
```

#### Restore to Different Database

```bash
./scripts/restore.sh --target-db hse_platform_test /var/backups/hse-digital/daily/backup-20240101.sql.gz
```

#### Skip Pre-Restore Backup

```bash
./scripts/restore.sh --no-pre-backup /var/backups/hse-digital/daily/backup-20240101.sql.gz
```

### Tenant-Specific Restore

```bash
./scripts/restore.sh --tenant abc123 /var/backups/hse-digital/tenant-specific/tenant-abc123-20240101.sql.gz
```

### Point-in-Time Recovery (PITR)

```bash
./scripts/restore.sh --pitr "2024-01-01 12:00:00" /var/backups/hse-digital/daily/backup-20240101.sql.gz
```

**Note**: Full PITR requires WAL (Write-Ahead Logging) archiving to be configured.

### Verify Backup Integrity

```bash
./scripts/restore.sh --verify-only /var/backups/hse-digital/daily/backup-20240101.sql.gz
```

---

## Disaster Recovery

### Scenarios and Runbooks

#### Scenario 1: Complete Database Loss

**Severity**: Critical  
**RTO**: 2 hours  
**RPO**: 24 hours

**Steps**:

1. **Assess the situation**
   ```bash
   docker ps
   docker logs hse_db
   ```

2. **Stop application services**
   ```bash
   docker-compose stop app
   ```

3. **Identify latest backup**
   ```bash
   ./scripts/restore.sh --list
   ```

4. **Restore database**
   ```bash
   ./scripts/restore.sh /var/backups/hse-digital/daily/backup-latest.sql.gz
   ```

5. **Verify restoration**
   ```bash
   docker-compose exec postgres psql -U hse_admin -d hse_platform -c "SELECT COUNT(*) FROM \"User\";"
   ```

6. **Restart services**
   ```bash
   docker-compose start app
   curl http://localhost:3001/api/health
   ```

7. **Notify stakeholders**

#### Scenario 2: Data Corruption (Single Tenant)

**Severity**: High  
**RTO**: 1 hour  
**RPO**: 24 hours

**Steps**:

1. **Identify affected tenant**
   ```bash
   # Get tenant ID from support ticket
   TENANT_ID="abc123"
   ```

2. **Create current state backup**
   ```bash
   ./scripts/backup.sh --tenant $TENANT_ID
   ```

3. **Restore tenant from backup**
   ```bash
   ./scripts/restore.sh --tenant $TENANT_ID /var/backups/hse-digital/tenant-specific/tenant-${TENANT_ID}-latest.sql.gz
   ```

4. **Verify restoration**
   ```bash
   docker-compose exec postgres psql -U hse_admin -d hse_platform -c "SELECT * FROM \"Organization\" WHERE id = '$TENANT_ID';"
   ```

5. **Notify tenant**

#### Scenario 3: Accidental Data Deletion

**Severity**: Medium  
**RTO**: 30 minutes  
**RPO**: 1 hour (if recent backup exists)

**Steps**:

1. **Stop writes immediately**
   ```bash
   docker-compose stop app
   ```

2. **Create forensic backup**
   ```bash
   ./scripts/backup.sh
   ```

3. **Restore to test database**
   ```bash
   ./scripts/restore.sh --target-db hse_platform_recovery /var/backups/hse-digital/daily/backup-before-deletion.sql.gz
   ```

4. **Extract deleted data**
   ```bash
   docker-compose exec postgres pg_dump -U hse_admin -d hse_platform_recovery -t specific_table > deleted_data.sql
   ```

5. **Restore data to production**
   ```bash
   docker-compose exec -T postgres psql -U hse_admin -d hse_platform < deleted_data.sql
   ```

6. **Verify and restart services**

#### Scenario 4: Ransomware/Security Breach

**Severity**: Critical  
**RTO**: 4 hours  
**RPO**: 24 hours

**Steps**:

1. **Immediate isolation**
   ```bash
   docker-compose down
   # Disconnect from network if necessary
   ```

2. **Forensic analysis**
   - Preserve logs
   - Document timeline
   - Identify entry point

3. **Build clean environment**
   ```bash
   # On new/clean server
   git clone <repository>
   docker-compose build --no-cache
   ```

4. **Restore from known-good backup**
   ```bash
   # Use backup from before breach
   ./scripts/restore.sh /var/backups/hse-digital/weekly/backup-pre-breach.sql.gz
   ```

5. **Apply security patches**

6. **Change all credentials**
   ```bash
   # Update JWT secrets, database passwords, API keys
   ```

7. **Gradual service restoration with monitoring**

---

## Monitoring

### Backup Health API

Check backup status via API:

```bash
curl http://localhost:3001/api/backup/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "status": "healthy",
  "backupDir": "/var/backups/hse-digital",
  "accessible": true,
  "lastBackup": "2024-01-15T02:00:00Z",
  "totalBackups": 45,
  "dailyCount": 7,
  "weeklyCount": 4,
  "monthlyCount": 12,
  "tenantCount": 22,
  "totalSize": "2.5GB"
}
```

### Monitoring Checklist

- [ ] Daily backup completion
- [ ] Backup file integrity (checksums)
- [ ] Storage capacity (>20% free space)
- [ ] S3 upload success (if enabled)
- [ ] Restore test (weekly)
- [ ] Log rotation

### Alerts Configuration

Configure alerts for:

1. **Backup Failure** - Failed backup execution
2. **Missing Backup** - No backup in last 26 hours
3. **Checksum Mismatch** - Backup integrity failure
4. **Low Storage** - <20% free space
5. **S3 Upload Failure** - Cloud backup failure

---

## Testing Procedures

### Weekly Backup Test

**Frequency**: Weekly  
**Duration**: 30 minutes

```bash
#!/bin/bash
# Weekly backup test procedure

# 1. List recent backups
./scripts/restore.sh --list

# 2. Select latest daily backup
LATEST_BACKUP=$(ls -t /var/backups/hse-digital/daily/*.sql.gz | head -1)

# 3. Verify integrity
./scripts/restore.sh --verify-only "$LATEST_BACKUP"

# 4. Restore to test database
./scripts/restore.sh --target-db hse_test --no-pre-backup "$LATEST_BACKUP"

# 5. Validate data
docker-compose exec postgres psql -U hse_admin -d hse_test -c "SELECT COUNT(*) FROM \"User\";"
docker-compose exec postgres psql -U hse_admin -d hse_test -c "SELECT COUNT(*) FROM \"Organization\";"

# 6. Cleanup
docker-compose exec postgres psql -U hse_admin -d postgres -c "DROP DATABASE hse_test;"

echo "✓ Backup test completed successfully"
```

### Monthly DR Drill

**Frequency**: Monthly  
**Duration**: 2 hours

1. **Simulate disaster scenario**
2. **Execute recovery runbook**
3. **Measure RTO/RPO**
4. **Document lessons learned**
5. **Update procedures**

### Quarterly Full DR Test

**Frequency**: Quarterly  
**Duration**: 4 hours

1. **Complete environment rebuild**
2. **Restore from off-site backup**
3. **Full application validation**
4. **Load testing**
5. **Security verification**
6. **Stakeholder review**

---

## Security Best Practices

1. **Encrypt backups at rest**
   ```bash
   # Add to backup script
   gpg --encrypt --recipient backup@company.com backup.sql.gz
   ```

2. **Encrypt backups in transit** (S3 uses HTTPS by default)

3. **Restrict backup access**
   ```bash
   chmod 700 /var/backups/hse-digital
   chown postgres:postgres /var/backups/hse-digital
   ```

4. **Audit backup access**
   ```bash
   # Log all backup operations
   auditctl -w /var/backups/hse-digital -p war -k backup_access
   ```

5. **Test restore procedures regularly**

6. **Maintain off-site backups**

7. **Document and version procedures**

---

## Troubleshooting

### Backup Fails with "Permission Denied"

```bash
# Fix permissions
sudo chown -R $(whoami):$(whoami) /var/backups/hse-digital
chmod +x scripts/backup.sh scripts/restore.sh
```

### "pg_dump: command not found"

```bash
# Install PostgreSQL client tools
sudo apt-get install postgresql-client-15
```

### S3 Upload Fails

```bash
# Verify AWS credentials
aws s3 ls s3://your-bucket/

# Check IAM permissions (requires s3:PutObject)
```

### Restore Takes Too Long

```bash
# Use parallel restore
pg_restore -j 4 -U hse_admin -d hse_platform backup.dump
```

### Checksum Mismatch

```bash
# Backup may be corrupted
# Try previous backup
# Investigate disk issues
```

---

## Compliance and Retention

### Regulatory Requirements

- **GDPR**: 30-day retention minimum
- **SOC 2**: Point-in-time recovery capability
- **HIPAA**: Encrypted backups, audit trail
- **ISO 27001**: Regular testing, documented procedures

### Retention Policy

| Backup Type | Retention | Reason |
|------------|-----------|--------|
| Daily | 7 days | Recent changes |
| Weekly | 30 days | Monthly rollback |
| Monthly | 365 days | Annual compliance |
| Tenant | 90 days | Customer requests |

---

## Emergency Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| DBA Lead | [Name] | [Phone/Email] | Primary |
| DevOps Lead | [Name] | [Phone/Email] | Secondary |
| CTO | [Name] | [Phone/Email] | Executive |
| Support Hotline | - | [Phone] | 24/7 |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-15 | 1.0 | Initial DR documentation |

---

## References

- PostgreSQL Backup Documentation: https://www.postgresql.org/docs/current/backup.html
- AWS S3 Best Practices: https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-for-s3.html
- Disaster Recovery Planning: https://www.ready.gov/business/emergency-plans/continuity-planning
