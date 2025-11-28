# Production Deployment Runbook with Automated Validation

Comprehensive guide for deploying HSE Digital to Kubernetes with automated validation, smoke tests, and rollback mechanisms.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Pipeline Architecture](#deployment-pipeline-architecture)
4. [Automated Deployment Process](#automated-deployment-process)
5. [Manual Deployment Procedures](#manual-deployment-procedures)
6. [Validation & Smoke Tests](#validation--smoke-tests)
7. [Automated Rollback](#automated-rollback)
8. [Monitoring Integration](#monitoring-integration)
9. [Troubleshooting](#troubleshooting)
10. [Emergency Procedures](#emergency-procedures)

---

## Overview

This runbook describes the automated Kubernetes deployment validation pipeline that:
- Builds and pushes Docker images to container registry
- Deploys to staging cluster for validation
- Runs comprehensive smoke tests against deployed containers
- Validates health checks, Prisma connectivity, and API functionality
- Automatically rolls back if validation fails
- Integrates with Sentry and Prometheus for deployment tracking
- Deploys to production only after staging validation passes

**Deployment Flow:**
```
Code Push → Build Image → Deploy Staging → Smoke Tests → Validation → 
  ↓ (success)                                              ↓ (failure)
Deploy Production → Smoke Tests → Validation → Success   Automatic Rollback
```

---

## Prerequisites

### Required Tools
- `kubectl` v1.28+
- `kustomize` v5.0+
- `docker` v24.0+
- `aws-cli` v2.0+ (for EKS)
- `bash` v4.0+

### Required Access
- AWS EKS cluster admin access
- GitHub repository write access
- Container registry push permissions (ghcr.io)
- Kubernetes namespace admin: `hse-staging`, `hse-production`
- Sentry auth token (for release tracking)
- Prometheus Pushgateway access (optional)

### Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
export SENTRY_AUTH_TOKEN="your-sentry-token"
export SENTRY_ORG="your-org"
export PROMETHEUS_PUSHGATEWAY="http://pushgateway:9091"
```

---

## Deployment Pipeline Architecture

### GitHub Actions Workflow

Location: `.github/workflows/k8s-deploy-validation.yml`

**Triggers:**
- Push to `staging` branch → deploys to staging
- Push to `main` branch → deploys to production
- Manual workflow dispatch → custom environment selection

**Pipeline Stages:**

1. **Build Stage**
   - Builds Docker image with multi-stage Dockerfile
   - Pushes to GitHub Container Registry (ghcr.io)
   - Tags with commit SHA and branch name
   - Caches layers for faster builds

2. **Deploy Stage**
   - Configures kubectl with EKS credentials
   - Updates kustomization with new image tag
   - Applies Kubernetes manifests
   - Waits for rollout completion (timeout: 10 minutes)

3. **Validation Stage**
   - Runs smoke tests (15 test scenarios)
   - Validates health checks and connectivity
   - Tests API endpoints and response times
   - Monitors for errors in logs

4. **Rollback Stage** (on failure)
   - Automatically triggers rollback
   - Reverts to previous stable version
   - Validates health after rollback
   - Sends failure notifications

5. **Monitoring Integration Stage** (on success)
   - Creates Sentry release
   - Pushes metrics to Prometheus
   - Annotates Kubernetes resources
   - Sends success notifications

---

## Automated Deployment Process

### Staging Deployment

**Trigger:** Push to `staging` branch

```bash
git checkout staging
git merge develop
git push origin staging
```

**Automated steps:**
1. Build Docker image: `ghcr.io/your-org/hse-digital:staging-<sha>`
2. Deploy to `hse-staging` namespace
3. Run smoke tests
4. Validate deployment
5. On failure: automatic rollback
6. On success: create Sentry release

**Expected duration:** 8-12 minutes

### Production Deployment

**Trigger:** Push to `main` branch

```bash
git checkout main
git merge staging
git push origin main
```

**Automated steps:**
1. Build Docker image: `ghcr.io/your-org/hse-digital:latest`
2. Deploy to `hse-production` namespace (3 replicas)
3. Run smoke tests
4. Validate deployment
5. On failure: automatic rollback
6. On success: create Sentry release + push Prometheus metrics

**Expected duration:** 10-15 minutes

---

## Manual Deployment Procedures

### 1. Build Docker Image

```bash
docker build -t ghcr.io/your-org/hse-digital:v1.2.3 -f docker/Dockerfile .
docker push ghcr.io/your-org/hse-digital:v1.2.3
```

### 2. Deploy to Staging

```bash
aws eks update-kubeconfig --name hse-staging-cluster --region us-east-1

cd k8s/overlays/staging
kustomize edit set image app-image=ghcr.io/your-org/hse-digital:v1.2.3
cd ../../..

kubectl apply -k k8s/overlays/staging
kubectl rollout status deployment/staging-hse-app -n hse-staging --timeout=600s
```

### 3. Run Validation

```bash
chmod +x k8s/smoke-tests/smoke-test.sh
bash k8s/smoke-tests/smoke-test.sh hse-staging

chmod +x k8s/validation/validate-deployment.sh
export AUTO_ROLLBACK=true
bash k8s/validation/validate-deployment.sh hse-staging v1.2.3 staging
```

### 4. Deploy to Production

```bash
aws eks update-kubeconfig --name hse-production-cluster --region us-east-1

cd k8s/overlays/production
kustomize edit set image app-image=ghcr.io/your-org/hse-digital:v1.2.3
cd ../../..

kubectl apply -k k8s/overlays/production
kubectl rollout status deployment/prod-hse-app -n hse-production --timeout=600s
bash k8s/smoke-tests/smoke-test.sh hse-production
bash k8s/validation/validate-deployment.sh hse-production v1.2.3 production
```

---

## Validation & Smoke Tests

### Smoke Test Suite

Location: `k8s/smoke-tests/smoke-test.sh`

**15 Test Scenarios:**

1. ✓ Pods are ready
2. ✓ Health check endpoint responds with healthy status
3. ✓ Database connectivity verified
4. ✓ Redis connectivity verified
5. ✓ Prisma client initialized successfully
6. ✓ API response time < 2000ms
7. ✓ All required environment variables set
8. ✓ Metrics endpoint accessible
9. ✓ Container resource limits configured
10. ✓ No unexpected restarts detected
11. ✓ Service accessible within cluster
12. ✓ Liveness probe configured correctly
13. ✓ Readiness probe configured correctly
14. ✓ All replicas ready
15. ✓ HPA configured
16. ✓ Running as non-root user

**Usage:**
```bash
bash k8s/smoke-tests/smoke-test.sh <namespace> [service-name] [timeout] [retries]

# Examples
bash k8s/smoke-tests/smoke-test.sh hse-staging
bash k8s/smoke-tests/smoke-test.sh hse-production hse-app-service 300 5
```

### Validation Script

Location: `k8s/validation/validate-deployment.sh`

**Validation Steps:**

1. **Deployment Rollout**: Waits for all replicas to be ready
2. **Pod Readiness**: Verifies desired == ready replicas
3. **Smoke Tests**: Runs comprehensive test suite
4. **Pod Restarts**: Checks restart count (threshold: 2)
5. **Error Monitoring**: Scans logs for critical errors (threshold: 5)
6. **Metrics Verification**: Validates Prometheus metrics endpoint
7. **Response Time**: Tests API latency (threshold: 2000ms)
8. **Image Verification**: Confirms correct image tag deployed

**Usage:**
```bash
bash k8s/validation/validate-deployment.sh <namespace> <image-tag> <environment>

# Examples
bash k8s/validation/validate-deployment.sh hse-staging v1.2.3 staging
AUTO_ROLLBACK=true bash k8s/validation/validate-deployment.sh hse-production v1.2.3 production
```

---

## Automated Rollback

### Rollback Mechanism

Location: `k8s/validation/rollback.sh`

**Triggers:**
- Smoke test failure
- Health check failure
- Excessive pod restarts
- High error rate in logs
- Manual invocation

**Usage:**
```bash
bash k8s/validation/rollback.sh <namespace> "<reason>" [revision-number]

# Examples
bash k8s/validation/rollback.sh hse-production "Health check failure"
bash k8s/validation/rollback.sh hse-staging "Database connection error" 3
```

### Manual Rollback

```bash
kubectl rollout history deployment/prod-hse-app -n hse-production
kubectl rollout undo deployment/prod-hse-app -n hse-production
kubectl rollout status deployment/prod-hse-app -n hse-production
```

---

## Monitoring Integration

### Sentry Integration

**Automated release tracking:**
```bash
sentry-cli releases new -p hse-digital prod-v1.2.3
sentry-cli releases set-commits prod-v1.2.3 --auto
sentry-cli releases finalize prod-v1.2.3
sentry-cli releases deploys prod-v1.2.3 new -e production
```

### Prometheus Integration

**Deployment metrics:**
```
deployment_info{environment="production",image_tag="v1.2.3"}
deployment_status{environment="production",status="success"}
deployment_timestamp{environment="production"}
```

**Query metrics:**
```promql
deployment_status{environment="production"}
rate(deployment_timestamp{environment="production"}[1h])
```

---

## Troubleshooting

### Smoke Tests Failing

```bash
# Check pod status
kubectl get pods -n hse-production -l app=hse-app
kubectl describe pod <pod-name> -n hse-production

# Check logs
kubectl logs <pod-name> -n hse-production --tail=100

# Test health endpoint manually
kubectl exec -n hse-production <pod-name> -- wget -O- http://localhost:3001/api/health
```

### Rollback Not Working

```bash
# Check rollout history
kubectl rollout history deployment/prod-hse-app -n hse-production

# Force rollback to specific revision
kubectl rollout undo deployment/prod-hse-app -n hse-production --to-revision=2

# If still failing, manually set image
kubectl set image deployment/prod-hse-app app=ghcr.io/your-org/hse-digital:v1.2.2 -n hse-production
```

### Database Connectivity Issues

```bash
# Test from pod
kubectl exec -n hse-production <pod-name> -- node -e "import('./shared/utils/db.js').then(m => m.default.user.findFirst().then(() => console.log('OK')))"

# Check secrets
kubectl get secret hse-secrets -n hse-production -o yaml

# Verify DATABASE_URL
kubectl exec -n hse-production <pod-name> -- sh -c 'echo $DATABASE_URL'
```

---

## Emergency Procedures

### Critical Failure - Immediate Rollback

```bash
# 1. Quick rollback
kubectl rollout undo deployment/prod-hse-app -n hse-production

# 2. Scale down to stop traffic
kubectl scale deployment/prod-hse-app --replicas=0 -n hse-production

# 3. Investigate
kubectl logs -l app=hse-app -n hse-production --tail=500 > emergency-logs.txt

# 4. Scale back up with working version
kubectl scale deployment/prod-hse-app --replicas=3 -n hse-production
```

### Complete Environment Reset

```bash
# Delete and recreate deployment
kubectl delete deployment prod-hse-app -n hse-production
kubectl apply -k k8s/overlays/production

# Verify
kubectl rollout status deployment/prod-hse-app -n hse-production
bash k8s/smoke-tests/smoke-test.sh hse-production
```

### Contact Information

- **Platform Team**: platform-team@example.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Slack Channel**: #hse-deployments
- **Incident Management**: https://status.hse.digital

---

## Quick Reference

### Common Commands

```bash
# Check deployment status
kubectl get deployments,pods,svc -n hse-production

# View logs
kubectl logs -f deployment/prod-hse-app -n hse-production

# Run smoke tests
bash k8s/smoke-tests/smoke-test.sh hse-production

# Rollback
bash k8s/validation/rollback.sh hse-production "reason"

# Scale replicas
kubectl scale deployment/prod-hse-app --replicas=5 -n hse-production
```

### GitHub Secrets Configuration

Required secrets in repository settings:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EKS_CLUSTER_NAME_STAGING`
- `EKS_CLUSTER_NAME_PROD`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `PROMETHEUS_PUSHGATEWAY` (optional)
- `SLACK_WEBHOOK` (optional)
