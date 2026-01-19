"""
Custom exceptions for the application.

This package contains all custom exceptions used throughout the application.
These exceptions provide a clean separation between business logic errors
and HTTP response handling.
"""

from .base import (
    AppException,
    ValidationError,
    NotFoundError,
    PermissionDeniedError,
    BusinessLogicError
)

from .access import (
    AccessDeniedError,
    ResourceNotFoundError,
    HomeownerAccessDeniedError,
    ProviderAccessDeniedError
)

from .auth import (
    AuthenticationError,
    InvalidCredentialsError,
    UserNotFoundError,
    AccountInactiveError,
    EmailAlreadyExistsError,
    InvalidPasswordError,
    NoAuthRecordError,
    InvalidRefreshTokenError,
    PasswordChangeError
)

from .guest import (
    GuestSessionError,
    GuestSessionNotFoundError,
    GuestSessionExpiredError,
    InvalidGuestSessionError
)

from .password_reset import (
    OTPExpiredException,
    InvalidOTPException,
    MaxOTPAttemptsException,
    OTPRateLimitException,
    InvalidResetTokenException,
    PasswordResetException
)

__all__ = [
    # Base exceptions
    "AppException",
    "ValidationError",
    "NotFoundError",
    "PermissionDeniedError",
    "BusinessLogicError",

    # Access exceptions
    "AccessDeniedError",
    "ResourceNotFoundError",
    "HomeownerAccessDeniedError",
    "ProviderAccessDeniedError",

    # Authentication exceptions
    "AuthenticationError",
    "InvalidCredentialsError",
    "UserNotFoundError",
    "AccountInactiveError",
    "EmailAlreadyExistsError",
    "InvalidPasswordError",
    "NoAuthRecordError",
    "InvalidRefreshTokenError",
    "PasswordChangeError",

    # Guest session exceptions
    "GuestSessionError",
    "GuestSessionNotFoundError",
    "GuestSessionExpiredError",
    "InvalidGuestSessionError",

    # Password reset exceptions
    "OTPExpiredException",
    "InvalidOTPException",
    "MaxOTPAttemptsException",
    "OTPRateLimitException",
    "InvalidResetTokenException",
    "PasswordResetException"
]