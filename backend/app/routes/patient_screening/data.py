"""
Data Routes for Patient Screening

API endpoints for master data operations including
upload, preview, and presigned URL generation.

Note: MasterData is not managed via CRUDRouter as it has special
upload/S3 handling that doesn't fit the standard CRUD pattern.
"""

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    HTTPException,
    Form,
    Query,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional
import json

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.patient_screening.common import SuccessResponse, DeleteResponse
from app.services.patient_screening import DataService
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

router = APIRouter(tags=["Patient Screening - Data Management"])


@router.post(
    "/master-data/upload",
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload master data file",
    dependencies=[Depends(has_permissions("patient_screening_master_data:write"))],
)
async def upload_master_data(
    file: UploadFile = File(...),
    study_id: UUID = Form(...),
    user_id: str = Form(...),
    user_name: Optional[str] = Form(None),
    patient_id_column: Optional[str] = Form(None),
    column_descriptions: Optional[str] = Form(None),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Upload patient master data file with optional column descriptions.

    Args:
        file: The master data file (csv, json, xlsx)
        study_id: Study UUID to associate the master data with
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
            status="success",
            message="File uploaded successfully",
            data=result.model_dump(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get(
    "/master-data/{master_data_id}/preview",
    response_model=SuccessResponse,
    summary="Get master data preview",
    dependencies=[Depends(has_permissions("patient_screening_master_data:read"))],
)
async def get_master_data_preview(
    master_data_id: UUID,
    page: int = Query(0, ge=0, description="Page number (0-indexed)"),
    size: int = Query(100, ge=1, le=1000, description="Rows per page (1-1000)"),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get paginated rows from master data for preview and filtering.

    This endpoint fetches actual patient data from the uploaded master data file,
    enabling features like:
    - Real values in filter autocomplete
    - Data preview before creating cohorts
    - CSV/Excel download of master data
    """
    logger.info(
        f"Fetching master data preview: master_data_id={master_data_id}, "
        f"page={page}, size={size}"
    )

    try:
        service = DataService()
        result = await service.get_master_data_preview(
            db=db,
            master_data_id=master_data_id,
            page=page,
            size=size,
        )

        return SuccessResponse(status="success", data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get master data preview: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve master data preview")


@router.get(
    "/master-data/{master_data_id}",
    response_model=SuccessResponse,
    summary="Get master data metadata",
    dependencies=[Depends(has_permissions("patient_screening_master_data:read"))],
)
async def get_master_data(
    master_data_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Get master data metadata by ID."""
    service = DataService()
    master_data = await service.get_master_data_by_id(db, master_data_id)

    if not master_data:
        raise HTTPException(status_code=404, detail="Master data not found")

    return SuccessResponse(
        status="success",
        data={
            "id": str(master_data.id),
            "study_id": str(master_data.study_id),
            "file_name": master_data.file_name,
            "file_type": master_data.file_type,
            "file_size": master_data.file_size,
            "row_count": master_data.row_count,
            "columns": master_data.columns,
            "patient_id_column": master_data.patient_id_column,
            "column_descriptions": master_data.column_descriptions,
            "sample_data": master_data.sample_data,
            "created_at": master_data.created_at.isoformat() if master_data.created_at else None,
        },
    )


@router.delete(
    "/master-data/{master_data_id}",
    response_model=DeleteResponse,
    summary="Delete master data",
    dependencies=[Depends(has_permissions("patient_screening_master_data:write"))],
)
async def delete_master_data(
    master_data_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Delete master data and its S3 file."""
    service = DataService()
    deleted = await service.delete_master_data(
        db, master_data_id, current_user.id, current_user.name
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Master data not found")

    return DeleteResponse(status="success", message="Master data deleted successfully")


@router.get(
    "/master-data/{master_data_id}/download-url",
    response_model=SuccessResponse,
    summary="Get master data download URL",
    dependencies=[Depends(has_permissions("patient_screening_master_data:read"))],
)
async def get_master_data_download_url(
    master_data_id: UUID,
    expires_in: Optional[int] = Query(
        None,
        ge=60,
        le=3600,
        description="URL expiration in seconds (60-3600)",
    ),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Generate a presigned URL for master data download."""
    try:
        service = DataService()
        result = await service.generate_presigned_url(db, master_data_id, expires_in)

        return SuccessResponse(status="success", data=result.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch(
    "/master-data/{master_data_id}/column-descriptions",
    response_model=SuccessResponse,
    summary="Update column descriptions",
    dependencies=[Depends(has_permissions("patient_screening_master_data:write"))],
)
async def update_column_descriptions(
    master_data_id: UUID,
    column_descriptions: dict,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Update column descriptions for master data."""
    try:
        service = DataService()
        master_data = await service.update_column_descriptions(
            db,
            master_data_id,
            column_descriptions,
            current_user.id,
            current_user.name,
        )

        return SuccessResponse(
            status="success",
            message="Column descriptions updated successfully",
            data={
                "master_data_id": str(master_data.id),
                "column_descriptions": master_data.column_descriptions,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
