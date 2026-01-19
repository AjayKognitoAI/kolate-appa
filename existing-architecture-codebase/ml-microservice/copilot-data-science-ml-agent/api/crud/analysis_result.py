"""CRUD operations for AnalysisResult model."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as DBSession

from api.models.analysis_result import AnalysisResult
from .base import CRUDBase


class CRUDAnalysisResult(CRUDBase[AnalysisResult, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for AnalysisResult model."""
    
    def get_by_session(
        self,
        db: DBSession,
        *,
        session_id: str,
        analysis_type: Optional[str] = None
    ) -> List[AnalysisResult]:
        """
        Get analysis results for a session.
        
        Args:
            db: Database session
            session_id: Session ID
            analysis_type: Optional filter by analysis type
            
        Returns:
            List of analysis results ordered by creation date (newest first)
        """
        query = db.query(self.model).filter(self.model.session_id == session_id)
        if analysis_type:
            query = query.filter(self.model.analysis_type == analysis_type)
        return query.order_by(self.model.created_at.desc()).all()
    
    def get_by_type(
        self, db: DBSession, *, analysis_type: str, skip: int = 0, limit: int = 100
    ) -> List[AnalysisResult]:
        """
        Get analysis results by type.
        
        Args:
            db: Database session
            analysis_type: Type of analysis (csv, research_paper, statistical, ml)
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of analysis results
        """
        return (
            db.query(self.model)
            .filter(self.model.analysis_type == analysis_type)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_file(
        self, db: DBSession, *, file_id: int
    ) -> List[AnalysisResult]:
        """
        Get analysis results for a specific file.
        
        Args:
            db: Database session
            file_id: Uploaded file ID
            
        Returns:
            List of analysis results for the file
        """
        return (
            db.query(self.model)
            .filter(self.model.file_id == file_id)
            .order_by(self.model.created_at.desc())
            .all()
        )
    
    def add_analysis(
        self,
        db: DBSession,
        *,
        session_id: str,
        analysis_type: str,
        result_data: Dict[str, Any],
        file_id: Optional[int] = None,
        visualizations: Optional[List[str]] = None,
        result_metadata: Optional[Dict] = None,
    ) -> AnalysisResult:
        """
        Add analysis result.
        
        Args:
            db: Database session
            session_id: Session ID
            analysis_type: Type of analysis
            result_data: Analysis result data
            file_id: Optional uploaded file ID
            visualizations: Optional list of visualization paths
            result_metadata: Optional metadata
            
        Returns:
            Created analysis result
        """
        analysis_data = {
            "session_id": session_id,
            "analysis_type": analysis_type,
            "file_id": file_id,
            "result_data": result_data,
            "visualizations": visualizations or [],
            "result_metadata": result_metadata or {},
        }
        db_obj = self.model(**analysis_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


# Create a singleton instance
analysis_result_crud = CRUDAnalysisResult(AnalysisResult)
