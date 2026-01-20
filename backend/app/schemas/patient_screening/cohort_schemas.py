"""
Patient Screening Cohort Schemas

Schemas for cohort management operations.
"""

from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.base import CamelModel
from app.schemas.patient_screening.filter_schemas import FilterGroup


# ============== Request Schemas ==============

class CohortCreate(CamelModel):
    """Request schema for creating a new cohort"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    study_id: UUID  # Required - study this cohort belongs to
    master_data_id: UUID
    columns: Dict[str, str]  # {"column_name": "column_type"}
    filter_id: Optional[UUID] = None
    filter: Optional[FilterGroup] = None
    save_filter_as: Optional[str] = None  # If provided, save filter with this name
    inclusion_criteria: Optional[str] = None  # Free text describing inclusion criteria
    exclusion_criteria: Optional[str] = None  # Free text describing exclusion criteria
    filtered_patient_ids: Optional[List[str]] = None
    patient_count: int = 0
    master_data_patient_count: int = 0
    project_id: Optional[UUID] = None  # Optional link to a project
    # Note: enterprise_id removed - handled by tenant context
    # Note: user_id/user_name come from auth context


class CohortUpdate(CamelModel):
    """Request schema for updating a cohort"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    filter_id: Optional[UUID] = None
    filter: Optional[FilterGroup] = None
    inclusion_criteria: Optional[str] = None
    exclusion_criteria: Optional[str] = None
    filtered_patient_ids: Optional[List[str]] = None
    patient_count: Optional[int] = None
    master_data_patient_count: Optional[int] = None
    # Note: user_id/user_name come from auth context


# ============== Response Schemas ==============

class Cohort(CamelModel):
    """Full cohort details"""
    id: UUID
    name: str
    description: Optional[str]
    study_id: UUID
    master_data_id: UUID
    columns: Dict[str, str]
    filter_id: Optional[UUID]
    filter: Optional[FilterGroup]
    inclusion_criteria: Optional[str]
    exclusion_criteria: Optional[str]
    filtered_patient_ids: Optional[List[str]]
    patient_count: int
    master_data_patient_count: int
    created_at: datetime
    updated_at: datetime
    created_by: str


class CohortResponse(BaseModel):
    """Single cohort response"""
    status: str = "success"
    message: Optional[str] = None
    data: Cohort


class CohortListResponse(BaseModel):
    """Paginated cohort list response"""
    status: str = "success"
    data: dict  # Contains: content, total_elements, page, size, total_pages


# ============== Cohort Patient IDs ==============

class CohortPatientIds(CamelModel):
    """Patient IDs data for a single cohort"""
    cohort_id: UUID
    cohort_name: str
    patient_ids: List[str]
    patient_count: int


class StudyCohortPatientIdsData(CamelModel):
    """Response data for study cohort patient IDs"""
    study_id: UUID
    cohorts: List[CohortPatientIds]
    total_unique_patients: int


class StudyCohortPatientIdsResponse(BaseModel):
    """Response for GET /studies/{study_id}/cohort-patient-ids"""
    status: str = "success"
    data: StudyCohortPatientIdsData
