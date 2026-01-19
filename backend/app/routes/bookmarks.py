"""
User Bookmark Routes

Endpoints for managing user bookmarks of executions.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.core.tenant import get_tenant_db
from app.schemas.project import UserBookmarkCreate, UserBookmarkResponse
from app.services.bookmarks.bookmark_service import BookmarkService


router = APIRouter()


@router.post(
    "",
    response_model=UserBookmarkResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_bookmark(
    bookmark_data: UserBookmarkCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("bookmarks:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create a new bookmark."""
    service = BookmarkService()
    bookmark = await service.create_bookmark(db, bookmark_data, current_user.id)
    return UserBookmarkResponse.model_validate(bookmark)


@router.get("", response_model=List[UserBookmarkResponse])
async def get_my_bookmarks(
    project_id: UUID = Query(None),
    trial_id: UUID = Query(None),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("bookmarks:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get current user's bookmarks, optionally filtered by project or trial."""
    service = BookmarkService()
    bookmarks = await service.get_user_bookmarks(
        db, current_user.id,
        project_id=str(project_id) if project_id else None,
        trial_id=str(trial_id) if trial_id else None
    )
    return [UserBookmarkResponse.model_validate(b) for b in bookmarks]


@router.get("/{bookmark_id}", response_model=UserBookmarkResponse)
async def get_bookmark(
    bookmark_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("bookmarks:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get a specific bookmark."""
    service = BookmarkService()
    bookmark = await service.get_bookmark(db, str(bookmark_id), current_user.id)
    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found"
        )
    return UserBookmarkResponse.model_validate(bookmark)


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("bookmarks:delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete a bookmark."""
    service = BookmarkService()
    deleted = await service.delete_bookmark(db, str(bookmark_id), current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found"
        )


@router.get("/execution/{execution_id}")
async def check_bookmark_exists(
    execution_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Check if an execution is bookmarked by the current user."""
    service = BookmarkService()
    exists = await service.is_bookmarked(db, execution_id, current_user.id)
    return {"bookmarked": exists}
