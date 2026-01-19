"""
Patient Record Service (PostgreSQL)

Manages patient records stored in PostgreSQL with JSONB fields.
Supports multi-tenant isolation via schema-based tenancy.
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from math import ceil
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant.patient_record import PatientRecord
from app.schemas.patient_record import (
    PatientRecordCreate,
    PatientRecordUpdate,
    PatientRecordResponse,
    PatientRecordSearch,
    PatientRecordBase,
)
from app.exceptions.base import NotFoundError, ValidationError


class PatientRecordService:
    """
    Patient record management service using PostgreSQL.

    Handles CRUD operations for patient records with support for:
    - Pagination and sorting
    - Bulk operations
    - Flexible JSONB-based search
    - Multi-tenant isolation
    """

    async def create_record(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        record_data: PatientRecordBase,
        created_by: Optional[str] = None
    ) -> PatientRecordResponse:
        """
        Create a new patient record.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_data: Patient record data
            created_by: Auth0 ID of the creator

        Returns:
            PatientRecordResponse: Created patient record
        """
        # Generate record_id if not provided
        record_id = record_data.record_id or str(uuid4())

        patient_record = PatientRecord(
            project_id=project_id,
            trial_slug=trial_slug,
            record_id=record_id,
            patient_data=record_data.patient_data,
            metadata=record_data.metadata or {},
            created_by=created_by,
        )

        db.add(patient_record)
        await db.commit()
        await db.refresh(patient_record)

        return PatientRecordResponse.model_validate(patient_record)

    async def get_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        page: int = 1,
        size: int = 10,
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Tuple[List[PatientRecordResponse], int, int]:
        """
        Get paginated patient records.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            page: Page number (1-indexed)
            size: Page size
            sort_by: Field to sort by (default: created_at)
            sort_order: Sort order 'asc' or 'desc'

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        # Build base query
        base_query = select(PatientRecord).where(
            and_(
                PatientRecord.project_id == project_id,
                PatientRecord.trial_slug == trial_slug
            )
        )

        # Count total
        count_query = select(func.count()).select_from(
            base_query.subquery()
        )
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        total_pages = ceil(total / size) if total > 0 else 0

        # Apply sorting
        sort_field = getattr(PatientRecord, sort_by or "created_at", PatientRecord.created_at)
        if sort_order == "desc":
            base_query = base_query.order_by(desc(sort_field))
        else:
            base_query = base_query.order_by(asc(sort_field))

        # Apply pagination
        offset = (page - 1) * size
        base_query = base_query.offset(offset).limit(size)

        result = await db.execute(base_query)
        records = result.scalars().all()

        return (
            [PatientRecordResponse.model_validate(r) for r in records],
            total,
            total_pages
        )

    async def get_all_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str
    ) -> List[PatientRecordResponse]:
        """
        Get all patient records without pagination.

        Warning: Use with caution for large datasets.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            List[PatientRecordResponse]: All patient records
        """
        query = select(PatientRecord).where(
            and_(
                PatientRecord.project_id == project_id,
                PatientRecord.trial_slug == trial_slug
            )
        ).order_by(desc(PatientRecord.created_at))

        result = await db.execute(query)
        records = result.scalars().all()

        return [PatientRecordResponse.model_validate(r) for r in records]

    async def get_record_by_id(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        record_id: str
    ) -> PatientRecordResponse:
        """
        Get a patient record by its record_id.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_id: Record identifier

        Returns:
            PatientRecordResponse: Patient record

        Raises:
            NotFoundError: If record not found
        """
        query = select(PatientRecord).where(
            and_(
                PatientRecord.project_id == project_id,
                PatientRecord.trial_slug == trial_slug,
                PatientRecord.record_id == record_id
            )
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Patient record not found with record_id: {record_id}",
                resource_type="PatientRecord",
                resource_id=record_id
            )

        return PatientRecordResponse.model_validate(record)

    async def get_record_by_uuid(
        self,
        db: AsyncSession,
        record_uuid: UUID
    ) -> PatientRecordResponse:
        """
        Get a patient record by its UUID.

        Args:
            db: Database session (tenant-scoped)
            record_uuid: Record UUID

        Returns:
            PatientRecordResponse: Patient record

        Raises:
            NotFoundError: If record not found
        """
        query = select(PatientRecord).where(PatientRecord.id == record_uuid)

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Patient record not found with id: {record_uuid}",
                resource_type="PatientRecord",
                resource_id=str(record_uuid)
            )

        return PatientRecordResponse.model_validate(record)

    async def update_record(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        record_id: str,
        update_data: PatientRecordUpdate,
        updated_by: Optional[str] = None
    ) -> PatientRecordResponse:
        """
        Update a patient record.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_id: Record identifier
            update_data: Updated patient record data
            updated_by: Auth0 ID of the updater

        Returns:
            PatientRecordResponse: Updated patient record

        Raises:
            NotFoundError: If record not found
        """
        query = select(PatientRecord).where(
            and_(
                PatientRecord.project_id == project_id,
                PatientRecord.trial_slug == trial_slug,
                PatientRecord.record_id == record_id
            )
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Patient record not found with record_id: {record_id}",
                resource_type="PatientRecord",
                resource_id=record_id
            )

        # Update fields
        if update_data.patient_data is not None:
            record.patient_data = update_data.patient_data

        if update_data.metadata is not None:
            record.metadata = update_data.metadata

        record.updated_by = updated_by
        record.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(record)

        return PatientRecordResponse.model_validate(record)

    async def delete_record(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        record_id: str
    ) -> bool:
        """
        Delete a patient record.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_id: Record identifier

        Returns:
            bool: True if deleted successfully

        Raises:
            NotFoundError: If record not found
        """
        query = select(PatientRecord).where(
            and_(
                PatientRecord.project_id == project_id,
                PatientRecord.trial_slug == trial_slug,
                PatientRecord.record_id == record_id
            )
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Patient record not found with record_id: {record_id}",
                resource_type="PatientRecord",
                resource_id=record_id
            )

        await db.delete(record)
        await db.commit()

        return True

    async def bulk_create_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        records: List[PatientRecordBase],
        created_by: Optional[str] = None
    ) -> List[PatientRecordResponse]:
        """
        Bulk create patient records.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            records: List of patient records to create
            created_by: Auth0 ID of the creator

        Returns:
            List[PatientRecordResponse]: Created patient records

        Raises:
            ValidationError: If records list is empty
        """
        if not records:
            raise ValidationError(
                message="Cannot bulk create empty list of records",
                field="records"
            )

        patient_records = []
        for record_data in records:
            record_id = record_data.record_id or str(uuid4())
            patient_record = PatientRecord(
                project_id=project_id,
                trial_slug=trial_slug,
                record_id=record_id,
                patient_data=record_data.patient_data,
                metadata=record_data.metadata or {},
                created_by=created_by,
            )
            patient_records.append(patient_record)
            db.add(patient_record)

        await db.commit()

        # Refresh all records
        for record in patient_records:
            await db.refresh(record)

        return [PatientRecordResponse.model_validate(r) for r in patient_records]

    async def search_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        search_params: PatientRecordSearch,
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[PatientRecordResponse], int, int]:
        """
        Search patient records with flexible filtering.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            search_params: Search parameters
            page: Page number (1-indexed)
            size: Page size

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        # Build base query
        conditions = [
            PatientRecord.project_id == project_id,
            PatientRecord.trial_slug == trial_slug
        ]

        if search_params.record_id:
            conditions.append(PatientRecord.record_id == search_params.record_id)

        # JSONB-based filtering
        if search_params.filters:
            for field, value in search_params.filters.items():
                # Support nested JSONB queries like "patient_data.age"
                if "." in field:
                    parts = field.split(".", 1)
                    if parts[0] == "patient_data":
                        conditions.append(
                            PatientRecord.patient_data[parts[1]].astext == str(value)
                        )
                    elif parts[0] == "metadata":
                        conditions.append(
                            PatientRecord.metadata[parts[1]].astext == str(value)
                        )
                else:
                    # Top-level patient_data field
                    conditions.append(
                        PatientRecord.patient_data[field].astext == str(value)
                    )

        base_query = select(PatientRecord).where(and_(*conditions))

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        total_pages = ceil(total / size) if total > 0 else 0

        # Apply sorting and pagination
        base_query = base_query.order_by(desc(PatientRecord.created_at))
        offset = (page - 1) * size
        base_query = base_query.offset(offset).limit(size)

        result = await db.execute(base_query)
        records = result.scalars().all()

        return (
            [PatientRecordResponse.model_validate(r) for r in records],
            total,
            total_pages
        )

    async def count_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str
    ) -> int:
        """
        Get total count of patient records.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            int: Total count of records
        """
        query = select(func.count()).select_from(PatientRecord).where(
            and_(
                PatientRecord.project_id == project_id,
                PatientRecord.trial_slug == trial_slug
            )
        )

        result = await db.execute(query)
        return result.scalar() or 0
