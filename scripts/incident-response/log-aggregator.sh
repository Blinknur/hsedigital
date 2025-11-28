#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Aggregate and query production logs for debugging.

COMMANDS:
    errors [MINUTES]      Show errors from last N minutes (default: 60)
    search PATTERN        Search logs for pattern
    tenant TENANT_ID      Filter logs by tenant
    performance           Show slow queries and high latency
    export                Export logs to file
    tail                  Tail logs in real-time

OPTIONS:
    -h, --help            Show this help message
    -c, --container NAME  Container name (default: hse_app)
    -n, --lines N         Number of lines (default: 1000)
    -f, --format FORMAT   Output format: text|json (default: text)

EXAMPLES:
    $0 errors 30
    $0 search "database connection"
    $0 tenant org_123
    $0 performance
    $0 tail
EOF
}

show_errors() {
    local container=${1:-hse_app}
    local minutes=${2:-60}
    log_info "Showing errors from last $minutes minutes..."
    docker logs "$container" --since "${minutes}m" 2>&1 | grep -E '"level":"error"|ERROR|"level":50' | tail -100
}

search_logs() {
    local container=${1:-hse_app}
    local pattern=$2
    local lines=${3:-1000}
    log_info "Searching for: $pattern"
    docker logs "$container" --tail "$lines" 2>&1 | grep -i "$pattern"
}

filter_by_tenant() {
    local container=${1:-hse_app}
    local tenant_id=$2
    local lines=${3:-1000}
    log_info "Filtering logs for tenant: $tenant_id"
    docker logs "$container" --tail "$lines" 2>&1 | grep "$tenant_id"
}

show_performance() {
    local container=${1:-hse_app}
    log_info "Analyzing performance issues..."
    echo ""
    echo "=== Slow Queries ==="
    docker logs "$container" --tail 5000 2>&1 | grep -E 'slow_query|Slow query' | tail -20
    echo ""
    echo "=== High Latency Requests ==="
    docker logs "$container" --tail 5000 2>&1 | grep -E 'durationMs":[5-9][0-9]{3}|durationMs":[0-9]{5}' | tail -20
}

export_logs() {
    local container=${1:-hse_app}
    local output_dir="$PROJECT_ROOT/data/diagnostics/logs-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$output_dir"
    log_info "Exporting logs..."
    docker logs "$container" > "$output_dir/app-logs.txt" 2>&1
    docker logs hse_db > "$output_dir/db-logs.txt" 2>&1
    docker logs hse_cache > "$output_dir/redis-logs.txt" 2>&1
    log_success "Logs exported to: $output_dir"
    echo "$output_dir"
}

tail_logs() {
    local container=${1:-hse_app}
    log_info "Tailing logs for $container (Ctrl+C to stop)..."
    docker logs -f "$container"
}

main() {
    local command=${1:-errors}
    local container="hse_app"
    local lines=1000
    local format="text"
    shift || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help) show_usage; exit 0 ;;
            -c|--container) container="$2"; shift 2 ;;
            -n|--lines) lines="$2"; shift 2 ;;
            -f|--format) format="$2"; shift 2 ;;
            *) break ;;
        esac
    done
    case $command in
        errors) show_errors "$container" "${1:-60}" ;;
        search) [ -z "${1:-}" ] && { log_error "Pattern required"; exit 1; }; search_logs "$container" "$1" "$lines" ;;
        tenant) [ -z "${1:-}" ] && { log_error "Tenant ID required"; exit 1; }; filter_by_tenant "$container" "$1" "$lines" ;;
        performance) show_performance "$container" ;;
        export) export_logs "$container" ;;
        tail) tail_logs "$container" ;;
        *) log_error "Unknown command: $command"; show_usage; exit 1 ;;
    esac
}

[ "${BASH_SOURCE[0]}" = "${0}" ] && main "$@"
