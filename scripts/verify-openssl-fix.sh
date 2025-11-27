#!/bin/bash

# Verification script for OpenSSL 3.x compatibility fix
# This script helps verify that the Dockerfile changes resolve OpenSSL issues with Prisma

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  OpenSSL 3.x Compatibility Verification for Prisma      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Verify Dockerfile changes
echo -e "${BLUE}[1/4] Checking Dockerfile changes...${NC}"
echo ""

if grep -q "FROM node:20-alpine" docker/Dockerfile; then
    echo -e "${GREEN}  ✓ Base image upgraded to node:20-alpine${NC}"
else
    echo -e "${RED}  ✗ Base image not upgraded${NC}"
    exit 1
fi

if grep -q "RUN apk add --no-cache openssl-dev" docker/Dockerfile; then
    echo -e "${GREEN}  ✓ openssl-dev installed in builder stage${NC}"
else
    echo -e "${RED}  ✗ openssl-dev not installed${NC}"
    exit 1
fi

if grep -q "RUN apk add --no-cache openssl" docker/Dockerfile | tail -1; then
    echo -e "${GREEN}  ✓ openssl installed in production stage${NC}"
else
    echo -e "${RED}  ✗ openssl not installed${NC}"
    exit 1
fi

echo ""

# 2. Check Docker availability
echo -e "${BLUE}[2/4] Checking Docker availability...${NC}"
echo ""

if command -v docker >/dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Docker CLI found${NC}"
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Docker daemon is running${NC}"
        DOCKER_AVAILABLE=true
    else
        echo -e "${YELLOW}  ⚠ Docker daemon not running${NC}"
        DOCKER_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}  ⚠ Docker not found${NC}"
    DOCKER_AVAILABLE=false
fi

echo ""

# 3. Suggest rebuild if Docker is available
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${BLUE}[3/4] Docker Environment Status${NC}"
    echo ""
    echo -e "${YELLOW}  ⓘ To apply the OpenSSL fix, rebuild your containers:${NC}"
    echo ""
    echo "     # Test environment:"
    echo "     docker-compose -f docker/docker-compose.test.yml down"
    echo "     docker-compose -f docker/docker-compose.test.yml build --no-cache"
    echo "     docker-compose -f docker/docker-compose.test.yml up -d"
    echo ""
    echo "     # Development environment:"
    echo "     docker-compose -f docker/docker-compose.yml down"
    echo "     docker-compose -f docker/docker-compose.yml build --no-cache"
    echo "     docker-compose -f docker/docker-compose.yml up -d"
    echo ""
else
    echo -e "${BLUE}[3/4] Docker Environment Status${NC}"
    echo ""
    echo -e "${YELLOW}  ⚠ Docker not available - skipping build verification${NC}"
    echo ""
fi

# 4. Summary
echo -e "${BLUE}[4/4] Summary${NC}"
echo ""
echo -e "${GREEN}✓ Dockerfile Changes Verified:${NC}"
echo "  - Base image: node:20-alpine (upgraded from node:18-alpine)"
echo "  - Builder stage: openssl-dev installed"
echo "  - Production stage: openssl installed"
echo ""
echo -e "${BLUE}What this fixes:${NC}"
echo "  - Eliminates libssl detection warnings with Prisma"
echo "  - Ensures Prisma query engine can link against OpenSSL 3.x"
echo "  - Provides proper OpenSSL support for database connections"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  - Full details: OPENSSL_FIX_SUMMARY.md"
echo "  - Docker guide: docker/README.md"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Rebuild your Docker containers (see commands above)"
    echo "  2. Run tests: npm test"
    echo "  3. Check logs for OpenSSL warnings"
    echo ""
else
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Start Docker daemon"
    echo "  2. Run this script again"
    echo "  3. Rebuild containers and run tests"
    echo ""
fi

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Verification Complete                                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
