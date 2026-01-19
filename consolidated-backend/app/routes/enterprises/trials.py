"""
Trial Management Routes

CRUD endpoints for trial/feature management within modules.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.routes.crud_router import CRUDRouter
from app.schemas.enterprise import TrialCreate, TrialResponse
from app.schemas.feature import PaginatedResponse
from app.services.enterprises.trial_service import TrialService


# Create CRUD router for standard operations
crud_router = CRUDRouter(
    service_class=TrialService,
    schema=TrialResponse,
    create_schema=TrialCreate,
    prefix="",
    tags=["trials"],
    resource_name="trials",
    id_type="str",  # UUID
    exclude=["update", "patch", "search"],  # Trials are mostly immutable
)

router = crud_router.get_router()


# Custom endpoints

@router.get("/slug/{slug}", response_model=TrialResponse)
async def get_by_slug(
    slug: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("trials:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get trial by slug."""
    service = TrialService()
    trial = await service.get_by_slug(db, slug)
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trial with slug '{slug}' not found"
        )
    return TrialResponse.model_validate(trial)


@router.get("/module/{module_id}", response_model=List[TrialResponse])
async def get_by_module(
    module_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("trials:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all trials for a module."""
    service = TrialService()
    trials = await service.get_by_module(db, str(module_id))
    return [TrialResponse.model_validate(trial) for trial in trials]


@router.get("/check/slug/{slug}")
async def check_slug_exists(
    slug: str,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Check if a trial slug is already in use."""
    service = TrialService()
    exists = await service.slug_exists(db, slug)
    return {"slug": slug, "exists": exists}


@router.put("/{trial_id}/activate", response_model=TrialResponse)
async def activate_trial(
    trial_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("trials:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Activate a trial."""
    service = TrialService()
    trial = await service.set_active_status(db, str(trial_id), True)
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial not found"
        )
    return TrialResponse.model_validate(trial)


@router.put("/{trial_id}/deactivate", response_model=TrialResponse)
async def deactivate_trial(
    trial_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("trials:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Deactivate a trial."""
    service = TrialService()
    trial = await service.set_active_status(db, str(trial_id), False)
    if not trial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trial not found"
        )
    return TrialResponse.model_validate(trial)


@router.get("/active", response_model=List[TrialResponse])
async def get_active_trials(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("trials:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all active trials."""
    service = TrialService()
    trials = await service.get_active_trials(db)
    return [TrialResponse.model_validate(trial) for trial in trials]
