#!/bin/bash
set -e

IMAGE_TAG="${1:-hse-digital:latest}"

echo "📊 Updating Docker baseline metrics for: $IMAGE_TAG"

if ! docker image inspect "$IMAGE_TAG" > /dev/null 2>&1; then
    echo "❌ Error: Image $IMAGE_TAG not found"
    echo "Please build the image first with: docker build -f docker/Dockerfile -t $IMAGE_TAG ."
    exit 1
fi

IMAGE_SIZE=$(docker inspect "$IMAGE_TAG" --format='{{.Size}}')
IMAGE_SIZE_MB=$(echo "scale=2; $IMAGE_SIZE / 1024 / 1024" | bc)
LAYER_COUNT=$(docker history "$IMAGE_TAG" --no-trunc | wc -l)
LAYER_COUNT=$((LAYER_COUNT - 1))
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

mkdir -p .docker-metrics

cat > .docker-metrics/baseline.json << JSONEOF
{
  "size": $IMAGE_SIZE,
  "size_mb": $IMAGE_SIZE_MB,
  "layer_count": $LAYER_COUNT,
  "timestamp": "$TIMESTAMP",
  "git_commit": "$GIT_COMMIT",
  "git_branch": "$GIT_BRANCH",
  "image_tag": "$IMAGE_TAG"
}
JSONEOF

echo "✅ Baseline updated successfully!"
echo "   Size: ${IMAGE_SIZE_MB} MB"
echo "   Layers: ${LAYER_COUNT}"
echo "   Commit: ${GIT_COMMIT}"
echo ""
echo "📁 Baseline saved to: .docker-metrics/baseline.json"
echo ""
echo "💡 Commit this file to track image size over time:"
echo "   git add .docker-metrics/baseline.json"
echo "   git commit -m 'Update Docker baseline metrics'"
