"""
File operation tools for accessing S3 and local files.
"""
import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
import boto3
from botocore.exceptions import ClientError
import pandas as pd
from datetime import datetime

from ..config import get_config

config = get_config()


def list_available_files(
    trial_name: Optional[str] = None,
    file_pattern: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    List all available CSV/Excel files from S3 and local uploads.

    Args:
        trial_name: Filter by trial name (for S3 files)
        file_pattern: Filter by filename pattern (e.g., "*.csv")

    Returns:
        List of file metadata dictionaries with:
        - file_path: Full path (S3 key or local path)
        - file_name: Filename only
        - file_size: Size in bytes
        - file_type: Extension (csv, xlsx, etc.)
        - source: "s3" or "local"
        - trial_name: Trial name (for S3 files)
        - last_modified: Last modified timestamp
    """
    files = []

    # List S3 files
    if config.s3_bucket:
        try:
            s3_files = _list_s3_files(trial_name, file_pattern)
            files.extend(s3_files)
        except Exception as e:
            print(f"Warning: Could not list S3 files: {e}")

    # List local files
    try:
        local_files = _list_local_files(file_pattern)
        files.extend(local_files)
    except Exception as e:
        print(f"Warning: Could not list local files: {e}")

    return files


def _list_s3_files(
    trial_name: Optional[str] = None,
    file_pattern: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List files from S3 bucket."""
    s3_client = boto3.client('s3')
    files = []

    prefix = config.s3_base_path
    if trial_name:
        prefix = f"{config.s3_base_path}{trial_name}/"

    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=config.s3_bucket, Prefix=prefix)

        for page in pages:
            for obj in page.get('Contents', []):
                key = obj['Key']
                file_name = Path(key).name

                # Filter by pattern
                if file_pattern and not _matches_pattern(file_name, file_pattern):
                    continue

                # Only include CSV/Excel files
                if not any(file_name.lower().endswith(ext) for ext in ['.csv', '.xlsx', '.xls']):
                    continue

                # Extract trial name from path
                parts = key.replace(config.s3_base_path, '').split('/')
                trial = parts[0] if len(parts) > 1 else None

                files.append({
                    'file_path': f"s3://{config.s3_bucket}/{key}",
                    'file_name': file_name,
                    'file_size': obj['Size'],
                    'file_type': Path(file_name).suffix.lstrip('.'),
                    'source': 's3',
                    'trial_name': trial,
                    'last_modified': obj['LastModified'].isoformat(),
                    's3_key': key,
                })
    except ClientError as e:
        print(f"S3 error: {e}")

    return files


def _list_local_files(file_pattern: Optional[str] = None) -> List[Dict[str, Any]]:
    """List files from local uploads directory."""
    files = []
    upload_dir = Path("./data/uploads")

    if not upload_dir.exists():
        return files

    for file_path in upload_dir.glob("**/*"):
        if not file_path.is_file():
            continue

        file_name = file_path.name

        # Filter by pattern
        if file_pattern and not _matches_pattern(file_name, file_pattern):
            continue

        # Only include CSV/Excel files
        if not any(file_name.lower().endswith(ext) for ext in ['.csv', '.xlsx', '.xls']):
            continue

        files.append({
            'file_path': str(file_path.absolute()),
            'file_name': file_name,
            'file_size': file_path.stat().st_size,
            'file_type': file_path.suffix.lstrip('.'),
            'source': 'local',
            'trial_name': None,
            'last_modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
        })

    return files


def _matches_pattern(filename: str, pattern: str) -> bool:
    """Simple pattern matching (* wildcard)."""
    import fnmatch
    return fnmatch.fnmatch(filename.lower(), pattern.lower())


def get_file_metadata(file_path: str) -> Dict[str, Any]:
    """
    Get detailed metadata about a file.

    Args:
        file_path: S3 URI (s3://bucket/key) or local path

    Returns:
        Metadata dictionary with:
        - file_name: Filename
        - file_size: Size in MB
        - file_type: Extension
        - num_rows: Number of rows (for CSV/Excel)
        - num_columns: Number of columns
        - column_names: List of column names
        - column_types: Dictionary of column name -> data type
        - sample_data: First 5 rows as JSON
        - memory_estimate_mb: Estimated memory usage
    """
    # Download file if from S3
    if file_path.startswith("s3://"):
        local_path = download_file_from_s3(file_path)
    else:
        local_path = file_path

    # Load file to get structure
    try:
        if local_path.lower().endswith('.csv'):
            df = pd.read_csv(local_path, nrows=5)
            total_rows = sum(1 for _ in open(local_path)) - 1  # -1 for header
        elif local_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(local_path, nrows=5)
            full_df = pd.read_excel(local_path)
            total_rows = len(full_df)
        else:
            raise ValueError(f"Unsupported file type: {local_path}")

        # Get column info
        column_types = {}
        for col in df.columns:
            dtype = str(df[col].dtype)
            if dtype.startswith('int'):
                column_types[col] = 'integer'
            elif dtype.startswith('float'):
                column_types[col] = 'float'
            elif dtype == 'object':
                column_types[col] = 'string'
            elif dtype == 'bool':
                column_types[col] = 'boolean'
            elif 'datetime' in dtype:
                column_types[col] = 'datetime'
            else:
                column_types[col] = dtype

        # Estimate memory
        file_size_mb = Path(local_path).stat().st_size / (1024 * 1024)
        memory_estimate_mb = file_size_mb * 2  # Rough estimate: 2x file size

        metadata = {
            'file_name': Path(local_path).name,
            'file_size_mb': round(file_size_mb, 2),
            'file_type': Path(local_path).suffix.lstrip('.'),
            'num_rows': total_rows,
            'num_columns': len(df.columns),
            'column_names': list(df.columns),
            'column_types': column_types,
            'sample_data': df.head(5).to_dict(orient='records'),
            'memory_estimate_mb': round(memory_estimate_mb, 2),
            'local_path': local_path,
        }

        return metadata

    except Exception as e:
        return {
            'error': str(e),
            'file_name': Path(file_path).name,
        }


def download_file_from_s3(s3_uri: str) -> str:
    """
    Download file from S3 to local cache.

    Args:
        s3_uri: S3 URI in format s3://bucket/key

    Returns:
        Local file path
    """
    # Parse S3 URI
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"Invalid S3 URI: {s3_uri}")

    parts = s3_uri.replace("s3://", "").split("/", 1)
    bucket = parts[0]
    key = parts[1]

    # Create cache directory
    config.local_cache_dir.mkdir(parents=True, exist_ok=True)

    # Local cache path (preserve directory structure)
    local_path = config.local_cache_dir / key.replace("/", "_")

    # Download if not cached or outdated
    if not local_path.exists():
        s3_client = boto3.client('s3')
        try:
            print(f"Downloading {s3_uri} to {local_path}...")
            s3_client.download_file(bucket, key, str(local_path))
            print(f"Downloaded successfully")
        except ClientError as e:
            raise RuntimeError(f"Failed to download {s3_uri}: {e}")
    else:
        print(f"Using cached file: {local_path}")

    return str(local_path)


def get_file_sample(file_path: str, num_rows: int = 100) -> Dict[str, Any]:
    """
    Get a sample of data from a file.

    Args:
        file_path: S3 URI or local path
        num_rows: Number of rows to sample

    Returns:
        Dictionary with:
        - sample_data: List of row dictionaries
        - num_rows_sampled: Actual number of rows sampled
    """
    # Download if S3
    if file_path.startswith("s3://"):
        local_path = download_file_from_s3(file_path)
    else:
        local_path = file_path

    try:
        if local_path.lower().endswith('.csv'):
            df = pd.read_csv(local_path, nrows=num_rows)
        elif local_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(local_path, nrows=num_rows)
        else:
            raise ValueError(f"Unsupported file type: {local_path}")

        return {
            'sample_data': df.to_dict(orient='records'),
            'num_rows_sampled': len(df),
        }
    except Exception as e:
        return {
            'error': str(e),
        }
