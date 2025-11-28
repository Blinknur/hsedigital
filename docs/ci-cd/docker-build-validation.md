# Docker Build Validation & Security

Comprehensive CI/CD pipeline for automated Docker image builds, security scanning, and validation.

## Overview

The Docker Build Validation workflow provides:

- **Automated Docker builds** on every PR
- **Security vulnerability scanning** with Trivy
- **Image size regression detection** to prevent bloat
- **Docker Compose environment validation**
- **Automated PR comments** with build metrics and security scan results

## Workflow Triggers

The workflow runs on:

- **Pull Requests** to `main`, `staging`, or `develop` branches
- **Push** to `main` or `staging` branches
- **Manual trigger** via workflow_dispatch
- **Path filters**: Only triggers when relevant files change

## Pipeline Stages

### 1. Docker Build & Analysis

Builds the Docker image and collects metrics including build time, image size, layer count, and creates image artifact for downstream jobs.

### 2. Security Scanning (Trivy)

Performs comprehensive vulnerability scanning with SARIF integration for GitHub Security tab. Enforces thresholds: Max 5 Critical, Max 20 High vulnerabilities.

### 3. Image Size Regression Detection

Compares current build against baseline (`.docker-metrics/baseline.json`). Fails if size increases by >10%.

### 4. Docker Compose Validation

Tests the complete stack including app, PostgreSQL, Redis, and Jaeger. Measures startup time and validates health endpoints.

### 5. PR Comment Bot

Posts comprehensive build report with all metrics and security scan results.

## Local Usage

### Run Security Scan

```bash
docker build -f docker/Dockerfile -t hse-digital:latest .
./scripts/docker-security-scan.sh hse-digital:latest
cat .docker-security/trivy-report.txt
```

### Update Baseline Metrics

```bash
./scripts/update-docker-baseline.sh hse-digital:latest
git add .docker-metrics/baseline.json
git commit -m "Update Docker baseline"
```

## Configuration

### Vulnerability Thresholds

Adjust in `.github/workflows/docker-build-validation.yml`:

```yaml
if [ "$CRITICAL" -gt 5 ] || [ "$HIGH" -gt 20 ]; then
  exit 1
fi
```

### Image Size Threshold

```yaml
THRESHOLD=10  # Percentage
```

## Best Practices

1. Update baseline after intentional size increases
2. Address Critical/High vulnerabilities before merging
3. Use multi-stage builds to minimize size
4. Combine RUN commands to reduce layers
5. Order Dockerfile by change frequency

## Troubleshooting

### Size Regression

```bash
docker history hse-digital:latest --human
./scripts/update-docker-baseline.sh hse-digital:latest
```

### Security Failures

```bash
./scripts/docker-security-scan.sh hse-digital:latest
cat .docker-security/trivy-results.json | jq '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL")'
```

### Compose Validation

```bash
docker-compose -f docker/docker-compose.yml up
docker-compose -f docker/docker-compose.yml logs app
curl -v http://localhost:3001/api/health
```

## Metrics Tracked

- Build time (seconds)
- Image size (MB)
- Layer count
- Vulnerabilities by severity
- Startup time

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/)
