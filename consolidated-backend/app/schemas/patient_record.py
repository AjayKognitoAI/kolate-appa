"""
Patient Record and Execution Record Schemas

Pydantic schemas for patient record and execution record entities.
These use PostgreSQL JSONB for flexible data storage.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import Field

from app.schemas.base import CamelModel


# ============================================================
# Patient Record Schemas
# ============================================================

class PatientRecordBase(CamelModel):
    """Base patient record schema."""
    record_id: Optional[str] = Field(None, description="Custom record identifier")
    patient_data: Dict[str, Any] = Field(default_factory=dict, description="Patient demographic and clinical data")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class PatientRecordCreate(PatientRecordBase):
    """Schema for creating a patient record."""
    project_id: UUID = Field(..., description="Project ID")
    trial_slug: str = Field(..., description="Trial slug identifier")


class PatientRecordUpdate(CamelModel):
    """Schema for updating a patient record."""
    patient_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class PatientRecordResponse(PatientRecordBase):
    """Patient record response schema."""
    id: UUID = Field(..., description="Record UUID")
    project_id: UUID = Field(..., description="Project ID")
    trial_slug: str = Field(..., description="Trial slug identifier")
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class PatientRecordBulkCreate(CamelModel):
    """Schema for bulk creating patient records."""
    project_id: UUID = Field(..., description="Project ID")
    trial_slug: str = Field(..., description="Trial slug identifier")
    records: List[PatientRecordBase]


class PatientRecordSearch(CamelModel):
    """Patient record search parameters."""
    record_id: Optional[str] = None
    project_id: Optional[UUID] = None
    trial_slug: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None  # Flexible field filters for JSONB queries


# ============================================================
# Execution Record Schemas
# ============================================================

class ExecutionRecordBase(CamelModel):
    """Base execution record schema."""
    user_id: str = Field(..., description="Auth0 ID of the user")
    base_patient_data: Dict[str, Any] = Field(default_factory=dict, description="Input patient data for prediction")
    base_prediction: List[Dict[str, Any]] = Field(default_factory=list, description="Prediction results from models")
    executed_by: Optional[str] = None


class ExecutionRecordCreate(ExecutionRecordBase):
    """Schema for creating an execution record."""
    project_id: UUID = Field(..., description="Project ID")
    trial_slug: str = Field(..., description="Trial slug identifier")


class ExecutionRecordUpdate(CamelModel):
    """Schema for updating an execution record."""
    base_patient_data: Optional[Dict[str, Any]] = None
    base_prediction: Optional[List[Dict[str, Any]]] = None
    updated_by: Optional[str] = None


class ExecutionRecordResponse(ExecutionRecordBase):
    """Execution record response schema."""
    id: UUID = Field(..., description="Record UUID")
    execution_id: str = Field(..., description="Unique execution identifier")
    project_id: UUID = Field(..., description="Project ID")
    trial_slug: str = Field(..., description="Trial slug identifier")
    executed_at: datetime
    updated_by: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class ExecutionRecordSearch(CamelModel):
    """Execution record search parameters."""
    user_id: Optional[str] = None
    executed_by: Optional[str] = None
    project_id: Optional[UUID] = None
    trial_slug: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# ============================================================
# Pagination
# ============================================================

class RecordPagination(CamelModel):
    """Pagination parameters for records."""
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class PaginatedPatientRecordResponse(CamelModel):
    """Paginated patient record response."""
    items: List[PatientRecordResponse]
    total: int
    page: int
    size: int
    pages: int


class PaginatedExecutionRecordResponse(CamelModel):
    """Paginated execution record response."""
    items: List[ExecutionRecordResponse]
    total: int
    page: int
    size: int
    pages: int


__all__ = [
    # Patient Record
    "PatientRecordBase",
    "PatientRecordCreate",
    "PatientRecordUpdate",
    "PatientRecordResponse",
    "PatientRecordBulkCreate",
    "PatientRecordSearch",
    # Execution Record
    "ExecutionRecordBase",
    "ExecutionRecordCreate",
    "ExecutionRecordUpdate",
    "ExecutionRecordResponse",
    "ExecutionRecordSearch",
    # Pagination
    "RecordPagination",
    "PaginatedPatientRecordResponse",
    "PaginatedExecutionRecordResponse",
]
