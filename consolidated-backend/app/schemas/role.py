from typing import Optional, List
from pydantic import Field
from app.schemas.base import CamelModel
from app.schemas.permission import PermissionOut, PermissionWithDetails


class RoleBase(CamelModel):
    """Base Role schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Role name")
    description: Optional[str] = Field(None, description="Role description")


class RoleCreate(RoleBase):
    """Schema for creating a new role."""
    pass


class RoleUpdate(CamelModel):
    """Schema for updating an existing role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Role name")
    description: Optional[str] = Field(None, description="Role description")


class RolePatch(CamelModel):
    """Schema for partial updates to a role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Role name")
    description: Optional[str] = Field(None, description="Role description")


class RoleOut(RoleBase):
    """Schema for role output."""
    id: int = Field(..., description="Role ID")

    class Config:
        from_attributes = True


class RoleWithPermissions(RoleOut):
    """Schema for role output with permissions."""
    permissions: List[PermissionOut] = []

    class Config:
        from_attributes = True


class RoleWithDetailedPermissions(RoleOut):
    """Schema for role output with detailed permissions."""
    permissions: List[PermissionWithDetails] = []

    class Config:
        from_attributes = True


class RoleSearch(CamelModel):
    """Schema for role search parameters."""
    name: Optional[str] = Field(None, description="Search by role name (partial match)")
    description: Optional[str] = Field(None, description="Search by description (partial match)")


# Role Permission Mapping Schemas
class RolePermissionCreate(CamelModel):
    """Schema for adding permissions to a role."""
    permission_ids: List[int] = Field(..., description="List of permission IDs to add to role")


class RolePermissionRemove(CamelModel):
    """Schema for removing permissions from a role."""
    permission_ids: List[int] = Field(..., description="List of permission IDs to remove from role")


class RolePermissionBulkUpdate(CamelModel):
    """Schema for bulk updating role permissions."""
    permission_ids: List[int] = Field(..., description="Complete list of permission IDs for the role")


# User Role Mapping Schemas
class UserRoleCreate(CamelModel):
    """Schema for assigning roles to a user."""
    role_ids: List[int] = Field(..., description="List of role IDs to assign to user")


class UserRoleRemove(CamelModel):
    """Schema for removing roles from a user."""
    role_ids: List[int] = Field(..., description="List of role IDs to remove from user")


class UserRoleBulkUpdate(CamelModel):
    """Schema for bulk updating user roles (add and remove in single request)."""
    add_role_ids: List[int] = Field(default_factory=list, description="List of role IDs to add to user")
    remove_role_ids: List[int] = Field(default_factory=list, description="List of role IDs to remove from user")


class UserRoleOut(CamelModel):
    """Schema for user role output."""
    id: int = Field(..., description="User Role ID")
    user_id: str = Field(..., description="User ID")
    role_id: int = Field(..., description="Role ID")
    role: Optional[RoleOut] = None

    class Config:
        from_attributes = True


# Pagination schemas
class RolePaginatedResponse(CamelModel):
    """Paginated response for roles."""
    items: list[RoleOut]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")


class RoleWithPermissionsPaginatedResponse(CamelModel):
    """Paginated response for roles with permissions."""
    items: list[RoleWithPermissions]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")


# Response models for user role operations
class UserRoleUpdateResponse(CamelModel):
    """Response for user role bulk update operations."""
    message: str = Field(..., description="Success message")
    added_roles: int = Field(..., description="Number of roles added")
    removed_roles: int = Field(..., description="Number of roles removed")