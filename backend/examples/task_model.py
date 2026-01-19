"""
Example Model: Task

This demonstrates how to create a SQLAlchemy model in the template.

Key Points:
- Inherit from BaseModel to get id, created_at, updated_at
- Use proper column types and constraints
- Define relationships with other models
- Add indexes for frequently queried fields
"""

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Task(BaseModel):
    """
    Task model representing a TODO item.

    Each task belongs to a user and has a completion status.
    """

    __tablename__ = "tasks"

    # Basic fields
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)

    # Foreign keys
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Relationships
    # NOTE: You also need to add the reverse relationship in app/models/user.py:
    # tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    user = relationship("User", back_populates="tasks")

    # Composite indexes for common queries
    __table_args__ = (
        # Index for querying user's incomplete tasks
        Index("ix_tasks_user_completed", "user_id", "is_completed"),
        # Index for searching tasks by title within a user's tasks
        Index("ix_tasks_user_title", "user_id", "title"),
    )

    def __repr__(self):
        return f"<Task {self.id}: {self.title}>"


# ALTERNATIVE: Task with Priority (more complex example)
"""
from enum import Enum as PyEnum

class TaskPriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TaskWithPriority(BaseModel):
    __tablename__ = "tasks"

    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)

    # Due date
    due_date = Column(DateTime(timezone=True), nullable=True)

    # Foreign keys
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Relationships
    user = relationship("User", back_populates="tasks")

    # Tags (many-to-many relationship example)
    # tags = relationship("Tag", secondary="task_tags", back_populates="tasks")

    __table_args__ = (
        Index("ix_tasks_user_completed_priority", "user_id", "is_completed", "priority"),
        Index("ix_tasks_due_date", "due_date"),
    )
"""
