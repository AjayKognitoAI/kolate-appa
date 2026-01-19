# Architecture Documentation

## System Overview

This FastAPI backend template follows a clean, layered architecture with clear separation of concerns. It's designed for scalability, maintainability, and testability.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (Web, Mobile, Third-party APIs)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Layer                           │
│                  (Routes / Controllers)                      │
│  - Request validation (Pydantic)                            │
│  - HTTP concerns (status codes, headers)                     │
│  - Dependency injection                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│                  (Business Logic)                            │
│  - Domain logic                                             │
│  - Data validation and transformation                        │
│  - Business rule enforcement                                 │
│  - Exception handling                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌─────────────────┐   ┌─────────────────┐
     │   Data Layer    │   │   External APIs │
     │  (SQLAlchemy)   │   │  (Email, S3)    │
     └────────┬────────┘   └─────────────────┘
              │
              ▼
     ┌─────────────────┐
     │   PostgreSQL    │
     │     Redis       │
     └─────────────────┘
```

## Core Components

### 1. Models Layer (`app/models/`)

**Purpose**: Define database schema and ORM mappings

**Key Patterns**:
- All models inherit from `BaseModel` which provides:
  - `id`: UUID primary key
  - `created_at`: Timestamp
  - `updated_at`: Auto-updating timestamp
- Use SQLAlchemy 2.0+ async style
- Define relationships explicitly

**Example**:
```python
from app.models.base import BaseModel
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship

class Article(BaseModel):
    __tablename__ = "articles"

    title = Column(String(255), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"))

    # Relationships
    author = relationship("User", back_populates="articles")
```

**Best Practices**:
- Keep models pure database concerns (no business logic)
- Use enums for status fields
- Add database constraints (unique, nullable, etc.)
- Use cascade delete appropriately

### 2. Schemas Layer (`app/schemas/`)

**Purpose**: Define request/response data structures with validation

**Key Patterns**:
- Separate schemas for Create, Update, and Response
- Use Pydantic v2 for validation
- `ConfigDict(from_attributes=True)` for ORM compatibility

**Example**:
```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None

class ArticleCreate(ArticleBase):
    pass

class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None

class ArticleResponse(ArticleBase):
    id: str
    author_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

**Best Practices**:
- Use `BaseModel` for shared fields
- Create-specific fields should be required
- Update-specific fields should be optional
- Add field validation (min_length, max_length, regex, etc.)

### 3. Services Layer (`app/services/`)

**Purpose**: Encapsulate business logic and orchestrate data operations

**Key Patterns**:
- Inherit from `CRUDService` for basic operations
- Services are stateless (use dependency injection)
- Return models, not dictionaries
- Raise custom exceptions (from `app/exceptions/`)

**Example**:
```python
from app.services.crud_service import CRUDService
from app.models.article import Article
from app.schemas.article import ArticleCreate, ArticleUpdate
from app.exceptions import NotFoundException, ForbiddenException

class ArticleService(CRUDService[Article, ArticleCreate, ArticleUpdate]):
    def __init__(self):
        super().__init__(Article)

    async def publish_article(self, db, article_id: str, user_id: str):
        """Business logic: Publish an article"""
        article = await self.get_by_id(db, article_id)

        # Business rule: Only author can publish
        if article.author_id != user_id:
            raise ForbiddenException("Only the author can publish this article")

        # Business rule: Article must have content
        if not article.content:
            raise ValidationException("Article must have content to be published")

        article.status = "published"
        article.published_at = datetime.utcnow()
        await db.commit()
        await db.refresh(article)
        return article

article_service = ArticleService()
```

**Best Practices**:
- ALL business logic goes in services
- Never access database directly from routes
- Use async/await consistently
- Handle transactions properly (commit/rollback)
- Raise exceptions for error cases

### 4. Routes Layer (`app/routes/`)

**Purpose**: HTTP interface and request/response handling

**Key Patterns**:
- Use FastAPI dependency injection
- Keep routes thin (delegate to services)
- Use appropriate HTTP methods and status codes
- Add proper response models

**Example**:
```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import require_permission
from app.services.auth_service import get_current_user
from app.services.article_service import article_service
from app.schemas.article import ArticleCreate, ArticleUpdate, ArticleResponse
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    data: ArticleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new article"""
    article_dict = data.model_dump()
    article_dict["author_id"] = current_user.id
    return await article_service.create(db, article_dict)

@router.post("/{article_id}/publish", response_model=ArticleResponse)
@require_permission("articles:publish")
async def publish_article(
    article_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish an article"""
    return await article_service.publish_article(db, article_id, current_user.id)
```

**Best Practices**:
- Use dependency injection for database, auth, permissions
- Add proper HTTP status codes
- Document endpoints with docstrings
- Use response_model for automatic validation
- Handle exceptions with exception handlers

## Authentication & Authorization

### JWT Authentication Flow

```
1. Login Request
   POST /api/v1/auth/login
   {email, password}

2. Server validates credentials
   - Hash password
   - Compare with database
   - Check if user is active

3. Generate Tokens
   - Create access token (JWT with JTI)
   - Create refresh token (stored in database)
   - Create session record

4. Return Response
   - access_token (short-lived, e.g., 30 min)
   - session_id (maps to refresh token)
   - Set HttpOnly cookie (web) or return in body (mobile)

5. Subsequent Requests
   - Include access_token in Authorization header
   - Server validates JWT signature
   - Server checks expiration
   - Server loads user from token claims

6. Token Refresh
   - Send expired access_token + session_id
   - Server validates session exists
   - Server validates JTI matches
   - Generate new access_token with new JTI
   - Update session with new JTI
   - Return new access_token
```

### RBAC System

The template includes a complete RBAC system with four hierarchical levels:

1. **Features**: High-level modules (e.g., "users", "articles", "reports")
2. **Actions**: Operations (e.g., "read", "write", "delete", "admin")
3. **Permissions**: Feature + Action combinations (e.g., "users:write", "articles:delete")
4. **Roles**: Collections of permissions (e.g., "Admin", "Editor", "Viewer")

**Adding Permissions to Routes**:

```python
from app.core.permissions import require_permission

@router.delete("/{id}")
@require_permission("articles:delete")
async def delete_article(...):
    ...
```

**Checking Permissions in Services**:

```python
from app.core.permissions import has_permission

if not await has_permission(user, "articles:publish"):
    raise ForbiddenException("Insufficient permissions")
```

## Database Patterns

### Async Sessions

Always use async patterns:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Good
async def get_articles(db: AsyncSession):
    result = await db.execute(select(Article))
    return result.scalars().all()

# Bad - don't use sync operations
def get_articles_sync(db):
    return db.query(Article).all()  # Won't work with async
```

### Relationships

Define bidirectional relationships:

```python
# User model
articles = relationship("Article", back_populates="author")

# Article model
author = relationship("User", back_populates="articles")
```

### Eager Loading

Use `selectinload` or `joinedload` to avoid N+1 queries:

```python
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Article).options(selectinload(Article.author))
)
articles = result.scalars().all()
# Now article.author is loaded without additional queries
```

## Caching Strategy

Redis is used for:
- Session storage
- Rate limiting
- Temporary data (OTPs, verification tokens)

**Example**:

```python
from app.core.redis import get_redis

redis = await get_redis()

# Cache data
await redis.setex(f"article:{article_id}", 3600, json.dumps(article_data))

# Retrieve cached data
cached = await redis.get(f"article:{article_id}")
if cached:
    return json.loads(cached)
```

## File Storage Abstraction

The template provides a unified interface for local and S3 storage:

```python
from app.utils.storage_factory import get_storage

storage = get_storage()

# Upload file (works with both local and S3)
file_url = await storage.upload(file_content, "path/to/file.jpg")

# Delete file
await storage.delete("path/to/file.jpg")
```

## Email Services

Two providers are supported with identical interfaces:

```python
from app.utils.email.factory import get_email_provider

email_provider = get_email_provider()

await email_provider.send_email(
    to_email="user@example.com",
    subject="Welcome",
    body="<h1>Welcome!</h1>",
    from_email="noreply@example.com",
    from_name="Your App"
)
```

## Error Handling

### Custom Exceptions

Define in `app/exceptions/`:

```python
class ArticleNotFoundException(Exception):
    pass

class ArticleAlreadyPublishedException(Exception):
    pass
```

### Exception Handlers

Register in `app/main.py`:

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(ArticleNotFoundException)
async def article_not_found_handler(request: Request, exc: ArticleNotFoundException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)}
    )
```

## Testing Strategy

```
tests/
├── unit/              # Unit tests (services, utilities)
├── integration/       # Integration tests (database, external services)
└── e2e/              # End-to-end API tests
```

**Example Test**:

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_article(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/v1/articles",
        json={"title": "Test Article", "content": "Test content"},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Article"
```

## Performance Considerations

1. **Database**:
   - Use connection pooling (configured in database.py)
   - Add database indexes for frequently queried fields
   - Use pagination for large datasets
   - Optimize N+1 queries with eager loading

2. **Caching**:
   - Cache expensive computations
   - Use Redis for session data
   - Implement cache invalidation strategies

3. **Async Operations**:
   - Use async/await throughout
   - Avoid blocking operations
   - Use background tasks for long-running operations

4. **API Design**:
   - Implement pagination
   - Use field selection (partial responses)
   - Add rate limiting for public endpoints

## Security Best Practices

1. **Authentication**:
   - Passwords hashed with bcrypt
   - JWT tokens with expiration
   - Refresh token rotation (JTI)
   - HttpOnly cookies for web clients

2. **Authorization**:
   - RBAC enforced at route and service levels
   - Permission checks before sensitive operations
   - Resource ownership validation

3. **Data Protection**:
   - SQL injection prevention (parameterized queries)
   - XSS prevention (output encoding)
   - CORS configuration
   - Environment-based secrets

4. **API Security**:
   - Rate limiting (to be implemented)
   - Input validation (Pydantic)
   - Output sanitization
   - HTTPS in production

## Deployment Architecture

```
                         ┌─────────────┐
                         │   Nginx     │ (Reverse Proxy, SSL/TLS)
                         └──────┬──────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ┌─────▼─────┐           ┌────▼─────┐
              │  FastAPI  │           │ FastAPI  │ (Multiple instances)
              │  Instance │           │ Instance │
              └─────┬─────┘           └────┬─────┘
                    │                      │
              ┌─────┴──────────────────────┴─────┐
              │                                   │
        ┌─────▼─────┐                      ┌─────▼─────┐
        │ PostgreSQL│ (Primary + Replicas) │   Redis   │
        └───────────┘                      └───────────┘
```

## Migration Strategy

1. **Development**: Auto-generate migrations with Alembic
2. **Review**: Always review generated migrations
3. **Test**: Test migrations on staging database
4. **Deploy**: Apply migrations before deploying new code
5. **Rollback**: Keep downgrade migrations for emergency rollback

## Monitoring & Logging

- Structured JSON logging (configured in `app/core/logging.py`)
- Request/response logging middleware
- Error tracking (integrate Sentry in production)
- Performance monitoring (integrate APM tools)

## Further Reading

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
