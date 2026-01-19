from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta, timezone
import uuid
from app.models.base import BaseModelWithStringId


class UserSession(BaseModelWithStringId):
    """User session management for JWT tokens."""

    __tablename__ = "user_sessions"

    user_id = Column(String(64), ForeignKey("users.id"), nullable=False)
    jti = Column(String(64), unique=True, nullable=False, index=True)  # JWT ID
    refresh_token = Column(Text, nullable=False)  # Encrypted refresh token
    issued_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Optional session metadata
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    device_fingerprint = Column(String(128), nullable=True)

    # Relationships
    user = relationship("User", back_populates="user_sessions")

    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, jti={self.jti}, active={self.is_active})>"

    @classmethod
    def create_session(
        cls,
        user_id: str,
        refresh_token: str,
        expires_hours: int = 24*7,  # 7 days default
        user_agent: str = None,
        ip_address: str = None,
        device_fingerprint: str = None
    ):
        """Create a new user session."""
        session_id = str(uuid.uuid4())
        jti = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

        return cls(
            id=session_id,
            user_id=user_id,
            jti=jti,
            refresh_token=refresh_token,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
            device_fingerprint=device_fingerprint
        )

    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.now(timezone.utc) > self.expires_at

    def is_valid(self) -> bool:
        """Check if session is valid (active and not expired)."""
        return self.is_active and not self.is_expired()

    def deactivate(self):
        """Deactivate the session."""
        self.is_active = False

    def extend_expiry(self, hours: int = 24*7):
        """Extend session expiry."""
        self.expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)