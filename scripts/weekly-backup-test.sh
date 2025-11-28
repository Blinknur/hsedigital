#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hse-digital}"
TEST_DB="hse_platform_test"
LOG_FILE="/tmp/backup-test-$(date +%Y%m%d).log"
DB_USER="${DB_USER:-hse_admin}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

log "==========================================="
log "Starting weekly backup test"
log "==========================================="

LATEST_BACKUP=$(ls -t $BACKUP_DIR/daily/*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    error "No backup found in $BACKUP_DIR/daily/"
    exit 1
fi

log "Testing backup: $LATEST_BACKUP"

log "Step 1: Verifying backup integrity"
./scripts/restore.sh --verify-only "$LATEST_BACKUP"
if [ $? -ne 0 ]; then
    error "Integrity check failed"
    exit 1
fi
log "✓ Integrity verified"

log "Step 2: Restoring to test database"
./scripts/restore.sh --target-db "$TEST_DB" --no-pre-backup "$LATEST_BACKUP"
if [ $? -ne 0 ]; then
    error "Restore failed"
    exit 1
fi
log "✓ Restore completed"

log "Step 3: Validating data"
USER_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ')
ORG_COUNT=$(psql -U "$DB_USER" -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM \"Organization\";" 2>/dev/null | tr -d ' ')

log "Users: $USER_COUNT"
log "Organizations: $ORG_COUNT"

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    error "Data validation failed: No users found"
    exit 1
fi
log "✓ Data validated"

log "Step 4: Testing sample queries"
psql -U "$DB_USER" -d "$TEST_DB" -c "SELECT id, email, role FROM \"User\" LIMIT 5;" >> "$LOG_FILE" 2>&1
log "✓ Queries successful"

log "Step 5: Cleaning up test database"
psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null
log "✓ Cleanup completed"

log "==========================================="
log "Weekly backup test PASSED"
log "==========================================="
log "Results logged to: $LOG_FILE"

exit 0
