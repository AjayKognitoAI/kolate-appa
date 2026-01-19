"""
Access control related exceptions.
"""

from typing import Optional, Any
from .base import PermissionDeniedError, NotFoundError


class AccessDeniedError(PermissionDeniedError):
    """Base class for access denied errors."""

    def __init__(
        self,
        message: str = "Access denied",
        resource_type: Optional[str] = None,
        resource_id: Optional[Any] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        **kwargs
    ):
        details = kwargs.get("details", {})
        if resource_type:
            details["resource_type"] = resource_type
        if resource_id is not None:
            details["resource_id"] = resource_id
        if action:
            details["action"] = action

        super().__init__(
            message=message,
            user_id=user_id,
            details=details,
            error_code=kwargs.get("error_code", "ACCESS_DENIED")
        )
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.action = action


class ResourceNotFoundError(NotFoundError):
    """Raised when a resource is not found for access control purposes."""

    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[Any] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            resource_type=resource_type,
            resource_id=resource_id,
            error_code=kwargs.get("error_code", "RESOURCE_NOT_FOUND")
        )


class HomeownerAccessDeniedError(AccessDeniedError):
    """Raised when access to homeowner resources is denied."""

    def __init__(
        self,
        message: str = "You can only access your own homeowner resources",
        homeowner_id: Optional[int] = None,
        user_id: Optional[str] = None,
        action: str = "access",
        **kwargs
    ):
        if not message or message == "You can only access your own homeowner resources":
            message = f"You can only {action} your own addresses"

        super().__init__(
            message=message,
            resource_type="homeowner",
            resource_id=homeowner_id,
            user_id=user_id,
            action=action,
            error_code=kwargs.get("error_code", "HOMEOWNER_ACCESS_DENIED")
        )
        self.homeowner_id = homeowner_id


class ProviderAccessDeniedError(AccessDeniedError):
    """Raised when access to service provider resources is denied."""

    def __init__(
        self,
        message: str = "You can only access your own provider resources",
        provider_id: Optional[int] = None,
        user_id: Optional[str] = None,
        action: str = "access",
        **kwargs
    ):
        if not message or message == "You can only access your own provider resources":
            message = f"You can only {action} your own certifications"

        super().__init__(
            message=message,
            resource_type="service_provider",
            resource_id=provider_id,
            user_id=user_id,
            action=action,
            error_code=kwargs.get("error_code", "PROVIDER_ACCESS_DENIED")
        )
        self.provider_id = provider_id