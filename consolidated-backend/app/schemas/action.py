from typing import Optional
from pydantic import Field
from app.schemas.base import CamelModel


class ActionBase(CamelModel):
    """Base Action schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Action name")
    description: Optional[str] = Field(None, description="Action description")


class ActionCreate(ActionBase):
    """Schema for creating a new action."""
    pass


class ActionUpdate(CamelModel):
    """Schema for updating an existing action."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Action name")
    description: Optional[str] = Field(None, description="Action description")


class ActionPatch(CamelModel):
    """Schema for partial updates to an action."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Action name")
    description: Optional[str] = Field(None, description="Action description")


class ActionOut(ActionBase):
    """Schema for action output."""
    id: int = Field(..., description="Action ID")

    class Config:
        from_attributes = True


class ActionSearch(CamelModel):
    """Schema for action search parameters."""
    name: Optional[str] = Field(None, description="Search by action name (partial match)")
    description: Optional[str] = Field(None, description="Search by description (partial match)")


# Pagination schemas
class ActionPaginatedResponse(CamelModel):
    """Paginated response for actions."""
    items: list[ActionOut]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")