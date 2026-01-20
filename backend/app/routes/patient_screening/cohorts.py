"""
Cohort Custom Routes for Patient Screening

Custom API endpoints for cohort-specific business logic.
Standard CRUD is handled by CRUDRouter in __init__.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.patient_screening.common import SuccessResponse
from app.services.patient_screening import CohortService
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

# Custom routes for business logic (not CRUD)
custom_cohort_router = APIRouter()


class UpdatePatientIdsRequest(BaseModel):
    """Request schema for updating cohort patient IDs."""

    patient_ids: List[str]
    patient_count: int
    user_id: str
    user_name: Optional[str] = None


@custom_cohort_router.patch(
    "/{cohort_id}/patient-ids",
    response_model=SuccessResponse,
    summary="Update cohort patient IDs",
    dependencies=[Depends(has_permissions("patient_screening_cohorts:write"))],
)
async def update_cohort_patient_ids(
    cohort_id: UUID,
    request: UpdatePatientIdsRequest,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update the filtered patient IDs for a cohort.
    Called after filter evaluation to save the matching patient IDs.
    """
    service = CohortService()

    result = await service.update_patient_ids(
        db=db,
        cohort_id=cohort_id,
        patient_ids=request.patient_ids,
        patient_count=request.patient_count,
        user_id=request.user_id,
        user_name=request.user_name,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Cohort not found")

    return SuccessResponse(
        status="success",
        message="Patient IDs updated successfully",
        data=result.model_dump(),
    )
