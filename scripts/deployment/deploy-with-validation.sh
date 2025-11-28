#!/bin/bash

set -e

ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-$(git rev-parse --short HEAD)}
AUTO_ROLLBACK=${3:-true}

echo "🚀 Starting deployment with validation"
echo "Environment: ${ENVIRONMENT}"
echo "Image Tag: ${IMAGE_TAG}"
echo "Auto Rollback: ${AUTO_ROLLBACK}"
echo "=================================================="

# Determine namespace
if [ "$ENVIRONMENT" = "production" ]; then
    NAMESPACE="hse-production"
    OVERLAY="production"
elif [ "$ENVIRONMENT" = "staging" ]; then
    NAMESPACE="hse-staging"
    OVERLAY="staging"
else
    echo "Error: Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Step 1: Build and push Docker image
echo "📦 Step 1: Building Docker image..."
docker build -t ghcr.io/your-org/hse-digital:${IMAGE_TAG} -f docker/Dockerfile .

echo "📤 Pushing image to registry..."
docker push ghcr.io/your-org/hse-digital:${IMAGE_TAG}

# Step 2: Update kustomization
echo "📝 Step 2: Updating kustomization..."
cd k8s/overlays/${OVERLAY}
kustomize edit set image app-image=ghcr.io/your-org/hse-digital:${IMAGE_TAG}
cd ../../..

# Step 3: Apply deployment
echo "🚢 Step 3: Applying deployment to ${NAMESPACE}..."
kubectl apply -k k8s/overlays/${OVERLAY}

# Step 4: Wait for initial rollout
echo "⏳ Step 4: Waiting for initial rollout..."
sleep 10

# Step 5: Run validation
echo "✅ Step 5: Running deployment validation..."
export AUTO_ROLLBACK=${AUTO_ROLLBACK}

if bash k8s/validation/validate-deployment.sh ${NAMESPACE} ${IMAGE_TAG} ${ENVIRONMENT}; then
    echo "✅ Deployment validation passed!"
    
    # Step 6: Send success notification
    echo "📧 Sending success notification..."
    
    # Integration with monitoring
    if [ ! -z "${SENTRY_AUTH_TOKEN}" ]; then
        echo "📊 Creating Sentry release..."
        # Placeholder for Sentry release creation
    fi
    
    if [ ! -z "${PROMETHEUS_PUSHGATEWAY}" ]; then
        echo "📊 Pushing deployment metrics to Prometheus..."
        # Placeholder for Prometheus metrics
    fi
    
    echo "=================================================="
    echo "✅ Deployment completed successfully!"
    echo "Environment: ${ENVIRONMENT}"
    echo "Image: ghcr.io/your-org/hse-digital:${IMAGE_TAG}"
    echo "=================================================="
    
    exit 0
else
    echo "❌ Deployment validation failed!"
    
    # Step 7: Automatic rollback was handled by validation script
    echo "=================================================="
    echo "❌ Deployment failed and was rolled back"
    echo "=================================================="
    
    exit 1
fi
