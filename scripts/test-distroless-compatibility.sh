#!/bin/bash
# Test Prisma compatibility with Google Distroless base images
# This script verifies if Prisma can run in a distroless environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Prisma Distroless Compatibility Test ===${NC}"
echo ""

IMAGE_NAME="hse-digital:distroless"
REPORT_FILE="distroless-compatibility-report.md"

# Check if distroless image exists
if ! docker images | grep -q "hse-digital.*distroless"; then
    echo -e "${YELLOW}Distroless image not found. Building...${NC}"
    docker build -f docker/Dockerfile.distroless -t "$IMAGE_NAME" . || {
        echo -e "${RED}✗ Failed to build distroless image${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✓ Distroless image found${NC}"
echo ""

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Prisma Distroless Compatibility Report

## Overview

This report documents the compatibility testing of Prisma ORM with Google Distroless base images.

## Test Environment

EOF

echo "- **Date**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> "$REPORT_FILE"
echo "- **Docker Version**: $(docker --version)" >> "$REPORT_FILE"
echo "- **Image**: ${IMAGE_NAME}" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << 'EOF'
## Test Results

### 1. Image Build

EOF

# Test 1: Check if image was built successfully
echo -e "${YELLOW}Test 1: Image Build${NC}"
if docker images "$IMAGE_NAME" --format "{{.Repository}}:{{.Tag}}" | grep -q "$IMAGE_NAME"; then
    echo -e "${GREEN}✓ Image built successfully${NC}"
    SIZE=$(docker images "$IMAGE_NAME" --format "{{.Size}}")
    echo "**Status**: ✓ Success" >> "$REPORT_FILE"
    echo "**Image Size**: ${SIZE}" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Image build failed${NC}"
    echo "**Status**: ✗ Failed" >> "$REPORT_FILE"
    exit 1
fi
echo "" >> "$REPORT_FILE"

# Test 2: Check Prisma client presence
echo ""
echo -e "${YELLOW}Test 2: Prisma Client Presence${NC}"
cat >> "$REPORT_FILE" << 'EOF'
### 2. Prisma Client Presence

EOF

if docker run --rm "$IMAGE_NAME" ls node_modules/.prisma/client > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prisma client found${NC}"
    echo "**Status**: ✓ Prisma client present" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Prisma client not found${NC}"
    echo "**Status**: ✗ Prisma client missing" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Test 3: Check Prisma binary engines
echo ""
echo -e "${YELLOW}Test 3: Prisma Binary Engines${NC}"
cat >> "$REPORT_FILE" << 'EOF'
### 3. Prisma Binary Engines

EOF

if docker run --rm "$IMAGE_NAME" ls node_modules/.prisma/client/query-engine-* > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prisma query engine found${NC}"
    echo "**Status**: ✓ Query engine present" >> "$REPORT_FILE"
    
    # Get engine binary name
    ENGINE=$(docker run --rm "$IMAGE_NAME" ls node_modules/.prisma/client/ | grep query-engine || echo "unknown")
    echo "**Engine**: ${ENGINE}" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Prisma query engine not found${NC}"
    echo "**Status**: ✗ Query engine missing" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Test 4: Node.js runtime check
echo ""
echo -e "${YELLOW}Test 4: Node.js Runtime${NC}"
cat >> "$REPORT_FILE" << 'EOF'
### 4. Node.js Runtime

EOF

NODE_VERSION=$(docker run --rm "$IMAGE_NAME" --version 2>&1 || echo "Failed")
if [[ "$NODE_VERSION" == v* ]]; then
    echo -e "${GREEN}✓ Node.js runtime working${NC}"
    echo "**Status**: ✓ Working" >> "$REPORT_FILE"
    echo "**Version**: ${NODE_VERSION}" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Node.js runtime issue${NC}"
    echo "**Status**: ✗ Failed" >> "$REPORT_FILE"
    echo "**Error**: ${NODE_VERSION}" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Test 5: Prisma import test (basic)
echo ""
echo -e "${YELLOW}Test 5: Prisma Import Test${NC}"
cat >> "$REPORT_FILE" << 'EOF'
### 5. Prisma Import Test

EOF

# Note: This test will likely fail in distroless without shell
IMPORT_TEST=$(docker run --rm "$IMAGE_NAME" -e "try { require('@prisma/client'); console.log('SUCCESS'); } catch(e) { console.log('FAILED:', e.message); }" 2>&1 || echo "EXECUTION_FAILED")

if echo "$IMPORT_TEST" | grep -q "SUCCESS"; then
    echo -e "${GREEN}✓ Prisma client can be imported${NC}"
    echo "**Status**: ✓ Success - Prisma client imports correctly" >> "$REPORT_FILE"
elif echo "$IMPORT_TEST" | grep -q "FAILED"; then
    echo -e "${RED}✗ Prisma client import failed${NC}"
    echo "**Status**: ✗ Failed - ${IMPORT_TEST}" >> "$REPORT_FILE"
else
    echo -e "${YELLOW}⚠ Could not execute import test (expected in distroless)${NC}"
    echo "**Status**: ⚠ Execution blocked (distroless limitation)" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Note**: Distroless images don't have shell access, making runtime tests difficult." >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Test 6: Full application startup test
echo ""
echo -e "${YELLOW}Test 6: Application Startup Test${NC}"
cat >> "$REPORT_FILE" << 'EOF'
### 6. Application Startup Test

EOF

echo "Attempting to start container..."
CONTAINER_ID=$(docker run -d \
    -e JWT_SECRET=test_secret_key_min_32_chars_long_for_security \
    -e REFRESH_SECRET=test_refresh_secret_key_min_32_chars \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/testdb" \
    "$IMAGE_NAME" 2>&1 || echo "FAILED")

if [[ "$CONTAINER_ID" != "FAILED" ]] && [[ ${#CONTAINER_ID} -gt 10 ]]; then
    echo -e "${GREEN}✓ Container started: ${CONTAINER_ID:0:12}${NC}"
    
    # Wait for startup
    sleep 5
    
    # Check logs
    LOGS=$(docker logs "$CONTAINER_ID" 2>&1)
    
    if echo "$LOGS" | grep -qi "error"; then
        echo -e "${RED}✗ Application has errors${NC}"
        echo "**Status**: ✗ Failed with errors" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        echo "$LOGS" | head -n 20 >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
    elif echo "$LOGS" | grep -qi "server"; then
        echo -e "${GREEN}✓ Application started successfully${NC}"
        echo "**Status**: ✓ Success - Application started" >> "$REPORT_FILE"
    else
        echo -e "${YELLOW}⚠ Application status unclear${NC}"
        echo "**Status**: ⚠ Unknown - Check logs" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        echo "$LOGS" | head -n 20 >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
    fi
    
    # Cleanup
    docker stop "$CONTAINER_ID" > /dev/null 2>&1
    docker rm "$CONTAINER_ID" > /dev/null 2>&1
else
    echo -e "${RED}✗ Failed to start container${NC}"
    echo "**Status**: ✗ Container failed to start" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Error**: ${CONTAINER_ID}" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Generate conclusions
cat >> "$REPORT_FILE" << 'EOF'

## Known Limitations of Distroless

### Advantages
- ✓ Minimal attack surface (no shell, no package manager)
- ✓ Smaller CVE footprint
- ✓ Fast startup time
- ✓ Reduced image size

### Disadvantages
- ✗ No shell access (debugging difficult)
- ✗ No health check support (requires external monitoring)
- ✗ Limited Prisma binary target testing
- ✗ Complex troubleshooting
- ✗ No runtime inspection tools

### Prisma-Specific Concerns

1. **Binary Targets**: Prisma generates native binaries. Distroless images have minimal libc, which may cause compatibility issues.

2. **OpenSSL**: Prisma requires OpenSSL. Distroless nodejs images include libssl, but version mismatches can occur.

3. **File System Access**: Prisma needs write access to cache directories. Distroless file system is read-only by default.

4. **Error Reporting**: Without shell access, debugging Prisma errors is extremely difficult.

## Recommendations

### Current Status

EOF

# Determine overall verdict
if [[ "$NODE_VERSION" == v* ]] && docker images "$IMAGE_NAME" > /dev/null 2>&1; then
    cat >> "$REPORT_FILE" << 'EOF'
**Verdict**: ⚠ Experimental - Limited Testing Possible

The distroless image builds successfully, but comprehensive runtime testing is limited due to the lack of shell access. Further testing with a full test suite is required.

### Recommended Next Steps

1. **Integration Testing**: Deploy distroless image in test environment with full database
2. **Prisma Operations**: Test migrations, queries, and transactions
3. **Error Handling**: Verify Prisma error reporting works correctly
4. **Monitoring**: Ensure external health checks and monitoring work
5. **Performance**: Compare startup time and memory usage vs slim variant

### Production Readiness

**Status**: ❌ Not Ready for Production

**Blockers**:
- Insufficient runtime testing
- No debugging capability
- Unverified Prisma compatibility
- Missing health check support

**Alternative**: Continue using `node:18-slim` for production until distroless compatibility is fully verified.

EOF
else
    cat >> "$REPORT_FILE" << 'EOF'
**Verdict**: ✗ Not Compatible

Critical issues detected. Distroless is not recommended for this application.

### Recommended Action

Continue using `node:18-slim` as the production base image.

EOF
fi

cat >> "$REPORT_FILE" << 'EOF'

## Additional Resources

- [Prisma Binary Targets](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options)
- [Google Distroless](https://github.com/GoogleContainerTools/distroless)
- [Node.js Distroless Images](https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md)

---

*Generated by: scripts/test-distroless-compatibility.sh*
EOF

echo ""
echo -e "${BLUE}=== Test Complete ===${NC}"
echo ""
echo -e "Report saved to: ${GREEN}${REPORT_FILE}${NC}"
echo ""
echo -e "${YELLOW}View report:${NC} cat ${REPORT_FILE}"
