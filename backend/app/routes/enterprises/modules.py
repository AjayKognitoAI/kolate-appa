"""
Module Access Management Routes

Endpoints for managing enterprise module access and module definitions.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.enterprise import (
    ModuleCreate,
    ModuleResponse,
    ModuleAccessCreate,
    ModuleAccessResponse,
)
from app.schemas.feature import PaginatedResponse
from app.services.enterprises.module_service import ModuleService
from app.services.enterprises.module_access_service import ModuleAccessService


router = APIRouter()


# Module Definition Routes

@router.get("/modules", response_model=List[ModuleResponse])
async def get_all_modules(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("modules:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all available modules."""
    service = ModuleService()
    modules = await service.get_all_modules(db)
    return [ModuleResponse.model_validate(module) for module in modules]


@router.get("/modules/{module_id}", response_model=ModuleResponse)
async def get_module(
    module_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("modules:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get a specific module by ID."""
    service = ModuleService()
    module = await service.get_by_id(db, str(module_id))
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    return ModuleResponse.model_validate(module)


@router.post(
    "/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_module(
    module_data: ModuleCreate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("modules:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Create a new module."""
    service = ModuleService()
    module = await service.create(db, module_data)
    return ModuleResponse.model_validate(module)


# Module Access Routes (per enterprise)

@router.get("/{enterprise_id}/modules", response_model=List[ModuleAccessResponse])
async def get_enterprise_module_access(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:modules:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all module access grants for an enterprise."""
    service = ModuleAccessService()
    access_list = await service.get_by_enterprise(db, str(enterprise_id))
    return [ModuleAccessResponse.model_validate(access) for access in access_list]


@router.post(
    "/{enterprise_id}/modules",
    response_model=ModuleAccessResponse,
    status_code=status.HTTP_201_CREATED
)
async def grant_module_access(
    enterprise_id: UUID,
    access_data: ModuleAccessCreate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:modules:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Grant module access to an enterprise."""
    service = ModuleAccessService()
    access = await service.grant_access(db, str(enterprise_id), access_data)
    return ModuleAccessResponse.model_validate(access)


@router.delete(
    "/{enterprise_id}/modules/{access_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def revoke_module_access(
    enterprise_id: UUID,
    access_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:modules:delete")),
    db: AsyncSession = Depends(get_async_db),
):
    """Revoke module access from an enterprise."""
    service = ModuleAccessService()
    revoked = await service.revoke_access(db, str(enterprise_id), str(access_id))
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module access not found"
        )


@router.get("/{enterprise_id}/modules/available", response_model=List[ModuleResponse])
async def get_available_modules(
    enterprise_id: UUID,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:modules:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get modules available to an enterprise (granted access)."""
    service = ModuleAccessService()
    modules = await service.get_available_modules(db, str(enterprise_id))
    return [ModuleResponse.model_validate(module) for module in modules]
