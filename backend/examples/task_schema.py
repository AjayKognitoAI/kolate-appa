"""
Example Schemas: Task

This demonstrates how to create Pydantic schemas for request/response validation.

Key Points:
- Separate schemas for Create, Update, and Response
- Use BaseModel for shared fields
- Create schema has required fields
- Update schema has all optional fields (for partial updates)
- Response schema includes database-generated fields (id, timestamps)
- Use ConfigDict for ORM compatibility
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


# ============================================================================
# Base Schema (Shared Fields)
# ============================================================================

class TaskBase(BaseModel):
    """
    Base schema with fields common to all Task schemas.
    """

    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    is_completed: bool = Field(False, description="Task completion status")


# ============================================================================
# Create Schema (For POST requests)
# ============================================================================

class TaskCreate(TaskBase):
    """
    Schema for creating a new task.

    All fields from TaskBase are required (except those with defaults).
    The user_id will be set automatically from the authenticated user.
    """

    # You can add create-specific fields here if needed
    # For example, if you want to allow setting a specific user_id:
    # user_id: Optional[str] = None  # Will default to current user if not provided

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Complete project documentation",
                "description": "Write comprehensive docs for the API",
                "is_completed": False,
            }
        }
    )


# ============================================================================
# Update Schema (For PUT/PATCH requests)
# ============================================================================

class TaskUpdate(BaseModel):
    """
    Schema for updating an existing task.

    All fields are optional to support partial updates.
    Only provided fields will be updated.
    """

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_completed: Optional[bool] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_completed": True,
            }
        }
    )


# ============================================================================
# Response Schema (For API responses)
# ============================================================================

class TaskResponse(TaskBase):
    """
    Schema for task responses.

    Includes all fields from TaskBase plus database-generated fields.
    """

    id: str = Field(..., description="Task unique identifier")
    user_id: str = Field(..., description="User who owns this task")
    created_at: datetime = Field(..., description="Task creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # This allows Pydantic to work with SQLAlchemy models
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Complete project documentation",
                "description": "Write comprehensive docs for the API",
                "is_completed": False,
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z",
            }
        },
    )


# ============================================================================
# Additional Response Schemas (Optional)
# ============================================================================

class TaskWithUserResponse(TaskResponse):
    """
    Extended response schema that includes user information.

    Use this when you want to return task with user details in a single response.
    """

    from app.schemas.user import UserResponse  # Circular import handled at usage time

    user: Optional["UserResponse"] = Field(None, description="Task owner details")


class TaskListResponse(BaseModel):
    """
    Schema for paginated task list responses.

    Useful for list endpoints with metadata.
    """

    tasks: list[TaskResponse] = Field(..., description="List of tasks")
    total: int = Field(..., description="Total number of tasks")
    skip: int = Field(..., description="Number of items skipped")
    limit: int = Field(..., description="Maximum items per page")

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Action-Specific Schemas (Optional)
# ============================================================================

class TaskCompleteRequest(BaseModel):
    """
    Schema for task completion action.

    Use this for specialized endpoints like POST /tasks/{id}/complete
    """

    notes: Optional[str] = Field(None, description="Completion notes")


class TaskBulkUpdateRequest(BaseModel):
    """
    Schema for bulk task updates.

    Example: Mark multiple tasks as completed
    """

    task_ids: list[str] = Field(..., min_length=1, description="List of task IDs")
    is_completed: bool = Field(..., description="New completion status")


# ============================================================================
# Alternative: Task with Priority (More Complex Example)
# ============================================================================

"""
from enum import Enum

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskBaseWithPriority(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_completed: bool = False
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = Field(None, description="Task due date")


class TaskCreateWithPriority(TaskBaseWithPriority):
    tags: Optional[list[str]] = Field(None, description="Task tags")


class TaskResponseWithPriority(TaskBaseWithPriority):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
"""
