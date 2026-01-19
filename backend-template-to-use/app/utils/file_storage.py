"""
File storage strategy pattern implementation.

This module provides an abstraction for file storage with support for
multiple storage backends (local filesystem and AWS S3).
"""

from abc import ABC, abstractmethod
from typing import BinaryIO, Tuple
import os
import uuid
from pathlib import Path
import aiofiles
from fastapi import UploadFile

from app.core.logging import get_class_logger


class FileStorageStrategy(ABC):
    """Abstract base class for file storage strategies."""

    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    @abstractmethod
    async def save_file(
        self, file: UploadFile, folder: str, filename: str = None
    ) -> Tuple[str, str]:
        """
        Save a file to storage.

        Args:
            file: The uploaded file
            folder: The folder/prefix to store the file in
            filename: Optional custom filename (if None, generates a unique name)

        Returns:
            Tuple of (file_path, storage_type)
        """
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            file_path: The path to the file

        Returns:
            True if deleted successfully, False otherwise
        """
        pass

    @abstractmethod
    async def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists in storage.

        Args:
            file_path: The path to check

        Returns:
            True if file exists, False otherwise
        """
        pass

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """
        Get the URL to access a file.

        Args:
            file_path: The path to the file

        Returns:
            URL to access the file
        """
        pass

    def _generate_unique_filename(self, original_filename: str) -> str:
        """
        Generate a unique filename while preserving the extension.

        Args:
            original_filename: The original filename

        Returns:
            A unique filename with UUID prefix
        """
        ext = Path(original_filename).suffix
        unique_name = f"{uuid.uuid4()}{ext}"
        return unique_name

    def _get_mime_type(self, filename: str) -> str:
        """
        Get MIME type from filename extension.

        Args:
            filename: The filename

        Returns:
            MIME type string
        """
        ext = Path(filename).suffix.lower()
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".webm": "video/webm",
        }
        return mime_types.get(ext, "application/octet-stream")
