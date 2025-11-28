# Docker Build Validation Workflow

Automated Docker image validation with security scanning and regression detection.

## Quick Start

### For Developers

The workflow runs automatically on every PR. You'll see:

1. **Build metrics** in the PR comment
2. **Security scan results** with vulnerability counts
3. **Size comparison** against baseline
4. **Environment validation** status

### Manual Validation

Before pushing:

```bash
# Build and validate locally
npm run docker:validate

# Or step by step
docker build -f docker/Dockerfile -t hse-digital:latest .
npm run docker:security
npm run docker:baseline
```

## Workflow Jobs

### 1. docker-build
- Builds production Docker image
- Tracks build time
- Analyzes image size and layers
- Creates artifact for scanning

### 2. security-scan-trivy
- Scans for vulnerabilities
- Uploads to GitHub Security tab
- Enforces thresholds (5 critical, 20 high)
- Generates detailed reports

### 3. image-size-regression
- Compares against baseline
- Calculates size change %
- Fails if >10% increase
- Only runs on PRs

### 4. docker-compose-validation
- Starts full stack
- Tests health endpoints
- Measures startup time
- Validates service connectivity

### 5. pr-comment
- Posts summary to PR
- Shows all metrics
- Highlights issues
- Links to detailed reports

## Thresholds & Limits

| Check | Threshold | Action |
|-------|-----------|--------|
| Critical Vulnerabilities | 5 | Fail build |
| High Vulnerabilities | 20 | Fail build |
| Image Size Increase | 10% | Fail build |
| Startup Time | 60s | Fail health check |

## PR Comment Example

```markdown
## 🐳 Docker Build Validation Report

### Build Metrics
| Metric | Value |
|--------|-------|
| Build Time | 42s |
| Image Size | 523.45 MB |
| Layer Count | 12 |
| Size Change | +2.3 MB (+0.44%) |

### Security Scan (Trivy)
| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 2 |
| 🟡 Medium | 8 |
| 🟢 Low | 23 |

### Environment Validation
| Check | Status |
|-------|--------|
| Docker Compose | ✅ healthy |
| Startup Time | 18s |
```

## Handling Failures

### Size Regression Failure

If your changes legitimately increase image size:

```bash
# Review the increase
docker history hse-digital:latest --human

# If acceptable, update baseline
npm run docker:baseline

# Commit with explanation
git add .docker-metrics/baseline.json
git commit -m "Update Docker baseline: Added chart.js for reports (+12MB)"
```

### Security Scan Failure

Address vulnerabilities:

```bash
# View local scan
npm run docker:security
cat .docker-security/trivy-report.txt

# Update dependencies
cd server && npm update

# Or update base image
# Edit docker/Dockerfile to use newer node:18-slim
```

### Compose Validation Failure

Debug locally:

```bash
# Start services
npm run docker:up

# Check logs
npm run docker:logs:app

# Test health
curl -v http://localhost:3001/api/health

# Clean up
npm run docker:down
```

## Configuration

### Modify Vulnerability Thresholds

Edit `.github/workflows/docker-build-validation.yml`:

```yaml
if [ "$CRITICAL" -gt 5 ] || [ "$HIGH" -gt 20 ]; then
  exit 1
fi
```

### Modify Size Threshold

```yaml
THRESHOLD=10  # Percentage
```

### Add Additional Scanners

Add Snyk job:

```yaml
security-scan-snyk:
  name: Snyk Security Scan
  runs-on: ubuntu-latest
  needs: docker-build
  steps:
    - uses: actions/checkout@v4
    - uses: snyk/actions/docker@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        image: ${{ needs.docker-build.outputs.image-tag }}
```

## Artifacts

| Artifact | Retention | Purpose |
|----------|-----------|---------|
| docker-image | 1 day | Used by scan jobs |
| trivy-results | 30 days | Security audit trail |
| grype-results | 30 days | Alternative scan data |

## Permissions Required

The workflow needs:

- `contents: read` - Checkout code
- `packages: write` - Push to registry (future)
- `pull-requests: write` - Post comments
- `security-events: write` - Upload SARIF

No additional secrets required beyond `GITHUB_TOKEN`.

## Integration with Deploy Pipeline

The validation workflow runs before deployment:

```
PR Created
  ↓
Docker Validation (this workflow)
  ↓
Regression Tests
  ↓
E2E Tests
  ↓
PR Approved
  ↓
Deploy to Staging
```

## Monitoring

### GitHub Security Tab

View vulnerability trends:
1. Go to repository **Security** tab
2. Click **Code scanning alerts**
3. Filter by **Tool: Trivy**

### Actions Tab

View workflow history:
1. Go to **Actions** tab
2. Click **Docker Build Validation & Security**
3. Review run history and trends

## Best Practices

### 1. Keep Images Small

```dockerfile
# Use slim base images
FROM node:18-slim

# Multi-stage builds
FROM node:18-slim AS builder
# ...
FROM node:18-slim AS production

# Combine RUN commands
RUN apt-get update && \
    apt-get install -y pkg1 pkg2 && \
    rm -rf /var/lib/apt/lists/*
```

### 2. Security Hygiene

- Update dependencies regularly
- Review security advisories
- Address critical vulnerabilities immediately
- Document accepted risks

### 3. Baseline Management

- Update after intentional changes
- Document reasons in commits
- Review history before approving large increases
- Set up notifications for unexpected changes

### 4. Local Testing

Always test locally before pushing:

```bash
# Full validation
npm run docker:validate

# Quick security check
npm run docker:security
```

## Troubleshooting

### Workflow Not Triggering

Check path filters in workflow:

```yaml
paths:
  - 'docker/**'
  - 'server/**'
  # Add your paths here
```

### Build Timeout

Increase timeout in workflow:

```yaml
jobs:
  docker-build:
    timeout-minutes: 30  # Increase if needed
```

### Image Not Loading

Check artifact upload/download:

```yaml
- name: Save image
  run: docker save $IMAGE_TAG -o /tmp/image.tar

- name: Upload
  uses: actions/upload-artifact@v4
  with:
    name: docker-image
    path: /tmp/image.tar
```

## Future Enhancements

Planned improvements:

- [ ] Multi-architecture builds (ARM64)
- [ ] Snyk integration
- [ ] Image signing with Cosign
- [ ] SBOM generation
- [ ] Performance benchmarking
- [ ] Cost estimation
- [ ] Compliance checking

## Support

For issues or questions:

1. Check [documentation](../../docs/ci-cd/docker-build-validation.md)
2. Review [script README](../../scripts/README-DOCKER.md)
3. Open an issue with workflow logs
