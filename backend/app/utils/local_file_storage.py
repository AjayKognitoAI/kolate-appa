"""
Local filesystem storage implementation.
"""

import os
from pathlib import Path
from typing import Tuple
import aiofiles
from fastapi import UploadFile

from app.utils.file_storage import FileStorageStrategy


class LocalFileStorage(FileStorageStrategy):
    """Local filesystem storage implementation."""

    def __init__(self, base_path: str = "uploads", base_url: str = None, api_base_url: str = None):
        """
        Initialize local file storage.

        Args:
            base_path: Base directory for storing files
            base_url: Media URL path (e.g., "/media")
            api_base_url: API base URL (e.g., "http://localhost:8000")
        """
        super().__init__()
        self.base_path = Path(base_path)
        self.base_url = base_url or "/media"
        self.api_base_url = api_base_url or ""

        # Create base directory if it doesn't exist
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.logger.info(f"Local file storage initialized at: {self.base_path}")

    async def save_file(
        self, file: UploadFile, folder: str, filename: str = None
    ) -> Tuple[str, str]:
        """
        Save a file to local filesystem.

        Args:
            file: The uploaded file
            folder: The subfolder to store the file in
            filename: Optional custom filename

        Returns:
            Tuple of (file_path, storage_type)
        """
        try:
            # Generate unique filename if not provided
            if not filename:
                filename = self._generate_unique_filename(file.filename)

            # Create folder path
            folder_path = self.base_path / folder
            folder_path.mkdir(parents=True, exist_ok=True)

            # Full file path
            file_path = folder_path / filename
            relative_path = f"{folder}/{filename}"

            # Save file asynchronously
            async with aiofiles.open(file_path, "wb") as f:
                content = await file.read()
                await f.write(content)

            self.logger.info(f"File saved to local storage: {relative_path}")
            return (relative_path, "local")

        except Exception as e:
            self.logger.error(f"Error saving file to local storage: {str(e)}")
            raise

    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from local filesystem.

        Args:
            file_path: The relative path to the file

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            full_path = self.base_path / file_path
            if full_path.exists():
                full_path.unlink()
                self.logger.info(f"File deleted from local storage: {file_path}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error deleting file from local storage: {str(e)}")
            return False

    async def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists in local filesystem.

        Args:
            file_path: The relative path to check

        Returns:
            True if file exists, False otherwise
        """
        full_path = self.base_path / file_path
        return full_path.exists()

    def get_file_url(self, file_path: str) -> str:
        """
        Get the URL to access a file.

        Args:
            file_path: The relative path to the file

        Returns:
            Absolute URL to access the file
        """
        # Check if the file_path is already a complete URL
        if file_path.startswith('http://') or file_path.startswith('https://'):
            return file_path

        # Normalize path separators for URLs
        normalized_path = file_path.replace("\\", "/")

        # Construct absolute URL if api_base_url is provided
        if self.api_base_url:
            # Ensure base_url starts with / for proper URL construction
            media_path = self.base_url if self.base_url.startswith('/') else f"/{self.base_url}"
            return f"{self.api_base_url}{media_path}/{normalized_path}"

        # Fallback to relative URL (backward compatibility)
        return f"{self.base_url}/{normalized_path}"
