#!/bin/bash

# HSE Digital - Test Runner Script
# Provides multiple options for running the test suite

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if test containers are running
check_test_containers() {
    if docker-compose -f "$PROJECT_ROOT/docker/docker-compose.test.yml" ps | grep -q "Up"; then
        return 0
    else
        return 1
    fi
}

# Option 1: Run tests in Docker (RECOMMENDED)
run_docker_tests() {
    print_header "Running Tests in Docker (Recommended)"
    
    check_docker
    
    print_info "Starting test environment..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.test.yml up -d
    
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check health status
    print_info "Checking service health..."
    docker-compose -f docker/docker-compose.test.yml ps
    
    print_info "Running tests..."
    docker-compose -f docker/docker-compose.test.yml exec -T app-test npm test
    
    TEST_EXIT_CODE=$?
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        print_success "All tests passed!"
    else
        print_error "Some tests failed (exit code: $TEST_EXIT_CODE)"
    fi
    
    print_info "Test environment is still running. To stop:"
    echo "  docker-compose -f docker/docker-compose.test.yml down"
    
    return $TEST_EXIT_CODE
}

# Option 2: Run specific test suite in Docker
run_docker_test_suite() {
    local suite=$1
    
    print_header "Running $suite Tests in Docker"
    
    check_docker
    
    if ! check_test_containers; then
        print_info "Starting test environment..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker/docker-compose.test.yml up -d
        sleep 10
    else
        print_success "Test environment already running"
    fi
    
    print_info "Running $suite tests..."
    docker-compose -f docker/docker-compose.test.yml exec -T app-test npm run test:$suite
    
    return $?
}

# Option 3: Run tests locally (requires local database)
run_local_tests() {
    print_header "Running Tests Locally"
    
    print_warning "This requires a local PostgreSQL database"
    print_info "Make sure DATABASE_URL or TEST_DATABASE_URL is set in server/.env"
    
    cd "$PROJECT_ROOT/server"
    
    print_info "Running tests..."
    npm test
    
    return $?
}

# Option 4: Setup test environment only
setup_test_env() {
    print_header "Setting Up Test Environment"
    
    check_docker
    
    print_info "Starting test services..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.test.yml up -d
    
    print_info "Waiting for services to be healthy..."
    sleep 15
    
    print_info "Service status:"
    docker-compose -f docker/docker-compose.test.yml ps
    
    print_success "Test environment is ready!"
    echo ""
    print_info "Run tests with:"
    echo "  docker-compose -f docker/docker-compose.test.yml exec app-test npm test"
    echo ""
    print_info "Stop environment with:"
    echo "  docker-compose -f docker/docker-compose.test.yml down"
}

# Option 5: Stop test environment
stop_test_env() {
    print_header "Stopping Test Environment"
    
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.test.yml down
    
    print_success "Test environment stopped"
}

# Option 6: View test logs
view_test_logs() {
    print_header "Test Environment Logs"
    
    if ! check_test_containers; then
        print_error "Test environment is not running"
        exit 1
    fi
    
    print_info "Press Ctrl+C to exit log view"
    cd "$PROJECT_ROOT"
    docker-compose -f docker/docker-compose.test.yml logs -f
}

# Show usage
show_usage() {
    echo "HSE Digital Test Runner"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  docker          Run all tests in Docker (recommended)"
    echo "  unit            Run unit tests only in Docker"
    echo "  integration     Run integration tests only in Docker"
    echo "  regression      Run regression tests in Docker"
    echo "  local           Run tests locally (requires local database)"
    echo "  setup           Start test environment without running tests"
    echo "  stop            Stop test environment"
    echo "  logs            View test environment logs"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 docker          # Run all tests in Docker"
    echo "  $0 unit            # Run only unit tests"
    echo "  $0 setup           # Start test environment"
    echo "  $0 stop            # Stop test environment"
    echo ""
}

# Main script
main() {
    local command=${1:-docker}
    
    case "$command" in
        docker)
            run_docker_tests
            ;;
        unit)
            run_docker_test_suite "unit"
            ;;
        integration)
            run_docker_test_suite "integration"
            ;;
        regression)
            run_docker_test_suite "regression"
            ;;
        local)
            run_local_tests
            ;;
        setup)
            setup_test_env
            ;;
        stop)
            stop_test_env
            ;;
        logs)
            view_test_logs
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

# Run main function
main "$@"
