#!/bin/bash
set -e

IMAGE_TAG="${1:-hse-digital:latest}"
OUTPUT_DIR="${2:-.docker-security}"

echo "🔒 Running comprehensive security scan on: $IMAGE_TAG"

if ! docker image inspect "$IMAGE_TAG" > /dev/null 2>&1; then
    echo "❌ Error: Image $IMAGE_TAG not found"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "🔍 Running Trivy scan..."
if command -v trivy &> /dev/null; then
    trivy image --format json --output "$OUTPUT_DIR/trivy-results.json" "$IMAGE_TAG"
    trivy image --format table "$IMAGE_TAG" | tee "$OUTPUT_DIR/trivy-report.txt"
else
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy:latest image \
        --format json \
        --output /dev/stdout \
        "$IMAGE_TAG" > "$OUTPUT_DIR/trivy-results.json"
    
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy:latest image \
        --format table \
        "$IMAGE_TAG" | tee "$OUTPUT_DIR/trivy-report.txt"
fi

if [ -f "$OUTPUT_DIR/trivy-results.json" ]; then
    CRITICAL=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' "$OUTPUT_DIR/trivy-results.json" || echo 0)
    HIGH=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' "$OUTPUT_DIR/trivy-results.json" || echo 0)
    MEDIUM=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="MEDIUM")] | length' "$OUTPUT_DIR/trivy-results.json" || echo 0)
    LOW=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="LOW")] | length' "$OUTPUT_DIR/trivy-results.json" || echo 0)
    
    echo ""
    echo "📊 Security Scan Summary:"
    echo "   🔴 Critical: $CRITICAL"
    echo "   🟠 High: $HIGH"
    echo "   🟡 Medium: $MEDIUM"
    echo "   🟢 Low: $LOW"
    echo ""
    
    if [ "$CRITICAL" -gt 5 ] || [ "$HIGH" -gt 20 ]; then
        echo "⚠️  WARNING: High vulnerability count detected!"
        echo "   Please review and address critical vulnerabilities."
    else
        echo "✅ Vulnerability count within acceptable thresholds"
    fi
fi

echo ""
echo "📁 Security reports saved to: $OUTPUT_DIR/"
echo "   - trivy-results.json"
echo "   - trivy-report.txt"
