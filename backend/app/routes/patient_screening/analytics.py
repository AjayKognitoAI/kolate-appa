"""
Analytics Routes for Patient Screening

API endpoints for activity logging and analytics.
Read-only endpoints for audit trail viewing.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.patient_screening.common import SuccessResponse
from app.services.patient_screening import AnalyticsService
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

router = APIRouter(tags=["Patient Screening - Analytics"])


def _serialize_activity(activity) -> dict:
    """Serialize a StudyActivity model to dict for API response."""
    return {
        "id": str(activity.id),
        "study_id": str(activity.study_id),
        "entity_type": activity.entity_type,
        "entity_id": str(activity.entity_id) if activity.entity_id else None,
        "action": activity.action,
        "description": activity.description,
        "user_id": str(activity.user_id),
        "user_name": activity.user_name,
        "previous_value": activity.previous_value,
        "new_value": activity.new_value,
        "activity_metadata": activity.activity_metadata,
        "timestamp": activity.created_at.isoformat() if activity.created_at else None,
    }


@router.get(
    "/studies/{study_id}/activity",
    response_model=SuccessResponse,
    summary="Get study activity logs",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_study_activity(
    study_id: UUID,
    entity_type: Optional[str] = Query(
        None,
        description="Filter by entity type (study, master_data, cohort, filter)",
    ),
    entity_id: Optional[UUID] = Query(
        None,
        description="Filter by specific entity ID",
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get activity logs for a study, optionally filtered by entity type and ID."""
    service = AnalyticsService()
    activities = await service.get_study_activity(
        db, study_id, entity_type, entity_id, limit, offset
    )

    return SuccessResponse(
        status="success",
        data={
            "activities": [_serialize_activity(a) for a in activities],
            "count": len(activities),
            "limit": limit,
            "offset": offset,
        },
    )


@router.get(
    "/activity/entity/{entity_type}/{entity_id}",
    response_model=SuccessResponse,
    summary="Get entity activity logs",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_entity_activity(
    entity_type: str,
    entity_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get activity logs for a specific entity."""
    service = AnalyticsService()
    activities = await service.get_entity_activity(db, entity_type, entity_id, limit, offset)

    return SuccessResponse(
        status="success",
        data={
            "activities": [_serialize_activity(a) for a in activities],
            "count": len(activities),
            "entity_type": entity_type,
            "entity_id": str(entity_id),
        },
    )


@router.get(
    "/activity/recent",
    response_model=SuccessResponse,
    summary="Get recent activity",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get recent activity across all studies."""
    service = AnalyticsService()
    activities = await service.get_recent_activity(db, limit)

    return SuccessResponse(
        status="success",
        data={
            "activities": [_serialize_activity(a) for a in activities],
            "count": len(activities),
        },
    )


@router.get(
    "/activity/user/{user_id}",
    response_model=SuccessResponse,
    summary="Get user activity logs",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_user_activity(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get activity logs for a specific user."""
    service = AnalyticsService()
    activities = await service.get_user_activity(db, user_id, limit, offset)

    return SuccessResponse(
        status="success",
        data={
            "activities": [_serialize_activity(a) for a in activities],
            "count": len(activities),
            "user_id": user_id,
        },
    )
