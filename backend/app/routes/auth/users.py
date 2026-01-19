"""
Auth0 User Management Routes

Endpoints for managing users via Auth0 Management API:
- Organization members
- User invitations
- Role assignments
- User blocking/unblocking
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.user import (
    OrgMemberResponse,
    OrgMemberWithRoles,
    OrgMembersListResponse,
    InvitationCreate,
    InvitationResponse,
    RoleAssignmentRequest,
    RoleChangeRequest,
    RoleRemovalRequest,
    UserBlockRequest,
)
from app.services.auth.auth0_user_service import Auth0UserService


router = APIRouter()


# Organization Members

@router.get(
    "/organizations/{org_id}/members",
    response_model=OrgMembersListResponse
)
async def get_org_members(
    org_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:members:read")),
):
    """Get paginated list of organization members."""
    service = Auth0UserService()
    return await service.get_organization_members(org_id, page, size)


@router.get(
    "/organizations/{org_id}/members/all",
    response_model=List[OrgMemberResponse]
)
async def get_all_org_members(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:members:read")),
):
    """Get all organization members (no pagination)."""
    service = Auth0UserService()
    return await service.get_all_organization_members(org_id)


@router.get(
    "/organizations/{org_id}/members/with-roles",
    response_model=List[OrgMemberWithRoles]
)
async def get_org_members_with_roles(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:members:read")),
):
    """Get organization members with their role details."""
    service = Auth0UserService()
    return await service.get_organization_members_with_roles(org_id)


# Invitations

@router.post(
    "/organizations/{org_id}/invitations",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED
)
async def send_invitation(
    org_id: str,
    invitation_data: InvitationCreate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:invitations:write")),
):
    """Send an invitation to join the organization."""
    service = Auth0UserService()
    return await service.create_invitation(org_id, invitation_data, current_user)


@router.get(
    "/organizations/{org_id}/invitations",
    response_model=List[InvitationResponse]
)
async def get_invitations(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:invitations:read")),
):
    """Get all pending invitations for the organization."""
    service = Auth0UserService()
    return await service.get_organization_invitations(org_id)


@router.get(
    "/organizations/{org_id}/invitations/{invitation_id}",
    response_model=InvitationResponse
)
async def get_invitation(
    org_id: str,
    invitation_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:invitations:read")),
):
    """Get a specific invitation."""
    service = Auth0UserService()
    invitation = await service.get_invitation(org_id, invitation_id)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    return invitation


@router.delete(
    "/organizations/{org_id}/invitations/{invitation_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_invitation(
    org_id: str,
    invitation_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:invitations:delete")),
):
    """Delete/revoke an invitation."""
    service = Auth0UserService()
    deleted = await service.delete_invitation(org_id, invitation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )


# Role Management

@router.post("/roles")
async def assign_roles(
    role_data: RoleAssignmentRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:roles:write")),
):
    """Assign roles to a user."""
    service = Auth0UserService()
    await service.assign_roles(role_data.user_id, role_data.role_ids)
    return {"message": "Roles assigned successfully"}


@router.put("/roles")
async def change_roles(
    role_data: RoleChangeRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:roles:write")),
):
    """Change user roles (add and/or remove)."""
    service = Auth0UserService()
    await service.change_roles(
        role_data.user_id,
        add_roles=role_data.add_roles,
        remove_roles=role_data.remove_roles
    )
    return {"message": "Roles updated successfully"}


@router.delete("/roles")
async def remove_roles(
    role_data: RoleRemovalRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:roles:delete")),
):
    """Remove roles from a user."""
    service = Auth0UserService()
    await service.remove_roles(role_data.user_id, role_data.role_ids)
    return {"message": "Roles removed successfully"}


# User Block/Unblock

@router.put("/user")
async def update_user_block_status(
    block_data: UserBlockRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:users:write")),
):
    """Block or unblock a user."""
    service = Auth0UserService()
    await service.set_user_blocked(block_data.user_id, block_data.blocked)
    action = "blocked" if block_data.blocked else "unblocked"
    return {"message": f"User {action} successfully"}
