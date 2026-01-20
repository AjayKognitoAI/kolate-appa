"""
Filter Custom Routes for Patient Screening

Custom API endpoints for filter-specific business logic.
Standard CRUD is handled by CRUDRouter in __init__.py.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.patient_screening.common import SuccessResponse
from app.services.patient_screening import FilterService
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

# Custom routes for business logic (not standard CRUD)
custom_filter_router = APIRouter()


@custom_filter_router.get(
    "/templates",
    response_model=SuccessResponse,
    summary="Get all template filters",
    dependencies=[Depends(has_permissions("patient_screening_filters:read"))],
)
async def get_filter_templates(
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get all template filters.

    Template filters are pre-defined, reusable filter configurations
    that can be used as starting points for creating cohorts.
    """
    service = FilterService()
    templates = await service.get_templates(db)

    return SuccessResponse(
        status="success",
        data=[t.model_dump() for t in templates]
    )


@custom_filter_router.post(
    "/{filter_id}/duplicate",
    response_model=SuccessResponse,
    summary="Duplicate an existing filter",
    dependencies=[Depends(has_permissions("patient_screening_filters:write"))],
)
async def duplicate_filter(
    filter_id: UUID,
    new_name: str = Query(..., min_length=1, max_length=255, description="Name for the duplicated filter"),
    user_id: str = Query(..., description="User ID creating the duplicate"),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Duplicate an existing filter with a new name.

    Creates a copy of the filter with all its configuration,
    but as a non-template filter owned by the specified user.
    """
    service = FilterService()
    duplicated = await service.duplicate_filter(db, filter_id, new_name, user_id)

    if not duplicated:
        raise HTTPException(status_code=404, detail="Filter not found")

    return SuccessResponse(
        status="success",
        message="Filter duplicated successfully",
        data=duplicated.model_dump()
    )
