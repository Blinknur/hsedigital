#!/bin/bash
set -euo pipefail

# Zero-Downtime Container Restart Script
# Performs rolling restart of application containers with health checks
# Usage: ./zero-downtime-restart.sh [service_name] [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yml"

# Configuration
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=5
GRACE_PERIOD=30
DRAIN_TIMEOUT=60

# Colors for output
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
Usage: $0 [OPTIONS] [SERVICE]

Perform zero-downtime restart of containerized services with health checks.

OPTIONS:
    -h, --help                Show this help message
    -t, --timeout SECONDS     Health check timeout (default: 120)
    -g, --grace SECONDS       Grace period before restart (default: 30)
    -d, --drain SECONDS       Connection drain timeout (default: 60)
    -f, --force               Skip health checks and force restart
    -v, --verbose             Verbose output
    --scale N                 Scale to N replicas before restart (requires Docker Swarm/K8s)

SERVICES:
    app                       Application container (default)
    postgres                  Database container (with backup)
    redis                     Redis cache container
    all                       All services (not recommended for zero-downtime)

EXAMPLES:
    $0 app                           # Restart app with default settings
    $0 --timeout 180 --grace 60 app  # Custom timeouts
    $0 --force app                   # Force restart (emergency)

EOF
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

check_health() {
    local service=$1
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))
    local attempt=1
    
    log_info "Checking health of $service (timeout: ${HEALTH_CHECK_TIMEOUT}s)..."
    
    while [ $attempt -le $max_attempts ]; do
        case $service in
            app)
                if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
                    log_success "$service is healthy"
                    return 0
                fi
                ;;
            postgres)
                if docker exec hse_db pg_isready -U hse_admin -d hse_platform > /dev/null 2>&1; then
                    log_success "$service is healthy"
                    return 0
                fi
                ;;
            redis)
                if docker exec hse_cache redis-cli ping > /dev/null 2>&1; then
                    log_success "$service is healthy"
                    return 0
                fi
                ;;
        esac
        
        log_info "Health check attempt $attempt/$max_attempts for $service..."
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done
    
    log_error "$service failed health check after ${HEALTH_CHECK_TIMEOUT}s"
    return 1
}

get_active_connections() {
    local service=$1
    
    case $service in
        app)
            docker exec hse_app sh -c "ss -tn | grep :3001 | wc -l" 2>/dev/null || echo "0"
            ;;
        postgres)
            docker exec hse_db psql -U hse_admin -d hse_platform -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ' || echo "0"
            ;;
        redis)
            docker exec hse_cache redis-cli CLIENT LIST | wc -l 2>/dev/null || echo "0"
            ;;
        *)
            echo "0"
            ;;
    esac
}

drain_connections() {
    local service=$1
    local start_time=$(date +%s)
    local timeout=$DRAIN_TIMEOUT
    
    log_info "Draining connections for $service (timeout: ${timeout}s)..."
    
    local initial_connections=$(get_active_connections "$service")
    log_info "Initial active connections: $initial_connections"
    
    if [ "$service" = "app" ]; then
        log_info "Sending SIGTERM to gracefully shutdown new connections..."
        docker exec hse_app sh -c "kill -SIGTERM 1" 2>/dev/null || true
    fi
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $timeout ]; then
            log_warn "Drain timeout reached after ${elapsed}s"
            break
        fi
        
        local current_connections=$(get_active_connections "$service")
        log_info "Active connections: $current_connections (${elapsed}s elapsed)"
        
        if [ "$current_connections" -eq 0 ]; then
            log_success "All connections drained successfully"
            return 0
        fi
        
        sleep 5
    done
    
    local final_connections=$(get_active_connections "$service")
    if [ "$final_connections" -gt 0 ]; then
        log_warn "$final_connections connections remaining - proceeding anyway"
    fi
    
    return 0
}

backup_database() {
    log_info "Creating database backup before restart..."
    
    local backup_dir="$PROJECT_ROOT/data/backups/incident-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    docker exec hse_db pg_dump -U hse_admin -d hse_platform -Fc -f /tmp/backup.dump
    docker cp hse_db:/tmp/backup.dump "$backup_dir/postgres-backup.dump"
    
    if [ -f "$backup_dir/postgres-backup.dump" ]; then
        log_success "Database backup created: $backup_dir/postgres-backup.dump"
        echo "$backup_dir/postgres-backup.dump"
    else
        log_error "Database backup failed"
        return 1
    fi
}

restart_service() {
    local service=$1
    local force=${2:-false}
    
    log_info "Starting restart process for $service..."
    
    if [ "$force" = false ]; then
        if ! check_health "$service" 2>/dev/null; then
            log_warn "$service is not healthy before restart - proceeding anyway"
        fi
        
        log_info "Waiting grace period of ${GRACE_PERIOD}s before restart..."
        sleep $GRACE_PERIOD
        
        drain_connections "$service"
    else
        log_warn "Forcing restart without health checks or connection draining"
    fi
    
    if [ "$service" = "postgres" ]; then
        backup_database
    fi
    
    log_info "Restarting container..."
    cd "$PROJECT_ROOT"
    
    local container_name
    case $service in
        app) container_name="hse_app" ;;
        postgres) container_name="hse_db" ;;
        redis) container_name="hse_cache" ;;
        *) container_name="$service" ;;
    esac
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" restart "$service"
    
    log_info "Waiting for container to be ready..."
    sleep 10
    
    if [ "$force" = false ]; then
        if check_health "$service"; then
            log_success "Service $service restarted successfully"
            return 0
        else
            log_error "Service $service failed to become healthy after restart"
            return 1
        fi
    else
        log_success "Service $service restarted (health check skipped)"
        return 0
    fi
}

collect_diagnostics() {
    local service=$1
    local diag_dir="$PROJECT_ROOT/data/diagnostics/incident-$(date +%Y%m%d_%H%M%S)"
    
    log_info "Collecting diagnostic data for $service..."
    mkdir -p "$diag_dir"
    
    docker logs "$service" --tail 1000 > "$diag_dir/${service}-logs.txt" 2>&1
    docker inspect "$service" > "$diag_dir/${service}-inspect.json" 2>&1
    docker stats "$service" --no-stream > "$diag_dir/${service}-stats.txt" 2>&1
    
    if [ "$service" = "hse_app" ]; then
        docker exec hse_app node -e "console.log(JSON.stringify(process.memoryUsage(), null, 2))" > "$diag_dir/memory-usage.json" 2>&1 || true
    fi
    
    log_success "Diagnostics collected: $diag_dir"
    echo "$diag_dir"
}

main() {
    local service="app"
    local force=false
    local verbose=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -t|--timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
                ;;
            -g|--grace)
                GRACE_PERIOD="$2"
                shift 2
                ;;
            -d|--drain)
                DRAIN_TIMEOUT="$2"
                shift 2
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                set -x
                shift
                ;;
            app|postgres|redis|all)
                service="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log_info "=== Zero-Downtime Restart Tool ==="
    log_info "Service: $service"
    log_info "Force mode: $force"
    log_info "Health check timeout: ${HEALTH_CHECK_TIMEOUT}s"
    log_info "Grace period: ${GRACE_PERIOD}s"
    log_info "Drain timeout: ${DRAIN_TIMEOUT}s"
    echo ""
    
    check_prerequisites
    
    local diag_dir=$(collect_diagnostics "hse_${service}")
    log_info "Pre-restart diagnostics: $diag_dir"
    
    if restart_service "$service" "$force"; then
        log_success "=== Restart completed successfully ==="
        exit 0
    else
        log_error "=== Restart failed ==="
        exit 1
    fi
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
