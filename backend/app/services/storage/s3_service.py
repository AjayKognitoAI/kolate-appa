"""
S3 Storage Service

Service for managing file uploads to AWS S3.
Uses the centralized S3 client from app.core.s3_client.
"""

from typing import Optional, Dict, Any
from fastapi import UploadFile

from app.core.s3_client import S3Client, get_s3_client


class S3StorageService:
    """
    AWS S3 storage service.

    Provides a simplified interface for S3 operations using the
    centralized S3 client. For most use cases, you can use this
    service directly or use the centralized S3 client from
    app.core.s3_client.
    """

    def __init__(self, s3_client: Optional[S3Client] = None):
        """
        Initialize S3 storage service.

        Args:
            s3_client: Optional S3 client instance (uses global singleton if not provided)
        """
        self._s3_client = s3_client

    @property
    def s3_client(self) -> S3Client:
        """Get S3 client (lazy-loaded singleton if not provided)."""
        if self._s3_client is None:
            self._s3_client = get_s3_client()
        return self._s3_client

    async def upload_file(
        self,
        file: UploadFile,
        folder: str,
        filename: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Upload a file to S3.

        Args:
            file: FastAPI UploadFile object
            folder: S3 folder/prefix
            filename: Optional custom filename (uses original if not provided)

        Returns:
            Dict with 'key' and 'url'
        """
        actual_filename = filename or file.filename
        key = f"{folder}/{actual_filename}"
        content = await file.read()

        await self.s3_client.upload_file(
            key=key,
            data=content,
            content_type=file.content_type or "application/octet-stream",
        )

        return {
            "key": key,
            "url": self.s3_client.get_public_url(key),
        }

    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from S3.

        Args:
            file_path: S3 key to delete

        Returns:
            True if successful
        """
        return await self.s3_client.delete_file(file_path)

    async def delete_folder(self, folder_path: str) -> int:
        """
        Delete all files in a folder/prefix.

        Args:
            folder_path: S3 prefix to delete

        Returns:
            Number of files deleted
        """
        return await self.s3_client.delete_prefix(folder_path)

    async def get_presigned_url(
        self,
        file_path: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Get a presigned URL for file download.

        Args:
            file_path: S3 key
            expires_in: URL expiration in seconds

        Returns:
            Presigned URL string
        """
        return await self.s3_client.generate_presigned_url(
            key=file_path,
            expires_in=expires_in,
        )

    async def get_upload_presigned_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Get a presigned URL for direct upload.

        Args:
            key: S3 key for the upload
            content_type: Content type of the file
            expires_in: URL expiration in seconds

        Returns:
            Presigned URL string
        """
        return await self.s3_client.generate_presigned_url(
            key=key,
            expires_in=expires_in,
            method="put_object",
            content_type=content_type,
        )

    async def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists.

        Args:
            file_path: S3 key to check

        Returns:
            True if file exists
        """
        return await self.s3_client.file_exists(file_path)

    async def get_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Get file metadata.

        Args:
            file_path: S3 key

        Returns:
            Dict with size, content_type, last_modified, etag
        """
        return await self.s3_client.get_file_metadata(file_path)


# Factory function for dependency injection
def get_s3_storage_service() -> S3StorageService:
    """Get S3 storage service instance."""
    return S3StorageService()
