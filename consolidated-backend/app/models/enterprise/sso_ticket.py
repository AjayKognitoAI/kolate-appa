"""
SsoTicket Model

SSO ticket for enterprise admin authentication.
Stored in the public schema.
"""

import uuid
import secrets
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column, String, Integer, ForeignKey, DateTime, Boolean, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.enterprise import Enterprise


def generate_ticket() -> str:
    """Generate a secure random ticket string."""
    return secrets.token_urlsafe(32)


class SsoTicket(BaseModel):
    """
    SsoTicket model for enterprise admin SSO authentication.

    Provides one-time tickets for admin authentication during
    enterprise onboarding and SSO setup.

    Attributes:
        id: Integer primary key
        enterprise_id: Foreign key to enterprise
        ticket: Unique secure ticket string
        email: Email of the admin this ticket is for
        expires_at: When the ticket expires
        used: Whether the ticket has been used
        used_at: When the ticket was used
        created_at: Creation timestamp
    """

    __tablename__ = "sso_tickets"
    __table_args__ = (
        Index('idx_sso_ticket', 'ticket'),
        Index('idx_sso_ticket_enterprise', 'enterprise_id'),
        {'schema': 'public'}
    )

    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.enterprises.id", ondelete="CASCADE"),
        nullable=False
    )
    ticket = Column(String(64), unique=True, nullable=False, default=generate_ticket)
    email = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    enterprise: "Enterprise" = relationship("Enterprise")

    def __repr__(self) -> str:
        return f"<SsoTicket(id={self.id}, email='{self.email}', used={self.used})>"

    @classmethod
    def create_ticket(
        cls,
        enterprise_id: uuid.UUID,
        email: str,
        ttl_minutes: int = 60
    ) -> "SsoTicket":
        """
        Create a new SSO ticket.

        Args:
            enterprise_id: The enterprise ID
            email: The admin email
            ttl_minutes: Time-to-live in minutes (default 60)

        Returns:
            SsoTicket: The new ticket instance
        """
        return cls(
            enterprise_id=enterprise_id,
            email=email,
            expires_at=datetime.utcnow() + timedelta(minutes=ttl_minutes)
        )

    @property
    def is_valid(self) -> bool:
        """Check if the ticket is valid (not used and not expired)."""
        return not self.used and datetime.utcnow() < self.expires_at

    def mark_used(self):
        """Mark the ticket as used."""
        self.used = True
        self.used_at = datetime.utcnow()
