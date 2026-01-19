from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from .base import Base

class Session(Base):
    """Session model to track user sessions."""

    __tablename__ = "chatbot_sessions"

    id = Column(String(255), primary_key=True)
    org_id = Column(String(255), nullable=False, index=True)  # Organization ID for multi-tenancy
    user_id = Column(String(255), nullable=True, index=True)
    trial_name = Column(String(255), nullable=True, index=True)  # Default trial for this session (optional)
    starred = Column(Boolean, default=False, nullable=False)  # Whether session is starred/favorited
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    session_metadata = Column(JSON, default=dict, nullable=True)

    # Relationships
    conversation_states = relationship(
        "ConversationState", back_populates="session", cascade="all, delete-orphan"
    )
    analysis_results = relationship(
        "AnalysisResult", back_populates="session", cascade="all, delete-orphan"
    )
    uploaded_files = relationship(
        "UploadedFile", back_populates="session", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Session(id={self.id}, org_id={self.org_id}, user_id={self.user_id}, starred={self.starred}, active={self.is_active})>"
