"""
Auth0 SSO Routes

Endpoints for SSO ticket generation and self-service profile management.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.base import CamelModel
from app.services.auth.auth0_sso_service import Auth0SsoService


router = APIRouter()


class SsoTicketRequest(CamelModel):
    """Request body for SSO ticket generation."""
    result_url: Optional[str] = None
    ttl_sec: int = 300  # 5 minutes default


class SsoTicketResponse(CamelModel):
    """Response with SSO ticket URL."""
    ticket_url: str


@router.post("/sso-ticket/{profile_id}", response_model=SsoTicketResponse)
async def create_sso_ticket_for_profile(
    profile_id: str,
    request_data: Optional[SsoTicketRequest] = None,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:sso:write")),
):
    """
    Create an SSO ticket for a specific Auth0 self-service profile.

    This allows users to access their self-service profile management
    without re-authenticating.
    """
    service = Auth0SsoService()
    request_data = request_data or SsoTicketRequest()
    ticket_url = await service.create_sso_ticket(
        user_id=current_user.id,
        profile_id=profile_id,
        result_url=request_data.result_url,
        ttl_sec=request_data.ttl_sec
    )
    return SsoTicketResponse(ticket_url=ticket_url)


@router.post("/sso-ticket", response_model=SsoTicketResponse)
async def create_sso_ticket(
    request_data: Optional[SsoTicketRequest] = None,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("auth:sso:write")),
):
    """
    Create a generic SSO ticket for the current user.

    Returns a URL that can be used to access user profile settings
    without re-authentication.
    """
    service = Auth0SsoService()
    request_data = request_data or SsoTicketRequest()
    ticket_url = await service.create_generic_sso_ticket(
        user_id=current_user.id,
        result_url=request_data.result_url,
        ttl_sec=request_data.ttl_sec
    )
    return SsoTicketResponse(ticket_url=ticket_url)
