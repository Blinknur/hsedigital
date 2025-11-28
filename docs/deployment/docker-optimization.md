# Docker Image Optimization Guide

## Quick Start

### Run Benchmark

```bash
chmod +x scripts/benchmark-docker-images.sh
./scripts/benchmark-docker-images.sh
```

This generates:
- `docker-image-benchmark-results.md` - Detailed comparison report
- `docker-image-benchmark-results.json` - Machine-readable results
- `build-*.log` - Build logs for each variant

### Test Distroless Compatibility

```bash
chmod +x scripts/test-distroless-compatibility.sh
./scripts/test-distroless-compatibility.sh
```

Generates: `distroless-compatibility-report.md`

## Image Variants

### Production (Recommended): Slim

```bash
docker build -f docker/Dockerfile -t hse-digital:latest .
```

**Characteristics**:
- Base: `node:18-slim`
- Size: ~140 MB
- Prisma: ✅ Full support
- Debugging: ✅ Easy
- Security: ✅ Good

### Comparison: Bullseye

```bash
docker build -f docker/Dockerfile.bullseye -t hse-digital:bullseye .
```

**Characteristics**:
- Base: `node:18-bullseye`
- Size: ~200 MB (+60 MB vs Slim)
- Prisma: ✅ Full support
- Debugging: ✅ Very easy
- Security: ✅ Good
- **Verdict**: Not recommended (unnecessary size)

### Experimental: Distroless

```bash
docker build -f docker/Dockerfile.distroless -t hse-digital:distroless .
```

**Characteristics**:
- Base: `gcr.io/distroless/nodejs18-debian11`
- Size: ~160 MB
- Prisma: ⚠️ Untested
- Debugging: ❌ Very difficult (no shell)
- Security: ✅ Excellent
- **Verdict**: Not ready for production

## Optimization Techniques

### 1. Multi-Stage Build

```dockerfile
# Stage 1: Dependencies (production only)
FROM node:18-slim AS deps
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder (with dev dependencies)
FROM node:18-slim AS builder
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production (minimal)
FROM node:18-slim AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
```

**Impact**: 40-60% size reduction

### 2. Layer Caching

```dockerfile
# Order: stable → volatile
RUN apt-get install ...    # Rarely changes
COPY package*.json ./      # Changes occasionally
RUN npm ci                 # Depends on package.json
COPY . .                   # Changes frequently
```

**Impact**: 80% faster rebuilds when only code changes

### 3. Minimal Dependencies

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean
```

**Impact**: 50-100 MB reduction

### 4. .dockerignore

```
node_modules/
.git/
docs/
*.md
.env*
test/
coverage/
```

**Impact**: 20-30% faster builds

### 5. Production Dependencies Only

```dockerfile
# In deps stage
RUN npm ci --only=production

# Production copies from deps (not builder)
COPY --from=deps /app/node_modules ./node_modules
```

**Impact**: 30-50 MB reduction

### 6. Non-Root User

```dockerfile
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs
```

**Impact**: Security + minimal overhead

## Size Comparison

| Variant | Base | Final | Layers | Build Time | Status |
|---------|------|-------|--------|------------|--------|
| Alpine | 5 MB | 90 MB | 15 | 120s | ❌ Broken |
| Slim | 30 MB | 140 MB | 12 | 150s | ✅ Recommended |
| Bullseye | 70 MB | 200 MB | 12 | 160s | ⚠️ Too large |
| Distroless | 50 MB | 160 MB | 10 | 140s | ⚠️ Untested |

## Performance Benchmarks

### Build Time

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Clean build | 120s | 150s | -25% |
| Code change | 120s | 30s | +75% ⭐ |
| Package change | 120s | 80s | +33% |

### Cache Hit Rate

| Layer | Frequency | Hit Rate |
|-------|-----------|----------|
| Base image | Never | 100% |
| System deps | Rarely | 95% |
| Packages | Occasionally | 80% |
| Source | Frequently | 20% |

## Best Practices

### DO ✅

- Use `node:18-slim` for production
- Implement multi-stage builds
- Copy package files before source
- Use `npm ci --only=production`
- Add comprehensive `.dockerignore`
- Run as non-root user
- Clean apt cache after installs

### DON'T ❌

- Use Alpine (Prisma incompatible)
- Use Bullseye (unnecessarily large)
- Copy source before packages (breaks caching)
- Include dev dependencies in production
- Skip `.dockerignore`
- Run as root user
- Leave apt cache in image

## Troubleshooting

### Large Image Size

1. Check layer sizes:
   ```bash
   docker history hse-digital:latest --no-trunc
   ```

2. Verify production-only deps:
   ```bash
   docker run --rm hse-digital:latest ls node_modules | wc -l
   ```

3. Check for dev dependencies:
   ```bash
   docker run --rm hse-digital:latest ls node_modules/@types 2>&1
   ```

### Slow Builds

1. Check cache usage:
   ```bash
   docker build --progress=plain -f docker/Dockerfile . 2>&1 | grep "CACHED"
   ```

2. Verify `.dockerignore`:
   ```bash
   cat .dockerignore
   ```

3. Check build context size:
   ```bash
   tar -czf - . --exclude-from=.dockerignore | wc -c
   ```

### Prisma Issues

1. Verify OpenSSL:
   ```bash
   docker run --rm hse-digital:latest openssl version
   ```

2. Check Prisma client:
   ```bash
   docker run --rm hse-digital:latest ls -la node_modules/.prisma/client/
   ```

3. Test Prisma import:
   ```bash
   docker run --rm hse-digital:latest node -e "console.log(require('@prisma/client'))"
   ```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Build and benchmark Docker image
  run: |
    ./scripts/benchmark-docker-images.sh
    
- name: Upload benchmark results
  uses: actions/upload-artifact@v3
  with:
    name: docker-benchmarks
    path: docker-image-benchmark-results.*
    
- name: Check image size
  run: |
    SIZE=$(docker images hse-digital:latest --format "{{.Size}}")
    echo "Image size: $SIZE"
    # Fail if over 200 MB
    [[ "${SIZE//MB/}" -lt 200 ]]
```

### Size Monitoring

```bash
# Add to CI pipeline
docker images hse-digital:latest --format "{{.Size}}" > image-size.txt

# Track over time
git add image-size.txt
git commit -m "chore: update image size metrics"
```

## Related Documentation

- [Main Migration Guide](../../DOCKERFILE_MIGRATION_ALPINE_TO_SLIM.md)
- [Docker Deployment](./docker.md)
- [Production Runbook](./runbook.md)

## Quick Reference

```bash
# Build optimized image
npm run docker:build

# Check size
docker images hse-digital:latest

# Run benchmarks
./scripts/benchmark-docker-images.sh

# Test distroless
./scripts/test-distroless-compatibility.sh

# Clean up
npm run docker:clean
docker system prune -f
```
