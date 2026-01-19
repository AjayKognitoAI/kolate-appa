"""
Module and Trial Models

Module and Trial entities for feature management.
Stored in the public schema as shared data.
"""

import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import (
    Column, String, Text, Integer, Boolean, ForeignKey, DateTime, Index,
    func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.enterprise.access import EnterpriseModuleAccess


class Module(BaseModel):
    """
    Module model representing system modules/features.

    Modules are top-level features that can contain multiple trials.
    Examples: PREDICT, COMPARE, COPILOT, INSIGHTS

    Attributes:
        id: Integer primary key
        name: Module name (unique)
        description: Module description
        is_standalone: Whether the module is standalone or part of a suite
        icon_url: URL to module icon
        display_order: Order for UI display
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "modules"
    __table_args__ = (
        Index('idx_module_name', 'name'),
        {'schema': 'public'}
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_standalone = Column(Boolean, default=False, nullable=False)
    icon_url = Column(String(512), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    trials: List["Trial"] = relationship(
        "Trial",
        back_populates="module",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    enterprise_access: List["EnterpriseModuleAccess"] = relationship(
        "EnterpriseModuleAccess",
        back_populates="module",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Module(id={self.id}, name='{self.name}')>"


class Trial(BaseModel):
    """
    Trial model representing specific features within a module.

    Trials are sub-features that can be individually enabled for enterprises.
    Each trial has a unique slug used in URLs and API paths.

    Attributes:
        id: Integer primary key
        module_id: Foreign key to parent module
        slug: URL-safe unique identifier
        name: Trial display name
        description: Trial description
        icon_url: URL to trial icon
        display_order: Order for UI display
        is_active: Whether the trial is currently active
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "trials"
    __table_args__ = (
        Index('idx_trial_slug', 'slug'),
        Index('idx_trial_module', 'module_id'),
        {'schema': 'public'}
    )

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(
        Integer,
        ForeignKey("public.modules.id", ondelete="CASCADE"),
        nullable=False
    )
    slug = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(512), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    module: "Module" = relationship(
        "Module",
        back_populates="trials"
    )
    enterprise_access: List["EnterpriseModuleAccess"] = relationship(
        "EnterpriseModuleAccess",
        back_populates="trial",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Trial(id={self.id}, slug='{self.slug}', name='{self.name}')>"
