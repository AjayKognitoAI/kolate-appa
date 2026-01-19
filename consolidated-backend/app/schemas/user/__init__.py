"""
User Schemas Package

Pydantic schemas for user management and Auth0 integration.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field, EmailStr

from app.schemas.base import CamelModel


# Auth0 User Schemas
class Auth0UserBase(CamelModel):
    """Base Auth0 user schema."""
    email: EmailStr
    name: Optional[str] = None
    nickname: Optional[str] = None
    picture: Optional[str] = None


class Auth0UserCreate(Auth0UserBase):
    """Schema for creating an Auth0 user."""
    password: Optional[str] = None  # Optional for SSO users
    connection: str = "Username-Password-Authentication"


class Auth0UserResponse(Auth0UserBase):
    """Auth0 user response schema."""
    user_id: str
    email_verified: bool = False
    blocked: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None


class Auth0UserWithRoles(Auth0UserResponse):
    """Auth0 user with roles."""
    roles: List[str] = []


# Organization Member Schemas
class OrgMemberBase(CamelModel):
    """Base organization member schema."""
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class OrgMemberResponse(OrgMemberBase):
    """Organization member response schema."""
    roles: List[str] = []
    joined_at: Optional[datetime] = None


class OrgMemberWithRoles(OrgMemberResponse):
    """Organization member with full role details."""
    role_details: Optional[List[Dict[str, Any]]] = None


class OrgMembersListResponse(CamelModel):
    """Paginated organization members response."""
    items: List[OrgMemberResponse]
    total: int
    page: int
    size: int


# Invitation Schemas
class InvitationCreate(CamelModel):
    """Schema for creating an invitation."""
    email: EmailStr
    roles: Optional[List[str]] = None
    send_invitation: bool = True


class InvitationResponse(CamelModel):
    """Invitation response schema."""
    id: str
    invitee_email: str
    inviter_name: Optional[str] = None
    organization_id: str
    roles: List[str] = []
    status: str  # pending, accepted, expired
    created_at: datetime
    expires_at: datetime


# Role Assignment Schemas
class RoleAssignmentRequest(CamelModel):
    """Schema for assigning roles."""
    user_id: str
    role_ids: List[str]


class RoleChangeRequest(CamelModel):
    """Schema for changing roles."""
    user_id: str
    add_roles: Optional[List[str]] = None
    remove_roles: Optional[List[str]] = None


class RoleRemovalRequest(CamelModel):
    """Schema for removing roles."""
    user_id: str
    role_ids: List[str]


# User Block/Unblock Schemas
class UserBlockRequest(CamelModel):
    """Schema for blocking/unblocking a user."""
    user_id: str
    blocked: bool


# Auth0 Role Schemas
class Auth0RoleResponse(CamelModel):
    """Auth0 role response schema."""
    id: str
    name: str
    description: Optional[str] = None


# Organization Schemas
class OrganizationCreate(CamelModel):
    """Schema for creating an Auth0 organization."""
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    branding: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class OrganizationResponse(CamelModel):
    """Auth0 organization response schema."""
    id: str
    name: str
    display_name: str
    branding: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ConnectionResponse(CamelModel):
    """Auth0 connection response schema."""
    connection_id: str
    name: str
    strategy: str
    assign_membership_on_login: bool = False


class ConnectionDeleteRequest(CamelModel):
    """Schema for deleting a connection."""
    connection_id: str


# User Profile Schemas
class UserProfileResponse(CamelModel):
    """Current user profile response."""
    id: str
    email: str
    email_verified: bool
    name: Optional[str] = None
    nickname: Optional[str] = None
    picture: Optional[str] = None
    permissions: List[str] = []
    roles: List[str] = []
    organization_id: Optional[str] = None


class UserProfileUpdate(CamelModel):
    """Schema for updating user profile."""
    name: Optional[str] = None
    nickname: Optional[str] = None
    picture: Optional[str] = None
    user_metadata: Optional[Dict[str, Any]] = None


# User Search Schemas
class UserSearchRequest(CamelModel):
    """User search parameters."""
    email: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None  # active, blocked


class UserCountResponse(CamelModel):
    """User count response."""
    total: int
    active: int
    blocked: int


__all__ = [
    # Auth0 User
    "Auth0UserBase",
    "Auth0UserCreate",
    "Auth0UserResponse",
    "Auth0UserWithRoles",
    # Organization Member
    "OrgMemberBase",
    "OrgMemberResponse",
    "OrgMemberWithRoles",
    "OrgMembersListResponse",
    # Invitation
    "InvitationCreate",
    "InvitationResponse",
    # Role
    "RoleAssignmentRequest",
    "RoleChangeRequest",
    "RoleRemovalRequest",
    "Auth0RoleResponse",
    # User Block
    "UserBlockRequest",
    # Organization
    "OrganizationCreate",
    "OrganizationResponse",
    "ConnectionResponse",
    "ConnectionDeleteRequest",
    # User Profile
    "UserProfileResponse",
    "UserProfileUpdate",
    "UserSearchRequest",
    "UserCountResponse",
]
