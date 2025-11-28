# Docker Validation Quick Start

Quick reference for Docker build validation and security scanning.

## 🚀 Quick Commands

```bash
# Full validation (build + security + baseline)
npm run docker:validate

# Individual steps
npm run docker:build          # Build image
npm run docker:security       # Run security scan
npm run docker:baseline       # Update baseline metrics

# Existing commands
npm run docker:up             # Start services
npm run docker:down           # Stop services
npm run docker:health         # Check health
```

## 📊 What Gets Checked

### 1. Build Metrics
- ⏱️ Build time
- 📦 Image size (MB)
- 🗂️ Layer count
- 📈 Size change vs baseline

### 2. Security Scan
- 🔴 Critical vulnerabilities
- 🟠 High severity issues
- 🟡 Medium severity issues
- 🟢 Low severity issues

### 3. Environment Validation
- ✅ Docker Compose startup
- 🏥 Health endpoint check
- ⏰ Startup time measurement

## 🔧 Before Your First PR

```bash
# 1. Build your image
docker build -f docker/Dockerfile -t hse-digital:latest .

# 2. Run security scan
npm run docker:security

# 3. Check results
cat .docker-security/trivy-report.txt

# 4. Update baseline (if first time or size changed intentionally)
npm run docker:baseline

# 5. Commit baseline if updated
git add .docker-metrics/baseline.json
git commit -m "Update Docker baseline: [reason]"
```

## 🚨 Handling CI Failures

### Size Regression Failed

```bash
# Check what increased
docker history hse-digital:latest --human

# If increase is valid, update baseline
npm run docker:baseline
git add .docker-metrics/baseline.json
git commit -m "Update baseline: Added feature X (+15MB)"
```

### Security Scan Failed

```bash
# View vulnerabilities
npm run docker:security
cat .docker-security/trivy-report.txt

# Fix by updating dependencies
cd server && npm update

# Or update base image in docker/Dockerfile
```

### Compose Validation Failed

```bash
# Test locally
npm run docker:up
npm run docker:logs:app
curl http://localhost:3001/api/health
npm run docker:down
```

## 📝 PR Comment Example

The workflow automatically comments on PRs:

```
🐳 Docker Build Validation Report

Build Metrics
─────────────
Build Time: 42s
Image Size: 523.45 MB
Layer Count: 12
Size Change: +2.3 MB (+0.44%) ✅

Security Scan
─────────────
🔴 Critical: 0
🟠 High: 2
🟡 Medium: 8
🟢 Low: 23

Environment
───────────
Docker Compose: ✅ healthy
Startup Time: 18s
```

## 🎯 Thresholds

| Check | Limit | Action |
|-------|-------|--------|
| Critical Vulns | 5 | ❌ Fail |
| High Vulns | 20 | ❌ Fail |
| Size Increase | 10% | ❌ Fail |
| Startup Time | 60s | ❌ Fail |

## 📁 Generated Files

```
.docker-metrics/
├── baseline.json          # Tracked in git
└── README.md             # Documentation

.docker-security/          # Not tracked (gitignored)
├── trivy-results.json    # Detailed JSON
└── trivy-report.txt      # Human-readable

/tmp/
└── image.tar             # CI artifact only
```

## 🔍 Useful Commands

```bash
# View image size
docker images hse-digital:latest

# Analyze layers
docker history hse-digital:latest --human --no-trunc

# Check for vulnerabilities
npm run docker:security

# View baseline history
git log --oneline .docker-metrics/baseline.json

# Compare sizes
docker images | grep hse-digital
```

## 📚 Documentation

- **Full Guide**: `docs/ci-cd/docker-build-validation.md`
- **Scripts**: `scripts/README-DOCKER.md`
- **Workflow**: `.github/workflows/README-DOCKER-VALIDATION.md`
- **Metrics**: `.docker-metrics/README.md`

## 💡 Tips

1. **Run locally first** - Catch issues before pushing
2. **Update baseline** - After legitimate size increases
3. **Document changes** - Clear commit messages
4. **Review regularly** - Monitor security trends
5. **Optimize continuously** - Keep images lean

## ⚡ Emergency Fixes

### Skip validation temporarily (NOT RECOMMENDED)

Only if absolutely necessary, in workflow file:

```yaml
if: github.event_name != 'push'  # Skip on direct push
```

### Override thresholds temporarily

In workflow, adjust:

```yaml
if [ "$CRITICAL" -gt 10 ] || [ "$HIGH" -gt 50 ]; then  # Temporary increase
```

**Always revert these changes after addressing issues!**

## 🆘 Getting Help

1. Check documentation links above
2. Review workflow logs in GitHub Actions
3. Test locally with provided scripts
4. Check `.docker-security/` for detailed reports
