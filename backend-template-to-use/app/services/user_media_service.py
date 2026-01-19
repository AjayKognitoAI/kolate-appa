from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import UploadFile

from app.core.logging import get_class_logger
from app.models.user_media import UserMedia, UserMediaType
from app.models.user import User
from app.schemas.user_media import UserMediaOut
from app.utils.storage_factory import get_file_storage
from app.exceptions import ValidationError, ResourceNotFoundError


class UserMediaService:
    """Service for managing user media (profile photos and cover photos)."""

    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    async def upload_profile_photo(
        self,
        db: AsyncSession,
        user_id: str,
        photo: UploadFile,
        media_type: UserMediaType = UserMediaType.PROFILE_PHOTO,
        is_primary: bool = True,
    ) -> UserMedia:
        """
        Upload a profile photo or cover photo for a user.

        Args:
            db: Database session
            user_id: User ID
            photo: Uploaded file
            media_type: Type of media (profile_photo or cover_photo)
            is_primary: Whether this is the primary photo

        Returns:
            Created user media record

        Raises:
            ValidationError: If file is invalid
        """
        if not photo.filename:
            raise ValidationError(
                message="No filename provided",
                field="photo",
            )

        try:
            # Get storage instance
            storage = get_file_storage()

            # Save file to storage
            file_path, storage_type = await storage.save_file(
                photo, f"users/{user_id}/media"
            )

            # If this is set as primary, unset other primary photos of the same type
            if is_primary:
                await self._unset_primary_photos(db, user_id, media_type)

            # Create media record
            user_media = UserMedia(
                user_id=user_id,
                media_type=media_type,
                file_path=file_path,
                file_name=photo.filename,
                file_size=photo.size if hasattr(photo, "size") else None,
                mime_type=photo.content_type,
                storage_type=storage_type,
                is_primary=is_primary,
            )

            db.add(user_media)
            await db.commit()
            await db.refresh(user_media)

            self.logger.info(
                f"Uploaded {media_type} for user {user_id}: {photo.filename}"
            )
            return user_media

        except Exception as e:
            self.logger.error(
                f"Error uploading photo for user {user_id}: {str(e)}"
            )
            await db.rollback()
            raise

    async def _unset_primary_photos(
        self,
        db: AsyncSession,
        user_id: str,
        media_type: UserMediaType,
    ) -> None:
        """
        Unset is_primary for all photos of the given media type.

        Args:
            db: Database session
            user_id: User ID
            media_type: Media type to unset
        """
        query = select(UserMedia).where(
            and_(
                UserMedia.user_id == user_id,
                UserMedia.media_type == media_type,
                UserMedia.is_primary == True,
                UserMedia.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        existing_primary_photos = result.scalars().all()

        for photo in existing_primary_photos:
            photo.is_primary = False

        await db.commit()

    async def get_user_media(
        self,
        db: AsyncSession,
        user_id: str,
        media_type: Optional[UserMediaType] = None,
    ) -> List[UserMedia]:
        """
        Get all media for a user, optionally filtered by media type.

        Args:
            db: Database session
            user_id: User ID
            media_type: Optional media type filter

        Returns:
            List of user media records
        """
        conditions = [
            UserMedia.user_id == user_id,
            UserMedia.deleted_at.is_(None),
        ]

        if media_type:
            conditions.append(UserMedia.media_type == media_type)

        query = select(UserMedia).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalars().all()

    async def get_primary_photo(
        self,
        db: AsyncSession,
        user_id: str,
        media_type: UserMediaType = UserMediaType.PROFILE_PHOTO,
    ) -> Optional[UserMedia]:
        """
        Get the primary photo for a user.

        Args:
            db: Database session
            user_id: User ID
            media_type: Media type (default: profile_photo)

        Returns:
            Primary user media record or None
        """
        query = select(UserMedia).where(
            and_(
                UserMedia.user_id == user_id,
                UserMedia.media_type == media_type,
                UserMedia.is_primary == True,
                UserMedia.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_media(
        self,
        db: AsyncSession,
        media_id: int,
        user_id: str,
    ) -> bool:
        """
        Hard delete a media file (permanently removes from database and storage).

        Args:
            db: Database session
            media_id: Media ID
            user_id: User ID (for verification)

        Returns:
            True if deleted successfully

        Raises:
            ResourceNotFoundError: If media not found
            ValidationError: If user doesn't own the media
        """
        query = select(UserMedia).where(
            and_(
                UserMedia.id == media_id,
                UserMedia.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        media = result.scalar_one_or_none()

        if not media:
            raise ResourceNotFoundError(
                message="Media not found",
                resource_type="user_media",
                resource_id=media_id,
            )

        # Verify ownership
        if media.user_id != user_id:
            raise ValidationError(
                message="You can only delete your own media",
                field="media_id",
            )

        # Store file path for deletion from storage
        file_path = media.file_path

        # Hard delete from database
        await db.delete(media)
        await db.commit()

        # Delete physical file from storage
        try:
            storage = get_file_storage()
            await storage.delete_file(file_path)
            self.logger.info(f"Deleted file from storage: {file_path}")
        except Exception as e:
            self.logger.error(f"Failed to delete file from storage: {file_path}, error: {str(e)}")
            # Don't raise error - database record is already deleted

        self.logger.info(f"Hard deleted media {media_id} for user {user_id}")
        return True

    async def set_primary_photo(
        self,
        db: AsyncSession,
        media_id: int,
        user_id: str,
    ) -> UserMedia:
        """
        Set a media as the primary photo.

        Args:
            db: Database session
            media_id: Media ID
            user_id: User ID (for verification)

        Returns:
            Updated user media record

        Raises:
            ResourceNotFoundError: If media not found
            ValidationError: If user doesn't own the media
        """
        query = select(UserMedia).where(
            and_(
                UserMedia.id == media_id,
                UserMedia.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        media = result.scalar_one_or_none()

        if not media:
            raise ResourceNotFoundError(
                message="Media not found",
                resource_type="user_media",
                resource_id=media_id,
            )

        # Verify ownership
        if media.user_id != user_id:
            raise ValidationError(
                message="You can only modify your own media",
                field="media_id",
            )

        # Unset other primary photos of the same type
        await self._unset_primary_photos(db, user_id, media.media_type)

        # Set this as primary
        media.is_primary = True
        await db.commit()
        await db.refresh(media)

        self.logger.info(f"Set media {media_id} as primary for user {user_id}")
        return media


# Global service instance
user_media_service = UserMediaService()
