"""
Asset Upload Routes

Endpoints for S3 file management:
- Upload files to S3
- Delete folders from S3
- Get presigned URLs
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Header

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.base import CamelModel
from app.services.assets.upload_service import UploadService


router = APIRouter()


class UploadResponse(CamelModel):
    """Response for file upload."""
    asset_id: str
    url: str
    key: str


class PresignedUrlResponse(CamelModel):
    """Response for presigned URL."""
    url: str
    expires_in: int


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    folder: Optional[str] = Query(None, description="Optional folder path"),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("assets:write")),
):
    """Upload a file to S3."""
    service = UploadService()
    result = await service.upload_file(
        file=file,
        org_id=org_id,
        user_id=current_user.id,
        folder=folder
    )
    return UploadResponse(**result)


@router.delete("/folder/{enterprise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enterprise_folder(
    enterprise_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("assets:delete")),
):
    """Delete all files in an enterprise's folder."""
    service = UploadService()
    deleted = await service.delete_folder(enterprise_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found or already empty"
        )


@router.get("/{asset_id}", response_model=PresignedUrlResponse)
async def get_asset_url(
    asset_id: str,
    expires_in: int = Query(3600, ge=60, le=86400, description="URL expiration in seconds"),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("assets:read")),
):
    """Get a presigned URL for an asset."""
    service = UploadService()
    result = await service.get_presigned_url(asset_id, org_id, expires_in)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return PresignedUrlResponse(**result)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("assets:delete")),
):
    """Delete an asset from S3."""
    service = UploadService()
    deleted = await service.delete_asset(asset_id, org_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )


@router.post("/upload/presigned")
async def get_upload_presigned_url(
    filename: str = Query(...),
    content_type: str = Query(..., alias="contentType"),
    folder: Optional[str] = Query(None),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("assets:write")),
):
    """Get a presigned URL for direct upload to S3."""
    service = UploadService()
    result = await service.get_upload_presigned_url(
        filename=filename,
        content_type=content_type,
        org_id=org_id,
        user_id=current_user.id,
        folder=folder
    )
    return result
