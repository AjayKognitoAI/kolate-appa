from typing import Optional
from datetime import datetime
from pydantic import Field
from app.schemas.base import CamelModel
from app.models.user_media import UserMediaType


class UserMediaOut(CamelModel):
    """Schema for user media output."""

    id: int = Field(..., description="Media ID")
    user_id: str = Field(..., description="User ID")
    media_type: UserMediaType = Field(..., description="Media type (profile_photo/cover_photo)")
    file_path: str = Field(..., description="File path")
    file_name: str = Field(..., description="File name")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type")
    storage_type: str = Field(..., description="Storage type (local/s3)")
    is_primary: bool = Field(..., description="Is primary photo")
    file_url: Optional[str] = Field(None, description="URL to access the file")
    created_at: datetime = Field(..., description="Upload timestamp")

    class Config:
        from_attributes = True


class UserMediaCreate(CamelModel):
    """Schema for creating user media."""

    media_type: UserMediaType = Field(
        default=UserMediaType.PROFILE_PHOTO,
        description="Media type (profile_photo/cover_photo)"
    )
    is_primary: bool = Field(
        default=True,
        description="Is primary photo"
    )


class UserMediaUpdate(CamelModel):
    """Schema for updating user media."""

    is_primary: Optional[bool] = Field(None, description="Is primary photo")
    media_type: Optional[UserMediaType] = Field(None, description="Media type")
