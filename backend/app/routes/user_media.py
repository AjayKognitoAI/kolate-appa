from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user
from app.models.user import User
from app.models.user_media import UserMediaType
from app.schemas.user_media import UserMediaOut
from app.services.user_media_service import user_media_service
from app.utils.storage_factory import get_file_storage
from app.exceptions import ValidationError, ResourceNotFoundError

router = APIRouter()


@router.post(
    "/upload",
    response_model=UserMediaOut,
    summary="Upload Profile Photo or Cover Photo",
    description="Upload a profile photo or cover photo for the authenticated user",
    status_code=status.HTTP_201_CREATED,
)
async def upload_profile_photo(
    photo: UploadFile = File(..., description="Photo to upload"),
    mediaType: str = Form(
        default="profile_photo",
        description="Media type: profile_photo or cover_photo",
    ),
    isPrimary: bool = Form(
        default=True,
        description="Set as primary photo",
    ),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a profile photo or cover photo for the authenticated user.

    Args:
        photo: The photo file to upload
        mediaType: Type of media (profile_photo or cover_photo)
        isPrimary: Whether to set this as the primary photo

    Returns:
        The created user media record with file URL
    """
    # Validate mediaType
    try:
        media_type_enum = UserMediaType(mediaType)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mediaType. Must be one of: {', '.join([e.value for e in UserMediaType])}",
        )

    # Validate file type (images only)
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed",
        )

    try:
        user_media = await user_media_service.upload_profile_photo(
            db=db,
            user_id=current_user.id,
            photo=photo,
            media_type=media_type_enum,
            is_primary=isPrimary,
        )

        # Add file_url to response
        storage = get_file_storage()
        file_url = storage.get_file_url(user_media.file_path)  # Not async, don't await

        result = UserMediaOut.model_validate(user_media)
        result.file_url = file_url
        return result

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photo: {str(e)}",
        )


@router.get(
    "",
    response_model=List[UserMediaOut],
    summary="Get User Media",
    description="Get all media for the authenticated user",
)
async def get_my_media(
    media_type: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all media for the authenticated user.

    Args:
        media_type: Optional filter by media type (profile_photo or cover_photo)

    Returns:
        List of user media records
    """
    media_type_enum = None
    if media_type:
        try:
            media_type_enum = UserMediaType(media_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid media_type. Must be one of: {', '.join([e.value for e in UserMediaType])}",
            )

    user_media_list = await user_media_service.get_user_media(
        db=db,
        user_id=current_user.id,
        media_type=media_type_enum,
    )

    # Add file URLs
    storage = get_file_storage()
    result = []
    for media in user_media_list:
        media_out = UserMediaOut.model_validate(media)
        media_out.file_url = storage.get_file_url(media.file_path)  # Not async, don't await
        result.append(media_out)

    return result


@router.get(
    "/primary",
    response_model=UserMediaOut,
    summary="Get Primary Profile Photo",
    description="Get the primary profile photo for the authenticated user",
)
async def get_primary_photo(
    media_type: str = "profile_photo",
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the primary profile photo for the authenticated user.

    Args:
        media_type: Media type (default: profile_photo)

    Returns:
        Primary user media record
    """
    try:
        media_type_enum = UserMediaType(media_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid media_type. Must be one of: {', '.join([e.value for e in UserMediaType])}",
        )

    primary_photo = await user_media_service.get_primary_photo(
        db=db,
        user_id=current_user.id,
        media_type=media_type_enum,
    )

    if not primary_photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No primary photo found",
        )

    # Add file URL
    storage = get_file_storage()
    result = UserMediaOut.model_validate(primary_photo)
    result.file_url = storage.get_file_url(primary_photo.file_path)  # Not async, don't await
    return result


@router.patch(
    "/{media_id}/set-primary",
    response_model=UserMediaOut,
    summary="Set Primary Photo",
    description="Set a media as the primary photo",
)
async def set_primary_photo(
    media_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Set a media as the primary photo for the authenticated user.

    Args:
        media_id: Media ID to set as primary

    Returns:
        Updated user media record
    """
    try:
        user_media = await user_media_service.set_primary_photo(
            db=db,
            media_id=media_id,
            user_id=current_user.id,
        )

        # Add file URL
        storage = get_file_storage()
        result = UserMediaOut.model_validate(user_media)
        result.file_url = storage.get_file_url(user_media.file_path)  # Not async, don't await
        return result

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        )


@router.delete(
    "/{media_id}",
    summary="Delete Media",
    description="Delete a media file (soft delete)",
)
async def delete_media(
    media_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a media file for the authenticated user.

    Args:
        media_id: Media ID to delete

    Returns:
        Success message
    """
    try:
        await user_media_service.delete_media(
            db=db,
            media_id=media_id,
            user_id=current_user.id,
        )
        return {"message": "Media deleted successfully"}

    except ResourceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        )


__all__ = ["router"]
