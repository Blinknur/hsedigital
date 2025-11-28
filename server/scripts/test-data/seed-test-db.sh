#!/bin/bash

# Seed Test Database Script
# Seeds the test database with realistic multi-tenant test data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🌱 HSE Digital - Test Data Seeding"
echo "=================================="
echo ""

# Check if we're running in a container
if [ -f /.dockerenv ]; then
    echo "📦 Running in container"
    NODE_ENV=test node "$SERVER_DIR/tests/seeders/seed-test-data.js"
else
    echo "💻 Running locally"
    
    # Check if TEST_DATABASE_URL is set
    if [ -z "$TEST_DATABASE_URL" ]; then
        echo "⚠️  TEST_DATABASE_URL not set, using DATABASE_URL"
    fi
    
    cd "$SERVER_DIR"
    NODE_ENV=test node tests/seeders/seed-test-data.js
fi

echo ""
echo "✅ Test data seeding completed!"
