# Phase 1.2: Models Migration

## Objective
Migrate all database entities from Spring Boot microservices to SQLAlchemy (PostgreSQL) and Motor/Beanie (MongoDB) models.

---

## Prompt

```
Using the python-pro and database-architect agents, migrate all database models from the existing microservices to the consolidated FastAPI backend.

## Source Analysis
Review the entities in these locations:
- `existing-architecture-codebase/core-microservices/enterprise-manager/src/main/java/.../entity/`
- `existing-architecture-codebase/default-microservices/postgres-database-manager/src/main/java/.../entity/`
- `existing-architecture-codebase/default-microservices/mongo-database-manager/src/main/java/.../entity/`

## Target Location
Create models in `consolidated-backend/app/models/` (PostgreSQL) and `consolidated-backend/app/models_mongo/` (MongoDB)

---

## PostgreSQL Models to Create

### 1. Enterprise Domain (`app/models/enterprise.py`)
From enterprise-manager entities:

```python
# Enterprise model
- id: UUID (primary key)
- organization_id: String (Auth0 org reference, unique)
- name: String
- url: String (nullable)
- domain: String (nullable)
- description: Text (nullable)
- logo_url: String (nullable)
- admin_email: String
- zip_code: String (nullable)
- region: String (nullable)
- size: String (nullable)
- contact_number: String (nullable)
- status: Enum (ACTIVE, INACTIVE, SUSPENDED)
- created_at, updated_at: DateTime
- Relationships: admins (1:N), onboarding_progress (1:1), datasources (1:N)

# Admin model
- id: Integer (primary key)
- enterprise_id: UUID (foreign key)
- auth0_user_id: String
- email: String
- first_name: String
- last_name: String
- created_at, updated_at: DateTime

# EnterpriseDatasource model
- id: UUID (primary key)
- enterprise_id: UUID (foreign key)
- datasource_name: String
- datasource_type: String
- connection_string: String (encrypted)
- created_at, updated_at: DateTime

# EnterpriseOnboardingProgress model
- id: Integer (primary key)
- enterprise_id: UUID (foreign key, unique - 1:1)
- current_step: Enum (steps from original)
- progress_data: JSON
- created_at, updated_at: DateTime

# SsoTicket model
- id: Integer (primary key)
- enterprise_id: UUID (foreign key)
- ticket: String (unique)
- email: String
- expires_at: DateTime
- created_at: DateTime
```

### 2. Module & Trial Domain (`app/models/module.py`)
```python
# Module model
- id: Integer (primary key)
- name: String
- description: Text
- created_at, updated_at: DateTime

# Trial model
- id: Integer (primary key)
- module_id: Integer (foreign key)
- slug: String (unique)
- name: String
- icon_url: String (nullable)
- description: Text (nullable)
- created_at, updated_at: DateTime

# EnterpriseModuleAccess (junction table)
- id: Integer (primary key)
- enterprise_id: UUID (foreign key)
- module_id: Integer (foreign key)
- trial_id: Integer (foreign key, nullable)
- access_level: String
- created_at, updated_at: DateTime
```

### 3. User Domain (`app/models/user.py`) - Extend existing
Add these fields to existing User model or create new:
```python
# User model (tenant-aware)
- id: UUID (primary key, or use auth0_id as string PK)
- auth0_id: String (unique)
- organization_id: String (tenant identifier)
- first_name: String
- last_name: String
- email: String (unique within org)
- mobile: String (nullable)
- avatar_url: String (nullable)
- job_title: String (nullable)
- status: Enum (ACTIVE, INACTIVE, BLOCKED)
- created_at, updated_at: DateTime
- Relationships: project_users (1:N), bookmarks (1:N), notifications (1:N)
```

### 4. Project Domain (`app/models/project.py`)
```python
# Project model (tenant-aware)
- id: UUID (primary key)
- organization_id: String (tenant identifier)
- name: String
- description: Text (nullable)
- status: Enum (ACTIVE, ARCHIVED, DELETED)
- created_by: String (auth0_id)
- updated_by: String (auth0_id)
- created_at, updated_at: DateTime
- Relationships: project_users (1:N), roles (1:N)

# ProjectUser (junction table)
- id: Integer (primary key)
- project_id: UUID (foreign key)
- user_id: UUID (foreign key)
- role_id: UUID (foreign key)
- created_at, updated_at: DateTime

# Role model (project-specific)
- id: UUID (primary key)
- project_id: UUID (foreign key)
- name: String
- description: Text (nullable)
- default_role_id: UUID (foreign key, nullable)
- created_at, updated_at: DateTime
- Relationships: permissions (1:N), project_users (1:N)

# Permission model
- id: UUID (primary key)
- role_id: UUID (foreign key)
- name: String
- description: Text (nullable)
- created_at, updated_at: DateTime

# DefaultRole model
- id: UUID (primary key)
- name: String (unique)
- description: Text (nullable)
- Relationships: default_permissions (1:N)

# DefaultPermission model
- id: UUID (primary key)
- default_role_id: UUID (foreign key)
- name: String
- description: Text (nullable)
```

### 5. Supporting Models (`app/models/supporting.py`)
```python
# UserBookmark model
- id: Integer (primary key)
- user_id: UUID (foreign key)
- bookmark_type: String
- bookmark_data: JSON
- created_at, updated_at: DateTime

# Notification model
- id: Integer (primary key)
- user_id: UUID (foreign key)
- title: String
- message: Text
- read: Boolean (default False)
- notification_type: String
- metadata: JSON (nullable)
- created_at: DateTime

# TrialShare model
- id: Integer (primary key)
- trial_id: Integer (foreign key)
- shared_with_user_id: UUID
- shared_by_user_id: UUID
- access_type: String
- created_at, updated_at: DateTime
```

---

## MongoDB Models to Create

### 1. Patient Records (`app/models_mongo/patient_record.py`)
Using Motor or Beanie:
```python
# PatientRecord model
- record_id: ObjectId (primary key)
- organization_id: String (tenant identifier)
- patient_data: Dict[str, Any]  # Flexible schema
- metadata: Dict[str, Any] (nullable)
- created_at, updated_at: DateTime

# ExecutionRecord model
- id: ObjectId (primary key)
- organization_id: String (tenant identifier)
- execution_type: String
- execution_data: Dict[str, Any]
- status: String
- started_at: DateTime
- completed_at: DateTime (nullable)
- created_at, updated_at: DateTime
```

---

## Model Patterns to Follow

### 1. Use BaseModel from template
```python
from app.models.base import BaseModel, BaseModelWithStringId, TimestampMixin
```

### 2. Add tenant-awareness where needed
```python
organization_id = Column(String(64), nullable=False, index=True)
```

### 3. Use proper relationship patterns
```python
# One-to-Many
children = relationship("Child", back_populates="parent", cascade="all, delete-orphan")

# Many-to-One
parent_id = Column(UUID, ForeignKey("parents.id"))
parent = relationship("Parent", back_populates="children")
```

### 4. Add indexes for frequently queried fields
```python
__table_args__ = (
    Index('idx_user_org_email', 'organization_id', 'email'),
)
```

---

## Update models/__init__.py
Register all new models:
```python
from .enterprise import Enterprise, Admin, EnterpriseDatasource, EnterpriseOnboardingProgress, SsoTicket
from .module import Module, Trial, EnterpriseModuleAccess
from .user import User
from .project import Project, ProjectUser, Role, Permission, DefaultRole, DefaultPermission
from .supporting import UserBookmark, Notification, TrialShare
```

---

## Deliverables
1. All PostgreSQL models in `app/models/`
2. All MongoDB models in `app/models_mongo/`
3. Updated `app/models/__init__.py`
4. Proper relationships, indexes, and constraints
5. Enum classes for status fields

Ensure all models match the original entity structure while following Python/SQLAlchemy conventions (snake_case).
```

---

## Key Mappings Reference

| Java Entity | Python Model |
|-------------|--------------|
| `Long id` | `id = Column(Integer, primary_key=True)` |
| `UUID id` | `id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)` |
| `String` | `Column(String(length))` |
| `@Enumerated` | `Column(Enum(MyEnum))` |
| `@OneToMany` | `relationship("Child", back_populates="parent")` |
| `@ManyToOne` | `Column(ForeignKey("table.id"))` + `relationship()` |
| `LocalDateTime` | `Column(DateTime)` |
| `@CreatedDate` | Use `TimestampMixin` from base |

## Next Step
After completing this prompt, proceed to [03-routes-migration.md](03-routes-migration.md)
