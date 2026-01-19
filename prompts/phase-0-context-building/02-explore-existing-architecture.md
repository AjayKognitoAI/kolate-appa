# Phase 0.2: Explore Existing Architecture

## Objective
Build comprehensive understanding of the existing Spring Boot microservices architecture that needs to be migrated.

---

## Prompt

```
I need you to thoroughly explore and understand the existing microservices architecture in `existing-architecture-codebase/` folder. This is what we're migrating FROM.

## What to Explore

### 1. Microservices Overview

**Core Microservices** (`existing-architecture-codebase/core-microservices/`):
- `api-gateway/` - Request routing, JWT validation
- `auth-manager/` - Auth0 integration, user/org management
- `enterprise-manager/` - Enterprise lifecycle, onboarding
- `project-manager/` - Project and role management
- `user-manager/` - User CRUD operations
- `asset-manager/` - S3 file uploads
- `enterprise-infra-provisioner/` - Infrastructure setup

**Default Microservices** (`existing-architecture-codebase/default-microservices/`):
- `postgres-database-manager/` - Multi-tenant PostgreSQL operations
- `mongo-database-manager/` - MongoDB operations
- `message-publisher/` - Kafka message publishing
- `service-registry/` - Eureka service discovery
- `config-server/` - Centralized configuration
- `app-env-configuration/` - Environment configs

### 2. For Each Core Microservice, Explore:

**Structure to look for:**
```
microservice-name/
├── src/main/java/.../
│   ├── controller/     # REST endpoints
│   ├── service/        # Business logic
│   ├── repository/     # Data access
│   ├── entity/         # Database models
│   ├── dto/            # Data transfer objects
│   ├── config/         # Configuration classes
│   └── client/         # Feign clients for other services
└── src/main/resources/
    └── application.yml # Configuration
```

### 3. Key Information to Extract

For **auth-manager**:
- List all Auth0 API integrations
- Document all endpoints (UserController, OrganizationController, etc.)
- Understand invitation flow
- Understand role assignment flow

For **enterprise-manager**:
- List all entities (Enterprise, Admin, Datasource, etc.)
- Document all endpoints
- Understand onboarding workflow
- Understand SSO ticket mechanism

For **project-manager**:
- List all entities (Project, ProjectUser, Role, Permission)
- Document all endpoints
- Understand role/permission hierarchy
- Understand user-project relationships

For **user-manager**:
- List all endpoints
- Understand user creation flow
- Understand invitation flow

For **asset-manager**:
- Understand S3 integration
- Document upload/delete operations

For **postgres-database-manager**:
- List ALL entities (this is the main data store)
- Understand multi-tenant pattern
- Document all endpoints
- Understand Flyway migrations

For **mongo-database-manager**:
- List all collections/entities
- Understand patient record structure
- Understand execution record structure

### 4. Questions to Answer

After exploration, provide answers to:

1. **What are ALL the database entities?**
   - List every entity across all services
   - Note which database each uses (Postgres/Mongo)
   - Document relationships between entities

2. **What are ALL the API endpoints?**
   - Group by service
   - Note HTTP method and path
   - Note request/response types

3. **How does authentication flow work?**
   - JWT validation in API Gateway
   - Header propagation (org-id, user-id)
   - Permission checking

4. **How does multi-tenancy work?**
   - How is tenant context set?
   - How is data isolated?
   - Database per tenant or shared?

5. **What are the inter-service communications?**
   - Which services call which?
   - What Feign clients exist?
   - What Kafka topics are used?

6. **What business logic is critical?**
   - Enterprise onboarding steps
   - User invitation flow
   - Role/permission management
   - Project lifecycle

### 5. Also Explore Frontend

Look at `existing-architecture-codebase/frontend/`:
- `package.json` - Dependencies and versions
- `app/` or `pages/` - Route structure
- `components/` - UI components
- `services/` or `lib/` - API clients
- `store/` - State management
- `types/` - TypeScript definitions

Document:
- How API calls are made currently
- What state management is used
- Key component patterns

### 6. Create Inventory Document

After exploration, create a comprehensive inventory:

```markdown
# Existing Architecture Inventory

## Entities (Database Models)
| Entity | Service | Database | Key Fields |
|--------|---------|----------|------------|
| Enterprise | enterprise-manager | PostgreSQL | id, org_id, name, status |
| ... | ... | ... | ... |

## API Endpoints
| Method | Path | Service | Description |
|--------|------|---------|-------------|
| POST | /api/enterprise-manager/v1/enterprises | enterprise-manager | Create enterprise |
| ... | ... | ... | ... |

## Inter-Service Communication
| From | To | Method | Purpose |
|------|-----|--------|---------|
| enterprise-manager | auth-manager | Feign | Create Auth0 org |
| ... | ... | ... | ... |

## Business Flows
1. Enterprise Onboarding: [steps]
2. User Invitation: [steps]
3. Project Creation: [steps]

## Frontend Structure
- Framework: Next.js 15
- State: Redux Toolkit
- UI: MUI v7
- Auth: NextAuth with Auth0
```

## Expected Output

Provide a comprehensive report with:
1. Complete entity inventory
2. Complete endpoint inventory
3. Authentication/authorization flow
4. Multi-tenancy implementation details
5. Inter-service communication map
6. Critical business logic documentation
7. Frontend architecture summary
8. Migration complexity assessment
```

---

## Why This Matters

Deep understanding of existing architecture ensures:
- Nothing is missed during migration
- Business logic is preserved
- API compatibility is maintained
- Edge cases are handled

## Next Step
After completing this prompt, proceed to [03-create-migration-mapping.md](03-create-migration-mapping.md)
