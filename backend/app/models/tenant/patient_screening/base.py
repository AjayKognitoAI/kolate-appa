"""
Patient Screening Model Base Classes

Provides UUID primary key and timestamp mixins for patient screening models.
"""

import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class UUIDPrimaryKey:
    """Mixin for UUID primary key"""

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )


class TimestampMixin:
    """Mixin for created_at/updated_at timestamps with timezone support"""

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


# Re-export Base for convenience
__all__ = ["Base", "UUIDPrimaryKey", "TimestampMixin"]
