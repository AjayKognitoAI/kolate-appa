# Phase 1.1: Project Setup

## Objective
Initialize the consolidated FastAPI backend by copying the template and setting up the project structure for all microservices.

---

## Architecture Decision: Removing Spring Cloud Components

### What Gets Removed (Default Microservices)

| Component | Original Purpose | New Approach |
|-----------|------------------|--------------|
| **Eureka (Service Registry)** | Service discovery for microservices | NOT NEEDED - Single consolidated backend |
| **Config Server** | Centralized configuration | Use `.env` files + Pydantic Settings |
| **API Gateway (Spring Cloud)** | JWT validation, routing, rate limiting | FastAPI handles all directly (see below) |
| **App-Env-Configuration** | Environment config | Merged into Pydantic Settings |

### API Gateway Replacement Strategy

The Spring Cloud Gateway handled:
1. **JWT Validation** → Move to FastAPI middleware (`app/core/auth0.py` already handles this)
2. **Route Routing** → Not needed (single app)
3. **Rate Limiting** → Use `slowapi` library in FastAPI
4. **CORS** → FastAPI CORSMiddleware (already in template)
5. **Circuit Breaker** → Not needed for internal calls; use `tenacity` for external APIs

### Optional: External Reverse Proxy
For production, you may want nginx or Traefik in front of FastAPI for:
- SSL termination
- Load balancing (if running multiple FastAPI instances)
- Static file serving

```
[Client] → [nginx/Traefik] → [FastAPI Consolidated Backend]
                                    ↓
                            [PostgreSQL] [MongoDB] [Redis] [S3]
```

### What Gets Kept (Modified)

| Component | Original | New Approach |
|-----------|----------|--------------|
| **Postgres-Database-Manager** | Separate service for DB ops | Merged into main app models/services |
| **Mongo-Database-Manager** | Separate service for MongoDB | Merged using Motor/Beanie |
| **Message-Publisher (Kafka)** | Async event publishing | FastAPI BackgroundTasks or Celery |
| **Asset-Manager** | S3 file operations | S3 service in consolidated app |

---

## Prompt

```
Using the python-pro and architect-review agents, help me set up the consolidated FastAPI backend.

## Task
1. Copy `backend-template-to-use/` to a new folder `consolidated-backend/`
2. Update the project structure to accommodate all microservices being consolidated

## Required Module Structure
Create the following module structure inside `consolidated-backend/app/`:

```
app/
├── routes/
│   ├── auth/                    # From auth-manager
│   │   ├── __init__.py
│   │   ├── users.py             # User management via Auth0
│   │   ├── organizations.py     # Organization management
│   │   ├── roles.py             # Role management
│   │   └── sso.py               # SSO operations
│   ├── enterprises/             # From enterprise-manager
│   │   ├── __init__.py
│   │   ├── enterprises.py       # Enterprise CRUD
│   │   ├── admins.py            # Admin management
│   │   ├── datasources.py       # Datasource configuration
│   │   ├── modules.py           # Module access
│   │   ├── onboarding.py        # Onboarding workflow
│   │   ├── trials.py            # Trial management
│   │   └── sso_tickets.py       # SSO tickets
│   ├── projects/                # From project-manager
│   │   ├── __init__.py
│   │   ├── projects.py          # Project CRUD
│   │   ├── project_users.py     # User-project relationships
│   │   └── project_roles.py     # Project-specific roles
│   ├── assets/                  # From asset-manager
│   │   ├── __init__.py
│   │   └── uploads.py           # File upload to S3
│   ├── patient_records/         # From mongo-database-manager
│   │   ├── __init__.py
│   │   ├── records.py           # Patient record CRUD
│   │   └── executions.py        # Execution records
│   └── internal/                # Internal endpoints (service-to-service)
│       ├── __init__.py
│       └── migrations.py        # Database migrations
├── services/
│   ├── auth/                    # Auth0 integration services
│   │   ├── __init__.py
│   │   ├── auth0_user_service.py
│   │   ├── auth0_org_service.py
│   │   └── auth0_role_service.py
│   ├── enterprises/
│   │   ├── __init__.py
│   │   ├── enterprise_service.py
│   │   ├── admin_service.py
│   │   ├── datasource_service.py
│   │   └── onboarding_service.py
│   ├── projects/
│   │   ├── __init__.py
│   │   ├── project_service.py
│   │   └── project_role_service.py
│   ├── storage/                 # S3 storage service
│   │   ├── __init__.py
│   │   └── s3_service.py
│   ├── mongo/                   # MongoDB services
│   │   ├── __init__.py
│   │   ├── patient_record_service.py
│   │   └── execution_record_service.py
│   └── messaging/               # Background task messaging (replaces Kafka)
│       ├── __init__.py
│       └── background_tasks.py
├── models/                      # SQLAlchemy models (PostgreSQL)
│   └── (will be created in next prompt)
├── models_mongo/                # MongoDB models (new folder)
│   └── (will be created in next prompt)
└── schemas/                     # Pydantic schemas
    └── (will be created in next prompt)
```

## Configuration Updates
Update `consolidated-backend/app/config/settings.py` to add:

1. MongoDB connection settings:
   - MONGO_URL
   - MONGO_DATABASE

2. AWS S3 settings:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_REGION
   - S3_BUCKET_NAME

3. Multi-tenant settings:
   - ENABLE_MULTI_TENANT = True
   - TENANT_HEADER_NAME = "org-id"

4. Kafka/Background task settings (optional):
   - ENABLE_BACKGROUND_TASKS = True

## Dependencies to Add
Update `consolidated-backend/requirements.txt` to include:
- motor (async MongoDB driver)
- boto3 (AWS S3)
- aioboto3 (async AWS)
- beanie (MongoDB ODM - optional)

## Environment File
Create `consolidated-backend/.env.example` with all required variables.

## Deliverables
1. Copied and restructured project
2. All empty __init__.py files created
3. Updated settings.py
4. Updated requirements.txt
5. .env.example file

Do NOT create the actual models, routes, or services yet - just the folder structure and configuration.
```

---

## Expected Output
- New `consolidated-backend/` folder with complete module structure
- Updated configuration for MongoDB, S3, and multi-tenancy
- Ready for models migration in the next step

## Next Step
After completing this prompt, proceed to [02-models-migration.md](02-models-migration.md)
