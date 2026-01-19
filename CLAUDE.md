# Kolate App - AI Migration Assistant Guide

This file provides context for Claude to assist with the Kolate App migration project.

## Project Overview

**Goal**: Migrate from Spring Boot microservices to a consolidated FastAPI backend, then modernize the frontend.

### Current Architecture
- **13 Spring Boot Microservices** in `existing-architecture-codebase/`
- **Next.js 15 Frontend** with MUI v7, Redux, NextAuth
- **Databases**: PostgreSQL (multi-tenant), MongoDB, Redis

### Target Architecture
- **Single FastAPI Backend** (template in `backend-template-to-use/`)
- **Schema-based multi-tenancy** (PostgreSQL schemas per org)
- **Same frontend** updated for new API endpoints

---

## Migration Prompts Location

Sequential prompts are in `prompts/` folder:
- **Phase 0**: `prompts/phase-0-context-building/` (3 prompts) - **START HERE**
- **Phase 1**: `prompts/phase-1-backend-consolidation/` (6 prompts)
- **Phase 2**: `prompts/phase-2-frontend-migration/` (4 prompts)
- **Phase 3**: `prompts/phase-3-ui-ux-modernization/` (4 prompts)

**Important**: Start with Phase 0 to build context before implementing changes. Execute prompts in order. See `prompts/README.md` for full overview.

---

## Skills Reference

When working on this project, apply these specialized guidelines:

### Python/FastAPI Development (python-pro)

When writing Python/FastAPI code:
- Use async/await for all database and I/O operations
- Follow PEP 8 style guide
- Use type hints throughout
- Use Pydantic for validation
- Prefer composition over inheritance
- Use dependency injection via FastAPI's Depends()
- Handle errors with proper HTTP exceptions
- Write docstrings for public functions

```python
# Example pattern
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.get("/{id}", response_model=ResponseSchema)
async def get_item(
    id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
):
    """Get item by ID."""
    service = ItemService()
    item = await service.get_by_id(db, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

### TypeScript/React Development (typescript-pro)

When writing TypeScript/React code:
- Use strict TypeScript configuration
- Prefer functional components with hooks
- Use proper typing for props and state
- Avoid `any` type - use `unknown` if needed
- Use React Query or SWR for data fetching
- Implement proper error boundaries
- Follow React naming conventions (PascalCase for components)

```typescript
// Example pattern
interface UserCardProps {
  user: User;
  onSelect: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(user.id);
  }, [user.id, onSelect]);

  return (
    <Card onClick={handleClick}>
      <Typography>{user.name}</Typography>
    </Card>
  );
};
```

### Database Architecture (database-architect)

When designing database schemas:
- Use UUID for primary keys on main entities
- Add created_at/updated_at timestamps
- Use proper foreign key constraints with ON DELETE behavior
- Create indexes for frequently queried fields
- Use JSONB for flexible data structures
- Implement soft deletes for important entities

```sql
-- Multi-tenant table pattern
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(64) NOT NULL,  -- Tenant identifier
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(organization_id);
```

### Security Auditing (security-auditor)

When reviewing code for security:
- Check for SQL injection vulnerabilities (use parameterized queries)
- Verify XSS prevention (output encoding)
- Ensure authentication on all endpoints
- Validate authorization/permissions
- Check for sensitive data exposure in logs
- Verify CORS configuration
- Check for rate limiting
- Ensure secrets are not hardcoded

### Testing (test-engineer)

When writing tests:
- Write unit tests for services
- Write integration tests for API endpoints
- Use pytest for Python, Jest for TypeScript
- Mock external dependencies
- Test error cases and edge conditions
- Aim for >80% code coverage

```python
# Python test pattern
@pytest.mark.asyncio
async def test_create_enterprise(mock_db):
    service = EnterpriseService()
    data = EnterpriseCreate(name="Test", admin_email="admin@test.com")

    result = await service.create(mock_db, data)

    assert result.name == "Test"
    mock_db.add.assert_called_once()
```

### React Performance (react-best-practices)

When optimizing React applications:

**Eliminate Waterfalls**
```typescript
// Bad: Sequential fetching
useEffect(() => { fetchUser().then(u => fetchProjects(u.id)) }, []);

// Good: Parallel fetching
const { data } = useQuery(['dashboard'], () =>
  Promise.all([fetchUser(), fetchProjects()])
);
```

**Optimize Re-renders**
```typescript
// Use useMemo for expensive calculations
const filtered = useMemo(() => items.filter(i => i.active), [items]);

// Use useCallback for callbacks passed to children
const handleClick = useCallback(() => onSelect(id), [id, onSelect]);

// Use React.memo for pure components
const Card = memo(({ data }) => <div>{data.name}</div>);
```

**Code Splitting**
```typescript
// Dynamic imports for routes
const AdminPage = dynamic(() => import('./AdminPage'), {
  loading: () => <Skeleton />
});
```

### UI/UX & Accessibility (web-design-guidelines)

When building UI components:

**Accessibility (WCAG 2.1 AA)**
- Minimum 4.5:1 color contrast for text
- All interactive elements keyboard accessible
- Proper ARIA labels for icons and buttons
- Form inputs must have visible labels
- Focus indicators must be visible

```typescript
// Good: Accessible button
<IconButton
  onClick={handleDelete}
  aria-label={`Delete ${itemName}`}
>
  <DeleteIcon />
</IconButton>

// Good: Accessible form field
<TextField
  id="email"
  label="Email Address"
  aria-describedby="email-helper"
  error={!!errors.email}
  helperText={errors.email?.message}
/>
```

**Responsive Design**
- Mobile-first approach
- Touch targets minimum 44x44px
- Test at breakpoints: 320px, 768px, 1024px, 1280px

**Loading States**
- Use skeleton screens for content loading
- Show progress indicators for long operations
- Provide feedback for user actions

---

## Key File Locations

### Backend Template
- Entry: `backend-template-to-use/app/main.py`
- Routes: `backend-template-to-use/app/routes/`
- Models: `backend-template-to-use/app/models/`
- Services: `backend-template-to-use/app/services/`
- Auth: `backend-template-to-use/app/core/permissions.py`
- Generic CRUD: `backend-template-to-use/app/routes/crud_router.py`

### Existing Microservices
- Core services: `existing-architecture-codebase/core-microservices/`
- Database services: `existing-architecture-codebase/default-microservices/`
- Frontend: `existing-architecture-codebase/frontend/`

### Migration Prompts
- Overview: `prompts/README.md`
- Phase 0 (Context): `prompts/phase-0-context-building/`
- Phase 1 (Backend): `prompts/phase-1-backend-consolidation/`
- Phase 2 (Frontend): `prompts/phase-2-frontend-migration/`
- Phase 3 (UI/UX): `prompts/phase-3-ui-ux-modernization/`

---

## Multi-Tenancy Pattern

This project uses **schema-based multi-tenancy**:

```
PostgreSQL Database: kolate_db
├── public (shared: enterprises, modules, trials)
├── org_abc123 (tenant: users, projects, roles)
├── org_def456 (tenant: users, projects, roles)
└── org_xyz789 (tenant: users, projects, roles)
```

Implementation:
```python
# Set tenant schema based on org-id header
async def set_tenant_schema(db: AsyncSession, org_id: str):
    schema_name = f"org_{org_id}"
    await db.execute(text(f"SET search_path TO {schema_name}, public"))
```

---

## API Endpoint Mapping

| Old (Spring Boot) | New (FastAPI) |
|-------------------|---------------|
| `/api/auth-manager/v1/*` | `/api/v1/auth/*` |
| `/api/enterprise-manager/v1/*` | `/api/v1/enterprises/*` |
| `/api/project-manager/v1/*` | `/api/v1/projects/*` |
| `/api/user-manager/v1/*` | `/api/v1/users/*` |
| `/api/asset-manager/v1/*` | `/api/v1/assets/*` |

---

## Commands

### Backend Development
```bash
cd backend-template-to-use
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd existing-architecture-codebase/frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend
pytest tests/ -v --cov=app

# Frontend
npm test
```

---

## When Asked to Implement

1. **Read the relevant prompt** from `prompts/` first
2. **Apply the skills** documented above
3. **Follow existing patterns** in the codebase
4. **Write tests** for new code
5. **Check security** implications

## Quick Reference for Common Tasks

- **Add new model**: Follow pattern in `backend-template-to-use/app/models/`
- **Add new route**: Use CRUDRouter in `backend-template-to-use/app/routes/crud_router.py`
- **Add new service**: Extend CRUDService in `backend-template-to-use/app/services/crud_service.py`
- **Update frontend API**: Modify `src/services/api/` files
- **Add frontend component**: Follow patterns in `src/components/`
