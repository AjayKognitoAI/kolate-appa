"""
Base exceptions for the application.
"""

from typing import Optional, Dict, Any


class AppException(Exception):
    """Base exception for all application-specific exceptions."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.error_code = error_code

    def __str__(self) -> str:
        return self.message

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message='{self.message}', error_code='{self.error_code}')"


class ValidationError(AppException):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str = "Validation failed",
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if field:
            details["field"] = field
        if value is not None:
            details["value"] = value

        super().__init__(
            message=message,
            details=details,
            error_code=kwargs.get("error_code", "VALIDATION_ERROR")
        )
        self.field = field
        self.value = value


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[Any] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if resource_type:
            details["resource_type"] = resource_type
        if resource_id is not None:
            details["resource_id"] = resource_id

        super().__init__(
            message=message,
            details=details,
            error_code=kwargs.get("error_code", "NOT_FOUND")
        )
        self.resource_type = resource_type
        self.resource_id = resource_id


class PermissionDeniedError(AppException):
    """Raised when a user lacks permission to perform an action."""

    def __init__(
        self,
        message: str = "Permission denied",
        required_permission: Optional[str] = None,
        user_id: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if required_permission:
            details["required_permission"] = required_permission
        if user_id:
            details["user_id"] = user_id

        super().__init__(
            message=message,
            details=details,
            error_code=kwargs.get("error_code", "PERMISSION_DENIED")
        )
        self.required_permission = required_permission
        self.user_id = user_id


class BusinessLogicError(AppException):
    """Raised when business logic constraints are violated."""

    def __init__(
        self,
        message: str = "Business logic error",
        constraint: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if constraint:
            details["constraint"] = constraint

        super().__init__(
            message=message,
            details=details,
            error_code=kwargs.get("error_code", "BUSINESS_LOGIC_ERROR")
        )
        self.constraint = constraint