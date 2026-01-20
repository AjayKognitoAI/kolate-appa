"""
Patient Screening Master Data Model

Represents uploaded patient data files stored in S3.
Contains metadata about the file and its contents.
"""

from sqlalchemy import Column, String, BigInteger, Integer, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.tenant.patient_screening.base import Base, UUIDPrimaryKey, TimestampMixin


class MasterData(Base, UUIDPrimaryKey, TimestampMixin):
    """
    Patient Screening Master Data Model.

    Represents an uploaded patient dataset file with:
    - S3 storage location
    - File metadata (name, type, size)
    - Data metadata (columns, row count, sample data)
    - Optional AI-generated column descriptions

    Attributes:
        id: UUID primary key
        study_id: Reference to parent study
        s3_bucket: S3 bucket name
        s3_key: S3 object key (path)
        s3_region: AWS region
        file_name: Original filename
        file_type: File format (csv, json, xlsx)
        file_size: File size in bytes
        content_type: MIME type
        row_count: Number of data rows
        columns: Column names and types as JSONB
        sample_data: First 5 rows for preview
        patient_id_column: Column containing unique patient IDs
        column_descriptions: AI-generated column metadata
        created_by: Auth0 user ID who uploaded
        created_at: Upload timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "patient_screening_master_data"

    # Study reference (cascades on study delete)
    study_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_screening_studies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # S3 storage location
    s3_bucket = Column(String(255), nullable=False)
    s3_key = Column(String(500), nullable=False)
    s3_region = Column(String(50), nullable=False, default="us-east-1")

    # File metadata
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # csv, json, xlsx
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=True)

    # Data metadata
    row_count = Column(Integer, nullable=False)
    columns = Column(JSONB, nullable=False)  # {"column_name": "column_type"}
    sample_data = Column(JSONB, nullable=True)  # First 5 rows preview
    patient_id_column = Column(String(255), nullable=True)  # Column name for unique patient IDs
    column_descriptions = Column(JSONB, nullable=True)  # AI-generated: {"column_name": {type, description, ...}}

    # Audit fields
    # Note: enterprise_id removed - handled by schema-based multi-tenancy
    created_by = Column(String(255), nullable=False)

    # Relationships
    study = relationship("Study", back_populates="master_data_list")
    cohorts = relationship(
        "Cohort",
        back_populates="master_data",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "file_type IN ('csv', 'json', 'xlsx')",
            name="ps_master_data_valid_file_type"
        ),
        CheckConstraint(
            "row_count >= 0",
            name="ps_master_data_positive_row_count"
        ),
        CheckConstraint(
            "file_size > 0",
            name="ps_master_data_positive_file_size"
        ),
    )

    def __repr__(self):
        return f"<MasterData(id={self.id}, file_name='{self.file_name}', rows={self.row_count})>"
