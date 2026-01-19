"""
Guest-related exceptions.

This module contains exceptions specific to guest session management.
"""

from .base import AppException, NotFoundError
from .auth import AuthenticationError


class GuestSessionError(AppException):
    """Base class for guest session errors."""

    def __init__(self, message: str, session_id: str = None, **context):
        self.session_id = session_id
        super().__init__(message, **context)


class GuestSessionNotFoundError(NotFoundError, GuestSessionError):
    """Raised when guest session is not found."""

    def __init__(self, session_id: str):
        super().__init__(
            message=f"Guest session not found",
            session_id=session_id,
            error_code="GUEST_SESSION_NOT_FOUND",
        )


class GuestSessionExpiredError(AuthenticationError, GuestSessionError):
    """Raised when guest session has expired."""

    def __init__(self, session_id: str):
        super().__init__(
            message=f"Guest session has expired",
            session_id=session_id,
            error_code="GUEST_SESSION_EXPIRED",
        )


class InvalidGuestSessionError(AuthenticationError, GuestSessionError):
    """Raised when guest session is invalid."""

    def __init__(self, session_id: str = None, reason: str = None):
        message = "Invalid guest session"
        if reason:
            message += f": {reason}"

        super().__init__(
            message=message,
            session_id=session_id,
            error_code="INVALID_GUEST_SESSION",
            reason=reason,
        )
