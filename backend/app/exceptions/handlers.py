"""
Exception handlers for converting custom exceptions to HTTP responses.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError

from app.core.logging import get_logger
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

logger = get_logger(__name__)


def create_error_response(
    status_code: int,
    message: str,
    error_code: str = None,
    details: dict = None
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "error": {
            "message": message,
            "code": error_code or "UNKNOWN_ERROR",
            "details": details or {}
        }
    }
    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle base AppException and its subclasses."""
    logger.warning(f"AppException occurred: {exc.message}", extra={
        "error_code": exc.error_code,
        "details": exc.details,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle validation errors."""
    logger.info(f"Validation error: {exc.message}", extra={
        "field": exc.field,
        "value": exc.value,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def not_found_error_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    """Handle not found errors."""
    logger.info(f"Resource not found: {exc.message}", extra={
        "resource_type": exc.resource_type,
        "resource_id": exc.resource_id,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_404_NOT_FOUND,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def permission_denied_error_handler(request: Request, exc: PermissionDeniedError) -> JSONResponse:
    """Handle permission denied errors."""
    logger.warning(f"Permission denied: {exc.message}", extra={
        "user_id": exc.user_id,
        "required_permission": exc.required_permission,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_403_FORBIDDEN,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def access_denied_error_handler(request: Request, exc: AccessDeniedError) -> JSONResponse:
    """Handle access denied errors."""
    logger.warning(f"Access denied: {exc.message}", extra={
        "user_id": exc.user_id,
        "resource_type": exc.resource_type,
        "resource_id": exc.resource_id,
        "action": exc.action,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_403_FORBIDDEN,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def resource_not_found_error_handler(request: Request, exc: ResourceNotFoundError) -> JSONResponse:
    """Handle resource not found errors."""
    logger.info(f"Resource not found: {exc.message}", extra={
        "resource_type": exc.resource_type,
        "resource_id": exc.resource_id,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_404_NOT_FOUND,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def business_logic_error_handler(request: Request, exc: BusinessLogicError) -> JSONResponse:
    """Handle business logic errors."""
    logger.warning(f"Business logic error: {exc.message}", extra={
        "constraint": exc.constraint,
        "path": request.url.path,
        "method": request.method
    })

    # Use 400 for constraint violations (like duplicate entries), 422 for other business logic errors
    status_code = (
        status.HTTP_400_BAD_REQUEST if exc.constraint in ["unique_scope_code", "unique_master_locale"]
        else status.HTTP_422_UNPROCESSABLE_ENTITY
    )

    return create_error_response(
        status_code=status_code,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def authentication_error_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
    """Handle authentication errors."""
    logger.warning(f"Authentication error: {exc.message}", extra={
        "user_id": exc.user_id,
        "email": exc.email,
        "reason": exc.reason,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_401_UNAUTHORIZED,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def email_already_exists_error_handler(request: Request, exc: EmailAlreadyExistsError) -> JSONResponse:
    """Handle email already exists errors."""
    logger.info(f"Registration attempt with existing email: {exc.email}", extra={
        "email": exc.email,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


async def password_change_error_handler(request: Request, exc: PasswordChangeError) -> JSONResponse:
    """Handle password change errors."""
    logger.warning(f"Password change error: {exc.message}", extra={
        "user_id": exc.user_id,
        "reason": exc.reason,
        "path": request.url.path,
        "method": request.method
    })

    return create_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        message=exc.message,
        error_code=exc.error_code,
        details=exc.details
    )


# Exception handler mapping
EXCEPTION_HANDLERS = {
    # Specific authentication exceptions (more specific handlers first)
    EmailAlreadyExistsError: email_already_exists_error_handler,
    PasswordChangeError: password_change_error_handler,
    InvalidCredentialsError: authentication_error_handler,
    UserNotFoundError: authentication_error_handler,
    AccountInactiveError: authentication_error_handler,
    InvalidPasswordError: authentication_error_handler,
    NoAuthRecordError: authentication_error_handler,
    InvalidRefreshTokenError: authentication_error_handler,
    AuthenticationError: authentication_error_handler,

    # Specific access exceptions
    HomeownerAccessDeniedError: access_denied_error_handler,
    ProviderAccessDeniedError: access_denied_error_handler,
    ResourceNotFoundError: resource_not_found_error_handler,
    AccessDeniedError: access_denied_error_handler,

    # Base exceptions
    ValidationError: validation_error_handler,
    NotFoundError: not_found_error_handler,
    PermissionDeniedError: permission_denied_error_handler,
    BusinessLogicError: business_logic_error_handler,
    AppException: app_exception_handler,
}