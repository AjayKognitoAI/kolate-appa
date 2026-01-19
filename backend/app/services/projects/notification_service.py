"""
Notification Service

Business logic for user notifications.
Operates within tenant-specific schema (org_xxx) set via search_path.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_

from app.models.tenant import Notification, NotificationType
from app.schemas.project import NotificationCreate, NotificationResponse


class NotificationService:
    """User notification management service."""

    async def get_user_notifications(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        unread_only: bool = False,
        page: int = 1,
        size: int = 20
    ) -> dict:
        """
        Get user's notifications with pagination.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            unread_only: Filter to only unread notifications
            page: Page number (1-indexed)
            size: Page size

        Returns:
            dict: Paginated notifications with unread count
        """
        # Base filter
        base_filter = Notification.user_auth0_id == user_auth0_id

        # Count total (considering unread filter)
        count_filter = base_filter
        if unread_only:
            count_filter = and_(base_filter, Notification.read_at.is_(None))

        count_query = select(func.count(Notification.id)).where(count_filter)
        total = await db.scalar(count_query)

        # Count unread
        unread_query = select(func.count(Notification.id)).where(
            base_filter,
            Notification.read_at.is_(None)
        )
        unread_count = await db.scalar(unread_query)

        # Data query with pagination
        offset = (page - 1) * size
        query = select(Notification).where(count_filter)
        query = query.order_by(Notification.created_at.desc())
        query = query.offset(offset).limit(size)

        result = await db.execute(query)
        notifications = result.scalars().all()

        return {
            "items": notifications,
            "total": total or 0,
            "unread_count": unread_count or 0,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size if total else 0,
        }

    async def get_notification_by_id(
        self,
        db: AsyncSession,
        notification_id: UUID,
        user_auth0_id: str
    ) -> Optional[Notification]:
        """
        Get a specific notification.

        Args:
            db: Database session (tenant schema set)
            notification_id: Notification UUID
            user_auth0_id: Auth0 user ID

        Returns:
            Notification or None
        """
        query = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_auth0_id == user_auth0_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_notification(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        notification_data: NotificationCreate
    ) -> Notification:
        """
        Create a notification for a user.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            notification_data: Notification creation data

        Returns:
            Notification: Created notification
        """
        notification = Notification(
            user_auth0_id=user_auth0_id,
            notification_type=notification_data.notification_type,
            title=notification_data.title,
            message=notification_data.message,
            data=notification_data.data or {},
            project_id=notification_data.project_id,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification

    async def create_bulk_notifications(
        self,
        db: AsyncSession,
        user_auth0_ids: List[str],
        notification_data: NotificationCreate
    ) -> List[Notification]:
        """
        Create notifications for multiple users.

        Args:
            db: Database session (tenant schema set)
            user_auth0_ids: List of Auth0 user IDs
            notification_data: Notification creation data

        Returns:
            List[Notification]: Created notifications
        """
        notifications = []
        for user_id in user_auth0_ids:
            notification = Notification(
                user_auth0_id=user_id,
                notification_type=notification_data.notification_type,
                title=notification_data.title,
                message=notification_data.message,
                data=notification_data.data or {},
                project_id=notification_data.project_id,
            )
            db.add(notification)
            notifications.append(notification)

        await db.commit()

        # Refresh all notifications
        for notification in notifications:
            await db.refresh(notification)

        return notifications

    async def mark_as_read(
        self,
        db: AsyncSession,
        notification_id: UUID,
        user_auth0_id: str
    ) -> Optional[Notification]:
        """
        Mark a notification as read.

        Args:
            db: Database session (tenant schema set)
            notification_id: Notification UUID
            user_auth0_id: Auth0 user ID

        Returns:
            Notification or None if not found
        """
        notification = await self.get_notification_by_id(
            db, notification_id, user_auth0_id
        )
        if not notification:
            return None

        if notification.read_at is None:
            notification.read_at = datetime.utcnow()
            await db.commit()
            await db.refresh(notification)

        return notification

    async def mark_all_as_read(
        self,
        db: AsyncSession,
        user_auth0_id: str
    ) -> int:
        """
        Mark all notifications as read for a user.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID

        Returns:
            int: Number of notifications marked as read
        """
        stmt = (
            update(Notification)
            .where(
                Notification.user_auth0_id == user_auth0_id,
                Notification.read_at.is_(None)
            )
            .values(read_at=datetime.utcnow())
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount

    async def delete_notification(
        self,
        db: AsyncSession,
        notification_id: UUID,
        user_auth0_id: str
    ) -> bool:
        """
        Delete a notification.

        Args:
            db: Database session (tenant schema set)
            notification_id: Notification UUID
            user_auth0_id: Auth0 user ID

        Returns:
            bool: True if deleted, False if not found
        """
        notification = await self.get_notification_by_id(
            db, notification_id, user_auth0_id
        )
        if not notification:
            return False

        await db.delete(notification)
        await db.commit()
        return True

    async def delete_old_notifications(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        days_old: int = 30
    ) -> int:
        """
        Delete notifications older than specified days.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID
            days_old: Delete notifications older than this many days

        Returns:
            int: Number of deleted notifications
        """
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        # Get notifications to delete
        query = select(Notification).where(
            Notification.user_auth0_id == user_auth0_id,
            Notification.created_at < cutoff_date
        )
        result = await db.execute(query)
        old_notifications = result.scalars().all()

        count = len(old_notifications)
        for notification in old_notifications:
            await db.delete(notification)

        await db.commit()
        return count

    async def get_unread_count(
        self,
        db: AsyncSession,
        user_auth0_id: str
    ) -> int:
        """
        Get unread notification count for user.

        Args:
            db: Database session (tenant schema set)
            user_auth0_id: Auth0 user ID

        Returns:
            int: Unread notification count
        """
        query = select(func.count(Notification.id)).where(
            Notification.user_auth0_id == user_auth0_id,
            Notification.read_at.is_(None)
        )
        return await db.scalar(query) or 0

    async def notify_project_members(
        self,
        db: AsyncSession,
        project_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        exclude_user: Optional[str] = None
    ) -> List[Notification]:
        """
        Send notification to all project members.

        Args:
            db: Database session (tenant schema set)
            project_id: Project UUID
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            data: Additional notification data
            exclude_user: User to exclude (e.g., the one who triggered the action)

        Returns:
            List[Notification]: Created notifications
        """
        from app.models.tenant import ProjectUser

        # Get project members
        query = select(ProjectUser.user_auth0_id).where(
            ProjectUser.project_id == project_id
        )
        if exclude_user:
            query = query.where(ProjectUser.user_auth0_id != exclude_user)

        result = await db.execute(query)
        user_ids = [row[0] for row in result.all()]

        if not user_ids:
            return []

        # Create notifications
        notification_data = NotificationCreate(
            notification_type=notification_type,
            title=title,
            message=message,
            data=data,
            project_id=project_id,
        )

        return await self.create_bulk_notifications(db, user_ids, notification_data)
