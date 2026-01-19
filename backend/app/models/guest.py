from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.models.base import BaseModel


class Guest(BaseModel):
    """Guest model for anonymous users with temporary sessions."""

    __tablename__ = "guests"

    session_id = Column(String(128), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))  # Support both IPv4 and IPv6
    user_agent = Column(Text)
    device_fingerprint = Column(String(255))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_activity = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self):
        return f"<Guest(id={self.id}, session_id='{self.session_id}', is_active={self.is_active})>"

    @classmethod
    def create_guest_session(
        cls,
        session_id: str,
        expires_at,
        ip_address: str = None,
        user_agent: str = None,
        device_fingerprint: str = None,
    ):
        """Create a new guest session."""
        return cls(
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            expires_at=expires_at,
            is_active=True,
        )

    def is_expired(self) -> bool:
        """Check if guest session is expired."""
        from datetime import datetime, timezone

        return datetime.now(timezone.utc) > self.expires_at

    def update_activity(self):
        """Update last activity timestamp."""
        from datetime import datetime, timezone

        self.last_activity = datetime.now(timezone.utc)
