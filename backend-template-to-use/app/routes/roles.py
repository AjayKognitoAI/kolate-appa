from typing import List
from fastapi import Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions
from app.models.user import User
from app.schemas.role import (
    RoleOut, RoleCreate, RoleUpdate, RolePatch, RoleSearch,
    RolePermissionCreate, RolePermissionRemove, RolePermissionBulkUpdate,
    RoleWithPermissions, RoleWithDetailedPermissions
)
from app.schemas.permission import PermissionOut
from app.services.role_service import RoleService, role_service
from app.routes.crud_router import CRUDRouter

# Create the CRUD router for roles
role_crud_router = CRUDRouter(
    service_class=RoleService,
    schema=RoleOut,
    create_schema=RoleCreate,
    update_schema=RoleUpdate,
    patch_schema=RolePatch,
    search_schema=RoleSearch,
    prefix="",
    tags=[],
    resource_name="roles",
    include_only=["get_all", "get_by_id", "create", "update", "search", "count", "delete"]
)

# Get the router instance
router = role_crud_router.get_router()

# Add custom routes specific to roles and role-permission mappings

@router.get(
    "/{role_id}/permissions",
    response_model=List[PermissionOut],
    summary="Get Role Permissions",
    description="Get all permissions assigned to a specific role"
)
async def get_role_permissions(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:read"))
):
    """Get all permissions for a specific role."""
    permissions = await role_service.get_role_permissions(db, role_id)
    return permissions


@router.get(
    "/{role_id}/with-permissions",
    response_model=RoleWithPermissions,
    summary="Get Role with Permissions",
    description="Get a role with all its assigned permissions"
)
async def get_role_with_permissions(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:read"))
):
    """Get a role with its permissions."""
    role = await role_service.get_role_with_permissions(db, role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Convert role_permissions to permissions list for the response
    permissions = [rp.permission for rp in role.role_permissions]
    return RoleWithPermissions(
        id=role.id,
        name=role.name,
        description=role.description,
        permissions=permissions
    )


@router.post(
    "/{role_id}/permissions",
    response_model=dict,
    summary="Add Permissions to Role",
    description="Add one or more permissions to a role"
)
async def add_permissions_to_role(
    role_id: int,
    permission_data: RolePermissionCreate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:write"))
):
    """Add permissions to a role."""
    try:
        role_permissions = await role_service.add_permissions_to_role(
            db, role_id, permission_data.permission_ids
        )
        return {
            "message": f"Successfully added {len(role_permissions)} permissions to role {role_id}",
            "added_permissions": len(role_permissions)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{role_id}/permissions",
    response_model=dict,
    summary="Remove Permissions from Role",
    description="Remove one or more permissions from a role"
)
async def remove_permissions_from_role(
    role_id: int,
    permission_data: RolePermissionRemove = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:write"))
):
    """Remove permissions from a role."""
    removed_count = await role_service.remove_permissions_from_role(
        db, role_id, permission_data.permission_ids
    )
    return {
        "message": f"Successfully removed {removed_count} permissions from role {role_id}",
        "removed_permissions": removed_count
    }


@router.put(
    "/{role_id}/permissions",
    response_model=dict,
    summary="Set Role Permissions",
    description="Set the complete list of permissions for a role (replaces existing permissions)"
)
async def set_role_permissions(
    role_id: int,
    permission_data: RolePermissionBulkUpdate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:write"))
):
    """Set all permissions for a role (replaces existing permissions)."""
    try:
        role_permissions = await role_service.set_role_permissions(
            db, role_id, permission_data.permission_ids
        )
        return {
            "message": f"Successfully set {len(role_permissions)} permissions for role {role_id}",
            "total_permissions": len(role_permissions)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )




# Export the router
__all__ = ["router"]