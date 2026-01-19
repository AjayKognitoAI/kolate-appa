"""
Example Patient Records Routes

This file demonstrates how to integrate PatientRecordService and ExecutionRecordService
into FastAPI routes. Copy and adapt these patterns for your actual API implementation.

NOT FOR PRODUCTION USE AS-IS - This is a reference implementation.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, Path, HTTPException, status

from app.services.patient_records import PatientRecordService, ExecutionRecordService
from app.schemas.mongo import (
    PatientRecordCreate,
    PatientRecordUpdate,
    PatientRecordResponse,
    PatientRecordBulkCreate,
    PatientRecordSearch,
    ExecutionRecordCreate,
    ExecutionRecordUpdate,
    ExecutionRecordResponse,
    ExecutionRecordSearch,
    MongoPaginatedResponse,
)
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.exceptions.base import NotFoundError, ValidationError


# Router for patient records
patient_records_router = APIRouter(
    prefix="/api/v1/projects/{project_id}/trials/{trial_slug}/patient-records",
    tags=["Patient Records"]
)

# Router for execution records
execution_records_router = APIRouter(
    prefix="/api/v1/projects/{project_id}/trials/{trial_slug}/executions",
    tags=["Execution Records"]
)


# ==================== PATIENT RECORDS ====================

@patient_records_router.post(
    "",
    response_model=PatientRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a patient record"
)
async def create_patient_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    record_data: PatientRecordCreate = ...,
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:write"))
):
    """
    Create a new patient record for the specified project and trial.

    Requires `patient_records:write` permission.
    """
    service = PatientRecordService()
    return await service.create_record(org_id, project_id, trial_slug, record_data)


@patient_records_router.get(
    "",
    response_model=MongoPaginatedResponse,
    summary="List patient records"
)
async def list_patient_records(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:read"))
):
    """
    Get paginated list of patient records for the specified project and trial.

    Requires `patient_records:read` permission.
    """
    service = PatientRecordService()
    records, total, pages = await service.get_records(
        org_id, project_id, trial_slug, page, size, sort_by, sort_order
    )

    return MongoPaginatedResponse(
        items=records,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@patient_records_router.get(
    "/{record_id}",
    response_model=PatientRecordResponse,
    summary="Get a patient record"
)
async def get_patient_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    record_id: str = Path(..., description="Record identifier"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:read"))
):
    """
    Get a specific patient record by ID.

    Requires `patient_records:read` permission.
    """
    service = PatientRecordService()
    try:
        return await service.get_record_by_id(org_id, project_id, trial_slug, record_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@patient_records_router.put(
    "/{record_id}",
    response_model=PatientRecordResponse,
    summary="Update a patient record"
)
async def update_patient_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    record_id: str = Path(..., description="Record identifier"),
    update_data: PatientRecordUpdate = ...,
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:write"))
):
    """
    Update an existing patient record.

    Requires `patient_records:write` permission.
    """
    service = PatientRecordService()
    try:
        return await service.update_record(org_id, project_id, trial_slug, record_id, update_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@patient_records_router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a patient record"
)
async def delete_patient_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    record_id: str = Path(..., description="Record identifier"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:delete"))
):
    """
    Delete a patient record.

    Requires `patient_records:delete` permission.
    """
    service = PatientRecordService()
    try:
        await service.delete_record(org_id, project_id, trial_slug, record_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@patient_records_router.post(
    "/bulk",
    response_model=list[PatientRecordResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Bulk create patient records"
)
async def bulk_create_patient_records(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    bulk_data: PatientRecordBulkCreate = ...,
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:write"))
):
    """
    Bulk create multiple patient records.

    Requires `patient_records:write` permission.
    """
    service = PatientRecordService()
    try:
        return await service.bulk_create_records(
            org_id, project_id, trial_slug, bulk_data.records
        )
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message)


@patient_records_router.post(
    "/search",
    response_model=MongoPaginatedResponse,
    summary="Search patient records"
)
async def search_patient_records(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    search_params: PatientRecordSearch = ...,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:read"))
):
    """
    Search patient records with flexible filtering.

    Requires `patient_records:read` permission.
    """
    service = PatientRecordService()
    records, total, pages = await service.search_records(
        org_id, project_id, trial_slug, search_params, page, size
    )

    return MongoPaginatedResponse(
        items=records,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@patient_records_router.get(
    "/stats/count",
    summary="Get patient record count"
)
async def get_patient_record_count(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient_records:read"))
):
    """
    Get total count of patient records.

    Requires `patient_records:read` permission.
    """
    service = PatientRecordService()
    count = await service.count_records(org_id, project_id, trial_slug)
    return {"count": count}


# ==================== EXECUTION RECORDS ====================

@execution_records_router.post(
    "",
    response_model=ExecutionRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an execution record"
)
async def create_execution_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    record_data: ExecutionRecordCreate = ...,
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:write"))
):
    """
    Create a new execution/prediction record.

    Requires `executions:write` permission.
    """
    service = ExecutionRecordService()
    return await service.create_record(
        org_id, project_id, trial_slug, record_data, current_user.id
    )


@execution_records_router.get(
    "",
    response_model=MongoPaginatedResponse,
    summary="List execution records"
)
async def list_execution_records(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read"))
):
    """
    Get paginated list of execution records.

    Requires `executions:read` permission.
    """
    service = ExecutionRecordService()
    records, total, pages = await service.get_records(
        org_id, project_id, trial_slug, page, size, sort_by, sort_order
    )

    return MongoPaginatedResponse(
        items=records,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@execution_records_router.get(
    "/{execution_id}",
    response_model=ExecutionRecordResponse,
    summary="Get an execution record"
)
async def get_execution_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    execution_id: str = Path(..., description="Execution identifier"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read"))
):
    """
    Get a specific execution record by ID.

    Requires `executions:read` permission.
    """
    service = ExecutionRecordService()
    try:
        return await service.get_record_by_id(org_id, project_id, trial_slug, execution_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@execution_records_router.put(
    "/{execution_id}",
    response_model=ExecutionRecordResponse,
    summary="Update an execution record"
)
async def update_execution_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    execution_id: str = Path(..., description="Execution identifier"),
    update_data: ExecutionRecordUpdate = ...,
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:write"))
):
    """
    Update an existing execution record.

    Requires `executions:write` permission.
    """
    service = ExecutionRecordService()
    try:
        return await service.update_record(
            org_id, project_id, trial_slug, execution_id, update_data, current_user.id
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@execution_records_router.delete(
    "/{execution_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an execution record"
)
async def delete_execution_record(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    execution_id: str = Path(..., description="Execution identifier"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:delete"))
):
    """
    Delete an execution record.

    Requires `executions:delete` permission.
    """
    service = ExecutionRecordService()
    try:
        await service.delete_record(org_id, project_id, trial_slug, execution_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@execution_records_router.post(
    "/search",
    response_model=MongoPaginatedResponse,
    summary="Search execution records"
)
async def search_execution_records(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    search_params: ExecutionRecordSearch = ...,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read"))
):
    """
    Search execution records with flexible filtering.

    Supports filtering by user_id, executed_by, and date range.

    Requires `executions:read` permission.
    """
    service = ExecutionRecordService()
    records, total, pages = await service.search_records(
        org_id, project_id, trial_slug, search_params, page, size
    )

    return MongoPaginatedResponse(
        items=records,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@execution_records_router.get(
    "/user/{user_id}",
    response_model=MongoPaginatedResponse,
    summary="Get user's execution records"
)
async def get_user_execution_records(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    user_id: str = Path(..., description="User identifier (Auth0 ID)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read"))
):
    """
    Get all execution records for a specific user.

    Requires `executions:read` permission.
    """
    service = ExecutionRecordService()
    records, total, pages = await service.get_user_records(
        org_id, project_id, trial_slug, user_id, page, size
    )

    return MongoPaginatedResponse(
        items=records,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@execution_records_router.get(
    "/stats/count",
    summary="Get execution record count"
)
async def get_execution_record_count(
    project_id: str = Path(..., description="Project identifier"),
    trial_slug: str = Path(..., description="Trial slug identifier"),
    user_id: Optional[str] = Query(None, description="Optional user ID filter"),
    org_id: str = Header(..., alias="org-id", description="Organization ID"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("executions:read"))
):
    """
    Get total count of execution records, optionally filtered by user.

    Requires `executions:read` permission.
    """
    service = ExecutionRecordService()
    count = await service.count_records(org_id, project_id, trial_slug, user_id)
    return {"count": count, "user_id": user_id}


# Export routers for registration in main app
__all__ = ["patient_records_router", "execution_records_router"]
