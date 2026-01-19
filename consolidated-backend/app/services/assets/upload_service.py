"""
Upload Service

S3 file management operations.
"""

from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import aioboto3
from fastapi import UploadFile

from app.config.settings import settings


class UploadService:
    """S3 file upload and management service."""

    def __init__(self):
        self.bucket = getattr(settings, 'S3_BUCKET_NAME', 'kolate-assets')
        self.region = getattr(settings, 'AWS_REGION', 'us-east-1')

    def _get_session(self):
        """Get aioboto3 session."""
        return aioboto3.Session()

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
        folder: Optional[str] = None
    ) -> Dict[str, str]:
        """Upload a file to S3."""
        key = self._generate_key(org_id, user_id, file.filename, folder)
        asset_id = str(uuid.uuid4())

        session = self._get_session()
        async with session.client(
            's3',
            region_name=self.region,
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        ) as s3:
            # Read file content
            content = await file.read()

            # Upload to S3
            await s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
                ContentType=file.content_type or 'application/octet-stream',
                Metadata={
                    'asset_id': asset_id,
                    'user_id': user_id,
                    'org_id': org_id,
                    'original_filename': file.filename,
                }
            )

            url = f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

            return {
                "asset_id": asset_id,
                "url": url,
                "key": key,
            }

    async def delete_folder(self, enterprise_id: str) -> bool:
        """Delete all files in an enterprise's folder."""
        session = self._get_session()
        async with session.client(
            's3',
            region_name=self.region,
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        ) as s3:
            # List all objects with the prefix
            prefix = f"{enterprise_id}/"
            response = await s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix
            )

            if 'Contents' not in response:
                return False

            # Delete all objects
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            if objects_to_delete:
                await s3.delete_objects(
                    Bucket=self.bucket,
                    Delete={'Objects': objects_to_delete}
                )

            return True

    async def get_presigned_url(
        self, asset_id: str, org_id: str, expires_in: int = 3600
    ) -> Optional[Dict[str, Any]]:
        """Get a presigned URL for an asset."""
        # In a real implementation, you'd look up the key by asset_id
        # For now, we'll assume asset_id is the key
        key = asset_id

        session = self._get_session()
        async with session.client(
            's3',
            region_name=self.region,
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        ) as s3:
            try:
                url = await s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket, 'Key': key},
                    ExpiresIn=expires_in
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

        session = self._get_session()
        async with session.client(
            's3',
            region_name=self.region,
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        ) as s3:
            try:
                await s3.delete_object(Bucket=self.bucket, Key=key)
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
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """Get a presigned URL for direct upload to S3."""
        key = self._generate_key(org_id, user_id, filename, folder)
        asset_id = str(uuid.uuid4())

        session = self._get_session()
        async with session.client(
            's3',
            region_name=self.region,
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        ) as s3:
            url = await s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'ContentType': content_type,
                },
                ExpiresIn=expires_in
            )

            return {
                "url": url,
                "key": key,
                "asset_id": asset_id,
                "expires_in": expires_in,
            }
