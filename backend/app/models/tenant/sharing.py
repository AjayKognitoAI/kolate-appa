"""
TrialShare Model

Trial sharing entity stored in tenant-specific schemas (org_xxx).
"""

import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.tenant.project import Project


class TrialShare(Base):
    """
    TrialShare model for sharing trial executions with team members.

    Allows users to share specific trial executions with multiple recipients.

    Attributes:
        id: UUID primary key
        project_id: Foreign key to project
        trial_slug: Slug identifier of the trial
        execution_id: ID of the specific execution being shared
        sender_id: Auth0 ID of the user sharing
        recipients: Array of Auth0 IDs of recipients
        created_at: Creation timestamp
    """

    __tablename__ = "trial_shares"
    __table_args__ = (
        Index('idx_trial_share_project_trial', 'project_id', 'trial_slug'),
        Index('idx_trial_share_sender', 'sender_id'),
        Index('idx_trial_share_created', 'created_at'),
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
    trial_slug = Column(String(100), nullable=False)
    execution_id = Column(String(128), nullable=True)  # UUID as string from execution_records
    sender_id = Column(String(128), nullable=False)  # Auth0 user ID
    recipients = Column(ARRAY(String), nullable=False, default=list)  # Array of Auth0 IDs
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    project: "Project" = relationship("Project")

    def __repr__(self) -> str:
        return f"<TrialShare(id={self.id}, trial_slug='{self.trial_slug}', sender='{self.sender_id}')>"

    def add_recipient(self, recipient_auth0_id: str):
        """
        Add a recipient to the share.

        Args:
            recipient_auth0_id: The Auth0 ID of the recipient to add
        """
        if recipient_auth0_id not in self.recipients:
            self.recipients = self.recipients + [recipient_auth0_id]

    def remove_recipient(self, recipient_auth0_id: str):
        """
        Remove a recipient from the share.

        Args:
            recipient_auth0_id: The Auth0 ID of the recipient to remove
        """
        if recipient_auth0_id in self.recipients:
            self.recipients = [r for r in self.recipients if r != recipient_auth0_id]
