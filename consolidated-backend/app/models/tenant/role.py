"""
Project Role and Permission Models

Role and permission entities stored in tenant-specific schemas (org_xxx).
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
    from app.models.tenant.project import Project, ProjectUser


class ModuleType(str, enum.Enum):
    """Module type enumeration for permissions."""
    PREDICT = "PREDICT"
    COMPARE = "COMPARE"
    COPILOT = "COPILOT"
    INSIGHTS = "INSIGHTS"


class AccessType(str, enum.Enum):
    """Access type enumeration for permissions."""
    HIDDEN = "HIDDEN"
    READ_ONLY = "READ_ONLY"
    FULL_ACCESS = "FULL_ACCESS"


class ProjectRole(Base):
    """
    ProjectRole model representing roles within a project.

    Each project can have custom roles based on default role templates.

    Attributes:
        id: UUID primary key
        project_id: Foreign key to project
        name: Role name
        description: Role description
        default_role_id: Reference to default role template
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "project_roles"
    __table_args__ = (
        UniqueConstraint('project_id', 'name', name='uq_project_role_name'),
        Index('idx_project_role_project', 'project_id'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    default_role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("default_roles.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project: "Project" = relationship(
        "Project",
        back_populates="roles"
    )
    permissions: List["ProjectPermission"] = relationship(
        "ProjectPermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    members: List["ProjectUser"] = relationship(
        "ProjectUser",
        back_populates="role"
    )
    default_role: Optional["DefaultRole"] = relationship(
        "DefaultRole"
    )

    def __repr__(self) -> str:
        return f"<ProjectRole(id={self.id}, name='{self.name}')>"


class ProjectPermission(Base):
    """
    ProjectPermission model representing permissions for a project role.

    Attributes:
        id: UUID primary key
        role_id: Foreign key to project role
        module: Module type (PREDICT, COMPARE, etc.)
        access_type: Access level (HIDDEN, READ_ONLY, FULL_ACCESS)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "project_permissions"
    __table_args__ = (
        UniqueConstraint('role_id', 'module', name='uq_role_module_permission'),
        Index('idx_permission_role', 'role_id'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_roles.id", ondelete="CASCADE"),
        nullable=False
    )
    module = Column(Enum(ModuleType), nullable=False)
    access_type = Column(
        Enum(AccessType),
        default=AccessType.READ_ONLY,
        nullable=False
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    role: "ProjectRole" = relationship(
        "ProjectRole",
        back_populates="permissions"
    )

    def __repr__(self) -> str:
        return f"<ProjectPermission(role_id={self.role_id}, module='{self.module}', access='{self.access_type}')>"


class DefaultRole(Base):
    """
    DefaultRole model representing template roles.

    These are system-wide role templates (ADMIN, MANAGER, ANALYST, MEMBER)
    that can be used as starting points for project roles.

    Attributes:
        id: UUID primary key
        name: Role name (unique)
        description: Role description
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "default_roles"
    __table_args__ = (
        Index('idx_default_role_name', 'name'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    permissions: List["DefaultPermission"] = relationship(
        "DefaultPermission",
        back_populates="default_role",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<DefaultRole(id={self.id}, name='{self.name}')>"


class DefaultPermission(Base):
    """
    DefaultPermission model representing permissions for default roles.

    Attributes:
        id: UUID primary key
        default_role_id: Foreign key to default role
        module: Module type
        access_type: Access level
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "default_permissions"
    __table_args__ = (
        UniqueConstraint('default_role_id', 'module', name='uq_default_role_module'),
        Index('idx_default_permission_role', 'default_role_id'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    default_role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("default_roles.id", ondelete="CASCADE"),
        nullable=False
    )
    module = Column(Enum(ModuleType), nullable=False)
    access_type = Column(
        Enum(AccessType),
        default=AccessType.READ_ONLY,
        nullable=False
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    default_role: "DefaultRole" = relationship(
        "DefaultRole",
        back_populates="permissions"
    )

    def __repr__(self) -> str:
        return f"<DefaultPermission(default_role_id={self.default_role_id}, module='{self.module}')>"
