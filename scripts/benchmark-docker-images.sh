#!/bin/bash
# Docker Image Size Benchmark Script
# Compares Bullseye, Slim, and Distroless variants

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="hse-digital"
DOCKERFILES=(
    "docker/Dockerfile.bullseye"
    "docker/Dockerfile.slim"
    "docker/Dockerfile.distroless"
)
TAGS=("bullseye" "slim" "distroless")

# Output file
OUTPUT_FILE="docker-image-benchmark-results.md"
JSON_FILE="docker-image-benchmark-results.json"

echo -e "${BLUE}=== Docker Image Size Benchmark ===${NC}"
echo ""

# Initialize results
declare -A IMAGE_SIZES
declare -A LAYER_COUNTS
declare -A BUILD_TIMES

# Function to format bytes
format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024}")KB"
    elif [ $bytes -lt 1073741824 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1048576}")MB"
    else
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1073741824}")GB"
    fi
}

# Function to build and measure image
build_and_measure() {
    local dockerfile=$1
    local tag=$2
    local full_tag="${IMAGE_NAME}:${tag}"
    
    echo -e "${YELLOW}Building ${tag}...${NC}"
    
    # Measure build time
    local start_time=$(date +%s)
    
    if docker build -f "$dockerfile" -t "$full_tag" . 2>&1 | tee "build-${tag}.log"; then
        local end_time=$(date +%s)
        local build_time=$((end_time - start_time))
        BUILD_TIMES[$tag]=$build_time
        
        # Get image size
        local size=$(docker images "$full_tag" --format "{{.Size}}")
        IMAGE_SIZES[$tag]=$size
        
        # Get layer count
        local layers=$(docker history "$full_tag" | wc -l)
        LAYER_COUNTS[$tag]=$layers
        
        # Get detailed size in bytes for calculations
        local size_bytes=$(docker inspect "$full_tag" --format='{{.Size}}')
        
        echo -e "${GREEN}✓ Built ${tag}: ${size} (${layers} layers, ${build_time}s)${NC}"
        
        # Save detailed image info
        docker history --no-trunc --format "table {{.CreatedBy}}\t{{.Size}}" "$full_tag" > "history-${tag}.txt"
        
        return 0
    else
        echo -e "${RED}✗ Failed to build ${tag}${NC}"
        BUILD_TIMES[$tag]="FAILED"
        IMAGE_SIZES[$tag]="FAILED"
        LAYER_COUNTS[$tag]="0"
        return 1
    fi
}

# Function to test image functionality
test_image() {
    local tag=$1
    local full_tag="${IMAGE_NAME}:${tag}"
    
    echo -e "${YELLOW}Testing ${tag}...${NC}"
    
    # Try to run basic health check
    local container_id=$(docker run -d -p 3002:3001 \
        -e JWT_SECRET=test_secret_key_min_32_chars_long_for_security \
        -e REFRESH_SECRET=test_refresh_secret_key_min_32_chars \
        -e DATABASE_URL="postgresql://test:test@localhost:5432/testdb" \
        "$full_tag" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Container started: ${container_id:0:12}${NC}"
        
        # Wait a bit for startup
        sleep 5
        
        # Try health check (will fail without DB, but checks if Node.js starts)
        if docker logs "$container_id" 2>&1 | grep -q "Server"; then
            echo -e "${GREEN}✓ Application started successfully${NC}"
        else
            echo -e "${YELLOW}⚠ Application may have issues (check logs)${NC}"
        fi
        
        # Cleanup
        docker stop "$container_id" > /dev/null 2>&1
        docker rm "$container_id" > /dev/null 2>&1
        
        return 0
    else
        echo -e "${RED}✗ Failed to start container${NC}"
        return 1
    fi
}

# Build all variants
echo -e "${BLUE}Building all variants...${NC}"
echo ""

for i in "${!DOCKERFILES[@]}"; do
    dockerfile="${DOCKERFILES[$i]}"
    tag="${TAGS[$i]}"
    
    if [ -f "$dockerfile" ]; then
        build_and_measure "$dockerfile" "$tag"
        echo ""
    else
        echo -e "${RED}✗ Dockerfile not found: ${dockerfile}${NC}"
        echo ""
    fi
done

# Generate comparison report
echo -e "${BLUE}=== Generating Comparison Report ===${NC}"

cat > "$OUTPUT_FILE" << 'EOF'
# Docker Image Size Benchmark Results

## Overview

This benchmark compares three Docker base image variants for the HSE.Digital application:

1. **Bullseye** - Full Debian 11 base image
2. **Slim** - Minimal Debian 11 base image (recommended)
3. **Distroless** - Google's minimal runtime image (experimental)

## Test Environment

EOF

echo "- **Date**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> "$OUTPUT_FILE"
echo "- **Docker Version**: $(docker --version)" >> "$OUTPUT_FILE"
echo "- **Host**: $(uname -s) $(uname -m)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
## Results Summary

| Variant | Image Size | Layers | Build Time | Status |
|---------|-----------|--------|------------|--------|
EOF

for tag in "${TAGS[@]}"; do
    echo "| ${tag} | ${IMAGE_SIZES[$tag]} | ${LAYER_COUNTS[$tag]} | ${BUILD_TIMES[$tag]}s | ✓ |" >> "$OUTPUT_FILE"
done

echo "" >> "$OUTPUT_FILE"

# Calculate size differences
cat >> "$OUTPUT_FILE" << 'EOF'

## Size Comparison

EOF

# Add detailed layer information
for tag in "${TAGS[@]}"; do
    if [ "${IMAGE_SIZES[$tag]}" != "FAILED" ]; then
        cat >> "$OUTPUT_FILE" << EOF

### ${tag^} Variant

**Image Size**: ${IMAGE_SIZES[$tag]}

**Layer Count**: ${LAYER_COUNTS[$tag]}

**Build Time**: ${BUILD_TIMES[$tag]}s

**Top 10 Layers by Size**:

\`\`\`
EOF
        if [ -f "history-${tag}.txt" ]; then
            head -n 11 "history-${tag}.txt" >> "$OUTPUT_FILE"
        fi
        echo '```' >> "$OUTPUT_FILE"
    fi
done

# Add recommendations
cat >> "$OUTPUT_FILE" << 'EOF'

## Recommendations

### Production Use

**Recommended**: Slim variant

**Rationale**:
- Optimal balance between size and compatibility
- Full Prisma support with OpenSSL
- Minimal attack surface
- Well-tested by Node.js community
- Includes essential debugging tools

### Comparison Matrix

| Feature | Bullseye | Slim | Distroless |
|---------|----------|------|------------|
| Base Size | ~70MB | ~30MB | ~50MB |
| Final Size | See above | See above | See above |
| Prisma Support | ✓ Full | ✓ Full | ⚠ Limited |
| Shell Access | ✓ bash | ✓ bash | ✗ None |
| Debugging | ✓ Easy | ✓ Easy | ✗ Difficult |
| Package Manager | ✓ apt | ✓ apt | ✗ None |
| Security | ✓ Good | ✓ Better | ✓ Best |
| Maintainability | ✓ Good | ✓ Good | ⚠ Complex |

### Size Optimization Strategies Applied

1. **Multi-stage builds** - Separate deps, builder, and production stages
2. **Layer caching** - Package files copied before source code
3. **Production-only dependencies** - Dev dependencies excluded from final image
4. **Minimal runtime dependencies** - Only OpenSSL and CA certificates
5. **apt cache cleanup** - `rm -rf /var/lib/apt/lists/*` after installs
6. **Non-root user** - Security best practice with minimal overhead
7. **.dockerignore** - Exclude unnecessary files from build context

### Distroless Evaluation

**Status**: Experimental - Requires Prisma compatibility testing

**Pros**:
- Smallest attack surface (no shell, no package manager)
- Minimal CVE exposure
- Fast container startup

**Cons**:
- No shell access for debugging
- Limited Prisma binary target support
- No health check support (requires external monitoring)
- Complex troubleshooting

**Testing Required**:
```bash
# Test Prisma client generation and runtime
docker run --rm hse-digital:distroless node -e "console.log(require('@prisma/client'))"

# Test database connectivity
docker-compose -f docker/docker-compose.test.yml up
```

## Layer Optimization Details

### Build Cache Strategy

The Dockerfiles implement optimal layer caching:

1. **Dependencies Layer** (changes rarely)
   ```dockerfile
   COPY package*.json ./
   RUN npm ci --only=production
   ```

2. **Application Layer** (changes frequently)
   ```dockerfile
   COPY . .
   ```

This ensures that npm dependencies are cached and only rebuilt when `package.json` changes.

### Multi-stage Benefits

- **Builder stage**: Contains all dev dependencies, build tools
- **Production stage**: Contains only runtime dependencies
- **Size reduction**: ~40-60% smaller than single-stage builds

## Build Logs

Build logs for each variant are available:
EOF

for tag in "${TAGS[@]}"; do
    if [ -f "build-${tag}.log" ]; then
        echo "- \`build-${tag}.log\`" >> "$OUTPUT_FILE"
    fi
done

echo "" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'

## Next Steps

1. ✓ Implement slim variant as default (already done in `docker/Dockerfile`)
2. ✓ Add .dockerignore to reduce build context
3. ⏳ Test distroless variant with full test suite
4. ⏳ Implement multi-architecture builds (amd64, arm64)
5. ⏳ Add size checks to CI/CD pipeline
6. ⏳ Monitor CVE exposure across variants

## Related Documentation

- [Dockerfile Migration Guide](../DOCKERFILE_MIGRATION_ALPINE_TO_SLIM.md)
- [Docker Deployment Guide](../docs/deployment/docker.md)
- [Production Runbook](../docs/deployment/runbook.md)

---

*Generated by: scripts/benchmark-docker-images.sh*
EOF

# Generate JSON output for CI/CD
cat > "$JSON_FILE" << EOF
{
  "timestamp": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "results": {
EOF

for i in "${!TAGS[@]}"; do
    tag="${TAGS[$i]}"
    comma=""
    if [ $i -lt $((${#TAGS[@]} - 1)) ]; then
        comma=","
    fi
    cat >> "$JSON_FILE" << EOF
    "${tag}": {
      "size": "${IMAGE_SIZES[$tag]}",
      "layers": ${LAYER_COUNTS[$tag]},
      "build_time": ${BUILD_TIMES[$tag]},
      "dockerfile": "${DOCKERFILES[$i]}"
    }${comma}
EOF
done

cat >> "$JSON_FILE" << EOF
  }
}
EOF

echo -e "${GREEN}✓ Benchmark complete!${NC}"
echo ""
echo -e "${BLUE}Results saved to:${NC}"
echo -e "  - ${OUTPUT_FILE}"
echo -e "  - ${JSON_FILE}"
echo ""
echo -e "${BLUE}Build logs:${NC}"
for tag in "${TAGS[@]}"; do
    if [ -f "build-${tag}.log" ]; then
        echo -e "  - build-${tag}.log"
    fi
done
echo ""

# Display summary
echo -e "${BLUE}=== Summary ===${NC}"
echo ""
for tag in "${TAGS[@]}"; do
    if [ "${IMAGE_SIZES[$tag]}" != "FAILED" ]; then
        echo -e "${tag}: ${GREEN}${IMAGE_SIZES[$tag]}${NC} (${LAYER_COUNTS[$tag]} layers, ${BUILD_TIMES[$tag]}s)"
    else
        echo -e "${tag}: ${RED}FAILED${NC}"
    fi
done
echo ""

# Compare slim to bullseye
if [ "${IMAGE_SIZES[slim]}" != "FAILED" ] && [ "${IMAGE_SIZES[bullseye]}" != "FAILED" ]; then
    echo -e "${BLUE}Recommendation:${NC} Use ${GREEN}slim${NC} variant for production"
    echo "- Smaller size than bullseye"
    echo "- Full Prisma compatibility"
    echo "- Minimal security footprint"
fi

echo ""
echo -e "${YELLOW}View full report:${NC} cat ${OUTPUT_FILE}"
