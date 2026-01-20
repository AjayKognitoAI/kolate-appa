"""
Patient Screening Comparison Schemas

Schemas for cohort comparison operations.
"""

from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.schemas.base import CamelModel


class CompareRequest(CamelModel):
    """Request for comparing cohorts"""
    cohort_ids: List[UUID]


class CohortComparisonDetail(CamelModel):
    """Details for a single cohort in comparison"""
    id: UUID
    name: str
    patient_count: int
    unique_patients: int  # Patients only in this cohort
    overlap_with_others: int  # Patients shared with other cohorts


class OverlapDetail(CamelModel):
    """Overlap between specific cohorts"""
    cohort_ids: List[UUID]
    patient_ids: List[str]
    count: int


class ComparisonData(CamelModel):
    """Full comparison result data"""
    cohorts: List[CohortComparisonDetail]
    total_unique_patients: int  # Union of all patients
    common_to_all: int  # Intersection of all patients
    overlaps: List[OverlapDetail]  # Pairwise and multi-way overlaps
    venn_data: Optional[dict] = None  # Optional visualization data


class CompareResponse(BaseModel):
    """Response for comparison request"""
    status: str = "success"
    data: dict  # Contains ComparisonData structure
