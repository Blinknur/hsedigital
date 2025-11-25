#!/bin/bash

# ========================================
# Apply RLS Migration Script
# ========================================

set -e

echo "========================================="
echo "PostgreSQL Row-Level Security Migration"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Example: export DATABASE_URL='postgresql://user:password@host:5432/hse_platform'"
    exit 1
fi

# Parse DATABASE_URL
DB_URL=$DATABASE_URL

echo "Step 1: Checking database connection..."
psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
    exit 1
fi

echo ""
echo "Step 2: Applying RLS migration..."
psql "$DB_URL" -f "$(dirname "$0")/001_rls_policies.sql"

if [ $? -eq 0 ]; then
    echo "✓ RLS migration applied successfully"
else
    echo "✗ RLS migration failed"
    exit 1
fi

echo ""
echo "Step 3: Verifying RLS is enabled..."
RESULT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;")
RLS_COUNT=$(echo $RESULT | xargs)

if [ "$RLS_COUNT" -gt 0 ]; then
    echo "✓ RLS enabled on $RLS_COUNT tables"
else
    echo "✗ RLS not enabled on any tables"
    exit 1
fi

echo ""
echo "Step 4: Verifying database roles..."
ROLE_CHECK=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_roles WHERE rolname IN ('hse_app_role', 'hse_admin_role');")
ROLE_COUNT=$(echo $ROLE_CHECK | xargs)

if [ "$ROLE_COUNT" -eq 2 ]; then
    echo "✓ Database roles created (hse_app_role, hse_admin_role)"
else
    echo "⚠ Warning: Expected 2 roles, found $ROLE_COUNT"
fi

echo ""
echo "========================================="
echo "RLS Migration Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Update DATABASE_URL to use hse_app_role:"
echo "   postgresql://hse_app_role:password@host:5432/hse_platform"
echo ""
echo "2. Update application code to set organization context:"
echo "   await prisma.\$executeRaw\`SET LOCAL app.current_organization_id = \${orgId}\`;"
echo ""
echo "3. Run RLS tests:"
echo "   psql \$DATABASE_URL -f prisma/migrations/test_rls.sql"
echo ""
echo "4. Review RLS_ARCHITECTURE.md for integration details"
echo ""
