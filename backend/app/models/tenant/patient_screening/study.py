"""
Patient Screening Study Model

Represents a clinical study/research project for patient screening.
Studies contain master data files and cohorts.
"""

from enum import Enum
from sqlalchemy import Column, String, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.tenant.patient_screening.base import Base, UUIDPrimaryKey, TimestampMixin


class StudyStatus(str, Enum):
    """Workflow status for studies"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Study(Base, UUIDPrimaryKey, TimestampMixin):
    """
    Patient Screening Study Model.

    A study represents a clinical research project that contains:
    - Master data files (patient datasets)
    - Cohorts (filtered patient populations)
    - Activity log for audit trail

    Attributes:
        id: UUID primary key
        name: Study name (required, min 1 char)
        description: Optional study description
        status: Workflow status (draft, active, completed, archived)
        study_metadata: Flexible JSONB for protocol/sponsor data
        created_by: Auth0 user ID who created the study
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """
    __tablename__ = "patient_screening_studies"

    # Basic Information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Status workflow
    status = Column(
        String(50),
        nullable=False,
        default=StudyStatus.DRAFT.value,
        index=True
    )

    # Flexible metadata storage
    # Named study_metadata to avoid SQLAlchemy reserved attribute conflict
    study_metadata = Column(JSONB, nullable=True)

    # Audit Fields
    # Note: enterprise_id removed - handled by schema-based multi-tenancy
    created_by = Column(String(255), nullable=False)

    # Relationships
    master_data_list = relationship(
        "MasterData",
        back_populates="study",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    cohorts = relationship(
        "Cohort",
        back_populates="study",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    activities = relationship(
        "StudyActivity",
        back_populates="study",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'active', 'completed', 'archived')",
            name="ps_studies_valid_status"
        ),
        CheckConstraint(
            "char_length(name) >= 1",
            name="ps_studies_valid_name"
        ),
    )

    def __repr__(self):
        return f"<Study(id={self.id}, name='{self.name}', status='{self.status}')>"
