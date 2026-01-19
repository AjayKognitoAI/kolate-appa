"""
Enterprise Management Routes

CRUD endpoints for enterprise management using CRUDRouter pattern.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.routes.crud_router import CRUDRouter
from app.schemas.enterprise import (
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseResponse,
    EnterpriseStatusUpdate,
    EnterpriseSearch,
    EnterpriseStats,
    DeleteRequest,
    DomainCheck,
    OrganizationCheck,
)
from app.schemas.feature import PaginatedResponse
from app.services.enterprises.enterprise_service import EnterpriseService
from app.models.enterprise import EnterpriseStatus


# Create CRUD router for standard operations
crud_router = CRUDRouter(
    service_class=EnterpriseService,
    schema=EnterpriseResponse,
    create_schema=EnterpriseCreate,
    update_schema=EnterpriseUpdate,
    prefix="",
    tags=["enterprises"],
    resource_name="enterprises",
    id_type="str",  # UUID
    exclude=["search"],  # We'll add custom search
)

router = crud_router.get_router()


# Custom endpoints

@router.get("/organization/{org_id}", response_model=EnterpriseResponse)
async def get_by_organization(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get enterprise by Auth0 organization ID."""
    service = EnterpriseService()
    enterprise = await service.get_by_organization_id(db, org_id)
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enterprise with organization ID '{org_id}' not found"
        )
    return EnterpriseResponse.model_validate(enterprise)


@router.get("/domain/{domain}", response_model=EnterpriseResponse)
async def get_by_domain(
    domain: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get enterprise by domain."""
    service = EnterpriseService()
    enterprise = await service.get_by_domain(db, domain)
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enterprise with domain '{domain}' not found"
        )
    return EnterpriseResponse.model_validate(enterprise)


@router.get("/admin/{admin_email}", response_model=EnterpriseResponse)
async def get_by_admin_email(
    admin_email: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get enterprise by admin email."""
    service = EnterpriseService()
    enterprise = await service.get_by_admin_email(db, admin_email)
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Enterprise with admin email '{admin_email}' not found"
        )
    return EnterpriseResponse.model_validate(enterprise)


@router.get("/status/{enterprise_status}", response_model=PaginatedResponse)
async def get_by_status(
    enterprise_status: EnterpriseStatus,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get enterprises by status."""
    service = EnterpriseService()
    result = await service.get_by_status(db, enterprise_status, page, size)
    result.items = [EnterpriseResponse.model_validate(item) for item in result.items]
    return result


@router.get("/search", response_model=PaginatedResponse)
async def search_enterprises(
    name: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    enterprise_status: Optional[EnterpriseStatus] = Query(None, alias="status"),
    admin_email: Optional[str] = Query(None, alias="adminEmail"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Search enterprises by various criteria."""
    service = EnterpriseService()
    search_params = EnterpriseSearch(
        name=name,
        domain=domain,
        status=enterprise_status,
        admin_email=admin_email
    )
    result = await service.search_enterprises(db, search_params, page, size)
    result.items = [EnterpriseResponse.model_validate(item) for item in result.items]
    return result


@router.patch("/{enterprise_id}/status", response_model=EnterpriseResponse)
async def update_status(
    enterprise_id: UUID,
    status_update: EnterpriseStatusUpdate,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:write")),
    db: AsyncSession = Depends(get_async_db),
):
    """Update enterprise status only."""
    service = EnterpriseService()
    enterprise = await service.update_status(db, str(enterprise_id), status_update.status)
    if not enterprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enterprise not found"
        )
    return EnterpriseResponse.model_validate(enterprise)


@router.post("/delete-request", status_code=status.HTTP_202_ACCEPTED)
async def request_deletion(
    delete_request: DeleteRequest,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:delete")),
    db: AsyncSession = Depends(get_async_db),
):
    """Request enterprise deletion (soft delete with confirmation)."""
    service = EnterpriseService()
    await service.request_deletion(db, delete_request, current_user.id)
    return {"message": "Deletion request submitted"}


@router.get("/check/domain", response_model=DomainCheck)
async def check_domain_exists(
    domain: str = Query(...),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Check if a domain is already registered."""
    service = EnterpriseService()
    exists = await service.domain_exists(db, domain)
    return DomainCheck(domain=domain, exists=exists)


@router.get("/check/organization", response_model=OrganizationCheck)
async def check_organization_exists(
    organization_id: str = Query(..., alias="organizationId"),
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """Check if an organization ID is already registered."""
    service = EnterpriseService()
    exists = await service.organization_exists(db, organization_id)
    return OrganizationCheck(organization_id=organization_id, exists=exists)


@router.get("/stats", response_model=EnterpriseStats)
async def get_statistics(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get enterprise statistics."""
    service = EnterpriseService()
    return await service.get_statistics(db)


@router.get("/{org_id}/projects", response_model=PaginatedResponse)
async def get_enterprise_projects(
    org_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all projects for an enterprise."""
    service = EnterpriseService()
    result = await service.get_enterprise_projects(db, org_id, page, size)
    return result


@router.get("/{org_id}/projects/statistics")
async def get_project_statistics(
    org_id: str,
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("enterprises:read")),
    db: AsyncSession = Depends(get_async_db),
):
    """Get project statistics for an enterprise."""
    service = EnterpriseService()
    return await service.get_project_statistics(db, org_id)
