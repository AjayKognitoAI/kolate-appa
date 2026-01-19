from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.schemas.guest import (
    GuestSessionRequest,
    GuestSessionResponse,
    GuestSessionInfo,
    GuestSessionExtendRequest,
    GuestSessionExtendResponse,
    GuestLoginRequest,
    GuestLoginResponse,
)
from app.services.guest_service import guest_service
from app.services.authentication_service import auth_service
from app.exceptions import (
    GuestSessionNotFoundError,
    GuestSessionExpiredError,
    InvalidGuestSessionError,
)

router = APIRouter()


def get_client_info(request: Request) -> dict:
    """Extract client information from request."""
    return {
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
        "device_fingerprint": request.headers.get("x-device-fingerprint"),
    }


def get_session_id_from_header(x_guest_session: Optional[str] = Header(None)) -> str:
    """Extract guest session ID from header."""
    if not x_guest_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Guest session ID required in X-Guest-Session header",
        )
    return x_guest_session


@router.post(
    "/session",
    response_model=GuestSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new guest session",
)
async def create_guest_session(
    session_request: GuestSessionRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    include_token: bool = False,
):
    """
    Create a new guest session for anonymous access.

    Args:
        include_token: If True, returns access_token along with session_id
    """
    client_info = get_client_info(request)

    try:
        guest = await guest_service.create_guest_session(
            db=db,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"],
            device_fingerprint=client_info["device_fingerprint"],
            session_duration_hours=session_request.session_duration_hours,
        )

        response = GuestSessionResponse(
            session_id=guest.session_id, expires_at=guest.expires_at
        )

        # Optionally include access token
        if include_token:
            auth_result = await auth_service.authenticate_guest(
                db=db, session_id=guest.session_id
            )
            if auth_result:
                response.access_token = auth_result["access_token"]
                response.token_type = auth_result["token_type"]
                response.expires_in = auth_result["expires_in"]

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create guest session: {str(e)}",
        )


@router.post(
    "/login",
    response_model=GuestLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Guest login to get access token",
)
async def guest_login(
    login_request: GuestLoginRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Authenticate a guest user and return JWT access token.

    Use this endpoint to exchange a guest session_id for a JWT access token.
    The access token can then be used to authenticate API requests.
    """
    try:
        auth_result = await auth_service.authenticate_guest(
            db=db, session_id=login_request.session_id
        )

        if not auth_result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired guest session",
            )

        return GuestLoginResponse(**auth_result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to authenticate guest: {str(e)}",
        )


@router.get(
    "/session",
    response_model=GuestSessionInfo,
    summary="Get current guest session info",
)
async def get_guest_session_info(
    session_id: str = Depends(get_session_id_from_header),
    db: AsyncSession = Depends(get_async_db),
):
    """Get information about current guest session."""
    try:
        guest = await guest_service.get_guest_by_session_id(
            db=db, session_id=session_id, update_activity=True
        )

        if not guest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Guest session not found"
            )

        return GuestSessionInfo.model_validate(guest)

    except GuestSessionExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Guest session has expired"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session info: {str(e)}",
        )


@router.post(
    "/session/extend",
    response_model=GuestSessionExtendResponse,
    summary="Extend guest session",
)
async def extend_guest_session(
    extend_request: GuestSessionExtendRequest,
    session_id: str = Depends(get_session_id_from_header),
    db: AsyncSession = Depends(get_async_db),
):
    """Extend the expiration time of a guest session."""
    try:
        guest = await guest_service.extend_guest_session(
            db=db,
            session_id=session_id,
            additional_hours=extend_request.additional_hours,
        )

        return GuestSessionExtendResponse(
            session_id=guest.session_id,
            new_expires_at=guest.expires_at,
            additional_hours=extend_request.additional_hours,
        )

    except GuestSessionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Guest session not found"
        )
    except GuestSessionExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cannot extend expired session",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extend session: {str(e)}",
        )


@router.delete(
    "/session",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate guest session",
)
async def deactivate_guest_session(
    session_id: str = Depends(get_session_id_from_header),
    db: AsyncSession = Depends(get_async_db),
):
    """Deactivate a guest session."""
    try:
        success = await guest_service.deactivate_guest_session(
            db=db, session_id=session_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Guest session not found"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate session: {str(e)}",
        )


@router.post("/session/validate", summary="Validate guest session")
async def validate_guest_session(
    session_id: str = Depends(get_session_id_from_header),
    db: AsyncSession = Depends(get_async_db),
):
    """Validate if guest session is active and not expired."""
    try:
        is_valid = await guest_service.validate_guest_session(
            db=db, session_id=session_id
        )

        return {"valid": is_valid, "session_id": session_id}

    except Exception as e:
        return {"valid": False, "session_id": session_id, "error": str(e)}


# Demo endpoints that guests can access
@router.get("/demo/health", summary="Demo health check for guests")
async def guest_health_check(
    session_id: str = Depends(get_session_id_from_header),
    db: AsyncSession = Depends(get_async_db),
):
    """Health check endpoint accessible by guests."""
    # Validate guest session
    is_valid = await guest_service.validate_guest_session(db=db, session_id=session_id)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired guest session",
        )

    return {
        "status": "healthy",
        "message": "Guest access working",
        "session_id": session_id,
        "timestamp": "2024-01-01T00:00:00Z",  # In real implementation, use actual timestamp
    }


@router.get("/demo/public-data", summary="Get public data accessible by guests")
async def get_public_data(
    session_id: str = Depends(get_session_id_from_header),
    db: AsyncSession = Depends(get_async_db),
):
    """Get public data that guests can access."""
    # Validate guest session
    is_valid = await guest_service.validate_guest_session(db=db, session_id=session_id)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired guest session",
        )

    return {
        "data": {
            "available_services": ["Plumbing", "Electrical", "Cleaning", "Gardening"],
            "service_areas": ["New York", "Los Angeles", "Chicago", "Houston"],
            "platform_stats": {
                "total_providers": 1500,
                "completed_jobs": 25000,
                "avg_rating": 4.8,
            },
        },
        "access_level": "guest",
        "session_id": session_id,
    }
