from typing import Optional
from pydantic import Field, field_validator, validator
from app.schemas.base import CamelModel


class FeatureBase(CamelModel):
    """Base Feature schema with common fields."""

    name: str = Field(..., min_length=1, max_length=100, description="Feature name")
    description: Optional[str] = Field(None, description="Feature description")


class FeatureCreate(FeatureBase):
    """Schema for creating a new feature."""

    pass


class FeatureUpdate(CamelModel):
    """Schema for updating an existing feature."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Feature name"
    )
    description: Optional[str] = Field(None, description="Feature description")


class FeaturePatch(CamelModel):
    """Schema for partial updates to a feature."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Feature name"
    )
    description: Optional[str] = Field(None, description="Feature description")


class FeatureOut(FeatureBase):
    """Schema for feature output."""

    id: int = Field(..., description="Feature ID")

    class Config:
        from_attributes = True


class FeatureSearch(CamelModel):
    """Schema for feature search parameters."""

    name: Optional[str] = Field(
        None, description="Search by feature name (partial match)"
    )
    description: Optional[str] = Field(
        None, description="Search by description (partial match)"
    )


# Pagination schemas
class PaginationParams(CamelModel):
    """Pagination parameters."""

    page: int = Field(1, ge=1, description="Page number (starts from 1)")
    size: int = Field(
        10,
        le=100,
        description="Page size (max 100, -1 for all records)",
    )
    sort_by: Optional[str] = Field("id", description="Field to sort by")
    sort_order: Optional[str] = Field(
        "asc", pattern="^(asc|desc)$", description="Sort order"
    )

    @field_validator("size")
    def validate_size(cls, v):
        """Validate size: must be -1 (all records) or >= 1."""
        if v == 0:
            raise ValueError(
                "Size cannot be 0. Use -1 for all records or >= 1 for pagination."
            )
        if v < -1:
            raise ValueError("Size must be -1 (all records) or >= 1.")
        return v


class PaginatedResponse(CamelModel):
    """Generic paginated response."""

    items: list
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")


class FeaturePaginatedResponse(PaginatedResponse):
    """Paginated response for features."""

    items: list[FeatureOut]
