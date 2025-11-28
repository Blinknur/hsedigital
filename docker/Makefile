# ==============================================================================
# Docker Makefile - Simplified Docker Operations
# ==============================================================================

.PHONY: help build-slim build-bullseye build-alpine build-all \
        up-dev up-prod up-prod-debug up-minimal up-admin \
        down logs shell test clean compare-sizes

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE := docker-compose -f docker-compose.yml
IMAGE_NAME := hse-digital
NODE_VERSION := 18

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)HSE Digital Docker Operations$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Build Operations

build-slim: ## Build Slim variant (default, recommended)
	@echo "$(BLUE)Building Slim variant...$(NC)"
	docker build -f Dockerfile \
		--build-arg NODE_VERSION=$(NODE_VERSION) \
		--build-arg BUILD_VARIANT=slim \
		--target production \
		-t $(IMAGE_NAME):slim \
		..

build-bullseye: ## Build Bullseye variant (maximum compatibility)
	@echo "$(BLUE)Building Bullseye variant...$(NC)"
	docker build -f Dockerfile \
		--build-arg NODE_VERSION=$(NODE_VERSION) \
		--build-arg BUILD_VARIANT=bullseye \
		--target production \
		-t $(IMAGE_NAME):bullseye \
		..

build-alpine: ## Build Alpine variant (minimal size)
	@echo "$(BLUE)Building Alpine variant...$(NC)"
	docker build -f Dockerfile \
		--build-arg NODE_VERSION=$(NODE_VERSION) \
		--build-arg BUILD_VARIANT=alpine \
		--target production \
		-t $(IMAGE_NAME):alpine \
		..

build-dev: ## Build development image
	@echo "$(BLUE)Building development image...$(NC)"
	docker build -f Dockerfile \
		--build-arg BUILD_VARIANT=slim \
		--target development \
		-t $(IMAGE_NAME):dev \
		..

build-prod-debug: ## Build production with debug tools
	@echo "$(BLUE)Building production-debug image...$(NC)"
	docker build -f Dockerfile \
		--build-arg BUILD_VARIANT=slim \
		--build-arg ENABLE_DEBUG_TOOLS=true \
		--build-arg ENABLE_SOURCEMAPS=true \
		--target production-debug \
		-t $(IMAGE_NAME):prod-debug \
		..

build-all: build-slim build-bullseye build-alpine ## Build all variants
	@echo "$(GREEN)All variants built successfully!$(NC)"

##@ Deployment Operations

up-dev: ## Start development environment
	@echo "$(BLUE)Starting development environment...$(NC)"
	cd .. && $(COMPOSE) --profile development up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "App: http://localhost:3001"
	@echo "pgAdmin: http://localhost:5050"
	@echo "Jaeger: http://localhost:16686"

up-prod: ## Start production environment
	@echo "$(BLUE)Starting production environment...$(NC)"
	cd .. && $(COMPOSE) --profile production up -d
	@echo "$(GREEN)Production environment started!$(NC)"

up-prod-debug: ## Start production with debug tools
	@echo "$(BLUE)Starting production-debug environment...$(NC)"
	cd .. && $(COMPOSE) --profile production-debug up -d
	@echo "$(GREEN)Production-debug environment started!$(NC)"

up-minimal: ## Start minimal environment (no Jaeger)
	@echo "$(BLUE)Starting minimal environment...$(NC)"
	cd .. && $(COMPOSE) --profile minimal up -d
	@echo "$(GREEN)Minimal environment started!$(NC)"

up-admin: ## Start production with admin tools
	@echo "$(BLUE)Starting production with admin tools...$(NC)"
	cd .. && $(COMPOSE) --profile production --profile admin up -d
	@echo "$(GREEN)Production + admin environment started!$(NC)"
	@echo "pgAdmin: http://localhost:5050"

down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(NC)"
	cd .. && $(COMPOSE) down
	@echo "$(GREEN)Services stopped!$(NC)"

restart: down ## Restart services (down then up-prod)
	@sleep 2
	@$(MAKE) up-prod

##@ Maintenance Operations

logs: ## View logs from all services
	cd .. && $(COMPOSE) logs -f

logs-app: ## View application logs
	cd .. && $(COMPOSE) logs -f app app-dev app-prod-debug

logs-db: ## View database logs
	cd .. && $(COMPOSE) logs -f postgres

logs-redis: ## View Redis logs
	cd .. && $(COMPOSE) logs -f redis

shell: ## Access application shell
	@echo "$(BLUE)Accessing application shell...$(NC)"
	cd .. && $(COMPOSE) exec app sh || \
	$(COMPOSE) exec app-dev sh || \
	$(COMPOSE) exec app-prod-debug sh

shell-db: ## Access database shell
	cd .. && $(COMPOSE) exec postgres psql -U hse_admin -d hse_platform

test: ## Run tests in test environment
	@echo "$(BLUE)Running tests...$(NC)"
	cd .. && docker-compose -f docker/docker-compose.test.yml up --abort-on-container-exit

clean: ## Remove all containers, volumes, and images
	@echo "$(YELLOW)Warning: This will remove all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd .. && $(COMPOSE) down -v; \
		docker rmi $(IMAGE_NAME):slim $(IMAGE_NAME):bullseye $(IMAGE_NAME):alpine 2>/dev/null || true; \
		echo "$(GREEN)Cleanup complete!$(NC)"; \
	fi

prune: ## Clean up Docker system (unused images, containers, etc)
	@echo "$(BLUE)Cleaning up Docker system...$(NC)"
	docker system prune -f
	@echo "$(GREEN)Docker system pruned!$(NC)"

##@ Analysis Operations

compare-sizes: build-all ## Build all variants and compare sizes
	@echo "$(BLUE)Image Size Comparison:$(NC)"
	@docker images | grep $(IMAGE_NAME) | grep -E "(slim|bullseye|alpine)" | sort -k2

ps: ## List running containers
	cd .. && $(COMPOSE) ps

health: ## Check health status of all services
	@echo "$(BLUE)Health Status:$(NC)"
	cd .. && $(COMPOSE) ps
	@echo ""
	@echo "$(BLUE)Application Health:$(NC)"
	@curl -f http://localhost:3001/api/health 2>/dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(YELLOW)✗ Unhealthy$(NC)"

stats: ## Show container resource usage
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

##@ Database Operations

db-push: ## Push Prisma schema to database
	cd .. && $(COMPOSE) exec app npx prisma db push || \
	$(COMPOSE) exec app-dev npx prisma db push

db-migrate: ## Run Prisma migrations
	cd .. && $(COMPOSE) exec app npx prisma migrate deploy || \
	$(COMPOSE) exec app-dev npx prisma migrate dev

db-seed: ## Seed database with sample data
	cd .. && $(COMPOSE) exec app npm run seed || \
	$(COMPOSE) exec app-dev npm run seed

db-backup: ## Create database backup
	@echo "$(BLUE)Creating database backup...$(NC)"
	@TIMESTAMP=$$(date +%Y%m%d_%H%M%S) && \
	cd .. && docker-compose exec -T postgres pg_dump -U hse_admin hse_platform > backup_$$TIMESTAMP.sql && \
	echo "$(GREEN)Backup created: backup_$$TIMESTAMP.sql$(NC)"

##@ Development Helpers

init: ## Initialize environment (copy .env, start dev)
	@if [ ! -f ../.env ]; then \
		echo "$(BLUE)Copying .env.example to .env...$(NC)"; \
		cp .env.example ../.env; \
		echo "$(YELLOW)Please edit .env and set JWT_SECRET and REFRESH_SECRET$(NC)"; \
	else \
		echo "$(GREEN).env already exists$(NC)"; \
	fi
	@$(MAKE) up-dev

rebuild: ## Rebuild and restart services
	@echo "$(BLUE)Rebuilding services...$(NC)"
	cd .. && $(COMPOSE) build --no-cache
	@$(MAKE) restart

update: ## Pull latest images and restart
	@echo "$(BLUE)Pulling latest images...$(NC)"
	cd .. && $(COMPOSE) pull
	@$(MAKE) restart
