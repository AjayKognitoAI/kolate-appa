"""
Example Routes: Task (Using Generic CRUD Router)

This demonstrates how to use the built-in generic CRUD router for rapid development.

Key Points:
- Automatic CRUD endpoints (Create, Read, Update, Delete, List)
- Less code to write and maintain
- Consistent API patterns across entities
- Can be extended with custom routes
- Great for prototyping and simple CRUD operations

Use this approach when:
- You have standard CRUD operations
- You don't need complex business logic
- You want to prototype quickly
- Basic authentication is sufficient
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.routes.crud_router import create_crud_router
from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.task_service import task_service
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.models.user import User


# ============================================================================
# Option 1: Pure Generic Router (Simplest)
# ============================================================================

# This creates a fully functional CRUD API with just a few lines:
router = create_crud_router(
    service=task_service,
    create_schema=TaskCreate,
    update_schema=TaskUpdate,
    response_schema=TaskResponse,
    tags=["tasks"],
    prefix="/tasks",
    require_auth=True,  # Require authentication for all endpoints
)

# That's it! You now have:
# - POST /tasks          - Create a task
# - GET /tasks/{id}      - Get a task by ID
# - GET /tasks           - List tasks (with pagination)
# - PUT /tasks/{id}      - Update a task
# - DELETE /tasks/{id}   - Delete a task


# ============================================================================
# Option 2: Generic Router + Custom Routes (Recommended)
# ============================================================================

# Start with the generic router, then add custom endpoints:

router = create_crud_router(
    service=task_service,
    create_schema=TaskCreate,
    update_schema=TaskUpdate,
    response_schema=TaskResponse,
    tags=["tasks"],
    require_auth=True,
)

# Now add custom routes to the same router:


@router.post(
    "/{task_id}/complete",
    response_model=TaskResponse,
    summary="Mark task as completed",
)
async def complete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Custom endpoint to complete a task.

    This is added to the generic router to extend functionality.
    """
    return await task_service.complete_task(db, task_id, current_user.id)


@router.post(
    "/{task_id}/uncomplete",
    response_model=TaskResponse,
    summary="Mark task as incomplete",
)
async def uncomplete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Custom endpoint to reopen a task."""
    return await task_service.uncomplete_task(db, task_id, current_user.id)


@router.get(
    "/stats",
    summary="Get task statistics",
)
async def get_task_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Custom endpoint to get task statistics."""
    return await task_service.get_task_statistics(db, current_user.id)


@router.get(
    "/search",
    response_model=List[TaskResponse],
    summary="Search tasks",
)
async def search_tasks(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Custom search endpoint."""
    return await task_service.search_tasks(db, current_user.id, q)


# ============================================================================
# Option 3: Customized Generic Router
# ============================================================================

"""
You can also customize the generic router behavior:

router = create_crud_router(
    service=task_service,
    create_schema=TaskCreate,
    update_schema=TaskUpdate,
    response_schema=TaskResponse,
    tags=["tasks"],
    require_auth=True,

    # Customize which endpoints to include
    include_create=True,
    include_read=True,
    include_update=True,
    include_delete=True,
    include_list=True,

    # Customize permissions (if RBAC is set up)
    create_permission="tasks:write",
    read_permission="tasks:read",
    update_permission="tasks:write",
    delete_permission="tasks:delete",

    # Customize endpoint names/descriptions
    create_summary="Create a new task",
    read_summary="Get a specific task",
    list_summary="List all tasks",
    update_summary="Update a task",
    delete_summary="Delete a task",
)
"""


# ============================================================================
# Comparison: Generic vs Manual
# ============================================================================

"""
GENERIC ROUTER PROS:
✅ Very little code to write
✅ Consistent API patterns
✅ Automatic OpenAPI documentation
✅ Fast prototyping
✅ Easy to maintain
✅ Can be extended with custom routes

GENERIC ROUTER CONS:
❌ Less control over behavior
❌ May not fit complex requirements
❌ Harder to add custom authorization logic
❌ Less flexible for non-standard operations


MANUAL ROUTES PROS:
✅ Complete control over behavior
✅ Custom business logic anywhere
✅ Complex authorization rules
✅ Custom query parameters
✅ Better for complex domains

MANUAL ROUTES CONS:
❌ More code to write
❌ More code to maintain
❌ Need to handle edge cases
❌ Potential for inconsistency


RECOMMENDATION:
- Start with Generic Router for prototyping
- Switch to Manual Routes when you need more control
- Or mix both: Use Generic for basic CRUD, add Manual for custom operations
"""


# ============================================================================
# What the Generic Router Creates
# ============================================================================

"""
When you use create_crud_router(), you automatically get these endpoints:

1. POST /tasks
   - Request: TaskCreate schema
   - Response: TaskResponse schema
   - Creates a new task

2. GET /tasks/{id}
   - Response: TaskResponse schema
   - Gets a specific task by ID
   - Returns 404 if not found

3. GET /tasks
   - Query params: skip (int), limit (int)
   - Response: List[TaskResponse]
   - Lists tasks with pagination
   - Default: skip=0, limit=100

4. PUT /tasks/{id}
   - Request: TaskUpdate schema
   - Response: TaskResponse schema
   - Updates a task (partial update supported)
   - Returns 404 if not found

5. DELETE /tasks/{id}
   - Response: 204 No Content
   - Deletes a task
   - Returns 404 if not found

All endpoints:
- Use async/await
- Include proper error handling
- Return appropriate HTTP status codes
- Include OpenAPI documentation
- Support authentication if require_auth=True
"""


# ============================================================================
# Advanced: Overriding Generic Router Behavior
# ============================================================================

"""
If you need to customize the generic router behavior, you can create
a custom router factory:

from app.routes.crud_router import CRUDRouter

class TaskCRUDRouter(CRUDRouter):
    async def create(self, *args, **kwargs):
        # Custom create logic
        task = await super().create(*args, **kwargs)
        # Do something after creation
        return task

router = TaskCRUDRouter(
    service=task_service,
    create_schema=TaskCreate,
    ...
).get_router()
"""


# ============================================================================
# How to register this router in app/routes/__init__.py
# ============================================================================
"""
from .tasks import router as tasks_router

# The prefix is already set in create_crud_router if you provided it,
# otherwise add it here:
api_router.include_router(tasks_router, tags=["tasks"])

# Or if you didn't set prefix in create_crud_router:
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
"""
