"""
Example Routes: Task (Manual Implementation)

This demonstrates how to manually create route handlers with full control.

Key Points:
- Use FastAPI dependency injection
- Keep routes thin (delegate to services)
- Proper HTTP status codes
- Authorization checks
- Response models for automatic validation
- Query parameters for filtering/pagination
- Error handling through exceptions

Use this approach when you need:
- Custom business logic
- Complex authorization rules
- Custom query parameters
- Complete control over the API
"""

from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.permissions import require_permission
from app.services.auth_service import get_current_user
from app.services.task_service import task_service
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.models.user import User
from app.exceptions import NotFoundException, ForbiddenException

router = APIRouter()


# ============================================================================
# Create Operations
# ============================================================================


@router.post(
    "/",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
    description="Create a new task for the authenticated user",
)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new task.

    The task will be automatically assigned to the authenticated user.

    - **title**: Task title (required, 1-255 characters)
    - **description**: Optional task description
    - **is_completed**: Task completion status (defaults to False)
    """
    task_dict = task_data.model_dump()
    return await task_service.create_task_for_user(db, task_dict, current_user.id)


# ============================================================================
# Read Operations
# ============================================================================


@router.get(
    "/",
    response_model=List[TaskResponse],
    summary="List all tasks",
    description="Get a list of tasks for the authenticated user with optional filtering",
)
async def list_tasks(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=100, description="Max items to return"),
    completed: bool | None = Query(
        None, description="Filter by completion status (true/false)"
    ),
    search: str | None = Query(None, description="Search in title and description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all tasks for the current user.

    Supports filtering and pagination:
    - **skip**: Offset for pagination
    - **limit**: Maximum number of results (1-100)
    - **completed**: Filter by completion status
    - **search**: Search query for title/description
    """
    # Apply filters based on query parameters
    if search:
        tasks = await task_service.search_tasks(db, current_user.id, search)
    elif completed is not None:
        if completed:
            tasks = await task_service.get_completed_tasks(db, current_user.id)
        else:
            tasks = await task_service.get_pending_tasks(db, current_user.id)
    else:
        tasks = await task_service.get_user_tasks(db, current_user.id, skip, limit)

    return tasks


@router.get(
    "/stats",
    summary="Get task statistics",
    description="Get statistics about user's tasks",
)
async def get_task_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get task statistics for the current user.

    Returns:
    - Total tasks
    - Completed tasks
    - Pending tasks
    - Completion rate (percentage)
    """
    return await task_service.get_task_statistics(db, current_user.id)


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get a specific task",
    description="Retrieve details of a specific task by ID",
)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific task by ID.

    Only the task owner can retrieve the task.

    Raises:
    - 404: Task not found
    - 403: User doesn't own the task
    """
    # Verify ownership (raises exception if not owned)
    task = await task_service.verify_task_ownership(db, task_id, current_user.id)
    return task


# ============================================================================
# Update Operations
# ============================================================================


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update a task",
    description="Update an existing task (full update)",
)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing task.

    Only the task owner can update it.
    All fields are optional (partial update supported).

    Raises:
    - 404: Task not found
    - 403: User doesn't own the task
    """
    # Verify ownership first
    await task_service.verify_task_ownership(db, task_id, current_user.id)

    # Update the task
    return await task_service.update(db, task_id, task_data.model_dump(exclude_unset=True))


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Partially update a task",
    description="Update specific fields of a task",
)
async def patch_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Partially update a task.

    Same as PUT but semantically indicates partial update.
    Only provided fields will be updated.

    Raises:
    - 404: Task not found
    - 403: User doesn't own the task
    """
    await task_service.verify_task_ownership(db, task_id, current_user.id)
    return await task_service.update(db, task_id, task_data.model_dump(exclude_unset=True))


# ============================================================================
# Delete Operations
# ============================================================================


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
    description="Delete a specific task",
)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a task.

    Only the task owner can delete it.

    Raises:
    - 404: Task not found
    - 403: User doesn't own the task
    """
    # Verify ownership
    await task_service.verify_task_ownership(db, task_id, current_user.id)

    # Delete the task
    await task_service.delete(db, task_id)


@router.delete(
    "/completed/all",
    summary="Delete all completed tasks",
    description="Delete all completed tasks for the current user",
)
async def delete_completed_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all completed tasks for the current user.

    Returns the number of tasks deleted.
    """
    deleted_count = await task_service.delete_completed_tasks(db, current_user.id)
    return {"deleted_count": deleted_count, "message": f"Deleted {deleted_count} completed tasks"}


# ============================================================================
# Custom Action Endpoints
# ============================================================================


@router.post(
    "/{task_id}/complete",
    response_model=TaskResponse,
    summary="Mark task as completed",
    description="Mark a specific task as completed",
)
async def complete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a task as completed.

    This is a convenience endpoint that's more RESTful than
    using PATCH with is_completed=true.

    Raises:
    - 404: Task not found
    - 403: User doesn't own the task
    """
    return await task_service.complete_task(db, task_id, current_user.id)


@router.post(
    "/{task_id}/uncomplete",
    response_model=TaskResponse,
    summary="Mark task as incomplete",
    description="Mark a specific task as incomplete",
)
async def uncomplete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a task as incomplete (reopen it).

    Useful when a task needs to be redone.

    Raises:
    - 404: Task not found
    - 403: User doesn't own the task
    """
    return await task_service.uncomplete_task(db, task_id, current_user.id)


@router.post(
    "/bulk/complete",
    summary="Complete multiple tasks",
    description="Mark multiple tasks as completed at once",
)
async def bulk_complete_tasks(
    task_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete multiple tasks at once.

    Provide a list of task IDs to mark as completed.
    Only tasks owned by the current user will be completed.

    Returns the number of successfully completed tasks.
    """
    completed_count = await task_service.bulk_complete_tasks(db, task_ids, current_user.id)
    return {
        "completed_count": completed_count,
        "message": f"Completed {completed_count} out of {len(task_ids)} tasks",
    }


# ============================================================================
# Admin Endpoints (with RBAC)
# ============================================================================


@router.get(
    "/admin/all",
    response_model=List[TaskResponse],
    summary="Admin: List all tasks",
    description="Get all tasks from all users (admin only)",
)
@require_permission("tasks:admin")
async def admin_list_all_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin endpoint to list all tasks across all users.

    Requires 'tasks:admin' permission.
    """
    return await task_service.get_multi(db, skip=skip, limit=limit)


@router.delete(
    "/admin/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin: Delete any task",
    description="Delete any task regardless of ownership (admin only)",
)
@require_permission("tasks:admin")
async def admin_delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Admin endpoint to delete any task.

    Requires 'tasks:admin' permission.
    """
    await task_service.delete(db, task_id)


# ============================================================================
# How to register this router in app/routes/__init__.py
# ============================================================================
"""
from .tasks import router as tasks_router

# Add after other router registrations
api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
"""
