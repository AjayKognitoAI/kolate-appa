"""CRUD operations for ConversationState model."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as DBSession

from api.models.conversation_state import ConversationState
from .base import CRUDBase


class CRUDConversationState(CRUDBase[ConversationState, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for ConversationState model."""
    
    def get_by_session(
        self, db: DBSession, *, session_id: str, limit: Optional[int] = None
    ) -> List[ConversationState]:
        """
        Get conversation history for a session.
        
        Args:
            db: Database session
            session_id: Session ID
            limit: Maximum number of conversation turns to return
            
        Returns:
            List of conversation states ordered by turn number
        """
        query = (
            db.query(self.model)
            .filter(self.model.session_id == session_id)
            .order_by(self.model.turn_number)
        )
        if limit:
            query = query.limit(limit)
        return query.all()
    
    def get_latest(self, db: DBSession, *, session_id: str) -> Optional[ConversationState]:
        """
        Get the latest conversation turn for a session.
        
        Args:
            db: Database session
            session_id: Session ID
            
        Returns:
            Latest conversation state or None if no conversations exist
        """
        return (
            db.query(self.model)
            .filter(self.model.session_id == session_id)
            .order_by(self.model.turn_number.desc())
            .first()
        )
    
    def get_latest_context(self, db: DBSession, *, session_id: str) -> Optional[Dict]:
        """
        Get the latest context data from conversation history.
        
        Args:
            db: Database session
            session_id: Session ID
            
        Returns:
            Latest context data or empty dict if no conversations exist
        """
        latest = self.get_latest(db, session_id=session_id)
        return latest.context_data if latest else {}
    
    def add_turn(
        self,
        db: DBSession,
        *,
        session_id: str,
        user_message: str,
        agent_response: Optional[str] = None,
        agent_type: Optional[str] = None,
        context_data: Optional[Dict] = None,
    ) -> ConversationState:
        """
        Add a conversation turn.
        
        Args:
            db: Database session
            session_id: Session ID
            user_message: User's message
            agent_response: Agent's response
            agent_type: Type of agent that handled this turn
            context_data: Context data for this turn
            
        Returns:
            Created conversation state
        """
        # Get current turn number
        max_turn = (
            db.query(self.model)
            .filter(self.model.session_id == session_id)
            .count()
        )
        
        conv_state_data = {
            "session_id": session_id,
            "turn_number": max_turn + 1,
            "user_message": user_message,
            "agent_response": agent_response,
            "agent_type": agent_type,
            "context_data": context_data or {},
        }
        db_obj = self.model(**conv_state_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_count(self, db: DBSession, *, session_id: str) -> int:
        """
        Get the number of conversation turns for a session.
        
        Args:
            db: Database session
            session_id: Session ID
            
        Returns:
            Number of conversation turns
        """
        return (
            db.query(self.model)
            .filter(self.model.session_id == session_id)
            .count()
        )


# Create a singleton instance
conversation_state_crud = CRUDConversationState(ConversationState)
