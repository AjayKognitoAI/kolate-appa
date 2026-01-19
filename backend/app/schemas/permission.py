from typing import Optional
from pydantic import Field
from app.schemas.base import CamelModel
from app.schemas.feature import FeatureOut
from app.schemas.action import ActionOut


class PermissionBase(CamelModel):
    """Base Permission schema with common fields."""
    feature_id: int = Field(..., description="Feature ID")
    action_id: int = Field(..., description="Action ID")
    code: str = Field(..., min_length=1, max_length=100, description="Permission code (e.g., 'gig:read')")


class PermissionCreate(PermissionBase):
    """Schema for creating a new permission."""
    pass


class PermissionUpdate(CamelModel):
    """Schema for updating an existing permission."""
    feature_id: Optional[int] = Field(None, description="Feature ID")
    action_id: Optional[int] = Field(None, description="Action ID")
    code: Optional[str] = Field(None, min_length=1, max_length=100, description="Permission code")


class PermissionPatch(CamelModel):
    """Schema for partial updates to a permission."""
    feature_id: Optional[int] = Field(None, description="Feature ID")
    action_id: Optional[int] = Field(None, description="Action ID")
    code: Optional[str] = Field(None, min_length=1, max_length=100, description="Permission code")


class PermissionOut(PermissionBase):
    """Schema for permission output."""
    id: int = Field(..., description="Permission ID")

    class Config:
        from_attributes = True


class PermissionWithDetails(PermissionOut):
    """Schema for permission output with feature and action details."""
    feature: Optional[FeatureOut] = None
    action: Optional[ActionOut] = None

    class Config:
        from_attributes = True


class PermissionSearch(CamelModel):
    """Schema for permission search parameters."""
    code: Optional[str] = Field(None, description="Search by permission code (partial match)")
    feature_id: Optional[int] = Field(None, description="Filter by feature ID")
    action_id: Optional[int] = Field(None, description="Filter by action ID")


# Pagination schemas
class PermissionPaginatedResponse(CamelModel):
    """Paginated response for permissions."""
    items: list[PermissionOut]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")


class PermissionWithDetailsPaginatedResponse(CamelModel):
    """Paginated response for permissions with details."""
    items: list[PermissionWithDetails]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")