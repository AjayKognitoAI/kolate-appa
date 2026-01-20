"""
Enterprise Invite Routes

Endpoints for enterprise invitation and onboarding:
- POST /organization/invite - Invite new enterprise (protected)
- POST /organization/re-invite - Resend invitation (protected)
- GET /external/onboarding/{token} - Get onboarding status (public)
- POST /external/onboarding/{token}/step - Update onboarding step (public)
- POST /external/onboarding/{token}/complete - Complete onboarding (public)
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, HttpUrl, Field

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.core.logging import get_logger
from app.services.enterprises.invite_service import EnterpriseInviteService
from app.models.enterprise import OnboardingStep


logger = get_logger(__name__)
router = APIRouter()


# === Request/Response Schemas ===

class EnterpriseInviteRequest(BaseModel):
    """Request schema for inviting a new enterprise."""
    enterprise_name: str = Field(..., min_length=2, max_length=255, description="Enterprise name")
    admin_email: EmailStr = Field(..., description="Admin email address")
    enterprise_url: str = Field(..., description="Enterprise website URL")

    class Config:
        json_schema_extra = {
            "example": {
                "enterprise_name": "MediCure Labs",
                "admin_email": "admin@medicurelabs.io",
                "enterprise_url": "https://medicurelabs.io"
            }
        }


class EnterpriseInviteResponse(BaseModel):
    """Response schema for enterprise invitation."""
    enterprise_id: str
    enterprise_name: str
    enterprise_domain: str
    admin_email: str
    organization_id: str
    onboarding_url: Optional[str] = None
    message: str


class ReInviteRequest(BaseModel):
    """Request schema for resending invitation."""
    enterprise_id: str = Field(..., description="Enterprise UUID")


class ReInviteResponse(BaseModel):
    """Response schema for resend invitation."""
    enterprise_id: str
    admin_email: str
    invitation_id: Optional[str] = None
    message: str


class OnboardingStatusResponse(BaseModel):
    """Response schema for onboarding status."""
    enterprise_id: str
    enterprise_name: str
    enterprise_domain: str
    admin_email: str
    organization_id: str
    status: str
    onboarding: Optional[Dict[str, Any]] = None


class OnboardingStepRequest(BaseModel):
    """Request schema for updating onboarding step."""
    step: str = Field(..., description="Onboarding step name")
    step_data: Optional[Dict[str, Any]] = Field(default=None, description="Step-specific data")

    class Config:
        json_schema_extra = {
            "example": {
                "step": "PROFILE_COMPLETED",
                "step_data": {
                    "company_description": "A leading healthcare company",
                    "industry": "Healthcare",
                    "employee_count": "100-500"
                }
            }
        }


class OnboardingStepResponse(BaseModel):
    """Response schema for onboarding step update."""
    enterprise_id: str
    current_step: str
    is_completed: bool
    progress_data: Dict[str, Any]


class OnboardingCompleteRequest(BaseModel):
    """Request schema for completing onboarding."""
    company_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Final company data to save"
    )


class OnboardingCompleteResponse(BaseModel):
    """Response schema for onboarding completion."""
    enterprise_id: str
    enterprise_name: str
    organization_id: str
    status: str
    message: str


# === Protected Routes (require authentication) ===

@router.post(
    "/organization/invite",
    response_model=EnterpriseInviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite new enterprise",
    description="Invite a new enterprise. Creates Auth0 org, tenant schema, and sends admin invitation.",
)
async def invite_enterprise(
    invite_data: EnterpriseInviteRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:invite")),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Invite a new enterprise to join the platform.

    This endpoint performs the following:
    1. Validates the enterprise data
    2. Creates an Auth0 organization
    3. Creates a PostgreSQL tenant schema
    4. Sends an invitation email to the admin
    5. Creates onboarding progress tracking

    Requires: enterprises:invite permission
    """
    try:
        service = EnterpriseInviteService()
        result = await service.invite_enterprise(
            db=db,
            enterprise_name=invite_data.enterprise_name,
            admin_email=invite_data.admin_email,
            enterprise_url=invite_data.enterprise_url,
            inviter_name=current_user.name or current_user.email,
        )

        logger.info(
            "Enterprise invited successfully",
            enterprise_id=result["enterprise_id"],
            invited_by=current_user.id,
        )

        return EnterpriseInviteResponse(**result)

    except ValueError as e:
        logger.warning("Enterprise invite validation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Enterprise invite failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite enterprise. Please try again."
        )


@router.post(
    "/organization/re-invite",
    response_model=ReInviteResponse,
    summary="Resend invitation",
    description="Resend invitation email to enterprise admin.",
)
async def resend_invitation(
    reinvite_data: ReInviteRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:invite")),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Resend invitation email to enterprise admin.

    Use this when the original invitation has expired or was not received.

    Requires: enterprises:invite permission
    """
    try:
        service = EnterpriseInviteService()
        result = await service.resend_invitation(
            db=db,
            enterprise_id=reinvite_data.enterprise_id,
            inviter_name=current_user.name or current_user.email,
        )

        logger.info(
            "Invitation resent",
            enterprise_id=reinvite_data.enterprise_id,
            resent_by=current_user.id,
        )

        return ReInviteResponse(**result)

    except ValueError as e:
        logger.warning("Resend invitation validation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Resend invitation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend invitation. Please try again."
        )


# === Public/External Routes (for onboarding wizard) ===

@router.get(
    "/external/onboarding/{token}",
    response_model=OnboardingStatusResponse,
    summary="Get onboarding status",
    description="Get enterprise onboarding status by token. Public endpoint for onboarding wizard.",
)
async def get_onboarding_status(
    token: str,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get onboarding status and enterprise info by onboarding token.

    This is a public endpoint used by the onboarding wizard to display
    the current state and allow the admin to complete setup.
    """
    try:
        service = EnterpriseInviteService()
        result = await service.get_onboarding_by_token(db, token)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired onboarding token"
            )

        return OnboardingStatusResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Get onboarding status failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get onboarding status"
        )


@router.post(
    "/external/onboarding/{token}/step",
    response_model=OnboardingStepResponse,
    summary="Update onboarding step",
    description="Update onboarding progress for a specific step. Public endpoint.",
)
async def update_onboarding_step(
    token: str,
    step_data: OnboardingStepRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update onboarding progress when a step is completed.

    Valid steps:
    - ONBOARDING_STARTED
    - AUTH0_ORG_CREATED
    - SSO_CONFIGURED
    - ADMIN_SETUP
    - SCHEMA_CREATED
    - DATA_MIGRATED
    - COMPLETED
    """
    try:
        # Validate step
        try:
            step = OnboardingStep(step_data.step)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid step: {step_data.step}. Valid steps: {[s.value for s in OnboardingStep]}"
            )

        service = EnterpriseInviteService()
        result = await service.update_onboarding_step(
            db=db,
            token=token,
            step=step,
            step_data=step_data.step_data,
        )

        return OnboardingStepResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Update onboarding step failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update onboarding step"
        )


@router.post(
    "/external/onboarding/{token}/complete",
    response_model=OnboardingCompleteResponse,
    summary="Complete onboarding",
    description="Complete the onboarding process and activate the enterprise. Public endpoint.",
)
async def complete_onboarding(
    token: str,
    complete_data: OnboardingCompleteRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Complete the onboarding process.

    This activates the enterprise and allows users to start using the platform.
    The onboarding token will be invalidated after completion.
    """
    try:
        service = EnterpriseInviteService()
        result = await service.complete_onboarding(
            db=db,
            token=token,
            company_data=complete_data.company_data,
        )

        logger.info(
            "Onboarding completed",
            enterprise_id=result["enterprise_id"],
        )

        return OnboardingCompleteResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("Complete onboarding failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )
