from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class UploadedFile(Base):
    """Track uploaded files for analysis."""

    __tablename__ = "chatbot_uploaded_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), ForeignKey("chatbot_sessions.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # csv, pdf, xlsx, etc.
    file_size = Column(Integer, nullable=False)  # in bytes
    upload_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_processed = Column(Boolean, default=False, nullable=False)
    file_metadata = Column(JSON, default=dict, nullable=True)  # Store column info, page count, etc.

    # Relationships
    session = relationship("Session", back_populates="uploaded_files")
    analysis_results = relationship("AnalysisResult", back_populates="file")

    def __repr__(self):
        return f"<UploadedFile(id={self.id}, filename={self.filename}, type={self.file_type})>"
