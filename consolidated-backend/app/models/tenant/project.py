"""
Project and ProjectUser Models

Project entities stored in tenant-specific schemas (org_xxx).
"""

import uuid
import enum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Text, DateTime, Enum, ForeignKey, UniqueConstraint, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant.user import TenantUser
    from app.models.tenant.role import ProjectRole


class ProjectStatus(str, enum.Enum):
    """Project status enumeration."""
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class Project(Base):
    """
    Project model representing projects within an organization.

    Stored in tenant-specific schemas (org_xxx).

    Attributes:
        id: UUID primary key
        name: Project name (unique within organization)
        description: Project description
        status: Project status (ACTIVE, COMPLETED, etc.)
        created_by: Auth0 ID of the creator
        updated_by: Auth0 ID of last updater
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "projects"
    __table_args__ = (
        Index('idx_project_status', 'status'),
        Index('idx_project_created_by', 'created_by'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(ProjectStatus),
        default=ProjectStatus.ACTIVE,
        nullable=False
    )
    created_by = Column(String(128), nullable=False)  # Auth0 user ID
    updated_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    members: List["ProjectUser"] = relationship(
        "ProjectUser",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    roles: List["ProjectRole"] = relationship(
        "ProjectRole",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status}')>"

    @property
    def is_active(self) -> bool:
        """Check if the project is active."""
        return self.status == ProjectStatus.ACTIVE


class ProjectUser(Base):
    """
    ProjectUser model representing user membership in projects.

    Junction table linking users to projects with their assigned role.

    Attributes:
        id: Integer primary key
        project_id: Foreign key to project
        user_id: Foreign key to tenant user
        user_auth0_id: Auth0 user ID (for lookups)
        role_id: Foreign key to project role
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "project_users"
    __table_args__ = (
        UniqueConstraint('project_id', 'user_auth0_id', name='uq_project_user'),
        Index('idx_project_user_project', 'project_id'),
        Index('idx_project_user_auth0', 'user_auth0_id'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True  # Nullable for users not yet synced
    )
    user_auth0_id = Column(String(128), nullable=False)
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_roles.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project: "Project" = relationship(
        "Project",
        back_populates="members"
    )
    user: Optional["TenantUser"] = relationship(
        "TenantUser",
        back_populates="project_memberships",
        foreign_keys=[user_id]
    )
    role: Optional["ProjectRole"] = relationship(
        "ProjectRole",
        back_populates="members"
    )

    def __repr__(self) -> str:
        return f"<ProjectUser(project_id={self.project_id}, user_auth0_id='{self.user_auth0_id}')>"
