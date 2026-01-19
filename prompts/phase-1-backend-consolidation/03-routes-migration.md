# Phase 1.3: Routes Migration

## Objective
Create FastAPI routes that match all existing Spring Boot microservice endpoints, using the generic CRUDRouter pattern from the template.

---

## Prompt

```
Using the python-pro agent, migrate all API routes from the existing microservices to FastAPI routes in the consolidated backend.

## Source Analysis
Review the controllers in these locations:
- `existing-architecture-codebase/core-microservices/auth-manager/src/main/java/.../controller/`
- `existing-architecture-codebase/core-microservices/enterprise-manager/src/main/java/.../controller/`
- `existing-architecture-codebase/core-microservices/project-manager/src/main/java/.../controller/`
- `existing-architecture-codebase/core-microservices/user-manager/src/main/java/.../controller/`
- `existing-architecture-codebase/core-microservices/asset-manager/src/main/java/.../controller/`
- `existing-architecture-codebase/default-microservices/postgres-database-manager/src/main/java/.../controller/`
- `existing-architecture-codebase/default-microservices/mongo-database-manager/src/main/java/.../controller/`

## Target Location
Create routes in `consolidated-backend/app/routes/`

---

## Route Mapping Strategy

### Base Path Changes
| Original Service | Original Base Path | New Base Path |
|------------------|-------------------|---------------|
| auth-manager | `/api/auth-manager/v1/` | `/api/v1/auth/` |
| enterprise-manager | `/api/enterprise-manager/v1/` | `/api/v1/enterprises/` |
| project-manager | `/api/project-manager/v1/` | `/api/v1/projects/` |
| user-manager | `/api/user-manager/v1/` | `/api/v1/users/` |
| asset-manager | `/api/asset-manager/v1/` | `/api/v1/assets/` |
| postgres-db-manager | `/internal/postgres-database-manager/v1/` | `/api/v1/` (merged into main routes) |
| mongo-db-manager | Internal | `/api/v1/patient-records/` |

---

## Routes to Create

### 1. Auth Routes (`app/routes/auth/`)

#### `users.py` - Auth0 User Management
```python
# From auth-manager UserController
GET  /api/v1/auth/organizations/{org_id}/members          # Get org members (paginated)
GET  /api/v1/auth/organizations/{org_id}/members/all      # Get all members
GET  /api/v1/auth/organizations/{org_id}/members/with-roles  # Members with roles
POST /api/v1/auth/organizations/{org_id}/invitations      # Send invitation
GET  /api/v1/auth/organizations/{org_id}/invitations      # Get invitations
GET  /api/v1/auth/organizations/{org_id}/invitations/{id} # Get specific invitation
DELETE /api/v1/auth/organizations/{org_id}/invitations/{id} # Delete invitation
POST /api/v1/auth/roles                                   # Assign roles
PUT  /api/v1/auth/roles                                   # Change roles
DELETE /api/v1/auth/roles                                 # Remove roles
PUT  /api/v1/auth/user                                    # Block/unblock user
```

#### `organizations.py` - Auth0 Organization Management
```python
# From auth-manager OrganizationController
POST /api/v1/auth/organizations                           # Create organization
GET  /api/v1/auth/organizations/{org_id}/connections      # Get connections
DELETE /api/v1/auth/organizations/{org_id}/connection     # Delete connection
```

#### `roles.py` - Auth0 Role Management
```python
GET /api/v1/auth/roles                                    # Get all Auth0 roles
```

### 2. Enterprise Routes (`app/routes/enterprises/`)

#### `enterprises.py` - Using CRUDRouter + Custom Endpoints
```python
# Standard CRUD (use CRUDRouter)
POST /api/v1/enterprises                                  # Create
GET  /api/v1/enterprises/{id}                             # Get by ID
GET  /api/v1/enterprises                                  # Get all (paginated)
PUT  /api/v1/enterprises/{id}                             # Update
DELETE /api/v1/enterprises/{id}                           # Soft delete

# Custom endpoints (add to router)
GET  /api/v1/enterprises/organization/{org_id}            # Get by organization ID
GET  /api/v1/enterprises/domain/{domain}                  # Get by domain
GET  /api/v1/enterprises/admin/{admin_email}              # Get by admin email
GET  /api/v1/enterprises/status/{status}                  # Get by status
GET  /api/v1/enterprises/search                           # Search enterprises
PATCH /api/v1/enterprises/{id}/status                     # Update status only
POST /api/v1/enterprises/delete-request                   # Request deletion
GET  /api/v1/enterprises/check/domain                     # Check domain exists
GET  /api/v1/enterprises/check/organization               # Check org exists
GET  /api/v1/enterprises/stats                            # Get statistics
GET  /api/v1/enterprises/{org_id}/projects                # Get enterprise projects
GET  /api/v1/enterprises/{org_id}/projects/statistics     # Project statistics
```

#### `admins.py` - Admin Management
```python
POST /api/v1/enterprises/{enterprise_id}/admins           # Add admin
GET  /api/v1/enterprises/{enterprise_id}/admins           # Get admins
DELETE /api/v1/enterprises/{enterprise_id}/admins/{id}    # Remove admin
```

#### `datasources.py` - Datasource Configuration
```python
POST /api/v1/enterprises/{enterprise_id}/datasources      # Create datasource
GET  /api/v1/enterprises/{enterprise_id}/datasources      # Get datasources
PUT  /api/v1/enterprises/{enterprise_id}/datasources/{id} # Update
DELETE /api/v1/enterprises/{enterprise_id}/datasources/{id} # Delete
```

#### `onboarding.py` - Onboarding Workflow
```python
GET  /api/v1/enterprises/{enterprise_id}/onboarding       # Get progress
PUT  /api/v1/enterprises/{enterprise_id}/onboarding       # Update progress
POST /api/v1/enterprises/{enterprise_id}/onboarding/complete # Complete onboarding
```

#### `modules.py` - Module Access
```python
GET  /api/v1/enterprises/{enterprise_id}/modules          # Get module access
POST /api/v1/enterprises/{enterprise_id}/modules          # Grant access
DELETE /api/v1/enterprises/{enterprise_id}/modules/{id}   # Revoke access
```

#### `trials.py` - Trial Management
```python
GET  /api/v1/trials                                       # Get all trials
GET  /api/v1/trials/{id}                                  # Get trial by ID
POST /api/v1/trials                                       # Create trial
```

#### `sso_tickets.py` - SSO Ticket Management
```python
POST /api/v1/enterprises/{enterprise_id}/sso-tickets      # Create ticket
GET  /api/v1/enterprises/{enterprise_id}/sso-tickets/{ticket} # Validate ticket
DELETE /api/v1/enterprises/{enterprise_id}/sso-tickets/{ticket} # Delete ticket
```

### 3. Project Routes (`app/routes/projects/`)

#### `projects.py` - Using CRUDRouter + Custom Endpoints
```python
# Standard CRUD (use CRUDRouter)
POST /api/v1/projects                                     # Create
GET  /api/v1/projects/{id}                                # Get by ID
GET  /api/v1/projects                                     # Get all (paginated)
PUT  /api/v1/projects/{id}                                # Update
DELETE /api/v1/projects/{id}                              # Delete

# Custom endpoints
GET  /api/v1/projects/search                              # Search projects
GET  /api/v1/projects/user/{user_auth0_id}                # Get user's projects
GET  /api/v1/projects/user/{user_auth0_id}/roles-permissions # Projects with roles
GET  /api/v1/projects/statistics                          # Project statistics
```

#### `project_users.py` - User-Project Relationships
```python
POST /api/v1/projects/{project_id}/users                  # Add user to project
DELETE /api/v1/projects/{project_id}/users/{user_auth0_id} # Remove user
GET  /api/v1/projects/{project_id}/users                  # Get project users
GET  /api/v1/projects/{project_id}/users/{user_auth0_id}/role # Get user's role
GET  /api/v1/projects/{project_id}/users/{user_auth0_id}/exists # Check membership
PUT  /api/v1/projects/{project_id}/users/{user_auth0_id}/role # Update user's role
```

#### `project_roles.py` - Project Role Management
```python
GET  /api/v1/projects/{project_id}/roles                  # Get all roles
POST /api/v1/projects/{project_id}/roles                  # Create role
DELETE /api/v1/projects/{project_id}/roles/{role_id}      # Delete role
DELETE /api/v1/projects/{project_id}/roles/{old_id}/move/{new_id} # Move & delete
PUT  /api/v1/projects/roles/{role_id}/permissions         # Update permissions
GET  /api/v1/projects/roles/{role_id}                     # Get role with permissions
```

### 4. User Routes (Extend Existing `app/routes/users.py`)
```python
# Add these endpoints to existing users router
POST /api/v1/users                                        # Create user
GET  /api/v1/users/me                                     # Get current user
POST /api/v1/users/invite                                 # Invite user
GET  /api/v1/users/organization/{org_id}                  # Get org users (paginated)
GET  /api/v1/users                                        # Get all users (paginated)
GET  /api/v1/users/roles                                  # Get default roles
PUT  /api/v1/users/roles                                  # Change user role
PATCH /api/v1/users/{auth0_id}/status                     # Block/unblock
GET  /api/v1/users/search                                 # Search users
GET  /api/v1/users/count                                  # Get count
```

### 5. Asset Routes (`app/routes/assets/`)

#### `uploads.py` - File Upload Management
```python
POST /api/v1/assets/upload                                # Upload file to S3
DELETE /api/v1/assets/folder/{enterprise_id}              # Delete enterprise folder
GET  /api/v1/assets/{asset_id}                            # Get asset URL
DELETE /api/v1/assets/{asset_id}                          # Delete asset
```

### 6. Patient Record Routes (`app/routes/patient_records/`)

#### `records.py` - Patient Record Management (MongoDB)
```python
POST /api/v1/patient-records                              # Create record
GET  /api/v1/patient-records/{record_id}                  # Get by ID
GET  /api/v1/patient-records                              # Get all (paginated)
PUT  /api/v1/patient-records/{record_id}                  # Update
DELETE /api/v1/patient-records/{record_id}                # Delete
POST /api/v1/patient-records/search                       # Search records
POST /api/v1/patient-records/bulk                         # Bulk create
```

#### `executions.py` - Execution Record Management (MongoDB)
```python
POST /api/v1/executions                                   # Create execution
GET  /api/v1/executions/{id}                              # Get by ID
GET  /api/v1/executions                                   # Get all (paginated)
PUT  /api/v1/executions/{id}                              # Update
GET  /api/v1/executions/status/{status}                   # Get by status
```

### 7. Supporting Routes

#### `bookmarks.py` - User Bookmarks
```python
POST /api/v1/bookmarks                                    # Create bookmark
GET  /api/v1/bookmarks                                    # Get user's bookmarks
DELETE /api/v1/bookmarks/{id}                             # Delete bookmark
```

#### `notifications.py` - User Notifications
```python
GET  /api/v1/notifications                                # Get user's notifications
PUT  /api/v1/notifications/{id}/read                      # Mark as read
PUT  /api/v1/notifications/read-all                       # Mark all as read
DELETE /api/v1/notifications/{id}                         # Delete notification
```

---

## Implementation Pattern

### Using CRUDRouter (for standard entities)
```python
# app/routes/enterprises/enterprises.py
from fastapi import APIRouter, Depends
from app.routes.crud_router import CRUDRouter
from app.services.enterprises.enterprise_service import EnterpriseService
from app.schemas.enterprise import EnterpriseCreate, EnterpriseUpdate, EnterpriseResponse

# Create CRUD router
crud_router = CRUDRouter(
    service_class=EnterpriseService,
    schema=EnterpriseResponse,
    create_schema=EnterpriseCreate,
    update_schema=EnterpriseUpdate,
    prefix="",
    tags=["enterprises"],
    resource_name="enterprises",
    id_type="str",  # UUID
)

router = crud_router.get_router()

# Add custom endpoints
@router.get("/organization/{org_id}", response_model=EnterpriseResponse)
async def get_by_organization(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    service = EnterpriseService()
    return await service.get_by_organization_id(db, org_id)
```

### Custom Routes (for Auth0 integration)
```python
# app/routes/auth/users.py
from fastapi import APIRouter, Depends, HTTPException
from app.services.auth.auth0_user_service import Auth0UserService
from app.core.permissions import get_current_user, has_permissions

router = APIRouter()

@router.get("/organizations/{org_id}/members")
async def get_org_members(
    org_id: str,
    page: int = 1,
    size: int = 10,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:members:read")),
):
    service = Auth0UserService()
    return await service.get_organization_members(org_id, page, size)
```

---

## Route Registration

Update `app/routes/__init__.py`:
```python
from fastapi import APIRouter

# Import all routers
from .auth.users import router as auth_users_router
from .auth.organizations import router as auth_orgs_router
from .auth.roles import router as auth_roles_router
from .enterprises.enterprises import router as enterprises_router
from .enterprises.admins import router as enterprise_admins_router
# ... etc

api_router = APIRouter()

# Register routes
api_router.include_router(auth_users_router, prefix="/auth", tags=["auth"])
api_router.include_router(auth_orgs_router, prefix="/auth/organizations", tags=["auth"])
api_router.include_router(auth_roles_router, prefix="/auth/roles", tags=["auth"])
api_router.include_router(enterprises_router, prefix="/enterprises", tags=["enterprises"])
api_router.include_router(enterprise_admins_router, prefix="/enterprises", tags=["enterprise-admins"])
# ... etc
```

---

## Request/Response Compatibility

### Headers to Handle
- `org-id`: Tenant identifier (extract to set tenant context)
- `user-id`: Auth0 user ID (from JWT)
- `Authorization`: Bearer token

### Response Format
Match the original `GlobalResponse` wrapper:
```python
# app/schemas/response.py
class GlobalResponse(CamelModel, Generic[T]):
    state: str = "success"
    status: int = 200
    message: str = "OK"
    data: Optional[T] = None

# Usage in routes
@router.get("/enterprises/{id}")
async def get_enterprise(id: str, ...) -> GlobalResponse[EnterpriseResponse]:
    enterprise = await service.get_by_id(db, id)
    return GlobalResponse(data=EnterpriseResponse.model_validate(enterprise))
```

---

## Deliverables
1. All route files created in appropriate folders
2. Routes registered in `app/routes/__init__.py`
3. Proper permission decorators on all endpoints
4. Request/response schemas matching original DTOs
5. Tenant context middleware for org-id header

Create all routes but leave service method implementations for the next prompt.
```

---

## Next Step
After completing this prompt, proceed to [04-services-migration.md](04-services-migration.md)
