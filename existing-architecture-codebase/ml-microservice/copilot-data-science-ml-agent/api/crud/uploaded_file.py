"""CRUD operations for UploadedFile model."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as DBSession

from api.models.uploaded_file import UploadedFile
from .base import CRUDBase


class CRUDUploadedFile(CRUDBase[UploadedFile, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for UploadedFile model."""
    
    def get_by_session(self, db: DBSession, *, session_id: str) -> List[UploadedFile]:
        """
        Get all files for a session.
        
        Args:
            db: Database session
            session_id: Session ID
            
        Returns:
            List of uploaded files ordered by upload timestamp (newest first)
        """
        return (
            db.query(self.model)
            .filter(self.model.session_id == session_id)
            .order_by(self.model.upload_timestamp.desc())
            .all()
        )
    
    def get_unprocessed(
        self, db: DBSession, *, session_id: Optional[str] = None
    ) -> List[UploadedFile]:
        """
        Get unprocessed files, optionally filtered by session.
        
        Args:
            db: Database session
            session_id: Optional session ID to filter by
            
        Returns:
            List of unprocessed files
        """
        query = db.query(self.model).filter(self.model.is_processed == False)
        if session_id:
            query = query.filter(self.model.session_id == session_id)
        return query.order_by(self.model.upload_timestamp.desc()).all()
    
    def mark_processed(self, db: DBSession, *, file_id: int) -> bool:
        """
        Mark file as processed.
        
        Args:
            db: Database session
            file_id: File ID
            
        Returns:
            True if file was marked as processed, False if not found
        """
        file = db.query(self.model).filter(self.model.id == file_id).first()
        if file:
            file.is_processed = True
            db.commit()
            return True
        return False
    
    def add_file(
        self,
        db: DBSession,
        *,
        session_id: str,
        filename: str,
        file_path: str,
        file_type: str,
        file_size: int,
        file_metadata: Optional[Dict] = None,
    ) -> UploadedFile:
        """
        Add uploaded file record.
        
        Args:
            db: Database session
            session_id: Session ID
            filename: Original filename
            file_path: Path where file is stored
            file_type: File type (csv, pdf, xlsx, etc.)
            file_size: File size in bytes
            file_metadata: Optional metadata (column info, page count, etc.)
            
        Returns:
            Created uploaded file record
        """
        file_data = {
            "session_id": session_id,
            "filename": filename,
            "file_path": file_path,
            "file_type": file_type,
            "file_size": file_size,
            "file_metadata": file_metadata or {},
        }
        db_obj = self.model(**file_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# Create a singleton instance
uploaded_file_crud = CRUDUploadedFile(UploadedFile)
