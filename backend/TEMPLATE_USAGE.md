# FastAPI Backend Template - Comprehensive Usage Guide

## Overview

This template provides a production-ready FastAPI backend with enterprise-grade features including **Auth0 authentication**, RBAC (Role-Based Access Control), async database operations, Redis caching, email services, and file storage.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [The Route Factory Pattern](#the-route-factory-pattern)
4. [Adding New Features](#adding-new-features)
5. [Authentication & Authorization](#authentication--authorization)
6. [Working with the Database](#working-with-the-database)
7. [Using the Service Layer](#using-the-service-layer)
8. [Email Services](#email-services)
9. [File Storage](#file-storage)
10. [Caching](#caching)
11. [Testing](#testing)
12. [Deployment](#deployment)

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git
- Auth0 account (free tier works for development)

### Installation

```bash
# Clone the repository
git clone <your-repo-url> my-new-project
cd my-new-project

# Copy environment file
cp .env.example .env

# Configure Auth0 (see AUTH0_SETUP.md for details)
# Edit .env with your Auth0 credentials:
#   AUTH0_DOMAIN=your-tenant.auth0.com
#   AUTH0_AUDIENCE=https://your-api.example.com

# Start development environment
make dev

# Run database migrations
make migrate

# Optional: Seed default data (roles, permissions)
make seed
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:8000 | Auth0 JWT |
| API Docs | http://localhost:8000/docs | - |
| pgAdmin | http://localhost:5050 | admin@example.com / admin123 |
| Redis Commander | http://localhost:8081 | - |

---

## Project Structure

```
app/
├── config/              # Configuration and settings
│   └── settings.py      # Environment-based settings (Pydantic)
├── core/                # Core functionality
│   ├── auth0.py         # Auth0 JWT verification
│   ├── database.py      # Async database connection
│   ├── permissions.py   # Permission checking & Auth0User
│   └── cache/           # Redis caching utilities
├── exceptions/          # Custom exception classes
│   ├── base.py          # Base exceptions
│   └── handlers.py      # Exception handlers
├── models/              # SQLAlchemy ORM models
│   ├── base.py          # BaseModel with common fields
│   └── *.py             # Entity models
├── routes/              # FastAPI route handlers
│   ├── crud_router.py   # Generic CRUD router (Route Factory)
│   └── *.py             # Entity routes
├── schemas/             # Pydantic schemas
│   ├── base.py          # Base schemas with camelCase
│   └── *.py             # Entity schemas
├── services/            # Business logic layer
│   ├── crud_service.py  # Generic CRUD service
│   └── *.py             # Entity services
├── utils/               # Utility functions
│   ├── email/           # Email providers (SMTP, SES)
│   └── *.py             # Storage, helpers
└── main.py              # Application entry point
```

---

## The Route Factory Pattern

This template uses a **Route Factory Pattern** through the `CRUDRouter` class, which automatically generates REST API endpoints for any model. This dramatically reduces boilerplate code.

### How It Works

The `CRUDRouter` class in `app/routes/crud_router.py`:

1. Takes a service class and schemas as input
2. Automatically creates CRUD endpoints (GET, POST, PUT, PATCH, DELETE)
3. Applies permission-based authentication
4. Includes pagination, search, and filtering
5. Supports self-referential endpoints (e.g., `/users/self`)

### Basic Usage

```python
from app.routes.crud_router import CRUDRouter
from app.services.feature_service import FeatureService
from app.schemas.feature import FeatureCreate, FeatureUpdate, FeatureOut

# Create router with automatic CRUD endpoints
crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    create_schema=FeatureCreate,
    update_schema=FeatureUpdate,
    prefix="/features",
    tags=["Features"],
    resource_name="features",  # Used for permissions: features:read, features:write, etc.
)

router = crud_router.get_router()
```

### Generated Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/` | `{resource}:read` | List all (paginated) |
| GET | `/{id}` | `{resource}:read` | Get by ID |
| POST | `/` | `{resource}:write` | Create new |
| POST | `/bulk` | `{resource}:write` | Bulk create |
| PUT | `/{id}` | `{resource}:write` | Full update |
| PATCH | `/{id}` | `{resource}:write` | Partial update |
| DELETE | `/{id}` | `{resource}:delete` | Delete |
| POST | `/search` | `{resource}:read` | Search with filters |
| GET | `/count` | `{resource}:read` | Count total |

### Advanced Configuration

```python
crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    create_schema=FeatureCreate,
    update_schema=FeatureUpdate,
    prefix="/features",
    tags=["Features"],
    resource_name="features",

    # Exclude specific endpoints
    exclude=["delete", "create_bulk"],

    # Or include only specific endpoints
    # include_only=["get_all", "get_by_id"],

    # Custom permission mappings
    custom_permissions={
        "get_all": "features:list",
        "delete": "admin:delete",
    },

    # Enable user-specific endpoints (/self/{id})
    enable_self_endpoints=True,

    # ID type: "int" or "str" (for UUIDs)
    id_type="str",
)
```

### Adding Custom Endpoints

```python
crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    # ... other config
)

# Add custom endpoint
@crud_router.router.post("/{feature_id}/activate")
async def activate_feature(
    feature_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("features:admin")),
    db: AsyncSession = Depends(get_async_db),
):
    service = FeatureService()
    return await service.activate(db, feature_id)

router = crud_router.get_router()
```

---

## Adding New Features

### Step-by-Step: Adding a "Project" Entity

#### 1. Create the Model (`app/models/project.py`)

```python
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Project(BaseModel):
    __tablename__ = "projects"

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    due_date = Column(DateTime, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="projects")
```

Register in `app/models/__init__.py`:

```python
from .project import Project
```

#### 2. Create Schemas (`app/schemas/project.py`)

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    due_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    due_date: Optional[datetime] = None

class ProjectOut(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

#### 3. Create Service (`app/services/project_service.py`)

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.crud_service import CRUDService
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.feature import PaginationParams, PaginatedResponse

class ProjectService(CRUDService[Project, ProjectCreate, ProjectUpdate]):
    def __init__(self):
        super().__init__(Project)

    async def get_user_projects(
        self,
        db: AsyncSession,
        user_id: str,
        pagination: PaginationParams
    ) -> PaginatedResponse:
        """Get all projects owned by a user."""
        query = select(Project).where(Project.owner_id == user_id)
        return await self._paginate(db, query, pagination)

    async def activate(self, db: AsyncSession, project_id: str) -> Project:
        """Activate a project."""
        project = await self.get_by_id(db, project_id)
        if project:
            project.is_active = True
            await db.commit()
            await db.refresh(project)
        return project

    async def get_all_by_user(
        self,
        db: AsyncSession,
        user_id: str,
        pagination: PaginationParams
    ) -> PaginatedResponse:
        """Required method for self endpoints."""
        return await self.get_user_projects(db, user_id, pagination)

    async def verify_project_access(
        self,
        db: AsyncSession,
        user_id: str,
        project_id: str
    ) -> bool:
        """Verify user owns the project (for self endpoints)."""
        project = await self.get_by_id(db, project_id)
        return project and project.owner_id == user_id


# Singleton instance
project_service = ProjectService()
```

#### 4. Create Routes (`app/routes/projects.py`)

Using the Route Factory:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.routes.crud_router import CRUDRouter
from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.services.project_service import ProjectService
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut

# Create CRUD router with Route Factory
crud_router = CRUDRouter(
    service_class=ProjectService,
    schema=ProjectOut,
    create_schema=ProjectCreate,
    update_schema=ProjectUpdate,
    prefix="",
    tags=["Projects"],
    resource_name="projects",
    enable_self_endpoints=True,
    id_type="str",
)

# Get the router
router = crud_router.get_router()

# Add custom endpoint
@router.post("/{project_id}/activate", response_model=ProjectOut)
async def activate_project(
    project_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:admin")),
    db: AsyncSession = Depends(get_async_db),
):
    """Activate a project (admin only)."""
    service = ProjectService()
    return await service.activate(db, project_id)
```

#### 5. Register Router (`app/routes/__init__.py`)

```python
from .projects import router as projects_router

# Add to api_router
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
```

#### 6. Create Migration

```bash
make migrate-create
# Enter: "add projects table"

# Apply migration
make migrate
```

#### 7. Add Permissions in Auth0

Add these permissions to your Auth0 API:
- `projects:read`
- `projects:write`
- `projects:delete`
- `projects:admin`
- `projects:read:self`
- `projects:write:self`
- `projects:delete:self`

---

## Authentication & Authorization

This template uses **Auth0** for authentication. See [AUTH0_SETUP.md](./AUTH0_SETUP.md) for detailed setup.

### Basic Authentication

```python
from app.core.permissions import get_current_user, Auth0User

@router.get("/profile")
async def get_profile(
    current_user: Auth0User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "permissions": current_user.permissions,
        "roles": current_user.roles,
    }
```

### Permission-Based Authorization

```python
from app.core.permissions import has_permissions

# Single permission
@router.get("/features")
async def list_features(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("features:read"))
):
    pass

# Multiple permissions (any)
@router.post("/features")
async def create_feature(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions(["features:write", "features:admin"]))
):
    # User needs EITHER permission
    pass

# Multiple permissions (all)
@router.delete("/features/{id}")
async def delete_feature(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions(
        ["features:delete", "features:admin"],
        require_all=True
    ))
):
    # User needs BOTH permissions
    pass
```

### Role-Based Authorization

```python
from app.core.permissions import has_role

@router.get("/admin/dashboard")
async def admin_dashboard(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_role("admin"))
):
    return {"dashboard": "admin data"}
```

---

## Working with the Database

### Async Sessions

Always use async patterns:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_async_db

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

### Relationships and Eager Loading

```python
from sqlalchemy.orm import selectinload

# Avoid N+1 queries
result = await db.execute(
    select(Project)
    .options(selectinload(Project.owner))
    .where(Project.is_active == True)
)
projects = result.scalars().all()
```

### Transactions

```python
async def transfer_funds(db: AsyncSession, from_id: str, to_id: str, amount: float):
    try:
        from_account = await get_account(db, from_id)
        to_account = await get_account(db, to_id)

        from_account.balance -= amount
        to_account.balance += amount

        await db.commit()
    except Exception:
        await db.rollback()
        raise
```

---

## Using the Service Layer

### CRUD Service Base Class

The `CRUDService` provides standard database operations:

```python
from app.services.crud_service import CRUDService
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate

class ItemService(CRUDService[Item, ItemCreate, ItemUpdate]):
    def __init__(self):
        super().__init__(Item)

    # Inherited methods:
    # - get_by_id(db, id)
    # - get_all(db, pagination)
    # - create(db, schema)
    # - update(db, id, schema)
    # - patch(db, id, data_dict)
    # - delete(db, id)
    # - search(db, params, pagination)
    # - count(db)
```

### Custom Service Methods

```python
class ItemService(CRUDService[Item, ItemCreate, ItemUpdate]):
    def __init__(self):
        super().__init__(Item)

    async def get_active_items(self, db: AsyncSession) -> list[Item]:
        """Custom method: Get only active items."""
        result = await db.execute(
            select(Item).where(Item.is_active == True)
        )
        return result.scalars().all()

    async def mark_as_featured(self, db: AsyncSession, item_id: str) -> Item:
        """Custom method: Mark item as featured."""
        item = await self.get_by_id(db, item_id)
        if item:
            item.is_featured = True
            await db.commit()
            await db.refresh(item)
        return item
```

---

## Email Services

### Configuration

See [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md) for detailed email setup.

### Usage

```python
from app.services.email_service import email_service

# Send simple email
await email_service.send_email(
    to_email="user@example.com",
    subject="Welcome!",
    body="<h1>Welcome to our app!</h1>",
)

# Send verification email
await email_service.send_verification_email(
    to_email="user@example.com",
    verification_code="123456",
)

# Send password reset
await email_service.send_password_reset_email(
    to_email="user@example.com",
    reset_token="abc123",
)
```

---

## File Storage

### Configuration

See [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md) for storage setup.

### Usage

```python
from app.utils.storage_factory import get_file_storage

storage = get_file_storage()

# Upload file
url = await storage.upload(
    file_content=file.file.read(),
    file_path="uploads/document.pdf",
    content_type="application/pdf"
)

# Get URL
url = storage.get_url("uploads/document.pdf")

# Delete file
await storage.delete("uploads/document.pdf")
```

---

## Caching

### Redis Cache

```python
from app.core.cache import get_cache

cache = await get_cache()

# Basic operations
await cache.set("key", "value", expire=3600)
value = await cache.get("key")
await cache.delete("key")

# Cache decorator
from app.core.cache.decorators import cached

@cached(ttl=300, key_prefix="users")
async def get_user_data(user_id: str):
    # This result will be cached for 5 minutes
    return await fetch_user_data(user_id)
```

---

## Testing

### Running Tests

```bash
# Run all tests
make test

# Run specific test file
docker-compose exec web python -m pytest tests/test_projects.py

# Run with coverage
docker-compose exec web python -m pytest --cov=app tests/

# Run with verbose output
docker-compose exec web python -m pytest -v
```

### Mocking Authentication

```python
import pytest
from unittest.mock import patch
from app.core.permissions import Auth0User

@pytest.fixture
def mock_user():
    return Auth0User(
        id="auth0|123",
        email="test@example.com",
        permissions=["projects:read", "projects:write"],
        roles=["user"],
    )

@pytest.mark.asyncio
async def test_get_projects(client, mock_user):
    with patch("app.core.permissions.get_current_user", return_value=mock_user):
        response = await client.get("/api/v1/projects")
        assert response.status_code == 200
```

---

## Deployment

### Production Checklist

1. **Environment Variables**
   - [ ] Set `ENVIRONMENT=production`
   - [ ] Set `DEBUG=false`
   - [ ] Generate strong `SECRET_KEY`
   - [ ] Configure Auth0 production credentials

2. **Database**
   - [ ] Use managed PostgreSQL (RDS, Cloud SQL)
   - [ ] Configure connection pooling
   - [ ] Set up automated backups

3. **Redis**
   - [ ] Use managed Redis (ElastiCache, Redis Cloud)
   - [ ] Configure password authentication

4. **Security**
   - [ ] Configure proper CORS origins
   - [ ] Enable HTTPS (use reverse proxy)
   - [ ] Set up rate limiting
   - [ ] Review Auth0 RBAC permissions

5. **File Storage**
   - [ ] Use S3 for production
   - [ ] Configure CloudFront CDN

6. **Monitoring**
   - [ ] Set up error tracking (Sentry)
   - [ ] Configure logging aggregation
   - [ ] Set up health check monitoring

### Production Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Additional Documentation

- [AUTH0_SETUP.md](./AUTH0_SETUP.md) - Detailed Auth0 configuration
- [EXTERNAL_SERVICES_SETUP.md](./EXTERNAL_SERVICES_SETUP.md) - External services setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture documentation
- [LOGGING.md](./LOGGING.md) - Logging configuration

---

## Support

For detailed guides:
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Auth0 Documentation](https://auth0.com/docs)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
