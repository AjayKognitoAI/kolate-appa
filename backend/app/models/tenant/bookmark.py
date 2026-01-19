"""
UserBookmark Model

User bookmark entity stored in tenant-specific schemas (org_xxx).
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, UniqueConstraint, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant.user import TenantUser
    from app.models.tenant.project import Project


class UserBookmark(Base):
    """
    UserBookmark model for tracking user bookmarks on trial executions.

    Allows users to bookmark specific executions for quick access.

    Attributes:
        id: UUID primary key
        user_id: Foreign key to tenant user
        bookmarked_by: Auth0 ID of the user who created the bookmark
        project_id: Foreign key to project
        trial_slug: Slug identifier of the trial
        execution_id: ID of the specific execution bookmarked
        bookmarked_at: When the bookmark was created
    """

    __tablename__ = "user_bookmarks"
    __table_args__ = (
        UniqueConstraint(
            'bookmarked_by', 'project_id', 'trial_slug', 'execution_id',
            name='uq_user_bookmark'
        ),
        Index('idx_bookmark_user', 'bookmarked_by'),
        Index('idx_bookmark_project_trial', 'project_id', 'trial_slug'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True  # Nullable if user not synced yet
    )
    bookmarked_by = Column(String(128), nullable=False)  # Auth0 user ID
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    trial_slug = Column(String(100), nullable=False)
    execution_id = Column(String(128), nullable=False)  # UUID as string from execution_records
    bookmarked_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    user: "TenantUser" = relationship(
        "TenantUser",
        back_populates="bookmarks"
    )
    project: "Project" = relationship("Project")

    def __repr__(self) -> str:
        return f"<UserBookmark(id={self.id}, trial_slug='{self.trial_slug}', execution='{self.execution_id}')>"
