from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AnalysisRequest(BaseModel):
    """Request model for analysis."""
    session_id: str
    message: str
    file_paths: Optional[List[str]] = None
    trial_name: Optional[str] = None  # Override session default trial


class AnalysisResponse(BaseModel):
    """Response model for analysis."""
    response: str
    session_id: str
    timestamp: datetime


class AnalysisResult(BaseModel):
    """Model for analysis result."""
    analysis_type: str
    result_data: Dict[str, Any]
    visualizations: List[str]
    timestamp: datetime
