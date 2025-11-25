#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/backup-config.sh"

LOG_FILE="$BACKUP_DIR/logs/backup-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$BACKUP_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

check_dependencies() {
    local missing_deps=()
    
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("pg_dump")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

create_backup_dirs() {
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/weekly"
    mkdir -p "$BACKUP_DIR/monthly"
    mkdir -p "$BACKUP_DIR/wal"
    mkdir -p "$BACKUP_DIR/tenant-specific"
    mkdir -p "$BACKUP_DIR/logs"
}

get_db_connection() {
    if [ "$USE_DOCKER" = true ]; then
        PGHOST="$DOCKER_CONTAINER"
        DOCKER_EXEC="docker exec -i $DOCKER_CONTAINER"
    else
        PGHOST="$DB_HOST"
        DOCKER_EXEC=""
    fi
}

create_full_backup() {
    local backup_name="$1"
    local backup_file="$BACKUP_DIR/daily/${backup_name}.sql.gz"
    local metadata_file="$BACKUP_DIR/daily/${backup_name}.metadata.json"
    
    log "Starting full database backup: $backup_name"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i "$DOCKER_CONTAINER" pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose \
            --no-owner \
            --no-acl \
            2>> "$LOG_FILE" | gzip > "$backup_file"
    else
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose \
            --no-owner \
            --no-acl \
            2>> "$LOG_FILE" | gzip > "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
        
        cat > "$metadata_file" <<EOF
{
    "backup_name": "$backup_name",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "full",
    "size": "$size",
    "checksum": "$checksum",
    "database": "$DB_NAME",
    "format": "custom",
    "compression": "gzip"
}
EOF
        
        log "Full backup completed: $backup_file ($size)"
        echo "$backup_file"
    else
        error "Full backup failed"
        return 1
    fi
}

create_tenant_backup() {
    local tenant_id="$1"
    local backup_name="tenant-${tenant_id}-$(date +%Y%m%d-%H%M%S)"
    local backup_file="$BACKUP_DIR/tenant-specific/${backup_name}.sql.gz"
    local metadata_file="$BACKUP_DIR/tenant-specific/${backup_name}.metadata.json"
    
    log "Starting tenant-specific backup: $tenant_id"
    
    local dump_script="
        \\copy (SELECT * FROM \"Organization\" WHERE id = '$tenant_id') TO STDOUT WITH CSV HEADER;
        \\copy (SELECT * FROM \"User\" WHERE \"organizationId\" = '$tenant_id') TO STDOUT WITH CSV HEADER;
        \\copy (SELECT * FROM \"Station\" WHERE \"organizationId\" = '$tenant_id') TO STDOUT WITH CSV HEADER;
        \\copy (SELECT * FROM \"Audit\" WHERE \"organizationId\" = '$tenant_id') TO STDOUT WITH CSV HEADER;
    "
    
    if [ "$USE_DOCKER" = true ]; then
        echo "$dump_script" | docker exec -i "$DOCKER_CONTAINER" psql \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            2>> "$LOG_FILE" | gzip > "$backup_file"
    else
        echo "$dump_script" | PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            2>> "$LOG_FILE" | gzip > "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
        
        cat > "$metadata_file" <<EOF
{
    "backup_name": "$backup_name",
    "tenant_id": "$tenant_id",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "tenant",
    "size": "$size",
    "checksum": "$checksum",
    "database": "$DB_NAME"
}
EOF
        
        log "Tenant backup completed: $backup_file ($size)"
        echo "$backup_file"
    else
        error "Tenant backup failed for tenant: $tenant_id"
        return 1
    fi
}

upload_to_s3() {
    local backup_file="$1"
    
    if [ "$S3_ENABLED" != true ]; then
        log "S3 upload disabled, skipping"
        return 0
    fi
    
    if [ -z "$S3_BUCKET" ]; then
        error "S3_BUCKET not configured"
        return 1
    fi
    
    log "Uploading backup to S3: $S3_BUCKET"
    
    local filename=$(basename "$backup_file")
    local s3_path="s3://$S3_BUCKET/$S3_PREFIX/$filename"
    
    if command -v aws &> /dev/null; then
        aws s3 cp "$backup_file" "$s3_path" \
            --storage-class "$S3_STORAGE_CLASS" \
            --region "$S3_REGION" \
            2>> "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            log "Successfully uploaded to S3: $s3_path"
            
            if [ -f "${backup_file}.metadata.json" ]; then
                aws s3 cp "${backup_file}.metadata.json" "${s3_path}.metadata.json" \
                    --region "$S3_REGION" \
                    2>> "$LOG_FILE"
            fi
        else
            error "Failed to upload to S3"
            return 1
        fi
    else
        error "AWS CLI not found, cannot upload to S3"
        return 1
    fi
}

rotate_backups() {
    log "Starting backup rotation"
    
    find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +$DAILY_RETENTION -delete
    find "$BACKUP_DIR/daily" -name "*.metadata.json" -mtime +$DAILY_RETENTION -delete
    log "Removed daily backups older than $DAILY_RETENTION days"
    
    find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +$WEEKLY_RETENTION -delete
    find "$BACKUP_DIR/weekly" -name "*.metadata.json" -mtime +$WEEKLY_RETENTION -delete
    log "Removed weekly backups older than $WEEKLY_RETENTION days"
    
    find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +$MONTHLY_RETENTION -delete
    find "$BACKUP_DIR/monthly" -name "*.metadata.json" -mtime +$MONTHLY_RETENTION -delete
    log "Removed monthly backups older than $MONTHLY_RETENTION days"
    
    find "$BACKUP_DIR/tenant-specific" -name "*.sql.gz" -mtime +$TENANT_RETENTION -delete
    find "$BACKUP_DIR/tenant-specific" -name "*.metadata.json" -mtime +$TENANT_RETENTION -delete
    log "Removed tenant backups older than $TENANT_RETENTION days"
    
    find "$BACKUP_DIR/logs" -name "*.log" -mtime +30 -delete
    log "Removed logs older than 30 days"
}

promote_weekly_backup() {
    local latest_daily=$(ls -t "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null | head -1)
    
    if [ -n "$latest_daily" ]; then
        local weekly_name="weekly-$(date +%Y-W%V).sql.gz"
        cp "$latest_daily" "$BACKUP_DIR/weekly/$weekly_name"
        cp "${latest_daily%.sql.gz}.metadata.json" "$BACKUP_DIR/weekly/${weekly_name%.sql.gz}.metadata.json"
        log "Promoted daily backup to weekly: $weekly_name"
    fi
}

promote_monthly_backup() {
    local latest_weekly=$(ls -t "$BACKUP_DIR/weekly"/*.sql.gz 2>/dev/null | head -1)
    
    if [ -n "$latest_weekly" ]; then
        local monthly_name="monthly-$(date +%Y-%m).sql.gz"
        cp "$latest_weekly" "$BACKUP_DIR/monthly/$monthly_name"
        cp "${latest_weekly%.sql.gz}.metadata.json" "$BACKUP_DIR/monthly/${monthly_name%.sql.gz}.metadata.json"
        log "Promoted weekly backup to monthly: $monthly_name"
    fi
}

verify_backup() {
    local backup_file="$1"
    local metadata_file="${backup_file%.sql.gz}.metadata.json"
    
    if [ ! -f "$metadata_file" ]; then
        error "Metadata file not found: $metadata_file"
        return 1
    fi
    
    local stored_checksum=$(jq -r '.checksum' "$metadata_file")
    local actual_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    
    if [ "$stored_checksum" = "$actual_checksum" ]; then
        log "Backup verification successful: $backup_file"
        return 0
    else
        error "Backup verification failed: checksum mismatch"
        return 1
    fi
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        local subject="[HSE Backup] $status"
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL" 2>> "$LOG_FILE" || true
    fi
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\"}" \
            2>> "$LOG_FILE" || true
    fi
}

main() {
    log "=========================================="
    log "Starting backup process"
    log "=========================================="
    
    check_dependencies
    create_backup_dirs
    get_db_connection
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    if [ "${1:-}" = "--tenant" ] && [ -n "${2:-}" ]; then
        local tenant_id="$2"
        backup_file=$(create_tenant_backup "$tenant_id")
    else
        backup_file=$(create_full_backup "$backup_name")
    fi
    
    if [ $? -eq 0 ]; then
        verify_backup "$backup_file"
        
        if [ "$S3_ENABLED" = true ]; then
            upload_to_s3 "$backup_file"
        fi
        
        if [ "$(date +%u)" -eq 7 ]; then
            promote_weekly_backup
        fi
        
        if [ "$(date +%d)" -eq 01 ]; then
            promote_monthly_backup
        fi
        
        rotate_backups
        
        log "=========================================="
        log "Backup completed successfully"
        log "=========================================="
        
        send_notification "SUCCESS" "Backup completed: $backup_name"
    else
        error "Backup process failed"
        send_notification "FAILED" "Backup failed: $backup_name"
        exit 1
    fi
}

main "$@"
