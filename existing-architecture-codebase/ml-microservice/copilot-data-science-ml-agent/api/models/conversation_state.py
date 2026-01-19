from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class ConversationState(Base):
    """Conversation state to maintain context across interactions."""

    __tablename__ = "chatbot_conversation_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), ForeignKey("chatbot_sessions.id"), nullable=False, index=True)
    turn_number = Column(Integer, nullable=False)
    user_message = Column(Text, nullable=False)
    agent_response = Column(Text, nullable=True)
    agent_type = Column(String(100), nullable=True)  # Which sub-agent handled this
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    context_data = Column(JSON, default=dict, nullable=True)  # Store variables, dataframes info, etc.

    # Relationships
    session = relationship("Session", back_populates="conversation_states")

    def __repr__(self):
        return f"<ConversationState(id={self.id}, session_id={self.session_id}, turn={self.turn_number})>"
