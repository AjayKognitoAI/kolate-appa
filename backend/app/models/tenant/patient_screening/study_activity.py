"""
Patient Screening Study Activity Model

Audit log for tracking all changes within a study.
Provides complete history of study, cohort, filter, and data operations.
"""

from enum import Enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.tenant.patient_screening.base import Base, UUIDPrimaryKey


class EntityType(str, Enum):
    """Entity types for activity tracking"""
    STUDY = "study"
    MASTER_DATA = "master_data"
    COHORT = "cohort"
    FILTER = "filter"


class ActivityAction(str, Enum):
    """Standard actions for activity tracking"""
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    EXPORTED = "exported"
    COMPARED = "compared"
    FILTER_CHANGED = "filter_changed"
    STATUS_CHANGED = "status_changed"


class StudyActivity(Base, UUIDPrimaryKey):
    """
    Patient Screening Study Activity Model.

    Records all significant actions performed within a study for audit purposes.

    Use Cases:
    - Track who made changes and when
    - Store previous/new values for change history
    - Enable activity feeds and notifications
    - Support compliance and audit requirements

    Attributes:
        id: UUID primary key
        study_id: Reference to parent study
        entity_type: Type of entity affected (study, master_data, cohort, filter)
        entity_id: UUID of the specific entity (nullable for study-level)
        action: Action performed (created, updated, deleted, etc.)
        description: Human-readable description
        previous_value: State before change (JSONB)
        new_value: State after change (JSONB)
        activity_metadata: Additional context (JSONB)
        user_id: Auth0 user ID who performed action
        user_name: Display name of user
        timestamp: When the action occurred
    """
    __tablename__ = "patient_screening_study_activity"

    # Study reference (all activities belong to a study)
    study_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_screening_studies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Entity reference (what entity this activity is about)
    entity_type = Column(
        String(50),
        nullable=False,
        index=True
    )  # study, master_data, cohort, filter
    entity_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )  # ID of specific entity (nullable for study-level)

    # Action details
    action = Column(
        String(50),
        nullable=False
    )  # created, updated, deleted, exported, etc.
    description = Column(Text, nullable=False)

    # Change tracking
    previous_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    activity_metadata = Column(JSONB, nullable=True)

    # User info
    user_id = Column(String(255), nullable=False)
    user_name = Column(String(255), nullable=True)

    # Timestamp
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True
    )

    # Relationship
    study = relationship("Study", back_populates="activities")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('study', 'master_data', 'cohort', 'filter')",
            name="ps_study_activity_valid_entity_type"
        ),
    )

    def __repr__(self):
        return f"<StudyActivity(id={self.id}, entity={self.entity_type}, action='{self.action}')>"
