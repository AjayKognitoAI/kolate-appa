"""
Auth0 Organization Management Routes

Endpoints for managing Auth0 organizations:
- Create organization
- Get/delete organization connections
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.user import (
    OrganizationCreate,
    OrganizationResponse,
    ConnectionResponse,
    ConnectionDeleteRequest,
)
from app.services.auth.auth0_org_service import Auth0OrganizationService


router = APIRouter()


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:organizations:write")),
):
    """Create a new Auth0 organization."""
    service = Auth0OrganizationService()
    return await service.create_organization(org_data)


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:organizations:read")),
):
    """Get an Auth0 organization by ID."""
    service = Auth0OrganizationService()
    org = await service.get_organization(org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return org


@router.get("/{org_id}/connections", response_model=List[ConnectionResponse])
async def get_organization_connections(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:organizations:read")),
):
    """Get all connections enabled for an organization."""
    service = Auth0OrganizationService()
    return await service.get_organization_connections(org_id)


@router.post("/{org_id}/connections")
async def add_organization_connection(
    org_id: str,
    connection_id: str,
    assign_membership_on_login: bool = False,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:organizations:write")),
):
    """Add a connection to an organization."""
    service = Auth0OrganizationService()
    await service.add_connection(org_id, connection_id, assign_membership_on_login)
    return {"message": "Connection added successfully"}


@router.delete("/{org_id}/connection")
async def delete_organization_connection(
    org_id: str,
    delete_data: ConnectionDeleteRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:organizations:delete")),
):
    """Remove a connection from an organization."""
    service = Auth0OrganizationService()
    await service.delete_connection(org_id, delete_data.connection_id)
    return {"message": "Connection removed successfully"}
