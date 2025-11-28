# Docker Validation Scripts

Helper scripts for Docker image validation, security scanning, and baseline management.

## Scripts

### `update-docker-baseline.sh`

Updates the Docker image baseline metrics for size regression detection.

**Usage:**
```bash
./scripts/update-docker-baseline.sh [IMAGE_TAG]
```

**Example:**
```bash
# Use default tag (hse-digital:latest)
./scripts/update-docker-baseline.sh

# Specify custom tag
./scripts/update-docker-baseline.sh ghcr.io/owner/repo:v1.2.3
```

**Output:**
- Creates/updates `.docker-metrics/baseline.json`
- Shows current metrics (size, layers, commit)

**Baseline Format:**
```json
{
  "size": 549453824,
  "size_mb": 523.89,
  "layer_count": 12,
  "timestamp": "2024-01-15T10:30:00Z",
  "git_commit": "a1b2c3d",
  "git_branch": "main",
  "image_tag": "hse-digital:latest"
}
```

### `docker-security-scan.sh`

Runs comprehensive security scanning using Trivy.

**Usage:**
```bash
./scripts/docker-security-scan.sh [IMAGE_TAG] [OUTPUT_DIR]
```

**Example:**
```bash
# Use defaults
./scripts/docker-security-scan.sh

# Custom image and output
./scripts/docker-security-scan.sh my-image:v1 ./security-reports
```

**Output:**
- `trivy-results.json` - Detailed JSON results
- `trivy-report.txt` - Human-readable table

**Requirements:**
- Docker installed
- Either Trivy CLI or Docker access (uses Trivy container)

## Workflow

### Initial Setup

```bash
# Build image
docker build -f docker/Dockerfile -t hse-digital:latest .

# Create initial baseline
./scripts/update-docker-baseline.sh

# Commit baseline
git add .docker-metrics/baseline.json
git commit -m "Initialize Docker baseline"
```

### Regular Development

```bash
# Make changes to Dockerfile or dependencies
# ...

# Rebuild image
docker build -f docker/Dockerfile -t hse-digital:latest .

# Check security
./scripts/docker-security-scan.sh

# Check size
docker inspect hse-digital:latest --format='{{.Size}}' | awk '{printf "%.2f MB\n", $1/1024/1024}'
```

### Before Merging PR

```bash
# Run full validation
docker build -f docker/Dockerfile -t hse-digital:latest .
./scripts/docker-security-scan.sh
./scripts/update-docker-baseline.sh

# If size increase is acceptable
git add .docker-metrics/baseline.json
git commit -m "Update Docker baseline: Feature X added"
```

## Integration with CI/CD

These scripts are used by `.github/workflows/docker-build-validation.yml`:

1. **docker-build** job builds and analyzes image
2. **security-scan-trivy** job runs Trivy scan
3. **image-size-regression** job compares against baseline
4. **pr-comment** job reports all metrics

## Troubleshooting

### "Image not found" error

```bash
# List available images
docker images

# Build the image first
docker build -f docker/Dockerfile -t hse-digital:latest .
```

### Trivy not found

The script will automatically use the Trivy Docker container if the CLI is not installed:

```bash
docker run --rm aquasec/trivy:latest --version
```

### Permission denied

```bash
chmod +x scripts/*.sh
```

## Advanced Usage

### Compare Two Images

```bash
# Build old version
git checkout main
docker build -f docker/Dockerfile -t hse-digital:old .

# Build new version
git checkout feature-branch
docker build -f docker/Dockerfile -t hse-digital:new .

# Compare
docker images | grep hse-digital
```

### Analyze Specific Layers

```bash
# Show all layers
docker history hse-digital:latest --no-trunc

# Show layer sizes
docker history hse-digital:latest --human --format "{{.Size}}\t{{.CreatedBy}}"

# Find large layers
docker history hse-digital:latest --human | sort -k2 -h
```

### Export Security Report

```bash
# Run scan
./scripts/docker-security-scan.sh

# Extract critical vulnerabilities
cat .docker-security/trivy-results.json | jq '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL")'

# Generate summary
cat .docker-security/trivy-results.json | jq -r '.Results[].Vulnerabilities[] | "\(.Severity): \(.VulnerabilityID) in \(.PkgName)"' | sort | uniq -c
```

## See Also

- [Docker Build Validation Documentation](../docs/ci-cd/docker-build-validation.md)
- [Docker Compose Documentation](../docker/README.md)
- [CI/CD Pipeline Overview](../.github/workflows/README.md)
