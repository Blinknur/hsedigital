#!/bin/bash

set -e

echo "╔═══════════════════════════════════════════════╗"
echo "║  HSE.Digital E2E Test Runner                 ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

COMPOSE_FILE="docker-compose.test.yml"
TEST_ENV=${TEST_ENV:-"docker"}

cleanup() {
    echo ""
    echo "🧹 Cleaning up test environment..."
    docker-compose -f $COMPOSE_FILE down -v 2>/dev/null || true
}

trap cleanup EXIT

if [ "$TEST_ENV" = "docker" ]; then
    echo "🐳 Starting test environment with Docker..."
    echo ""
    
    docker-compose -f $COMPOSE_FILE down -v 2>/dev/null || true
    
    echo "📦 Building containers..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    echo "🚀 Starting services..."
    docker-compose -f $COMPOSE_FILE up -d
    
    echo "⏳ Waiting for services to be healthy..."
    ATTEMPTS=0
    MAX_ATTEMPTS=60
    
    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
        if docker-compose -f $COMPOSE_FILE ps | grep -q "healthy"; then
            HEALTHY_COUNT=$(docker-compose -f $COMPOSE_FILE ps | grep -c "healthy" || echo "0")
            if [ "$HEALTHY_COUNT" -ge 2 ]; then
                echo "✅ Services are healthy"
                break
            fi
        fi
        
        ATTEMPTS=$((ATTEMPTS + 1))
        if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
            echo "❌ Services did not become healthy in time"
            docker-compose -f $COMPOSE_FILE logs
            exit 1
        fi
        
        echo "  Attempt $ATTEMPTS/$MAX_ATTEMPTS..."
        sleep 2
    done
    
    echo ""
    echo "🔧 Pushing Prisma schema..."
    docker-compose -f $COMPOSE_FILE exec -T app-test npx prisma db push --skip-generate || {
        echo "❌ Failed to push Prisma schema"
        docker-compose -f $COMPOSE_FILE logs app-test
        exit 1
    }
    
    echo ""
    echo "🧪 Running E2E tests..."
    echo ""
    
    docker-compose -f $COMPOSE_FILE exec -T app-test npm run test:e2e
    TEST_EXIT_CODE=$?
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo ""
        echo "✅ All tests passed!"
    else
        echo ""
        echo "❌ Tests failed with exit code $TEST_EXIT_CODE"
        echo ""
        echo "📋 Application logs:"
        docker-compose -f $COMPOSE_FILE logs app-test
    fi
    
    exit $TEST_EXIT_CODE
    
elif [ "$TEST_ENV" = "local" ]; then
    echo "🏠 Running tests against local environment..."
    echo ""
    
    if ! curl -s http://localhost:3001/api/health > /dev/null; then
        echo "❌ Local service is not running at http://localhost:3001"
        echo "   Start it with: npm run dev"
        exit 1
    fi
    
    echo "✅ Local service is running"
    echo ""
    echo "🧪 Running E2E tests..."
    echo ""
    
    cd server
    npm run test:e2e
    
else
    echo "❌ Invalid TEST_ENV: $TEST_ENV"
    echo "   Valid options: docker, local"
    exit 1
fi
