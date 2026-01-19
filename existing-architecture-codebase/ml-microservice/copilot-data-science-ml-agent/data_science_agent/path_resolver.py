"""Intelligent file path resolution for cross-platform compatibility."""

import os
from pathlib import Path
from typing import Optional


class PathResolver:
    """Resolves and validates file paths intelligently."""

    @staticmethod
    def resolve(file_path: str) -> str:
        """
        Resolve file path - normalize and verify it exists.

        Args:
            file_path: Original file path (may have issues)

        Returns:
            Resolved absolute path

        Raises:
            FileNotFoundError: If file cannot be found
        """
        if not file_path:
            raise ValueError("File path is empty")

        # Normalize path separators (Windows backslashes to forward slashes)
        normalized = file_path.replace("\\", "/")

        # Try the direct path first
        if os.path.isfile(normalized):
            return os.path.abspath(normalized)

        # Try with original path
        if os.path.isfile(file_path):
            return os.path.abspath(file_path)

        # Try relative paths from project root
        project_root = Path(__file__).parent.parent
        relative_path = project_root / normalized
        if relative_path.is_file():
            return str(relative_path.absolute())

        # Try data/uploads directory
        upload_path = project_root / "data" / "uploads" / os.path.basename(normalized)
        if upload_path.is_file():
            return str(upload_path.absolute())

        # Try data/samples directory
        sample_path = project_root / "data" / "samples" / os.path.basename(normalized)
        if sample_path.is_file():
            return str(sample_path.absolute())

        # If it has just a filename, look in common directories
        basename = os.path.basename(normalized)
        common_dirs = [
            project_root / "data" / "uploads",
            project_root / "data" / "samples",
            project_root / "data",
            Path.cwd(),
        ]

        for dir_path in common_dirs:
            full_path = dir_path / basename
            if full_path.is_file():
                return str(full_path.absolute())

        # File not found - provide helpful error
        raise FileNotFoundError(
            f"File not found: {file_path}\n"
            f"Searched in: project root, data/uploads, data/samples, current directory"
        )

    @staticmethod
    def normalize(file_path: str) -> str:
        """Normalize path separators and return absolute path."""
        normalized = file_path.replace("\\", "/")
        return os.path.abspath(normalized)

    @staticmethod
    def get_relative_path(file_path: str) -> str:
        """Get relative path from project root."""
        project_root = Path(__file__).parent.parent
        try:
            full_path = Path(file_path).absolute()
            return str(full_path.relative_to(project_root))
        except ValueError:
            return file_path

    @staticmethod
    def ensure_extension(file_path: str, extension: str) -> str:
        """Ensure file has the correct extension."""
        if not file_path.endswith(extension):
            return file_path + extension
        return file_path
