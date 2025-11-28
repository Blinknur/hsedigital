#!/bin/bash

# HSE Digital - Test Runner Script
# Runs tests locally with PostgreSQL and Redis

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

run_tests() {
    print_header "Running Tests"
    
    print_warning "This requires PostgreSQL and Redis to be running locally"
    print_info "Make sure DATABASE_URL is set in server/.env"
    
    cd "$PROJECT_ROOT/server"
    
    print_info "Running tests..."
    npm test
    
    return $?
}

run_test_suite() {
    local suite=$1
    
    print_header "Running $suite Tests"
    
    print_warning "This requires PostgreSQL and Redis to be running locally"
    
    cd "$PROJECT_ROOT/server"
    
    print_info "Running $suite tests..."
    npm run test:$suite
    
    return $?
}

check_health() {
    print_header "Checking Health Endpoint"
    
    print_info "Testing health endpoint at http://localhost:3001/api/health..."
    
    HTTP_CODE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Health check passed! (HTTP $HTTP_CODE)"
        if [ -f /tmp/health_response.json ]; then
            echo ""
            print_info "Response:"
            cat /tmp/health_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/health_response.json
            echo ""
        fi
    elif [ "$HTTP_CODE" = "503" ]; then
        print_warning "Service unhealthy but responding (HTTP $HTTP_CODE)"
        if [ -f /tmp/health_response.json ]; then
            echo ""
            print_info "Response:"
            cat /tmp/health_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/health_response.json
            echo ""
        fi
    else
        print_error "Health check failed (HTTP $HTTP_CODE)"
        print_info "Make sure the server is running: npm start"
    fi
    
    rm -f /tmp/health_response.json
}

show_usage() {
    echo "HSE Digital Test Runner"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  test            Run all tests"
    echo "  unit            Run unit tests only"
    echo "  integration     Run integration tests only"
    echo "  regression      Run regression tests"
    echo "  health          Check health endpoint status"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 test            # Run all tests"
    echo "  $0 unit            # Run only unit tests"
    echo "  $0 health          # Check if service is healthy"
    echo ""
    echo "Prerequisites:"
    echo "  - PostgreSQL running on localhost:5432"
    echo "  - Redis running on localhost:6379"
    echo "  - DATABASE_URL configured in server/.env"
    echo ""
}

main() {
    local command=${1:-test}
    
    case "$command" in
        test)
            run_tests
            ;;
        unit)
            run_test_suite "unit"
            ;;
        integration)
            run_test_suite "integration"
            ;;
        regression)
            run_test_suite "regression"
            ;;
        health)
            check_health
            ;;
        help|--help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
