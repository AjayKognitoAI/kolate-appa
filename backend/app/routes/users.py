from typing import List
from fastapi import Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_async_db
from app.schemas.user import UserResponse, UserUpdate, UserCreate, UserSearch
from app.schemas.role import RoleOut, UserRoleCreate, UserRoleRemove, UserRoleBulkUpdate, UserRoleUpdateResponse
from app.services.user_service import UserService, user_service
from app.services.role_service import role_service
from app.core.permissions import get_current_user, has_permissions
from app.routes.crud_router import CRUDRouter

# Create CRUDRouter instance for users with permissions
crud_router = CRUDRouter(
    service_class=UserService,
    schema=UserResponse,
    create_schema=UserCreate,
    update_schema=UserUpdate,
    search_schema=UserSearch,
    resource_name="users",
    prefix="",
    tags=[],
    include_only=["get_all", "get_by_id", "update", "delete", "search", "count", "self_get_all", "self_get", "self_update", "self_patch", "self_delete"],
    enable_self_endpoints=True,
    access_verification_method="verify_user_access",
    id_type="str"
)

router = crud_router.get_router()

# User-Role mapping endpoints

@router.get(
    "/{user_id}/roles",
    response_model=List[RoleOut],
    summary="Get User Roles",
    description="Get all roles assigned to a specific user"
)
async def get_user_roles(
    user_id: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:read"))
):
    """Get all roles for a specific user."""
    roles = await role_service.get_user_roles(db, user_id)
    return roles


@router.post(
    "/{user_id}/roles",
    response_model=dict,
    summary="Assign Roles to User",
    description="Assign one or more roles to a user"
)
async def assign_roles_to_user(
    user_id: str,
    role_data: UserRoleCreate = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:write"))
):
    """Assign roles to a user."""
    try:
        user_roles = await role_service.assign_roles_to_user(
            db, user_id, role_data.role_ids
        )
        return {
            "message": f"Successfully assigned {len(user_roles)} roles to user {user_id}",
            "assigned_roles": len(user_roles)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/{user_id}/roles",
    response_model=dict,
    summary="Remove Roles from User",
    description="Remove one or more roles from a user"
)
async def remove_roles_from_user(
    user_id: str,
    role_data: UserRoleRemove = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:write"))
):
    """Remove roles from a user."""
    removed_count = await role_service.remove_roles_from_user(
        db, user_id, role_data.role_ids
    )
    return {
        "message": f"Successfully removed {removed_count} roles from user {user_id}",
        "removed_roles": removed_count
    }


@router.put(
    "/{user_id}/roles",
    response_model=UserRoleUpdateResponse,
    summary="Bulk Update User Roles",
    description="Add and/or remove multiple roles from a user in a single request"
)
async def bulk_update_user_roles(
    user_id: str,
    role_data: UserRoleBulkUpdate = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(has_permissions("roles:write"))
):
    """
    Bulk update user roles - add and remove roles in a single transaction.

    This endpoint allows you to add and remove roles simultaneously,
    which is useful for updating a user's complete role set efficiently.
    Optimized for bulk operations to handle large numbers of roles efficiently.
    """
    try:
        result = await role_service.bulk_update_user_roles(
            db, user_id, role_data.add_role_ids, role_data.remove_role_ids
        )
        return UserRoleUpdateResponse(
            message=f"Successfully updated roles for user {user_id}",
            added_roles=result["added"],
            removed_roles=result["removed"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )