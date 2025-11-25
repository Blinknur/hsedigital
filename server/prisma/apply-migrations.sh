#!/bin/bash

# Apply Prisma migrations script
# Usage: ./apply-migrations.sh [up|down]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

echo "🚀 Prisma Migration Runner"
echo "============================"
echo ""

if [ "$1" == "down" ] || [ "$1" == "rollback" ]; then
    echo "⚠️  Rolling back migrations..."
    echo ""
    
    # Rollback in reverse order
    migrations=(
        "20240101000002_add_tenant_indexes"
        "20240101000001_add_organization_stripe_fields"
        "20240101000000_add_user_auth_fields"
    )
    
    for migration in "${migrations[@]}"; do
        if [ -f "$MIGRATIONS_DIR/$migration/down.sql" ]; then
            echo "⬇️  Rolling back: $migration"
            psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/$migration/down.sql"
            echo "✅ Rolled back: $migration"
            echo ""
        else
            echo "⚠️  No down migration found for: $migration"
            echo ""
        fi
    done
    
    echo "✅ All migrations rolled back successfully!"
    
elif [ "$1" == "up" ] || [ "$1" == "apply" ] || [ -z "$1" ]; then
    echo "⬆️  Applying migrations..."
    echo ""
    
    # Apply in order
    migrations=(
        "20240101000000_add_user_auth_fields"
        "20240101000001_add_organization_stripe_fields"
        "20240101000002_add_tenant_indexes"
    )
    
    for migration in "${migrations[@]}"; do
        if [ -f "$MIGRATIONS_DIR/$migration/migration.sql" ]; then
            echo "⬆️  Applying: $migration"
            psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/$migration/migration.sql"
            echo "✅ Applied: $migration"
            echo ""
        else
            echo "❌ Migration file not found: $migration"
            exit 1
        fi
    done
    
    echo "✅ All migrations applied successfully!"
    
else
    echo "Usage: $0 [up|down]"
    echo ""
    echo "  up, apply    - Apply all migrations (default)"
    echo "  down, rollback - Rollback all migrations"
    exit 1
fi
