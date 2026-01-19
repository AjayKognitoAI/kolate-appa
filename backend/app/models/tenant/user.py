"""
Tenant User Model

User entity stored in tenant-specific schemas (org_xxx).
Each organization has its own users table in their schema.
"""

import uuid
import enum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import (
    Column, String, DateTime, Enum, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant.project import ProjectUser
    from app.models.tenant.notification import Notification
    from app.models.tenant.bookmark import UserBookmark


class UserStatus(str, enum.Enum):
    """User status enumeration."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"
    PENDING = "PENDING"


class TenantUser(Base):
    """
    TenantUser model representing users within an organization.

    This model is stored in tenant-specific schemas (org_xxx).
    The schema is determined by the search_path set in the database session.

    Note: This is separate from the template's User model. This represents
    users within a tenant's organizational context.

    Attributes:
        id: UUID primary key
        auth0_id: Auth0 user identifier (sub claim)
        organization_id: Organization identifier for reference
        first_name: User's first name
        last_name: User's last name
        email: User's email address
        mobile: User's mobile phone
        avatar_url: URL to user's avatar image
        job_title: User's job title
        status: User status (ACTIVE, INACTIVE, BLOCKED)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "users"
    __table_args__ = (
        Index('idx_tenant_user_auth0_id', 'auth0_id'),
        Index('idx_tenant_user_email', 'email'),
        Index('idx_tenant_user_org_id', 'organization_id'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    auth0_id = Column(String(128), unique=True, nullable=False)
    organization_id = Column(String(64), nullable=False)  # For reference/validation
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=False)
    mobile = Column(String(50), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    job_title = Column(String(255), nullable=True)
    status = Column(
        Enum(UserStatus),
        default=UserStatus.ACTIVE,
        nullable=False
    )
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships (within same tenant schema)
    project_memberships: List["ProjectUser"] = relationship(
        "ProjectUser",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="ProjectUser.user_id"
    )
    notifications: List["Notification"] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    bookmarks: List["UserBookmark"] = relationship(
        "UserBookmark",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<TenantUser(id={self.id}, email='{self.email}')>"

    @property
    def full_name(self) -> str:
        """Get the user's full name."""
        parts = [self.first_name, self.last_name]
        return " ".join(filter(None, parts)) or self.email

    @property
    def is_active(self) -> bool:
        """Check if the user is active."""
        return self.status == UserStatus.ACTIVE
