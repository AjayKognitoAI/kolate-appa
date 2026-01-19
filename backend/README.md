# FastAPI Backend Template (Auth0 Edition)

A production-ready FastAPI backend template with **Auth0 authentication**, RBAC, async database operations, caching, and comprehensive developer tooling.

## Features

- **Authentication & Authorization**
  - Auth0 JWT verification with JWKS caching
  - Role-Based Access Control (RBAC) from Auth0 permissions
  - Optional hybrid RBAC (Auth0 + database permissions)
  - Permission, role, and scope-based authorization
  - Automatic permission checking in Route Factory

- **Database & ORM**
  - PostgreSQL with async SQLAlchemy
  - Alembic migrations
  - Generic CRUD base classes
  - Connection pooling and optimization

- **Caching & Performance**
  - Redis integration
  - JWKS response caching
  - Structured logging with JSON formatting
  - Async/await throughout
  - Request/response middleware

- **Email & File Storage**
  - Email service abstraction (SMTP, AWS SES)
  - File storage abstraction (Local, AWS S3)
  - Template-based email rendering

- **Developer Experience**
  - Docker Compose development environment
  - Auto-reload in development
  - Makefile with common commands
  - Comprehensive documentation
  - pgAdmin and Redis Commander included

- **Code Quality**
  - Black code formatting
  - isort import sorting
  - Flake8 linting
  - mypy type checking
  - pytest test framework

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git
- **Auth0 Account** (free tier works for development)

### Installation

```bash
# Clone the repository
git clone <your-repo-url> my-project
cd my-project

# Copy environment file
cp .env.example .env

# Configure Auth0 (see AUTH0_SETUP.md for details)
# Edit .env and set:
#   AUTH0_DOMAIN=your-tenant.auth0.com
#   AUTH0_AUDIENCE=https://your-api.example.com

# Start the development environment
make dev

# Run migrations
make migrate

# Seed default data (roles, permissions - optional for hybrid RBAC)
make seed
```

### Access the Application

- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **pgAdmin**: http://localhost:5050 (admin@example.com / admin123)
- **Redis Commander**: http://localhost:8081

### Auth0 Configuration

See **[AUTH0_SETUP.md](./AUTH0_SETUP.md)** for complete Auth0 setup instructions including:
- Creating an Auth0 API
- Configuring permissions and roles
- Setting up RBAC
- Testing authentication

## Project Structure

```
.
├── app/
│   ├── config/              # Configuration and settings
│   ├── core/                # Core functionality (auth0, database, redis)
│   │   ├── auth0.py         # Auth0 JWT verification
│   │   ├── permissions.py   # Permission checking & dependencies
│   │   └── ...
│   ├── exceptions/          # Custom exception classes
│   ├── middleware/          # Custom middleware
│   ├── models/              # SQLAlchemy ORM models
│   ├── routes/              # FastAPI route handlers
│   │   └── crud_router.py   # Generic CRUD router with auth
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic layer
│   │   └── crud_service.py  # Generic CRUD service
│   ├── templates/           # Email templates
│   └── utils/               # Utility functions
├── alembic/                 # Database migrations
├── examples/                # Example entity implementations
├── tests/                   # Test suite
├── docker-compose.yml       # Development Docker setup
├── docker-compose.prod.yml  # Production Docker setup
├── Dockerfile              # Application container
├── Makefile                # Common commands
├── README.md               # This file
├── AUTH0_SETUP.md          # Auth0 configuration guide
├── TEMPLATE_USAGE.md       # Detailed usage guide
└── ARCHITECTURE.md         # Architecture documentation
```

## Authentication & Authorization

### Basic Authentication

```python
from fastapi import Depends
from app.core.permissions import get_current_user, Auth0User

@router.get("/profile")
async def get_profile(
    current_user: Auth0User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "permissions": current_user.permissions
    }
```

### Permission-Based Authorization

```python
from app.core.permissions import has_permissions

@router.get("/features")
async def list_features(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("features:read"))
):
    return await feature_service.get_all(db)

# Multiple permissions
@router.delete("/features/{id}")
async def delete_feature(
    _: None = Depends(has_permissions(
        ["features:delete", "features:admin"],
        require_all=True
    ))
):
    pass
```

### Role-Based Authorization

```python
from app.core.permissions import has_role

@router.get("/admin/dashboard")
async def admin_dashboard(
    _: None = Depends(has_role("admin"))
):
    return {"dashboard": "admin data"}
```

### Using with CRUD Router

```python
from app.routes.crud_router import CRUDRouter

crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    create_schema=FeatureCreate,
    resource_name="features",  # Auto-generates permissions: features:read, features:write, etc.
)

router = crud_router.get_router()
```

## Common Commands

```bash
# Development
make dev                    # Start development environment
make dev-bg                 # Start in background
make down                   # Stop all services
make logs                   # View all logs
make logs-web               # View API logs only

# Database
make migrate                # Run migrations
make migrate-create         # Create new migration
make seed                   # Seed default data
make db-shell               # Open PostgreSQL shell

# Code Quality
make format                 # Format code (black + isort)
make lint                   # Run linters (flake8 + mypy)
make test                   # Run tests

# Utilities
make shell                  # Open bash in web container
make redis-shell            # Open Redis CLI
make clean                  # Remove all containers and volumes
```

## Adding Your First Feature

See [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md) for a complete step-by-step guide. Here's the quick version:

1. **Create Model** in `app/models/your_entity.py`
2. **Create Schemas** in `app/schemas/your_entity.py`
3. **Create Service** in `app/services/your_entity_service.py`
4. **Create Routes** in `app/routes/your_entity.py`
5. **Register Router** in `app/routes/__init__.py`
6. **Create Migration**: `make migrate-create`
7. **Apply Migration**: `make migrate`
8. **Add Permissions** in Auth0 Dashboard

## Documentation

- **[AUTH0_SETUP.md](./AUTH0_SETUP.md)** - Auth0 configuration guide
- **[TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md)** - Comprehensive usage guide with examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[CLAUDE.md](./CLAUDE.md)** - Guidelines for AI-assisted development

## Configuration

Configuration is managed through environment variables. See `.env.example` for all available options.

Key settings:
- **Auth0**: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ALGORITHMS`
- **Database**: `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_NAME`
- **Redis**: `REDIS_URL`, `REDIS_HOST`, `REDIS_PASSWORD`
- **Email**: `EMAIL_PROVIDER`, `SMTP_*`, or `AWS_SES_*`
- **Storage**: `FILE_STORAGE_TYPE` (local or s3)

## Testing

```bash
# Run all tests
make test

# Run specific test file
docker-compose exec web python -m pytest tests/test_auth.py

# Run with coverage
docker-compose exec web python -m pytest --cov=app tests/
```

### Testing with Mock Auth

```python
import pytest
from unittest.mock import patch
from app.core.permissions import Auth0User

@pytest.fixture
def mock_current_user():
    return Auth0User(
        id="auth0|123456",
        email="test@example.com",
        permissions=["features:read"],
        roles=["user"],
    )

@pytest.mark.asyncio
async def test_get_features(client, mock_current_user):
    with patch("app.core.permissions.get_current_user", return_value=mock_current_user):
        response = await client.get("/api/v1/features")
        assert response.status_code == 200
```

## Deployment

### Production Setup

1. Configure Auth0 for production
2. Update environment variables in `.env`
3. Set `ENVIRONMENT=production` and `DEBUG=false`
4. Configure production database and Redis
5. Use `docker-compose.prod.yml`

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Recommended Production Stack

- **Reverse Proxy**: Nginx or Traefik for SSL/TLS termination
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- **Cache**: Managed Redis (AWS ElastiCache, Redis Cloud, etc.)
- **File Storage**: AWS S3 or similar object storage
- **Email**: AWS SES, SendGrid, or similar
- **Monitoring**: Sentry for error tracking, Datadog/New Relic for APM

## Security Features

- Auth0 JWT verification with RS256
- JWKS caching with automatic refresh
- RBAC with granular permissions
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CORS configuration
- Environment-based secrets

## Tech Stack

- **Framework**: FastAPI
- **Authentication**: Auth0 (python-jose for JWT)
- **Database**: PostgreSQL with asyncpg
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Cache**: Redis
- **Validation**: Pydantic V2
- **Testing**: pytest + pytest-asyncio
- **Code Quality**: black, isort, flake8, mypy
- **Containerization**: Docker + Docker Compose

## License

MIT License - feel free to use this template for your projects.

## Contributing

This is a template repository. Fork it and make it your own!

## Support

For detailed guides and documentation:
- See [AUTH0_SETUP.md](./AUTH0_SETUP.md) for Auth0 configuration
- See [TEMPLATE_USAGE.md](./TEMPLATE_USAGE.md) for usage examples
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for architecture details
- Check the [FastAPI documentation](https://fastapi.tiangolo.com)
- Check the [Auth0 documentation](https://auth0.com/docs)

## What's Included vs. What You Add

### Included (Ready to Use)

- Auth0 JWT verification
- RBAC system from Auth0 permissions
- Optional hybrid RBAC (Auth0 + database)
- File storage abstraction (local/S3)
- Email service abstraction (SMTP/SES)
- Redis caching
- Structured logging
- Master data with localization
- Docker development environment
- Database migrations
- Generic CRUD base classes

### You Add (Your Domain Logic)

- Your domain models (Products, Orders, etc.)
- Your business logic
- Your API endpoints
- Your database migrations
- Your permissions in Auth0

## Getting Help

1. Check existing documentation (AUTH0_SETUP.md, TEMPLATE_USAGE.md, ARCHITECTURE.md)
2. Review example implementations in the `examples/` directory
3. Consult FastAPI and Auth0 documentation
4. Check issues in the repository

---

**Built with FastAPI + Auth0**
