"""
Execution Record Service (PostgreSQL)

Manages execution/prediction records stored in PostgreSQL with JSONB fields.
Supports multi-tenant isolation via schema-based tenancy.
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from math import ceil
from uuid import UUID, uuid4

from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant.patient_record import ExecutionRecord
from app.schemas.patient_record import (
    ExecutionRecordCreate,
    ExecutionRecordUpdate,
    ExecutionRecordResponse,
    ExecutionRecordSearch,
)
from app.exceptions.base import NotFoundError, ValidationError


class ExecutionRecordService:
    """
    Execution record management service using PostgreSQL.

    Handles CRUD operations for execution/prediction records with support for:
    - User-specific record tracking
    - Pagination and sorting
    - Batch retrieval by IDs
    - Flexible search filtering
    - Multi-tenant isolation
    """

    async def create_record(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        record_data: ExecutionRecordCreate,
        current_user: str
    ) -> ExecutionRecordResponse:
        """
        Create a new execution record.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_data: Execution record data
            current_user: Auth0 ID of the user creating the record

        Returns:
            ExecutionRecordResponse: Created execution record
        """
        # Generate execution_id
        execution_id = str(uuid4())

        execution_record = ExecutionRecord(
            execution_id=execution_id,
            project_id=project_id,
            trial_slug=trial_slug,
            user_id=record_data.user_id,
            base_patient_data=record_data.base_patient_data,
            base_prediction=record_data.base_prediction,
            executed_by=record_data.executed_by or current_user,
        )

        db.add(execution_record)
        await db.commit()
        await db.refresh(execution_record)

        return ExecutionRecordResponse.model_validate(execution_record)

    async def get_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        page: int = 1,
        size: int = 10,
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Tuple[List[ExecutionRecordResponse], int, int]:
        """
        Get paginated execution records.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            page: Page number (1-indexed)
            size: Page size
            sort_by: Field to sort by (default: executed_at)
            sort_order: Sort order 'asc' or 'desc'

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        # Build base query
        base_query = select(ExecutionRecord).where(
            and_(
                ExecutionRecord.project_id == project_id,
                ExecutionRecord.trial_slug == trial_slug
            )
        )

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        total_pages = ceil(total / size) if total > 0 else 0

        # Apply sorting
        sort_field = getattr(ExecutionRecord, sort_by or "executed_at", ExecutionRecord.executed_at)
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
            [ExecutionRecordResponse.model_validate(r) for r in records],
            total,
            total_pages
        )

    async def get_record_by_id(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        execution_id: str
    ) -> ExecutionRecordResponse:
        """
        Get an execution record by its execution_id.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_id: Execution identifier

        Returns:
            ExecutionRecordResponse: Execution record

        Raises:
            NotFoundError: If record not found
        """
        query = select(ExecutionRecord).where(
            and_(
                ExecutionRecord.project_id == project_id,
                ExecutionRecord.trial_slug == trial_slug,
                ExecutionRecord.execution_id == execution_id
            )
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Execution record not found with execution_id: {execution_id}",
                resource_type="ExecutionRecord",
                resource_id=execution_id
            )

        return ExecutionRecordResponse.model_validate(record)

    async def get_record_by_uuid(
        self,
        db: AsyncSession,
        record_uuid: UUID
    ) -> ExecutionRecordResponse:
        """
        Get an execution record by its UUID.

        Args:
            db: Database session (tenant-scoped)
            record_uuid: Record UUID

        Returns:
            ExecutionRecordResponse: Execution record

        Raises:
            NotFoundError: If record not found
        """
        query = select(ExecutionRecord).where(ExecutionRecord.id == record_uuid)

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Execution record not found with id: {record_uuid}",
                resource_type="ExecutionRecord",
                resource_id=str(record_uuid)
            )

        return ExecutionRecordResponse.model_validate(record)

    async def update_record(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        execution_id: str,
        update_data: ExecutionRecordUpdate,
        current_user: str
    ) -> ExecutionRecordResponse:
        """
        Update an execution record.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_id: Execution identifier
            update_data: Updated execution record data
            current_user: Auth0 ID of the user updating the record

        Returns:
            ExecutionRecordResponse: Updated execution record

        Raises:
            NotFoundError: If record not found
        """
        query = select(ExecutionRecord).where(
            and_(
                ExecutionRecord.project_id == project_id,
                ExecutionRecord.trial_slug == trial_slug,
                ExecutionRecord.execution_id == execution_id
            )
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Execution record not found with execution_id: {execution_id}",
                resource_type="ExecutionRecord",
                resource_id=execution_id
            )

        # Update fields
        if update_data.base_patient_data is not None:
            record.base_patient_data = update_data.base_patient_data

        if update_data.base_prediction is not None:
            record.base_prediction = update_data.base_prediction

        record.updated_by = update_data.updated_by or current_user
        record.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(record)

        return ExecutionRecordResponse.model_validate(record)

    async def get_records_by_ids(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        execution_ids: List[str]
    ) -> List[ExecutionRecordResponse]:
        """
        Get multiple execution records by their IDs.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_ids: List of execution identifiers

        Returns:
            List[ExecutionRecordResponse]: List of execution records
        """
        if not execution_ids:
            return []

        query = select(ExecutionRecord).where(
            and_(
                ExecutionRecord.project_id == project_id,
                ExecutionRecord.trial_slug == trial_slug,
                ExecutionRecord.execution_id.in_(execution_ids)
            )
        )

        result = await db.execute(query)
        records = result.scalars().all()

        return [ExecutionRecordResponse.model_validate(r) for r in records]

    async def search_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        search_params: ExecutionRecordSearch,
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[ExecutionRecordResponse], int, int]:
        """
        Search execution records with flexible filtering.

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
        # Build query conditions
        conditions = [
            ExecutionRecord.project_id == project_id,
            ExecutionRecord.trial_slug == trial_slug
        ]

        if search_params.user_id:
            conditions.append(ExecutionRecord.user_id == search_params.user_id)

        if search_params.executed_by:
            conditions.append(ExecutionRecord.executed_by == search_params.executed_by)

        # Date range filtering
        if search_params.date_from:
            conditions.append(ExecutionRecord.executed_at >= search_params.date_from)

        if search_params.date_to:
            conditions.append(ExecutionRecord.executed_at <= search_params.date_to)

        base_query = select(ExecutionRecord).where(and_(*conditions))

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        total_pages = ceil(total / size) if total > 0 else 0

        # Apply sorting and pagination
        base_query = base_query.order_by(
            desc(ExecutionRecord.executed_at),
            desc(ExecutionRecord.updated_at)
        )
        offset = (page - 1) * size
        base_query = base_query.offset(offset).limit(size)

        result = await db.execute(base_query)
        records = result.scalars().all()

        return (
            [ExecutionRecordResponse.model_validate(r) for r in records],
            total,
            total_pages
        )

    async def get_user_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        user_id: str,
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[ExecutionRecordResponse], int, int]:
        """
        Get paginated execution records for a specific user.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            user_id: User identifier (Auth0 ID)
            page: Page number (1-indexed)
            size: Page size

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        base_query = select(ExecutionRecord).where(
            and_(
                ExecutionRecord.project_id == project_id,
                ExecutionRecord.trial_slug == trial_slug,
                ExecutionRecord.user_id == user_id
            )
        )

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        total_pages = ceil(total / size) if total > 0 else 0

        # Apply sorting and pagination
        base_query = base_query.order_by(
            desc(ExecutionRecord.executed_at),
            desc(ExecutionRecord.updated_at)
        )
        offset = (page - 1) * size
        base_query = base_query.offset(offset).limit(size)

        result = await db.execute(base_query)
        records = result.scalars().all()

        return (
            [ExecutionRecordResponse.model_validate(r) for r in records],
            total,
            total_pages
        )

    async def count_records(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        user_id: Optional[str] = None
    ) -> int:
        """
        Get total count of execution records, optionally filtered by user.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            user_id: Optional user identifier to filter by

        Returns:
            int: Total count of records
        """
        conditions = [
            ExecutionRecord.project_id == project_id,
            ExecutionRecord.trial_slug == trial_slug
        ]

        if user_id:
            conditions.append(ExecutionRecord.user_id == user_id)

        query = select(func.count()).select_from(ExecutionRecord).where(and_(*conditions))

        result = await db.execute(query)
        return result.scalar() or 0

    async def delete_record(
        self,
        db: AsyncSession,
        project_id: UUID,
        trial_slug: str,
        execution_id: str
    ) -> bool:
        """
        Delete an execution record.

        Args:
            db: Database session (tenant-scoped)
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_id: Execution identifier

        Returns:
            bool: True if deleted successfully

        Raises:
            NotFoundError: If record not found
        """
        query = select(ExecutionRecord).where(
            and_(
                ExecutionRecord.project_id == project_id,
                ExecutionRecord.trial_slug == trial_slug,
                ExecutionRecord.execution_id == execution_id
            )
        )

        result = await db.execute(query)
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError(
                message=f"Execution record not found with execution_id: {execution_id}",
                resource_type="ExecutionRecord",
                resource_id=execution_id
            )

        await db.delete(record)
        await db.commit()

        return True
