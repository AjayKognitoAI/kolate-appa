"""
Project Schemas Package

Pydantic schemas for project and tenant-related entities.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import Field

from app.schemas.base import CamelModel
from app.models.tenant import (
    ProjectStatus, UserStatus, ModuleType, AccessType,
    NotificationStatus, NotificationType
)


# Project Schemas
class ProjectBase(CamelModel):
    """Base project schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    pass


class ProjectUpdate(CamelModel):
    """Schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase):
    """Project response schema."""
    id: UUID
    status: ProjectStatus
    created_by: str
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(CamelModel):
    """Project list response with pagination."""
    items: List[ProjectResponse]
    total: int
    page: int
    size: int
    pages: int


class ProjectSearch(CamelModel):
    """Project search parameters."""
    name: Optional[str] = None
    status: Optional[ProjectStatus] = None
    created_by: Optional[str] = None


class ProjectStatistics(CamelModel):
    """Project statistics."""
    total_projects: int
    active_projects: int
    archived_projects: int
    total_users: int


# Project User Schemas
class ProjectUserBase(CamelModel):
    """Base project user schema."""
    user_auth0_id: str
    role_id: Optional[UUID] = None


class ProjectUserCreate(ProjectUserBase):
    """Schema for adding a user to a project."""
    pass


class ProjectUserUpdate(CamelModel):
    """Schema for updating a project user."""
    role_id: UUID


class ProjectUserResponse(CamelModel):
    """Project user response schema."""
    id: UUID
    project_id: UUID
    user_auth0_id: str
    role_id: Optional[UUID] = None
    role_name: Optional[str] = None
    joined_at: datetime


class ProjectUserWithRole(ProjectUserResponse):
    """Project user with full role details."""
    permissions: Optional[List[Dict[str, Any]]] = None


# Tenant User Schemas
class TenantUserBase(CamelModel):
    """Base tenant user schema."""
    auth0_id: str
    email: str
    name: Optional[str] = None
    picture_url: Optional[str] = None


class TenantUserCreate(TenantUserBase):
    """Schema for creating a tenant user."""
    pass


class TenantUserUpdate(CamelModel):
    """Schema for updating a tenant user."""
    name: Optional[str] = None
    picture_url: Optional[str] = None
    status: Optional[UserStatus] = None
    settings: Optional[Dict[str, Any]] = None


class TenantUserResponse(TenantUserBase):
    """Tenant user response schema."""
    id: UUID
    status: UserStatus
    settings: Optional[Dict[str, Any]] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Project Role Schemas
class ProjectRoleBase(CamelModel):
    """Base project role schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_default: bool = False


class ProjectRoleCreate(ProjectRoleBase):
    """Schema for creating a project role."""
    permissions: Optional[List[Dict[str, Any]]] = None


class ProjectRoleUpdate(CamelModel):
    """Schema for updating a project role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class ProjectRoleResponse(ProjectRoleBase):
    """Project role response schema."""
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime


class ProjectRoleWithPermissions(ProjectRoleResponse):
    """Project role with permissions."""
    permissions: List["ProjectPermissionResponse"] = []


# Project Permission Schemas
class ProjectPermissionBase(CamelModel):
    """Base project permission schema."""
    module: ModuleType
    access: AccessType


class ProjectPermissionCreate(ProjectPermissionBase):
    """Schema for creating a project permission."""
    pass


class ProjectPermissionUpdate(CamelModel):
    """Schema for updating permissions."""
    permissions: List[ProjectPermissionBase]


class ProjectPermissionResponse(ProjectPermissionBase):
    """Project permission response schema."""
    id: UUID
    role_id: UUID


# Default Role Schemas (Templates)
class DefaultRoleBase(CamelModel):
    """Base default role schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class DefaultRoleCreate(DefaultRoleBase):
    """Schema for creating a default role."""
    permissions: Optional[List[ProjectPermissionBase]] = None


class DefaultRoleResponse(DefaultRoleBase):
    """Default role response schema."""
    id: UUID
    created_at: datetime


class DefaultRoleWithPermissions(DefaultRoleResponse):
    """Default role with permissions."""
    permissions: List[ProjectPermissionBase] = []


# Notification Schemas
class NotificationBase(CamelModel):
    """Base notification schema."""
    title: str = Field(..., min_length=1, max_length=255)
    message: str
    type: NotificationType
    data: Optional[Dict[str, Any]] = None


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""
    user_auth0_id: str


class NotificationResponse(NotificationBase):
    """Notification response schema."""
    id: UUID
    user_auth0_id: str
    status: NotificationStatus
    read_at: Optional[datetime] = None
    created_at: datetime


# Trial Share Schemas
class TrialShareBase(CamelModel):
    """Base trial share schema."""
    project_id: UUID
    trial_id: UUID
    execution_id: str
    recipients: List[str]  # List of email addresses
    message: Optional[str] = None


class TrialShareCreate(TrialShareBase):
    """Schema for creating a trial share."""
    pass


class TrialShareResponse(TrialShareBase):
    """Trial share response schema."""
    id: UUID
    shared_by: str
    share_token: str
    expires_at: Optional[datetime] = None
    created_at: datetime


# User Bookmark Schemas
class UserBookmarkBase(CamelModel):
    """Base user bookmark schema."""
    project_id: UUID
    trial_id: UUID
    execution_id: str
    label: Optional[str] = None


class UserBookmarkCreate(UserBookmarkBase):
    """Schema for creating a bookmark."""
    pass


class UserBookmarkResponse(UserBookmarkBase):
    """User bookmark response schema."""
    id: UUID
    user_auth0_id: str
    created_at: datetime


# Role Change Schemas
class RoleChangeRequest(CamelModel):
    """Schema for changing user's role."""
    user_auth0_id: str
    new_role_id: UUID


class UserBlockRequest(CamelModel):
    """Schema for blocking/unblocking a user."""
    is_blocked: bool


# Invite Schemas
class InviteUserRequest(CamelModel):
    """Schema for inviting a user."""
    email: str
    name: Optional[str] = None
    role_id: Optional[UUID] = None


class InvitationResponse(CamelModel):
    """Invitation response schema."""
    id: str
    email: str
    status: str
    created_at: datetime
    expires_at: datetime


__all__ = [
    # Project
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectListResponse",
    "ProjectSearch",
    "ProjectStatistics",
    # Project User
    "ProjectUserBase",
    "ProjectUserCreate",
    "ProjectUserUpdate",
    "ProjectUserResponse",
    "ProjectUserWithRole",
    # Tenant User
    "TenantUserBase",
    "TenantUserCreate",
    "TenantUserUpdate",
    "TenantUserResponse",
    # Project Role
    "ProjectRoleBase",
    "ProjectRoleCreate",
    "ProjectRoleUpdate",
    "ProjectRoleResponse",
    "ProjectRoleWithPermissions",
    # Project Permission
    "ProjectPermissionBase",
    "ProjectPermissionCreate",
    "ProjectPermissionUpdate",
    "ProjectPermissionResponse",
    # Default Role
    "DefaultRoleBase",
    "DefaultRoleCreate",
    "DefaultRoleResponse",
    "DefaultRoleWithPermissions",
    # Notification
    "NotificationBase",
    "NotificationCreate",
    "NotificationResponse",
    # Trial Share
    "TrialShareBase",
    "TrialShareCreate",
    "TrialShareResponse",
    # User Bookmark
    "UserBookmarkBase",
    "UserBookmarkCreate",
    "UserBookmarkResponse",
    # Role/User Actions
    "RoleChangeRequest",
    "UserBlockRequest",
    "InviteUserRequest",
    "InvitationResponse",
]

# Update forward references
ProjectRoleWithPermissions.model_rebuild()
