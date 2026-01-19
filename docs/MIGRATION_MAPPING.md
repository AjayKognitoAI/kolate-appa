# Migration Mapping Document

## Spring Boot Microservices → Consolidated FastAPI Backend

**Created**: Phase 0.3 of Migration Project
**Purpose**: Comprehensive blueprint for migrating 13 Spring Boot microservices to a single FastAPI backend

---

## Table of Contents

1. [Entity Migration Mapping](#1-entity-migration-mapping)
2. [Endpoint Migration Mapping](#2-endpoint-migration-mapping)
3. [Service Migration Mapping](#3-service-migration-mapping)
4. [Configuration Mapping](#4-configuration-mapping)
5. [Components Not Migrated](#5-components-not-migrated)
6. [Multi-Tenancy Implementation](#6-multi-tenancy-implementation)
7. [Migration Complexity Assessment](#7-migration-complexity-assessment)
8. [Risk Areas & Mitigation](#8-risk-areas--mitigation)
9. [Migration Checklist](#9-migration-checklist)

---

## 1. Entity Migration Mapping

### 1.1 From enterprise-manager → `app/models/enterprise/`

| Original Entity (Java) | New Model (Python) | File | Notes |
|------------------------|-------------------|------|-------|
| Enterprise | Enterprise | `enterprise.py` | UUID id, add org_id index, status enum |
| Admin | Admin | `admin.py` | ManyToOne relationship to Enterprise |
| Module | Module | `module.py` | is_standalone boolean flag |
| Trial | Trial | `trial.py` | slug field for URL, icon_url for display |
| EnterpriseModuleAccess | EnterpriseModuleAccess | `access.py` | Junction table with trial_id FK |
| EnterpriseDatasource | EnterpriseDatasource | `datasource.py` | Encrypt connection_string field |
| EnterpriseOnboardingProgress | EnterpriseOnboardingProgress | `onboarding.py` | step enum, progress JSON |

### 1.2 From postgres-database-manager → `app/models/tenant/`

| Original Entity (Java) | New Model (Python) | File | Notes |
|------------------------|-------------------|------|-------|
| User | User | `user.py` | Extend template's User, add auth0_id, org_id |
| Project | Project | `project.py` | status enum (ACTIVE/COMPLETED) |
| ProjectUser | ProjectUser | `project.py` | Composite PK (project_id, user_auth0_id) |
| Role | ProjectRole | `role.py` | Project-specific roles with FK to Project |
| Permission | ProjectPermission | `role.py` | module enum, access_type enum |
| DefaultRole | DefaultRole | `role.py` | System template roles (ADMIN/MANAGER/ANALYST/MEMBER) |
| DefaultPermission | DefaultPermission | `role.py` | Template permissions for default roles |
| Notification | Notification | `notification.py` | JSONB data column, status enum |
| TrialShare | TrialShare | `sharing.py` | recipients as Array type |
| UserBookmark | UserBookmark | `bookmark.py` | execution_id reference |

### 1.3 From mongo-database-manager → `app/models_mongo/`

| Original Entity (Java) | New Model (Python) | File | Notes |
|------------------------|-------------------|------|-------|
| PatientRecord | PatientRecord | `patient_record.py` | Use Motor/Beanie, flexible patientData dict |
| ExecutionRecord | ExecutionRecord | `execution_record.py` | basePrediction as List[Dict], timestamps |
| User (Mongo) | UserMongo | `user_mongo.py` | Optional: sync with Postgres User |

### 1.4 Model File Structure

```
app/models/
├── __init__.py                    # Export all models
├── base.py                        # BaseModel, BaseModelWithStringId (from template)
│
├── enterprise/                    # Public schema models
│   ├── __init__.py
│   ├── enterprise.py              # Enterprise
│   ├── admin.py                   # Admin
│   ├── module.py                  # Module
│   ├── trial.py                   # Trial
│   ├── access.py                  # EnterpriseModuleAccess
│   ├── datasource.py              # EnterpriseDatasource
│   └── onboarding.py              # EnterpriseOnboardingProgress
│
├── tenant/                        # Tenant schema models
│   ├── __init__.py
│   ├── user.py                    # User (tenant-specific)
│   ├── project.py                 # Project, ProjectUser
│   ├── role.py                    # ProjectRole, ProjectPermission, DefaultRole
│   ├── notification.py            # Notification
│   ├── sharing.py                 # TrialShare
│   └── bookmark.py                # UserBookmark
│
└── mongo/                         # MongoDB document models
    ├── __init__.py
    ├── patient_record.py          # PatientRecord
    └── execution_record.py        # ExecutionRecord
```

---

## 2. Endpoint Migration Mapping

### 2.1 Auth Routes (Auth0 Integration)
**From**: `auth-manager` → **To**: `app/routes/auth/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/auth-manager/v1/organizations` | `/api/v1/auth/organizations` | POST | No | Auth0OrgService.create |
| `/api/auth-manager/v1/organization/{org_id}/connections` | `/api/v1/auth/organizations/{org_id}/connections` | GET | No | Auth0OrgService.get_connections |
| `/api/auth-manager/v1/organization/{org_id}/connection` | `/api/v1/auth/organizations/{org_id}/connections` | DELETE | No | Auth0OrgService.delete_connection |
| `/api/auth-manager/v1/roles` | `/api/v1/auth/roles` | GET | No | Auth0RoleService.get_all |
| `/api/auth-manager/v1/user/organizations/{org_id}/members` | `/api/v1/auth/organizations/{org_id}/members` | GET | No | Auth0UserService.get_members |
| `/api/auth-manager/v1/user/organizations/{org_id}/members/with-roles` | `/api/v1/auth/organizations/{org_id}/members/with-roles` | GET | No | Auth0UserService.get_members_with_roles |
| `/api/auth-manager/v1/user/organizations/{org_id}/members/all` | `/api/v1/auth/organizations/{org_id}/members/all` | GET | No | Auth0UserService.get_all_members |
| `/api/auth-manager/v1/user/organizations/{org_id}/invitations` | `/api/v1/auth/organizations/{org_id}/invitations` | POST | No | Auth0UserService.send_invitation |
| `/api/auth-manager/v1/user/organizations/{org_id}/invitations` | `/api/v1/auth/organizations/{org_id}/invitations` | GET | No | Auth0UserService.get_invitations |
| `/api/auth-manager/v1/user/organizations/{org_id}/invitations/{id}` | `/api/v1/auth/organizations/{org_id}/invitations/{id}` | GET | No | Auth0UserService.get_invitation |
| `/api/auth-manager/v1/user/organizations/{org_id}/invitations/{id}` | `/api/v1/auth/organizations/{org_id}/invitations/{id}` | DELETE | No | Auth0UserService.delete_invitation |
| `/api/auth-manager/v1/user/roles` | `/api/v1/auth/users/roles` | POST | No | Auth0UserService.assign_roles |
| `/api/auth-manager/v1/user/roles` | `/api/v1/auth/users/roles` | PUT | No | Auth0UserService.change_roles |
| `/api/auth-manager/v1/user/roles` | `/api/v1/auth/users/roles` | DELETE | No | Auth0UserService.remove_roles |
| `/api/auth-manager/v1/user?action=block` | `/api/v1/auth/users/block` | PUT | No | Auth0UserService.block_user |
| `/api/auth-manager/v1/user?action=unblock` | `/api/v1/auth/users/unblock` | PUT | No | Auth0UserService.unblock_user |
| `/api/auth-manager/v1/self-service-profiles/{id}/sso-ticket` | `/api/v1/auth/sso-ticket/{profile_id}` | POST | No | Auth0SsoService.create_ticket |
| `/api/auth-manager/v1/self-service-profiles/sso-ticket` | `/api/v1/auth/sso-ticket` | POST | No | Auth0SsoService.create_ticket_default |

### 2.2 Enterprise Routes
**From**: `enterprise-manager` → **To**: `app/routes/enterprises/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/enterprise-manager/v1/enterprises` | `/api/v1/enterprises` | POST | Yes | EnterpriseService.create |
| `/api/enterprise-manager/v1/enterprises` | `/api/v1/enterprises` | GET | Yes | EnterpriseService.get_all |
| `/api/enterprise-manager/v1/enterprises/{id}` | `/api/v1/enterprises/{id}` | GET | Yes | EnterpriseService.get_by_id |
| `/api/enterprise-manager/v1/enterprises/{id}` | `/api/v1/enterprises/{id}` | PUT | Yes | EnterpriseService.update |
| `/api/enterprise-manager/v1/enterprises/{id}` | `/api/v1/enterprises/{id}` | DELETE | Yes | EnterpriseService.delete |
| `/api/enterprise-manager/v1/enterprises/{org_id}/organization` | `/api/v1/enterprises/organization/{org_id}` | GET | Custom | EnterpriseService.get_by_org |
| `/api/enterprise-manager/v1/enterprises/{org_id}/organization` | `/api/v1/enterprises/organization/{org_id}` | PUT | Custom | EnterpriseService.update_by_org |
| `/api/enterprise-manager/v1/enterprises/domain/{domain}` | `/api/v1/enterprises/domain/{domain}` | GET | Custom | EnterpriseService.get_by_domain |
| `/api/enterprise-manager/v1/enterprises/admin/{email}` | `/api/v1/enterprises/admin/{email}` | GET | Custom | EnterpriseService.get_by_admin |
| `/api/enterprise-manager/v1/enterprises/status/{status}` | `/api/v1/enterprises/status/{status}` | GET | Custom | EnterpriseService.get_by_status |
| `/api/enterprise-manager/v1/enterprises/search` | `/api/v1/enterprises/search` | GET | Yes (search) | EnterpriseService.search |
| `/api/enterprise-manager/v1/enterprises/{id}/status` | `/api/v1/enterprises/{id}/status` | PATCH | Custom | EnterpriseService.update_status |
| `/api/enterprise-manager/v1/enterprises/stats` | `/api/v1/enterprises/stats` | GET | Custom | EnterpriseService.get_stats |
| `/api/enterprise-manager/v1/enterprises/{org_id}/projects` | `/api/v1/enterprises/{org_id}/projects` | GET | Custom | EnterpriseService.get_projects |
| `/api/enterprise-manager/v1/enterprises/{org_id}/projects/statistics` | `/api/v1/enterprises/{org_id}/projects/statistics` | GET | Custom | EnterpriseService.get_project_stats |
| `/api/enterprise-manager/v1/check/domain` | `/api/v1/enterprises/check/domain` | GET | Custom | EnterpriseService.check_domain |
| `/api/enterprise-manager/v1/enterprises/check/organization` | `/api/v1/enterprises/check/organization` | GET | Custom | EnterpriseService.check_org |

### 2.3 Enterprise Onboarding Routes (External/Public)
**From**: `enterprise-manager` → **To**: `app/routes/onboarding/`

| Original Endpoint | New Endpoint | Method | Auth Required | Handler |
|-------------------|--------------|--------|---------------|---------|
| `/api/enterprise-manager/v1/organization/invite` | `/api/v1/onboarding/invite` | POST | Yes | OnboardingService.invite |
| `/api/enterprise-manager/v1/organization/re-invite` | `/api/v1/onboarding/re-invite` | POST | Yes | OnboardingService.reinvite |
| `/external/enterprise-manager/v1/organization/onboard` | `/api/v1/external/onboarding` | POST | No (Public) | OnboardingService.onboard |
| `/external/enterprise-manager/v1/organization/connection/hook` | `/api/v1/external/webhooks/connection` | POST | Webhook Auth | WebhookService.connection_hook |

### 2.4 Trial Routes
**From**: `enterprise-manager` → **To**: `app/routes/trials/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/enterprise-manager/v1/trials` | `/api/v1/trials` | POST | Yes | TrialService.create |
| `/api/enterprise-manager/v1/trials` | `/api/v1/trials` | PUT | Custom | TrialService.update |
| `/api/enterprise-manager/v1/trials/{id}` | `/api/v1/trials/{id}` | GET | Yes | TrialService.get_by_id |
| `/api/enterprise-manager/v1/trials/slug/{slug}` | `/api/v1/trials/slug/{slug}` | GET | Custom | TrialService.get_by_slug |
| `/api/enterprise-manager/v1/trials` | `/api/v1/trials` | GET | Yes | TrialService.get_all |
| `/api/enterprise-manager/v1/trials/module/{module_id}` | `/api/v1/trials/module/{module_id}` | GET | Custom | TrialService.get_by_module |
| `/api/enterprise-manager/v1/trials/{id}` | `/api/v1/trials/{id}` | DELETE | Yes | TrialService.delete |
| `/api/enterprise-manager/v1/trials/exists/slug/{slug}` | `/api/v1/trials/check/slug/{slug}` | GET | Custom | TrialService.check_slug |

### 2.5 Enterprise Access Routes
**From**: `enterprise-manager` → **To**: `app/routes/enterprise_access/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/enterprise-manager/v1/enterprise-access` | `/api/v1/enterprise-access` | POST | Custom | AccessService.manage_access |
| `/api/enterprise-manager/v1/enterprise-access/organization/{org_id}` | `/api/v1/enterprise-access/organization/{org_id}` | GET | Custom | AccessService.get_by_org |
| `/api/enterprise-manager/v1/enterprise-access/full/{enterprise_id}` | `/api/v1/enterprise-access/enterprise/{enterprise_id}` | GET | Custom | AccessService.get_full_access |

### 2.6 Project Routes
**From**: `project-manager` + `postgres-database-manager` → **To**: `app/routes/projects/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/project-manager/v1/project` | `/api/v1/projects` | POST | Yes | ProjectService.create |
| `/api/project-manager/v1/project/{id}` | `/api/v1/projects/{id}` | PUT | Yes | ProjectService.update |
| `/api/project-manager/v1/project/{id}` | `/api/v1/projects/{id}` | GET | Yes | ProjectService.get_by_id |
| `/api/project-manager/v1/project/{id}` | `/api/v1/projects/{id}` | DELETE | Yes | ProjectService.delete |
| `/api/project-manager/v1/projects` | `/api/v1/projects` | GET | Yes | ProjectService.get_all |
| `/api/project-manager/v1/projects/statistics` | `/api/v1/projects/statistics` | GET | Custom | ProjectService.get_stats |
| Internal: `/v1/project/{id}/users` | `/api/v1/projects/{id}/users` | GET | Custom | ProjectUserService.get_users |
| Internal: `/v1/project/{id}/users` | `/api/v1/projects/{id}/users` | POST | Custom | ProjectUserService.add_user |
| Internal: `/v1/project/{id}/users/{auth0_id}` | `/api/v1/projects/{id}/users/{auth0_id}` | DELETE | Custom | ProjectUserService.remove_user |
| Internal: `/v1/project/{id}/roles` | `/api/v1/projects/{id}/roles` | GET | Custom | ProjectRoleService.get_roles |
| Internal: `/v1/project/{id}/role` | `/api/v1/projects/{id}/roles` | POST | Custom | ProjectRoleService.create_role |
| Internal: `/v1/project/{id}/role/{role_id}` | `/api/v1/projects/{id}/roles/{role_id}` | DELETE | Custom | ProjectRoleService.delete_role |
| Internal: `/v1/project/role/permissions` | `/api/v1/projects/roles/{role_id}/permissions` | PUT | Custom | ProjectRoleService.update_permissions |
| Internal: `/v1/project/{id}/users/{auth0_id}/role/{role_id}` | `/api/v1/projects/{id}/users/{auth0_id}/role` | POST | Custom | ProjectUserService.assign_role |
| Internal: `/v1/project/{id}/users/{auth0_id}/role/{new_role_id}` | `/api/v1/projects/{id}/users/{auth0_id}/role` | PUT | Custom | ProjectUserService.change_role |
| Internal: `/v1/projects/user/{auth0_id}` | `/api/v1/projects/user/{auth0_id}` | GET | Custom | ProjectService.get_user_projects |
| Internal: `/v1/projects/user/{auth0_id}/roles-permissions` | `/api/v1/projects/user/{auth0_id}/roles-permissions` | GET | Custom | ProjectService.get_user_projects_with_roles |

### 2.7 User Routes
**From**: `user-manager` + `postgres-database-manager` → **To**: `app/routes/users/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/user-manager/v1/user` | `/api/v1/users` | POST | Yes | UserService.create |
| `/api/user-manager/v1/user` | `/api/v1/users/auth0/{auth0_id}` | GET | Custom | UserService.get_by_auth0_id |
| `/api/user-manager/v1/user/invite` | `/api/v1/users/invite` | POST | Custom | UserService.invite |
| `/api/user-manager/v1/users/{org_id}/organization` | `/api/v1/users/organization/{org_id}` | GET | Custom | UserService.get_by_org |
| Internal: `/v1/users` | `/api/v1/users` | GET | Yes | UserService.get_all |
| Internal: `/v1/users/search` | `/api/v1/users/search` | GET | Yes (search) | UserService.search |
| Internal: `/v1/users/get-count` | `/api/v1/users/count` | GET | Yes (count) | UserService.count |

### 2.8 Asset Routes (S3)
**From**: `asset-manager` → **To**: `app/routes/assets/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| `/api/asset-manager/v1/enterprise-upload` | `/api/v1/assets/upload` | POST | No | AssetService.upload |
| `/api/asset-manager/v1/enterprise-folder` | `/api/v1/assets/folder` | DELETE | No | AssetService.delete_folder |

### 2.9 MongoDB Routes (Patient/Execution Records)
**From**: `mongo-database-manager` → **To**: `app/routes/patient_records/` + `app/routes/execution_records/`

| Original Endpoint | New Endpoint | Method | Handler |
|-------------------|--------------|--------|---------|
| `/api/mongo-database-manager/v1/patient-record/{proj}/{trial}` | `/api/v1/patient-records/{project_id}/{trial_slug}` | POST | PatientRecordService.create |
| `/api/mongo-database-manager/v1/patient-record/{proj}/{trial}/all` | `/api/v1/patient-records/{project_id}/{trial_slug}/all` | GET | PatientRecordService.get_all |
| `/api/mongo-database-manager/v1/patient-record/{proj}/{trial}` | `/api/v1/patient-records/{project_id}/{trial_slug}` | GET | PatientRecordService.get_paginated |
| `/api/mongo-database-manager/v1/patient-record/{proj}/{trial}/{id}` | `/api/v1/patient-records/{project_id}/{trial_slug}/{id}` | GET | PatientRecordService.get_by_id |
| `/api/mongo-database-manager/v1/patient-record/{proj}/{trial}/{id}` | `/api/v1/patient-records/{project_id}/{trial_slug}/{id}` | DELETE | PatientRecordService.delete |
| `/api/mongo-database-manager/v1/execution-record/{proj}/{trial}/record` | `/api/v1/execution-records/{project_id}/{trial_slug}` | POST | ExecutionRecordService.create |
| `/api/mongo-database-manager/v1/execution-record/{proj}/{trial}/records` | `/api/v1/execution-records/{project_id}/{trial_slug}` | GET | ExecutionRecordService.get_paginated |
| `/api/mongo-database-manager/v1/execution-record/{proj}/{trial}/record/{id}` | `/api/v1/execution-records/{project_id}/{trial_slug}/{id}` | GET | ExecutionRecordService.get_by_id |
| `/api/mongo-database-manager/v1/execution-record/{proj}/{trial}/records-with-ids` | `/api/v1/execution-records/{project_id}/{trial_slug}/batch` | POST | ExecutionRecordService.get_batch |

### 2.10 Notification Routes
**From**: `postgres-database-manager` → **To**: `app/routes/notifications/`

| Original Endpoint | New Endpoint | Method | Use CRUDRouter | Handler |
|-------------------|--------------|--------|----------------|---------|
| Internal: `/v1/notification` | `/api/v1/notifications` | POST | Yes | NotificationService.create |
| Internal: `/v1/notification/{recipient}` | `/api/v1/notifications/{recipient}` | GET | Custom | NotificationService.get_for_user |
| Internal: `/v1/notification/{recipient}/unread-count` | `/api/v1/notifications/{recipient}/unread-count` | GET | Custom | NotificationService.count_unread |
| Internal: `/v1/notification/{id}/read` | `/api/v1/notifications/{id}/read` | PUT | Custom | NotificationService.mark_read |
| Internal: `/v1/notification/{recipient}/readAll` | `/api/v1/notifications/{recipient}/read-all` | PUT | Custom | NotificationService.mark_all_read |
| Internal: `/v1/notification/{id}` | `/api/v1/notifications/{id}` | DELETE | Yes | NotificationService.delete |

### 2.11 Trial Sharing Routes
**From**: `postgres-database-manager` → **To**: `app/routes/trial_shares/`

| Original Endpoint | New Endpoint | Method | Handler |
|-------------------|--------------|--------|---------|
| Internal: `/v1/trial-share/{proj}/{trial}` | `/api/v1/trial-shares/{project_id}/{trial_slug}` | POST | TrialShareService.share |
| Internal: `/v1/trial-share/{proj}/{trial}/{user_id}/{direction}` | `/api/v1/trial-shares/{project_id}/{trial_slug}/{user_id}` | GET | TrialShareService.get_shares |

---

## 3. Service Migration Mapping

### 3.1 Auth Services (Auth0 API Integration)
**Location**: `app/services/auth/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| Auth0UserService | Auth0UserService | `auth0_user_service.py` | get_org_members, get_members_with_roles, send_invitation, get_invitations, delete_invitation, assign_roles, change_roles, remove_roles, block_user, unblock_user |
| Auth0OrganizationService | Auth0OrgService | `auth0_org_service.py` | create_organization, get_connections, delete_connection |
| Auth0RoleService | Auth0RoleService | `auth0_role_service.py` | get_all_roles |
| Auth0SelfSsoService | Auth0SsoService | `auth0_sso_service.py` | create_sso_ticket |
| TokenService | Auth0TokenService | `auth0_token_service.py` | get_m2m_token, refresh_token |

### 3.2 Enterprise Services
**Location**: `app/services/enterprises/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| EnterpriseService | EnterpriseService | `enterprise_service.py` | CRUD + get_by_org, get_by_domain, get_by_admin, get_by_status, get_stats, check_domain, check_org |
| AdminService | AdminService | `admin_service.py` | create_admin, update_admin, delete_admin, get_by_enterprise |
| DatasourceService | DatasourceService | `datasource_service.py` | create, update, get_by_enterprise |
| OnboardingProgressService | OnboardingService | `onboarding_service.py` | invite, reinvite, onboard, get_progress, update_progress |
| SsoTicketService | SsoTicketService | `sso_ticket_service.py` | create_ticket, validate_ticket |

### 3.3 Trial/Module Services
**Location**: `app/services/trials/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| TrialService | TrialService | `trial_service.py` | CRUD + get_by_slug, get_by_module, check_slug_exists |
| ModuleService | ModuleService | `module_service.py` | CRUD + get_standalone |
| EnterpriseModuleAccessService | AccessService | `access_service.py` | grant_access, revoke_access, get_by_org, get_full_access |

### 3.4 Project Services
**Location**: `app/services/projects/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| ProjectService | ProjectService | `project_service.py` | CRUD + get_by_status, get_by_user, get_user_projects_with_roles, get_stats |
| ProjectUserService | ProjectUserService | `project_user_service.py` | add_user, remove_user, get_users, assign_role, change_role |
| RoleService | ProjectRoleService | `project_role_service.py` | create_role, delete_role, get_roles, update_permissions, apply_defaults |
| DefaultRoleService | DefaultRoleService | `default_role_service.py` | get_all_with_permissions, seed_defaults |

### 3.5 User Services
**Location**: `app/services/users/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| UserService | UserService | `user_service.py` | CRUD + get_by_auth0_id, get_by_org, search, invite |

### 3.6 Asset Services
**Location**: `app/services/storage/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| S3Service | S3StorageService | `s3_service.py` | upload_file, delete_file, delete_folder, get_presigned_url |

### 3.7 MongoDB Services
**Location**: `app/services/mongo/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| PatientRecordService | PatientRecordService | `patient_record_service.py` | create, get_all, get_paginated, get_by_id, delete, count |
| ExecutionRecordService | ExecutionRecordService | `execution_record_service.py` | create, get_paginated, get_by_id, get_batch |

### 3.8 Supporting Services
**Location**: `app/services/supporting/`

| Original Service (Java) | New Service (Python) | File | Key Methods |
|-------------------------|---------------------|------|-------------|
| NotificationService | NotificationService | `notification_service.py` | create, get_for_user, count_unread, mark_read, mark_all_read |
| TrialShareService | TrialShareService | `trial_share_service.py` | share, get_sent, get_received |
| BookmarkService | BookmarkService | `bookmark_service.py` | create, get_by_user, delete |

---

## 4. Configuration Mapping

### 4.1 Database Configuration

| Original (application.yml) | New (.env) | Notes |
|---------------------------|------------|-------|
| `spring.datasource.url` | `DATABASE_URL` | postgresql://user:pass@host:5432/db |
| `spring.datasource.username` | `DATABASE_USER` | Postgres username |
| `spring.datasource.password` | `DATABASE_PASSWORD` | Postgres password |
| `spring.data.mongodb.uri` | `MONGO_URL` | mongodb://user:pass@host:27017/db |
| `spring.redis.host` | `REDIS_HOST` | Redis hostname |
| `spring.redis.port` | `REDIS_PORT` | Redis port (default 6379) |
| `spring.redis.password` | `REDIS_PASSWORD` | Redis password (optional) |

### 4.2 Auth0 Configuration

| Original (application.yml) | New (.env) | Notes |
|---------------------------|------------|-------|
| `auth0.domain` | `AUTH0_DOMAIN` | e.g., tenant.auth0.com |
| `auth0.audience` | `AUTH0_AUDIENCE` | API identifier |
| `auth0.client-id` | `AUTH0_M2M_CLIENT_ID` | M2M client ID |
| `auth0.client-secret` | `AUTH0_M2M_CLIENT_SECRET` | M2M client secret |
| `auth0.management-api-audience` | `AUTH0_MGMT_AUDIENCE` | https://{domain}/api/v2/ |
| `sso.self-service-profile-id` | `AUTH0_SSO_PROFILE_ID` | SSO profile ID |

### 4.3 AWS Configuration

| Original (application.yml) | New (.env) | Notes |
|---------------------------|------------|-------|
| `cloud.aws.credentials.access-key` | `AWS_ACCESS_KEY_ID` | AWS access key |
| `cloud.aws.credentials.secret-key` | `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `cloud.aws.s3.bucket` | `AWS_S3_BUCKET_NAME` | S3 bucket name |
| `cloud.aws.region.static` | `AWS_S3_REGION` | AWS region |

### 4.4 Application Configuration

| Original (application.yml) | New (.env) | Notes |
|---------------------------|------------|-------|
| `server.port` | `PORT` | Default 8000 |
| `spring.profiles.active` | `ENVIRONMENT` | development/production |
| N/A | `SECRET_KEY` | JWT signing key |
| N/A | `DEBUG` | true/false |
| `server.servlet.context-path` | N/A | Handled by FastAPI prefix |

### 4.5 New Required Configuration

```env
# FastAPI-specific
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8000

# Multi-tenancy
DEFAULT_SCHEMA=public
TENANT_SCHEMA_PREFIX=org_

# Cache
CACHE_TYPE=redis
CACHE_DEFAULT_TTL=300

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
ENABLE_FILE_LOGGING=true
LOG_DIRECTORY=logs

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

---

## 5. Components Not Migrated

| Component | Original Service | Reason | Replacement |
|-----------|------------------|--------|-------------|
| Eureka Service Registry | service-registry | Single backend, no discovery needed | None |
| Spring Cloud Config Server | config-server | Use .env files | Pydantic Settings |
| Spring Cloud Gateway | api-gateway | FastAPI handles auth directly | FastAPI middleware + dependencies |
| Kafka Message Publisher | message-publisher | Overkill for single backend | FastAPI BackgroundTasks |
| Feign Clients | All services | No inter-service calls | Direct service method calls |
| Circuit Breaker (Resilience4j) | api-gateway | Single backend | Python circuit breaker if needed |
| Terraform Provisioner | enterprise-infra-provisioner | Separate deployment concern | External script or keep separate |
| App-Env-Configuration | app-env-configuration | Use .env files | Environment variables |

---

## 6. Multi-Tenancy Implementation

### 6.1 Schema-Based Multi-Tenancy Pattern

```python
# app/core/tenant.py

from contextvars import ContextVar
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Context variable for tenant ID
current_tenant: ContextVar[str] = ContextVar('current_tenant', default='public')

async def set_tenant_schema(db: AsyncSession, org_id: str):
    """Set PostgreSQL search_path to tenant schema."""
    schema_name = f"org_{org_id}" if org_id else "public"
    await db.execute(text(f"SET search_path TO {schema_name}, public"))

# Middleware
async def tenant_middleware(request: Request, call_next):
    org_id = request.headers.get("org-id")
    if org_id:
        current_tenant.set(org_id)
    try:
        response = await call_next(request)
        return response
    finally:
        current_tenant.set("public")

# Dependency
async def get_tenant_db(
    org_id: str = Header(None, alias="org-id"),
    db: AsyncSession = Depends(get_async_db)
) -> AsyncSession:
    if org_id:
        await set_tenant_schema(db, org_id)
    return db
```

### 6.2 MongoDB Multi-Tenancy

```python
# app/core/mongo_tenant.py

from motor.motor_asyncio import AsyncIOMotorClient
from contextvars import ContextVar

mongo_tenant: ContextVar[str] = ContextVar('mongo_tenant', default='default')

def get_tenant_database(client: AsyncIOMotorClient, org_id: str):
    """Get tenant-specific MongoDB database."""
    return client[f"{org_id}_db"]

def get_tenant_collection(db, project_id: str, trial_slug: str, collection_type: str):
    """Get tenant and project specific collection."""
    collection_name = f"{project_id}_{trial_slug}_{collection_type}"
    return db[collection_name]
```

### 6.3 Schema Creation Service

```python
# app/services/tenant/schema_service.py

class TenantSchemaService:
    """Manage tenant schema creation and migration."""

    async def create_tenant_schema(self, db: AsyncSession, org_id: str):
        """Create new tenant schema with all required tables."""
        schema_name = f"org_{org_id}"

        # Create schema
        await db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))

        # Run Alembic migrations for tenant
        # (or use multi-tenant Alembic plugin)

    async def drop_tenant_schema(self, db: AsyncSession, org_id: str):
        """Drop tenant schema (soft delete recommended)."""
        schema_name = f"org_{org_id}"
        await db.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE"))
```

---

## 7. Migration Complexity Assessment

| Area | Complexity | Reason | Estimated Prompts |
|------|------------|--------|-------------------|
| **Models - Enterprise** | Low | Straightforward entity mapping | 1 prompt |
| **Models - Tenant** | Medium | Multi-table relationships, enums | 1-2 prompts |
| **Models - MongoDB** | Medium | Different driver (Motor/Beanie) | 1 prompt |
| **Auth0 Integration** | High | External API, token caching, rate limits | 2 prompts |
| **Enterprise Routes** | Low | Mostly CRUDRouter compatible | 1 prompt |
| **Project Routes** | Medium | Complex role/permission management | 2 prompts |
| **User Routes** | Low | Straightforward CRUD + invite | 1 prompt |
| **Asset Routes** | Low | Simple S3 wrapper | 1 prompt |
| **MongoDB Routes** | Medium | Async Motor, tenant switching | 1-2 prompts |
| **Multi-Tenancy** | High | Schema switching, context management | 2 prompts |
| **Alembic Migrations** | Medium | Multi-schema support | 1 prompt |
| **Testing** | High | All endpoints, edge cases, security | 2-3 prompts |
| **Frontend API Updates** | Medium | Many files but straightforward | 3-4 prompts |

**Total Estimated Implementation Prompts**: ~17-20 prompts

---

## 8. Risk Areas & Mitigation

### 8.1 Auth0 Integration Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Rate limiting on Auth0 API | High | Medium | Implement token caching, batch requests |
| Token expiration during long operations | Medium | Medium | Implement refresh logic, short-lived tokens |
| M2M token not properly cached | High | Low | Use Redis cache with TTL |
| Permission sync delays | Medium | Low | Use eventual consistency, cache busting |

### 8.2 Multi-Tenant Data Isolation Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Cross-tenant data leakage | Critical | Low | Thorough testing, middleware validation |
| Tenant context not cleared | High | Medium | Finally blocks, context manager |
| Wrong schema in async context | High | Medium | Use ContextVar, test concurrent requests |
| Missing org-id header | Medium | Medium | Validate header in middleware |

### 8.3 Business Logic Preservation Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Missing edge cases | High | Medium | Compare original code line-by-line |
| Different validation behavior | Medium | Medium | Port Pydantic validators exactly |
| Transaction handling differences | Medium | Low | Use SQLAlchemy transactions properly |
| Async vs sync behavior differences | Medium | Medium | Test with concurrent requests |

### 8.4 API Compatibility Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking frontend responses | High | Medium | Match response format exactly |
| Changed status codes | Medium | Low | Document and test status codes |
| Different error formats | Medium | Medium | Create error response wrapper |
| Missing headers | Medium | Low | Verify all headers are passed |

### 8.5 Performance Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Single backend bottleneck | High | Medium | Proper async, connection pooling |
| N+1 query problems | Medium | Medium | Use selectinload, joinedload |
| Memory issues with large responses | Medium | Low | Implement streaming, pagination |
| Redis connection exhaustion | Medium | Low | Connection pooling, timeouts |

---

## 9. Migration Checklist

### Phase 1: Backend Consolidation

- [ ] **1.1 Project Setup**
  - [ ] Copy backend template to new location
  - [ ] Configure environment variables
  - [ ] Set up Docker development environment
  - [ ] Verify template runs correctly

- [ ] **1.2 Models Migration**
  - [ ] Create enterprise models (enterprise.py, admin.py, etc.)
  - [ ] Create tenant models (user.py, project.py, role.py)
  - [ ] Set up MongoDB models with Motor
  - [ ] Create enums for status/type fields
  - [ ] Add model relationships

- [ ] **1.3 Multi-Tenancy Setup**
  - [ ] Implement TenantContextMiddleware
  - [ ] Create get_tenant_db dependency
  - [ ] Set up schema switching
  - [ ] Create TenantSchemaService for schema management

- [ ] **1.4 Auth0 Services**
  - [ ] Implement Auth0TokenService (M2M token)
  - [ ] Implement Auth0UserService (members, invitations, roles)
  - [ ] Implement Auth0OrgService (organizations, connections)
  - [ ] Implement Auth0SsoService (SSO tickets)
  - [ ] Add proper caching and error handling

- [ ] **1.5 Enterprise Services & Routes**
  - [ ] Implement EnterpriseService
  - [ ] Implement AdminService
  - [ ] Implement TrialService
  - [ ] Implement AccessService
  - [ ] Create routes using CRUDRouter + custom endpoints

- [ ] **1.6 Project Services & Routes**
  - [ ] Implement ProjectService
  - [ ] Implement ProjectUserService
  - [ ] Implement ProjectRoleService
  - [ ] Create project routes with role management

- [ ] **1.7 User Services & Routes**
  - [ ] Extend existing UserService
  - [ ] Add invite functionality
  - [ ] Create user routes

- [ ] **1.8 MongoDB Services & Routes**
  - [ ] Set up Motor async client
  - [ ] Implement PatientRecordService
  - [ ] Implement ExecutionRecordService
  - [ ] Create MongoDB routes

- [ ] **1.9 Supporting Services & Routes**
  - [ ] Implement NotificationService
  - [ ] Implement TrialShareService
  - [ ] Implement BookmarkService
  - [ ] Create supporting routes

- [ ] **1.10 Asset Services & Routes**
  - [ ] Implement S3StorageService
  - [ ] Create asset upload routes

- [ ] **1.11 Database Migrations**
  - [ ] Create Alembic migrations for public schema
  - [ ] Create multi-tenant migration strategy
  - [ ] Test migrations with sample data

- [ ] **1.12 Testing**
  - [ ] Unit tests for all services
  - [ ] Integration tests for all endpoints
  - [ ] Multi-tenancy isolation tests
  - [ ] Authentication/authorization tests
  - [ ] Performance tests

### Phase 2: Frontend Migration

- [ ] **2.1 API Client Update**
  - [ ] Update base URL configuration
  - [ ] Update API_CONFIG endpoint mappings
  - [ ] Verify interceptors work correctly

- [ ] **2.2 Endpoint Mapping**
  - [ ] Update auth service endpoints
  - [ ] Update enterprise service endpoints
  - [ ] Update project service endpoints
  - [ ] Update user service endpoints
  - [ ] Update all other service endpoints

- [ ] **2.3 Auth Flow Update**
  - [ ] Verify NextAuth still works
  - [ ] Update token refresh logic if needed
  - [ ] Test authentication flow end-to-end

- [ ] **2.4 Integration Testing**
  - [ ] Test all pages with new backend
  - [ ] Fix any response format mismatches
  - [ ] Test error handling
  - [ ] Test loading states

### Phase 3: UI/UX Modernization (Optional)

- [ ] **3.1 UI Audit**
- [ ] **3.2 React Optimization**
- [ ] **3.3 Component Modernization**
- [ ] **3.4 Accessibility Improvements**

---

## Appendix: File Location Reference

### Source Files (FROM - Spring Boot)
```
existing-architecture-codebase/
├── core-microservices/
│   ├── api-gateway/                    # JWT validation, routing
│   ├── auth-manager/                   # Auth0 integration
│   ├── enterprise-manager/             # Enterprise CRUD
│   ├── project-manager/                # Project management
│   ├── user-manager/                   # User management
│   ├── asset-manager/                  # S3 uploads
│   └── enterprise-infra-provisioner/   # Terraform (NOT MIGRATED)
└── default-microservices/
    ├── postgres-database-manager/      # PostgreSQL entities
    ├── mongo-database-manager/         # MongoDB entities
    ├── message-publisher/              # Kafka (NOT MIGRATED)
    ├── service-registry/               # Eureka (NOT MIGRATED)
    ├── config-server/                  # Config (NOT MIGRATED)
    └── app-env-configuration/          # Env (NOT MIGRATED)
```

### Target Files (TO - FastAPI)
```
backend-template-to-use/
├── app/
│   ├── config/
│   │   └── settings.py                 # All configuration
│   ├── core/
│   │   ├── auth0.py                    # Auth0 JWT verification
│   │   ├── permissions.py              # Permission dependencies
│   │   ├── database.py                 # Async SQLAlchemy
│   │   ├── tenant.py                   # NEW: Multi-tenancy
│   │   └── mongo.py                    # NEW: MongoDB setup
│   ├── models/
│   │   ├── enterprise/                 # NEW: Enterprise models
│   │   ├── tenant/                     # NEW: Tenant models
│   │   └── mongo/                      # NEW: MongoDB models
│   ├── schemas/
│   │   ├── enterprise/                 # NEW: Enterprise schemas
│   │   ├── project/                    # NEW: Project schemas
│   │   └── user/                       # NEW: User schemas
│   ├── services/
│   │   ├── auth/                       # NEW: Auth0 services
│   │   ├── enterprises/                # NEW: Enterprise services
│   │   ├── projects/                   # NEW: Project services
│   │   ├── users/                      # EXTEND: User services
│   │   ├── mongo/                      # NEW: MongoDB services
│   │   └── storage/                    # NEW: S3 services
│   └── routes/
│       ├── auth/                       # NEW: Auth routes
│       ├── enterprises/                # NEW: Enterprise routes
│       ├── projects/                   # NEW: Project routes
│       ├── users.py                    # EXTEND: User routes
│       ├── patient_records/            # NEW: Patient routes
│       └── assets/                     # NEW: Asset routes
└── alembic/
    └── versions/                       # Migration files
```

---

*Document generated as part of Phase 0.3 Migration Mapping*
