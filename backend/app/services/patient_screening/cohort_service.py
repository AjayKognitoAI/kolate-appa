"""
Cohort Service for Patient Screening

Business logic for cohort CRUD operations with validation,
activity logging, and filter handling.
Extends CRUDService for integration with CRUDRouter.
"""

from typing import List, Optional, Tuple, Dict, Any, Union
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc

from app.models.tenant.patient_screening import Cohort, MasterData, Study, Filter
from app.schemas.patient_screening.cohort_schemas import (
    CohortCreate,
    CohortUpdate,
    CohortResponse,
)
from app.services.crud_service import CRUDService
from app.services.patient_screening.analytics_service import AnalyticsService
from app.core.logging import get_class_logger


class CohortService(CRUDService[Cohort, CohortCreate, CohortUpdate, Dict[str, Any]]):
    """
    Business logic for cohort operations.

    Extends CRUDService for standard CRUD with:
    - Validation (study, master_data, filter)
    - Activity logging for audit trail
    - Filter configuration (inline or saved reference)
    - Pagination and search support
    """

    def __init__(self):
        super().__init__(
            model=Cohort,
            cache_prefix="patient_screening_cohort",
            default_cache_ttl=300,
            searchable_fields=["name", "description"],
            sortable_fields=["id", "name", "patient_count", "created_at", "updated_at"],
        )

    # Override CREATE with validation and activity logging
    async def create(
        self,
        db: AsyncSession,
        obj_in: CohortCreate,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> Cohort:
        """
        Create a new cohort with validation.

        Args:
            db: Database session
            obj_in: CohortCreate schema
            user_id: ID of the user creating the cohort
            user_name: Optional user display name

        Returns:
            Created Cohort model

        Raises:
            ValueError: If validation fails
        """
        # Validate study exists
        study_query = select(Study).where(Study.id == obj_in.study_id)
        study_result = await db.execute(study_query)
        study = study_result.scalar_one_or_none()

        if not study:
            raise ValueError("Study not found")

        # Validate master data exists
        md_query = select(MasterData).where(MasterData.id == obj_in.master_data_id)
        md_result = await db.execute(md_query)
        master_data = md_result.scalar_one_or_none()

        if not master_data:
            raise ValueError("Master data not found")

        # Validate master data belongs to the same study
        if master_data.study_id != obj_in.study_id:
            raise ValueError("Master data does not belong to this study")

        # Validate filter configuration
        filter_data = None
        if obj_in.filter_id:
            filter_query = select(Filter).where(Filter.id == obj_in.filter_id)
            filter_result = await db.execute(filter_query)
            saved_filter = filter_result.scalar_one_or_none()

            if not saved_filter:
                raise ValueError("Saved filter not found")
        else:
            if not obj_in.filter:
                raise ValueError("Either filter_id or inline filter must be provided")
            filter_data = obj_in.filter.model_dump()

        # Create cohort
        cohort = Cohort(
            name=obj_in.name,
            description=obj_in.description,
            study_id=obj_in.study_id,
            master_data_id=obj_in.master_data_id,
            columns=obj_in.columns,
            filter_id=obj_in.filter_id,
            filter=filter_data,
            inclusion_criteria=obj_in.inclusion_criteria,
            exclusion_criteria=obj_in.exclusion_criteria,
            filtered_patient_ids=obj_in.filtered_patient_ids or [],
            patient_count=obj_in.patient_count or 0,
            master_data_patient_count=obj_in.master_data_patient_count or 0,
            created_by=user_id,
        )

        db.add(cohort)
        await db.flush()

        # Log activity
        if user_id:
            analytics_service = AnalyticsService()
            await analytics_service.log_activity(
                db=db,
                study_id=obj_in.study_id,
                entity_type="cohort",
                entity_id=cohort.id,
                action="created",
                description=f"Cohort '{cohort.name}' created",
                user_id=user_id,
                user_name=user_name,
                activity_metadata={"patient_count": cohort.patient_count},
            )

        self.logger.info(f"Created cohort {cohort.id} with {cohort.patient_count} patients")
        await db.commit()
        await db.refresh(cohort)
        return cohort

    # Override UPDATE with activity logging
    async def update(
        self,
        db: AsyncSession,
        obj_id: Any,
        obj_in: Union[CohortUpdate, Dict[str, Any]],
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> Optional[Cohort]:
        """
        Update a cohort with activity logging.

        Args:
            db: Database session
            obj_id: Cohort ID (UUID)
            obj_in: CohortUpdate schema
            user_id: ID of the user updating
            user_name: Optional user display name

        Returns:
            Updated Cohort model or None if not found
        """
        cohort = await db.get(Cohort, obj_id)
        if not cohort:
            return None

        # Store previous values for activity log
        previous_value = {"name": cohort.name, "patient_count": cohort.patient_count}

        # Convert to dict if needed
        if hasattr(obj_in, "model_dump"):
            update_data = obj_in.model_dump(exclude_unset=True)
        else:
            update_data = dict(obj_in)

        # Handle filter field specially
        if "filter" in update_data and update_data["filter"]:
            if hasattr(update_data["filter"], "model_dump"):
                update_data["filter"] = update_data["filter"].model_dump()

        # Apply updates
        for field, value in update_data.items():
            if value is not None and hasattr(cohort, field):
                setattr(cohort, field, value)

        await db.flush()

        # Log activity
        if user_id:
            analytics_service = AnalyticsService()
            await analytics_service.log_activity(
                db=db,
                study_id=cohort.study_id,
                entity_type="cohort",
                entity_id=cohort.id,
                action="updated",
                description=f"Cohort '{cohort.name}' updated",
                user_id=user_id,
                user_name=user_name,
                previous_value=previous_value,
                new_value={"name": cohort.name, "patient_count": cohort.patient_count},
            )

        self.logger.info(f"Updated cohort {obj_id}")
        await db.commit()
        await db.refresh(cohort)
        return cohort

    # Override DELETE with activity logging
    async def delete(
        self,
        db: AsyncSession,
        obj_id: Any,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> bool:
        """
        Delete a cohort with activity logging.

        Args:
            db: Database session
            obj_id: Cohort ID (UUID)
            user_id: Optional ID of the user deleting
            user_name: Optional user display name

        Returns:
            True if deleted successfully
        """
        cohort = await db.get(Cohort, obj_id)
        if not cohort:
            return False

        study_id = cohort.study_id
        cohort_name = cohort.name

        await db.delete(cohort)
        await db.commit()

        # Log activity
        if user_id:
            analytics_service = AnalyticsService()
            await analytics_service.log_activity(
                db=db,
                study_id=study_id,
                entity_type="cohort",
                entity_id=obj_id,
                action="deleted",
                description=f"Cohort '{cohort_name}' deleted",
                user_id=user_id,
                user_name=user_name,
            )

        self.logger.info(f"Deleted cohort {obj_id}")
        return True

    # Custom method: Get cohort model by ID
    async def get_cohort_model(self, db: AsyncSession, cohort_id: UUID) -> Optional[Cohort]:
        """
        Get cohort model by ID.

        Args:
            db: Database session
            cohort_id: UUID of the cohort

        Returns:
            Cohort model or None if not found
        """
        return await db.get(Cohort, cohort_id)

    # Custom method: Get cohorts by study
    async def get_cohorts_by_study(
        self, db: AsyncSession, study_id: UUID, page: int = 0, size: int = 20
    ) -> Tuple[List[CohortResponse], int]:
        """
        Get cohorts for a specific study.

        Args:
            db: Database session
            study_id: UUID of the study
            page: Page number (0-indexed)
            size: Page size

        Returns:
            Tuple of (cohorts list, total count)
        """
        return await self.search_cohorts(db=db, page=page, size=size, study_id=study_id)

    # Custom method: Search cohorts with filters
    async def search_cohorts(
        self,
        db: AsyncSession,
        page: int = 0,
        size: int = 20,
        sort_by: str = "created_at",
        sort_direction: str = "desc",
        search: Optional[str] = None,
        study_id: Optional[UUID] = None,
    ) -> Tuple[List[CohortResponse], int]:
        """
        Search cohorts with pagination and filters.

        Args:
            db: Database session
            page: Page number (0-indexed)
            size: Page size
            sort_by: Field to sort by
            sort_direction: Sort direction (asc/desc)
            search: Optional search term
            study_id: Optional filter by study

        Returns:
            Tuple of (cohorts list, total count)
        """
        # Base query
        query = select(Cohort)

        # Apply study filter
        if study_id:
            query = query.where(Cohort.study_id == study_id)

        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                (Cohort.name.ilike(search_pattern))
                | (Cohort.description.ilike(search_pattern))
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting
        sort_column = getattr(Cohort, sort_by, Cohort.created_at)
        if sort_direction.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        query = query.offset(page * size).limit(size)

        result = await db.execute(query)
        cohorts = list(result.scalars().all())

        return [CohortResponse.model_validate(c) for c in cohorts], total

    # Custom method: Update patient IDs
    async def update_patient_ids(
        self,
        db: AsyncSession,
        cohort_id: UUID,
        patient_ids: List[str],
        patient_count: int,
        user_id: str,
        user_name: Optional[str] = None,
    ) -> Optional[CohortResponse]:
        """
        Update filtered patient IDs for a cohort.

        Args:
            db: Database session
            cohort_id: UUID of the cohort
            patient_ids: List of filtered patient IDs
            patient_count: Count of patients
            user_id: ID of the user updating
            user_name: Optional user display name

        Returns:
            Updated CohortResponse or None if not found
        """
        cohort = await db.get(Cohort, cohort_id)
        if not cohort:
            return None

        previous_count = cohort.patient_count

        cohort.filtered_patient_ids = patient_ids
        cohort.patient_count = patient_count

        await db.flush()

        # Log activity
        analytics_service = AnalyticsService()
        await analytics_service.log_activity(
            db=db,
            study_id=cohort.study_id,
            entity_type="cohort",
            entity_id=cohort.id,
            action="filter_applied",
            description=f"Filter applied to cohort '{cohort.name}'",
            user_id=user_id,
            user_name=user_name,
            previous_value={"patient_count": previous_count},
            new_value={"patient_count": patient_count},
        )

        await db.commit()
        await db.refresh(cohort)
        return CohortResponse.model_validate(cohort)
