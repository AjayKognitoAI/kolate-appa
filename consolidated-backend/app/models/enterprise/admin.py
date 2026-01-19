"""
Admin Model

Enterprise administrator entity.
Stored in the public schema as shared data.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Integer, ForeignKey, DateTime, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.enterprise import Enterprise


class Admin(BaseModel):
    """
    Admin model representing enterprise administrators.

    Attributes:
        id: Integer primary key
        enterprise_id: Foreign key to enterprise
        auth0_user_id: Auth0 user identifier
        email: Admin email address
        first_name: Admin first name
        last_name: Admin last name
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "admins"
    __table_args__ = (
        Index('idx_admin_enterprise', 'enterprise_id'),
        Index('idx_admin_auth0_id', 'auth0_user_id'),
        Index('idx_admin_email', 'email'),
        {'schema': 'public'}
    )

    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.enterprises.id", ondelete="CASCADE"),
        nullable=False
    )
    auth0_user_id = Column(String(128), nullable=True, unique=True)
    email = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    enterprise: "Enterprise" = relationship(
        "Enterprise",
        back_populates="admins"
    )

    def __repr__(self) -> str:
        return f"<Admin(id={self.id}, email='{self.email}')>"

    @property
    def full_name(self) -> str:
        """Get the admin's full name."""
        parts = [self.first_name, self.last_name]
        return " ".join(filter(None, parts)) or self.email
