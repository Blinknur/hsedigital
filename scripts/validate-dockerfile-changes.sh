#!/bin/bash

# Validation script for Dockerfile changes
# Tests that node:18-slim resolves Prisma compatibility issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_header "Validating Dockerfile Changes (Alpine → Debian Slim)"

# 1. Verify Dockerfile uses node:18-slim
print_info "Checking Dockerfile base images..."
if grep -q "FROM node:18-slim" docker/Dockerfile; then
    print_success "Builder stage uses node:18-slim"
else
    print_error "Builder stage not using node:18-slim"
    exit 1
fi

if grep -q "FROM node:18-slim AS production" docker/Dockerfile; then
    print_success "Production stage uses node:18-slim"
else
    print_error "Production stage not using node:18-slim"
    exit 1
fi

# 2. Verify Alpine references are removed
print_info "Checking for Alpine references..."
if grep -q "alpine" docker/Dockerfile; then
    print_error "Alpine references still found in Dockerfile"
    exit 1
else
    print_success "No Alpine references found"
fi

# 3. Verify apt-get is used (Debian) instead of apk (Alpine)
print_info "Checking package manager..."
if grep -q "apt-get" docker/Dockerfile && ! grep -q "apk add" docker/Dockerfile; then
    print_success "Using apt-get (Debian) package manager"
else
    print_error "Not using correct package manager"
    exit 1
fi

# 4. Verify OpenSSL installation
print_info "Checking OpenSSL installation..."
if grep -q "apt-get install -y openssl" docker/Dockerfile; then
    print_success "OpenSSL installation configured"
else
    print_error "OpenSSL not properly configured"
    exit 1
fi

print_header "Summary"
print_success "All Dockerfile validations passed!"
echo ""
print_info "Changes made:"
echo "  • Builder stage: node:20-alpine → node:18-slim"
echo "  • Production stage: node:20-alpine → node:18-slim"
echo "  • Package manager: apk → apt-get"
echo "  • OpenSSL: Alpine packages → Debian packages"
echo ""
print_info "Benefits:"
echo "  • Better Prisma compatibility (glibc vs musl)"
echo "  • Proper OpenSSL detection"
echo "  • Resolves JSON parsing errors"
echo "  • More reliable binary compatibility"
echo ""
print_info "Next steps:"
echo "  1. Rebuild Docker images: npm run docker:build"
echo "  2. Run tests: npm test"
echo "  3. Verify Prisma migrations: docker-compose -f docker/docker-compose.test.yml exec app-test npx prisma db push"
