# Database Backup & Disaster Recovery

## Quick Start

### Prerequisites

- Docker and Docker Compose
- PostgreSQL client tools (pg_dump, pg_restore)
- jq (for JSON parsing)
- AWS CLI (optional, for S3 backups)

### Setup

1. **Configure backup settings**:
   ```bash
   cp .env.example .env
   # Edit BACKUP_DIR, S3_* variables in .env
   ```

2. **Create backup directory**:
   ```bash
   sudo mkdir -p /var/backups/hse-digital
   sudo chown $(whoami):$(whoami) /var/backups/hse-digital
   ```

3. **Make scripts executable**:
   ```bash
   chmod +x scripts/backup.sh scripts/restore.sh scripts/weekly-backup-test.sh
   ```

### Basic Usage

#### Run Manual Backup

```bash
# Full database backup
npm run backup

# Tenant-specific backup
npm run backup:tenant abc123
```

#### List Available Backups

```bash
npm run restore:list
```

#### Restore Database

```bash
npm run restore /var/backups/hse-digital/daily/backup-20240101-120000.sql.gz
```

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/hse-digital && npm run backup >> /var/log/hse-backup.log 2>&1

# Weekly test on Sunday at 4 AM
0 4 * * 0 cd /path/to/hse-digital && npm run backup:test
```

## Documentation

- **[Complete DR Guide](docs/BACKUP_DISASTER_RECOVERY.md)** - Full disaster recovery procedures and runbooks
- **[Testing Procedures](docs/BACKUP_TESTING.md)** - Backup testing and validation procedures

## API Endpoints

### Check Backup Health

```bash
curl http://localhost:3001/api/backup/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Trigger Backup

```bash
curl -X POST http://localhost:3001/api/backup/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "abc123"}'
```

### List Backups

```bash
curl http://localhost:3001/api/backup/list?type=daily \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Verify Backup

```bash
curl -X POST http://localhost:3001/api/backup/verify/backup-20240101.sql.gz \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Backup Strategy

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Daily | Every day @ 2 AM | 7 days | `/var/backups/hse-digital/daily/` |
| Weekly | Every Sunday | 30 days | `/var/backups/hse-digital/weekly/` |
| Monthly | 1st of month | 365 days | `/var/backups/hse-digital/monthly/` |
| Tenant | On-demand | 90 days | `/var/backups/hse-digital/tenant-specific/` |

## S3 Integration

### Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure
aws configure
```

### Enable in Configuration

Edit `scripts/backup-config.sh`:

```bash
export S3_ENABLED="true"
export S3_BUCKET="my-company-backups"
export S3_REGION="us-east-1"
export S3_PREFIX="hse-digital/backups"
```

## Recovery Scenarios

### Full Database Loss

```bash
# 1. List available backups
./scripts/restore.sh --list

# 2. Restore from latest backup
./scripts/restore.sh /var/backups/hse-digital/daily/backup-latest.sql.gz

# 3. Verify
docker-compose exec postgres psql -U hse_admin -d hse_platform -c "SELECT COUNT(*) FROM \"User\";"
```

### Tenant Data Recovery

```bash
# Restore specific tenant
./scripts/restore.sh --tenant abc123 /var/backups/hse-digital/tenant-specific/tenant-abc123.sql.gz
```

### Point-in-Time Recovery

```bash
# Restore to specific timestamp
./scripts/restore.sh --pitr "2024-01-01 12:00:00" /var/backups/hse-digital/daily/backup-20240101.sql.gz
```

## Testing

### Weekly Automated Test

```bash
npm run backup:test
```

### Manual Verification

```bash
# Verify backup integrity
./scripts/restore.sh --verify-only /var/backups/hse-digital/daily/backup-latest.sql.gz

# Test restore to temporary database
./scripts/restore.sh --target-db hse_test /var/backups/hse-digital/daily/backup-latest.sql.gz
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/api/backup/health
```

Expected response:
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

### Set Up Alerts

Configure monitoring for:
- Backup failures
- Missing backups (>26 hours)
- Checksum mismatches
- Low storage space (<20%)
- S3 upload failures

## Troubleshooting

### "Permission denied"

```bash
sudo chown -R $(whoami):$(whoami) /var/backups/hse-digital
chmod +x scripts/*.sh
```

### "pg_dump: command not found"

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client-15

# macOS
brew install postgresql@15
```

### Backup too large

```bash
# Use streaming compression
docker exec hse_db pg_dump -U hse_admin -d hse_platform | gzip -9 > backup.sql.gz
```

### S3 upload fails

```bash
# Verify credentials
aws s3 ls

# Check IAM permissions (needs s3:PutObject)
```

## Security

### Encrypt Backups

```bash
# Add to backup script
gpg --encrypt --recipient backup@company.com backup.sql.gz
```

### Restrict Access

```bash
chmod 700 /var/backups/hse-digital
chown postgres:postgres /var/backups/hse-digital
```

### Audit Logging

```bash
# Track backup access
sudo auditctl -w /var/backups/hse-digital -p war -k backup_access
sudo ausearch -k backup_access
```

## Compliance

- **GDPR**: 30-day minimum retention
- **SOC 2**: Point-in-time recovery capability
- **HIPAA**: Encrypted backups, audit trail
- **ISO 27001**: Regular testing, documented procedures

## Support

For issues or questions:
- Check logs: `/var/backups/hse-digital/logs/`
- Review documentation: `docs/BACKUP_DISASTER_RECOVERY.md`
- Contact: DevOps team

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial backup system implementation |
