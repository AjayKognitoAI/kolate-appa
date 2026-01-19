"""
MongoDB Schemas Package

Pydantic schemas for MongoDB document models.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field

from app.schemas.base import CamelModel


# Patient Record Schemas
class PatientRecordBase(CamelModel):
    """Base patient record schema."""
    record_id: Optional[str] = Field(None, description="Custom record identifier")
    patient_data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Optional[Dict[str, Any]] = None


class PatientRecordCreate(PatientRecordBase):
    """Schema for creating a patient record."""
    pass


class PatientRecordUpdate(CamelModel):
    """Schema for updating a patient record."""
    patient_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class PatientRecordResponse(PatientRecordBase):
    """Patient record response schema."""
    id: str = Field(..., alias="_id", description="MongoDB document ID")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class PatientRecordBulkCreate(CamelModel):
    """Schema for bulk creating patient records."""
    records: List[PatientRecordCreate]


class PatientRecordSearch(CamelModel):
    """Patient record search parameters."""
    record_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None  # Flexible field filters


# Execution Record Schemas
class ExecutionRecordBase(CamelModel):
    """Base execution record schema."""
    user_id: str = Field(..., description="Auth0 ID of the user")
    base_patient_data: Dict[str, Any] = Field(default_factory=dict)
    base_prediction: List[Dict[str, Any]] = Field(default_factory=list)
    executed_by: Optional[str] = None


class ExecutionRecordCreate(ExecutionRecordBase):
    """Schema for creating an execution record."""
    pass


class ExecutionRecordUpdate(CamelModel):
    """Schema for updating an execution record."""
    base_patient_data: Optional[Dict[str, Any]] = None
    base_prediction: Optional[List[Dict[str, Any]]] = None
    updated_by: Optional[str] = None


class ExecutionRecordResponse(ExecutionRecordBase):
    """Execution record response schema."""
    id: str = Field(..., alias="_id", description="MongoDB document ID")
    executed_at: datetime
    updated_by: Optional[str] = None
    updated_at: datetime

    class Config:
        populate_by_name = True


class ExecutionRecordSearch(CamelModel):
    """Execution record search parameters."""
    user_id: Optional[str] = None
    executed_by: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


# Pagination for MongoDB
class MongoPagination(CamelModel):
    """MongoDB pagination parameters."""
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class MongoPaginatedResponse(CamelModel):
    """MongoDB paginated response."""
    items: List[Any]
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
    "MongoPagination",
    "MongoPaginatedResponse",
]
