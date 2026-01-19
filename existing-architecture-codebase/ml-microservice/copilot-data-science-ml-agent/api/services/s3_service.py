"""S3 Service for interacting with AWS S3 buckets."""

import os
import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
import boto3
from botocore.exceptions import ClientError


@dataclass
class S3FileInfo:
    """Information about an S3 file."""
    key: str  # Full S3 key (path)
    file_name: str  # Just the filename
    trial_name: str  # Extracted trial name
    size: int  # File size in bytes
    last_modified: datetime  # S3 LastModified timestamp
    etag: str  # S3 ETag (useful for change detection)


class S3Service:
    """Service for interacting with AWS S3 buckets."""

    def __init__(
        self,
        bucket_name: str,
        base_path: str = "",
        aws_access_key: Optional[str] = None,
        aws_secret_key: Optional[str] = None,
        aws_region: str = "us-east-1",
        endpoint_url: Optional[str] = None,
    ):
        """
        Initialize S3 Service.

        Args:
            bucket_name: S3 bucket name
            base_path: Base path within the bucket (e.g., "clinical-trials/")
            aws_access_key: AWS access key ID (optional if using IAM role)
            aws_secret_key: AWS secret access key (optional if using IAM role)
            aws_region: AWS region
            endpoint_url: Custom endpoint URL (for LocalStack/MinIO testing)
        """
        self.bucket_name = bucket_name
        self.base_path = base_path.strip("/")
        if self.base_path:
            self.base_path += "/"

        # Build boto3 client config
        client_kwargs = {
            "service_name": "s3",
            "region_name": aws_region,
        }

        if aws_access_key and aws_secret_key:
            client_kwargs["aws_access_key_id"] = aws_access_key
            client_kwargs["aws_secret_access_key"] = aws_secret_key

        if endpoint_url:
            client_kwargs["endpoint_url"] = endpoint_url

        self.client = boto3.client(**client_kwargs)

    def list_trials(self) -> List[str]:
        """
        List all trial folders in the base path.

        Returns:
            List of trial names (folder names)
        """
        trials = []
        try:
            # Use CommonPrefixes with delimiter to get "folders"
            paginator = self.client.get_paginator("list_objects_v2")
            page_iterator = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=self.base_path,
                Delimiter="/"
            )

            for page in page_iterator:
                # CommonPrefixes contains the "folders"
                for prefix in page.get("CommonPrefixes", []):
                    # Extract trial name from prefix
                    full_prefix = prefix["Prefix"]
                    # Remove base_path and trailing slash
                    trial_name = full_prefix[len(self.base_path):].rstrip("/")
                    if trial_name:
                        trials.append(trial_name)

        except ClientError as e:
            print(f"[S3Service] Error listing trials: {e}")
            raise

        return sorted(trials)

    def list_csv_files(self, trial_name: str) -> List[S3FileInfo]:
        """
        List all CSV files in a trial folder (recursive).

        Args:
            trial_name: Name of the trial folder

        Returns:
            List of S3FileInfo objects for CSV files
        """
        files = []
        prefix = f"{self.base_path}{trial_name}/"

        try:
            paginator = self.client.get_paginator("list_objects_v2")
            page_iterator = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            for page in page_iterator:
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    # Only include CSV files
                    if key.lower().endswith(".csv"):
                        file_name = os.path.basename(key)
                        files.append(S3FileInfo(
                            key=key,
                            file_name=file_name,
                            trial_name=trial_name,
                            size=obj["Size"],
                            last_modified=obj["LastModified"],
                            etag=obj["ETag"].strip('"'),  # Remove quotes from ETag
                        ))

        except ClientError as e:
            print(f"[S3Service] Error listing files for trial '{trial_name}': {e}")
            raise

        return files

    def download_file(self, s3_key: str, local_dir: str) -> str:
        """
        Download a file from S3 to a local directory.

        Args:
            s3_key: Full S3 key (path) of the file
            local_dir: Local directory to download to

        Returns:
            Local file path where the file was downloaded
        """
        # Ensure local directory exists
        os.makedirs(local_dir, exist_ok=True)

        # Create local file path
        file_name = os.path.basename(s3_key)
        local_path = os.path.join(local_dir, file_name)

        try:
            self.client.download_file(
                Bucket=self.bucket_name,
                Key=s3_key,
                Filename=local_path
            )
            return local_path

        except ClientError as e:
            print(f"[S3Service] Error downloading file '{s3_key}': {e}")
            raise

    def compute_content_hash(self, local_file_path: str) -> str:
        """
        Compute SHA256 hash of a local file.

        Args:
            local_file_path: Path to the local file

        Returns:
            SHA256 hash as hex string
        """
        sha256_hash = hashlib.sha256()
        with open(local_file_path, "rb") as f:
            # Read in chunks to handle large files
            for chunk in iter(lambda: f.read(8192), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

    def get_file_info(self, s3_key: str) -> Optional[S3FileInfo]:
        """
        Get information about a specific S3 file.

        Args:
            s3_key: Full S3 key (path) of the file

        Returns:
            S3FileInfo object or None if not found
        """
        try:
            response = self.client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )

            # Extract trial name from key
            key_without_base = s3_key[len(self.base_path):]
            trial_name = key_without_base.split("/")[0] if "/" in key_without_base else ""

            return S3FileInfo(
                key=s3_key,
                file_name=os.path.basename(s3_key),
                trial_name=trial_name,
                size=response["ContentLength"],
                last_modified=response["LastModified"],
                etag=response["ETag"].strip('"'),
            )

        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return None
            raise

    def file_exists(self, s3_key: str) -> bool:
        """
        Check if a file exists in S3.

        Args:
            s3_key: Full S3 key (path) of the file

        Returns:
            True if file exists, False otherwise
        """
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            raise

    def test_connection(self) -> bool:
        """
        Test the S3 connection by listing bucket contents.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError:
            return False
