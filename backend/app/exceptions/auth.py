"""
Authentication related exceptions.
"""

from typing import Optional, Any
from .base import ValidationError, PermissionDeniedError, BusinessLogicError


class AuthenticationError(PermissionDeniedError):
    """Base class for authentication errors."""

    def __init__(
        self,
        message: str = "Authentication failed",
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        reason: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if email:
            details["email"] = email
        if reason:
            details["reason"] = reason

        super().__init__(
            message=message,
            user_id=user_id,
            details=details,
            error_code=kwargs.get("error_code", "AUTHENTICATION_ERROR")
        )
        self.email = email
        self.reason = reason


class InvalidCredentialsError(AuthenticationError):
    """Raised when user provides invalid credentials."""

    def __init__(
        self,
        message: str = "Invalid credentials",
        email: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            email=email,
            reason="invalid_credentials",
            error_code=kwargs.get("error_code", "INVALID_CREDENTIALS")
        )


class UserNotFoundError(AuthenticationError):
    """Raised when user is not found during authentication."""

    def __init__(
        self,
        message: str = "Invalid credentials",  # Don't reveal user existence
        email: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            email=email,
            reason="User not found",
            error_code=kwargs.get("error_code", "INVALID_CREDENTIALS")  # Same as invalid credentials for security
        )


class AccountInactiveError(AuthenticationError):
    """Raised when user account is inactive."""

    def __init__(
        self,
        message: str = "User account is inactive",
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            user_id=user_id,
            email=email,
            reason="account_inactive",
            error_code=kwargs.get("error_code", "ACCOUNT_INACTIVE")
        )


class EmailAlreadyExistsError(ValidationError):
    """Raised when trying to register with an existing email."""

    def __init__(
        self,
        message: str = "User with this email already exists",
        email: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if email:
            details["email"] = email

        super().__init__(
            message=message,
            field="email",
            value=email,
            details=details,
            error_code=kwargs.get("error_code", "EMAIL_ALREADY_EXISTS")
        )
        self.email = email


class InvalidPasswordError(AuthenticationError):
    """Raised when password is invalid during login or password change."""

    def __init__(
        self,
        message: str = "Invalid credentials",  # Don't reveal password is wrong for security
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        context: str = "login",  # "login" or "change_password"
        **kwargs
    ):
        if context == "change_password":
            message = "Current password is incorrect"

        super().__init__(
            message=message,
            user_id=user_id,
            email=email,
            reason=f"invalid_password_{context}",
            error_code=kwargs.get("error_code", "INVALID_CREDENTIALS" if context == "login" else "INVALID_CURRENT_PASSWORD")
        )
        self.context = context


class NoAuthRecordError(AuthenticationError):
    """Raised when no authentication record is found for user."""

    def __init__(
        self,
        message: str = "Invalid credentials",  # Don't reveal auth record issue for security
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        auth_type: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if auth_type:
            details["auth_type"] = auth_type

        super().__init__(
            message=message,
            user_id=user_id,
            email=email,
            reason="no_auth_record",
            details=details,
            error_code=kwargs.get("error_code", "INVALID_CREDENTIALS")
        )
        self.auth_type = auth_type


class InvalidRefreshTokenError(AuthenticationError):
    """Raised when refresh token is invalid or expired."""

    def __init__(
        self,
        message: str = "Invalid or expired refresh token",
        session_jti: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if session_jti:
            details["session_jti"] = session_jti

        super().__init__(
            message=message,
            reason="invalid_refresh_token",
            details=details,
            error_code=kwargs.get("error_code", "INVALID_REFRESH_TOKEN")
        )
        self.session_jti = session_jti


class PasswordChangeError(BusinessLogicError):
    """Raised when password change operation fails."""

    def __init__(
        self,
        message: str = "Password change failed",
        user_id: Optional[str] = None,
        reason: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if reason:
            details["reason"] = reason

        super().__init__(
            message=message,
            details=details,
            error_code=kwargs.get("error_code", "PASSWORD_CHANGE_ERROR")
        )
        self.user_id = user_id
        self.reason = reason