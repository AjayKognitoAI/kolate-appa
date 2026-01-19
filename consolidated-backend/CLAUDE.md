# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready FastAPI Backend Template featuring **Auth0 authentication**, RBAC (Role-Based Access Control), and modern async patterns. It provides a solid foundation for building scalable REST APIs with PostgreSQL, Redis caching, and Docker containerization.

## Development Commands

### Docker Environment
- `make dev` - Start development environment with live reload
- `make dev-bg` - Start development environment in background
- `make prod` - Start production environment
- `make down` - Stop all services
- `make logs` - View all service logs
- `make logs-web` - View API server logs only

### Database Operations
- `make migrate` - Run Alembic migrations to latest
- `make migrate-create` - Create new migration (prompts for message)
- `make seed` - Seed database with default roles/permissions (optional for hybrid RBAC)
- `make db-shell` - Open PostgreSQL shell
- `make backup` - Create database backup

### Development Tools
- `make test` - Run pytest test suite
- `make format` - Format code with black and isort
- `make lint` - Run flake8 and mypy linting
- `make shell` - Open bash shell in web container
- `make redis-shell` - Open Redis CLI

### Service Management
- `make status` - Check service status
- `make restart-web` - Restart API server only
- `make clean` - Remove containers and volumes

## Architecture

### Directory Structure
```
app/
├── config/          # Application settings and configuration
├── core/            # Core functionality (auth0, database, redis)
│   ├── auth0.py     # Auth0 JWT verification with JWKS
│   ├── permissions.py # Permission checking & dependencies
│   ├── database.py  # Async database connection
│   └── cache.py     # Redis caching
├── models/          # SQLAlchemy database models
├── schemas/         # Pydantic schemas for request/response
├── services/        # Business logic layer
├── routes/          # FastAPI route handlers
│   └── crud_router.py # Generic CRUD router with auth
└── utils/           # Utility functions
```

### Key Components

**Configuration**: Environment-based settings using Pydantic BaseSettings in `app/config/settings.py`

**Database**: SQLAlchemy with async PostgreSQL, Alembic migrations
- Connection: AsyncSession with asyncpg driver
- Models: Declarative base in `app/models/base.py`
- Migrations: Alembic in `alembic/` directory

**Authentication**: Auth0 JWT verification
- Auth0 module in `app/core/auth0.py`
- Permission checking in `app/core/permissions.py`
- **Security Model**:
  - RS256 JWT verification using Auth0 JWKS
  - JWKS caching with automatic refresh
  - Permissions extracted from Auth0 token claims
  - Optional hybrid RBAC (Auth0 + database permissions)
- **Auth Flow**:
  1. Client authenticates with Auth0 and receives JWT
  2. Client includes JWT in Authorization header: `Bearer <token>`
  3. Server verifies JWT against Auth0 JWKS
  4. Server extracts user info and permissions from token
  5. Permission checks applied via FastAPI dependencies

**API Structure**: Modular FastAPI routers
- Main router in `app/routes/__init__.py`
- Route prefixes: `/api/v1/health`, `/api/v1/features`, `/api/v1/users`, etc.

**Services Layer**: Business logic abstraction
- Base service pattern in `app/services/base_service.py`
- **CRITICAL**: ALL business logic must be in the service layer, NEVER in routes/controllers
- Only raises business logic exceptions - check exceptions package for existing custom exceptions
- No HTTP knowledge in business logic
- All validation, data processing, and business rules belong in services
- Routes should only handle HTTP concerns: request/response parsing, status codes, dependencies

**Generic Implementation**: Generic endpoint and services implementation
- Use `app/services/crud_service.py` for inheriting which will allow basic methods for db interaction
- Use `app/routes/crud_router.py` for inheriting which will allow basic endpoints for different entities
- See examples in `examples/` directory for reference implementations

### Core Framework Features

The template includes the following ready-to-use features:

- **Auth0 Integration**: JWT verification with JWKS caching
- **RBAC System**: Permission-based access control from Auth0 token
- **Hybrid RBAC**: Optional database-based permission augmentation
- **File Storage**: Abstraction layer supporting local storage and AWS S3
- **Email Services**: SMTP and AWS SES providers
- **Caching**: Redis integration for performance optimization
- **Master Data**: Hierarchical reference data with localization support
- **Logging**: Structured logging with file rotation and JSON formatting

## Environment Setup

The application requires these environment variables (configured via Docker Compose):

**Auth0** (Required):
- `AUTH0_DOMAIN` - Your Auth0 tenant domain (e.g., "your-tenant.auth0.com")
- `AUTH0_AUDIENCE` - Your API identifier in Auth0
- `AUTH0_ALGORITHMS` - JWT algorithms (default: RS256)
- `AUTH0_PERMISSIONS_CLAIM` - Claim containing permissions (default: "permissions")
- `AUTH0_ROLES_CLAIM` - Custom claim for roles
- `AUTH0_USE_RBAC` - Enable database RBAC augmentation (default: true)

**Database**:
- `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_USER`, etc.

**Redis**:
- `REDIS_URL`, `REDIS_HOST`, `REDIS_PASSWORD`

**Other**:
- `SECRET_KEY`, `ALLOWED_ORIGINS`, `EMAIL_PROVIDER`, etc.

Default development credentials:
- Database: postgres/postgres123
- Redis: password "redis123"

## Authentication & Authorization

### Get Current User
```python
from app.core.permissions import get_current_user, Auth0User

@router.get("/profile")
async def get_profile(
    current_user: Auth0User = Depends(get_current_user)
):
    return {"id": current_user.id, "email": current_user.email}
```

### Check Permissions
```python
from app.core.permissions import has_permissions

@router.get("/features")
async def get_features(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("features:read"))
):
    pass
```

### Check Roles
```python
from app.core.permissions import has_role

@router.get("/admin")
async def admin_endpoint(
    _: None = Depends(has_role("admin"))
):
    pass
```

### CRUD Router with Auth
```python
from app.routes.crud_router import CRUDRouter

crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    resource_name="features",  # Auto-generates features:read, features:write, etc.
)
```

## Testing

- Test framework: pytest with pytest-asyncio
- Run tests: `make test` or `docker-compose exec web python -m pytest`
- Mock authentication using `unittest.mock.patch`:

```python
from unittest.mock import patch
from app.core.permissions import Auth0User

@pytest.fixture
def mock_user():
    return Auth0User(
        id="auth0|123",
        email="test@example.com",
        permissions=["features:read"],
    )

async def test_endpoint(client, mock_user):
    with patch("app.core.permissions.get_current_user", return_value=mock_user):
        response = await client.get("/api/v1/features")
        assert response.status_code == 200
```

## Code Style

- Formatter: black (line length 88)
- Import sorting: isort
- Linting: flake8, mypy
- Run all: `make format && make lint`

## Local Development

1. Ensure Docker and Docker Compose are installed
2. Configure Auth0 credentials in `.env` (see AUTH0_SETUP.md)
3. Run `make dev` to start all services
4. API available at http://localhost:8000
5. API docs available at http://localhost:8000/docs (Swagger UI)
6. Database admin at http://localhost:5050 (pgAdmin - admin@example.com/admin123)
7. Redis admin at http://localhost:8081 (Redis Commander)

## Adding New Features

When extending the template with your application-specific features:

1. **Create Models**: Define SQLAlchemy models in `app/models/`
2. **Create Schemas**: Define Pydantic schemas in `app/schemas/`
3. **Create Services**: Implement business logic in `app/services/` (inherit from `CRUDService` for basic operations)
4. **Create Routes**: Define API endpoints in `app/routes/` (can use `create_crud_router` for standard CRUD)
5. **Register Routes**: Add router to `app/routes/__init__.py`
6. **Create Migrations**: Run `make migrate-create` to generate Alembic migration
7. **Add Permissions**: Configure permissions in Auth0 Dashboard

See `AUTH0_SETUP.md`, `TEMPLATE_USAGE.md` and `ARCHITECTURE.md` for detailed guidance on extending this template.
