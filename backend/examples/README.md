# Example Entity Implementation

This directory contains a complete reference implementation of a "Task" entity to demonstrate how to extend this template with your own domain models.

## What's Included

This example shows:
- ✅ Model definition with relationships
- ✅ Schema definitions (Create, Update, Response)
- ✅ Service layer with custom business logic
- ✅ Two route implementations:
  - **Manual routes** with full control
  - **Generic CRUD router** for rapid development
- ✅ RBAC integration (permission checks)
- ✅ Example migration file

## The Task Entity

A simple TODO task system where:
- Each task belongs to a user
- Tasks have a title, description, and completion status
- Users can only manage their own tasks
- Admins can manage all tasks

## File Structure

```
examples/
├── README.md                    # This file
├── task_model.py                # SQLAlchemy model
├── task_schema.py               # Pydantic schemas
├── task_service.py              # Business logic layer
├── task_routes_manual.py        # Manual route implementation
├── task_routes_generic.py       # Using generic crud_router
└── task_migration_example.py    # Example migration file
```

## How to Use This Example

### Option 1: Copy and Modify

1. Copy files to appropriate directories:
   ```bash
   cp examples/task_model.py app/models/your_entity.py
   cp examples/task_schema.py app/schemas/your_entity.py
   cp examples/task_service.py app/services/your_entity_service.py
   cp examples/task_routes_manual.py app/routes/your_entity.py
   ```

2. Search and replace "Task" with "YourEntity"

3. Modify fields to match your requirements

4. Register the router in `app/routes/__init__.py`

### Option 2: Actually Add Tasks to the Template

If you want to test with the actual Task entity:

1. **Copy files**:
   ```bash
   cp examples/task_model.py app/models/task.py
   cp examples/task_schema.py app/schemas/task.py
   cp examples/task_service.py app/services/task_service.py
   cp examples/task_routes_manual.py app/routes/tasks.py
   ```

2. **Update User model** (`app/models/user.py`):
   ```python
   # Add this relationship
   tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
   ```

3. **Register router** (`app/routes/__init__.py`):
   ```python
   from .tasks import router as tasks_router

   # Add after other routers
   api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
   ```

4. **Create migration**:
   ```bash
   make migrate-create
   # Message: "add tasks table"
   ```

5. **Review and apply migration**:
   ```bash
   make migrate
   ```

6. **Test the API**:
   - Visit http://localhost:8000/docs
   - Login to get access token
   - Try the `/api/v1/tasks` endpoints

## Key Patterns Demonstrated

### 1. Model with Relationships

```python
# Foreign key to another table
user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

# Relationship definition
user = relationship("User", back_populates="tasks")
```

### 2. Schema Separation

- `TaskBase`: Common fields
- `TaskCreate`: Fields required for creation
- `TaskUpdate`: All fields optional for partial updates
- `TaskResponse`: What the API returns (includes timestamps, IDs)

### 3. Service Layer Patterns

```python
class TaskService(CRUDService[Task, TaskCreate, TaskUpdate]):
    # Inherit basic CRUD from generic base

    # Add custom business logic
    async def complete_task(self, db, task_id: str):
        # Your business logic here
        pass
```

### 4. Route Patterns

**Authorization Checks**:
```python
# Check resource ownership
if task.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Not authorized")
```

**Using Permissions**:
```python
from app.core.permissions import require_permission

@router.delete("/{task_id}")
@require_permission("tasks:delete")
async def delete_task(...):
    ...
```

**Pagination** (see generic router example):
```python
@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    ...
):
    return await task_service.get_multi(db, skip=skip, limit=limit)
```

### 5. Two Approaches to Routes

#### Manual Routes (Full Control)

Best when:
- You need custom business logic
- You need complex authorization rules
- You need custom query parameters
- You want complete control

See: `task_routes_manual.py`

#### Generic CRUD Router (Rapid Development)

Best when:
- You have standard CRUD operations
- You don't need custom logic
- You want to prototype quickly
- Basic auth is sufficient

See: `task_routes_generic.py`

You can **mix both approaches** - use generic router for basic operations, then add custom routes for special cases:

```python
# Start with generic router
from app.routes.crud_router import create_crud_router
router = create_crud_router(...)

# Add custom routes
@router.post("/{task_id}/complete")
async def complete_task(...):
    ...
```

## Testing Your Implementation

### Manual Testing

1. Start the development environment:
   ```bash
   make dev
   ```

2. Open Swagger UI: http://localhost:8000/docs

3. Login to get access token

4. Test your endpoints

### Unit Testing

Create `tests/test_tasks.py`:

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_task(client: AsyncClient, auth_headers):
    response = await client.post(
        "/api/v1/tasks",
        json={
            "title": "Test Task",
            "description": "Test description",
            "is_completed": False
        },
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["is_completed"] is False

@pytest.mark.asyncio
async def test_list_tasks(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/v1/tasks",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

Run tests:
```bash
make test
```

## Adding RBAC Permissions

If you want permission-based access control:

1. **Add to `seed_data.py`**:

```python
# In features_data
{"name": "tasks", "description": "Task management functionality"},

# In permission_combinations
("tasks", "read"),
("tasks", "write"),
("tasks", "delete"),
("tasks", "read:self"),
("tasks", "write:self"),
("tasks", "delete:self"),
```

2. **Update roles** (in `seed_default_roles`):

```python
# Add to User role permissions
"tasks:read:self",
"tasks:write:self",
"tasks:delete:self",

# Add to Admin role (already has all permissions)
```

3. **Re-seed database**:
```bash
make seed
```

4. **Use in routes**:

```python
from app.core.permissions import require_permission

@router.post("/")
@require_permission("tasks:write:self")
async def create_task(...):
    ...
```

## Common Modifications

### Add Enum Field

```python
# In model
from enum import Enum as PyEnum

class TaskPriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Task(BaseModel):
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)

# In schema
from enum import Enum

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TaskBase(BaseModel):
    priority: TaskPriority = TaskPriority.MEDIUM
```

### Add Timestamps

Already included via `BaseModel`:
- `created_at`: Auto-set on creation
- `updated_at`: Auto-updated on modification

### Add Soft Delete

```python
# In model
class Task(BaseModel):
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

# In service
async def soft_delete(self, db, task_id: str):
    task = await self.get_by_id(db, task_id)
    task.is_deleted = True
    task.deleted_at = datetime.utcnow()
    await db.commit()
    return task
```

### Add Full-Text Search

```python
# In service
async def search_tasks(self, db, query: str):
    from sqlalchemy import or_, func
    result = await db.execute(
        select(Task).where(
            or_(
                func.lower(Task.title).contains(query.lower()),
                func.lower(Task.description).contains(query.lower())
            )
        )
    )
    return result.scalars().all()
```

## Next Steps

1. Read the main `TEMPLATE_USAGE.md` for more details
2. Review `ARCHITECTURE.md` for architectural patterns
3. Check the FastAPI documentation for advanced features
4. Start building your domain models!

## Questions?

- Check `TEMPLATE_USAGE.md` for detailed guides
- Check `ARCHITECTURE.md` for design patterns
- Review the existing framework code in `app/`
- Consult FastAPI and SQLAlchemy documentation
