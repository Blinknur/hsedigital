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
    cat << USAGE
Usage: \$0 [COMMAND] [OPTIONS]

Automatically collect diagnostic data when critical alerts fire.

COMMANDS:
    collect TYPE          Collect diagnostics for alert type
    database              Database connection issues
    memory                Memory-related alerts
    performance           Performance degradation
    full                  Full system diagnostic

OPTIONS:
    -h, --help            Show this help message
    -o, --output DIR      Output directory (default: auto-generated)

EXAMPLES:
    \$0 collect database
    \$0 memory
    \$0 full
USAGE
}

collect_system_info() {
    local output_dir=$1
    log_info "Collecting system information..."
    
    docker ps -a > "$output_dir/docker-ps.txt" 2>&1
    docker stats --no-stream > "$output_dir/docker-stats.txt" 2>&1
    df -h > "$output_dir/disk-usage.txt" 2>&1
    free -h > "$output_dir/memory.txt" 2>&1 || true
}

collect_logs() {
    local output_dir=$1
    log_info "Collecting container logs..."
    
    docker logs hse_app --tail 2000 > "$output_dir/app-logs.txt" 2>&1
    docker logs hse_db --tail 1000 > "$output_dir/db-logs.txt" 2>&1
    docker logs hse_cache --tail 1000 > "$output_dir/redis-logs.txt" 2>&1
}

collect_database_diagnostics() {
    local output_dir=$1
    log_info "Collecting database diagnostics..."
    
    docker exec hse_db psql -U hse_admin -d hse_platform -c "SELECT * FROM pg_stat_activity;" > "$output_dir/db-connections.txt" 2>&1 || true
    docker exec hse_db psql -U hse_admin -d hse_platform -c "SELECT * FROM pg_stat_database;" > "$output_dir/db-stats.txt" 2>&1 || true
    "$SCRIPT_DIR/db-pool-monitor.sh" export > "$output_dir/pool-metrics.json" 2>&1 || true
}

collect_memory_diagnostics() {
    local output_dir=$1
    log_info "Collecting memory diagnostics..."
    
    docker stats --no-stream > "$output_dir/memory-stats.txt" 2>&1
    docker exec hse_app node -e 'console.log(JSON.stringify(process.memoryUsage(), null, 2))' > "$output_dir/node-memory.json" 2>&1 || true
}

collect_performance_diagnostics() {
    local output_dir=$1
    log_info "Collecting performance diagnostics..."
    
    "$SCRIPT_DIR/log-aggregator.sh" performance > "$output_dir/slow-queries.txt" 2>&1 || true
    docker exec hse_db psql -U hse_admin -d hse_platform -c "SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;" > "$output_dir/query-performance.txt" 2>&1 || true
}

collect_full_diagnostics() {
    local alert_type=${1:-unknown}
    local output_dir="$PROJECT_ROOT/data/diagnostics/alert-${alert_type}-$(date +%Y%m%d_%H%M%S)"
    
    log_info "Creating diagnostic bundle for: $alert_type"
    mkdir -p "$output_dir"
    
    collect_system_info "$output_dir"
    collect_logs "$output_dir"
    collect_database_diagnostics "$output_dir"
    collect_memory_diagnostics "$output_dir"
    collect_performance_diagnostics "$output_dir"
    
    tar -czf "$output_dir.tar.gz" -C "$(dirname "$output_dir")" "$(basename "$output_dir")" 2>/dev/null || true
    
    log_success "Diagnostics collected: $output_dir"
    log_info "Archive: $output_dir.tar.gz"
    echo "$output_dir"
}

main() {
    local command=${1:-full}
    local output_dir=""
    shift || true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help) show_usage; exit 0 ;;
            -o|--output) output_dir="$2"; shift 2 ;;
            *) break ;;
        esac
    done
    
    case $command in
        collect)
            local alert_type=${1:-unknown}
            collect_full_diagnostics "$alert_type"
            ;;
        database)
            collect_full_diagnostics "database"
            ;;
        memory)
            collect_full_diagnostics "memory"
            ;;
        performance)
            collect_full_diagnostics "performance"
            ;;
        full)
            collect_full_diagnostics "full-system"
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

[ "${BASH_SOURCE[0]}" = "${0}" ] && main "$@"
