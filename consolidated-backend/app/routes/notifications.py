"""
User Notification Routes

Endpoints for managing user notifications.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.core.tenant import get_tenant_db
from app.schemas.project import NotificationResponse
from app.schemas.feature import PaginatedResponse
from app.services.notifications.notification_service import NotificationService


router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def get_my_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    unread_only: bool = Query(False, alias="unreadOnly"),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("notifications:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get current user's notifications."""
    service = NotificationService()
    result = await service.get_user_notifications(
        db, current_user.id,
        page=page, size=size,
        unread_only=unread_only
    )
    result.items = [NotificationResponse.model_validate(n) for n in result.items]
    return result


@router.get("/unread/count")
async def get_unread_count(
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get count of unread notifications."""
    service = NotificationService()
    count = await service.get_unread_count(db, current_user.id)
    return {"count": count}


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("notifications:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get a specific notification."""
    service = NotificationService()
    notification = await service.get_notification(db, str(notification_id), current_user.id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return NotificationResponse.model_validate(notification)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("notifications:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Mark a notification as read."""
    service = NotificationService()
    notification = await service.mark_as_read(db, str(notification_id), current_user.id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return NotificationResponse.model_validate(notification)


@router.put("/read-all")
async def mark_all_as_read(
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("notifications:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Mark all notifications as read."""
    service = NotificationService()
    count = await service.mark_all_as_read(db, current_user.id)
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("notifications:delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete a notification."""
    service = NotificationService()
    deleted = await service.delete_notification(db, str(notification_id), current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )


@router.delete("")
async def delete_all_read_notifications(
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("notifications:delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete all read notifications."""
    service = NotificationService()
    count = await service.delete_read_notifications(db, current_user.id)
    return {"message": f"Deleted {count} read notifications"}
