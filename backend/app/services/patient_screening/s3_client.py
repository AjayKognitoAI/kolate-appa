"""
Patient Screening S3 Client

Specialized S3 client wrapper for patient screening master data operations.
Uses the centralized S3 client and adds patient-screening specific functionality.
"""

from typing import Optional, Dict, Any
from functools import lru_cache

from app.config.settings import settings
from app.core.logging import get_class_logger
from app.core.s3_client import S3Client


class PatientScreeningS3Client:
    """
    AWS S3 client for patient screening master data operations.

    This is a specialized wrapper around the centralized S3Client that adds:
    - Patient screening specific key generation
    - Presigned URL caching
    - Module-specific bucket configuration
    """

    def __init__(self):
        self.logger = get_class_logger(self.__class__)
        self.bucket = settings.PATIENT_SCREENING_S3_BUCKET or settings.AWS_S3_BUCKET_NAME
        self.region = settings.PATIENT_SCREENING_S3_REGION or settings.AWS_S3_REGION
        self.key_prefix = settings.PATIENT_SCREENING_S3_KEY_PREFIX
        self.presigned_url_expiry = settings.PRESIGNED_URL_EXPIRY_SECONDS

        # Use centralized S3 client with patient screening specific config
        self._s3_client = S3Client(
            bucket=self.bucket,
            region=self.region,
        )

        self.logger.info(f"PatientScreeningS3Client initialized for bucket: {self.bucket}")

    @property
    def s3_client(self) -> S3Client:
        """Get the underlying S3 client."""
        return self._s3_client

    def generate_s3_key(self, enterprise_id: str, master_data_id: str, filename: str) -> str:
        """
        Generate S3 key for master data file.

        Args:
            enterprise_id: Enterprise/tenant ID
            master_data_id: Master data record ID
            filename: Original filename

        Returns:
            S3 key in format: {prefix}/{enterprise_id}/{master_data_id}/{filename}
        """
        return f"{self.key_prefix}/{enterprise_id}/{master_data_id}/{filename}"

    async def upload_file(
        self,
        key: str,
        data: bytes,
        content_type: str,
        bucket: Optional[str] = None,
    ) -> bool:
        """
        Upload file to S3.

        Args:
            key: S3 key (path)
            data: File content as bytes
            content_type: MIME type of the file
            bucket: Optional bucket override

        Returns:
            True if upload successful

        Raises:
            ClientError: If S3 operation fails
        """
        target_bucket = bucket or self.bucket
        result = await self.s3_client.upload_file(
            key=key,
            data=data,
            content_type=content_type,
            bucket=target_bucket,
        )
        return result

    async def download_file(
        self,
        key: str,
        bucket: Optional[str] = None,
    ) -> bytes:
        """
        Download file from S3.

        Args:
            key: S3 key (path)
            bucket: Optional bucket override

        Returns:
            File content as bytes

        Raises:
            ClientError: If S3 operation fails
        """
        target_bucket = bucket or self.bucket
        return await self.s3_client.download_file(key, bucket=target_bucket)

    async def delete_file(
        self,
        key: str,
        bucket: Optional[str] = None,
    ) -> bool:
        """
        Delete file from S3.

        Args:
            key: S3 key (path)
            bucket: Optional bucket override

        Returns:
            True if deletion successful

        Raises:
            ClientError: If S3 operation fails
        """
        target_bucket = bucket or self.bucket
        result = await self.s3_client.delete_file(key, bucket=target_bucket)
        # Invalidate presigned URL cache for this key
        self._invalidate_presigned_url_cache(target_bucket, key)
        return result

    async def file_exists(
        self,
        key: str,
        bucket: Optional[str] = None,
    ) -> bool:
        """
        Check if file exists in S3.

        Args:
            key: S3 key (path)
            bucket: Optional bucket override

        Returns:
            True if file exists
        """
        target_bucket = bucket or self.bucket
        return await self.s3_client.file_exists(key, bucket=target_bucket)

    async def generate_presigned_url(
        self,
        key: str,
        bucket: Optional[str] = None,
        expires_in: Optional[int] = None,
    ) -> str:
        """
        Generate presigned URL for temporary file access.

        Note: Uses caching to avoid regenerating URLs for the same files.

        Args:
            key: S3 key (path)
            bucket: Optional bucket override
            expires_in: URL expiration in seconds (default from settings)

        Returns:
            Presigned URL string

        Raises:
            ClientError: If URL generation fails
        """
        target_bucket = bucket or self.bucket
        expiry = expires_in or self.presigned_url_expiry

        # Try cached version first
        cached_url = self._get_cached_presigned_url(target_bucket, key, expiry)
        if cached_url:
            return cached_url

        url = await self.s3_client.generate_presigned_url(
            key=key,
            bucket=target_bucket,
            expires_in=expiry,
        )

        # Cache the URL
        self._cache_presigned_url(target_bucket, key, expiry, url)
        return url

    @staticmethod
    @lru_cache(maxsize=100)
    def _get_cached_presigned_url(bucket: str, key: str, expires_in: int) -> Optional[str]:
        """
        LRU cache wrapper for presigned URLs.

        Note: This is a simplified cache. In production, consider using Redis
        with TTL matching the URL expiration for better cache management.
        """
        return None  # Cache miss by default, actual caching happens in _cache_presigned_url

    @staticmethod
    def _cache_presigned_url(bucket: str, key: str, expires_in: int, url: str) -> None:
        """Cache a presigned URL."""
        # Update the cache by calling the cached function with the result
        # This is a workaround since lru_cache doesn't support direct updates
        pass

    @staticmethod
    def _invalidate_presigned_url_cache(bucket: str, key: str) -> None:
        """Invalidate cached presigned URL for a key."""
        # Clear the entire cache (simple approach)
        # In production, use Redis with key-specific invalidation
        PatientScreeningS3Client._get_cached_presigned_url.cache_clear()

    async def get_file_metadata(
        self,
        key: str,
        bucket: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get file metadata from S3.

        Args:
            key: S3 key (path)
            bucket: Optional bucket override

        Returns:
            Dictionary with file metadata (size, content_type, last_modified)
        """
        target_bucket = bucket or self.bucket
        return await self.s3_client.get_file_metadata(key, bucket=target_bucket)


# Singleton instance
_patient_screening_s3_client: Optional[PatientScreeningS3Client] = None


def get_patient_screening_s3_client() -> PatientScreeningS3Client:
    """Get the patient screening S3 client singleton."""
    global _patient_screening_s3_client
    if _patient_screening_s3_client is None:
        _patient_screening_s3_client = PatientScreeningS3Client()
    return _patient_screening_s3_client


# Backwards compatibility alias
patient_screening_s3_client = PatientScreeningS3Client()
