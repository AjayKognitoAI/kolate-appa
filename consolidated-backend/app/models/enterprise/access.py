"""
EnterpriseModuleAccess Model

Junction table for enterprise module/trial access grants.
Stored in the public schema.
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Integer, ForeignKey, DateTime, UniqueConstraint, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.enterprise import Enterprise
    from app.models.enterprise.module import Module, Trial


class EnterpriseModuleAccess(BaseModel):
    """
    EnterpriseModuleAccess model for managing enterprise access to modules/trials.

    This is a junction table that grants enterprises access to specific
    modules and optionally specific trials within those modules.

    Attributes:
        id: Integer primary key
        enterprise_id: Foreign key to enterprise
        module_id: Foreign key to module
        trial_id: Optional foreign key to specific trial
        access_level: Access level (e.g., 'FULL', 'READ_ONLY')
        granted_by: Who granted this access
        granted_at: When access was granted
        expires_at: Optional expiration date
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "enterprise_module_access"
    __table_args__ = (
        UniqueConstraint(
            'enterprise_id', 'module_id', 'trial_id',
            name='uq_enterprise_module_trial_access'
        ),
        Index('idx_access_enterprise', 'enterprise_id'),
        Index('idx_access_module', 'module_id'),
        {'schema': 'public'}
    )

    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.enterprises.id", ondelete="CASCADE"),
        nullable=False
    )
    module_id = Column(
        Integer,
        ForeignKey("public.modules.id", ondelete="CASCADE"),
        nullable=False
    )
    trial_id = Column(
        Integer,
        ForeignKey("public.trials.id", ondelete="CASCADE"),
        nullable=True  # Null means access to entire module
    )
    access_level = Column(String(50), default="FULL", nullable=False)
    granted_by = Column(String(128), nullable=True)
    granted_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    enterprise: "Enterprise" = relationship(
        "Enterprise",
        back_populates="module_access"
    )
    module: "Module" = relationship(
        "Module",
        back_populates="enterprise_access"
    )
    trial: Optional["Trial"] = relationship(
        "Trial",
        back_populates="enterprise_access"
    )

    def __repr__(self) -> str:
        trial_info = f", trial_id={self.trial_id}" if self.trial_id else ""
        return f"<EnterpriseModuleAccess(enterprise_id={self.enterprise_id}, module_id={self.module_id}{trial_info})>"

    @property
    def is_expired(self) -> bool:
        """Check if the access has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
