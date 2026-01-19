from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SessionCreate(BaseModel):
    """Request model for creating a session."""
    org_id: str  # Required organization ID
    user_id: Optional[str] = None
    trial_name: Optional[str] = None  # Default trial for this session


class SessionResponse(BaseModel):
    """Response model for session creation and retrieval."""
    session_id: str
    org_id: str
    user_id: Optional[str]
    trial_name: Optional[str] = None  # Default trial for this session
    starred: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: bool = True


class SessionListResponse(BaseModel):
    """Response model for listing sessions."""
    sessions: List["SessionResponse"]
    total: int
    org_id: str


class SessionStarRequest(BaseModel):
    """Request model for starring/un-starring a session."""
    starred: bool
