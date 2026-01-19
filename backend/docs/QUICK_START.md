# Kolate Backend Quick Start Guide

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- Auth0 account with API configured

## Setup Steps

### 1. Clone and Install

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Required configuration:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/kolate_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=kolate_db
DATABASE_USER=user
DATABASE_PASSWORD=pass

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api.example.com
AUTH0_M2M_CLIENT_ID=your-client-id
AUTH0_M2M_CLIENT_SECRET=your-client-secret

# Application
SECRET_KEY=your-secret-key
ENVIRONMENT=development
```

### 3. Initialize Database

```bash
# Run migrations
alembic upgrade head

# (Optional) Seed development data
python seed_data.py
```

### 4. Start Server

```bash
# Development mode with auto-reload
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --port 8000
```

### 5. Verify Installation

Visit:
- **API Root**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Structure

```
/api/v1/
├── auth/           # Authentication endpoints
├── enterprises/    # Enterprise management (admin)
├── users/          # User management
├── projects/       # Project CRUD
├── patient-records/# Patient data management
├── executions/     # ML execution history
└── assets/         # File uploads
```

## Multi-Tenancy

The platform uses schema-based multi-tenancy:

```
PostgreSQL: kolate_db
├── public/         # Shared tables (enterprises, modules)
├── org_abc123/     # Tenant schema (users, projects)
└── org_def456/     # Another tenant
```

Set the tenant context via header:
```
org-id: abc123
```

## Provision New Tenant

```bash
python scripts/provision_tenant.py <org_id>
```

## Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/services/test_enterprise_service.py
```

## Common Commands

```bash
# Format code
black app/
isort app/

# Lint
flake8 app/

# Type check
mypy app/
```

## Docker

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Database Connection Error
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure database exists: `createdb kolate_db`

### Redis Connection Error
- Check Redis is running: `redis-cli ping`
- Verify REDIS_URL is correct

### Auth0 Token Error
- Verify AUTH0_DOMAIN and AUTH0_AUDIENCE
- Check token hasn't expired
- Ensure API is configured in Auth0 dashboard

## Support

- Docs: `/backend/docs/`
- API Reference: http://localhost:8000/docs
