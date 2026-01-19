"""
Background Task Service

Provides async task execution for operations that previously used Kafka.
Uses FastAPI's BackgroundTasks for simple async operations and provides
a unified interface for scheduling background work.
"""

import asyncio
import logging
from typing import Callable, Any, Dict, Optional, List
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor

from app.config.settings import settings

logger = logging.getLogger(__name__)


class TaskPriority(str, Enum):
    """Task priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    """Task execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TaskResult:
    """Result of a background task execution."""
    task_id: str
    status: TaskStatus
    result: Optional[Any] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class BackgroundTask:
    """Represents a scheduled background task."""
    task_id: str
    name: str
    func: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: Dict[str, Any] = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    result: Optional[TaskResult] = None


class BackgroundTaskService:
    """
    Background task service for async operations.

    Replaces Kafka event handling with in-process async task execution.
    For production use with high-volume tasks, consider integrating Celery.

    Event Types Handled:
    - Admin lifecycle (create, update, delete)
    - Email notifications
    - Infrastructure provisioning callbacks
    - Audit logging
    """

    def __init__(self):
        self._tasks: Dict[str, BackgroundTask] = {}
        self._executor = ThreadPoolExecutor(
            max_workers=settings.BACKGROUND_TASK_MAX_WORKERS
        )
        self._running = False

    async def start(self):
        """Start the background task processor."""
        self._running = True
        logger.info("BackgroundTaskService started")

    async def stop(self):
        """Stop the background task processor."""
        self._running = False
        self._executor.shutdown(wait=True)
        logger.info("BackgroundTaskService stopped")

    def schedule_task(
        self,
        name: str,
        func: Callable,
        *args,
        priority: TaskPriority = TaskPriority.NORMAL,
        **kwargs
    ) -> str:
        """
        Schedule a background task for execution.

        Args:
            name: Task name for identification
            func: Async or sync function to execute
            *args: Positional arguments for the function
            priority: Task priority level
            **kwargs: Keyword arguments for the function

        Returns:
            str: Task ID for tracking
        """
        import uuid
        task_id = str(uuid.uuid4())

        task = BackgroundTask(
            task_id=task_id,
            name=name,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
        )

        self._tasks[task_id] = task
        logger.info(f"Scheduled task: {name} (id={task_id})")

        # Execute immediately (in a fire-and-forget manner)
        asyncio.create_task(self._execute_task(task))

        return task_id

    async def _execute_task(self, task: BackgroundTask):
        """Execute a background task."""
        task.status = TaskStatus.RUNNING
        started_at = datetime.utcnow()

        try:
            logger.info(f"Executing task: {task.name} (id={task.task_id})")

            # Check if function is async
            if asyncio.iscoroutinefunction(task.func):
                result = await task.func(*task.args, **task.kwargs)
            else:
                # Run sync function in thread pool
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    self._executor,
                    lambda: task.func(*task.args, **task.kwargs)
                )

            task.status = TaskStatus.COMPLETED
            task.result = TaskResult(
                task_id=task.task_id,
                status=TaskStatus.COMPLETED,
                result=result,
                started_at=started_at,
                completed_at=datetime.utcnow()
            )

            logger.info(f"Task completed: {task.name} (id={task.task_id})")

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.result = TaskResult(
                task_id=task.task_id,
                status=TaskStatus.FAILED,
                error=str(e),
                started_at=started_at,
                completed_at=datetime.utcnow()
            )

            logger.error(f"Task failed: {task.name} (id={task.task_id}): {e}")

    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        """Get the status of a task."""
        task = self._tasks.get(task_id)
        return task.status if task else None

    def get_task_result(self, task_id: str) -> Optional[TaskResult]:
        """Get the result of a completed task."""
        task = self._tasks.get(task_id)
        return task.result if task else None

    # ============================================================
    # Event Handlers (Replacing Kafka listeners)
    # ============================================================

    async def handle_admin_created(
        self,
        enterprise_id: str,
        admin_id: str,
        email: str
    ):
        """
        Handle admin creation event.

        Replaces: AdminListener.onAdminCreate (Kafka topic: ai.kolate.enterprise-admin.create)
        """
        async def _process():
            logger.info(f"Processing admin created: {admin_id} for enterprise {enterprise_id}")
            # Add any post-creation logic here
            # - Send welcome email
            # - Update audit log
            # - Trigger any required provisioning

        self.schedule_task(
            "admin_created",
            _process,
            priority=TaskPriority.HIGH
        )

    async def handle_admin_updated(
        self,
        enterprise_id: str,
        admin_id: str,
        changes: Dict[str, Any]
    ):
        """
        Handle admin update event.

        Replaces: AdminListener.onAdminUpdate (Kafka topic: ai.kolate.enterprise-admin.update)
        """
        async def _process():
            logger.info(f"Processing admin updated: {admin_id}")
            # Add update-related logic here

        self.schedule_task(
            "admin_updated",
            _process,
            priority=TaskPriority.NORMAL
        )

    async def handle_admin_deleted(
        self,
        enterprise_id: str,
        admin_id: str
    ):
        """
        Handle admin deletion event.

        Replaces: AdminListener.onAdminDelete (Kafka topic: ai.kolate.enterprise-admin.delete)
        """
        async def _process():
            logger.info(f"Processing admin deleted: {admin_id}")
            # Add cleanup logic here

        self.schedule_task(
            "admin_deleted",
            _process,
            priority=TaskPriority.HIGH
        )

    async def handle_infrastructure_provisioned(
        self,
        enterprise_id: str,
        org_id: str,
        datasources: List[Dict[str, Any]]
    ):
        """
        Handle infrastructure provisioning completion.

        Replaces: TerraformProvisionListener (Kafka infrastructure topics)
        """
        async def _process():
            logger.info(f"Processing infrastructure provisioned for org {org_id}")
            # Register datasources
            # Update enterprise status
            # Send notification

        self.schedule_task(
            "infrastructure_provisioned",
            _process,
            priority=TaskPriority.CRITICAL
        )

    async def send_email_async(
        self,
        email_service,
        method_name: str,
        **kwargs
    ):
        """
        Send email asynchronously.

        Args:
            email_service: Email service instance
            method_name: Method to call on email service
            **kwargs: Arguments for the email method
        """
        async def _send():
            method = getattr(email_service, method_name)
            if asyncio.iscoroutinefunction(method):
                await method(**kwargs)
            else:
                method(**kwargs)

        self.schedule_task(
            f"send_email_{method_name}",
            _send,
            priority=TaskPriority.HIGH
        )

    async def log_audit_event(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Log an audit event asynchronously.

        Args:
            user_id: User who performed the action
            action: Action type (create, update, delete, etc.)
            resource_type: Type of resource affected
            resource_id: ID of the resource
            details: Additional details
        """
        async def _log():
            logger.info(
                f"AUDIT: user={user_id} action={action} "
                f"resource={resource_type}/{resource_id}"
            )
            # In production, write to audit log table or external service

        self.schedule_task(
            "audit_log",
            _log,
            priority=TaskPriority.LOW
        )


# Global instance for use with FastAPI dependency injection
_background_task_service: Optional[BackgroundTaskService] = None


def get_background_task_service() -> BackgroundTaskService:
    """Get or create the background task service instance."""
    global _background_task_service
    if _background_task_service is None:
        _background_task_service = BackgroundTaskService()
    return _background_task_service
