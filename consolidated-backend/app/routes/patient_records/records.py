"""
Patient Record Routes (MongoDB)

CRUD endpoints for patient records:
- Create, read, delete patient records
- Paginated listing
- Bulk operations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.mongo import (
    PatientRecordCreate,
    PatientRecordUpdate,
    PatientRecordResponse,
    PatientRecordBulkCreate,
    PatientRecordSearch,
    MongoPaginatedResponse,
)
from app.services.patient_records.patient_record_service import PatientRecordService


router = APIRouter()


@router.post(
    "/{project_id}/{trial_slug}",
    response_model=PatientRecordResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_patient_record(
    project_id: str,
    trial_slug: str,
    record_data: PatientRecordCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:write")),
):
    """Create a new patient record."""
    service = PatientRecordService()
    record = await service.create_record(org_id, project_id, trial_slug, record_data)
    return PatientRecordResponse.model_validate(record)


@router.get("/{project_id}/{trial_slug}", response_model=MongoPaginatedResponse)
async def get_patient_records(
    project_id: str,
    trial_slug: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query(None, alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get paginated patient records."""
    service = PatientRecordService()
    return await service.get_records(
        org_id, project_id, trial_slug,
        page=page, size=size,
        sort_by=sort_by, sort_order=sort_order
    )


@router.get("/{project_id}/{trial_slug}/all", response_model=List[PatientRecordResponse])
async def get_all_patient_records(
    project_id: str,
    trial_slug: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get all patient records (no pagination)."""
    service = PatientRecordService()
    records = await service.get_all_records(org_id, project_id, trial_slug)
    return [PatientRecordResponse.model_validate(r) for r in records]


@router.get("/{project_id}/{trial_slug}/{record_id}", response_model=PatientRecordResponse)
async def get_patient_record(
    project_id: str,
    trial_slug: str,
    record_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Get a specific patient record by ID."""
    service = PatientRecordService()
    record = await service.get_record_by_id(org_id, project_id, trial_slug, record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found"
        )
    return PatientRecordResponse.model_validate(record)


@router.put("/{project_id}/{trial_slug}/{record_id}", response_model=PatientRecordResponse)
async def update_patient_record(
    project_id: str,
    trial_slug: str,
    record_id: str,
    update_data: PatientRecordUpdate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:write")),
):
    """Update a patient record."""
    service = PatientRecordService()
    record = await service.update_record(
        org_id, project_id, trial_slug, record_id, update_data
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found"
        )
    return PatientRecordResponse.model_validate(record)


@router.delete(
    "/{project_id}/{trial_slug}/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_patient_record(
    project_id: str,
    trial_slug: str,
    record_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:delete")),
):
    """Delete a patient record."""
    service = PatientRecordService()
    deleted = await service.delete_record(org_id, project_id, trial_slug, record_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found"
        )


@router.post(
    "/{project_id}/{trial_slug}/bulk",
    response_model=List[PatientRecordResponse],
    status_code=status.HTTP_201_CREATED
)
async def bulk_create_patient_records(
    project_id: str,
    trial_slug: str,
    bulk_data: PatientRecordBulkCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:write")),
):
    """Bulk create patient records."""
    service = PatientRecordService()
    records = await service.bulk_create_records(
        org_id, project_id, trial_slug, bulk_data.records
    )
    return [PatientRecordResponse.model_validate(r) for r in records]


@router.post("/{project_id}/{trial_slug}/search", response_model=MongoPaginatedResponse)
async def search_patient_records(
    project_id: str,
    trial_slug: str,
    search_params: PatientRecordSearch,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("patient-records:read")),
):
    """Search patient records with filters."""
    service = PatientRecordService()
    return await service.search_records(
        org_id, project_id, trial_slug,
        search_params, page=page, size=size
    )
