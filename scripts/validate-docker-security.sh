#!/bin/bash

# Docker Security Validation Script
# Validates production Docker security configurations

set -e

CONTAINER_NAME="${1:-hse_app}"
COMPOSE_FILE="${2:-docker/docker-compose.yml}"

echo "🔍 Validating Docker Security Configuration for: $CONTAINER_NAME"
echo "=================================================="

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container $CONTAINER_NAME is not running"
    echo "   Start it with: docker-compose -f $COMPOSE_FILE up -d"
    exit 1
fi

echo "✅ Container is running"

# 1. Check read-only filesystem
echo ""
echo "1️⃣  Checking read-only filesystem..."
if docker inspect $CONTAINER_NAME | grep -q '"ReadonlyRootfs": true'; then
    echo "✅ Read-only root filesystem: ENABLED"
else
    echo "❌ Read-only root filesystem: DISABLED"
fi

# 2. Check non-root user
echo ""
echo "2️⃣  Checking non-root user..."
USER=$(docker exec $CONTAINER_NAME whoami 2>/dev/null || echo "root")
if [ "$USER" != "root" ]; then
    echo "✅ Running as non-root user: $USER"
else
    echo "❌ Running as root user"
fi

# 3. Check user ID
echo ""
echo "3️⃣  Checking user ID..."
UID=$(docker exec $CONTAINER_NAME id -u 2>/dev/null || echo "0")
if [ "$UID" = "1000" ]; then
    echo "✅ User ID: $UID (correct)"
else
    echo "⚠️  User ID: $UID (expected 1000)"
fi

# 4. Check capabilities
echo ""
echo "4️⃣  Checking security capabilities..."
if docker inspect $CONTAINER_NAME | grep -q '"CapDrop": \["ALL"\]'; then
    echo "✅ All capabilities dropped"
else
    echo "⚠️  Not all capabilities dropped"
fi

if docker inspect $CONTAINER_NAME | grep -q 'NET_BIND_SERVICE'; then
    echo "✅ NET_BIND_SERVICE capability added"
else
    echo "⚠️  NET_BIND_SERVICE not found"
fi

# 5. Check no-new-privileges
echo ""
echo "5️⃣  Checking no-new-privileges..."
if docker inspect $CONTAINER_NAME | grep -q 'no-new-privileges:true'; then
    echo "✅ no-new-privileges: ENABLED"
else
    echo "⚠️  no-new-privileges: DISABLED"
fi

# 6. Check writable volumes
echo ""
echo "6️⃣  Checking writable volumes..."
EXPECTED_VOLUMES=(
    "/app/server/public/uploads"
    "/app/server/public/reports"
    "/app/logs"
    "/tmp/app"
)

for vol in "${EXPECTED_VOLUMES[@]}"; do
    if docker exec $CONTAINER_NAME test -w "$vol" 2>/dev/null; then
        echo "✅ Writable: $vol"
    else
        echo "❌ Not writable: $vol"
    fi
done

# 7. Test read-only enforcement
echo ""
echo "7️⃣  Testing read-only filesystem enforcement..."
if docker exec $CONTAINER_NAME touch /app/test.txt 2>/dev/null; then
    echo "❌ Can write to read-only location (SECURITY ISSUE)"
else
    echo "✅ Cannot write to read-only location"
fi

# 8. Check Node.js memory configuration
echo ""
echo "8️⃣  Checking Node.js memory configuration..."
MAX_OLD_SPACE=$(docker exec $CONTAINER_NAME node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024)" 2>/dev/null || echo "0")
if [ "${MAX_OLD_SPACE%.*}" -le 550 ] && [ "${MAX_OLD_SPACE%.*}" -ge 500 ]; then
    echo "✅ Heap size limit: ${MAX_OLD_SPACE%.*}MB (configured correctly)"
else
    echo "⚠️  Heap size limit: ${MAX_OLD_SPACE%.*}MB (expected ~512MB)"
fi

# 9. Check resource limits
echo ""
echo "9️⃣  Checking resource limits..."
CPU_LIMIT=$(docker inspect $CONTAINER_NAME --format='{{.HostConfig.NanoCpus}}' | awk '{print $1/1000000000}')
MEM_LIMIT=$(docker inspect $CONTAINER_NAME --format='{{.HostConfig.Memory}}' | awk '{print $1/1024/1024/1024}')

if [ "$CPU_LIMIT" != "0" ]; then
    echo "✅ CPU limit: ${CPU_LIMIT} cores"
else
    echo "⚠️  No CPU limit set"
fi

if [ "$MEM_LIMIT" != "0" ]; then
    echo "✅ Memory limit: ${MEM_LIMIT}GB"
else
    echo "⚠️  No memory limit set"
fi

# 10. Check environment variables
echo ""
echo "🔟 Checking required environment variables..."
REQUIRED_VARS=("JWT_SECRET" "REFRESH_SECRET" "NODE_ENV")

for var in "${REQUIRED_VARS[@]}"; do
    if docker exec $CONTAINER_NAME printenv "$var" >/dev/null 2>&1; then
        echo "✅ $var: SET"
    else
        echo "❌ $var: NOT SET"
    fi
done

# Summary
echo ""
echo "=================================================="
echo "✨ Validation Complete!"
echo ""
echo "Next steps:"
echo "  - Review any warnings or failures above"
echo "  - Check container logs: docker logs $CONTAINER_NAME"
echo "  - Monitor resources: docker stats $CONTAINER_NAME"
echo "  - Test graceful shutdown: docker stop $CONTAINER_NAME"
echo ""
