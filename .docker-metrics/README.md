# Docker Metrics

This directory tracks Docker image baseline metrics for regression detection.

## baseline.json

Stores the reference metrics for image size regression detection:

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

## Usage

### Update Baseline

After building your Docker image:

```bash
./scripts/update-docker-baseline.sh hse-digital:latest
```

### When to Update

Update the baseline when:

1. **Adding new features** that legitimately increase image size
2. **Upgrading dependencies** that affect image size
3. **Changing base images** (e.g., node:18-alpine → node:18-slim)
4. **After optimization** to set new target

### Commit Guidelines

Always document why the baseline changed:

```bash
# Good commit messages
git commit -m "Update Docker baseline: Added PDF generation libraries (+15MB)"
git commit -m "Update Docker baseline: Optimized layers (-8MB)"
git commit -m "Update Docker baseline: Upgraded Node.js 18.19 → 18.20"

# Poor commit message
git commit -m "Update baseline"
```

## CI/CD Integration

The CI/CD pipeline (`.github/workflows/docker-build-validation.yml`) uses this baseline to:

1. **Detect regressions**: Fails build if image grows >10%
2. **Track trends**: Shows size change in PR comments
3. **Prevent bloat**: Alerts on unexpected size increases

## History

To view baseline history:

```bash
git log --oneline -- .docker-metrics/baseline.json
git diff HEAD~5 -- .docker-metrics/baseline.json
```

## Troubleshooting

### Size Increased Unexpectedly

```bash
# Compare with previous build
docker history hse-digital:latest --human --no-trunc

# Check layer sizes
docker inspect hse-digital:latest --format='{{.Size}}'

# Analyze what changed
git diff HEAD~1 -- package.json server/package.json docker/Dockerfile
```

### Pipeline Fails on Size Check

If the increase is intentional:

```bash
./scripts/update-docker-baseline.sh
git add .docker-metrics/baseline.json
git commit -m "Update baseline: [reason for increase]"
git push
```

## Best Practices

1. **Review before updating**: Understand why size changed
2. **Optimize first**: Try to reduce size before accepting increase
3. **Document changes**: Clear commit messages
4. **Monitor trends**: Regular review of size changes
5. **Set alerts**: Configure notification thresholds in CI/CD
