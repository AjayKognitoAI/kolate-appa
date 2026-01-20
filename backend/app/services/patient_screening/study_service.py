"""
Study Service for Patient Screening

Business logic for study CRUD operations with activity logging,
cascade deletion (including S3 file cleanup), and workflow methods.
Extends CRUDService for integration with CRUDRouter.
"""

from typing import List, Optional, Tuple, Dict, Any, Union
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc

from app.models.tenant.patient_screening import (
    Study,
    StudyStatus,
    MasterData,
    Cohort,
)
from app.schemas.patient_screening.study_schemas import (
    StudyCreate,
    StudyUpdate,
    StudyResponse,
    StudyWithCounts,
)
from app.schemas.patient_screening.cohort_schemas import CohortResponse
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.services.crud_service import CRUDService
from app.services.patient_screening.analytics_service import AnalyticsService
from app.services.patient_screening.s3_client import patient_screening_s3_client
from app.core.logging import get_class_logger


class StudyService(CRUDService[Study, StudyCreate, StudyUpdate, Dict[str, Any]]):
    """
    Business logic for study operations.

    Extends CRUDService for standard CRUD with:
    - Activity logging on create/update/delete
    - Cascade deletion with S3 file cleanup
    - Workflow methods for master data and cohorts
    - Pagination and search support
    """

    def __init__(self):
        super().__init__(
            model=Study,
            cache_prefix="patient_screening_study",
            default_cache_ttl=300,
            searchable_fields=["name", "description", "status"],
            sortable_fields=["id", "name", "status", "created_at", "updated_at"],
        )
        self.s3_client = patient_screening_s3_client

    # Override CREATE with activity logging
    async def create(
        self,
        db: AsyncSession,
        obj_in: StudyCreate,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> Study:
        """
        Create a new study with activity logging.

        Args:
            db: Database session
            obj_in: StudyCreate schema with study details
            user_id: ID of the user creating the study
            user_name: Optional user display name

        Returns:
            Created Study model
        """
        study = Study(
            name=obj_in.name,
            description=obj_in.description,
            status=obj_in.status.value if obj_in.status else StudyStatus.DRAFT.value,
            study_metadata=obj_in.study_metadata,
            created_by=user_id,
        )

        db.add(study)
        await db.flush()

        # Log activity
        if user_id:
            analytics_service = AnalyticsService()
            await analytics_service.log_activity(
                db=db,
                study_id=study.id,
                entity_type="study",
                entity_id=study.id,
                action="created",
                description=f"Study '{study.name}' created",
                user_id=user_id,
                user_name=user_name,
            )

        self.logger.info(f"Created study {study.id}: {study.name}")
        await db.commit()
        await db.refresh(study)
        return study

    # Override UPDATE with activity logging
    async def update(
        self,
        db: AsyncSession,
        obj_id: Any,
        obj_in: Union[StudyUpdate, Dict[str, Any]],
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> Optional[Study]:
        """
        Update a study with activity logging.

        Args:
            db: Database session
            obj_id: Study ID (UUID)
            obj_in: StudyUpdate schema with fields to update
            user_id: ID of the user updating the study
            user_name: Optional user display name

        Returns:
            Updated Study model or None if not found
        """
        # Get existing study
        study = await db.get(Study, obj_id)
        if not study:
            return None

        # Store previous values for activity log
        previous_value = {
            "name": study.name,
            "status": study.status,
            "description": study.description,
        }

        # Convert to dict if needed
        if hasattr(obj_in, "model_dump"):
            update_data = obj_in.model_dump(exclude_unset=True)
        else:
            update_data = dict(obj_in)

        # Handle status enum conversion
        if "status" in update_data and update_data["status"]:
            if hasattr(update_data["status"], "value"):
                update_data["status"] = update_data["status"].value

        # Apply updates
        for field, value in update_data.items():
            if value is not None and hasattr(study, field):
                setattr(study, field, value)

        await db.flush()

        # Log activity
        if user_id:
            analytics_service = AnalyticsService()
            action = "status_changed" if "status" in update_data else "updated"
            await analytics_service.log_activity(
                db=db,
                study_id=obj_id,
                entity_type="study",
                entity_id=obj_id,
                action=action,
                description=f"Study '{study.name}' updated",
                user_id=user_id,
                user_name=user_name,
                previous_value=previous_value,
                new_value={
                    "name": study.name,
                    "status": study.status,
                    "description": study.description,
                },
            )

        self.logger.info(f"Updated study {obj_id}")
        await db.commit()
        await db.refresh(study)
        return study

    # Override DELETE with S3 cleanup and activity logging
    async def delete(
        self,
        db: AsyncSession,
        obj_id: Any,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> bool:
        """
        Delete a study and all its children (cascades to master_data, cohorts, activities).
        Also cleans up S3 files.

        Args:
            db: Database session
            obj_id: Study ID (UUID)
            user_id: Optional ID of the user deleting
            user_name: Optional user display name

        Returns:
            True if deleted successfully
        """
        # Get study
        study = await db.get(Study, obj_id)
        if not study:
            return False

        # Get all master data files for S3 cleanup
        md_query = select(MasterData).where(MasterData.study_id == obj_id)
        md_result = await db.execute(md_query)
        master_data_list = list(md_result.scalars().all())

        # Delete S3 files
        s3_deletion_errors = []
        for master_data in master_data_list:
            try:
                await self.s3_client.delete_file(master_data.s3_key)
                self.logger.info(
                    f"Deleted S3 file for master_data {master_data.id}: {master_data.s3_key}"
                )
            except Exception as e:
                error_msg = f"Failed to delete S3 file for master_data {master_data.id}: {e}"
                self.logger.error(error_msg)
                s3_deletion_errors.append(error_msg)

        # Delete the study (cascades in DB)
        await db.delete(study)
        await db.commit()

        if s3_deletion_errors:
            self.logger.warning(
                f"Deleted study {obj_id} but encountered {len(s3_deletion_errors)} S3 errors"
            )
        else:
            self.logger.info(
                f"Deleted study {obj_id} and all associated data including S3 files"
            )

        return True

    # Custom method: Get study with counts
    async def get_study_with_counts(
        self, db: AsyncSession, study_id: UUID
    ) -> Optional[StudyWithCounts]:
        """
        Get study by ID with counts.

        Args:
            db: Database session
            study_id: UUID of the study

        Returns:
            StudyWithCounts or None if not found
        """
        # Get study
        study = await db.get(Study, study_id)
        if not study:
            return None

        # Count master data
        md_count_query = select(func.count()).where(MasterData.study_id == study_id)
        md_result = await db.execute(md_count_query)
        master_data_count = md_result.scalar() or 0

        # Count cohorts
        cohort_count_query = select(func.count()).where(Cohort.study_id == study_id)
        cohort_result = await db.execute(cohort_count_query)
        cohort_count = cohort_result.scalar() or 0

        # Sum total patients from cohorts
        patients_query = select(func.sum(Cohort.patient_count)).where(
            Cohort.study_id == study_id
        )
        patients_result = await db.execute(patients_query)
        total_patients = patients_result.scalar() or 0

        return StudyWithCounts(
            id=study.id,
            name=study.name,
            description=study.description,
            status=StudyStatus(study.status),
            study_metadata=study.study_metadata,
            created_by=study.created_by,
            created_at=study.created_at,
            updated_at=study.updated_at,
            master_data_count=master_data_count,
            cohort_count=cohort_count,
            total_patients=total_patients,
        )

    # Custom method: Validate study exists
    async def validate_study_access(self, db: AsyncSession, study_id: UUID) -> bool:
        """
        Validate that study exists.

        Note: Tenant isolation is handled at DB session level,
        so we only need to check if the study exists.

        Args:
            db: Database session
            study_id: UUID of the study

        Returns:
            True if study exists and is accessible
        """
        query = select(Study.id).where(Study.id == study_id)
        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    # ============== Workflow Methods ==============

    async def get_study_master_data(
        self, db: AsyncSession, study_id: UUID
    ) -> List[Dict[str, Any]]:
        """
        Get all master data files for a study.

        Args:
            db: Database session
            study_id: UUID of the study

        Returns:
            List of master data info dictionaries
        """
        if not await self.validate_study_access(db, study_id):
            raise ValueError("Study not found")

        query = select(MasterData).where(MasterData.study_id == study_id)
        result = await db.execute(query)
        master_data_list = list(result.scalars().all())

        return [
            {
                "id": str(md.id),
                "file_name": md.file_name,
                "file_type": md.file_type,
                "file_size": md.file_size,
                "row_count": md.row_count,
                "columns": md.columns,
                "patient_id_column": md.patient_id_column,
                "column_descriptions": md.column_descriptions,
                "created_at": md.created_at.isoformat() if md.created_at else None,
            }
            for md in master_data_list
        ]

    async def get_study_cohorts(
        self, db: AsyncSession, study_id: UUID, page: int = 0, size: int = 20
    ) -> Tuple[List[CohortResponse], int]:
        """
        Get cohorts for a study with pagination.

        Args:
            db: Database session
            study_id: UUID of the study
            page: Page number (0-indexed)
            size: Page size

        Returns:
            Tuple of (cohorts list, total count)
        """
        if not await self.validate_study_access(db, study_id):
            raise ValueError("Study not found")

        # Count total
        count_query = select(func.count()).where(Cohort.study_id == study_id)
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # Get cohorts
        query = (
            select(Cohort)
            .where(Cohort.study_id == study_id)
            .order_by(desc(Cohort.created_at))
        )
        query = query.offset(page * size).limit(size)

        result = await db.execute(query)
        cohorts = list(result.scalars().all())

        return [CohortResponse.model_validate(c) for c in cohorts], total

    async def get_study_cohort_patient_ids(
        self, db: AsyncSession, study_id: UUID
    ) -> Dict[str, Any]:
        """
        Get all cohort patient IDs for a study.
        Used for "belongs to cohort" filter functionality.

        Args:
            db: Database session
            study_id: UUID of the study

        Returns:
            Dictionary with cohort patient IDs data
        """
        if not await self.validate_study_access(db, study_id):
            raise ValueError("Study not found")

        # Get all cohorts for the study
        query = select(Cohort).where(Cohort.study_id == study_id)
        result = await db.execute(query)
        cohorts = list(result.scalars().all())

        # Build cohort patient IDs list
        cohort_patient_ids_list = []
        all_patient_ids = set()

        for cohort in cohorts:
            patient_ids = cohort.filtered_patient_ids or []
            cohort_patient_ids_list.append(
                {
                    "cohort_id": str(cohort.id),
                    "cohort_name": cohort.name,
                    "patient_ids": patient_ids,
                    "patient_count": len(patient_ids),
                }
            )
            all_patient_ids.update(patient_ids)

        return {
            "study_id": str(study_id),
            "cohorts": cohort_patient_ids_list,
            "total_unique_patients": len(all_patient_ids),
        }

    # Custom search with additional filters
    async def search_studies(
        self,
        db: AsyncSession,
        page: int = 0,
        size: int = 20,
        sort_by: str = "created_at",
        sort_direction: str = "desc",
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[StudyResponse], int]:
        """
        Search studies with pagination and filters.

        Args:
            db: Database session
            page: Page number (0-indexed)
            size: Page size
            sort_by: Field to sort by
            sort_direction: Sort direction (asc/desc)
            search: Optional search term for name/description
            status: Optional status filter

        Returns:
            Tuple of (studies list, total count)
        """
        # Base query
        query = select(Study)

        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                (Study.name.ilike(search_pattern))
                | (Study.description.ilike(search_pattern))
            )

        # Apply status filter
        if status:
            query = query.where(Study.status == status)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply sorting
        sort_column = getattr(Study, sort_by, Study.created_at)
        if sort_direction.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Apply pagination
        query = query.offset(page * size).limit(size)

        result = await db.execute(query)
        studies = list(result.scalars().all())

        return [StudyResponse.model_validate(s) for s in studies], total
