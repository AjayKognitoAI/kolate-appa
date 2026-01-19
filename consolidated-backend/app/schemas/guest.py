from pydantic import Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.base import CamelModel


class GuestSessionRequest(CamelModel):
    """Guest session creation request schema."""

    session_duration_hours: Optional[int] = Field(
        default=24,
        ge=1,
        le=168,  # Max 7 days
        description="Session duration in hours (1-168)",
    )


class GuestSessionResponse(CamelModel):
    """Guest session response schema."""

    session_id: str
    expires_at: datetime
    message: str = "Guest session created successfully"
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    expires_in: Optional[int] = None


class GuestSessionInfo(CamelModel):
    """Guest session information schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_fingerprint: Optional[str] = None
    expires_at: datetime
    is_active: bool
    created_at: datetime
    last_activity: Optional[datetime] = None


class GuestSessionExtendRequest(CamelModel):
    """Guest session extension request schema."""

    additional_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        description="Additional hours to extend session (1-168)",
    )


class GuestSessionExtendResponse(CamelModel):
    """Guest session extension response schema."""

    session_id: str
    new_expires_at: datetime
    additional_hours: int
    message: str = "Guest session extended successfully"


class GuestLoginRequest(CamelModel):
    """Guest login/authentication request schema."""

    session_id: str = Field(..., description="Guest session ID to authenticate")


class GuestLoginResponse(CamelModel):
    """Guest login/authentication response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    guest_id: str
    session_id: str
    session_expires_at: datetime
