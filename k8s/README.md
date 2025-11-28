# Kubernetes Deployment with Automated Validation

This directory contains Kubernetes manifests and deployment automation scripts for HSE Digital.

## Directory Structure

```
k8s/
├── base/                      # Base Kubernetes manifests
│   ├── deployment.yaml        # Application deployment
│   ├── service.yaml          # Service definition
│   ├── ingress.yaml          # Ingress rules
│   ├── hpa.yaml              # Horizontal Pod Autoscaler
│   ├── configmap.yaml        # Configuration
│   ├── serviceaccount.yaml   # Service account
│   ├── pvc.yaml              # Persistent volume claims
│   └── redis-deployment.yaml # Redis cache
├── overlays/                  # Environment-specific overlays
│   ├── staging/              # Staging configuration
│   ├── production/           # Production configuration
│   ├── us-east/              # US East region
│   ├── eu-west/              # EU West region
│   └── ap-southeast/         # AP Southeast region
├── smoke-tests/               # Smoke test scripts
│   ├── smoke-test.sh         # Shell-based smoke tests
│   └── advanced-smoke-test.js # Node.js smoke tests
├── validation/                # Deployment validation
│   ├── validate-deployment.sh # Validation orchestrator
│   ├── rollback.sh           # Automated rollback
│   └── monitoring-integration.sh # Monitoring integration
└── secrets/                   # Secret management
    └── aws-secrets-manager.yaml # External secrets config
```

## Quick Start

### Deploy to Staging

```bash
# Configure kubectl
aws eks update-kubeconfig --name hse-staging-cluster --region us-east-1

# Deploy
kubectl apply -k k8s/overlays/staging

# Monitor rollout
kubectl rollout status deployment/staging-hse-app -n hse-staging

# Run smoke tests
bash k8s/smoke-tests/smoke-test.sh hse-staging
```

### Deploy to Production

```bash
# Configure kubectl
aws eks update-kubeconfig --name hse-production-cluster --region us-east-1

# Deploy
kubectl apply -k k8s/overlays/production

# Monitor rollout
kubectl rollout status deployment/prod-hse-app -n hse-production

# Run validation
bash k8s/validation/validate-deployment.sh hse-production latest production
```

## Automated Deployment Pipeline

### GitHub Actions Integration

The deployment pipeline is automated via GitHub Actions:
- **File**: `.github/workflows/k8s-deploy-validation.yml`
- **Triggers**: Push to `staging` or `main` branches
- **Features**: Build, deploy, validate, rollback on failure

### Pipeline Flow

1. **Build**: Docker image creation and push to registry
2. **Deploy**: Kubernetes manifest application
3. **Validate**: Smoke tests + health checks
4. **Monitor**: Sentry + Prometheus integration
5. **Rollback**: Automatic if validation fails

## Smoke Tests

### Basic Smoke Tests (Bash)

Location: `k8s/smoke-tests/smoke-test.sh`

**Tests 15 scenarios:**
- Pod readiness
- Health endpoint
- Database connectivity
- Redis connectivity
- Prisma client
- API response time
- Environment variables
- Metrics endpoint
- Resource limits
- Pod stability
- Service accessibility
- Probe configuration
- Replica health
- HPA configuration
- Security context

**Usage:**
```bash
bash k8s/smoke-tests/smoke-test.sh <namespace> [service-name] [timeout]
```

### Advanced Smoke Tests (Node.js)

Location: `k8s/smoke-tests/advanced-smoke-test.js`

**Additional tests:**
- Prisma query execution
- API functionality
- Resource usage
- Sentry integration
- Prometheus metrics

**Usage:**
```bash
NAMESPACE=hse-staging node k8s/smoke-tests/advanced-smoke-test.js
```

## Deployment Validation

### Validation Script

Location: `k8s/validation/validate-deployment.sh`

**8-step validation process:**
1. Wait for deployment rollout
2. Verify pod readiness
3. Run smoke tests
4. Check pod restart count
5. Monitor error logs
6. Verify metrics collection
7. Test API response time
8. Confirm image tag

**Usage:**
```bash
bash k8s/validation/validate-deployment.sh <namespace> <image-tag> <environment>

# With auto-rollback
AUTO_ROLLBACK=true bash k8s/validation/validate-deployment.sh hse-production v1.2.3 production
```

**Thresholds:**
- Max pod restarts: 2
- Max error count: 5
- Max response time: 2000ms
- Rollout timeout: 600s

## Automated Rollback

### Rollback Script

Location: `k8s/validation/rollback.sh`

**Triggers rollback on:**
- Failed smoke tests
- Health check failures
- Excessive restarts
- High error rates

**Usage:**
```bash
# Rollback to previous revision
bash k8s/validation/rollback.sh <namespace> "<reason>"

# Rollback to specific revision
bash k8s/validation/rollback.sh <namespace> "<reason>" <revision>
```

**Example:**
```bash
bash k8s/validation/rollback.sh hse-production "Health check failure"
```

## Monitoring Integration

### Sentry Integration

Automatic release tracking:
- Creates release with deployment SHA
- Associates commits
- Tracks deployment events
- Links errors to releases

### Prometheus Integration

Deployment metrics:
- `deployment_info{environment, image_tag, namespace}`
- `deployment_status{environment, status}`
- `deployment_timestamp{environment}`

**Push metrics:**
```bash
bash k8s/validation/monitoring-integration.sh hse-production v1.2.3 production success
```

## Environment Configuration

### Staging

- **Namespace**: `hse-staging`
- **Replicas**: 2
- **Resources**: 512Mi RAM, 250m CPU
- **HPA**: 2-5 replicas
- **URL**: https://staging.hse.digital

### Production

- **Namespace**: `hse-production`
- **Replicas**: 3
- **Resources**: 1Gi RAM, 1000m CPU
- **HPA**: 3-10 replicas
- **URL**: https://hse.digital

## Resource Requirements

### Application Container

```yaml
requests:
  memory: 512Mi
  cpu: 250m
limits:
  memory: 1Gi
  cpu: 1000m
```

### Init Container (Migrations)

```yaml
requests:
  memory: 256Mi
  cpu: 200m
limits:
  memory: 512Mi
  cpu: 500m
```

## Health Checks

### Liveness Probe

```yaml
httpGet:
  path: /api/health
  port: 3001
initialDelaySeconds: 30
periodSeconds: 10
timeoutSeconds: 5
failureThreshold: 3
```

### Readiness Probe

```yaml
httpGet:
  path: /api/health
  port: 3001
initialDelaySeconds: 10
periodSeconds: 5
timeoutSeconds: 3
failureThreshold: 3
```

### Startup Probe

```yaml
httpGet:
  path: /api/health
  port: 3001
initialDelaySeconds: 0
periodSeconds: 5
timeoutSeconds: 3
failureThreshold: 30
```

## Troubleshooting

### View Logs

```bash
kubectl logs -f deployment/prod-hse-app -n hse-production
kubectl logs <pod-name> -c init-container -n hse-production
```

### Debug Pod

```bash
kubectl exec -it <pod-name> -n hse-production -- /bin/sh
kubectl describe pod <pod-name> -n hse-production
```

### Check Resources

```bash
kubectl top pods -n hse-production
kubectl get events -n hse-production --sort-by='.lastTimestamp'
```

### Manual Rollback

```bash
kubectl rollout history deployment/prod-hse-app -n hse-production
kubectl rollout undo deployment/prod-hse-app -n hse-production
```

## Security

### Security Context

- Run as non-root user (UID 1000)
- Read-only root filesystem: false (writeable for uploads)
- Drop all capabilities
- No privilege escalation

### Network Policies

- Ingress: Allow from ingress controller only
- Egress: Allow to database, Redis, external APIs

### Secrets Management

- AWS Secrets Manager integration
- External Secrets Operator
- Automatic secret rotation support

## CI/CD Requirements

### GitHub Secrets

Required in repository settings:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EKS_CLUSTER_NAME_STAGING`
- `EKS_CLUSTER_NAME_PROD`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `PROMETHEUS_PUSHGATEWAY` (optional)
- `SLACK_WEBHOOK` (optional)

## Documentation

- **Production Runbook**: `docs/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md`
- **General Deployment**: `docs/deployment/production.md`
- **Docker Setup**: `docs/deployment/docker.md`
- **Architecture**: `docs/architecture/overview.md`

## Support

- **Issues**: GitHub Issues
- **Slack**: #hse-deployments
- **Docs**: https://docs.hse.digital
