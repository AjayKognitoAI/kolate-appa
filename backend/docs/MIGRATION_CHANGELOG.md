# Migration Changelog

This document tracks all changes made during the migration from Spring Boot microservices to the consolidated FastAPI backend.

## Overview

**Migration Goal**: Consolidate 13 Spring Boot microservices into a single FastAPI backend with schema-based multi-tenancy.

**Status**: Phase 1 Complete

---

## Phase 1: Backend Consolidation

### 1.1 Initial Setup
- Created FastAPI backend structure based on `backend-template-to-use/`
- Set up async SQLAlchemy 2.0 with PostgreSQL
- Configured Auth0 JWT authentication
- Implemented schema-based multi-tenancy

### 1.2 Database Migration
- Migrated from MongoDB to PostgreSQL with JSONB for flexible data
- Created Alembic migrations for all models
- Implemented tenant schema provisioning scripts

**Key Changes:**
- Patient records now stored in PostgreSQL with JSONB `patient_data` column
- Execution records use JSONB for `base_patient_data` and `base_prediction`
- Removed all MongoDB dependencies (Motor, Beanie, pymongo)

### 1.3 Service Migration

#### Auth Services (from auth-manager)
| Spring Boot | FastAPI |
|-------------|---------|
| `Auth0OrganizationService` | `app/services/auth/auth0_org_service.py` |
| `Auth0UserService` | `app/services/auth/auth0_user_service.py` |
| `Auth0RoleService` | `app/services/auth/auth0_role_service.py` |
| `Auth0SelfSsoService` | `app/services/auth/auth0_sso_service.py` |
| `TokenService` | `app/services/auth/auth0_token_service.py` |

#### Enterprise Services (from enterprise-manager)
| Spring Boot | FastAPI |
|-------------|---------|
| `EnterpriseService` | `app/services/enterprises/enterprise_service.py` |
| `AdminService` | `app/services/enterprises/admin_service.py` |
| `EnterpriseModuleAccessService` | `app/services/enterprises/module_access_service.py` |
| `SsoTicketService` | `app/services/enterprises/sso_service.py` |
| `TrialService` | `app/services/enterprises/trial_service.py` |
| `OnboardingService` | `app/services/enterprises/onboarding_service.py` |

#### Project Services (from project-manager)
| Spring Boot | FastAPI |
|-------------|---------|
| `ProjectService` | `app/services/projects/project_service.py` |
| `ProjectUserService` | `app/services/projects/project_user_service.py` |
| `ProjectRoleService` | `app/services/projects/project_role_service.py` |

#### User Services (from user-manager)
| Spring Boot | FastAPI |
|-------------|---------|
| `UserService` | `app/services/user_service.py` |

#### Asset Services (from asset-manager)
| Spring Boot | FastAPI |
|-------------|---------|
| `S3Service` | `app/services/storage/s3_service.py` |
| `UploadService` | `app/services/assets/upload_service.py` |

#### Patient Record Services (from mongo-database-manager)
| Spring Boot/MongoDB | FastAPI/PostgreSQL |
|---------------------|-------------------|
| `PatientRecordRepository` | `app/services/patient_records/patient_record_service.py` |
| `ExecutionRecordRepository` | `app/services/patient_records/execution_record_service.py` |

### 1.4 API Gateway Implementation

Replaced Spring Cloud Gateway with FastAPI middleware.

#### Rate Limiting (`app/middleware/rate_limiter.py`)
- IP-based rate limiting using Redis
- Sliding window algorithm
- Configurable via `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW`
- Graceful degradation when Redis unavailable
- Skip paths: `/docs`, `/health`, `/api/v1/external/`, `/api/v1/public/`

**Equivalent Spring Configuration:**
```yaml
# Spring Cloud Gateway
spring:
  cloud:
    gateway:
      routes:
        - id: rate-limited
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 100
                redis-rate-limiter.burstCapacity: 100
```

**FastAPI Implementation:**
```python
app.add_middleware(
    RateLimiterMiddleware,
    requests_per_window=100,
    window_seconds=60,
)
```

#### API Gateway Authentication (`app/middleware/api_gateway.py`)
- JWT token extraction from Authorization header
- Extracts `user_id` (sub claim) and `org_id` from token
- Adds `x-user-id` and `x-org-id` headers for downstream handlers
- Skips authentication for public paths

**Equivalent Spring Filter:**
```java
// JwtAuthenticationFilter.java
exchange.getRequest().mutate()
    .header("user-id", userId)
    .header("org-id", orgId)
    .build();
```

**FastAPI Implementation:**
```python
app.add_middleware(
    APIGatewayMiddleware,
    enforce_auth=False,
)
```

#### Request ID Tracking (`app/middleware/request_id.py`)
- Generates unique request IDs for distributed tracing
- Accepts existing `X-Request-ID` header from upstream
- Adds `X-Request-ID` and `X-Correlation-ID` to responses

### 1.5 MongoDB to PostgreSQL Migration

#### Removed Files
- `app/models/mongo/` - MongoDB document models
- `app/schemas/mongo.py` - MongoDB-specific schemas
- `MONGODB_MIGRATION_GUIDE.md`
- `MONGODB_SERVICES_IMPLEMENTATION.md`

#### Updated Configuration
```python
# Removed from settings.py
MONGO_URL=mongodb://localhost:27017
MONGO_DATABASE=kolate_db
MONGO_MIN_POOL_SIZE=1
MONGO_MAX_POOL_SIZE=10

# Removed from requirements.txt
motor==3.3.2
beanie==1.23.6
pymongo==4.6.1
```

#### Data Model Changes
**Before (MongoDB):**
```python
class PatientRecord(Document):
    org_id: str
    project_id: str
    trial_slug: str
    record_id: str
    patient_data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]]

    class Settings:
        collection = "patient_records"
```

**After (PostgreSQL):**
```python
class PatientRecord(Base):
    __tablename__ = "patient_records"

    id = Column(UUID, primary_key=True)
    project_id = Column(UUID, ForeignKey("projects.id"))
    trial_slug = Column(String(64))
    record_id = Column(String(128), unique=True)
    patient_data = Column(JSONB, nullable=False)  # Flexible schema
    metadata = Column(JSONB, default={})
```

### 1.6 Testing & Validation

#### Test Infrastructure
- Created `tests/conftest.py` with test fixtures
- Created `tests/services/` for service unit tests
- Added `.env.test` for test environment configuration

#### Test Coverage
- 18 tests passing
- Patient record service tests (7 tests)
- Execution record service tests (11 tests)

#### SQLAlchemy 2.0 Compatibility
Fixed type annotation issues for SQLAlchemy 2.0:
```python
# app/core/database.py
class _Base:
    __allow_unmapped__ = True

Base = declarative_base(cls=_Base)
```

---

## API Endpoint Mapping

### Authentication
| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `POST /api/auth-manager/v1/login` | `POST /api/v1/auth/login` |
| `POST /api/auth-manager/v1/callback` | `POST /api/v1/auth/callback` |
| `GET /api/auth-manager/v1/users` | `GET /api/v1/auth/users` |
| `POST /api/auth-manager/v1/users` | `POST /api/v1/auth/users` |
| `GET /api/auth-manager/v1/organizations` | `GET /api/v1/auth/organizations` |
| `POST /api/auth-manager/v1/sso/ticket` | `POST /api/v1/auth/sso/ticket` |

### Enterprises
| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `GET /api/enterprise-manager/v1/enterprises` | `GET /api/v1/enterprises` |
| `POST /api/enterprise-manager/v1/enterprises` | `POST /api/v1/enterprises` |
| `GET /api/enterprise-manager/v1/enterprises/{id}` | `GET /api/v1/enterprises/{id}` |
| `POST /api/enterprise-manager/v1/enterprises/{id}/onboarding/complete` | `POST /api/v1/enterprises/{id}/onboarding/complete` |

### Projects
| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `GET /api/project-manager/v1/projects` | `GET /api/v1/projects` |
| `POST /api/project-manager/v1/projects` | `POST /api/v1/projects` |
| `GET /api/project-manager/v1/projects/{id}/users` | `GET /api/v1/projects/{id}/users` |

### Users
| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `GET /api/user-manager/v1/users` | `GET /api/v1/users` |
| `POST /api/user-manager/v1/users/invite` | `POST /api/v1/users/invite` |

### Patient Records
| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `GET /api/mongo-database-manager/v1/patient-records` | `GET /api/v1/patient-records/{project_id}/{trial_slug}` |
| `POST /api/mongo-database-manager/v1/patient-records` | `POST /api/v1/patient-records/{project_id}/{trial_slug}` |
| `GET /api/mongo-database-manager/v1/executions` | `GET /api/v1/executions/{project_id}/{trial_slug}` |
| `POST /api/mongo-database-manager/v1/executions` | `POST /api/v1/executions/{project_id}/{trial_slug}` |

### Assets
| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `POST /api/asset-manager/v1/upload` | `POST /api/v1/assets/upload` |
| `GET /api/asset-manager/v1/files/{id}` | `GET /api/v1/assets/{id}` |

---

## Configuration Changes

### Environment Variables

#### Added
```env
# Rate Limiting (API Gateway)
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Background Tasks (replaces Kafka)
ENABLE_BACKGROUND_TASKS=true
BACKGROUND_TASK_MAX_WORKERS=4

# Multi-Tenancy
ENABLE_MULTI_TENANT=true
TENANT_HEADER_NAME=org-id
USER_HEADER_NAME=user-id
DEFAULT_SCHEMA=public
TENANT_SCHEMA_PREFIX=org_
```

#### Removed
```env
# MongoDB (removed)
MONGO_URL=mongodb://localhost:27017
MONGO_DATABASE=kolate_db
MONGO_MIN_POOL_SIZE=1
MONGO_MAX_POOL_SIZE=10

# Kafka (replaced with background tasks)
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CONSUMER_GROUP=kolate-consumer
```

### Dependencies

#### Added
```
slowapi==0.1.9           # Rate limiting
tenacity==8.2.3          # Retry logic
aioboto3==15.2.0         # Async AWS SDK
boto3>=1.40.15           # AWS SDK
botocore>=1.40.15        # AWS core
```

#### Removed
```
motor==3.3.2             # MongoDB async driver
beanie==1.23.6           # MongoDB ODM
pymongo==4.6.1           # MongoDB driver
kafka-python==2.0.2      # Kafka client
```

---

## Directory Structure

```
backend/
├── app/
│   ├── config/
│   │   └── settings.py          # Configuration with rate limiting
│   ├── core/
│   │   ├── auth0.py             # Auth0 JWT verification
│   │   ├── database.py          # SQLAlchemy setup with __allow_unmapped__
│   │   ├── permissions.py       # RBAC permissions
│   │   └── tenant.py            # Multi-tenancy helpers
│   ├── middleware/              # NEW: API Gateway middleware
│   │   ├── __init__.py
│   │   ├── api_gateway.py       # JWT extraction, header propagation
│   │   ├── rate_limiter.py      # IP-based rate limiting
│   │   └── request_id.py        # Request ID tracking
│   ├── models/
│   │   ├── enterprise/          # Enterprise models (public schema)
│   │   └── tenant/              # Tenant models (org_xxx schemas)
│   ├── routes/
│   │   ├── auth/                # Auth0 management routes
│   │   ├── enterprises/         # Enterprise management routes
│   │   ├── projects/            # Project management routes
│   │   ├── patient_records/     # Patient record routes (PostgreSQL)
│   │   └── assets/              # Asset upload routes
│   ├── services/
│   │   ├── auth/                # Auth0 services
│   │   ├── enterprises/         # Enterprise services
│   │   ├── projects/            # Project services
│   │   ├── patient_records/     # Patient record services (PostgreSQL)
│   │   └── storage/             # S3 storage services
│   └── schemas/
│       └── patient_record.py    # Pydantic schemas for patient records
├── docs/
│   ├── ENTERPRISE_ONBOARDING.md # Enterprise onboarding guide
│   ├── MIGRATION_CHANGELOG.md   # This file
│   └── QUICK_START.md           # Quick start guide
├── tests/
│   ├── conftest.py              # Test configuration
│   └── services/                # Service unit tests
├── alembic/
│   └── versions/                # Database migrations
├── main.py                      # FastAPI application with middleware
└── requirements.txt             # Dependencies
```

---

## Known Issues & Considerations

### SQLAlchemy 2.0 Compatibility
The codebase uses `__allow_unmapped__ = True` to support legacy type annotations without `Mapped[]`. Future refactoring should update to proper SQLAlchemy 2.0 annotations.

### Table Name Conflicts
There are two `users` tables:
- `public.users` - Template user table
- `org_xxx.users` - Tenant user table

The tenant user model uses dynamic schema via `__table_args__`.

### Rate Limiting
Rate limiting requires Redis. When Redis is unavailable, the middleware gracefully degrades and allows all requests.

---

## Next Steps (Phase 2)

1. **Frontend Migration**
   - Update API endpoints in frontend
   - Update authentication flow
   - Test all user flows

2. **Integration Testing**
   - End-to-end tests
   - Load testing with rate limiting
   - Multi-tenant data isolation tests

3. **Deployment**
   - Docker configuration
   - CI/CD pipeline
   - Monitoring and logging setup
