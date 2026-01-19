"""
Auth0 Permission System

This module provides authentication and authorization using Auth0:
- JWT verification via Auth0 JWKS
- Permission checking from Auth0 RBAC
- Optional database-based RBAC fallback
- FastAPI dependencies for route protection
"""

from typing import List, Optional, Union
from functools import wraps
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, union
from pydantic import BaseModel

from app.core.database import get_async_db
from app.core.auth0 import (
    verify_token,
    Auth0TokenPayload,
    has_permission as auth0_has_permission,
    has_any_permission as auth0_has_any_permission,
    has_all_permissions as auth0_has_all_permissions,
)
from app.config.settings import settings
from app.core.cache import cacheable

# Optional database models for hybrid RBAC
try:
    from app.models.user import User
    from app.models.permission import Permission
    from app.models.role import Role, RolePermission, UserRole

    DATABASE_RBAC_AVAILABLE = True
except ImportError:
    DATABASE_RBAC_AVAILABLE = False
    User = None

security = HTTPBearer()


class Auth0User(BaseModel):
    """
    Representation of an authenticated Auth0 user.

    This model wraps the Auth0 token payload and provides a consistent
    interface for accessing user information in route handlers.
    """

    id: str  # Auth0 user_id (sub claim)
    email: Optional[str] = None
    email_verified: Optional[bool] = None
    name: Optional[str] = None
    nickname: Optional[str] = None
    picture: Optional[str] = None
    permissions: List[str] = []
    roles: List[str] = []
    scopes: List[str] = []
    raw_payload: Optional[dict] = None

    class Config:
        # Allow arbitrary types for raw_payload
        arbitrary_types_allowed = True

    @classmethod
    def from_token_payload(cls, payload: Auth0TokenPayload) -> "Auth0User":
        """Create an Auth0User from a verified token payload."""
        return cls(
            id=payload.sub,
            email=payload.email,
            email_verified=payload.email_verified,
            name=payload.name,
            nickname=payload.nickname,
            picture=payload.picture,
            permissions=payload.permissions,
            roles=payload.roles,
            scopes=payload.scopes,
            raw_payload=payload.model_dump(),
        )

    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        return permission in self.permissions

    def has_any_permission(self, permissions: List[str]) -> bool:
        """Check if user has any of the given permissions."""
        return any(p in self.permissions for p in permissions)

    def has_all_permissions(self, permissions: List[str]) -> bool:
        """Check if user has all of the given permissions."""
        return all(p in self.permissions for p in permissions)

    def has_role(self, role: str) -> bool:
        """Check if user has a specific role."""
        return role in self.roles

    def has_scope(self, scope: str) -> bool:
        """Check if user has a specific OAuth scope."""
        return scope in self.scopes


# Type alias for current user
CurrentUser = Auth0User


class PermissionChecker:
    """Permission checking utility class supporting both Auth0 and database RBAC."""

    @staticmethod
    async def get_user_permissions_from_db(db: AsyncSession, user_id: str) -> List[str]:
        """
        Get permissions from database based on user ID.

        This method allows for hybrid RBAC where some permissions come from Auth0
        and additional permissions can be assigned in the database.
        """
        if not DATABASE_RBAC_AVAILABLE:
            return []

        query = (
            select(Permission.code)
            .join(RolePermission, Permission.id == RolePermission.permission_id)
            .join(UserRole, RolePermission.role_id == UserRole.role_id)
            .where(UserRole.user_id == user_id)
        )

        result = await db.execute(query)
        permissions = result.scalars().all()
        return list(permissions)

    @staticmethod
    async def get_combined_permissions(
        auth0_user: Auth0User,
        db: Optional[AsyncSession] = None
    ) -> List[str]:
        """
        Get combined permissions from Auth0 token and optionally from database.

        This allows for a hybrid approach where:
        - Base permissions come from Auth0 RBAC
        - Additional permissions can be assigned in the database
        """
        permissions = set(auth0_user.permissions)

        if db and DATABASE_RBAC_AVAILABLE and settings.AUTH0_USE_RBAC:
            db_permissions = await PermissionChecker.get_user_permissions_from_db(
                db, auth0_user.id
            )
            permissions.update(db_permissions)

        return list(permissions)

    @staticmethod
    @cacheable(
        ttl=600,
        key_template="permission_exists:{permission_code}",
        unless="result is False"
    )
    async def permission_exists(db: AsyncSession, permission_code: str) -> bool:
        """Check if a permission code exists in the database."""
        if not DATABASE_RBAC_AVAILABLE:
            return True  # Assume permission exists if no DB check

        query = select(Permission.id).where(Permission.code == permission_code)
        result = await db.execute(query)
        return result.scalar_one_or_none() is not None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Auth0User:
    """
    Get the current authenticated user from Auth0 token.

    This is the main authentication dependency. It verifies the JWT token
    with Auth0 and returns an Auth0User object.

    Returns:
        Auth0User: The authenticated user

    Raises:
        HTTPException: 401 if authentication fails
    """
    try:
        token = credentials.credentials

        # Verify token with Auth0
        payload = await verify_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create user object from payload
        user = Auth0User.from_token_payload(payload)

        return user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_with_db(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db),
) -> Auth0User:
    """
    Get the current authenticated user with database session.

    This dependency is useful when you need to augment Auth0 permissions
    with database-stored permissions.

    Returns:
        Auth0User: The authenticated user with combined permissions

    Raises:
        HTTPException: 401 if authentication fails
    """
    user = await get_current_user(credentials)

    # Optionally load additional permissions from database
    if DATABASE_RBAC_AVAILABLE and settings.AUTH0_USE_RBAC:
        combined_permissions = await PermissionChecker.get_combined_permissions(user, db)
        user.permissions = combined_permissions

    return user


def require_permissions(
    permissions: Union[str, List[str]],
    require_all: bool = False,
    raise_on_missing: bool = True
):
    """
    Decorator to require specific permissions for an endpoint.

    Args:
        permissions: Permission code(s) required (e.g., "features:read" or ["features:read", "features:write"])
        require_all: If True, user must have ALL permissions. If False, user needs ANY permission.
        raise_on_missing: If True, raises 403 when permission is missing. If False, returns None.

    Usage:
        @require_permissions("features:read")
        async def get_features():
            pass

        @require_permissions(["features:read", "features:write"], require_all=True)
        async def manage_features():
            pass
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, Auth0User):
                    current_user = value
                    break

            if current_user is None:
                if raise_on_missing:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Authentication dependency not found"
                    )
                return None

            # Normalize permissions to list
            required_perms = permissions if isinstance(permissions, list) else [permissions]

            # Check permissions
            if require_all:
                has_perms = current_user.has_all_permissions(required_perms)
            else:
                has_perms = current_user.has_any_permission(required_perms)

            if not has_perms:
                if raise_on_missing:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient permissions. Required: {', '.join(required_perms)}"
                    )
                return None

            return await func(*args, **kwargs)
        return wrapper
    return decorator


def has_permissions(
    permissions: Union[str, List[str]],
    require_all: bool = False
):
    """
    Dependency to check if current user has required permissions.

    Args:
        permissions: Permission code(s) required
        require_all: If True, user must have ALL permissions. If False, user needs ANY permission.

    Returns:
        Function that can be used as FastAPI dependency

    Usage:
        @router.get("/features")
        async def get_features(
            current_user: Auth0User = Depends(get_current_user),
            _: None = Depends(has_permissions("features:read"))
        ):
            pass
    """
    async def check_permissions(
        current_user: Auth0User = Depends(get_current_user),
    ):
        # Normalize permissions to list
        required_perms = permissions if isinstance(permissions, list) else [permissions]

        # Check permissions from Auth0 token
        if require_all:
            has_perms = current_user.has_all_permissions(required_perms)
        else:
            has_perms = current_user.has_any_permission(required_perms)

        if not has_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(required_perms)}"
            )

        return True

    return check_permissions


def has_permissions_with_db(
    permissions: Union[str, List[str]],
    require_all: bool = False
):
    """
    Dependency to check permissions with database augmentation.

    This dependency loads additional permissions from the database
    and combines them with Auth0 permissions before checking.

    Args:
        permissions: Permission code(s) required
        require_all: If True, user must have ALL permissions.

    Returns:
        Function that can be used as FastAPI dependency
    """
    async def check_permissions(
        current_user: Auth0User = Depends(get_current_user),
        db: AsyncSession = Depends(get_async_db),
    ):
        # Get combined permissions
        if DATABASE_RBAC_AVAILABLE and settings.AUTH0_USE_RBAC:
            combined_perms = await PermissionChecker.get_combined_permissions(
                current_user, db
            )
        else:
            combined_perms = current_user.permissions

        # Normalize permissions to list
        required_perms = permissions if isinstance(permissions, list) else [permissions]

        # Check permissions
        if require_all:
            has_perms = all(p in combined_perms for p in required_perms)
        else:
            has_perms = any(p in combined_perms for p in required_perms)

        if not has_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(required_perms)}"
            )

        return True

    return check_permissions


def has_role(role: str):
    """
    Dependency to check if current user has a specific role.

    Args:
        role: The role name to check

    Usage:
        @router.get("/admin")
        async def admin_endpoint(
            current_user: Auth0User = Depends(get_current_user),
            _: None = Depends(has_role("admin"))
        ):
            pass
    """
    async def check_role(
        current_user: Auth0User = Depends(get_current_user),
    ):
        if not current_user.has_role(role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return True

    return check_role


def has_scope(scope: str):
    """
    Dependency to check if current user has a specific OAuth scope.

    Args:
        scope: The OAuth scope to check

    Usage:
        @router.get("/data")
        async def data_endpoint(
            current_user: Auth0User = Depends(get_current_user),
            _: None = Depends(has_scope("read:data"))
        ):
            pass
    """
    async def check_scope(
        current_user: Auth0User = Depends(get_current_user),
    ):
        if not current_user.has_scope(scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Scope '{scope}' required"
            )
        return True

    return check_scope


# Convenience permission checkers for common operations
def require_read_permission(resource: str):
    """Require read permission for a resource."""
    return has_permissions(f"{resource}:read")


def require_write_permission(resource: str):
    """Require write permission for a resource."""
    return has_permissions(f"{resource}:write")


def require_delete_permission(resource: str):
    """Require delete permission for a resource."""
    return has_permissions(f"{resource}:delete")


def require_admin_permission(resource: str):
    """Require admin permission for a resource."""
    return has_permissions(f"{resource}:admin")


# Pre-defined permission dependencies for common resources
def require_features_read():
    """Require features read permission."""
    return has_permissions("features:read")


def require_features_write():
    """Require features write permission."""
    return has_permissions("features:write")


def require_features_delete():
    """Require features delete permission."""
    return has_permissions("features:delete")


async def get_current_user_with_permissions(
    required_permissions: Union[str, List[str]],
    require_all: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Auth0User:
    """
    Get current user and check permissions in one step.

    Usage:
        current_user = Depends(
            lambda: get_current_user_with_permissions("features:read")
        )
    """
    user = await get_current_user(credentials)

    # Normalize permissions to list
    required_perms = required_permissions if isinstance(required_permissions, list) else [required_permissions]

    # Check permissions
    if require_all:
        has_perms = user.has_all_permissions(required_perms)
    else:
        has_perms = user.has_any_permission(required_perms)

    if not has_perms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required: {', '.join(required_perms)}"
        )

    return user
