"""
Analytics Service for Patient Screening

Service for activity logging and analytics in patient screening.
Provides audit trail for all study-related operations.

Note: This service is NOT a CRUDService as activities are typically:
- Created programmatically (not via API)
- Read-only via API (no update/delete)
"""

from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.models.tenant.patient_screening import StudyActivity
from app.core.logging import get_class_logger


class AnalyticsService:
    """
    Service for activity logging and analytics.

    Features:
    - Log activities for audit trail
    - Query activities by study, entity type, or entity ID
    - Track previous/new values for change tracking
    """

    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    async def log_activity(
        self,
        db: AsyncSession,
        study_id: UUID,
        entity_type: str,
        action: str,
        description: str,
        user_id: str,
        entity_id: Optional[UUID] = None,
        user_name: Optional[str] = None,
        previous_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        activity_metadata: Optional[Dict[str, Any]] = None,
    ) -> StudyActivity:
        """
        Log activity for audit trail.

        Args:
            db: Database session
            study_id: UUID of the study
            entity_type: Type of entity (study, cohort, master_data, filter)
            action: Action performed (created, updated, deleted, etc.)
            description: Human-readable description
            user_id: ID of the user performing the action
            entity_id: Optional UUID of the specific entity
            user_name: Optional user display name
            previous_value: Optional previous values before change
            new_value: Optional new values after change
            activity_metadata: Optional additional metadata

        Returns:
            Created StudyActivity record
        """
        activity = StudyActivity(
            study_id=study_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            description=description,
            user_id=user_id,
            user_name=user_name,
            previous_value=previous_value,
            new_value=new_value,
            activity_metadata=activity_metadata,
        )

        db.add(activity)
        await db.flush()

        self.logger.info(
            f"Logged activity: {action} for {entity_type} in study {study_id}"
        )
        return activity

    async def get_study_activity(
        self,
        db: AsyncSession,
        study_id: UUID,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[StudyActivity]:
        """
        Get activity logs for a study.

        Args:
            db: Database session
            study_id: UUID of the study
            entity_type: Optional filter by entity type
            entity_id: Optional filter by entity ID
            limit: Maximum number of activities to return
            offset: Number of activities to skip

        Returns:
            List of StudyActivity records
        """
        query = select(StudyActivity).where(StudyActivity.study_id == study_id)

        if entity_type:
            query = query.where(StudyActivity.entity_type == entity_type)

        if entity_id:
            query = query.where(StudyActivity.entity_id == entity_id)

        query = query.order_by(desc(StudyActivity.created_at))
        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_entity_activity(
        self,
        db: AsyncSession,
        entity_type: str,
        entity_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[StudyActivity]:
        """
        Get activity logs for a specific entity.

        Args:
            db: Database session
            entity_type: Type of entity
            entity_id: UUID of the entity
            limit: Maximum number of activities to return
            offset: Number of activities to skip

        Returns:
            List of StudyActivity records
        """
        query = (
            select(StudyActivity)
            .where(
                StudyActivity.entity_type == entity_type,
                StudyActivity.entity_id == entity_id,
            )
            .order_by(desc(StudyActivity.created_at))
        )

        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_recent_activity(
        self, db: AsyncSession, limit: int = 20
    ) -> List[StudyActivity]:
        """
        Get recent activity across all studies.

        Args:
            db: Database session
            limit: Maximum number of activities to return

        Returns:
            List of recent StudyActivity records
        """
        query = select(StudyActivity).order_by(desc(StudyActivity.created_at)).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_user_activity(
        self, db: AsyncSession, user_id: str, limit: int = 50, offset: int = 0
    ) -> List[StudyActivity]:
        """
        Get activity logs for a specific user.

        Args:
            db: Database session
            user_id: ID of the user
            limit: Maximum number of activities to return
            offset: Number of activities to skip

        Returns:
            List of StudyActivity records for the user
        """
        query = (
            select(StudyActivity)
            .where(StudyActivity.user_id == user_id)
            .order_by(desc(StudyActivity.created_at))
        )

        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_activities(
        self,
        db: AsyncSession,
        study_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
    ) -> int:
        """
        Count activities with optional filters.

        Args:
            db: Database session
            study_id: Optional filter by study
            entity_type: Optional filter by entity type

        Returns:
            Count of matching activities
        """
        query = select(func.count(StudyActivity.id))

        if study_id:
            query = query.where(StudyActivity.study_id == study_id)

        if entity_type:
            query = query.where(StudyActivity.entity_type == entity_type)

        result = await db.execute(query)
        return result.scalar() or 0
