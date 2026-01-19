"""
Enterprise Admin Management Routes

Endpoints for managing enterprise administrators.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.enterprise import AdminCreate, AdminResponse
from app.services.enterprises.admin_service import AdminService


router = APIRouter()


@router.post(
    "/{enterprise_id}/admins",
    response_model=AdminResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_admin(
    enterprise_id: UUID,
    admin_data: AdminCreate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:admin:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Add an administrator to an enterprise."""
    service = AdminService()
    admin = await service.create_admin(db, str(enterprise_id), admin_data)
    return AdminResponse.model_validate(admin)


@router.get("/{enterprise_id}/admins", response_model=List[AdminResponse])
async def get_enterprise_admins(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:admin:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all administrators for an enterprise."""
    service = AdminService()
    admins = await service.get_admins_by_enterprise(db, str(enterprise_id))
    return [AdminResponse.model_validate(admin) for admin in admins]


@router.get("/{enterprise_id}/admins/{admin_id}", response_model=AdminResponse)
async def get_admin(
    enterprise_id: UUID,
    admin_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:admin:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get a specific administrator."""
    service = AdminService()
    admin = await service.get_by_id(db, str(admin_id))
    if not admin or str(admin.enterprise_id) != str(enterprise_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    return AdminResponse.model_validate(admin)


@router.delete(
    "/{enterprise_id}/admins/{admin_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def remove_admin(
    enterprise_id: UUID,
    admin_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:admin:delete")),
    db: AsyncSession = Depends(get_async_db),
):
    """Remove an administrator from an enterprise."""
    service = AdminService()
    deleted = await service.delete_admin(db, str(enterprise_id), str(admin_id))
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )


@router.put("/{enterprise_id}/admins/{admin_id}/primary")
async def set_primary_admin(
    enterprise_id: UUID,
    admin_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:admin:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Set an admin as the primary admin for the enterprise."""
    service = AdminService()
    admin = await service.set_primary_admin(db, str(enterprise_id), str(admin_id))
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    return AdminResponse.model_validate(admin)
