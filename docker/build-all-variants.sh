#!/bin/bash
# ==============================================================================
# Build All Docker Variants and Compare
# ==============================================================================
# This script builds all base image variants and provides a comparison
#
# Usage:
#   ./build-all-variants.sh [--no-cache] [--node-version 18|20]
# ==============================================================================

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="hse-digital"
NODE_VERSION="18"
CACHE_FLAG=""
BUILD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cache)
      CACHE_FLAG="--no-cache"
      shift
      ;;
    --node-version)
      NODE_VERSION="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--no-cache] [--node-version 18|20]"
      echo ""
      echo "Options:"
      echo "  --no-cache         Build without using cache"
      echo "  --node-version     Node.js version (default: 18)"
      echo "  -h, --help         Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building All Docker Variants${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Image Name:    ${GREEN}${IMAGE_NAME}${NC}"
echo -e "Node Version:  ${GREEN}${NODE_VERSION}${NC}"
echo -e "Cache:         ${GREEN}$([ -z "$CACHE_FLAG" ] && echo "Enabled" || echo "Disabled")${NC}"
echo -e "Build Dir:     ${GREEN}${BUILD_DIR}${NC}"
echo ""

# Track build times
declare -A BUILD_TIMES
declare -A BUILD_SUCCESS

# Function to build a variant
build_variant() {
  local variant=$1
  local target=${2:-production}
  local extra_args=${3:-}
  
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Building ${variant} variant (${target})${NC}"
  echo -e "${BLUE}========================================${NC}"
  
  local start_time=$(date +%s)
  
  if docker build -f docker/Dockerfile \
    --build-arg NODE_VERSION=${NODE_VERSION} \
    --build-arg BUILD_VARIANT=${variant} \
    --target ${target} \
    ${extra_args} \
    ${CACHE_FLAG} \
    -t ${IMAGE_NAME}:${variant} \
    ${BUILD_DIR} ; then
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    BUILD_TIMES[${variant}]=${duration}
    BUILD_SUCCESS[${variant}]="✓"
    
    echo -e "${GREEN}✓ ${variant} built successfully in ${duration}s${NC}"
  else
    BUILD_SUCCESS[${variant}]="✗"
    echo -e "${RED}✗ ${variant} build failed${NC}"
  fi
  
  echo ""
}

# Build all variants
build_variant "slim" "production"
build_variant "bullseye" "production"
build_variant "alpine" "production"

# Build special variants
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building Special Variants${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

build_variant "slim" "development"
docker tag ${IMAGE_NAME}:slim ${IMAGE_NAME}:dev 2>/dev/null || true

build_variant "slim" "production-debug" "--build-arg ENABLE_DEBUG_TOOLS=true"
docker tag ${IMAGE_NAME}:slim ${IMAGE_NAME}:prod-debug 2>/dev/null || true

# Display results
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

printf "%-20s %-10s %-15s\n" "VARIANT" "STATUS" "BUILD TIME"
printf "%-20s %-10s %-15s\n" "--------------------" "----------" "---------------"

for variant in slim bullseye alpine; do
  if [ -n "${BUILD_SUCCESS[${variant}]}" ]; then
    status="${BUILD_SUCCESS[${variant}]}"
    time="${BUILD_TIMES[${variant}]}s"
    
    if [ "${BUILD_SUCCESS[${variant}]}" == "✓" ]; then
      printf "%-20s ${GREEN}%-10s${NC} %-15s\n" "${variant}" "${status}" "${time}"
    else
      printf "%-20s ${RED}%-10s${NC} %-15s\n" "${variant}" "${status}" "N/A"
    fi
  fi
done

echo ""

# Image size comparison
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Image Size Comparison${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

printf "%-20s %-20s %-15s\n" "VARIANT" "SIZE" "LAYERS"
printf "%-20s %-20s %-15s\n" "--------------------" "--------------------" "---------------"

for variant in slim bullseye alpine dev prod-debug; do
  if docker image inspect ${IMAGE_NAME}:${variant} >/dev/null 2>&1; then
    size=$(docker image inspect ${IMAGE_NAME}:${variant} --format='{{.Size}}' | awk '{printf "%.2f MB", $1/1024/1024}')
    layers=$(docker image inspect ${IMAGE_NAME}:${variant} --format='{{len .RootFS.Layers}}')
    printf "%-20s %-20s %-15s\n" "${variant}" "${size}" "${layers}"
  fi
done

echo ""

# Calculate size differences
if docker image inspect ${IMAGE_NAME}:bullseye >/dev/null 2>&1 && \
   docker image inspect ${IMAGE_NAME}:slim >/dev/null 2>&1 && \
   docker image inspect ${IMAGE_NAME}:alpine >/dev/null 2>&1; then
  
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Size Reduction vs Bullseye${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  bullseye_size=$(docker image inspect ${IMAGE_NAME}:bullseye --format='{{.Size}}')
  slim_size=$(docker image inspect ${IMAGE_NAME}:slim --format='{{.Size}}')
  alpine_size=$(docker image inspect ${IMAGE_NAME}:alpine --format='{{.Size}}')
  
  slim_reduction=$(awk "BEGIN {printf \"%.1f\", (1 - ${slim_size}/${bullseye_size}) * 100}")
  alpine_reduction=$(awk "BEGIN {printf \"%.1f\", (1 - ${alpine_size}/${bullseye_size}) * 100}")
  
  echo "Slim vs Bullseye:   ${GREEN}${slim_reduction}%${NC} smaller"
  echo "Alpine vs Bullseye: ${GREEN}${alpine_reduction}%${NC} smaller"
  echo ""
fi

# Test basic functionality
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Basic Functionality Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

for variant in slim bullseye alpine; do
  if docker image inspect ${IMAGE_NAME}:${variant} >/dev/null 2>&1; then
    echo -n "Testing ${variant}... "
    if docker run --rm ${IMAGE_NAME}:${variant} node --version >/dev/null 2>&1; then
      echo -e "${GREEN}✓${NC}"
    else
      echo -e "${RED}✗${NC}"
    fi
  fi
done

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Recommendations${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "✅ ${GREEN}Slim${NC}      - Recommended for production (balanced)"
echo -e "✅ ${GREEN}Bullseye${NC}  - Use for maximum compatibility"
echo -e "⚠️  ${YELLOW}Alpine${NC}    - Use for size-critical deployments (test thoroughly)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Test each variant: ${YELLOW}docker run --rm ${IMAGE_NAME}:<variant>${NC}"
echo -e "  2. Tag for production: ${YELLOW}docker tag ${IMAGE_NAME}:slim ${IMAGE_NAME}:latest${NC}"
echo -e "  3. Push to registry:   ${YELLOW}docker push ${IMAGE_NAME}:latest${NC}"
echo ""
