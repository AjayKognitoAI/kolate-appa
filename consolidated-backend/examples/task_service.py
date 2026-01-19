"""
Example Service: Task

This demonstrates how to create a service layer in the template.

Key Points:
- Inherit from CRUDService for basic CRUD operations
- Add custom business logic methods
- Keep all business logic in services (NOT in routes)
- Use async/await consistently
- Raise exceptions for error cases
- Services are stateless (use dependency injection)
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional
from datetime import datetime

from app.services.crud_service import CRUDService
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.exceptions import NotFoundException, ForbiddenException


class TaskService(CRUDService[Task, TaskCreate, TaskUpdate]):
    """
    Service for managing tasks.

    Inherits basic CRUD operations from CRUDService:
    - create(db, obj_in)
    - get_by_id(db, id)
    - get_multi(db, skip, limit)
    - update(db, id, obj_in)
    - delete(db, id)
    """

    def __init__(self):
        super().__init__(Task)

    # ========================================================================
    # Custom Query Methods
    # ========================================================================

    async def get_user_tasks(
        self, db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100
    ) -> List[Task]:
        """
        Get all tasks for a specific user.

        Args:
            db: Database session
            user_id: User ID to filter by
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            List of tasks belonging to the user
        """
        result = await db.execute(
            select(Task)
            .where(Task.user_id == user_id)
            .order_by(Task.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_completed_tasks(
        self, db: AsyncSession, user_id: str
    ) -> List[Task]:
        """
        Get all completed tasks for a user.

        Args:
            db: Database session
            user_id: User ID to filter by

        Returns:
            List of completed tasks
        """
        result = await db.execute(
            select(Task).where(
                and_(Task.user_id == user_id, Task.is_completed == True)
            )
        )
        return result.scalars().all()

    async def get_pending_tasks(self, db: AsyncSession, user_id: str) -> List[Task]:
        """
        Get all pending (incomplete) tasks for a user.

        Args:
            db: Database session
            user_id: User ID to filter by

        Returns:
            List of pending tasks
        """
        result = await db.execute(
            select(Task).where(
                and_(Task.user_id == user_id, Task.is_completed == False)
            )
        )
        return result.scalars().all()

    async def search_tasks(
        self, db: AsyncSession, user_id: str, query: str
    ) -> List[Task]:
        """
        Search tasks by title or description.

        Args:
            db: Database session
            user_id: User ID to filter by
            query: Search query string

        Returns:
            List of tasks matching the search query
        """
        result = await db.execute(
            select(Task).where(
                and_(
                    Task.user_id == user_id,
                    or_(
                        func.lower(Task.title).contains(query.lower()),
                        func.lower(Task.description).contains(query.lower()),
                    ),
                )
            )
        )
        return result.scalars().all()

    async def count_user_tasks(self, db: AsyncSession, user_id: str) -> int:
        """
        Count total tasks for a user.

        Args:
            db: Database session
            user_id: User ID to filter by

        Returns:
            Total number of tasks
        """
        result = await db.execute(
            select(func.count(Task.id)).where(Task.user_id == user_id)
        )
        return result.scalar_one()

    # ========================================================================
    # Business Logic Methods
    # ========================================================================

    async def create_task_for_user(
        self, db: AsyncSession, task_data: dict, user_id: str
    ) -> Task:
        """
        Create a new task for a specific user.

        Business Rules:
        - Title is required and must not be empty
        - Task is assigned to the specified user

        Args:
            db: Database session
            task_data: Task data dictionary
            user_id: ID of the user creating the task

        Returns:
            Created task

        Raises:
            ValidationException: If title is empty
        """
        # Business logic: Ensure title is not just whitespace
        if not task_data.get("title", "").strip():
            from app.exceptions import ValidationException

            raise ValidationException("Task title cannot be empty")

        # Set the user_id
        task_data["user_id"] = user_id

        # Create the task using inherited method
        return await self.create(db, task_data)

    async def complete_task(
        self, db: AsyncSession, task_id: str, user_id: str
    ) -> Task:
        """
        Mark a task as completed.

        Business Rules:
        - Only the task owner can complete it
        - Task must exist

        Args:
            db: Database session
            task_id: ID of the task to complete
            user_id: ID of the user requesting completion

        Returns:
            Updated task

        Raises:
            NotFoundException: If task doesn't exist
            ForbiddenException: If user doesn't own the task
        """
        # Get the task
        task = await self.get_by_id(db, task_id)

        # Business rule: User must own the task
        if task.user_id != user_id:
            raise ForbiddenException("You can only complete your own tasks")

        # Business rule: Task already completed?
        if task.is_completed:
            # You could raise an exception or just return the task
            return task

        # Mark as completed
        task.is_completed = True
        await db.commit()
        await db.refresh(task)

        return task

    async def uncomplete_task(
        self, db: AsyncSession, task_id: str, user_id: str
    ) -> Task:
        """
        Mark a task as incomplete.

        Args:
            db: Database session
            task_id: ID of the task
            user_id: ID of the user requesting the change

        Returns:
            Updated task

        Raises:
            NotFoundException: If task doesn't exist
            ForbiddenException: If user doesn't own the task
        """
        task = await self.get_by_id(db, task_id)

        if task.user_id != user_id:
            raise ForbiddenException("You can only modify your own tasks")

        task.is_completed = False
        await db.commit()
        await db.refresh(task)

        return task

    async def bulk_complete_tasks(
        self, db: AsyncSession, task_ids: List[str], user_id: str
    ) -> int:
        """
        Mark multiple tasks as completed.

        Business Rules:
        - Only complete tasks owned by the user
        - Skip tasks that don't exist or are already completed

        Args:
            db: Database session
            task_ids: List of task IDs to complete
            user_id: User ID requesting the operation

        Returns:
            Number of tasks successfully completed
        """
        completed_count = 0

        for task_id in task_ids:
            try:
                await self.complete_task(db, task_id, user_id)
                completed_count += 1
            except (NotFoundException, ForbiddenException):
                # Skip tasks that don't exist or user doesn't own
                continue

        return completed_count

    async def delete_completed_tasks(
        self, db: AsyncSession, user_id: str
    ) -> int:
        """
        Delete all completed tasks for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Number of tasks deleted
        """
        completed_tasks = await self.get_completed_tasks(db, user_id)

        for task in completed_tasks:
            await self.delete(db, task.id)

        return len(completed_tasks)

    # ========================================================================
    # Authorization Helper Methods
    # ========================================================================

    async def verify_task_ownership(
        self, db: AsyncSession, task_id: str, user_id: str
    ) -> Task:
        """
        Verify that a user owns a specific task.

        This is a helper method to use before operations that require ownership.

        Args:
            db: Database session
            task_id: Task ID
            user_id: User ID to verify

        Returns:
            The task if ownership is verified

        Raises:
            NotFoundException: If task doesn't exist
            ForbiddenException: If user doesn't own the task
        """
        task = await self.get_by_id(db, task_id)

        if task.user_id != user_id:
            raise ForbiddenException("You don't have permission to access this task")

        return task

    # ========================================================================
    # Statistics Methods (Optional)
    # ========================================================================

    async def get_task_statistics(self, db: AsyncSession, user_id: str) -> dict:
        """
        Get task statistics for a user.

        Returns:
            Dictionary with task statistics
        """
        total = await self.count_user_tasks(db, user_id)
        completed = len(await self.get_completed_tasks(db, user_id))
        pending = total - completed

        return {
            "total": total,
            "completed": completed,
            "pending": pending,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
        }


# Singleton instance to import in routes
task_service = TaskService()


# ============================================================================
# Usage Example in Routes
# ============================================================================
"""
from app.services.task_service import task_service

@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task_dict = task_data.model_dump()
    return await task_service.create_task_for_user(db, task_dict, current_user.id)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await task_service.complete_task(db, task_id, current_user.id)
"""
