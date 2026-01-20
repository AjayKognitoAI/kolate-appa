"""
Patient Screening Cohort Model

Represents a filtered patient population for clinical studies.
Cohorts are created by applying filters to master data.
"""

from sqlalchemy import Column, String, Text, Integer, ForeignKey, ARRAY, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.tenant.patient_screening.base import Base, UUIDPrimaryKey, TimestampMixin


class Cohort(Base, UUIDPrimaryKey, TimestampMixin):
    """
    Patient Screening Cohort Model.

    A cohort represents a filtered subset of patients from a master data file.

    Features:
    - Link to study and master data
    - Filter configuration (either inline or referenced)
    - Free-text inclusion/exclusion criteria
    - Cached filtered patient IDs for performance

    Attributes:
        id: UUID primary key
        study_id: Reference to parent study
        name: Cohort name (required, min 1 char)
        description: Optional cohort description
        master_data_id: Reference to source master data
        columns: Column structure from master data
        filter_id: Optional reference to saved filter
        filter: Inline filter configuration (JSONB)
        inclusion_criteria: Free-text inclusion criteria
        exclusion_criteria: Free-text exclusion criteria
        filtered_patient_ids: Array of patient IDs after filtering
        patient_count: Number of patients in cohort
        master_data_patient_count: Total patients in source data
        created_by: Auth0 user ID who created
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "patient_screening_cohorts"

    # Study reference (cascades on study delete)
    study_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_screening_studies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Data reference (cascades on master data delete)
    master_data_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_screening_master_data.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    columns = Column(JSONB, nullable=False)

    # Filter configuration - either reference a saved filter OR use inline filter
    filter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_screening_filters.id", ondelete="SET NULL"),
        nullable=True
    )
    filter = Column(JSONB, nullable=True)  # Inline filter if filter_id is null

    # Eligibility criteria (free text descriptions)
    inclusion_criteria = Column(Text, nullable=True)
    exclusion_criteria = Column(Text, nullable=True)

    # Cached results (populated by client-side filtering)
    filtered_patient_ids = Column(ARRAY(String), nullable=True)
    patient_count = Column(Integer, nullable=False, default=0)
    master_data_patient_count = Column(Integer, nullable=False, default=0)

    # Audit fields
    # Note: enterprise_id removed - handled by schema-based multi-tenancy
    created_by = Column(String(255), nullable=False)

    # Relationships
    study = relationship("Study", back_populates="cohorts")
    master_data = relationship("MasterData", back_populates="cohorts")
    saved_filter = relationship("Filter", back_populates="cohorts")

    # Constraints
    __table_args__ = (
        # Must have either filter_id or inline filter
        CheckConstraint(
            "(filter_id IS NOT NULL) OR (filter IS NOT NULL)",
            name="ps_cohorts_valid_filter_config"
        ),
        CheckConstraint(
            "char_length(name) >= 1",
            name="ps_cohorts_valid_name"
        ),
    )

    def __repr__(self):
        return f"<Cohort(id={self.id}, name='{self.name}', patients={self.patient_count})>"
