"""
Notification Model

User notification entity stored in tenant-specific schemas (org_xxx).
"""

import uuid
import enum
from datetime import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Text, DateTime, Enum, ForeignKey, Boolean, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant.user import TenantUser


class NotificationStatus(str, enum.Enum):
    """Notification status enumeration."""
    UNREAD = "UNREAD"
    READ = "READ"


class NotificationType(str, enum.Enum):
    """Notification type enumeration."""
    SYSTEM = "SYSTEM"
    PROJECT_INVITE = "PROJECT_INVITE"
    TRIAL_SHARED = "TRIAL_SHARED"
    ROLE_CHANGE = "ROLE_CHANGE"
    PROJECT_UPDATE = "PROJECT_UPDATE"
    GENERAL = "GENERAL"


class Notification(Base):
    """
    Notification model for user notifications.

    Stored in tenant-specific schemas (org_xxx).

    Attributes:
        id: UUID primary key
        user_id: Foreign key to tenant user
        recipient: Auth0 user ID of the recipient
        type: Notification type
        status: Notification status (UNREAD, READ)
        title: Notification title
        message: Notification message
        data: JSON data with additional notification details
        created_at: Creation timestamp (also used as timestamp for sorting)
    """

    __tablename__ = "notifications"
    __table_args__ = (
        Index('idx_notification_recipient', 'recipient'),
        Index('idx_notification_status', 'status'),
        Index('idx_notification_created', 'created_at'),
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
    recipient = Column(String(128), nullable=False)  # Auth0 user ID
    type = Column(
        Enum(NotificationType),
        default=NotificationType.GENERAL,
        nullable=False
    )
    status = Column(
        Enum(NotificationStatus),
        default=NotificationStatus.UNREAD,
        nullable=False
    )
    title = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    data = Column(JSONB, nullable=True, default=dict)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    user: Optional["TenantUser"] = relationship(
        "TenantUser",
        back_populates="notifications"
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, recipient='{self.recipient}', type='{self.type}')>"

    @property
    def is_read(self) -> bool:
        """Check if the notification has been read."""
        return self.status == NotificationStatus.READ

    def mark_as_read(self):
        """Mark the notification as read."""
        self.status = NotificationStatus.READ
