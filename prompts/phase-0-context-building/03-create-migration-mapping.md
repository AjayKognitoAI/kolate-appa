# Phase 0.3: Create Migration Mapping

## Objective
Create a detailed mapping document that connects the existing architecture to the target template, identifying what goes where.

---

## Prompt

```
Based on your exploration of both the backend template and existing architecture, create a comprehensive migration mapping document.

## What to Create

### 1. Entity Migration Mapping

Map every entity from existing services to new locations:

```markdown
## Entity Migration Map

### From enterprise-manager → app/models/enterprise.py
| Original Entity | New Model | Notes |
|-----------------|-----------|-------|
| Enterprise | Enterprise | Add org_id index |
| Admin | Admin | Relationship to Enterprise |
| EnterpriseDatasource | EnterpriseDatasource | Encrypt connection_string |
| EnterpriseOnboardingProgress | EnterpriseOnboardingProgress | JSON field for progress_data |
| SsoTicket | SsoTicket | Add TTL logic |

### From postgres-database-manager → app/models/
| Original Entity | New Model | Notes |
|-----------------|-----------|-------|
| User | app/models/user.py | Extend existing template User |
| Project | app/models/project.py | Add tenant filter |
| ProjectUser | app/models/project.py | Junction table |
| Role | app/models/project.py | Project-specific roles |
| Permission | app/models/project.py | Role permissions |
| DefaultRole | app/models/role.py | System default roles |
| DefaultPermission | app/models/role.py | Default permissions |
| UserBookmark | app/models/supporting.py | User preferences |
| Notification | app/models/supporting.py | User notifications |
| TrialShare | app/models/supporting.py | Trial sharing |

### From mongo-database-manager → app/models_mongo/
| Original Entity | New Model | Notes |
|-----------------|-----------|-------|
| PatientRecord | app/models_mongo/patient_record.py | Use Motor |
| ExecutionRecord | app/models_mongo/execution_record.py | Use Motor |
```

### 2. Endpoint Migration Mapping

Map every endpoint from existing services:

```markdown
## Endpoint Migration Map

### auth-manager → app/routes/auth/
| Original | New | Handler |
|----------|-----|---------|
| GET /api/auth-manager/v1/user/organizations/{org}/members | GET /api/v1/auth/organizations/{org}/members | Auth0UserService |
| POST /api/auth-manager/v1/user/organizations/{org}/invitations | POST /api/v1/auth/organizations/{org}/invitations | Auth0UserService |
| POST /api/auth-manager/v1/user/roles | POST /api/v1/auth/roles | Auth0RoleService |
| ... | ... | ... |

### enterprise-manager → app/routes/enterprises/
| Original | New | Use CRUDRouter? |
|----------|-----|-----------------|
| POST /api/enterprise-manager/v1/enterprises | POST /api/v1/enterprises | Yes |
| GET /api/enterprise-manager/v1/enterprises/{id} | GET /api/v1/enterprises/{id} | Yes |
| GET /api/enterprise-manager/v1/enterprises/{org}/organization | GET /api/v1/enterprises/organization/{org} | Custom |
| ... | ... | ... |

### project-manager → app/routes/projects/
| Original | New | Use CRUDRouter? |
|----------|-----|-----------------|
| POST /api/project-manager/v1/project | POST /api/v1/projects | Yes |
| GET /api/project-manager/v1/project/{id} | GET /api/v1/projects/{id} | Yes |
| POST /api/project-manager/v1/project/{id}/users | POST /api/v1/projects/{id}/users | Custom |
| ... | ... | ... |
```

### 3. Service Migration Mapping

Map business logic from existing services:

```markdown
## Service Migration Map

### Auth Services (External API calls to Auth0)
| Original Service | New Service | Key Methods |
|------------------|-------------|-------------|
| Auth0UserService | app/services/auth/auth0_user_service.py | get_org_members, send_invitation |
| Auth0OrganizationService | app/services/auth/auth0_org_service.py | create_org, get_connections |
| Auth0RoleService | app/services/auth/auth0_role_service.py | get_roles, assign_roles |

### Enterprise Services
| Original Service | New Service | Key Methods |
|------------------|-------------|-------------|
| EnterpriseService | app/services/enterprises/enterprise_service.py | CRUD + custom queries |
| AdminService | app/services/enterprises/admin_service.py | manage enterprise admins |
| DatasourceService | app/services/enterprises/datasource_service.py | datasource CRUD |
| OnboardingService | app/services/enterprises/onboarding_service.py | progress tracking |

### Project Services
| Original Service | New Service | Key Methods |
|------------------|-------------|-------------|
| ProjectService | app/services/projects/project_service.py | CRUD + user projects |
| ProjectUserService | app/services/projects/project_user_service.py | manage project members |
| RoleService | app/services/projects/project_role_service.py | role/permission management |
```

### 4. Configuration Mapping

Map configuration from existing services to new settings:

```markdown
## Configuration Migration Map

### Database
| Original (application.yml) | New (.env / settings.py) |
|---------------------------|--------------------------|
| spring.datasource.url | DATABASE_URL |
| spring.data.mongodb.uri | MONGO_URL |
| spring.redis.host | REDIS_HOST |

### Auth0
| Original | New |
|----------|-----|
| auth0.domain | AUTH0_DOMAIN |
| auth0.audience | AUTH0_AUDIENCE |
| auth0.client-id | AUTH0_CLIENT_ID |

### AWS
| Original | New |
|----------|-----|
| cloud.aws.credentials.access-key | AWS_ACCESS_KEY_ID |
| cloud.aws.credentials.secret-key | AWS_SECRET_ACCESS_KEY |
| cloud.aws.s3.bucket | S3_BUCKET_NAME |
```

### 5. What Gets Removed

Document services/components that won't be migrated:

```markdown
## Components Not Migrated

| Component | Reason | Replacement |
|-----------|--------|-------------|
| Eureka (service-registry) | Single backend, no discovery needed | None |
| Config Server | Use .env files | Pydantic Settings |
| API Gateway (Spring) | FastAPI handles auth directly | FastAPI middleware |
| Kafka (message-publisher) | Overkill for single backend | FastAPI BackgroundTasks |
| Feign Clients | No inter-service calls | Direct service calls |
```

### 6. Migration Complexity Assessment

Rate each migration area:

```markdown
## Complexity Assessment

| Area | Complexity | Reason | Estimated Effort |
|------|------------|--------|------------------|
| Entities | Medium | Straightforward mapping | 2-3 prompts |
| Auth0 Integration | High | External API, token management | 2 prompts |
| Enterprise Routes | Low | CRUDRouter + few custom | 1 prompt |
| Project Routes | Medium | Complex role/permission logic | 2 prompts |
| MongoDB Integration | Medium | Different driver (Motor) | 1 prompt |
| Multi-tenancy | High | Schema-based isolation | 2 prompts |
| Frontend Migration | Medium | Many files but straightforward | 3-4 prompts |
```

### 7. Risk Areas

Identify potential issues:

```markdown
## Migration Risks

1. **Auth0 Token Management**
   - Risk: Rate limits, token caching
   - Mitigation: Implement proper caching, retry logic

2. **Multi-tenant Data Isolation**
   - Risk: Data leakage between tenants
   - Mitigation: Thorough testing, middleware validation

3. **Business Logic Preservation**
   - Risk: Missing edge cases
   - Mitigation: Compare original service code line by line

4. **API Compatibility**
   - Risk: Breaking frontend
   - Mitigation: Match response format exactly, test all endpoints

5. **Performance**
   - Risk: Single backend bottleneck
   - Mitigation: Proper async, connection pooling, caching
```

## Expected Output

Create a single comprehensive mapping document that serves as the migration blueprint.
Save it to: `docs/MIGRATION_MAPPING.md`
```

---

## Why This Matters

The migration mapping document:
- Serves as a checklist during migration
- Ensures nothing is forgotten
- Identifies high-risk areas upfront
- Provides clear action items for each phase

## Next Step
After completing Phase 0, you're ready to start Phase 1: [01-project-setup.md](../phase-1-backend-consolidation/01-project-setup.md)
