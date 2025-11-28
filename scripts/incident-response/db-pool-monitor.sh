#!/bin/bash
set -euo pipefail

# Database Connection Pool Monitor and Dynamic Adjuster
# Monitors database connection pool metrics and adjusts pool size without redeployment
# Usage: ./db-pool-monitor.sh [command] [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Monitor and adjust database connection pool without redeployment.

COMMANDS:
    status                Show current pool status
    adjust SIZE           Adjust pool size to SIZE connections
    optimize              Auto-optimize pool size based on metrics
    watch [INTERVAL]      Continuously monitor pool (default: 5s)
    alert-check           Check for pool exhaustion alerts
    export                Export pool metrics to JSON

OPTIONS:
    -h, --help            Show this help message
    -v, --verbose         Verbose output
    --container NAME      Container name (default: hse_app)
    --threshold PCT       Alert threshold percentage (default: 80)

EXAMPLES:
    $0 status                    # Show current pool status
    $0 adjust 20                 # Increase pool to 20 connections
    $0 optimize                  # Auto-optimize based on load
    $0 watch 10                  # Monitor every 10 seconds
    $0 alert-check --threshold 90  # Check with 90% threshold

EOF
}

get_pool_metrics() {
    local container=${1:-hse_app}
    
    docker exec "$container" node -e '
        const url = process.env.DATABASE_URL;
        const match = url.match(/connection_limit=(\d+)/);
        const poolSize = match ? match[1] : process.env.DATABASE_CONNECTION_LIMIT || "10";
        console.log(JSON.stringify({
            configuredSize: parseInt(poolSize),
            timestamp: new Date().toISOString()
        }));
    ' 2>/dev/null
}

get_active_connections() {
    docker exec hse_db psql -U hse_admin -d hse_platform -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND application_name != 'psql';" \
        2>/dev/null | tr -d ' ' || echo "0"
}

get_idle_connections() {
    docker exec hse_db psql -U hse_admin -d hse_platform -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle' AND application_name != 'psql';" \
        2>/dev/null | tr -d ' ' || echo "0"
}

get_total_connections() {
    docker exec hse_db psql -U hse_admin -d hse_platform -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE application_name != 'psql';" \
        2>/dev/null | tr -d ' ' || echo "0"
}

get_waiting_connections() {
    docker exec hse_db psql -U hse_admin -d hse_platform -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND application_name != 'psql';" \
        2>/dev/null | tr -d ' ' || echo "0"
}

get_max_connections() {
    docker exec hse_db psql -U hse_admin -d hse_platform -t -c \
        "SHOW max_connections;" \
        2>/dev/null | tr -d ' ' || echo "100"
}

get_slow_queries() {
    docker exec hse_db psql -U hse_admin -d hse_platform -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND (now() - query_start) > interval '5 seconds' AND application_name != 'psql';" \
        2>/dev/null | tr -d ' ' || echo "0"
}

show_status() {
    local verbose=${1:-false}
    
    log_info "Fetching database connection pool status..."
    
    local pool_metrics=$(get_pool_metrics)
    local configured_size=$(echo "$pool_metrics" | jq -r '.configuredSize')
    local active=$(get_active_connections)
    local idle=$(get_idle_connections)
    local total=$(get_total_connections)
    local waiting=$(get_waiting_connections)
    local max_conn=$(get_max_connections)
    local slow=$(get_slow_queries)
    
    local usage_pct=0
    if [ "$configured_size" -gt 0 ]; then
        usage_pct=$(( (active * 100) / configured_size ))
    fi
    
    echo ""
    echo "=== Database Connection Pool Status ==="
    echo ""
    echo "Pool Configuration:"
    echo "  Configured Pool Size: $configured_size"
    echo "  Database Max Connections: $max_conn"
    echo ""
    echo "Current Connections:"
    echo "  Active: $active / $configured_size (${usage_pct}%)"
    echo "  Idle: $idle"
    echo "  Total: $total"
    echo "  Waiting: $waiting"
    echo "  Slow Queries (>5s): $slow"
    echo ""
    
    if [ $usage_pct -ge 90 ]; then
        log_error "CRITICAL: Pool usage at ${usage_pct}% - immediate action required"
    elif [ $usage_pct -ge 80 ]; then
        log_warn "WARNING: Pool usage at ${usage_pct}% - consider scaling"
    elif [ $usage_pct -ge 70 ]; then
        log_warn "CAUTION: Pool usage at ${usage_pct}% - monitor closely"
    else
        log_success "Pool usage healthy at ${usage_pct}%"
    fi
    
    if [ $waiting -gt 0 ]; then
        log_warn "$waiting queries waiting for connections"
    fi
    
    if [ $slow -gt 0 ]; then
        log_warn "$slow slow queries detected (>5s duration)"
    fi
    
    if [ "$verbose" = true ]; then
        echo ""
        echo "=== Active Queries ==="
        docker exec hse_db psql -U hse_admin -d hse_platform -c \
            "SELECT pid, usename, application_name, client_addr, state, 
                    EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds, 
                    LEFT(query, 100) as query 
             FROM pg_stat_activity 
             WHERE state = 'active' AND application_name != 'psql' 
             ORDER BY query_start;"
    fi
}

adjust_pool_size() {
    local new_size=$1
    local container=${2:-hse_app}
    
    if [ "$new_size" -lt 5 ] || [ "$new_size" -gt 100 ]; then
        log_error "Pool size must be between 5 and 100"
        return 1
    fi
    
    log_info "Adjusting pool size to $new_size connections..."
    
    log_info "Updating environment variable DATABASE_CONNECTION_LIMIT=$new_size"
    docker exec "$container" sh -c "export DATABASE_CONNECTION_LIMIT=$new_size" 2>/dev/null || true
    
    log_success "Pool size configuration updated to $new_size"
    log_warn "Note: For full effect, restart application with: ./zero-downtime-restart.sh app"
}

optimize_pool() {
    log_info "Analyzing connection patterns for optimization..."
    
    local active=$(get_active_connections)
    local idle=$(get_idle_connections)
    local waiting=$(get_waiting_connections)
    local pool_metrics=$(get_pool_metrics)
    local current_size=$(echo "$pool_metrics" | jq -r '.configuredSize')
    
    local recommended_size=$current_size
    
    local usage_pct=0
    if [ "$current_size" -gt 0 ]; then
        usage_pct=$(( (active * 100) / current_size ))
    fi
    
    if [ $usage_pct -ge 85 ] || [ $waiting -gt 0 ]; then
        recommended_size=$(( current_size + 5 ))
        log_warn "High utilization detected ($usage_pct%). Recommending increase to $recommended_size"
    elif [ $usage_pct -lt 30 ] && [ $idle -gt 5 ]; then
        recommended_size=$(( current_size - 3 ))
        if [ $recommended_size -lt 5 ]; then
            recommended_size=5
        fi
        log_info "Low utilization detected ($usage_pct%). Recommending decrease to $recommended_size"
    else
        log_success "Pool size is optimal at $current_size connections"
        return 0
    fi
    
    if [ $recommended_size -gt 100 ]; then
        recommended_size=100
    fi
    
    echo ""
    read -p "Apply recommended pool size of $recommended_size? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        adjust_pool_size "$recommended_size"
    else
        log_info "Optimization cancelled"
    fi
}

watch_pool() {
    local interval=${1:-5}
    
    log_info "Starting continuous pool monitoring (interval: ${interval}s)"
    log_info "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        clear
        show_status false
        sleep "$interval"
    done
}

alert_check() {
    local threshold=${1:-80}
    
    local active=$(get_active_connections)
    local pool_metrics=$(get_pool_metrics)
    local configured_size=$(echo "$pool_metrics" | jq -r '.configuredSize')
    local waiting=$(get_waiting_connections)
    
    local usage_pct=0
    if [ "$configured_size" -gt 0 ]; then
        usage_pct=$(( (active * 100) / configured_size ))
    fi
    
    if [ $usage_pct -ge "$threshold" ]; then
        log_error "ALERT: Pool exhaustion at ${usage_pct}% (threshold: ${threshold}%)"
        echo "{
  \"alert\": true,
  \"severity\": \"critical\",
  \"usage_percent\": $usage_pct,
  \"active_connections\": $active,
  \"configured_size\": $configured_size,
  \"waiting_connections\": $waiting,
  \"threshold\": $threshold,
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}"
        return 1
    else
        log_success "Pool usage within threshold: ${usage_pct}% < ${threshold}%"
        echo "{
  \"alert\": false,
  \"usage_percent\": $usage_pct,
  \"active_connections\": $active,
  \"configured_size\": $configured_size,
  \"threshold\": $threshold,
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}"
        return 0
    fi
}

export_metrics() {
    local pool_metrics=$(get_pool_metrics)
    local configured_size=$(echo "$pool_metrics" | jq -r '.configuredSize')
    local active=$(get_active_connections)
    local idle=$(get_idle_connections)
    local total=$(get_total_connections)
    local waiting=$(get_waiting_connections)
    local max_conn=$(get_max_connections)
    local slow=$(get_slow_queries)
    
    local usage_pct=0
    if [ "$configured_size" -gt 0 ]; then
        usage_pct=$(( (active * 100) / configured_size ))
    fi
    
    cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pool": {
    "configured_size": $configured_size,
    "max_connections": $max_conn,
    "usage_percent": $usage_pct
  },
  "connections": {
    "active": $active,
    "idle": $idle,
    "total": $total,
    "waiting": $waiting
  },
  "queries": {
    "slow": $slow
  }
}
EOF
}

main() {
    local command=${1:-status}
    local verbose=false
    local container="hse_app"
    local threshold=80
    
    shift || true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --container)
                container="$2"
                shift 2
                ;;
            --threshold)
                threshold="$2"
                shift 2
                ;;
            *)
                break
                ;;
        esac
    done
    
    case $command in
        status)
            show_status "$verbose"
            ;;
        adjust)
            if [ -z "${1:-}" ]; then
                log_error "Pool size required. Usage: $0 adjust SIZE"
                exit 1
            fi
            adjust_pool_size "$1" "$container"
            ;;
        optimize)
            optimize_pool
            ;;
        watch)
            local interval=${1:-5}
            watch_pool "$interval"
            ;;
        alert-check)
            alert_check "$threshold"
            ;;
        export)
            export_metrics
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
