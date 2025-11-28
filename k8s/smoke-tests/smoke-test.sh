#!/bin/bash

set -e

NAMESPACE=${1:-hse-staging}
SERVICE_NAME=${2:-hse-app-service}
TIMEOUT=${3:-300}
RETRIES=${4:-5}

echo "🧪 Starting smoke tests for deployment in namespace: ${NAMESPACE}"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    local test_name=$1
    local status=$2
    if [ "$status" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} ${test_name}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} ${test_name}"
        ((TESTS_FAILED++))
    fi
}

# Get pod name
get_pod() {
    kubectl get pods -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null
}

# Get service endpoint
get_service_endpoint() {
    kubectl get svc ${SERVICE_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.clusterIP}' 2>/dev/null
}

# Wait for pods to be ready
echo "⏳ Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=hse-app -n ${NAMESPACE} --timeout=${TIMEOUT}s
print_result "Pods are ready" $?

# Get pod and service info
POD_NAME=$(get_pod)
SERVICE_IP=$(get_service_endpoint)

if [ -z "$POD_NAME" ]; then
    echo -e "${RED}Error: No pods found${NC}"
    exit 1
fi

echo "Pod: ${POD_NAME}"
echo "Service IP: ${SERVICE_IP}"
echo ""

# Test 1: Health Check Endpoint
echo "🔍 Test 1: Health Check Endpoint"
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- wget -q -O- http://localhost:3001/api/health > /tmp/health.json 2>&1
HEALTH_STATUS=$(cat /tmp/health.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$HEALTH_STATUS" = "healthy" ]; then
    print_result "Health check endpoint responds with healthy status" 0
else
    print_result "Health check endpoint responds with healthy status" 1
fi
echo ""

# Test 2: Database Connectivity
echo "🔍 Test 2: Database Connectivity"
DB_CHECK=$(cat /tmp/health.json | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
if [ "$DB_CHECK" = "connected" ]; then
    print_result "Database connectivity verified" 0
else
    print_result "Database connectivity verified" 1
fi
echo ""

# Test 3: Redis Connectivity
echo "🔍 Test 3: Redis Connectivity"
REDIS_CHECK=$(cat /tmp/health.json | grep -o '"redis":"[^"]*"' | cut -d'"' -f4)
if [ "$REDIS_CHECK" = "connected" ]; then
    print_result "Redis connectivity verified" 0
else
    print_result "Redis connectivity verified" 1
fi
echo ""

# Test 4: Prisma Client Initialization
echo "🔍 Test 4: Prisma Client Initialization"
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- node -e "
const prisma = require('/app/node_modules/.prisma/client');
console.log('Prisma client loaded');
process.exit(0);
" > /dev/null 2>&1
print_result "Prisma client initialized successfully" $?
echo ""

# Test 5: API Response Time
echo "🔍 Test 5: API Response Time (< 2000ms)"
START_TIME=$(date +%s%3N)
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- wget -q -O- http://localhost:3001/api/health > /dev/null 2>&1
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))
if [ $RESPONSE_TIME -lt 2000 ]; then
    print_result "API response time: ${RESPONSE_TIME}ms" 0
else
    print_result "API response time: ${RESPONSE_TIME}ms (threshold: 2000ms)" 1
fi
echo ""

# Test 6: Environment Variables
echo "🔍 Test 6: Required Environment Variables"
ENV_CHECK=0
for var in NODE_ENV DATABASE_URL JWT_SECRET REFRESH_SECRET; do
    kubectl exec -n ${NAMESPACE} ${POD_NAME} -- sh -c "[ ! -z \"\${$var}\" ]" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $var is set"
    else
        echo -e "  ${RED}✗${NC} $var is NOT set"
        ENV_CHECK=1
    fi
done
print_result "All required environment variables are set" $ENV_CHECK
echo ""

# Test 7: Metrics Endpoint
echo "🔍 Test 7: Prometheus Metrics Endpoint"
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- wget -q -O- http://localhost:3001/metrics 2>&1 | head -5 > /tmp/metrics.txt
if grep -q "^# HELP" /tmp/metrics.txt; then
    print_result "Metrics endpoint is accessible" 0
else
    print_result "Metrics endpoint is accessible" 1
fi
echo ""

# Test 8: Container Resource Limits
echo "🔍 Test 8: Container Resource Limits"
MEMORY_LIMIT=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.containers[0].resources.limits.memory}')
CPU_LIMIT=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.containers[0].resources.limits.cpu}')
echo "  Memory limit: ${MEMORY_LIMIT}"
echo "  CPU limit: ${CPU_LIMIT}"
if [ ! -z "$MEMORY_LIMIT" ] && [ ! -z "$CPU_LIMIT" ]; then
    print_result "Resource limits are configured" 0
else
    print_result "Resource limits are configured" 1
fi
echo ""

# Test 9: Pod Restart Count
echo "🔍 Test 9: Pod Stability (Restart Count)"
RESTART_COUNT=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.status.containerStatuses[0].restartCount}')
echo "  Restart count: ${RESTART_COUNT}"
if [ "$RESTART_COUNT" -eq 0 ]; then
    print_result "No unexpected restarts detected" 0
else
    print_result "Pod has restarted ${RESTART_COUNT} times" 1
fi
echo ""

# Test 10: Service Accessibility
echo "🔍 Test 10: Service Accessibility"
kubectl run smoke-test-client --rm -i --restart=Never --image=curlimages/curl:latest -n ${NAMESPACE} -- \
    curl -s -o /dev/null -w "%{http_code}" http://${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local/api/health > /tmp/service_status.txt 2>&1
SERVICE_STATUS=$(cat /tmp/service_status.txt 2>/dev/null | tail -1)
if [ "$SERVICE_STATUS" = "200" ]; then
    print_result "Service is accessible within cluster" 0
else
    print_result "Service is accessible within cluster (HTTP $SERVICE_STATUS)" 1
fi
echo ""

# Test 11: Liveness Probe
echo "🔍 Test 11: Liveness Probe Configuration"
LIVENESS_PATH=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.containers[0].livenessProbe.httpGet.path}')
if [ "$LIVENESS_PATH" = "/api/health" ]; then
    print_result "Liveness probe configured correctly" 0
else
    print_result "Liveness probe configured correctly" 1
fi
echo ""

# Test 12: Readiness Probe
echo "🔍 Test 12: Readiness Probe Configuration"
READINESS_PATH=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.containers[0].readinessProbe.httpGet.path}')
if [ "$READINESS_PATH" = "/api/health" ]; then
    print_result "Readiness probe configured correctly" 0
else
    print_result "Readiness probe configured correctly" 1
fi
echo ""

# Test 13: Multiple Replicas Health
echo "🔍 Test 13: All Replica Pods Are Ready"
DESIRED_REPLICAS=$(kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].spec.replicas}')
READY_REPLICAS=$(kubectl get deployment -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].status.readyReplicas}')
echo "  Desired: ${DESIRED_REPLICAS}, Ready: ${READY_REPLICAS}"
if [ "$DESIRED_REPLICAS" = "$READY_REPLICAS" ]; then
    print_result "All replicas are ready" 0
else
    print_result "All replicas are ready" 1
fi
echo ""

# Test 14: HPA Configuration
echo "🔍 Test 14: Horizontal Pod Autoscaler"
HPA_EXISTS=$(kubectl get hpa -n ${NAMESPACE} -l app=hse-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$HPA_EXISTS" ]; then
    print_result "HPA is configured" 0
else
    print_result "HPA is configured" 1
fi
echo ""

# Test 15: Security Context
echo "🔍 Test 15: Security Context Configuration"
RUN_AS_NON_ROOT=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.spec.containers[0].securityContext.runAsNonRoot}')
if [ "$RUN_AS_NON_ROOT" = "true" ]; then
    print_result "Running as non-root user" 0
else
    print_result "Running as non-root user" 1
fi
echo ""

# Cleanup
rm -f /tmp/health.json /tmp/metrics.txt /tmp/service_status.txt

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo -e "Tests passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests failed: ${RED}${TESTS_FAILED}${NC}"
echo "Total tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Deployment may have issues.${NC}"
    exit 1
fi
