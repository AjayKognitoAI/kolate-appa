from pydantic import EmailStr, Field, ConfigDict, field_validator, validator
from typing import Optional, List
from datetime import datetime
from app.models.user_auth import AuthType
from app.schemas.base import CamelModel


class LoginRequest(CamelModel):
    """Login request schema."""

    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginResponse(CamelModel):
    """Login response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user_id: str
    session_id: str  # Session ID for refresh (mobile stores this, web uses cookie)
    refresh_expires_in: int  # seconds
    user: Optional[dict] = None  # User details (name, email, phone, role, etc.)


class RefreshTokenRequest(CamelModel):
    """Refresh token request schema."""

    session_id: Optional[str] = Field(
        None,
        description="Session ID (required for mobile apps, optional for web with cookies)"
    )


class RefreshTokenResponse(CamelModel):
    """Refresh token response schema."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutRequest(CamelModel):
    """Logout request schema."""

    session_id: Optional[str] = Field(
        None,
        description="Session ID (optional - for additional verification)"
    )


class LogoutAllRequest(CamelModel):
    """Logout all sessions request schema."""

    pass  # No body needed, uses current_user from token


class TokenPayload(CamelModel):
    """JWT token payload schema."""

    sub: str  # user_id or guest_id
    email: Optional[str] = None  # Present for user tokens, absent for guest tokens
    type: Optional[str] = None  # "user" or "guest"
    jti: Optional[str] = None  # session jti (user tokens only)
    exp: int
    iat: int
    session_id: Optional[str] = None


class UserAuthOut(CamelModel):
    """User authentication output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    auth_type: AuthType
    identifier: str
    created_at: datetime


class UserSessionOut(CamelModel):
    """User session output schema."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    jti: str
    issued_at: datetime
    expires_at: datetime
    is_active: bool
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None


class UserAuthCreate(CamelModel):
    """User authentication creation schema."""

    user_id: str
    auth_type: AuthType
    identifier: str
    secret_hash: Optional[str] = None


class UserSessionCreate(CamelModel):
    """User session creation schema."""

    user_id: str
    refresh_token: str
    expires_hours: int = 168  # 7 days
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_fingerprint: Optional[str] = None


class AuthConfig(CamelModel):
    """Authentication configuration schema."""

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_hours: int = 168  # 7 days
    session_cookie_name: str = "sessionId"
    session_cookie_secure: bool = True
    session_cookie_httponly: bool = True
    session_cookie_samesite: str = "strict"


class RegisterRequest(CamelModel):
    """User registration request schema."""

    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = Field(None, max_length=20)
    role: str = Field(
        ...,
        description="User role - Admin, Manager, ServiceProvider, Homeowner, User, or Guest",
    )

    @field_validator("role")
    def validate_role(cls, v):
        valid_roles = {
            "Admin",
            "Manager",
            "ServiceProvider",
            "Homeowner",
            "User",
            "Guest",
        }
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


class RegisterResponse(CamelModel):
    """User registration response schema."""

    user_id: str
    message: str = "User registered successfully"


class PasswordChangeRequest(CamelModel):
    """Password change request schema."""

    current_password: str
    new_password: str = Field(..., min_length=6)


class PasswordResetRequest(CamelModel):
    """Password reset request schema."""

    email: EmailStr


class PasswordResetConfirm(CamelModel):
    """Password reset confirmation schema."""

    token: str
    new_password: str = Field(..., min_length=6)


class SessionInfo(CamelModel):
    """Current session information schema."""

    session_id: str
    user_id: str
    jti: str
    issued_at: datetime
    expires_at: datetime
    is_active: bool
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_fingerprint: Optional[str] = None


class ActiveSessionsResponse(CamelModel):
    """Active sessions response schema."""

    sessions: List[UserSessionOut]
    total: int
