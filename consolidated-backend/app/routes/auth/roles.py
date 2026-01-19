"""
Auth0 Role Management Routes

Endpoints for managing Auth0 roles:
- List all roles
"""

from typing import List
from fastapi import APIRouter, Depends

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.user import Auth0RoleResponse
from app.services.auth.auth0_role_service import Auth0RoleService


router = APIRouter()


@router.get("", response_model=List[Auth0RoleResponse])
async def get_all_roles(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:roles:read")),
):
    """Get all Auth0 roles."""
    service = Auth0RoleService()
    return await service.get_all_roles()


@router.get("/{role_id}", response_model=Auth0RoleResponse)
async def get_role(
    role_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:roles:read")),
):
    """Get a specific Auth0 role."""
    service = Auth0RoleService()
    return await service.get_role(role_id)


@router.get("/{role_id}/users")
async def get_role_users(
    role_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:roles:read")),
):
    """Get all users assigned to a role."""
    service = Auth0RoleService()
    return await service.get_role_users(role_id)
