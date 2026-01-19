"""
Project Management Routes

CRUD endpoints for project management using CRUDRouter pattern.
Operates within tenant context (org_xxx schema).
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.core.tenant import get_tenant_db
from app.routes.crud_router import CRUDRouter
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSearch,
    ProjectStatistics,
)
from app.schemas.feature import PaginatedResponse
from app.services.projects.project_service import ProjectService


# Create CRUD router for standard operations
crud_router = CRUDRouter(
    service_class=ProjectService,
    schema=ProjectResponse,
    create_schema=ProjectCreate,
    update_schema=ProjectUpdate,
    prefix="",
    tags=["projects"],
    resource_name="projects",
    id_type="str",  # UUID
    exclude=["search"],  # Custom search
)

router = crud_router.get_router()


# Custom endpoints

@router.get("/search", response_model=PaginatedResponse)
async def search_projects(
    name: Optional[str] = Query(None),
    project_status: Optional[str] = Query(None, alias="status"),
    created_by: Optional[str] = Query(None, alias="createdBy"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Search projects by various criteria."""
    service = ProjectService()
    search_params = ProjectSearch(
        name=name,
        status=project_status,
        created_by=created_by
    )
    result = await service.search_projects(db, search_params, page, size)
    result.items = [ProjectResponse.model_validate(item) for item in result.items]
    return result


@router.get("/user/{user_auth0_id}", response_model=PaginatedResponse)
async def get_user_projects(
    user_auth0_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get all projects for a specific user."""
    service = ProjectService()
    result = await service.get_user_projects(db, user_auth0_id, page, size)
    result.items = [ProjectResponse.model_validate(item) for item in result.items]
    return result


@router.get("/user/{user_auth0_id}/roles-permissions")
async def get_user_projects_with_roles(
    user_auth0_id: str,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get user's projects with their roles and permissions."""
    service = ProjectService()
    return await service.get_user_projects_with_permissions(db, user_auth0_id)


@router.get("/statistics", response_model=ProjectStatistics)
async def get_project_statistics(
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:read")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Get project statistics for the organization."""
    service = ProjectService()
    return await service.get_statistics(db)


@router.post("/{project_id}/archive")
async def archive_project(
    project_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Archive a project."""
    service = ProjectService()
    project = await service.archive_project(db, str(project_id))
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return ProjectResponse.model_validate(project)


@router.post("/{project_id}/restore")
async def restore_project(
    project_id: UUID,
    org_id: str = Header(..., alias="org-id"),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("projects:write")),
    db: AsyncSession = Depends(get_tenant_db),
):
    """Restore an archived project."""
    service = ProjectService()
    project = await service.restore_project(db, str(project_id))
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return ProjectResponse.model_validate(project)
