#!/bin/bash

export BACKUP_DIR="${BACKUP_DIR:-/var/backups/hse-digital}"

export USE_DOCKER="${USE_DOCKER:-true}"
export DOCKER_CONTAINER="${DOCKER_CONTAINER:-hse_db}"

export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_USER="${DB_USER:-hse_admin}"
export DB_PASSWORD="${DB_PASSWORD:-dev_password_123}"
export DB_NAME="${DB_NAME:-hse_platform}"

export DAILY_RETENTION="${DAILY_RETENTION:-7}"
export WEEKLY_RETENTION="${WEEKLY_RETENTION:-30}"
export MONTHLY_RETENTION="${MONTHLY_RETENTION:-365}"
export TENANT_RETENTION="${TENANT_RETENTION:-90}"

export S3_ENABLED="${S3_ENABLED:-false}"
export S3_BUCKET="${S3_BUCKET:-}"
export S3_PREFIX="${S3_PREFIX:-backups/hse-digital}"
export S3_REGION="${S3_REGION:-us-east-1}"
export S3_STORAGE_CLASS="${S3_STORAGE_CLASS:-STANDARD_IA}"

export NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"
export NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK:-}"
