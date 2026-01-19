"""
Project Role Management Routes

Endpoints for managing project-specific roles:
- Create, delete roles
- Manage role permissions
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.core.tenant import get_tenant_db
from app.schemas.project import (
    ProjectRoleCreate,
    ProjectRoleUpdate,
    ProjectRoleResponse,
    ProjectRoleWithPermissions,
    ProjectPermissionUpdate,
    DefaultRoleResponse,
    DefaultRoleWithPermissions,
)
from app.services.projects.project_role_service import ProjectRoleService


router = APIRouter()


# Project Roles

@router.get("/{project_id}/roles", response_model=List[ProjectRoleResponse])
async def get_project_roles(
    project_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all roles for a project."""
    service = ProjectRoleService()
    roles = await service.get_project_roles(db, str(project_id))
    return [ProjectRoleResponse.model_validate(role) for role in roles]


@router.get("/{project_id}/roles/with-permissions", response_model=List[ProjectRoleWithPermissions])
async def get_project_roles_with_permissions(
    project_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all roles for a project with their permissions."""
    service = ProjectRoleService()
    roles = await service.get_project_roles_with_permissions(db, str(project_id))
    return [ProjectRoleWithPermissions.model_validate(role) for role in roles]


@router.post(
    "/{project_id}/roles",
    response_model=ProjectRoleResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_project_role(
    project_id: UUID,
    role_data: ProjectRoleCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Create a new role for a project."""
    service = ProjectRoleService()
    role = await service.create_project_role(db, str(project_id), role_data)
    return ProjectRoleResponse.model_validate(role)


@router.delete(
    "/{project_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_project_role(
    project_id: UUID,
    role_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Delete a project role."""
    service = ProjectRoleService()
    deleted = await service.delete_project_role(db, str(project_id), str(role_id))
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )


@router.delete("/{project_id}/roles/{old_role_id}/move/{new_role_id}")
async def move_and_delete_role(
    project_id: UUID,
    old_role_id: UUID,
    new_role_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Move users from one role to another and delete the old role."""
    service = ProjectRoleService()
    success = await service.move_users_and_delete_role(
        db, str(project_id), str(old_role_id), str(new_role_id)
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to move users and delete role"
        )
    return {"message": "Users moved and role deleted successfully"}


# Role-level endpoints (without project_id in path)

@router.get("/roles/{role_id}", response_model=ProjectRoleWithPermissions)
async def get_role_with_permissions(
    role_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get a role with its permissions."""
    service = ProjectRoleService()
    role = await service.get_role_with_permissions(db, str(role_id))
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    return ProjectRoleWithPermissions.model_validate(role)


@router.put("/roles/{role_id}/permissions", response_model=ProjectRoleWithPermissions)
async def update_role_permissions(
    role_id: UUID,
    permission_data: ProjectPermissionUpdate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update permissions for a role."""
    service = ProjectRoleService()
    role = await service.update_role_permissions(db, str(role_id), permission_data.permissions)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    return ProjectRoleWithPermissions.model_validate(role)


# Default Roles (Templates)

@router.get("/default-roles", response_model=List[DefaultRoleWithPermissions])
async def get_default_roles(
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:roles:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all default role templates."""
    service = ProjectRoleService()
    roles = await service.get_default_roles(db)
    return [DefaultRoleWithPermissions.model_validate(role) for role in roles]
