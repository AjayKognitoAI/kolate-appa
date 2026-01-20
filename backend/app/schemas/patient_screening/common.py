"""
Patient Screening Common Schemas

Shared response schemas used across all patient screening endpoints.
"""

from typing import Optional, Any, Dict
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response"""
    status: str = "error"
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class DeleteResponse(BaseModel):
    """Response for delete operations"""
    status: str = "success"
    message: str


class SuccessResponse(BaseModel):
    """Generic success response with data"""
    status: str = "success"
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}
