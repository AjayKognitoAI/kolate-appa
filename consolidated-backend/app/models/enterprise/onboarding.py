"""
EnterpriseOnboardingProgress Model

Tracks enterprise onboarding workflow progress.
Stored in the public schema.
"""

import enum
from datetime import datetime
from typing import Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Integer, ForeignKey, DateTime, Enum, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.enterprise import Enterprise


class OnboardingStep(str, enum.Enum):
    """Enterprise onboarding steps enumeration."""
    INVITED = "INVITED"
    EMAIL_SENT = "EMAIL_SENT"
    ONBOARDING_STARTED = "ONBOARDING_STARTED"
    AUTH0_ORG_CREATED = "AUTH0_ORG_CREATED"
    SSO_CONFIGURED = "SSO_CONFIGURED"
    ADMIN_SETUP = "ADMIN_SETUP"
    SCHEMA_CREATED = "SCHEMA_CREATED"
    DATA_MIGRATED = "DATA_MIGRATED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class EnterpriseOnboardingProgress(BaseModel):
    """
    EnterpriseOnboardingProgress model for tracking onboarding workflow.

    Maintains the current state and progress of enterprise onboarding.
    Uses a one-to-one relationship with Enterprise.

    Attributes:
        id: Integer primary key
        enterprise_id: Foreign key to enterprise (unique for 1:1)
        current_step: Current onboarding step
        progress_data: JSON data with step-specific details
        error_message: Error message if onboarding failed
        started_at: When onboarding started
        completed_at: When onboarding completed
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "enterprise_onboarding_progress"
    __table_args__ = (
        Index('idx_onboarding_step', 'current_step'),
        {'schema': 'public'}
    )

    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.enterprises.id", ondelete="CASCADE"),
        nullable=False,
        unique=True  # One-to-one relationship
    )
    current_step = Column(
        Enum(OnboardingStep),
        default=OnboardingStep.INVITED,
        nullable=False
    )
    progress_data = Column(JSONB, nullable=True, default=dict)
    error_message = Column(String(1000), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    enterprise: "Enterprise" = relationship(
        "Enterprise",
        back_populates="onboarding_progress"
    )

    def __repr__(self) -> str:
        return f"<EnterpriseOnboardingProgress(enterprise_id={self.enterprise_id}, step='{self.current_step}')>"

    @property
    def is_complete(self) -> bool:
        """Check if onboarding is complete."""
        return self.current_step == OnboardingStep.COMPLETED

    @property
    def is_failed(self) -> bool:
        """Check if onboarding has failed."""
        return self.current_step == OnboardingStep.FAILED

    def advance_to_step(self, step: OnboardingStep, data: Optional[Dict[str, Any]] = None):
        """
        Advance to the next onboarding step.

        Args:
            step: The step to advance to
            data: Optional data to store for this step
        """
        self.current_step = step
        if data:
            current_data = self.progress_data or {}
            current_data[step.value] = {
                "completed_at": datetime.utcnow().isoformat(),
                "data": data
            }
            self.progress_data = current_data

        if step == OnboardingStep.COMPLETED:
            self.completed_at = datetime.utcnow()

    def mark_failed(self, error_message: str):
        """
        Mark onboarding as failed.

        Args:
            error_message: The error message describing the failure
        """
        self.current_step = OnboardingStep.FAILED
        self.error_message = error_message
