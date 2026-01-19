"""
Multi-Tenancy Support for PostgreSQL

This module provides schema-based multi-tenancy for PostgreSQL,
allowing data isolation between organizations using separate schemas.
"""

from typing import Optional, AsyncGenerator
from contextvars import ContextVar
from fastapi import Request, Header, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.database import get_async_db
from app.config.settings import settings

# Context variables for tenant information
current_tenant: ContextVar[Optional[str]] = ContextVar("current_tenant", default=None)
current_user_id: ContextVar[Optional[str]] = ContextVar("current_user_id", default=None)


def get_tenant_schema_name(org_id: str) -> str:
    """
    Generate the PostgreSQL schema name for a tenant.

    Args:
        org_id: The organization ID

    Returns:
        str: The schema name (e.g., "org_abc123")
    """
    return f"{settings.TENANT_SCHEMA_PREFIX}{org_id}"


async def set_tenant_schema(db: AsyncSession, org_id: Optional[str]) -> None:
    """
    Set the PostgreSQL search_path to the tenant's schema.

    This ensures all subsequent queries in the session are scoped
    to the tenant's schema plus the public schema for shared tables.

    Args:
        db: The async database session
        org_id: The organization ID (None for public schema only)
    """
    if org_id and settings.ENABLE_MULTI_TENANT:
        schema_name = get_tenant_schema_name(org_id)
        # Set search path to tenant schema first, then public for shared tables
        await db.execute(text(f"SET search_path TO {schema_name}, {settings.DEFAULT_SCHEMA}"))
    else:
        # Use only public schema
        await db.execute(text(f"SET search_path TO {settings.DEFAULT_SCHEMA}"))


def set_current_tenant(org_id: Optional[str]) -> None:
    """Set the current tenant in context."""
    current_tenant.set(org_id)


def get_current_tenant() -> Optional[str]:
    """Get the current tenant from context."""
    return current_tenant.get()


def set_current_user(user_id: Optional[str]) -> None:
    """Set the current user ID in context."""
    current_user_id.set(user_id)


def get_current_user_id() -> Optional[str]:
    """Get the current user ID from context."""
    return current_user_id.get()


def clear_tenant_context() -> None:
    """Clear all tenant context variables."""
    current_tenant.set(None)
    current_user_id.set(None)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to extract tenant information from request headers.

    This middleware extracts the org-id and user-id headers from incoming
    requests and sets them in context variables for use throughout the
    request lifecycle.
    """

    async def dispatch(self, request: Request, call_next):
        # Extract tenant headers
        org_id = request.headers.get(settings.TENANT_HEADER_NAME)
        user_id = request.headers.get(settings.USER_HEADER_NAME)

        # Set context variables
        set_current_tenant(org_id)
        set_current_user(user_id)

        try:
            response = await call_next(request)
            return response
        finally:
            # Clean up context
            clear_tenant_context()


async def get_tenant_db(
    org_id: Optional[str] = Header(None, alias="org-id"),
    db: AsyncSession = Depends(get_async_db)
) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a tenant-scoped database session.

    This dependency:
    1. Extracts the org-id from request headers
    2. Sets the PostgreSQL search_path to the tenant's schema
    3. Returns the configured database session

    Args:
        org_id: Organization ID from request header
        db: Base database session from dependency injection

    Yields:
        AsyncSession: Tenant-scoped database session
    """
    if org_id:
        await set_tenant_schema(db, org_id)
        set_current_tenant(org_id)

    try:
        yield db
    finally:
        # Reset search path to public schema
        await set_tenant_schema(db, None)


async def get_public_db(
    db: AsyncSession = Depends(get_async_db)
) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a public-schema database session.

    Use this for operations on shared tables (enterprises, modules, etc.)
    that are not tenant-specific.

    Args:
        db: Base database session from dependency injection

    Yields:
        AsyncSession: Public-schema database session
    """
    await set_tenant_schema(db, None)
    yield db


def require_tenant(
    org_id: Optional[str] = Header(None, alias="org-id")
) -> str:
    """
    FastAPI dependency that requires a tenant ID.

    Raises HTTPException if org-id header is missing.

    Args:
        org_id: Organization ID from request header

    Returns:
        str: The organization ID

    Raises:
        HTTPException: 400 if org-id header is missing
    """
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="org-id header is required"
        )
    return org_id


def require_user_id(
    user_id: Optional[str] = Header(None, alias="user-id")
) -> str:
    """
    FastAPI dependency that requires a user ID.

    Raises HTTPException if user-id header is missing.

    Args:
        user_id: User ID from request header

    Returns:
        str: The user ID

    Raises:
        HTTPException: 400 if user-id header is missing
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user-id header is required"
        )
    return user_id


class TenantSchemaManager:
    """
    Service for managing tenant schemas.

    Provides methods to create, check, and delete tenant schemas
    for the multi-tenant architecture.
    """

    @staticmethod
    async def schema_exists(db: AsyncSession, org_id: str) -> bool:
        """
        Check if a tenant schema exists.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            bool: True if schema exists
        """
        schema_name = get_tenant_schema_name(org_id)
        result = await db.execute(
            text("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.schemata
                    WHERE schema_name = :schema_name
                )
            """),
            {"schema_name": schema_name}
        )
        return result.scalar()

    @staticmethod
    async def create_schema(db: AsyncSession, org_id: str) -> None:
        """
        Create a new tenant schema.

        Args:
            db: Database session
            org_id: Organization ID
        """
        schema_name = get_tenant_schema_name(org_id)
        await db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
        await db.commit()

    @staticmethod
    async def drop_schema(db: AsyncSession, org_id: str, cascade: bool = False) -> None:
        """
        Drop a tenant schema.

        Args:
            db: Database session
            org_id: Organization ID
            cascade: If True, drop all objects in the schema
        """
        schema_name = get_tenant_schema_name(org_id)
        cascade_clause = "CASCADE" if cascade else "RESTRICT"
        await db.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} {cascade_clause}"))
        await db.commit()

    @staticmethod
    async def list_schemas(db: AsyncSession) -> list[str]:
        """
        List all tenant schemas.

        Args:
            db: Database session

        Returns:
            list[str]: List of tenant schema names
        """
        result = await db.execute(
            text("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name LIKE :prefix
            """),
            {"prefix": f"{settings.TENANT_SCHEMA_PREFIX}%"}
        )
        return [row[0] for row in result.fetchall()]
