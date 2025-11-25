# Kubernetes Configuration

Kubernetes manifests for HSE Digital platform deployment.

## Structure

```
k8s/
├── base/                    # Base Kubernetes resources
│   ├── deployment.yaml      # Main application deployment
│   ├── service.yaml         # Services (app + redis)
│   ├── ingress.yaml         # Ingress with SSL/TLS
│   ├── redis-deployment.yaml# Redis cache deployment
│   ├── configmap.yaml       # Configuration values
│   ├── pvc.yaml             # Persistent volume claims
│   ├── hpa.yaml             # Horizontal pod autoscaler
│   ├── serviceaccount.yaml  # Service account + RBAC
│   ├── migration-job.yaml   # Database migration job
│   └── kustomization.yaml   # Kustomize base config
├── overlays/
│   ├── staging/             # Staging environment overrides
│   └── production/          # Production environment overrides
└── secrets/                 # Secrets management configs
    ├── aws-secrets-manager.yaml
    ├── vault-secrets.yaml
    └── .gitkeep
```

## Prerequisites

- Kubernetes cluster (EKS recommended)
- kubectl configured
- kustomize installed
- External Secrets Operator (for secrets management)
- NGINX Ingress Controller
- Cert-Manager (for SSL certificates)
- Metrics Server (for HPA)

## Quick Start

### Deploy to Staging

```bash
kubectl apply -k k8s/overlays/staging
```

### Deploy to Production

```bash
kubectl apply -k k8s/overlays/production
```

### Run Database Migrations

```bash
kubectl apply -f k8s/base/migration-job.yaml -n hse-production
kubectl wait --for=condition=complete --timeout=10m job/db-migration -n hse-production
```

## Configuration

### Environment-Specific Settings

**Staging:**
- Replicas: 2-5
- Resources: 384Mi memory, 200m CPU
- Domain: staging.hse.digital

**Production:**
- Replicas: 3-10
- Resources: 512Mi memory, 250m CPU  
- Domains: hse.digital, www.hse.digital

### Secrets Management

Two options supported:

**1. AWS Secrets Manager (Recommended)**

```bash
# Create secret in AWS
aws secretsmanager create-secret \
  --name hse-digital/production \
  --secret-string file://secrets.json

# Apply external secret
kubectl apply -f k8s/secrets/aws-secrets-manager.yaml -n hse-production
```

**2. HashiCorp Vault**

```bash
# Write secrets to Vault
vault kv put secret/hse-digital/production \
  database_url="..." \
  jwt_secret="..."

# Apply external secret
kubectl apply -f k8s/secrets/vault-secrets.yaml -n hse-production
```

### Storage Classes

**EFS (for uploads):**
- Access Mode: ReadWriteMany
- Storage Class: `efs-sc`
- Size: 20Gi

**EBS GP3 (for Redis):**
- Access Mode: ReadWriteOnce
- Storage Class: `gp3`
- Size: 5Gi

## Health Checks

### Probes Configuration

**Liveness Probe:**
- Path: `/api/health`
- Initial Delay: 30s
- Period: 10s

**Readiness Probe:**
- Path: `/api/health`
- Initial Delay: 10s
- Period: 5s

**Startup Probe:**
- Path: `/api/health`
- Initial Delay: 0s
- Period: 5s
- Failure Threshold: 30

## Auto-scaling

HPA scales pods based on:
- CPU utilization: 70% threshold
- Memory utilization: 80% threshold

**Staging:**
- Min: 2 replicas
- Max: 5 replicas

**Production:**
- Min: 3 replicas
- Max: 10 replicas

## Init Containers

Database migrations run as init container before app starts:

```yaml
initContainers:
  - name: db-migration
    command:
      - npx prisma generate
      - npx prisma db push
```

## Security

- Service accounts with IAM roles (IRSA)
- Pods run as non-root user (UID 1000)
- Read-only root filesystem (where possible)
- Capabilities dropped
- RBAC policies for least privilege access

## Networking

- **Service Type**: ClusterIP
- **Ingress**: NGINX with automatic SSL via cert-manager
- **Session Affinity**: ClientIP with 3-hour timeout
- **CORS**: Configured via ingress annotations

## Monitoring

Prometheus scrape annotations enabled:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3001"
  prometheus.io/path: "/metrics"
```

## Troubleshooting

### Check deployment status

```bash
kubectl get all -n hse-production
```

### View pod logs

```bash
kubectl logs -f deployment/prod-hse-app -n hse-production
```

### Check init container logs

```bash
kubectl logs <pod-name> -c db-migration -n hse-production
```

### Test health endpoint

```bash
kubectl port-forward -n hse-production svc/hse-app-service 8080:80
curl http://localhost:8080/api/health
```

### Check HPA status

```bash
kubectl get hpa -n hse-production
kubectl describe hpa hse-app-hpa -n hse-production
```

## CI/CD Integration

GitHub Actions workflow automatically deploys on push:
- `staging` branch → staging environment
- `main` branch → production environment

See `.github/workflows/deploy.yml` for details.

## Additional Resources

- [Deployment Runbook](../docs/DEPLOYMENT_RUNBOOK.md)
- [AGENTS.md](../AGENTS.md) - Build, lint, test commands
- [Docker Setup](../DOCKER_SETUP.md)
