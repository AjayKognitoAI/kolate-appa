"""
Bookmark Service

Business logic for user bookmarks on projects.
Operates within tenant-specific schema (org_xxx) set via search_path.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.models.tenant import Bookmark
from app.schemas.project import BookmarkCreate, BookmarkResponse


class BookmarkService:
    """User bookmark management service."""

    async def get_user_bookmarks(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        page: int = 1,
        size: int = 10
    ) -> dict:
        """
        Get user's bookmarked projects with pagination.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            page: Page number (1-indexed)
            size: Page size

        Returns:
            dict: Paginated bookmarks with total count
        """
        # Count query
        count_query = select(func.count(Bookmark.id)).where(
            Bookmark.user_auth0_id == user_auth0_id
        )
        total = await db.scalar(count_query)

        # Data query with pagination
        offset = (page - 1) * size
        query = (
            select(Bookmark)
            .where(Bookmark.user_auth0_id == user_auth0_id)
            .order_by(Bookmark.created_at.desc())
            .offset(offset)
            .limit(size)
        )
        result = await db.execute(query)
        bookmarks = result.scalars().all()

        return {
            "items": bookmarks,
            "total": total or 0,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size if total else 0,
        }

    async def get_all_user_bookmarks(
        self,
        db: AsyncSession,
        user_auth0_id: str
    ) -> List[Bookmark]:
        """
        Get all user's bookmarked projects.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID

        Returns:
            List[Bookmark]: User's bookmarks
        """
        query = (
            select(Bookmark)
            .where(Bookmark.user_auth0_id == user_auth0_id)
            .order_by(Bookmark.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create_bookmark(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        bookmark_data: BookmarkCreate
    ) -> Bookmark:
        """
        Create a bookmark for a project.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            bookmark_data: Bookmark creation data

        Returns:
            Bookmark: Created bookmark

        Raises:
            ValueError: If bookmark already exists
        """
        # Check if bookmark already exists
        existing = await self.get_by_project(
            db, user_auth0_id, bookmark_data.project_id
        )
        if existing:
            raise ValueError("Bookmark already exists for this project")

        bookmark = Bookmark(
            user_auth0_id=user_auth0_id,
            project_id=bookmark_data.project_id,
            notes=bookmark_data.notes,
        )
        db.add(bookmark)
        await db.commit()
        await db.refresh(bookmark)
        return bookmark

    async def get_by_project(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        project_id: UUID
    ) -> Optional[Bookmark]:
        """
        Get bookmark for a specific project.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            project_id: Project UUID

        Returns:
            Bookmark or None
        """
        query = select(Bookmark).where(
            Bookmark.user_auth0_id == user_auth0_id,
            Bookmark.project_id == project_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_bookmark(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        project_id: UUID
    ) -> bool:
        """
        Delete a bookmark.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            project_id: Project UUID

        Returns:
            bool: True if deleted, False if not found
        """
        # First check if it exists
        bookmark = await self.get_by_project(db, user_auth0_id, project_id)
        if not bookmark:
            return False

        await db.delete(bookmark)
        await db.commit()
        return True

    async def is_bookmarked(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        project_id: UUID
    ) -> bool:
        """
        Check if project is bookmarked by user.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            project_id: Project UUID

        Returns:
            bool: True if bookmarked
        """
        query = select(Bookmark.id).where(
            Bookmark.user_auth0_id == user_auth0_id,
            Bookmark.project_id == project_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_bookmark_count(
        self,
        db: AsyncSession,
        user_auth0_id: str
    ) -> int:
        """
        Get total bookmark count for user.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID

        Returns:
            int: Bookmark count
        """
        query = select(func.count(Bookmark.id)).where(
            Bookmark.user_auth0_id == user_auth0_id
        )
        return await db.scalar(query) or 0
