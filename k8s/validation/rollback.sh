#!/bin/bash

set -e

NAMESPACE=${1:-hse-production}
REASON=${2:-"Health check failure"}
REVISION=${3:-""}

echo "🔄 Starting automated rollback for namespace: ${NAMESPACE}"
echo "Reason: ${REASON}"
echo "=================================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get deployment name
DEPLOYMENT=$(kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}')

if [ -z "$DEPLOYMENT" ]; then
    echo -e "${RED}Error: No deployment found${NC}"
    exit 1
fi

echo "Deployment: ${DEPLOYMENT}"

# Get current revision
CURRENT_REVISION=$(kubectl rollout history deployment/${DEPLOYMENT} -n ${NAMESPACE} | tail -1 | awk '{print $1}')
echo "Current revision: ${CURRENT_REVISION}"

# Trigger rollback
if [ -z "$REVISION" ]; then
    echo "Rolling back to previous revision..."
    kubectl rollout undo deployment/${DEPLOYMENT} -n ${NAMESPACE}
else
    echo "Rolling back to revision ${REVISION}..."
    kubectl rollout undo deployment/${DEPLOYMENT} --to-revision=${REVISION} -n ${NAMESPACE}
fi

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE} --timeout=300s

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Rollback completed successfully${NC}"
    
    # Verify health after rollback
    echo "🔍 Verifying health after rollback..."
    sleep 10
    
    POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n ${NAMESPACE} ${POD_NAME} -- wget -q -O- http://localhost:3001/api/health > /tmp/rollback_health.json 2>&1
    
    HEALTH_STATUS=$(cat /tmp/rollback_health.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ Health check passed after rollback${NC}"
        
        # Send notification (placeholder - integrate with your notification system)
        echo "📧 Sending rollback notification..."
        kubectl annotate deployment/${DEPLOYMENT} -n ${NAMESPACE} \
            rollback.timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
            rollback.reason="${REASON}" \
            --overwrite
        
        rm -f /tmp/rollback_health.json
        exit 0
    else
        echo -e "${RED}✗ Health check failed after rollback${NC}"
        rm -f /tmp/rollback_health.json
        exit 1
    fi
else
    echo -e "${RED}❌ Rollback failed${NC}"
    exit 1
fi
