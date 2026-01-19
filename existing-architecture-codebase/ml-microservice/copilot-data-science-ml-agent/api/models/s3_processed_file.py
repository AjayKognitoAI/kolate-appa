from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, UniqueConstraint
from .base import Base


class S3ProcessedFile(Base):
    """Track S3 files that have been processed for trial analysis."""

    __tablename__ = "chatbot_s3_processed_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trial_name = Column(String(255), nullable=False, index=True)
    s3_bucket = Column(String(255), nullable=False)
    s3_key = Column(String(1000), nullable=False)  # Full S3 path
    file_name = Column(String(255), nullable=False)  # Just the filename
    content_hash = Column(String(64), nullable=False)  # SHA256 of content
    s3_etag = Column(String(255), nullable=True)  # S3 ETag for quick change detection
    file_size = Column(Integer, nullable=False)  # in bytes
    last_modified = Column(DateTime, nullable=False)  # S3 LastModified timestamp
    processed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="processed", nullable=False)  # processed, failed, pending
    error_message = Column(String(2000), nullable=True)  # Error details if failed
    analysis_metadata = Column(JSON, default=dict, nullable=True)  # Store row count, columns, etc.

    # Unique constraint on bucket + key to prevent duplicates
    __table_args__ = (
        UniqueConstraint('s3_bucket', 's3_key', name='uq_s3_bucket_key'),
    )

    def __repr__(self):
        return f"<S3ProcessedFile(id={self.id}, trial={self.trial_name}, file={self.file_name}, status={self.status})>"
