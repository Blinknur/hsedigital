#!/bin/bash

set -e

NAMESPACE=${1:-hse-staging}
IMAGE_TAG=${2:-latest}
ENVIRONMENT=${3:-staging}

echo "🔍 Starting deployment validation for ${ENVIRONMENT}"
echo "Namespace: ${NAMESPACE}"
echo "Image Tag: ${IMAGE_TAG}"
echo "=================================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VALIDATION_FAILED=0

# Step 1: Wait for deployment rollout
echo "⏳ Step 1: Waiting for deployment rollout..."
DEPLOYMENT=$(kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}')

if ! kubectl rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE} --timeout=600s; then
    echo -e "${RED}✗ Deployment rollout failed${NC}"
    VALIDATION_FAILED=1
else
    echo -e "${GREEN}✓ Deployment rollout completed${NC}"
fi

# Step 2: Verify all pods are ready
echo "\n⏳ Step 2: Verifying pod readiness..."
DESIRED=$(kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')
READY=$(kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')

if [ "$DESIRED" = "$READY" ]; then
    echo -e "${GREEN}✓ All ${READY}/${DESIRED} replicas are ready${NC}"
else
    echo -e "${RED}✗ Only ${READY}/${DESIRED} replicas are ready${NC}"
    VALIDATION_FAILED=1
fi

# Step 3: Run smoke tests
echo "\n⏳ Step 3: Running smoke tests..."
if bash $(dirname $0)/../smoke-tests/smoke-test.sh ${NAMESPACE}; then
    echo -e "${GREEN}✓ Smoke tests passed${NC}"
else
    echo -e "${RED}✗ Smoke tests failed${NC}"
    VALIDATION_FAILED=1
fi

# Step 4: Check for pod restarts
echo "\n⏳ Step 4: Checking for pod restarts..."
MAX_RESTARTS=0
for pod in $(kubectl get pods -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[*].metadata.name}'); do
    RESTARTS=$(kubectl get pod $pod -n ${NAMESPACE} -o jsonpath='{.status.containerStatuses[0].restartCount}')
    if [ $RESTARTS -gt $MAX_RESTARTS ]; then
        MAX_RESTARTS=$RESTARTS
    fi
done

if [ $MAX_RESTARTS -eq 0 ]; then
    echo -e "${GREEN}✓ No pod restarts detected${NC}"
else
    echo -e "${YELLOW}⚠ Maximum restart count: ${MAX_RESTARTS}${NC}"
    if [ $MAX_RESTARTS -gt 2 ]; then
        VALIDATION_FAILED=1
    fi
fi

# Step 5: Monitor Sentry for errors
echo "\n⏳ Step 5: Monitoring for errors..."
echo "Waiting 30 seconds to collect error metrics..."
sleep 30

# Get recent pod logs and check for critical errors
POD=$(kubectl get pods -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}')
ERROR_COUNT=$(kubectl logs ${POD} -n ${NAMESPACE} --tail=100 | grep -c "ERROR\|FATAL\|CRITICAL" || true)

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ No critical errors in logs${NC}"
elif [ $ERROR_COUNT -lt 5 ]; then
    echo -e "${YELLOW}⚠ Found ${ERROR_COUNT} errors in logs (acceptable)${NC}"
else
    echo -e "${RED}✗ Found ${ERROR_COUNT} errors in logs (threshold: 5)${NC}"
    VALIDATION_FAILED=1
fi

# Step 6: Verify metrics endpoint
echo "\n⏳ Step 6: Verifying metrics collection..."
METRICS=$(kubectl exec -n ${NAMESPACE} ${POD} -- wget -q -O- http://localhost:3001/metrics 2>&1 || true)

if echo "$METRICS" | grep -q "nodejs_"; then
    echo -e "${GREEN}✓ Metrics are being collected${NC}"
else
    echo -e "${YELLOW}⚠ Metrics collection may have issues${NC}"
fi

# Step 7: Test response time
echo "\n⏳ Step 7: Testing API response time..."
START=$(date +%s%N)
kubectl exec -n ${NAMESPACE} ${POD} -- wget -q -O- http://localhost:3001/api/health > /dev/null 2>&1
END=$(date +%s%N)
RESPONSE_TIME=$(( (END - START) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    echo -e "${GREEN}✓ Response time: ${RESPONSE_TIME}ms (good)${NC}"
elif [ $RESPONSE_TIME -lt 2000 ]; then
    echo -e "${YELLOW}⚠ Response time: ${RESPONSE_TIME}ms (acceptable)${NC}"
else
    echo -e "${RED}✗ Response time: ${RESPONSE_TIME}ms (threshold: 2000ms)${NC}"
    VALIDATION_FAILED=1
fi

# Step 8: Verify image tag
echo "\n⏳ Step 8: Verifying deployed image..."
DEPLOYED_IMAGE=$(kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "Deployed image: ${DEPLOYED_IMAGE}"

if echo "${DEPLOYED_IMAGE}" | grep -q ":${IMAGE_TAG}"; then
    echo -e "${GREEN}✓ Correct image tag deployed${NC}"
else
    echo -e "${YELLOW}⚠ Image tag mismatch${NC}"
fi

# Summary
echo "\n=================================================="
echo "📊 Validation Summary"
echo "=================================================="

if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment validation PASSED${NC}"
    echo "Deployment is healthy and ready for traffic"
    
    # Tag deployment as validated
    kubectl annotate deployment/${DEPLOYMENT} -n ${NAMESPACE} \
        validated.timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        validated.environment="${ENVIRONMENT}" \
        validated.image-tag="${IMAGE_TAG}" \
        --overwrite
    
    exit 0
else
    echo -e "${RED}❌ Deployment validation FAILED${NC}"
    echo "Consider rolling back the deployment"
    
    # Trigger automatic rollback
    if [ "${AUTO_ROLLBACK}" = "true" ]; then
        echo "\n🔄 Triggering automatic rollback..."
        bash $(dirname $0)/rollback.sh ${NAMESPACE} "Validation failed"
    fi
    
    exit 1
fi
