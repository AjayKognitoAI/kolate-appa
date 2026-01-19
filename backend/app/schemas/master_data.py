from typing import Optional, List
from pydantic import Field
from app.schemas.base import CamelModel


# MasterDataLocale schemas
class MasterDataLocaleBase(CamelModel):
    """Base MasterDataLocale schema with common fields."""
    locale: str = Field(..., min_length=2, max_length=10, description="Locale code (e.g., en_US, fr_FR)")
    display_name: str = Field(..., min_length=1, max_length=255, description="Localized display name")
    description: Optional[str] = Field(None, description="Localized description")


class MasterDataLocaleCreate(MasterDataLocaleBase):
    """Schema for creating a new master data locale."""
    pass


class MasterDataLocaleUpdate(CamelModel):
    """Schema for updating an existing master data locale."""
    locale: Optional[str] = Field(None, min_length=2, max_length=10, description="Locale code")
    display_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Localized display name")
    description: Optional[str] = Field(None, description="Localized description")


class MasterDataLocalePatch(CamelModel):
    """Schema for partial updates to a master data locale."""
    locale: Optional[str] = Field(None, min_length=2, max_length=10, description="Locale code")
    display_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Localized display name")
    description: Optional[str] = Field(None, description="Localized description")


class MasterDataLocaleOut(MasterDataLocaleBase):
    """Schema for master data locale output."""
    id: int = Field(..., description="Locale ID")
    master_id: int = Field(..., description="Master data ID")

    class Config:
        from_attributes = True


# MasterData schemas
class MasterDataBase(CamelModel):
    """Base MasterData schema with common fields."""
    scope: str = Field(..., min_length=1, max_length=100, description="Data scope")
    code: str = Field(..., min_length=1, max_length=100, description="Data code")
    display_name: str = Field(..., min_length=1, max_length=255, description="Display name")
    parent_scope: Optional[str] = Field(None, max_length=100, description="Parent scope")
    parent_code: Optional[str] = Field(None, max_length=100, description="Parent code")
    description: Optional[str] = Field(None, description="Description")
    is_active: bool = Field(True, description="Whether the data is active")
    sort_order: int = Field(0, description="Sort order")


class MasterDataCreate(MasterDataBase):
    """Schema for creating a new master data."""
    pass


class MasterDataUpdate(CamelModel):
    """Schema for updating an existing master data."""
    scope: Optional[str] = Field(None, min_length=1, max_length=100, description="Data scope")
    code: Optional[str] = Field(None, min_length=1, max_length=100, description="Data code")
    display_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Display name")
    parent_scope: Optional[str] = Field(None, max_length=100, description="Parent scope")
    parent_code: Optional[str] = Field(None, max_length=100, description="Parent code")
    description: Optional[str] = Field(None, description="Description")
    is_active: Optional[bool] = Field(None, description="Whether the data is active")
    sort_order: Optional[int] = Field(None, description="Sort order")


class MasterDataPatch(CamelModel):
    """Schema for partial updates to master data."""
    scope: Optional[str] = Field(None, min_length=1, max_length=100, description="Data scope")
    code: Optional[str] = Field(None, min_length=1, max_length=100, description="Data code")
    display_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Display name")
    parent_scope: Optional[str] = Field(None, max_length=100, description="Parent scope")
    parent_code: Optional[str] = Field(None, max_length=100, description="Parent code")
    description: Optional[str] = Field(None, description="Description")
    is_active: Optional[bool] = Field(None, description="Whether the data is active")
    sort_order: Optional[int] = Field(None, description="Sort order")


class MasterDataOut(MasterDataBase):
    """Schema for master data output."""
    id: int = Field(..., description="Master data ID")

    class Config:
        from_attributes = True


class MasterDataWithLocalesOut(MasterDataBase):
    """Schema for master data output with locales included."""
    id: int = Field(..., description="Master data ID")
    locales: Optional[List[MasterDataLocaleOut]] = Field([], description="Localized values")

    class Config:
        from_attributes = True


class MasterDataSearch(CamelModel):
    """Schema for master data search parameters."""
    scope: Optional[str] = Field(None, description="Search by scope (partial match)")
    code: Optional[str] = Field(None, description="Search by code (partial match)")
    display_name: Optional[str] = Field(None, description="Search by display name (partial match)")
    parent_scope: Optional[str] = Field(None, description="Search by parent scope")
    parent_code: Optional[str] = Field(None, description="Search by parent code")
    is_active: Optional[bool] = Field(None, description="Filter by active status")


# Schema for locale-specific responses
class MasterDataWithLocaleOut(CamelModel):
    """Schema for master data output with locale-specific values."""
    id: int = Field(..., description="Master data ID")
    scope: str = Field(..., description="Data scope")
    code: str = Field(..., description="Data code")
    display_name: str = Field(..., description="Localized display name (fallback to default if not found)")
    parent_scope: Optional[str] = Field(None, description="Parent scope")
    parent_code: Optional[str] = Field(None, description="Parent code")
    description: Optional[str] = Field(None, description="Localized description (fallback to default if not found)")
    is_active: bool = Field(..., description="Whether the data is active")
    sort_order: int = Field(..., description="Sort order")
    locale: Optional[str] = Field(None, description="Locale used for localized values")

    class Config:
        from_attributes = True