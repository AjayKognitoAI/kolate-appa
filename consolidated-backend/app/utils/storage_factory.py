"""
File storage factory for creating storage strategy instances.
"""

from app.config.settings import settings
from app.utils.file_storage import FileStorageStrategy
from app.utils.local_file_storage import LocalFileStorage
from app.utils.s3_file_storage import S3FileStorage
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageFactory:
    """Factory for creating file storage instances based on configuration."""

    _instance = None

    @classmethod
    def get_storage(cls) -> FileStorageStrategy:
        """
        Get the configured storage strategy instance (singleton).

        Returns:
            FileStorageStrategy instance

        Raises:
            ValueError: If storage type is invalid or S3 is not properly configured
        """
        if cls._instance is None:
            storage_type = settings.FILE_STORAGE_TYPE.lower()

            if storage_type == "local":
                logger.info("Initializing local file storage")
                cls._instance = LocalFileStorage(
                    base_path=settings.LOCAL_UPLOAD_PATH,
                    base_url=settings.MEDIA_BASE_URL,
                    api_base_url=settings.API_BASE_URL,
                )

            elif storage_type == "s3":
                logger.info("Initializing S3 file storage")

                # Validate S3 configuration
                if not settings.AWS_S3_BUCKET_NAME:
                    raise ValueError(
                        "AWS_S3_BUCKET_NAME must be set when using S3 storage"
                    )

                cls._instance = S3FileStorage(
                    bucket_name=settings.AWS_S3_BUCKET_NAME,
                    region=settings.AWS_S3_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    base_url=settings.AWS_S3_BASE_URL,
                )

            else:
                raise ValueError(
                    f"Invalid FILE_STORAGE_TYPE: {storage_type}. "
                    f"Must be 'local' or 's3'"
                )

        return cls._instance

    @classmethod
    def reset(cls):
        """Reset the storage instance (useful for testing)."""
        cls._instance = None


# Convenience function to get storage instance
def get_file_storage() -> FileStorageStrategy:
    """
    Get the configured file storage instance.

    Returns:
        FileStorageStrategy instance
    """
    return StorageFactory.get_storage()
