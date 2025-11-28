#!/bin/bash

set -e

NAMESPACE=${1:-hse-production}
IMAGE_TAG=${2:-latest}
ENVIRONMENT=${3:-production}
DEPLOYMENT_STATUS=${4:-success}

echo "📊 Integrating deployment with monitoring stack"
echo "Namespace: ${NAMESPACE}"
echo "Environment: ${ENVIRONMENT}"
echo "Status: ${DEPLOYMENT_STATUS}"
echo "=================================================="

# Get deployment information
DEPLOYMENT=$(kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 1. Create Sentry Release
if [ ! -z "${SENTRY_AUTH_TOKEN}" ] && [ ! -z "${SENTRY_ORG}" ]; then
    echo "📊 Creating Sentry release..."
    
    curl -sL https://sentry.io/get-cli/ | bash || true
    
    if command -v sentry-cli &> /dev/null; then
        sentry-cli releases new -p hse-digital ${ENVIRONMENT}-${IMAGE_TAG}
        sentry-cli releases set-commits ${ENVIRONMENT}-${IMAGE_TAG} --auto || true
        sentry-cli releases finalize ${ENVIRONMENT}-${IMAGE_TAG}
        sentry-cli releases deploys ${ENVIRONMENT}-${IMAGE_TAG} new -e ${ENVIRONMENT}
        
        echo "✓ Sentry release created"
    else
        echo "⚠ sentry-cli not available, skipping"
    fi
else
    echo "⚠ Sentry credentials not configured, skipping"
fi

# 2. Push metrics to Prometheus Pushgateway
if [ ! -z "${PROMETHEUS_PUSHGATEWAY}" ]; then
    echo "📊 Pushing deployment metrics to Prometheus..."
    
    cat <<EOF | curl --data-binary @- ${PROMETHEUS_PUSHGATEWAY}/metrics/job/deployment/instance/${ENVIRONMENT}
# TYPE deployment_info gauge
deployment_info{environment="${ENVIRONMENT}",image_tag="${IMAGE_TAG}",namespace="${NAMESPACE}",deployment="${DEPLOYMENT}",timestamp="${TIMESTAMP}"} 1
# TYPE deployment_status gauge
deployment_status{environment="${ENVIRONMENT}",status="${DEPLOYMENT_STATUS}"} $([ "${DEPLOYMENT_STATUS}" = "success" ] && echo "1" || echo "0")
# TYPE deployment_timestamp gauge
deployment_timestamp{environment="${ENVIRONMENT}"} $(date +%s)
EOF
    
    echo "✓ Metrics pushed to Prometheus"
else
    echo "⚠ Prometheus Pushgateway not configured, skipping"
fi

# 3. Create Kubernetes event annotation
echo "📊 Annotating deployment with metadata..."
kubectl annotate deployment/${DEPLOYMENT} -n ${NAMESPACE} \
    deployment.timestamp="${TIMESTAMP}" \
    deployment.image-tag="${IMAGE_TAG}" \
    deployment.status="${DEPLOYMENT_STATUS}" \
    deployment.environment="${ENVIRONMENT}" \
    --overwrite

echo "✓ Deployment annotated"

# 4. Send custom alert to Prometheus Alertmanager (if configured)
if [ ! -z "${ALERTMANAGER_URL}" ] && [ "${DEPLOYMENT_STATUS}" = "success" ]; then
    echo "📊 Sending deployment notification to Alertmanager..."
    
    cat <<EOF | curl -XPOST -H "Content-Type: application/json" ${ALERTMANAGER_URL}/api/v1/alerts -d @-
[
  {
    "labels": {
      "alertname": "DeploymentCompleted",
      "severity": "info",
      "environment": "${ENVIRONMENT}",
      "namespace": "${NAMESPACE}"
    },
    "annotations": {
      "summary": "Deployment completed successfully",
      "description": "Deployment of ${IMAGE_TAG} to ${ENVIRONMENT} completed successfully at ${TIMESTAMP}"
    }
  }
]
EOF
    
    echo "✓ Alert sent to Alertmanager"
fi

# 5. Log deployment event
echo "📊 Logging deployment event..."
kubectl create event deployment-completed \
    --type=Normal \
    --reason=DeploymentCompleted \
    --message="Deployment of ${IMAGE_TAG} to ${ENVIRONMENT} completed with status: ${DEPLOYMENT_STATUS}" \
    --namespace=${NAMESPACE} || true

echo "=================================================="
echo "✅ Monitoring integration completed"
echo "=================================================="
