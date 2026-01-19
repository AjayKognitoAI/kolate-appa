# Makefile for FastAPI Backend Template

.PHONY: help build up down logs shell test clean dev prod

# Default target
help:
	@echo "Available commands:"
	@echo "  dev          - Start development environment"
	@echo "  prod         - Start production environment"
	@echo "  build        - Build Docker images"
	@echo "  up           - Start services"
	@echo "  down         - Stop services"
	@echo "  logs         - View logs"
	@echo "  shell        - Open shell in web container"
	@echo "  db-shell     - Open PostgreSQL shell"
	@echo "  redis-shell  - Open Redis shell"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean up containers and volumes"
	@echo "  migrate      - Run database migrations"
	@echo "  seed         - Seed database with test data"

# Development environment
dev:
	@echo "🚀 Starting development environment..."
	docker-compose up --build

dev-bg:
	@echo "🚀 Starting development environment in background..."
	docker-compose up --build -d

# Production environment
prod:
	@echo "🏭 Starting production environment..."
	docker-compose -f docker-compose.prod.yml up --build -d

# Build Docker images
build:
	@echo "🔨 Building Docker images..."
	docker-compose build

# Start services
up:
	@echo "⬆️ Starting services..."
	docker-compose up -d

# Stop services
down:
	@echo "⬇️ Stopping services..."
	docker-compose down

# View logs
logs:
	@echo "📋 Viewing logs..."
	docker-compose logs -f

logs-web:
	@echo "📋 Viewing web service logs..."
	docker-compose logs -f web

logs-db:
	@echo "📋 Viewing database logs..."
	docker-compose logs -f db

logs-redis:
	@echo "📋 Viewing Redis logs..."
	docker-compose logs -f redis

# Open shell in web container
shell:
	@echo "🐚 Opening shell in web container..."
	docker-compose exec web /bin/bash

# Open PostgreSQL shell
db-shell:
	@echo "🐘 Opening PostgreSQL shell..."
	docker-compose exec db psql -U postgres -d mindtrip_gigconnect_dev

# Open Redis shell
redis-shell:
	@echo "🔴 Opening Redis shell..."
	docker-compose exec redis redis-cli -a redis123

# Run tests
test:
	@echo "🧪 Running tests..."
	docker-compose exec web python -m pytest

# Clean up containers and volumes
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	docker system prune -f

# Clean everything including images
clean-all:
	@echo "🧹 Cleaning everything..."
	docker-compose down -v --rmi all
	docker system prune -a -f

# Run database migrations
migrate:
	@echo "🔄 Running database migrations..."
	docker-compose exec web alembic upgrade head

# Create new migration
migrate-create:
	@echo "📝 Creating new migration..."
	@read -p "Enter migration message: " msg; \
	docker-compose exec web alembic revision --autogenerate -m "$$msg"

# Seed database
seed:
	@echo "🌱 Seeding database..."
	docker-compose exec web python seed_data.py

# Restart specific service
restart-web:
	@echo "🔄 Restarting web service..."
	docker-compose restart web

restart-db:
	@echo "🔄 Restarting database service..."
	docker-compose restart db

restart-redis:
	@echo "🔄 Restarting Redis service..."
	docker-compose restart redis

# Check service status
status:
	@echo "📊 Service status:"
	docker-compose ps

# Install dependencies locally
install:
	@echo "📦 Installing dependencies..."
	pip install -r requirements.txt

# Format code
format:
	@echo "🎨 Formatting code..."
	docker-compose exec web black app/
	docker-compose exec web isort app/

# Lint code
lint:
	@echo "🔍 Linting code..."
	docker-compose exec web flake8 app/
	docker-compose exec web mypy app/

# Backup database
backup:
	@echo "💾 Creating database backup..."
	docker-compose exec db pg_dump -U postgres mindtrip_gigconnect_dev > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Monitor resources
monitor:
	@echo "📈 Monitoring resources..."
	docker stats