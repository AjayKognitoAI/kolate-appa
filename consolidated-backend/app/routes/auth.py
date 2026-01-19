from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.schemas.auth import (
    LoginRequest, LoginResponse, RegisterRequest, RegisterResponse,
    RefreshTokenRequest, RefreshTokenResponse, LogoutRequest,
    PasswordChangeRequest, SessionInfo, ActiveSessionsResponse
)
from app.schemas.password_reset import (
    RequestOTPSchema,
    RequestOTPResponse,
    VerifyOTPSchema,
    VerifyOTPResponse,
    ResetPasswordSchema,
    ResetPasswordResponse,
)
from app.schemas.email_verification import (
    VerifyEmailRequest,
    VerifyEmailResponse,
    ResendVerificationOTPRequest,
    ResendVerificationOTPResponse,
)
from app.services.authentication_service import auth_service
from app.services.token_service import token_service
from app.services.password_reset_service import PasswordResetService
from app.services.email_verification_service import EmailVerificationService
from app.core.permissions import get_current_user
from app.models.user import User
from app.core.logging import logger

router = APIRouter()
security = HTTPBearer()


def get_client_info(request: Request) -> dict:
    """Extract client information from request."""
    return {
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
        "device_fingerprint": request.headers.get("x-device-fingerprint")
    }


def get_session_jti_from_token(token: str) -> Optional[str]:
    """Extract session JTI from JWT token."""
    payload = token_service.verify_token(token)
    return payload.jti if payload else None


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(
    registration: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Register a new user with email and password."""
    client_info = get_client_info(request)
    return await auth_service.register_user(
        db=db,
        registration=registration,
        user_agent=client_info["user_agent"],
        ip_address=client_info["ip_address"]
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login with email and password"
)
async def login(
    login_request: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Authenticate user and create session with tokens.

    For web clients: Returns tokens AND sets HttpOnly cookie
    For mobile clients: Returns tokens only (no cookie)

    Mobile apps should store the refresh_token securely and send it in request body.
    """
    client_info = get_client_info(request)

    # Authenticate user
    login_response = await auth_service.authenticate_user(
        db=db,
        login_request=login_request,
        user_agent=client_info["user_agent"],
        ip_address=client_info["ip_address"],
        device_fingerprint=client_info["device_fingerprint"]
    )

    # Detect if request is from a web browser (supports cookies)
    # Web browsers typically send Accept header with text/html
    accept_header = request.headers.get("accept", "")
    is_web_browser = "text/html" in accept_header or "Mozilla" in client_info.get("user_agent", "")

    # Set session_id cookie only for web browsers
    if is_web_browser and hasattr(token_service.config, 'session_cookie_name'):
        response.set_cookie(
            key=token_service.config.session_cookie_name,
            value=login_response.session_id,
            max_age=token_service.config.refresh_token_expire_hours * 3600,
            httponly=token_service.config.session_cookie_httponly,
            secure=token_service.config.session_cookie_secure,
            samesite=token_service.config.session_cookie_samesite
        )

    return login_response


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Refresh access token"
)
async def refresh_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    refresh_request: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Refresh access token using session_id and expired/valid access token.

    Supports both web and mobile clients:
    - Web: Sends session_id via HttpOnly cookie (automatic)
    - Mobile: Sends session_id in request body

    Security model:
    1. Client sends expired access token in Authorization header
    2. Client sends session_id via cookie or body
    3. Server extracts JTI from access token (even if expired)
    4. Server validates: session_id exists AND JTI matches session
    5. Server generates NEW access token with NEW JTI
    6. Server updates session with new JTI
    7. This prevents session hijacking and token replay attacks
    """
    # Get the expired/valid access token
    access_token = credentials.credentials

    # Try to get session_id from multiple sources (in order of preference)
    session_id = None

    # 1. Try request body (mobile apps)
    if refresh_request and refresh_request.session_id:
        session_id = refresh_request.session_id

    # 2. Try cookie (web browsers)
    if not session_id:
        session_id = request.cookies.get(token_service.config.session_cookie_name)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session ID not found. Provide it via cookie or request body."
        )

    # Refresh the session using session_id and access token
    new_tokens = await auth_service.refresh_by_session_id(
        db=db,
        session_id=session_id,
        access_token=access_token
    )

    if not new_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    return new_tokens


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout current session"
)
async def logout(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    logout_request: Optional[LogoutRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Logout user from current session.

    Supports both web and mobile clients:
    - Web: Uses session_id from HttpOnly cookie (automatic)
    - Mobile: Sends session_id in request body

    The endpoint will revoke the session in the database, making all tokens
    associated with that session invalid.

    Security: Verifies that session_id in request body (if provided) matches
    the session_id in the access token claims.
    """
    # Decode token to get full payload (including session_id)
    token_payload = token_service.verify_token(credentials.credentials)
    if not token_payload or not token_payload.jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token"
        )

    # Get session_id from token claims
    token_session_id = token_payload.session_id

    # Get session_id from request (body or cookie)
    request_session_id = None
    if logout_request and logout_request.session_id:
        request_session_id = logout_request.session_id
    elif token_service.config.session_cookie_name in request.cookies:
        request_session_id = request.cookies.get(token_service.config.session_cookie_name)

    # Verify session_id matches if provided in request
    if request_session_id and token_session_id:
        if request_session_id != token_session_id:
            logger.warning(
                "Logout failed: session_id mismatch",
                token_session_id=token_session_id,
                request_session_id=request_session_id,
                user_id=current_user.id
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session ID mismatch. Token does not match provided session."
            )

    # Revoke session using JTI
    session_jti = token_payload.jti
    success = await auth_service.logout_user(db, session_jti)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to logout"
        )

    # Try to clear session cookie if present (for web clients)
    # This is a best-effort cleanup - mobile clients won't have cookies
    cookie_name = token_service.config.session_cookie_name
    if cookie_name in request.cookies:
        response.delete_cookie(
            key=cookie_name,
            httponly=token_service.config.session_cookie_httponly,
            secure=token_service.config.session_cookie_secure,
            samesite=token_service.config.session_cookie_samesite
        )


@router.post(
    "/logout-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout from all sessions"
)
async def logout_all(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Logout user from all sessions.

    This will invalidate all active sessions for the user across all devices.
    Works for both web and mobile clients.
    """
    count = await auth_service.logout_all_sessions(db, current_user.id)

    # Try to clear session cookie if present (for web clients)
    cookie_name = token_service.config.session_cookie_name
    if cookie_name in request.cookies:
        response.delete_cookie(
            key=cookie_name,
            httponly=token_service.config.session_cookie_httponly,
            secure=token_service.config.session_cookie_secure,
            samesite=token_service.config.session_cookie_samesite
        )

    return {"message": f"Logged out from {count} sessions"}


@router.get(
    "/session",
    response_model=SessionInfo,
    summary="Get current session info"
)
async def get_session_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get information about current session."""
    session_jti = get_session_jti_from_token(credentials.credentials)
    if not session_jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token"
        )

    session_info = await auth_service.get_session_info(db, session_jti)
    if not session_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return session_info


@router.get(
    "/sessions",
    response_model=ActiveSessionsResponse,
    summary="Get all active sessions"
)
async def get_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all active sessions for current user."""
    sessions = await auth_service.get_active_sessions(db, current_user.id)
    return ActiveSessionsResponse(
        sessions=sessions,
        total=len(sessions)
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke a specific session"
)
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Revoke a specific session by ID."""
    success = await auth_service.revoke_session_by_id(
        db=db,
        session_id=session_id,
        user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already revoked"
        )


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change password"
)
async def change_password(
    password_change: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Change user password."""
    await auth_service.change_password(
        db=db,
        user_id=current_user.id,
        current_password=password_change.current_password,
        new_password=password_change.new_password
    )


@router.get(
    "/verify",
    summary="Verify token validity"
)
async def verify_token(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db)
):
    """Verify if current token is valid."""
    # Check if token is blacklisted
    is_blacklisted = await token_service.is_token_blacklisted(credentials.credentials)
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is no longer valid"
        )

    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email
    }


# Legacy endpoint for backwards compatibility
@router.get(
    "/me",
    summary="Get current user info (legacy endpoint)"
)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "is_active": current_user.is_active
    }


# ============================================================================
# PASSWORD RESET ENDPOINTS
# ============================================================================

@router.post(
    "/forgot-password/request-otp",
    response_model=RequestOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Request password reset OTP"
)
async def request_password_reset_otp(
    request_data: RequestOTPSchema,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Step 1: Request password reset OTP.

    Sends a 6-digit OTP to the user's email address.
    OTP expires in 10 minutes (configurable).

    - **email**: User's email address
    """
    try:
        service = PasswordResetService(db)
        result = await service.request_password_reset(request_data.email)
        return result

    except ValueError as e:
        logger.warning(f"Password reset OTP request failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))

    except Exception as e:
        logger.error(f"Password reset OTP request error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request",
        )


@router.post(
    "/forgot-password/verify-otp",
    response_model=VerifyOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify OTP and get reset token"
)
async def verify_otp(
    verify_data: VerifyOTPSchema,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Step 2: Verify OTP and get reset token.

    Validates the OTP sent to user's email.
    Returns a temporary reset token valid for 5 minutes.

    - **email**: User's email address
    - **otp**: 6-digit OTP from email
    """
    try:
        service = PasswordResetService(db)
        result = await service.verify_otp_and_create_reset_session(
            verify_data.email, verify_data.otp
        )
        return result

    except ValueError as e:
        logger.warning(f"OTP verification failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OTP verification failed",
        )


@router.post(
    "/forgot-password/reset-password",
    response_model=ResetPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset password using reset token"
)
async def reset_password(
    reset_data: ResetPasswordSchema,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Step 3: Reset password using reset token.

    Resets the user's password using the token from OTP verification.
    Invalidates all existing user sessions for security.

    - **reset_token**: Token received from OTP verification
    - **new_password**: New password (min 8 chars, must include uppercase, lowercase, digit, special char)
    """
    try:
        service = PasswordResetService(db)
        result = await service.reset_password(reset_data.reset_token, reset_data.new_password)
        return result

    except ValueError as e:
        logger.warning(f"Password reset failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password",
        )


# ============================================================================
# EMAIL VERIFICATION ENDPOINTS
# ============================================================================

@router.post(
    "/verify-email",
    response_model=VerifyEmailResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify email with OTP"
)
async def verify_email(
    verify_data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Verify user's email address using OTP.

    After registration, users receive an OTP via email.
    This endpoint verifies the OTP and activates the user account.

    - **email**: User's email address
    - **otp**: 6-digit OTP from email
    """
    try:
        service = EmailVerificationService(db)
        result = await service.verify_otp_and_activate_user(
            verify_data.email, verify_data.otp
        )
        return result

    except ValueError as e:
        logger.warning(f"Email verification failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed",
        )


@router.post(
    "/resend-verification-otp",
    response_model=ResendVerificationOTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Resend verification OTP"
)
async def resend_verification_otp(
    request_data: ResendVerificationOTPRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Resend verification OTP to user's email.

    Use this if the OTP expired or wasn't received.
    Rate limited to prevent abuse.

    - **email**: User's email address
    """
    try:
        service = EmailVerificationService(db)
        result = await service.resend_verification_otp(request_data.email)
        return result

    except ValueError as e:
        logger.warning(f"Resend verification OTP failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        logger.error(f"Resend verification OTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification OTP",
        )