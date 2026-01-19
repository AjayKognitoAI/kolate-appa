# Phase 1.4: Services Migration

## Objective
Migrate all business logic from Spring Boot services to FastAPI services, maintaining the same behavior and logic.

---

## Prompt

```
Using the python-pro and architect-review agents, migrate all business logic from Spring Boot services to FastAPI services.

## Source Analysis
Review the services in these locations:
- `existing-architecture-codebase/core-microservices/*/src/main/java/.../service/`
- `existing-architecture-codebase/default-microservices/*/src/main/java/.../service/`

## Target Location
Create services in `consolidated-backend/app/services/`

---

## Service Migration Strategy

### Pattern: Extend CRUDService
For entities with standard CRUD operations, extend the generic CRUDService:

```python
from app.services.crud_service import CRUDService
from app.models.enterprise import Enterprise
from app.schemas.enterprise import EnterpriseCreate, EnterpriseUpdate

class EnterpriseService(CRUDService[Enterprise, EnterpriseCreate, EnterpriseUpdate]):
    def __init__(self):
        super().__init__(
            model=Enterprise,
            cache_prefix="enterprises",
            searchable_fields=["name", "domain", "admin_email"],
            sortable_fields=["id", "name", "created_at", "status"],
        )

    # Add custom methods below
```

---

## Services to Create

### 1. Auth Services (`app/services/auth/`)

#### `auth0_user_service.py` - Auth0 User Management
```python
"""
Migrate from: auth-manager Auth0UserService

Key methods to implement:
- get_organization_members(org_id, page, size) -> PagedResponse
- get_organization_members_with_roles(org_id) -> List[MemberWithRoles]
- send_invitation(org_id, invitation_data) -> Invitation
- get_invitations(org_id) -> List[Invitation]
- delete_invitation(org_id, invitation_id) -> bool
- assign_roles_to_member(user_id, role_ids) -> User
- change_member_roles(user_id, role_ids) -> User
- remove_roles_from_member(user_id, role_ids) -> User
- block_user(user_id) -> User
- unblock_user(user_id) -> User

Dependencies:
- Auth0 Management API client (use auth0-python SDK)
- HTTP client for Auth0 API calls
"""

import httpx
from app.config.settings import settings

class Auth0UserService:
    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.client_id = settings.AUTH0_MGMT_CLIENT_ID
        self.client_secret = settings.AUTH0_MGMT_CLIENT_SECRET
        self._token = None

    async def _get_mgmt_token(self) -> str:
        """Get Auth0 Management API token"""
        # Implement token caching
        pass

    async def get_organization_members(self, org_id: str, page: int, size: int):
        """
        Original: Auth0 Organizations API - GET /api/v2/organizations/{id}/members
        """
        pass
```

#### `auth0_org_service.py` - Auth0 Organization Management
```python
"""
Migrate from: auth-manager Auth0OrganizationService

Key methods:
- create_organization(org_data) -> Organization
- get_organization_connections(org_id) -> List[Connection]
- delete_organization_connection(org_id, connection_id) -> bool
- enable_connection(org_id, connection_id) -> Connection
"""
```

#### `auth0_role_service.py` - Auth0 Role Management
```python
"""
Migrate from: auth-manager Auth0RoleService

Key methods:
- get_all_roles() -> List[Role]
- get_role(role_id) -> Role
- get_role_permissions(role_id) -> List[Permission]
"""
```

### 2. Enterprise Services (`app/services/enterprises/`)

#### `enterprise_service.py` - Enterprise Management
```python
"""
Migrate from: enterprise-manager EnterpriseService

Extend CRUDService and add custom methods:
- get_by_organization_id(org_id) -> Enterprise
- get_by_domain(domain) -> Enterprise
- get_by_admin_email(email) -> Enterprise
- get_by_status(status, pagination) -> PagedResponse
- search_enterprises(query, filters, pagination) -> PagedResponse
- update_status(id, status) -> Enterprise
- request_deletion(enterprise_id, reason) -> DeletionRequest
- check_domain_exists(domain) -> bool
- check_organization_exists(org_id) -> bool
- get_statistics() -> EnterpriseStats
- get_enterprise_projects(org_id) -> List[ProjectSummary]
- get_project_statistics(org_id) -> ProjectStats

Business Logic to preserve:
- Soft delete (set status to DELETED, don't remove)
- Domain uniqueness validation
- Organization ID uniqueness validation
- Cascade operations for admins/datasources
"""

class EnterpriseService(CRUDService[Enterprise, EnterpriseCreate, EnterpriseUpdate]):
    def __init__(self):
        super().__init__(
            model=Enterprise,
            cache_prefix="enterprises",
            searchable_fields=["name", "domain", "admin_email", "description"],
            sortable_fields=["id", "name", "created_at", "status"],
        )

    async def get_by_organization_id(self, db: AsyncSession, org_id: str) -> Optional[Enterprise]:
        result = await db.execute(
            select(Enterprise).where(Enterprise.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def check_domain_exists(self, db: AsyncSession, domain: str) -> bool:
        result = await db.execute(
            select(Enterprise.id).where(Enterprise.domain == domain)
        )
        return result.scalar_one_or_none() is not None

    # ... implement all methods
```

#### `admin_service.py` - Admin Management
```python
"""
Migrate from: enterprise-manager AdminService

Key methods:
- add_admin(enterprise_id, admin_data) -> Admin
- get_enterprise_admins(enterprise_id) -> List[Admin]
- remove_admin(enterprise_id, admin_id) -> bool
- get_admin_by_email(enterprise_id, email) -> Admin
"""
```

#### `datasource_service.py` - Datasource Configuration
```python
"""
Migrate from: enterprise-manager EnterpriseDatasourceService

Key methods:
- create_datasource(enterprise_id, data) -> Datasource
- get_enterprise_datasources(enterprise_id) -> List[Datasource]
- update_datasource(id, data) -> Datasource
- delete_datasource(id) -> bool
- test_connection(datasource_id) -> ConnectionTestResult

Security considerations:
- Encrypt connection strings before storing
- Never return raw connection strings in responses
- Validate connection string format
"""
```

#### `onboarding_service.py` - Onboarding Workflow
```python
"""
Migrate from: enterprise-manager EnterpriseOnboardProgressService

Key methods:
- get_progress(enterprise_id) -> OnboardingProgress
- update_progress(enterprise_id, step, data) -> OnboardingProgress
- complete_onboarding(enterprise_id) -> OnboardingProgress
- get_next_step(current_step) -> str

Business Logic:
- Step sequence validation
- Progress data validation per step
- Completion criteria check
"""
```

#### `module_access_service.py` - Module Access Control
```python
"""
Migrate from: enterprise-manager EnterpriseModuleAccessService

Key methods:
- get_enterprise_modules(enterprise_id) -> List[ModuleAccess]
- grant_module_access(enterprise_id, module_id, trial_id) -> ModuleAccess
- revoke_module_access(enterprise_id, access_id) -> bool
- check_module_access(enterprise_id, module_id) -> bool
"""
```

#### `sso_ticket_service.py` - SSO Ticket Management
```python
"""
Migrate from: enterprise-manager SsoTicketService

Key methods:
- create_ticket(enterprise_id, email) -> SsoTicket
- validate_ticket(ticket) -> SsoTicket
- delete_ticket(ticket) -> bool
- cleanup_expired_tickets() -> int

Business Logic:
- Ticket expiration (configurable TTL)
- One active ticket per email
- Secure random ticket generation
"""
```

### 3. Project Services (`app/services/projects/`)

#### `project_service.py` - Project Management
```python
"""
Migrate from: project-manager ProjectService + postgres-database-manager ProjectService

Extend CRUDService and add:
- search_projects(query, filters, pagination) -> PagedResponse
- get_user_projects(user_auth0_id) -> List[Project]
- get_user_projects_with_roles(user_auth0_id) -> List[ProjectWithRole]
- get_project_statistics(org_id) -> ProjectStats
- soft_delete(project_id) -> bool

Tenant-aware: All queries must filter by organization_id
"""

class ProjectService(CRUDService[Project, ProjectCreate, ProjectUpdate]):
    def __init__(self):
        super().__init__(
            model=Project,
            cache_prefix="projects",
            searchable_fields=["name", "description"],
            sortable_fields=["id", "name", "created_at", "status"],
        )

    async def get_all(self, db: AsyncSession, pagination: PaginationParams, org_id: str):
        """Override to add tenant filter"""
        query = select(Project).where(Project.organization_id == org_id)
        return await self._paginate(db, query, pagination)
```

#### `project_user_service.py` - User-Project Relationships
```python
"""
Migrate from: project-manager (user-project operations)

Key methods:
- add_user_to_project(project_id, user_auth0_id, role_id) -> ProjectUser
- remove_user_from_project(project_id, user_auth0_id) -> bool
- get_project_users(project_id) -> List[UserWithRole]
- get_user_role_in_project(project_id, user_auth0_id) -> Role
- check_user_in_project(project_id, user_auth0_id) -> bool
- update_user_role(project_id, user_auth0_id, role_id) -> ProjectUser
- get_user_projects_and_roles(user_auth0_id) -> List[ProjectUserRole]
"""
```

#### `project_role_service.py` - Project Role Management
```python
"""
Migrate from: project-manager (role operations)

Key methods:
- get_project_roles(project_id) -> List[Role]
- create_role(project_id, role_data) -> Role
- delete_role(project_id, role_id) -> bool
- move_users_and_delete_role(project_id, old_role_id, new_role_id) -> bool
- update_role_permissions(role_id, permissions) -> Role
- get_role_with_permissions(role_id) -> RoleWithPermissions
- create_default_roles_for_project(project_id) -> List[Role]

Business Logic:
- Cannot delete role with users (must move first)
- Default roles created on project creation
- Permission validation
"""
```

### 4. User Services (Extend `app/services/user_service.py`)

```python
"""
Migrate from: user-manager UserService + postgres-database-manager UserService

Add methods:
- create_user(user_data) -> User
- get_by_auth0_id(auth0_id) -> User
- invite_user(org_id, invite_data) -> User
- get_organization_users(org_id, pagination) -> PagedResponse
- get_all_users(pagination) -> PagedResponse (admin only)
- get_default_roles() -> List[DefaultRole]
- change_user_role(auth0_id, role_id) -> User
- block_user(auth0_id) -> User
- unblock_user(auth0_id) -> User
- search_users(query, org_id) -> List[User]
- get_user_count(org_id) -> int

Integration:
- Sync with Auth0 on create/update
- Send invitation email
"""
```

### 5. Storage Services (`app/services/storage/`)

#### `s3_service.py` - AWS S3 Operations
```python
"""
Migrate from: asset-manager S3Service

Key methods:
- upload_file(file, enterprise_id, path) -> S3UploadResult
- delete_file(key) -> bool
- delete_enterprise_folder(enterprise_id) -> bool
- get_presigned_url(key, expiration) -> str
- list_files(prefix) -> List[S3Object]

Use aioboto3 for async operations:
"""

import aioboto3
from app.config.settings import settings

class S3Service:
    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME
        self.region = settings.AWS_REGION

    async def upload_file(self, file: UploadFile, enterprise_id: str, path: str) -> S3UploadResult:
        session = aioboto3.Session()
        async with session.client('s3', region_name=self.region) as s3:
            key = f"{enterprise_id}/{path}/{file.filename}"
            await s3.upload_fileobj(file.file, self.bucket, key)
            return S3UploadResult(key=key, url=f"https://{self.bucket}.s3.amazonaws.com/{key}")
```

### 6. MongoDB Services (`app/services/mongo/`)

#### `patient_record_service.py` - Patient Records (MongoDB)
```python
"""
Migrate from: mongo-database-manager PatientRecordService

Key methods:
- create_record(org_id, data) -> PatientRecord
- get_record(record_id, org_id) -> PatientRecord
- get_all_records(org_id, pagination) -> PagedResponse
- update_record(record_id, org_id, data) -> PatientRecord
- delete_record(record_id, org_id) -> bool
- search_records(org_id, query) -> List[PatientRecord]
- bulk_create(org_id, records) -> List[PatientRecord]

Use Motor for async MongoDB:
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

class PatientRecordService:
    def __init__(self):
        self.client = AsyncIOMotorClient(settings.MONGO_URL)
        self.db = self.client[settings.MONGO_DATABASE]
        self.collection = self.db["patient_records"]

    async def create_record(self, org_id: str, data: dict) -> dict:
        record = {
            "organization_id": org_id,
            "patient_data": data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await self.collection.insert_one(record)
        record["_id"] = result.inserted_id
        return record
```

#### `execution_record_service.py` - Execution Records (MongoDB)
```python
"""
Migrate from: mongo-database-manager ExecutionRecordService

Key methods:
- create_execution(org_id, data) -> ExecutionRecord
- get_execution(id, org_id) -> ExecutionRecord
- update_execution(id, org_id, data) -> ExecutionRecord
- get_by_status(org_id, status) -> List[ExecutionRecord]
- get_all(org_id, pagination) -> PagedResponse
"""
```

### 7. Messaging Services (`app/services/messaging/`)

#### `background_tasks.py` - Background Task Processing
```python
"""
Replace Kafka message-publisher with FastAPI BackgroundTasks

For async operations like:
- Sending invitation emails
- Processing deletion requests
- Audit logging
- Notifications

Use FastAPI's built-in BackgroundTasks:
"""

from fastapi import BackgroundTasks

async def send_invitation_email(email: str, org_name: str, invite_link: str):
    """Background task to send invitation email"""
    # Use existing email service
    pass

async def process_deletion_request(enterprise_id: str, reason: str):
    """Background task to process enterprise deletion"""
    # Cleanup logic
    pass

# Usage in route:
@router.post("/invitations")
async def send_invitation(
    data: InvitationRequest,
    background_tasks: BackgroundTasks,
):
    # Create invitation
    invitation = await service.create_invitation(data)

    # Queue email sending
    background_tasks.add_task(
        send_invitation_email,
        data.email,
        data.org_name,
        invitation.link
    )

    return invitation
```

---

## Key Business Logic to Preserve

### 1. Multi-Tenancy
```python
# Every query must be tenant-aware
async def get_all(self, db: AsyncSession, org_id: str, pagination: PaginationParams):
    query = select(self.model).where(self.model.organization_id == org_id)
    return await self._paginate(db, query, pagination)
```

### 2. Soft Delete Pattern
```python
async def soft_delete(self, db: AsyncSession, id: str) -> bool:
    entity = await self.get_by_id(db, id)
    if entity:
        entity.status = Status.DELETED
        entity.updated_at = datetime.utcnow()
        await db.commit()
        return True
    return False
```

### 3. Audit Trail
```python
# Add to base model or mixin
created_by = Column(String, nullable=True)
updated_by = Column(String, nullable=True)

# Set in service
entity.created_by = current_user.id
entity.updated_by = current_user.id
```

### 4. Cache Invalidation
```python
async def update(self, db: AsyncSession, id: str, data: UpdateSchema) -> Model:
    result = await super().update(db, id, data)
    await self._invalidate_cache(f"{self.cache_prefix}:{id}")
    return result
```

---

## Deliverables
1. All service files created with proper structure
2. Business logic preserved from original services
3. Async/await pattern throughout
4. Proper error handling and validation
5. Cache integration where applicable
6. Background tasks for async operations

Ensure all service methods match the original behavior. Test each service independently.
```

---

## Next Step
After completing this prompt, proceed to [05-database-migrations.md](05-database-migrations.md)
