# Phase 1.5: Database Migrations

## Objective
Create Alembic migrations for all PostgreSQL models and set up MongoDB collections/indexes.

---

## Multi-Tenancy Strategy: Schema-Based Separation

Instead of separate databases per tenant, use **PostgreSQL schemas** for data isolation:

```
PostgreSQL Database: kolate_db
├── public (shared tables: enterprises, modules, trials, default_roles)
├── org_abc123 (tenant schema: users, projects, roles, permissions, etc.)
├── org_def456 (tenant schema: users, projects, roles, permissions, etc.)
└── org_xyz789 (tenant schema: users, projects, roles, permissions, etc.)
```

### Benefits
- Single database connection pool
- Simpler backup/maintenance
- Cross-tenant queries possible for admin
- Easy tenant provisioning (just create schema)

### Implementation
```python
# app/core/tenant.py
from sqlalchemy import text
from contextvars import ContextVar

current_tenant: ContextVar[str] = ContextVar("current_tenant", default="public")

async def set_tenant_schema(db: AsyncSession, org_id: str):
    """Set the search_path to tenant's schema"""
    schema_name = f"org_{org_id}"
    await db.execute(text(f"SET search_path TO {schema_name}, public"))

# Middleware to set tenant context
@app.middleware("http")
async def tenant_middleware(request: Request, call_next):
    org_id = request.headers.get("org-id")
    if org_id:
        current_tenant.set(org_id)
    response = await call_next(request)
    return response
```

---

## Prompt

```
Using the database-architect agent, create all database migrations for the consolidated backend.

## Prerequisites
- All models created in `consolidated-backend/app/models/`
- Alembic already configured in the template

## Tasks

### 1. Generate Initial Alembic Migration

Run the migration command to auto-generate based on models:

```bash
cd consolidated-backend
alembic revision --autogenerate -m "initial_schema_all_models"
```

Review the generated migration and ensure it includes:

### 2. PostgreSQL Tables to Create

#### Core Tables
```sql
-- enterprises table
CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500),
    domain VARCHAR(255),
    description TEXT,
    logo_url VARCHAR(500),
    admin_email VARCHAR(255) NOT NULL,
    zip_code VARCHAR(20),
    region VARCHAR(100),
    size VARCHAR(50),
    contact_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    auth0_user_id VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- enterprise_datasources table
CREATE TABLE enterprise_datasources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    datasource_name VARCHAR(255) NOT NULL,
    datasource_type VARCHAR(50) NOT NULL,
    connection_string TEXT NOT NULL,  -- Encrypted
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- enterprise_onboarding_progress table
CREATE TABLE enterprise_onboarding_progress (
    id SERIAL PRIMARY KEY,
    enterprise_id UUID UNIQUE NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL,
    progress_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- sso_tickets table
CREATE TABLE sso_tickets (
    id SERIAL PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    ticket VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- modules table
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- trials table
CREATE TABLE trials (
    id SERIAL PRIMARY KEY,
    module_id INTEGER NOT NULL REFERENCES modules(id),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- enterprise_module_access table
CREATE TABLE enterprise_module_access (
    id SERIAL PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES modules(id),
    trial_id INTEGER REFERENCES trials(id),
    access_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(enterprise_id, module_id)
);
```

#### User & Project Tables
```sql
-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id VARCHAR(128) UNIQUE NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    avatar_url VARCHAR(500),
    job_title VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- default_roles table
CREATE TABLE default_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- default_permissions table
CREATE TABLE default_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_role_id UUID NOT NULL REFERENCES default_roles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(128),
    updated_by VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- roles table (project-specific)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_role_id UUID REFERENCES default_roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- project_users table (junction)
CREATE TABLE project_users (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
```

#### Supporting Tables
```sql
-- user_bookmarks table
CREATE TABLE user_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bookmark_type VARCHAR(50) NOT NULL,
    bookmark_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    notification_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- trial_shares table
CREATE TABLE trial_shares (
    id SERIAL PRIMARY KEY,
    trial_id INTEGER NOT NULL REFERENCES trials(id),
    shared_with_user_id UUID NOT NULL,
    shared_by_user_id UUID NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 3. Create Indexes

Add these indexes to the migration:

```python
# In the Alembic migration file
def upgrade():
    # ... table creation ...

    # Indexes for frequent queries
    op.create_index('idx_enterprises_org_id', 'enterprises', ['organization_id'])
    op.create_index('idx_enterprises_domain', 'enterprises', ['domain'])
    op.create_index('idx_enterprises_status', 'enterprises', ['status'])
    op.create_index('idx_enterprises_admin_email', 'enterprises', ['admin_email'])

    op.create_index('idx_users_auth0_id', 'users', ['auth0_id'])
    op.create_index('idx_users_org_id', 'users', ['organization_id'])
    op.create_index('idx_users_org_email', 'users', ['organization_id', 'email'])

    op.create_index('idx_projects_org_id', 'projects', ['organization_id'])
    op.create_index('idx_projects_status', 'projects', ['status'])

    op.create_index('idx_project_users_project', 'project_users', ['project_id'])
    op.create_index('idx_project_users_user', 'project_users', ['user_id'])

    op.create_index('idx_notifications_user', 'notifications', ['user_id'])
    op.create_index('idx_notifications_read', 'notifications', ['user_id', 'read'])

    op.create_index('idx_sso_tickets_ticket', 'sso_tickets', ['ticket'])
    op.create_index('idx_sso_tickets_expires', 'sso_tickets', ['expires_at'])
```

### 4. Seed Default Data

Create a seed migration for default roles and permissions:

```bash
alembic revision -m "seed_default_roles_permissions"
```

```python
def upgrade():
    # Default roles
    default_roles = [
        {'id': 'uuid1', 'name': 'Admin', 'description': 'Full access to all features'},
        {'id': 'uuid2', 'name': 'Manager', 'description': 'Manage projects and users'},
        {'id': 'uuid3', 'name': 'Member', 'description': 'Basic access'},
        {'id': 'uuid4', 'name': 'Viewer', 'description': 'Read-only access'},
    ]

    op.bulk_insert(
        sa.table('default_roles',
            sa.column('id', sa.String),
            sa.column('name', sa.String),
            sa.column('description', sa.String),
        ),
        default_roles
    )

    # Default permissions for each role
    # ... add permissions
```

### 5. MongoDB Setup

Create a script to set up MongoDB collections and indexes:

```python
# consolidated-backend/scripts/setup_mongo.py

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def setup_mongodb():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["kolate_db"]

    # Create collections with validation
    await db.create_collection(
        "patient_records",
        validator={
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["organization_id", "patient_data", "created_at"],
                "properties": {
                    "organization_id": {"bsonType": "string"},
                    "patient_data": {"bsonType": "object"},
                    "metadata": {"bsonType": "object"},
                    "created_at": {"bsonType": "date"},
                    "updated_at": {"bsonType": "date"}
                }
            }
        }
    )

    await db.create_collection(
        "execution_records",
        validator={
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["organization_id", "execution_type", "status"],
                "properties": {
                    "organization_id": {"bsonType": "string"},
                    "execution_type": {"bsonType": "string"},
                    "execution_data": {"bsonType": "object"},
                    "status": {"bsonType": "string"},
                    "started_at": {"bsonType": "date"},
                    "completed_at": {"bsonType": "date"}
                }
            }
        }
    )

    # Create indexes
    patient_records = db["patient_records"]
    await patient_records.create_index("organization_id")
    await patient_records.create_index([("organization_id", 1), ("created_at", -1)])

    execution_records = db["execution_records"]
    await execution_records.create_index("organization_id")
    await execution_records.create_index([("organization_id", 1), ("status", 1)])
    await execution_records.create_index("started_at")

    print("MongoDB setup complete!")

if __name__ == "__main__":
    asyncio.run(setup_mongodb())
```

### 6. Data Migration Script (Optional)

If migrating existing data from the old databases:

```python
# consolidated-backend/scripts/migrate_data.py

"""
Data migration script to move data from old microservices databases
to the new consolidated database.

Run this AFTER:
1. Alembic migrations are complete
2. MongoDB is set up
3. Old databases are accessible

Usage:
    python scripts/migrate_data.py --source-db=old_db --target-db=new_db
"""

import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

async def migrate_enterprises():
    """Migrate enterprise data from enterprise-manager DB"""
    pass

async def migrate_users():
    """Migrate user data from postgres-database-manager DB"""
    pass

async def migrate_projects():
    """Migrate project data from postgres-database-manager DB"""
    pass

async def migrate_patient_records():
    """Migrate patient records from mongo-database-manager"""
    pass
```

---

## Migration Commands

```bash
# Navigate to backend
cd consolidated-backend

# Generate migration
alembic revision --autogenerate -m "initial_schema"

# Review the generated migration file
# Edit if necessary

# Apply migration
alembic upgrade head

# Check current version
alembic current

# Rollback if needed
alembic downgrade -1

# Setup MongoDB
python scripts/setup_mongo.py
```

---

## Deliverables
1. Initial Alembic migration with all PostgreSQL tables
2. Indexes for query optimization
3. Seed migration for default roles/permissions
4. MongoDB setup script with collections and indexes
5. (Optional) Data migration script

Verify all migrations can be applied and rolled back cleanly.
```

---

## Next Step
After completing this prompt, proceed to [06-testing-validation.md](06-testing-validation.md)
