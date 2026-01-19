"""
Enterprise Model

Core enterprise entity for the Kolate platform.
Stored in the public schema as shared data across all tenants.
"""

import uuid
import enum
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Text, DateTime, Enum, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.admin import Admin
    from app.models.enterprise.datasource import EnterpriseDatasource
    from app.models.enterprise.onboarding import EnterpriseOnboardingProgress
    from app.models.enterprise.access import EnterpriseModuleAccess


class EnterpriseStatus(str, enum.Enum):
    """Enterprise status enumeration."""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class Enterprise(BaseModel):
    """
    Enterprise model representing an organization in the Kolate platform.

    This is a multi-tenant parent entity. Each enterprise has a unique
    organization_id that maps to an Auth0 organization and a PostgreSQL
    schema for tenant-specific data.

    Attributes:
        id: UUID primary key
        organization_id: Unique Auth0 organization identifier
        name: Enterprise name
        url: Enterprise website URL
        domain: Enterprise domain for SSO
        description: Enterprise description
        logo_url: URL to enterprise logo
        admin_email: Primary admin email address
        zip_code: Enterprise location zip code
        region: Enterprise region/state
        size: Enterprise size category
        contact_number: Contact phone number
        status: Enterprise status (ACTIVE, INACTIVE, etc.)
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "enterprises"
    __table_args__ = (
        Index('idx_enterprise_org_id', 'organization_id'),
        Index('idx_enterprise_domain', 'domain'),
        Index('idx_enterprise_status', 'status'),
        Index('idx_enterprise_admin_email', 'admin_email'),
        {'schema': 'public'}  # Explicitly in public schema
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    organization_id = Column(
        String(64),
        unique=True,
        nullable=False,
        comment="Auth0 organization ID"
    )
    name = Column(String(255), nullable=False)
    url = Column(String(512), nullable=True)
    domain = Column(String(255), nullable=True, unique=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(512), nullable=True)
    admin_email = Column(String(255), nullable=False)
    zip_code = Column(String(20), nullable=True)
    region = Column(String(100), nullable=True)
    size = Column(String(50), nullable=True)
    contact_number = Column(String(50), nullable=True)
    status = Column(
        Enum(EnterpriseStatus),
        default=EnterpriseStatus.PENDING,
        nullable=False
    )

    # Override base timestamps to use PostgreSQL-native functions
    created_at = Column(
        DateTime,
        default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    admins: List["Admin"] = relationship(
        "Admin",
        back_populates="enterprise",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    datasources: List["EnterpriseDatasource"] = relationship(
        "EnterpriseDatasource",
        back_populates="enterprise",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    onboarding_progress: Optional["EnterpriseOnboardingProgress"] = relationship(
        "EnterpriseOnboardingProgress",
        back_populates="enterprise",
        uselist=False,
        cascade="all, delete-orphan"
    )
    module_access: List["EnterpriseModuleAccess"] = relationship(
        "EnterpriseModuleAccess",
        back_populates="enterprise",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Enterprise(id={self.id}, name='{self.name}', org_id='{self.organization_id}')>"

    @property
    def is_active(self) -> bool:
        """Check if the enterprise is in active status."""
        return self.status == EnterpriseStatus.ACTIVE

    @property
    def tenant_schema_name(self) -> str:
        """Get the PostgreSQL schema name for this tenant."""
        return f"org_{self.organization_id}"
