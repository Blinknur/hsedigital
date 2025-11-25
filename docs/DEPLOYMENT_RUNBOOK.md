# HSE Digital Deployment Runbook

Complete deployment procedures and operational guide for HSE Digital platform on Kubernetes.

## Table of Contents

1. Overview
2. Prerequisites  
3. Architecture
4. Initial Setup
5. Deployment Procedures
6. Rollback Procedures
7. Monitoring & Health Checks
8. Troubleshooting
9. Secrets Management
10. Scaling Operations
11. Disaster Recovery

## Overview

GitOps-based deployment using GitHub Actions CI/CD with Kubernetes orchestration.

**Stack**: Node.js 18, PostgreSQL 15, Redis 7, Kubernetes (EKS), AWS Secrets Manager/Vault

## Prerequisites

### Tools
- kubectl v1.28+
- kustomize
- AWS CLI
- Helm 3
- Docker

### Access Required
- AWS/EKS cluster admin
- GitHub repo write access
- Container registry permissions
- Secrets Manager access

## Architecture

- **Ingress**: NGINX with SSL/TLS termination
- **App**: Node.js pods (3-10 replicas) with init containers for DB migrations
- **Database**: PostgreSQL (RDS recommended)
- **Cache**: Redis (ElastiCache or in-cluster)
- **Storage**: EFS (uploads), EBS (Redis data)
- **Auto-scaling**: HPA based on CPU (70%) / Memory (80%)

## Initial Setup

### 1. Create EKS Clusters

```bash
# Staging
eksctl create cluster --name hse-staging-cluster --region us-east-1 --version 1.28 --node-type t3.medium --nodes 3 --managed

# Production
eksctl create cluster --name hse-production-cluster --region us-east-1 --version 1.28 --node-type t3.large --nodes 3 --managed
```

### 2. Install Operators

```bash
# NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace

# Cert-Manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# External Secrets
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 3. Create Namespaces

```bash
kubectl create namespace hse-staging
kubectl create namespace hse-production
```

### 4. Configure Secrets

```bash
# Create IAM policy and service account
eksctl create iamserviceaccount --name hse-app --namespace hse-production --cluster hse-production-cluster --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/HSESecretsManagerPolicy --approve

# Apply external secrets
kubectl apply -f k8s/secrets/aws-secrets-manager.yaml -n hse-production
```

## Deployment Procedures

### Automated (Recommended)

Push to branches triggers deployment:
- `staging` → staging environment
- `main` → production environment

```bash
git checkout main && git merge staging && git push origin main
```

### Manual Deployment

```bash
# 1. Build and push
docker build -t ghcr.io/your-org/hse-digital:v1.0.0 .
docker push ghcr.io/your-org/hse-digital:v1.0.0

# 2. Deploy
kubectl apply -k k8s/overlays/production

# 3. Monitor
kubectl rollout status deployment/prod-hse-app -n hse-production

# 4. Run migrations
kubectl apply -f k8s/base/migration-job.yaml -n hse-production
kubectl wait --for=condition=complete --timeout=10m job/db-migration -n hse-production

# 5. Verify
kubectl get pods,svc,ingress -n hse-production
curl http://localhost:8080/api/health
```

## Rollback Procedures

```bash
# Quick rollback
kubectl rollout undo deployment/prod-hse-app -n hse-production

# Rollback to specific revision
kubectl rollout undo deployment/prod-hse-app --to-revision=2 -n hse-production

# Set specific image
kubectl set image deployment/prod-hse-app app=ghcr.io/your-org/hse-digital:v1.0.0 -n hse-production
```

## Monitoring & Health Checks

### Health Endpoints
- Liveness: `GET /api/health`
- Readiness: `GET /api/health`
- Startup: `GET /api/health`

### Commands

```bash
# Pod status
kubectl get pods -n hse-production
kubectl describe pod <pod-name> -n hse-production

# Logs
kubectl logs <pod-name> -c app -n hse-production --tail=100
kubectl logs <pod-name> -c db-migration -n hse-production

# Resource usage
kubectl top pods -n hse-production
kubectl top nodes

# HPA status
kubectl get hpa -n hse-production
kubectl describe hpa hse-app-hpa -n hse-production
```

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n hse-production
kubectl get events -n hse-production | grep Failed
kubectl get secrets,configmaps -n hse-production
```

### Init Container Failures

```bash
kubectl logs <pod-name> -c db-migration -n hse-production
```

### Service Not Accessible

```bash
kubectl get endpoints hse-app-service -n hse-production
kubectl describe ingress hse-ingress -n hse-production
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

### High CPU/Memory

```bash
kubectl top pods -n hse-production
kubectl scale deployment/prod-hse-app --replicas=5 -n hse-production
```

## Secrets Management

### AWS Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret --name hse-digital/production --secret-string file://secrets.json

# Update secret
aws secretsmanager update-secret --secret-id hse-digital/production --secret-string file://secrets.json

# Restart pods
kubectl rollout restart deployment/prod-hse-app -n hse-production
```

### Vault

```bash
vault kv put secret/hse-digital/production database_url="..." jwt_secret="..."
kubectl rollout restart deployment/prod-hse-app -n hse-production
```

## Scaling Operations

### Manual

```bash
kubectl scale deployment/prod-hse-app --replicas=5 -n hse-production
```

### Auto-scaling

HPA automatically scales 3-10 replicas based on CPU (70%) and memory (80%) thresholds.

## Disaster Recovery

### Database Backup

```bash
aws rds create-db-snapshot --db-instance-identifier hse-prod-db --db-snapshot-identifier hse-prod-$(date +%Y%m%d)
```

### Database Restore

```bash
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier hse-prod-restored --db-snapshot-identifier hse-prod-20240101
kubectl edit secret hse-secrets -n hse-production
kubectl rollout restart deployment/prod-hse-app -n hse-production
```

## GitHub Actions Secrets

Configure in repository settings:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EKS_CLUSTER_NAME_STAGING`
- `EKS_CLUSTER_NAME_PROD`
- `SLACK_WEBHOOK` (optional)

## Quick Reference

```bash
# Status
kubectl get deployments,pods,svc,ingress -n hse-production

# Logs
kubectl logs -f deployment/prod-hse-app -n hse-production

# Shell access
kubectl exec -it <pod-name> -n hse-production -- /bin/sh

# Port forward
kubectl port-forward -n hse-production svc/hse-app-service 8080:80

# Restart
kubectl rollout restart deployment/prod-hse-app -n hse-production
```
