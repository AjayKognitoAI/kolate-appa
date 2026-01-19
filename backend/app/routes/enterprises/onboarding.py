"""
Enterprise Onboarding Routes

Endpoints for enterprise onboarding workflow:
- Invite enterprise
- Onboard enterprise (create Auth0 org, SSO ticket)
- Webhook handlers
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.enterprise import (
    OnboardingProgressResponse,
    OnboardingProgressUpdate,
    SsoTicketCreate,
    SsoTicketResponse,
    SsoTicketValidation,
)
from app.services.enterprises.onboarding_service import OnboardingService
from app.services.enterprises.sso_service import SsoService
from app.config.settings import settings


router = APIRouter()


# Onboarding Progress Routes

@router.get("/{enterprise_id}/onboarding", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:onboarding:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get enterprise onboarding progress."""
    service = OnboardingService()
    progress = await service.get_progress(db, str(enterprise_id))
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Onboarding progress not found"
        )
    return OnboardingProgressResponse.model_validate(progress)


@router.put("/{enterprise_id}/onboarding", response_model=OnboardingProgressResponse)
async def update_onboarding_progress(
    enterprise_id: UUID,
    update_data: OnboardingProgressUpdate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:onboarding:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Update enterprise onboarding progress."""
    service = OnboardingService()
    progress = await service.update_progress(db, str(enterprise_id), update_data)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found"
        )
    return OnboardingProgressResponse.model_validate(progress)


@router.post("/{enterprise_id}/onboarding/complete")
async def complete_onboarding(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:onboarding:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Mark enterprise onboarding as complete."""
    service = OnboardingService()
    success = await service.complete_onboarding(db, str(enterprise_id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to complete onboarding"
        )
    return {"message": "Onboarding completed successfully"}


# SSO Ticket Routes

@router.post(
    "/{enterprise_id}/sso-tickets",
    response_model=SsoTicketResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_sso_ticket(
    enterprise_id: UUID,
    ticket_data: SsoTicketCreate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:sso:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Create an SSO ticket for enterprise authentication."""
    service = SsoService()
    ticket = await service.create_ticket(db, str(enterprise_id), ticket_data)
    return SsoTicketResponse.model_validate(ticket)


@router.get(
    "/{enterprise_id}/sso-tickets/{ticket}",
    response_model=SsoTicketValidation
)
async def validate_sso_ticket(
    enterprise_id: UUID,
    ticket: str,
    db: AsyncSession = Depends(get_async_db),
):
    """Validate an SSO ticket (public endpoint)."""
    service = SsoService()
    validation = await service.validate_ticket(db, str(enterprise_id), ticket)
    if not validation.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired SSO ticket"
        )
    return validation


@router.delete(
    "/{enterprise_id}/sso-tickets/{ticket}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_sso_ticket(
    enterprise_id: UUID,
    ticket: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:sso:delete")),
    db: AsyncSession = Depends(get_async_db),
):
    """Delete/invalidate an SSO ticket."""
    service = SsoService()
    deleted = await service.delete_ticket(db, str(enterprise_id), ticket)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SSO ticket not found"
        )


# Webhook Routes (for external integrations)

@router.post("/webhooks/connection")
async def handle_connection_webhook(
    request: Request,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Handle Auth0 connection webhook.

    This endpoint is called by Auth0 when a connection is established or modified.
    """
    # Verify webhook secret
    if x_webhook_secret != settings.AUTH0_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook secret"
        )

    payload = await request.json()

    service = OnboardingService()
    await service.handle_connection_webhook(db, payload)

    return {"status": "processed"}


@router.post("/invite")
async def invite_enterprise(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:invite")),
    db: AsyncSession = Depends(get_async_db),
):
    """Send onboarding invitation to enterprise admin."""
    service = OnboardingService()
    result = await service.send_invitation(db, str(enterprise_id))
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to send invitation"
        )
    return {"message": "Invitation sent successfully"}


@router.post("/re-invite")
async def resend_enterprise_invitation(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:invite")),
    db: AsyncSession = Depends(get_async_db),
):
    """Resend onboarding invitation to enterprise admin."""
    service = OnboardingService()
    result = await service.resend_invitation(db, str(enterprise_id))
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to resend invitation"
        )
    return {"message": "Invitation resent successfully"}
