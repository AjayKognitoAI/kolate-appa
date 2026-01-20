"""
Patient Screening Cohort Comparison Model

Stores results of comparing multiple cohorts.
Used for finding overlapping and unique patients across cohorts.
"""

from sqlalchemy import Column, Integer, String, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.models.tenant.patient_screening.base import Base, UUIDPrimaryKey


class CohortComparison(Base, UUIDPrimaryKey):
    """
    Patient Screening Cohort Comparison Model.

    Stores the results of comparing multiple cohorts, including:
    - Set intersection (patients in all cohorts)
    - Set union (all unique patients)
    - Individual cohort statistics

    Comparison Data Structure (JSONB):
    {
        "cohorts": [
            {
                "id": "uuid",
                "name": "Cohort Name",
                "patient_count": 100,
                "unique_patients": 25,
                "overlap_with_others": 75
            }
        ],
        "overlaps": {
            "all": ["patient_id1", "patient_id2"],
            "cohort1_cohort2": ["patient_id3"],
            ...
        },
        "venn_data": {...}  # Optional visualization data
    }

    Attributes:
        id: UUID primary key
        cohort_ids: Array of cohort UUIDs being compared
        total_unique_patients: Count of unique patients across all cohorts
        common_to_all: Count of patients present in all cohorts
        comparison_data: Full comparison results as JSONB
        created_by: Auth0 user ID who ran comparison
        expires_at: Cache expiration timestamp
        created_at: Comparison timestamp
    """
    __tablename__ = "patient_screening_cohort_comparisons"

    # Cohorts being compared
    cohort_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)

    # Summary statistics
    total_unique_patients = Column(Integer, nullable=True)
    common_to_all = Column(Integer, nullable=True)

    # Full comparison results
    comparison_data = Column(JSONB, nullable=False)

    # Audit fields
    # Note: enterprise_id removed - handled by schema-based multi-tenancy
    created_by = Column(String(255), nullable=True)

    # Cache management
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CohortComparison(id={self.id}, cohorts={len(self.cohort_ids)}, unique={self.total_unique_patients})>"

    @property
    def is_expired(self) -> bool:
        """Check if the comparison cache has expired."""
        if self.expires_at is None:
            return False
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at
