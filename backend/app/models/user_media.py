from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from enum import Enum
from app.models.base import BaseModel


class UserMediaType(str, Enum):
    """Types of user media."""
    PROFILE_PHOTO = "profile_photo"
    COVER_PHOTO = "cover_photo"


class UserMedia(BaseModel):
    """User media model for storing profile photos and cover photos."""

    __tablename__ = "user_media"

    user_id = Column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    media_type = Column(SQLEnum(UserMediaType), nullable=False, default=UserMediaType.PROFILE_PHOTO)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)
    storage_type = Column(String(50), nullable=False, default="local")  # local or s3
    is_primary = Column(Boolean, nullable=False, default=True)  # Primary photo
    deleted_at = Column(DateTime, nullable=True, index=True)  # Soft delete timestamp

    # Relationships
    user = relationship("User", back_populates="user_media")

    def __repr__(self):
        return (
            f"<UserMedia(id={self.id}, "
            f"user_id={self.user_id}, media_type='{self.media_type}', is_primary={self.is_primary})>"
        )
