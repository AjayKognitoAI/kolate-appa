"""
EnterpriseDatasource Model

Enterprise data source configuration.
Stored in the public schema.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Column, String, Text, ForeignKey, DateTime, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.enterprise import Enterprise


class EnterpriseDatasource(BaseModel):
    """
    EnterpriseDatasource model for tenant database configuration.

    Stores connection information for tenant-specific data sources.
    Connection strings should be encrypted at the application level.

    Attributes:
        id: UUID primary key
        enterprise_id: Foreign key to enterprise
        datasource_name: Human-readable name for the datasource
        datasource_type: Type of datasource (e.g., 'postgresql', 'mongodb')
        connection_string: Encrypted connection string
        host: Database host
        port: Database port
        database_name: Database name
        username: Database username (encrypted)
        schema_name: PostgreSQL schema name for this tenant
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "enterprise_datasources"
    __table_args__ = (
        Index('idx_datasource_enterprise', 'enterprise_id'),
        {'schema': 'public'}
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    enterprise_id = Column(
        UUID(as_uuid=True),
        ForeignKey("public.enterprises.id", ondelete="CASCADE"),
        nullable=False
    )
    datasource_name = Column(String(255), nullable=False)
    datasource_type = Column(String(50), nullable=False, default="postgresql")
    connection_string = Column(Text, nullable=True)  # Encrypted
    host = Column(String(255), nullable=True)
    port = Column(String(10), nullable=True)
    database_name = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)  # Encrypted
    schema_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    enterprise: "Enterprise" = relationship(
        "Enterprise",
        back_populates="datasources"
    )

    def __repr__(self) -> str:
        return f"<EnterpriseDatasource(id={self.id}, name='{self.datasource_name}')>"
