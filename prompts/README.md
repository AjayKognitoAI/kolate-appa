# Kolate App Migration Prompts

This folder contains sequential prompts to migrate from the existing Spring Boot microservices architecture to a consolidated FastAPI backend, then update the frontend and modernize UI/UX.

## Migration Overview

### Current Architecture
- **7 Core Microservices**: API-Gateway, Auth-Manager, Enterprise-Manager, Project-Manager, User-Manager, Asset-Manager, Enterprise-Infra-Provisioner
- **6 Default Microservices**: Postgres-Database-Manager, Mongo-Database-Manager, Message-Publisher, Config-Server, Service-Registry, App-Env-Configuration
- **Frontend**: Next.js 15.2.4 with MUI v7, Redux Toolkit, NextAuth.js

### Target Architecture
- **Single FastAPI Backend**: Consolidated from all microservices using `backend-template-to-use`
- **Same Frontend**: Updated to use new API endpoints
- **Modernized UI/UX**: Using react-best-practices and web-design-guidelines

---

## Phase Structure

### Phase 1: Backend Consolidation (6 prompts)
Consolidate all Spring Boot microservices into one FastAPI application.

| # | Prompt | Purpose | Skills Used |
|---|--------|---------|-------------|
| 01 | [Project Setup](phase-1-backend-consolidation/01-project-setup.md) | Initialize consolidated backend structure | python-pro, architect-review |
| 02 | [Models Migration](phase-1-backend-consolidation/02-models-migration.md) | Migrate all entities from microservices | python-pro, database-architect |
| 03 | [Routes Migration](phase-1-backend-consolidation/03-routes-migration.md) | Create equivalent FastAPI routes | python-pro |
| 04 | [Services Migration](phase-1-backend-consolidation/04-services-migration.md) | Migrate business logic | python-pro, architect-review |
| 05 | [Database Migrations](phase-1-backend-consolidation/05-database-migrations.md) | Create Alembic migrations | database-architect |
| 06 | [Testing & Validation](phase-1-backend-consolidation/06-testing-validation.md) | Test consolidated backend | test-engineer, security-auditor |

### Phase 2: Frontend Migration (4 prompts)
Update frontend to work with new consolidated backend.

| # | Prompt | Purpose | Skills Used |
|---|--------|---------|-------------|
| 01 | [API Client Update](phase-2-frontend-migration/01-api-client-update.md) | Update Axios configuration | typescript-pro |
| 02 | [Endpoint Mapping](phase-2-frontend-migration/02-endpoint-mapping.md) | Update all API calls | typescript-pro |
| 03 | [Auth Flow Update](phase-2-frontend-migration/03-auth-flow-update.md) | Update authentication integration | typescript-pro, security-auditor |
| 04 | [Integration Testing](phase-2-frontend-migration/04-integration-testing.md) | Test frontend-backend integration | test-engineer |

### Phase 3: UI/UX Modernization (4 prompts)
Modernize the frontend using best practices.

| # | Prompt | Purpose | Skills Used |
|---|--------|---------|-------------|
| 01 | [UI Audit](phase-3-ui-ux-modernization/01-ui-audit.md) | Audit current UI against guidelines | web-design-guidelines, ui-ux-designer |
| 02 | [React Optimization](phase-3-ui-ux-modernization/02-react-optimization.md) | Optimize React/Next.js performance | react-best-practices |
| 03 | [Component Modernization](phase-3-ui-ux-modernization/03-component-modernization.md) | Update UI components | ui-ux-designer |
| 04 | [Accessibility Improvements](phase-3-ui-ux-modernization/04-accessibility-improvements.md) | Improve accessibility | web-design-guidelines |

---

## How to Use These Prompts

1. **Execute sequentially**: Run prompts in order within each phase
2. **Complete each phase**: Finish all prompts in a phase before moving to the next
3. **Copy-paste the prompt**: Each `.md` file contains a ready-to-use prompt
4. **Review outputs**: Verify changes before proceeding to the next prompt

### Example Usage
```
1. Open prompt file: prompts/phase-1-backend-consolidation/01-project-setup.md
2. Copy the prompt content
3. Paste into Claude Code
4. Review and approve changes
5. Move to next prompt
```

---

## Key Mappings Reference

### Microservice → Module Mapping
| Original Microservice | New Module in FastAPI |
|-----------------------|----------------------|
| auth-manager | `app/routes/auth/`, `app/services/auth/` |
| enterprise-manager | `app/routes/enterprises/`, `app/services/enterprises/` |
| project-manager | `app/routes/projects/`, `app/services/projects/` |
| user-manager | `app/routes/users/` (extend existing) |
| asset-manager | `app/routes/assets/`, `app/services/storage/` |
| postgres-database-manager | Core models in `app/models/` |
| mongo-database-manager | `app/routes/patient_records/`, `app/services/mongo/` |
| message-publisher | `app/services/messaging/` (optional: use background tasks) |

### Database Mapping
| Original | New |
|----------|-----|
| Spring JPA Entities | SQLAlchemy Models |
| Spring Data MongoDB | Motor/Beanie for async MongoDB |
| Flyway Migrations | Alembic Migrations |

---

## Estimated Effort

| Phase | Prompts | Complexity |
|-------|---------|------------|
| Phase 1 | 6 | High |
| Phase 2 | 4 | Medium |
| Phase 3 | 4 | Medium |

**Total**: 14 sequential prompts

---

## Prerequisites

Before starting, ensure:
1. All skills are installed (run from project root):
   ```bash
   npx claude-code-templates@latest --agent=programming-languages/python-pro --yes
   npx claude-code-templates@latest --agent=database/database-architect --yes
   npx claude-code-templates@latest --agent=expert-advisors/architect-review --yes
   npx claude-code-templates@latest --agent=development-tools/test-engineer --yes
   npx claude-code-templates@latest --agent=security/security-auditor --yes
   npx claude-code-templates@latest --agent=programming-languages/typescript-pro --yes
   npx claude-code-templates@latest --agent=development-team/ui-ux-designer --yes
   npx add-skill vercel-labs/agent-skills
   ```

2. Backend template is ready at `backend-template-to-use/`
3. Existing architecture is at `existing-architecture-codebase/`
