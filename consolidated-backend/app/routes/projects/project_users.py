"""
Project User Management Routes

Endpoints for managing project membership:
- Add/remove users from projects
- Assign/change user roles
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.core.tenant import get_tenant_db
from app.schemas.project import (
    ProjectUserCreate,
    ProjectUserUpdate,
    ProjectUserResponse,
    ProjectUserWithRole,
)
from app.services.projects.project_user_service import ProjectUserService


router = APIRouter()


@router.get("/{project_id}/users", response_model=List[ProjectUserResponse])
async def get_project_users(
    project_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:users:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all users in a project."""
    service = ProjectUserService()
    users = await service.get_project_users(db, str(project_id))
    return [ProjectUserResponse.model_validate(user) for user in users]


@router.post(
    "/{project_id}/users",
    response_model=ProjectUserResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_user_to_project(
    project_id: UUID,
    user_data: ProjectUserCreate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:users:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Add a user to a project."""
    service = ProjectUserService()
    project_user = await service.add_user_to_project(db, str(project_id), user_data)
    return ProjectUserResponse.model_validate(project_user)


@router.delete(
    "/{project_id}/users/{user_auth0_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def remove_user_from_project(
    project_id: UUID,
    user_auth0_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:users:delete")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Remove a user from a project."""
    service = ProjectUserService()
    removed = await service.remove_user_from_project(db, str(project_id), user_auth0_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in project"
        )


@router.get("/{project_id}/users/{user_auth0_id}/role", response_model=ProjectUserWithRole)
async def get_user_project_role(
    project_id: UUID,
    user_auth0_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:users:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get a user's role in a project."""
    service = ProjectUserService()
    result = await service.get_user_project_role(db, str(project_id), user_auth0_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in project"
        )
    return ProjectUserWithRole.model_validate(result)


@router.get("/{project_id}/users/{user_auth0_id}/exists")
async def check_user_membership(
    project_id: UUID,
    user_auth0_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Check if a user is a member of a project."""
    service = ProjectUserService()
    exists = await service.is_user_in_project(db, str(project_id), user_auth0_id)
    return {"exists": exists}


@router.put("/{project_id}/users/{user_auth0_id}/role", response_model=ProjectUserResponse)
async def update_user_project_role(
    project_id: UUID,
    user_auth0_id: str,
    role_data: ProjectUserUpdate,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:users:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Update a user's role in a project."""
    service = ProjectUserService()
    project_user = await service.update_user_role(
        db, str(project_id), user_auth0_id, role_data.role_id
    )
    if not project_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in project"
        )
    return ProjectUserResponse.model_validate(project_user)
