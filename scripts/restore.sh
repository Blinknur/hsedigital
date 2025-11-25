#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/backup-config.sh"

LOG_FILE="$BACKUP_DIR/logs/restore-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$BACKUP_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS] <backup_file>

Options:
    --list                  List available backups
    --tenant <id>          Restore tenant-specific backup
    --pitr <timestamp>     Point-in-time restore
    --target-db <name>     Target database name
    --verify-only          Only verify backup integrity
    --no-pre-backup        Skip pre-restore safety backup
    --help                 Show this help message

Examples:
    $0 --list
    $0 /var/backups/hse-digital/daily/backup-20240101.sql.gz
    $0 --tenant abc123 /var/backups/hse-digital/tenant-specific/tenant-abc123.sql.gz
EOF
    exit 1
}

check_dependencies() {
    local missing_deps=()
    
    if ! command -v pg_restore &> /dev/null; then
        missing_deps+=("pg_restore")
    fi
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("psql")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
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

verify_backup_integrity() {
    local backup_file="$1"
    local metadata_file="${backup_file%.sql.gz}.metadata.json"
    
    log "Verifying backup integrity: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    if [ ! -f "$metadata_file" ]; then
        log "Warning: Metadata file not found"
        return 0
    fi
    
    local stored_checksum=$(jq -r '.checksum' "$metadata_file")
    local actual_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    
    if [ "$stored_checksum" = "$actual_checksum" ]; then
        log "Backup integrity verified"
        return 0
    else
        error "Backup integrity check failed"
        return 1
    fi
}

create_pre_restore_backup() {
    log "Creating pre-restore backup"
    
    local pre_restore_backup="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i "$DOCKER_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --compress=9 2>> "$LOG_FILE" | gzip > "$pre_restore_backup"
    else
        PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --format=custom --compress=9 2>> "$LOG_FILE" | gzip > "$pre_restore_backup"
    fi
    
    if [ $? -eq 0 ]; then
        log "Pre-restore backup created: $pre_restore_backup"
        echo "$pre_restore_backup"
    else
        error "Failed to create pre-restore backup"
        return 1
    fi
}

terminate_connections() {
    local target_db="$1"
    
    log "Terminating active connections to: $target_db"
    
    local terminate_sql="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$target_db' AND pid <> pg_backend_pid();"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d postgres -c "$terminate_sql" 2>> "$LOG_FILE"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "$terminate_sql" 2>> "$LOG_FILE"
    fi
    
    sleep 2
}

restore_full_backup() {
    local backup_file="$1"
    local target_db="${2:-$DB_NAME}"
    
    log "Starting full restore to: $target_db"
    
    terminate_connections "$target_db"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $target_db;" 2>> "$LOG_FILE"
        docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $target_db;" 2>> "$LOG_FILE"
        gunzip -c "$backup_file" | docker exec -i "$DOCKER_CONTAINER" pg_restore -U "$DB_USER" -d "$target_db" --verbose --no-owner --no-acl 2>> "$LOG_FILE"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $target_db;" 2>> "$LOG_FILE"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $target_db;" 2>> "$LOG_FILE"
        gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" --verbose --no-owner --no-acl 2>> "$LOG_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        log "Full restore completed"
        return 0
    else
        error "Full restore failed"
        return 1
    fi
}

restore_tenant_backup() {
    local backup_file="$1"
    local tenant_id="$2"
    
    log "Starting tenant restore: $tenant_id"
    
    local cleanup_sql="DELETE FROM \"Audit\" WHERE \"organizationId\" = '$tenant_id'; DELETE FROM \"Station\" WHERE \"organizationId\" = '$tenant_id'; DELETE FROM \"User\" WHERE \"organizationId\" = '$tenant_id'; DELETE FROM \"Organization\" WHERE id = '$tenant_id';"
    
    if [ "$USE_DOCKER" = true ]; then
        echo "$cleanup_sql" | docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>> "$LOG_FILE"
        gunzip -c "$backup_file" | docker exec -i "$DOCKER_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>> "$LOG_FILE"
    else
        echo "$cleanup_sql" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>> "$LOG_FILE"
        gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>> "$LOG_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        log "Tenant restore completed"
        return 0
    else
        error "Tenant restore failed"
        return 1
    fi
}

point_in_time_restore() {
    local backup_file="$1"
    local target_time="$2"
    local target_db="${3:-${DB_NAME}_pitr}"
    
    log "Starting PITR to: $target_time"
    
    restore_full_backup "$backup_file" "$target_db"
    
    if [ $? -ne 0 ]; then
        error "Failed to restore base backup for PITR"
        return 1
    fi
    
    log "PITR base completed. Full PITR requires WAL archiving."
    return 0
}

list_available_backups() {
    echo "Available Backups"
    echo "================="
    
    echo ""
    echo "Daily:"
    for backup in "$BACKUP_DIR/daily"/*.sql.gz; do
        [ -f "$backup" ] && echo "  $(basename "$backup") - $(du -h "$backup" | cut -f1)"
    done
    
    echo ""
    echo "Weekly:"
    for backup in "$BACKUP_DIR/weekly"/*.sql.gz; do
        [ -f "$backup" ] && echo "  $(basename "$backup") - $(du -h "$backup" | cut -f1)"
    done
    
    echo ""
    echo "Monthly:"
    for backup in "$BACKUP_DIR/monthly"/*.sql.gz; do
        [ -f "$backup" ] && echo "  $(basename "$backup") - $(du -h "$backup" | cut -f1)"
    done
    
    echo ""
    echo "Tenant-Specific:"
    for backup in "$BACKUP_DIR/tenant-specific"/*.sql.gz; do
        [ -f "$backup" ] && echo "  $(basename "$backup") - $(du -h "$backup" | cut -f1)"
    done
}

main() {
    log "Starting restore process"
    
    BACKUP_FILE=""
    TENANT_ID=""
    TARGET_TIME=""
    TARGET_DB="$DB_NAME"
    VERIFY_ONLY=false
    CREATE_PRE_BACKUP=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --list)
                list_available_backups
                exit 0
                ;;
            --tenant)
                TENANT_ID="$2"
                shift 2
                ;;
            --pitr)
                TARGET_TIME="$2"
                shift 2
                ;;
            --target-db)
                TARGET_DB="$2"
                shift 2
                ;;
            --verify-only)
                VERIFY_ONLY=true
                shift
                ;;
            --no-pre-backup)
                CREATE_PRE_BACKUP=false
                shift
                ;;
            --help)
                usage
                ;;
            *)
                BACKUP_FILE="$1"
                shift
                ;;
        esac
    done
    
    if [ -z "$BACKUP_FILE" ] && [ "$VERIFY_ONLY" = false ]; then
        error "No backup file specified"
        usage
    fi
    
    check_dependencies
    get_db_connection
    
    verify_backup_integrity "$BACKUP_FILE"
    
    if [ "$VERIFY_ONLY" = true ]; then
        exit 0
    fi
    
    if [ "$CREATE_PRE_BACKUP" = true ]; then
        create_pre_restore_backup
    fi
    
    if [ -n "$TENANT_ID" ]; then
        restore_tenant_backup "$BACKUP_FILE" "$TENANT_ID"
    elif [ -n "$TARGET_TIME" ]; then
        point_in_time_restore "$BACKUP_FILE" "$TARGET_TIME" "$TARGET_DB"
    else
        restore_full_backup "$BACKUP_FILE" "$TARGET_DB"
    fi
    
    if [ $? -eq 0 ]; then
        log "Restore completed successfully"
    else
        error "Restore failed"
        exit 1
    fi
}

main "$@"
