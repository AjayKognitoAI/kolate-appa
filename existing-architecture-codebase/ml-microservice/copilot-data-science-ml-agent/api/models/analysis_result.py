from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class AnalysisResult(Base):
    """Store analysis results for reuse and reference."""

    __tablename__ = "chatbot_analysis_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), ForeignKey("chatbot_sessions.id"), nullable=False, index=True)
    analysis_type = Column(String(100), nullable=False)  # csv, research_paper, statistical, ml
    file_id = Column(Integer, ForeignKey("chatbot_uploaded_files.id"), nullable=True)
    result_data = Column(JSON, nullable=False)  # Store analysis results
    visualizations = Column(JSON, default=list, nullable=True)  # Store paths to generated plots
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    result_metadata = Column(JSON, default=dict, nullable=True)

    # Relationships
    session = relationship("Session", back_populates="analysis_results")
    file = relationship("UploadedFile", back_populates="analysis_results")

    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, type={self.analysis_type}, session_id={self.session_id})>"
