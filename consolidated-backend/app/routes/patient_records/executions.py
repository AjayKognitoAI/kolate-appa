"""
Execution Record Routes (MongoDB)

CRUD endpoints for execution/prediction records:
- Create execution records
- Get paginated execution records
- Get execution records by IDs
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header, Body

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.mongo import (
    ExecutionRecordCreate,
    ExecutionRecordUpdate,
    ExecutionRecordResponse,
    ExecutionRecordSearch,
    MongoPaginatedResponse,
)
from app.services.patient_records.execution_record_service import ExecutionRecordService


router = APIRouter()


@router.post(
    "/{project_id}/{trial_slug}",
    response_model=ExecutionRecordResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_execution_record(
    project_id: str,
    trial_slug: str,
    record_data: ExecutionRecordCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:write")),
):
    """Create a new execution/prediction record."""
    service = ExecutionRecordService()
    record = await service.create_record(
        org_id, project_id, trial_slug, record_data, current_user
    )
    return ExecutionRecordResponse.model_validate(record)


@router.get("/{project_id}/{trial_slug}", response_model=MongoPaginatedResponse)
async def get_execution_records(
    project_id: str,
    trial_slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query("executed_at", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get paginated execution records."""
    service = ExecutionRecordService()
    return await service.get_records(
        org_id, project_id, trial_slug,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order
    )


@router.get("/{project_id}/{trial_slug}/{execution_id}", response_model=ExecutionRecordResponse)
async def get_execution_record(
    project_id: str,
    trial_slug: str,
    execution_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get a specific execution record by ID."""
    service = ExecutionRecordService()
    record = await service.get_record_by_id(org_id, project_id, trial_slug, execution_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution record not found"
        )
    return ExecutionRecordResponse.model_validate(record)


@router.put("/{project_id}/{trial_slug}/{execution_id}", response_model=ExecutionRecordResponse)
async def update_execution_record(
    project_id: str,
    trial_slug: str,
    execution_id: str,
    update_data: ExecutionRecordUpdate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:write")),
):
    """Update an execution record."""
    service = ExecutionRecordService()
    record = await service.update_record(
        org_id, project_id, trial_slug, execution_id, update_data, current_user
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution record not found"
        )
    return ExecutionRecordResponse.model_validate(record)


@router.post("/{project_id}/{trial_slug}/batch", response_model=List[ExecutionRecordResponse])
async def get_execution_records_by_ids(
    project_id: str,
    trial_slug: str,
    execution_ids: List[str] = Body(...),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get multiple execution records by their IDs."""
    service = ExecutionRecordService()
    records = await service.get_records_by_ids(
        org_id, project_id, trial_slug, execution_ids
    )
    return [ExecutionRecordResponse.model_validate(r) for r in records]


@router.post("/{project_id}/{trial_slug}/search", response_model=MongoPaginatedResponse)
async def search_execution_records(
    project_id: str,
    trial_slug: str,
    search_params: ExecutionRecordSearch,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Search execution records with filters."""
    service = ExecutionRecordService()
    return await service.search_records(
        org_id, project_id, trial_slug,
        search_params, page=page, size=size
    )


@router.get("/{project_id}/{trial_slug}/user/{user_id}", response_model=MongoPaginatedResponse)
async def get_user_execution_records(
    project_id: str,
    trial_slug: str,
    user_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read")),
):
    """Get execution records for a specific user."""
    service = ExecutionRecordService()
    return await service.get_user_records(
        org_id, project_id, trial_slug, user_id,
        page=page, size=size
    )
