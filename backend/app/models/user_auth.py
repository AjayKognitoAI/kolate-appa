from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.base import BaseModel


class AuthType(str, enum.Enum):
    """Authentication method types."""
    EMAIL = "email"
    PHONE = "phone"
    GOOGLE = "google"
    FACEBOOK = "facebook"
    APPLE = "apple"


class UserAuth(BaseModel):
    """User authentication credentials model."""

    __tablename__ = "user_auth"

    user_id = Column(String(64), ForeignKey("users.id"), nullable=False)
    auth_type = Column(Enum(AuthType), nullable=False)
    identifier = Column(String(255), nullable=False, index=True)  # email, phone, etc.
    secret_hash = Column(Text, nullable=True)  # password hash, null for OAuth
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="user_auths")

    # Composite unique constraint: user can have only one auth method of each type
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

    def __repr__(self):
        return f"<UserAuth(id={self.id}, user_id={self.user_id}, auth_type={self.auth_type})>"


    @classmethod
    def create_email_auth(cls, user_id: str, email: str, password_hash: str):
        """Create email-based authentication record."""
        return cls(
            user_id=user_id,
            auth_type=AuthType.EMAIL,
            identifier=email,
            secret_hash=password_hash
        )

    @classmethod
    def create_oauth_auth(cls, user_id: str, auth_type: AuthType, provider_id: str):
        """Create OAuth-based authentication record."""
        return cls(
            user_id=user_id,
            auth_type=auth_type,
            identifier=provider_id,
            secret_hash=None  # OAuth doesn't store password
        )