"""
AWS S3 storage implementation.
"""

from typing import Tuple
from fastapi import UploadFile
import aioboto3
from botocore.exceptions import ClientError

from app.utils.file_storage import FileStorageStrategy


class S3FileStorage(FileStorageStrategy):
    """AWS S3 storage implementation."""

    def __init__(
        self,
        bucket_name: str,
        region: str = "us-east-1",
        aws_access_key_id: str = None,
        aws_secret_access_key: str = None,
        base_url: str = None,
    ):
        """
        Initialize S3 file storage.

        Args:
            bucket_name: S3 bucket name
            region: AWS region
            aws_access_key_id: AWS access key ID (optional if using IAM roles)
            aws_secret_access_key: AWS secret access key (optional if using IAM roles)
            base_url: Custom base URL for accessing files (optional)
        """
        super().__init__()
        self.bucket_name = bucket_name
        self.region = region
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.base_url = (
            base_url or f"https://{bucket_name}.s3.{region}.amazonaws.com"
        )

        # Create session
        self.session = aioboto3.Session(
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=region,
        )

        self.logger.info(f"S3 file storage initialized for bucket: {bucket_name}")

    async def save_file(
        self, file: UploadFile, folder: str, filename: str = None
    ) -> Tuple[str, str]:
        """
        Save a file to S3.

        Args:
            file: The uploaded file
            folder: The S3 prefix/folder to store the file in
            filename: Optional custom filename

        Returns:
            Tuple of (file_path, storage_type)
        """
        try:
            # Generate unique filename if not provided
            if not filename:
                filename = self._generate_unique_filename(file.filename)

            # S3 key (path)
            s3_key = f"{folder}/{filename}"

            # Get MIME type
            content_type = self._get_mime_type(file.filename)

            # Read file content
            content = await file.read()

            # Upload to S3
            async with self.session.client("s3") as s3_client:
                await s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=content,
                    ContentType=content_type,
                )

            self.logger.info(f"File saved to S3: {s3_key}")
            return (s3_key, "s3")

        except ClientError as e:
            self.logger.error(f"Error saving file to S3: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error saving file to S3: {str(e)}")
            raise

    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from S3.

        Args:
            file_path: The S3 key to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            async with self.session.client("s3") as s3_client:
                await s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)

            self.logger.info(f"File deleted from S3: {file_path}")
            return True

        except ClientError as e:
            self.logger.error(f"Error deleting file from S3: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(f"Unexpected error deleting file from S3: {str(e)}")
            return False

    async def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists in S3.

        Args:
            file_path: The S3 key to check

        Returns:
            True if file exists, False otherwise
        """
        try:
            async with self.session.client("s3") as s3_client:
                await s3_client.head_object(Bucket=self.bucket_name, Key=file_path)
            return True

        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            self.logger.error(f"Error checking file existence in S3: {str(e)}")
            return False
        except Exception as e:
            self.logger.error(
                f"Unexpected error checking file existence in S3: {str(e)}"
            )
            return False

    def get_file_url(self, file_path: str) -> str:
        """
        Get the URL to access a file.

        Args:
            file_path: The S3 key

        Returns:
            URL to access the file
        """
        # Normalize path separators for URLs
        normalized_path = file_path.replace("\\", "/")
        return f"{self.base_url}/{normalized_path}"

    async def get_presigned_url(
        self, file_path: str, expiration: int = 3600
    ) -> str:
        """
        Generate a presigned URL for temporary access to a file.

        Args:
            file_path: The S3 key
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL
        """
        try:
            async with self.session.client("s3") as s3_client:
                url = await s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": file_path},
                    ExpiresIn=expiration,
                )
            return url

        except ClientError as e:
            self.logger.error(f"Error generating presigned URL: {str(e)}")
            raise
