"""
Patient Record Routes (PostgreSQL)

CRUD endpoints for patient records:
- Create, read, delete patient records
- Paginated listing
- Bulk operations
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.database import get_async_db
from app.schemas.patient_record import (
    PatientRecordBase,
    PatientRecordUpdate,
    PatientRecordResponse,
    PatientRecordSearch,
    PaginatedPatientRecordResponse,
)
from app.services.patient_records.patient_record_service import PatientRecordService
from app.exceptions.base import NotFoundError


router = APIRouter()


@router.post(
    "/{project_id}/{trial_slug}",
    response_model=PatientRecordResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_patient_record(
    project_id: UUID,
    trial_slug: str,
    record_data: PatientRecordBase,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:write")),
):
    """Create a new patient record."""
    service = PatientRecordService()
    return await service.create_record(
        db, project_id, trial_slug, record_data, created_by=current_user.id
    )


@router.get("/{project_id}/{trial_slug}", response_model=PaginatedPatientRecordResponse)
async def get_patient_records(
    project_id: UUID,
    trial_slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query(None, alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get paginated patient records."""
    service = PatientRecordService()
    records, total, pages = await service.get_records(
        db, project_id, trial_slug,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order
    )
    return PaginatedPatientRecordResponse(
        items=records, total=total, page=page, size=size, pages=pages
    )


@router.get("/{project_id}/{trial_slug}/all", response_model=List[PatientRecordResponse])
async def get_all_patient_records(
    project_id: UUID,
    trial_slug: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get all patient records (no pagination)."""
    service = PatientRecordService()
    return await service.get_all_records(db, project_id, trial_slug)


@router.get("/{project_id}/{trial_slug}/{record_id}", response_model=PatientRecordResponse)
async def get_patient_record(
    project_id: UUID,
    trial_slug: str,
    record_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get a specific patient record by ID."""
    service = PatientRecordService()
    try:
        return await service.get_record_by_id(db, project_id, trial_slug, record_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )


@router.put("/{project_id}/{trial_slug}/{record_id}", response_model=PatientRecordResponse)
async def update_patient_record(
    project_id: UUID,
    trial_slug: str,
    record_id: str,
    update_data: PatientRecordUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:write")),
):
    """Update a patient record."""
    service = PatientRecordService()
    try:
        return await service.update_record(
            db, project_id, trial_slug, record_id, update_data, updated_by=current_user.id
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )


@router.delete(
    "/{project_id}/{trial_slug}/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_patient_record(
    project_id: UUID,
    trial_slug: str,
    record_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:delete")),
):
    """Delete a patient record."""
    service = PatientRecordService()
    try:
        await service.delete_record(db, project_id, trial_slug, record_id)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message
        )


@router.post(
    "/{project_id}/{trial_slug}/bulk",
    response_model=List[PatientRecordResponse],
    status_code=status.HTTP_201_CREATED
)
async def bulk_create_patient_records(
    project_id: UUID,
    trial_slug: str,
    records: List[PatientRecordBase],
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:write")),
):
    """Bulk create patient records."""
    service = PatientRecordService()
    return await service.bulk_create_records(
        db, project_id, trial_slug, records, created_by=current_user.id
    )


@router.post("/{project_id}/{trial_slug}/search", response_model=PaginatedPatientRecordResponse)
async def search_patient_records(
    project_id: UUID,
    trial_slug: str,
    search_params: PatientRecordSearch,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Search patient records with filters."""
    service = PatientRecordService()
    records, total, pages = await service.search_records(
        db, project_id, trial_slug,
        search_params, page=page, size=size
    )
    return PaginatedPatientRecordResponse(
        items=records, total=total, page=page, size=size, pages=pages
    )


@router.get("/{project_id}/{trial_slug}/stats/count")
async def get_patient_record_count(
    project_id: UUID,
    trial_slug: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get total count of patient records."""
    service = PatientRecordService()
    count = await service.count_records(db, project_id, trial_slug)
    return {"count": count}
