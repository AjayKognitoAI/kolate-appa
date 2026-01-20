"""
Upload Service

S3 file management operations using the centralized S3 client.
"""

from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import UploadFile

from app.config.settings import settings
from app.core.s3_client import get_s3_client, S3Client


class UploadService:
    """S3 file upload and management service."""

    def __init__(self, s3_client: Optional[S3Client] = None):
        """
        Initialize upload service.

        Args:
            s3_client: Optional S3 client instance (uses global singleton if not provided)
        """
        self._s3_client = s3_client
        self.bucket = getattr(settings, "AWS_S3_BUCKET_NAME", "kolate-assets")

    @property
    def s3_client(self) -> S3Client:
        """Get S3 client (lazy-loaded singleton if not provided)."""
        if self._s3_client is None:
            self._s3_client = get_s3_client()
        return self._s3_client

    def _generate_key(
        self, org_id: str, user_id: str, filename: str, folder: Optional[str] = None
    ) -> str:
        """Generate S3 key for file."""
        unique_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().strftime("%Y%m%d")

        if folder:
            return f"{org_id}/{folder}/{timestamp}_{unique_id}_{filename}"
        return f"{org_id}/uploads/{timestamp}_{unique_id}_{filename}"

    async def upload_file(
        self,
        file: UploadFile,
        org_id: str,
        user_id: str,
        folder: Optional[str] = None,
    ) -> Dict[str, str]:
        """Upload a file to S3."""
        key = self._generate_key(org_id, user_id, file.filename, folder)
        asset_id = str(uuid.uuid4())

        # Read file content
        content = await file.read()

        # Upload to S3 using centralized client
        await self.s3_client.upload_file(
            key=key,
            data=content,
            content_type=file.content_type or "application/octet-stream",
            bucket=self.bucket,
            metadata={
                "asset_id": asset_id,
                "user_id": user_id,
                "org_id": org_id,
                "original_filename": file.filename,
            },
        )

        url = self.s3_client.get_public_url(key, bucket=self.bucket)

        return {
            "asset_id": asset_id,
            "url": url,
            "key": key,
        }

    async def delete_folder(self, enterprise_id: str) -> bool:
        """Delete all files in an enterprise's folder."""
        prefix = f"{enterprise_id}/"
        deleted_count = await self.s3_client.delete_prefix(prefix, bucket=self.bucket)
        return deleted_count > 0

    async def get_presigned_url(
        self, asset_id: str, org_id: str, expires_in: int = 3600
    ) -> Optional[Dict[str, Any]]:
        """Get a presigned URL for an asset."""
        # In a real implementation, you'd look up the key by asset_id
        # For now, we'll assume asset_id is the key
        key = asset_id

        try:
            url = await self.s3_client.generate_presigned_url(
                key=key,
                bucket=self.bucket,
                expires_in=expires_in,
                method="get_object",
            )
            return {
                "url": url,
                "expires_in": expires_in,
            }
        except Exception:
            return None

    async def delete_asset(self, asset_id: str, org_id: str) -> bool:
        """Delete an asset from S3."""
        key = asset_id

        try:
            await self.s3_client.delete_file(key, bucket=self.bucket)
            return True
        except Exception:
            return False

    async def get_upload_presigned_url(
        self,
        filename: str,
        content_type: str,
        org_id: str,
        user_id: str,
        folder: Optional[str] = None,
        expires_in: int = 3600,
    ) -> Dict[str, Any]:
        """Get a presigned URL for direct upload to S3."""
        key = self._generate_key(org_id, user_id, filename, folder)
        asset_id = str(uuid.uuid4())

        url = await self.s3_client.generate_presigned_url(
            key=key,
            bucket=self.bucket,
            expires_in=expires_in,
            method="put_object",
            content_type=content_type,
        )

        return {
            "url": url,
            "key": key,
            "asset_id": asset_id,
            "expires_in": expires_in,
        }
