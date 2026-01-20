"""
Centralized AWS S3 Client

Provides a single, reusable async S3 client for all backend services.
Supports file upload, download, delete, presigned URLs, and metadata operations.
"""

from typing import Optional, Dict, Any, List
from functools import lru_cache
import aioboto3
from botocore.exceptions import ClientError

from app.config.settings import settings
from app.core.logging import get_class_logger


class S3Client:
    """
    Centralized async S3 client for all S3 operations.

    This client should be used by all services that need S3 access.
    It provides a consistent interface and configuration management.

    Features:
    - Async file upload/download operations
    - Presigned URL generation (GET and PUT)
    - File existence checking
    - File metadata retrieval
    - Folder operations (list, delete)
    """

    _instance: Optional["S3Client"] = None

    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
    ):
        """
        Initialize S3 client.

        Args:
            bucket: S3 bucket name (defaults to settings.AWS_S3_BUCKET_NAME)
            region: AWS region (defaults to settings.AWS_S3_REGION)
            access_key_id: AWS access key (defaults to settings.AWS_ACCESS_KEY_ID)
            secret_access_key: AWS secret key (defaults to settings.AWS_SECRET_ACCESS_KEY)
        """
        self.logger = get_class_logger(self.__class__)
        self.bucket = bucket or settings.AWS_S3_BUCKET_NAME
        self.region = region or settings.AWS_S3_REGION
        self._access_key_id = access_key_id or settings.AWS_ACCESS_KEY_ID
        self._secret_access_key = secret_access_key or settings.AWS_SECRET_ACCESS_KEY

        self._session: Optional[aioboto3.Session] = None
        self.logger.info(f"S3Client initialized for bucket: {self.bucket}")

    @property
    def session(self) -> aioboto3.Session:
        """Lazy-load aioboto3 session."""
        if self._session is None:
            self._session = aioboto3.Session(
                aws_access_key_id=self._access_key_id,
                aws_secret_access_key=self._secret_access_key,
                region_name=self.region,
            )
        return self._session

    def get_client_context(self):
        """
        Get S3 client context manager.

        Usage:
            async with s3_client.get_client_context() as s3:
                await s3.put_object(...)
        """
        return self.session.client("s3")

    async def upload_file(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        bucket: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> bool:
        """
        Upload file to S3.

        Args:
            key: S3 key (path)
            data: File content as bytes
            content_type: MIME type of the file
            bucket: Optional bucket override
            metadata: Optional metadata dict

        Returns:
            True if upload successful

        Raises:
            ClientError: If S3 operation fails
        """
        target_bucket = bucket or self.bucket
        try:
            async with self.get_client_context() as s3:
                params = {
                    "Bucket": target_bucket,
                    "Key": key,
                    "Body": data,
                    "ContentType": content_type,
                }
                if metadata:
                    params["Metadata"] = metadata

                await s3.put_object(**params)

            self.logger.info(f"Uploaded file to s3://{target_bucket}/{key}")
            return True
        except ClientError as e:
            self.logger.error(f"S3 upload failed for {key}: {e}")
            raise

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
        try:
            async with self.get_client_context() as s3:
                response = await s3.get_object(Bucket=target_bucket, Key=key)
                content = await response["Body"].read()
            self.logger.info(f"Downloaded file from s3://{target_bucket}/{key}")
            return content
        except ClientError as e:
            self.logger.error(f"S3 download failed for {key}: {e}")
            raise

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
        try:
            async with self.get_client_context() as s3:
                await s3.delete_object(Bucket=target_bucket, Key=key)
            self.logger.info(f"Deleted file from s3://{target_bucket}/{key}")
            return True
        except ClientError as e:
            self.logger.error(f"S3 delete failed for {key}: {e}")
            raise

    async def delete_files(
        self,
        keys: List[str],
        bucket: Optional[str] = None,
    ) -> bool:
        """
        Delete multiple files from S3.

        Args:
            keys: List of S3 keys to delete
            bucket: Optional bucket override

        Returns:
            True if deletion successful
        """
        if not keys:
            return True

        target_bucket = bucket or self.bucket
        try:
            async with self.get_client_context() as s3:
                objects = [{"Key": k} for k in keys]
                await s3.delete_objects(
                    Bucket=target_bucket,
                    Delete={"Objects": objects},
                )
            self.logger.info(f"Deleted {len(keys)} files from s3://{target_bucket}")
            return True
        except ClientError as e:
            self.logger.error(f"S3 batch delete failed: {e}")
            raise

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
        try:
            async with self.get_client_context() as s3:
                await s3.head_object(Bucket=target_bucket, Key=key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            self.logger.error(f"S3 head_object failed for {key}: {e}")
            return False

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
            Dictionary with file metadata (size, content_type, last_modified, etag)

        Raises:
            ClientError: If S3 operation fails
        """
        target_bucket = bucket or self.bucket
        try:
            async with self.get_client_context() as s3:
                response = await s3.head_object(Bucket=target_bucket, Key=key)
            return {
                "size": response.get("ContentLength"),
                "content_type": response.get("ContentType"),
                "last_modified": response.get("LastModified"),
                "etag": response.get("ETag"),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError as e:
            self.logger.error(f"S3 head_object failed for {key}: {e}")
            raise

    async def generate_presigned_url(
        self,
        key: str,
        bucket: Optional[str] = None,
        expires_in: int = 3600,
        method: str = "get_object",
        content_type: Optional[str] = None,
    ) -> str:
        """
        Generate presigned URL for file access or upload.

        Args:
            key: S3 key (path)
            bucket: Optional bucket override
            expires_in: URL expiration in seconds (default: 1 hour)
            method: S3 method - "get_object" for download, "put_object" for upload
            content_type: Content type (required for put_object)

        Returns:
            Presigned URL string

        Raises:
            ClientError: If URL generation fails
        """
        target_bucket = bucket or self.bucket
        try:
            async with self.get_client_context() as s3:
                params = {"Bucket": target_bucket, "Key": key}
                if method == "put_object" and content_type:
                    params["ContentType"] = content_type

                url = await s3.generate_presigned_url(
                    method,
                    Params=params,
                    ExpiresIn=expires_in,
                )
            return url
        except ClientError as e:
            self.logger.error(f"Presigned URL generation failed for {key}: {e}")
            raise

    async def list_objects(
        self,
        prefix: str,
        bucket: Optional[str] = None,
        max_keys: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        List objects in S3 with a given prefix.

        Args:
            prefix: S3 key prefix
            bucket: Optional bucket override
            max_keys: Maximum number of keys to return

        Returns:
            List of object metadata dicts
        """
        target_bucket = bucket or self.bucket
        try:
            async with self.get_client_context() as s3:
                response = await s3.list_objects_v2(
                    Bucket=target_bucket,
                    Prefix=prefix,
                    MaxKeys=max_keys,
                )

            contents = response.get("Contents", [])
            return [
                {
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"],
                    "etag": obj["ETag"],
                }
                for obj in contents
            ]
        except ClientError as e:
            self.logger.error(f"S3 list_objects failed for prefix {prefix}: {e}")
            raise

    async def delete_prefix(
        self,
        prefix: str,
        bucket: Optional[str] = None,
    ) -> int:
        """
        Delete all objects with a given prefix (folder deletion).

        Args:
            prefix: S3 key prefix
            bucket: Optional bucket override

        Returns:
            Number of objects deleted
        """
        target_bucket = bucket or self.bucket
        try:
            objects = await self.list_objects(prefix, bucket=target_bucket)
            if not objects:
                return 0

            keys = [obj["key"] for obj in objects]
            await self.delete_files(keys, bucket=target_bucket)
            self.logger.info(
                f"Deleted {len(keys)} objects with prefix {prefix} from s3://{target_bucket}"
            )
            return len(keys)
        except ClientError as e:
            self.logger.error(f"S3 delete_prefix failed for {prefix}: {e}")
            raise

    def get_public_url(self, key: str, bucket: Optional[str] = None) -> str:
        """
        Get public URL for a file (assumes bucket has public access).

        Args:
            key: S3 key (path)
            bucket: Optional bucket override

        Returns:
            Public URL string
        """
        target_bucket = bucket or self.bucket
        base_url = settings.AWS_S3_BASE_URL
        if base_url:
            return f"{base_url.rstrip('/')}/{key}"
        return f"https://{target_bucket}.s3.{self.region}.amazonaws.com/{key}"


# Global singleton instance
_s3_client: Optional[S3Client] = None


def get_s3_client() -> S3Client:
    """
    Get the global S3 client singleton.

    Returns:
        S3Client instance
    """
    global _s3_client
    if _s3_client is None:
        _s3_client = S3Client()
    return _s3_client


def get_s3_client_for_bucket(
    bucket: str,
    region: Optional[str] = None,
) -> S3Client:
    """
    Get an S3 client for a specific bucket.

    Use this when you need to work with a different bucket
    than the default configured one.

    Args:
        bucket: S3 bucket name
        region: Optional AWS region

    Returns:
        S3Client instance for the specified bucket
    """
    return S3Client(bucket=bucket, region=region)
