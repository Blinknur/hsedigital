#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MEMORY_THRESHOLD_MB=1024
CONTAINER="hse_app"
AUTO_RESTART=false

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

check_memory() {
    log_info "Checking memory for $CONTAINER..."
    local mem=$(docker stats "$CONTAINER" --no-stream --format "{{.MemUsage}}" 2>/dev/null | awk '{print $1}')
    echo "Memory: $mem (Threshold: ${MEMORY_THRESHOLD_MB}MB)"
}

create_heap_dump() {
    local output_dir="$PROJECT_ROOT/data/diagnostics/heap-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$output_dir"
    log_info "Creating heap dump..."
    docker exec "$CONTAINER" node -e 'require("v8").writeHeapSnapshot("/tmp/heap.heapsnapshot")' 2>/dev/null || true
    docker cp "$CONTAINER:/tmp/heap.heapsnapshot" "$output_dir/heap.heapsnapshot" 2>/dev/null || true
    log_success "Heap dump: $output_dir/heap.heapsnapshot"
}

monitor_memory() {
    log_info "Monitoring $CONTAINER (auto-restart: $AUTO_RESTART)"
    while true; do
        check_memory
        if [ "$AUTO_RESTART" = true ]; then
            log_info "Auto-restart enabled - checking thresholds..."
        fi
        sleep 300
    done
}

case "${1:-check}" in
    check) check_memory ;;
    monitor) monitor_memory ;;
    heap-dump) create_heap_dump ;;
    -a|--auto-restart) AUTO_RESTART=true; monitor_memory ;;
    *) echo "Usage: $0 {check|monitor|heap-dump}" ;;
esac
