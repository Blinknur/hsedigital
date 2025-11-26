#!/bin/bash

# Docker Test Runner for HSE Digital
# This script manages PostgreSQL and Redis services for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_CONTAINER="hse_test_postgres"
REDIS_CONTAINER="hse_test_redis"
POSTGRES_PORT="5433"
REDIS_PORT="6380"
POSTGRES_USER="hse_test"
POSTGRES_PASSWORD="test_password"
POSTGRES_DB="hse_test"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Function to check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    print_success "Docker is available"
}

# Function to check if container exists
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${1}$"
}

# Function to check if container is running
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${1}$"
}

# Function to start PostgreSQL
start_postgres() {
    print_info "Starting PostgreSQL container..."
    
    if container_exists "$POSTGRES_CONTAINER"; then
        if container_running "$POSTGRES_CONTAINER"; then
            print_warning "PostgreSQL container is already running"
        else
            docker start "$POSTGRES_CONTAINER"
            print_success "Started existing PostgreSQL container"
        fi
    else
        docker run -d \
            --name "$POSTGRES_CONTAINER" \
            -e POSTGRES_USER="$POSTGRES_USER" \
            -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
            -e POSTGRES_DB="$POSTGRES_DB" \
            -p "${POSTGRES_PORT}:5432" \
            postgres:15-alpine
        print_success "Created and started PostgreSQL container"
    fi
    
    # Wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            return 0
        fi
        sleep 1
    done
    
    print_error "PostgreSQL failed to become ready"
    return 1
}

# Function to start Redis
start_redis() {
    print_info "Starting Redis container..."
    
    if container_exists "$REDIS_CONTAINER"; then
        if container_running "$REDIS_CONTAINER"; then
            print_warning "Redis container is already running"
        else
            docker start "$REDIS_CONTAINER"
            print_success "Started existing Redis container"
        fi
    else
        docker run -d \
            --name "$REDIS_CONTAINER" \
            -p "${REDIS_PORT}:6379" \
            redis:7-alpine
        print_success "Created and started Redis container"
    fi
    
    # Wait for Redis to be ready
    print_info "Waiting for Redis to be ready..."
    for i in {1..30}; do
        if docker exec "$REDIS_CONTAINER" redis-cli ping > /dev/null 2>&1; then
            print_success "Redis is ready"
            return 0
        fi
        sleep 1
    done
    
    print_error "Redis failed to become ready"
    return 1
}

# Function to stop containers
stop_services() {
    print_info "Stopping test services..."
    
    if container_running "$POSTGRES_CONTAINER"; then
        docker stop "$POSTGRES_CONTAINER"
        print_success "Stopped PostgreSQL container"
    fi
    
    if container_running "$REDIS_CONTAINER"; then
        docker stop "$REDIS_CONTAINER"
        print_success "Stopped Redis container"
    fi
}

# Function to remove containers
remove_services() {
    print_info "Removing test containers..."
    
    if container_exists "$POSTGRES_CONTAINER"; then
        docker rm -f "$POSTGRES_CONTAINER"
        print_success "Removed PostgreSQL container"
    fi
    
    if container_exists "$REDIS_CONTAINER"; then
        docker rm -f "$REDIS_CONTAINER"
        print_success "Removed Redis container"
    fi
}

# Function to setup database
setup_database() {
    print_info "Setting up database schema..."
    
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
    
    cd "$(dirname "$0")/.."
    
    npx prisma generate
    npx prisma db push --skip-generate
    
    print_success "Database schema is ready"
}

# Function to run tests
run_tests() {
    print_info "Running tests..."
    
    export NODE_ENV=test
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
    export REDIS_HOST=localhost
    export REDIS_PORT="$REDIS_PORT"
    export JWT_SECRET="test-jwt-secret-key-for-testing"
    export REFRESH_SECRET="test-refresh-secret-key-for-testing"
    export CLIENT_URL="http://localhost:3001"
    
    npm test -- "$@"
}

# Main script
main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        start)
            check_docker
            start_postgres
            start_redis
            setup_database
            print_success "Test environment is ready"
            print_info "Database: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
            print_info "Redis: localhost:${REDIS_PORT}"
            ;;
        
        stop)
            check_docker
            stop_services
            print_success "Test services stopped"
            ;;
        
        clean)
            check_docker
            remove_services
            print_success "Test services removed"
            ;;
        
        test)
            check_docker
            start_postgres
            start_redis
            setup_database
            run_tests "$@"
            ;;
        
        test:critical)
            check_docker
            start_postgres
            start_redis
            setup_database
            npm run test:regression:critical
            ;;
        
        test:fast)
            check_docker
            start_postgres
            start_redis
            setup_database
            npm run test:regression:fast
            ;;
        
        test:all)
            check_docker
            start_postgres
            start_redis
            setup_database
            npm run test:regression
            ;;
        
        status)
            check_docker
            echo ""
            print_info "Container Status:"
            if container_running "$POSTGRES_CONTAINER"; then
                print_success "PostgreSQL: Running on port ${POSTGRES_PORT}"
            elif container_exists "$POSTGRES_CONTAINER"; then
                print_warning "PostgreSQL: Stopped"
            else
                print_info "PostgreSQL: Not created"
            fi
            
            if container_running "$REDIS_CONTAINER"; then
                print_success "Redis: Running on port ${REDIS_PORT}"
            elif container_exists "$REDIS_CONTAINER"; then
                print_warning "Redis: Stopped"
            else
                print_info "Redis: Not created"
            fi
            ;;
        
        help|*)
            cat << EOF
${BLUE}HSE Digital Test Runner${NC}

Usage: $0 <command> [options]

Commands:
    ${GREEN}start${NC}           Start PostgreSQL and Redis for testing
    ${GREEN}stop${NC}            Stop test services
    ${GREEN}clean${NC}           Remove test containers
    ${GREEN}test${NC}            Run tests with automatic service management
    ${GREEN}test:critical${NC}   Run critical tests (auth, tenant isolation, billing)
    ${GREEN}test:fast${NC}       Run fast tests (unit tests)
    ${GREEN}test:all${NC}        Run full regression suite
    ${GREEN}status${NC}          Check status of test services
    ${GREEN}help${NC}            Show this help message

Examples:
    $0 start                    # Start services
    $0 test                     # Run all tests
    $0 test:critical            # Run critical tests only
    $0 test -- --verbose        # Run tests with Jest options
    $0 stop                     # Stop services
    $0 clean                    # Clean up everything

Environment:
    PostgreSQL: ${POSTGRES_USER}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
    Redis: localhost:${REDIS_PORT}

EOF
            ;;
    esac
}

main "$@"
