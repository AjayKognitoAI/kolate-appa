"""
Patient Record and Execution Record Models

Clinical data records stored in tenant-specific schemas using PostgreSQL JSONB
for flexible patient data and prediction results.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Index, Text, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base


class PatientRecord(Base):
    """
    Patient record model for storing clinical patient data.

    Stored in tenant-specific schemas (org_xxx) with project/trial scoping.
    Uses JSONB for flexible patient_data and metadata fields.

    Attributes:
        id: UUID primary key
        project_id: Foreign key to project
        trial_slug: Trial slug identifier
        record_id: Custom record identifier (unique within project/trial)
        patient_data: Flexible JSONB field for patient demographics/clinical data
        metadata: Additional metadata in JSONB format
        created_by: Auth0 ID of the creator
        updated_by: Auth0 ID of last updater
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "patient_records"
    __table_args__ = (
        Index('idx_patient_record_project', 'project_id'),
        Index('idx_patient_record_trial', 'trial_slug'),
        Index('idx_patient_record_id', 'record_id'),
        Index('idx_patient_record_created', 'created_at'),
        Index('idx_patient_record_project_trial', 'project_id', 'trial_slug'),
        # GIN index for JSONB patient_data queries
        Index('idx_patient_record_data', 'patient_data', postgresql_using='gin'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    trial_slug = Column(String(100), nullable=False)
    record_id = Column(String(255), nullable=False)  # Custom record identifier

    # Flexible JSONB fields for clinical data
    patient_data = Column(JSONB, nullable=False, default=dict)
    metadata = Column(JSONB, nullable=True, default=dict)

    # Audit fields
    created_by = Column(String(128), nullable=True)  # Auth0 user ID
    updated_by = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", foreign_keys=[project_id])

    def __repr__(self) -> str:
        return f"<PatientRecord(id={self.id}, record_id='{self.record_id}', project_id={self.project_id})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": str(self.id),
            "record_id": self.record_id,
            "project_id": str(self.project_id),
            "trial_slug": self.trial_slug,
            "patient_data": self.patient_data,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ExecutionRecord(Base):
    """
    Execution record model for storing ML prediction results.

    Stored in tenant-specific schemas (org_xxx) with project/trial scoping.
    Uses JSONB for flexible input data and prediction results.

    Attributes:
        id: UUID primary key
        execution_id: Unique execution identifier
        project_id: Foreign key to project
        trial_slug: Trial slug identifier
        user_id: Auth0 ID of the user who owns this execution
        base_patient_data: Input patient data used for prediction (JSONB)
        base_prediction: ML prediction results (JSONB array)
        executed_by: Auth0 ID of who triggered the execution
        executed_at: Execution timestamp
        updated_by: Auth0 ID of last updater
        updated_at: Last update timestamp
    """

    __tablename__ = "execution_records"
    __table_args__ = (
        Index('idx_execution_record_project', 'project_id'),
        Index('idx_execution_record_trial', 'trial_slug'),
        Index('idx_execution_record_execution_id', 'execution_id'),
        Index('idx_execution_record_user', 'user_id'),
        Index('idx_execution_record_executed_by', 'executed_by'),
        Index('idx_execution_record_executed_at', 'executed_at'),
        Index('idx_execution_record_project_trial', 'project_id', 'trial_slug'),
        Index('idx_execution_record_user_date', 'user_id', 'executed_at'),
        # GIN index for JSONB queries
        Index('idx_execution_record_data', 'base_patient_data', postgresql_using='gin'),
        # No schema specified - uses search_path from tenant context
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    execution_id = Column(String(255), unique=True, nullable=False)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    trial_slug = Column(String(100), nullable=False)
    user_id = Column(String(128), nullable=False)  # Auth0 ID of the owning user

    # Flexible JSONB fields for execution data
    base_patient_data = Column(JSONB, nullable=False, default=dict)
    base_prediction = Column(JSONB, nullable=False, default=list)  # Array of predictions

    # Execution audit fields
    executed_by = Column(String(128), nullable=True)  # Auth0 user ID who triggered
    executed_at = Column(DateTime, default=func.now(), nullable=False)
    updated_by = Column(String(128), nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", foreign_keys=[project_id])

    def __repr__(self) -> str:
        return f"<ExecutionRecord(id={self.id}, execution_id='{self.execution_id}', user_id='{self.user_id}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": str(self.id),
            "execution_id": self.execution_id,
            "project_id": str(self.project_id),
            "trial_slug": self.trial_slug,
            "user_id": self.user_id,
            "base_patient_data": self.base_patient_data,
            "base_prediction": self.base_prediction,
            "executed_by": self.executed_by,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "updated_by": self.updated_by,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
