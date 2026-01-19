"""
Execution Record Routes (PostgreSQL)

CRUD endpoints for execution/prediction records:
- Create execution records
- Get paginated execution records
- Get execution records by IDs
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.database import get_async_db
from app.schemas.patient_record import (
    ExecutionRecordCreate,
    ExecutionRecordUpdate,
    ExecutionRecordResponse,
    ExecutionRecordSearch,
    PaginatedExecutionRecordResponse,
)
from app.services.patient_records.execution_record_service import ExecutionRecordService
from app.exceptions.base import NotFoundError


router = APIRouter()


@router.post(
    "/{project_id}/{trial_slug}",
    response_model=ExecutionRecordResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_execution_record(
    project_id: UUID,
    trial_slug: str,
    record_data: ExecutionRecordCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:write")),
):
    """Create a new execution/prediction record."""
    service = ExecutionRecordService()
    return await service.create_record(
        db, project_id, trial_slug, record_data, current_user=current_user.id
    )


@router.get("/{project_id}/{trial_slug}", response_model=PaginatedExecutionRecordResponse)
async def get_execution_records(
    project_id: UUID,
    trial_slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query("executed_at", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get paginated execution records."""
    service = ExecutionRecordService()
    records, total, pages = await service.get_records(
        db, project_id, trial_slug,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order
    )
    return PaginatedExecutionRecordResponse(
        items=records, total=total, page=page, size=size, pages=pages
    )


@router.get("/{project_id}/{trial_slug}/{execution_id}", response_model=ExecutionRecordResponse)
async def get_execution_record(
    project_id: UUID,
    trial_slug: str,
    execution_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get a specific execution record by ID."""
    service = ExecutionRecordService()
    try:
        return await service.get_record_by_id(db, project_id, trial_slug, execution_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )


@router.put("/{project_id}/{trial_slug}/{execution_id}", response_model=ExecutionRecordResponse)
async def update_execution_record(
    project_id: UUID,
    trial_slug: str,
    execution_id: str,
    update_data: ExecutionRecordUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:write")),
):
    """Update an execution record."""
    service = ExecutionRecordService()
    try:
        return await service.update_record(
            db, project_id, trial_slug, execution_id, update_data, current_user=current_user.id
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )


@router.delete(
    "/{project_id}/{trial_slug}/{execution_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_execution_record(
    project_id: UUID,
    trial_slug: str,
    execution_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:delete")),
):
    """Delete an execution record."""
    service = ExecutionRecordService()
    try:
        await service.delete_record(db, project_id, trial_slug, execution_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )


@router.post("/{project_id}/{trial_slug}/batch", response_model=List[ExecutionRecordResponse])
async def get_execution_records_by_ids(
    project_id: UUID,
    trial_slug: str,
    execution_ids: List[str] = Body(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get multiple execution records by their IDs."""
    service = ExecutionRecordService()
    return await service.get_records_by_ids(
        db, project_id, trial_slug, execution_ids
    )


@router.post("/{project_id}/{trial_slug}/search", response_model=PaginatedExecutionRecordResponse)
async def search_execution_records(
    project_id: UUID,
    trial_slug: str,
    search_params: ExecutionRecordSearch,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Search execution records with filters."""
    service = ExecutionRecordService()
    records, total, pages = await service.search_records(
        db, project_id, trial_slug,
        search_params, page=page, size=size
    )
    return PaginatedExecutionRecordResponse(
        items=records, total=total, page=page, size=size, pages=pages
    )


@router.get("/{project_id}/{trial_slug}/user/{user_id}", response_model=PaginatedExecutionRecordResponse)
async def get_user_execution_records(
    project_id: UUID,
    trial_slug: str,
    user_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get execution records for a specific user."""
    service = ExecutionRecordService()
    records, total, pages = await service.get_user_records(
        db, project_id, trial_slug, user_id,
        page=page, size=size
    )
    return PaginatedExecutionRecordResponse(
        items=records, total=total, page=page, size=size, pages=pages
    )


@router.get("/{project_id}/{trial_slug}/stats/count")
async def get_execution_record_count(
    project_id: UUID,
    trial_slug: str,
    user_id: Optional[str] = Query(None, description="Optional user ID filter"),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get total count of execution records, optionally filtered by user."""
    service = ExecutionRecordService()
    count = await service.count_records(db, project_id, trial_slug, user_id)
    return {"count": count, "user_id": user_id}
