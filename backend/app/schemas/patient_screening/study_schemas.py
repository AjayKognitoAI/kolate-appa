"""
Patient Screening Study Schemas

Schemas for study management operations.
"""

from enum import Enum
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.base import CamelModel


class StudyStatus(str, Enum):
    """Workflow status for studies"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


# ============== Request Schemas ==============

class StudyCreate(CamelModel):
    """Request schema for creating a new study"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    status: StudyStatus = StudyStatus.DRAFT
    study_metadata: Optional[Dict[str, Any]] = None
    # Note: enterprise_id removed - handled by tenant context
    # Note: user_id/user_name come from auth context


class StudyUpdate(CamelModel):
    """Request schema for updating a study"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[StudyStatus] = None
    study_metadata: Optional[Dict[str, Any]] = None
    # Note: user_id/user_name come from auth context


# ============== Response Schemas ==============

class Study(CamelModel):
    """Full study details"""
    id: UUID
    name: str
    description: Optional[str]
    status: StudyStatus
    study_metadata: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: datetime
    updated_at: datetime


class StudyWithCounts(Study):
    """Study with aggregated counts"""
    master_data_count: int = 0
    cohort_count: int = 0
    total_patients: int = 0


class StudySummary(CamelModel):
    """Lightweight study info for list views"""
    id: UUID
    name: str
    description: Optional[str]
    status: StudyStatus
    master_data_count: int = 0
    cohort_count: int = 0
    created_at: datetime
    updated_at: datetime


class StudyResponse(BaseModel):
    """Single study response"""
    status: str = "success"
    message: Optional[str] = None
    data: Study


class StudyWithCountsResponse(BaseModel):
    """Single study response with counts"""
    status: str = "success"
    message: Optional[str] = None
    data: StudyWithCounts


class StudyListResponse(BaseModel):
    """Paginated study list response"""
    status: str = "success"
    data: dict  # Contains: content, total_elements, page, size, total_pages


# ============== Workflow Schemas ==============

class CohortFromMergeRequest(CamelModel):
    """Request for creating cohort by merging filtered patients with new columns"""
    study_id: UUID
    source_cohort_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    merge_column: str  # Column to join on (e.g., patient_id)
    filter_id: Optional[UUID] = None
    filter: Optional[Dict[str, Any]] = None
    # Note: enterprise_id removed - handled by tenant context
    # Note: user_id/user_name come from auth context


class MergeResultResponse(BaseModel):
    """Response for merge operation"""
    status: str = "success"
    message: Optional[str] = None
    data: dict  # Contains: master_data_id, file_name, row_count, columns, source_cohort_id, merge_column
