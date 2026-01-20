"""
Study Custom Routes for Patient Screening

Custom API endpoints for study workflow operations.
Standard CRUD is handled by CRUDRouter in __init__.py.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
import json

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.patient_screening.common import SuccessResponse
from app.services.patient_screening import StudyService, DataService
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

# Custom routes for business logic (not CRUD)
custom_study_router = APIRouter()


# ============== Nested Resource Endpoints ==============


@custom_study_router.get(
    "/{study_id}/master-data",
    response_model=SuccessResponse,
    summary="Get study master data files",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_study_master_data(
    study_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all master data files for a study."""
    service = StudyService()

    try:
        master_data = await service.get_study_master_data(db, study_id)
        return SuccessResponse(status="success", data=master_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@custom_study_router.get(
    "/{study_id}/cohorts",
    response_model=SuccessResponse,
    summary="Get study cohorts",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_study_cohorts(
    study_id: UUID,
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all cohorts for a study."""
    service = StudyService()

    try:
        cohorts, total = await service.get_study_cohorts(db, study_id, page, size)
        return SuccessResponse(
            status="success",
            data={
                "content": [c.model_dump() for c in cohorts],
                "total_elements": total,
                "page": page,
                "size": size,
                "total_pages": (total + size - 1) // size,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@custom_study_router.get(
    "/{study_id}/cohort-patient-ids",
    response_model=SuccessResponse,
    summary="Get all patient IDs from study cohorts",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_study_cohort_patient_ids(
    study_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get all patient IDs from all cohorts within a study.
    Used for "belongs to cohort" / "not belongs to cohort" filter conditions.
    """
    service = StudyService()

    try:
        data = await service.get_study_cohort_patient_ids(db, study_id)
        return SuccessResponse(status="success", data=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@custom_study_router.get(
    "/{study_id}/details",
    response_model=SuccessResponse,
    summary="Get study with counts",
    dependencies=[Depends(has_permissions("patient_screening_studies:read"))],
)
async def get_study_details(
    study_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get study by ID with master data count, cohort count, and total patients."""
    service = StudyService()
    study = await service.get_study_with_counts(db, study_id)

    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    return SuccessResponse(status="success", data=study.model_dump())


# ============== Workflow Endpoints ==============


@custom_study_router.post(
    "/{study_id}/upload-master-data",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload master data for study",
    dependencies=[Depends(has_permissions("patient_screening_studies:write"))],
)
async def upload_master_data_for_study(
    study_id: UUID,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    user_name: Optional[str] = Form(None),
    patient_id_column: Optional[str] = Form(None),
    column_descriptions: Optional[str] = Form(None),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Upload patient master data file for a specific study.

    Args:
        study_id: Study UUID
        file: The master data file (csv, json, xlsx)
        user_id: User ID
        user_name: Optional user display name
        patient_id_column: Optional column name for patient IDs
        column_descriptions: Optional JSON string with column metadata
    """
    logger.info(f"Uploading master data file: {file.filename} for study {study_id}")

    try:
        file_content = await file.read()
        service = DataService()

        # Parse column_descriptions JSON if provided
        parsed_column_descriptions = None
        if column_descriptions:
            try:
                parsed_column_descriptions = json.loads(column_descriptions)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid column_descriptions JSON: {str(e)}")

        result = await service.upload_master_data(
            db=db,
            file_content=file_content,
            file_name=file.filename,
            content_type=file.content_type,
            study_id=study_id,
            user_id=user_id,
            user_name=user_name,
            patient_id_column=patient_id_column,
            column_descriptions=parsed_column_descriptions,
        )

        return SuccessResponse(
            status="success", message="File uploaded successfully", data=result.model_dump()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
