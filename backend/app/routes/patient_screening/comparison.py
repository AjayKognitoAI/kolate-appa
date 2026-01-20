"""
Comparison Routes for Patient Screening

API endpoints for cohort comparison operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from pydantic import BaseModel, Field

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.patient_screening.common import SuccessResponse
from app.services.patient_screening import ComparisonService
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

router = APIRouter(tags=["Patient Screening - Comparison"])


class CompareRequest(BaseModel):
    """Request schema for cohort comparison."""

    cohort_ids: List[UUID] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="List of cohort IDs to compare (2-5 cohorts)",
    )


@router.post(
    "/cohorts/compare",
    response_model=SuccessResponse,
    summary="Compare multiple cohorts",
    dependencies=[Depends(has_permissions("patient_screening_cohorts:read"))],
)
async def compare_cohorts(
    request: CompareRequest,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Compare multiple cohorts and calculate overlaps.

    Compares 2-5 cohorts and returns:
    - Individual cohort summaries with patient counts and match rates
    - Pairwise overlap calculations
    - Total unique patients across all cohorts
    - Patients common to all cohorts
    """
    logger.info(f"Comparing {len(request.cohort_ids)} cohorts")
    service = ComparisonService()

    try:
        result = await service.compare_cohorts(db, request.cohort_ids)
        return SuccessResponse(status="success", data=result.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/cohorts/{cohort_id_1}/overlap/{cohort_id_2}",
    response_model=SuccessResponse,
    summary="Get overlap between two cohorts",
    dependencies=[Depends(has_permissions("patient_screening_cohorts:read"))],
)
async def get_cohort_overlap_patients(
    cohort_id_1: UUID,
    cohort_id_2: UUID,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get patient IDs that are in both cohorts."""
    service = ComparisonService()

    try:
        overlap_patients = await service.get_overlap_patients(db, cohort_id_1, cohort_id_2)
        return SuccessResponse(
            status="success",
            data={
                "cohort_ids": [str(cohort_id_1), str(cohort_id_2)],
                "overlap_patient_ids": overlap_patients,
                "overlap_count": len(overlap_patients),
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/cohorts/{cohort_id}/unique-patients",
    response_model=SuccessResponse,
    summary="Get patients unique to a cohort",
    dependencies=[Depends(has_permissions("patient_screening_cohorts:read"))],
)
async def get_unique_patients(
    cohort_id: UUID,
    exclude_cohort_ids: List[UUID] = Query(
        ...,
        description="Cohort IDs to exclude patients from",
    ),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get patient IDs unique to a cohort (not in excluded cohorts)."""
    service = ComparisonService()

    try:
        unique_patients = await service.get_unique_patients(db, cohort_id, exclude_cohort_ids)
        return SuccessResponse(
            status="success",
            data={
                "cohort_id": str(cohort_id),
                "excluded_cohort_ids": [str(cid) for cid in exclude_cohort_ids],
                "unique_patient_ids": unique_patients,
                "unique_count": len(unique_patients),
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/cohorts/common-patients",
    response_model=SuccessResponse,
    summary="Get patients common to all cohorts",
    dependencies=[Depends(has_permissions("patient_screening_cohorts:read"))],
)
async def get_common_patients(
    cohort_ids: List[UUID] = Query(
        ...,
        min_length=2,
        description="Cohort IDs to find common patients",
    ),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get patient IDs common to all specified cohorts."""
    service = ComparisonService()

    try:
        common_patients = await service.get_common_patients(db, cohort_ids)
        return SuccessResponse(
            status="success",
            data={
                "cohort_ids": [str(cid) for cid in cohort_ids],
                "common_patient_ids": common_patients,
                "common_count": len(common_patients),
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
