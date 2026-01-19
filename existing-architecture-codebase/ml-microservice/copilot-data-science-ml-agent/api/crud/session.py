"""CRUD operations for Session model."""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as DBSession
import uuid

from api.models.session import Session
from .base import CRUDBase


class CRUDSession(CRUDBase[Session, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for Session model."""
    
    def create_session(
        self,
        db: DBSession,
        *,
        org_id: str,
        user_id: Optional[str] = None,
        trial_name: Optional[str] = None,
        timeout_minutes: int = 60,
        session_metadata: Optional[Dict] = None
    ) -> Session:
        """
        Create a new session.

        Args:
            db: Database session
            org_id: Organization ID (required for multi-tenancy)
            user_id: Optional user ID
            trial_name: Optional default trial name for this session
            timeout_minutes: Session timeout in minutes
            session_metadata: Optional metadata dictionary

        Returns:
            Created session
        """
        session_data = {
            "id": str(uuid.uuid4()),
            "org_id": org_id,
            "user_id": user_id,
            "trial_name": trial_name,
            "starred": False,
            "expires_at": datetime.utcnow() + timedelta(minutes=timeout_minutes),
            "session_metadata": session_metadata or {},
        }
        db_obj = self.model(**session_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_by_org(
        self,
        db: DBSession,
        *,
        org_id: str,
        starred_only: bool = False,
        active_only: bool = True,
        limit: Optional[int] = None
    ) -> List[Session]:
        """
        Get all sessions for an organization.
        
        Args:
            db: Database session
            org_id: Organization ID
            starred_only: If True, only return starred sessions
            active_only: If True, only return active sessions
            limit: Maximum number of sessions to return
            
        Returns:
            List of sessions
        """
        query = db.query(self.model).filter(self.model.org_id == org_id)
        if starred_only:
            query = query.filter(self.model.starred == True)
        if active_only:
            query = query.filter(self.model.is_active == True)
        query = query.order_by(self.model.updated_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    def get_with_org(
        self, db: DBSession, *, session_id: str, org_id: Optional[str] = None
    ) -> Optional[Session]:
        """
        Get session by ID, optionally filtered by org_id.
        
        Args:
            db: Database session
            session_id: Session ID
            org_id: Optional organization ID for filtering
            
        Returns:
            Session or None if not found
        """
        query = db.query(self.model).filter(self.model.id == session_id)
        if org_id:
            query = query.filter(self.model.org_id == org_id)
        return query.first()
    
    def toggle_star(
        self, db: DBSession, *, session_id: str, org_id: Optional[str] = None
    ) -> Optional[Session]:
        """
        Toggle the starred status of a session.
        
        Args:
            db: Database session
            session_id: Session ID
            org_id: Optional organization ID for filtering
            
        Returns:
            Updated session or None if not found
        """
        query = db.query(self.model).filter(self.model.id == session_id)
        if org_id:
            query = query.filter(self.model.org_id == org_id)
        session = query.first()
        if session:
            session.starred = not session.starred
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
        return session
    
    def set_star(
        self,
        db: DBSession,
        *,
        session_id: str,
        starred: bool,
        org_id: Optional[str] = None
    ) -> Optional[Session]:
        """
        Set the starred status of a session.
        
        Args:
            db: Database session
            session_id: Session ID
            starred: Starred status to set
            org_id: Optional organization ID for filtering
            
        Returns:
            Updated session or None if not found
        """
        query = db.query(self.model).filter(self.model.id == session_id)
        if org_id:
            query = query.filter(self.model.org_id == org_id)
        session = query.first()
        if session:
            session.starred = starred
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
        return session
    
    def update_session(
        self, db: DBSession, *, session_id: str, **kwargs
    ) -> Optional[Session]:
        """
        Update session attributes.
        
        Args:
            db: Database session
            session_id: Session ID
            **kwargs: Fields to update
            
        Returns:
            Updated session or None if not found
        """
        session = db.query(self.model).filter(self.model.id == session_id).first()
        if session:
            for key, value in kwargs.items():
                if hasattr(session, key):
                    setattr(session, key, value)
            session.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)
        return session
    
    def deactivate(self, db: DBSession, *, session_id: str) -> bool:
        """
        Deactivate a session.
        
        Args:
            db: Database session
            session_id: Session ID
            
        Returns:
            True if session was deactivated, False otherwise
        """
        return self.update_session(db, session_id=session_id, is_active=False) is not None
    
    def cleanup_expired(self, db: DBSession) -> int:
        """
        Clean up expired sessions. Returns count of deactivated sessions.
        
        Args:
            db: Database session
            
        Returns:
            Number of sessions deactivated
        """
        now = datetime.utcnow()
        expired = (
            db.query(self.model)
            .filter(self.model.expires_at < now, self.model.is_active == True)
            .all()
        )
        count = len(expired)
        for session in expired:
            session.is_active = False
        db.commit()
        return count


# Create a singleton instance
session_crud = CRUDSession(Session)
