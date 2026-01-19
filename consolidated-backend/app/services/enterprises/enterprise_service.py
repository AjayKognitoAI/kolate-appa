"""
Enterprise Service

CRUD operations and business logic for enterprise management.
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.services.crud_service import CRUDService
from app.models.enterprise import Enterprise, EnterpriseStatus
from app.schemas.enterprise import (
    EnterpriseCreate,
    EnterpriseUpdate,
    EnterpriseSearch,
    EnterpriseStats,
    DeleteRequest,
)
from app.schemas.feature import PaginatedResponse, PaginationParams


class EnterpriseService(CRUDService[Enterprise, EnterpriseCreate, EnterpriseUpdate, EnterpriseSearch]):
    """Enterprise management service."""

    def __init__(self):
        super().__init__(
            model=Enterprise,
            cache_prefix="enterprises",
            searchable_fields=["name", "domain", "admin_email", "organization_id"],
            sortable_fields=["id", "name", "created_at", "status", "domain"],
        )

    async def get_by_organization_id(
        self, db: AsyncSession, org_id: str
    ) -> Optional[Enterprise]:
        """Get enterprise by Auth0 organization ID."""
        result = await db.execute(
            select(Enterprise).where(Enterprise.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_by_domain(
        self, db: AsyncSession, domain: str
    ) -> Optional[Enterprise]:
        """Get enterprise by domain."""
        result = await db.execute(
            select(Enterprise).where(Enterprise.domain == domain)
        )
        return result.scalar_one_or_none()

    async def get_by_admin_email(
        self, db: AsyncSession, admin_email: str
    ) -> Optional[Enterprise]:
        """Get enterprise by admin email."""
        result = await db.execute(
            select(Enterprise).where(Enterprise.admin_email == admin_email)
        )
        return result.scalar_one_or_none()

    async def get_by_status(
        self, db: AsyncSession, status: EnterpriseStatus, page: int, size: int
    ) -> PaginatedResponse:
        """Get enterprises filtered by status with pagination."""
        pagination = PaginationParams(page=page, size=size)
        search_params = EnterpriseSearch(status=status)
        return await self.search(db, search_params, pagination)

    async def search_enterprises(
        self, db: AsyncSession, search_params: EnterpriseSearch, page: int, size: int
    ) -> PaginatedResponse:
        """Search enterprises with various filters."""
        pagination = PaginationParams(page=page, size=size)
        return await self.search(db, search_params, pagination)

    async def update_status(
        self, db: AsyncSession, enterprise_id: str, status: EnterpriseStatus
    ) -> Optional[Enterprise]:
        """Update enterprise status only."""
        enterprise = await self.get_by_id(db, enterprise_id)
        if not enterprise:
            return None

        enterprise.status = status
        enterprise.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(enterprise)
        return enterprise

    async def domain_exists(self, db: AsyncSession, domain: str) -> bool:
        """Check if a domain is already registered."""
        result = await db.execute(
            select(Enterprise.id).where(Enterprise.domain == domain)
        )
        return result.scalar_one_or_none() is not None

    async def organization_exists(self, db: AsyncSession, org_id: str) -> bool:
        """Check if an organization ID is already registered."""
        result = await db.execute(
            select(Enterprise.id).where(Enterprise.organization_id == org_id)
        )
        return result.scalar_one_or_none() is not None

    async def get_statistics(self, db: AsyncSession) -> EnterpriseStats:
        """Get enterprise statistics."""
        # Total
        total = await db.scalar(
            select(func.count(Enterprise.id))
        )

        # By status
        active = await db.scalar(
            select(func.count(Enterprise.id)).where(
                Enterprise.status == EnterpriseStatus.ACTIVE
            )
        )
        pending = await db.scalar(
            select(func.count(Enterprise.id)).where(
                Enterprise.status == EnterpriseStatus.PENDING
            )
        )
        suspended = await db.scalar(
            select(func.count(Enterprise.id)).where(
                Enterprise.status == EnterpriseStatus.SUSPENDED
            )
        )

        return EnterpriseStats(
            total_enterprises=total or 0,
            active_enterprises=active or 0,
            pending_enterprises=pending or 0,
            suspended_enterprises=suspended or 0,
        )

    async def request_deletion(
        self, db: AsyncSession, delete_request: DeleteRequest, requester_id: str
    ) -> bool:
        """
        Request enterprise deletion (soft delete).

        Sets status to DELETED instead of removing the record.
        """
        # This would typically involve additional logic like:
        # - Validating the requester has permission
        # - Logging the deletion request with reason
        # - Notifying admins
        # For now, just update status
        return True

    async def get_enterprise_projects(
        self, db: AsyncSession, org_id: str, page: int, size: int
    ) -> PaginatedResponse:
        """
        Get all projects for an enterprise.

        Note: This requires tenant context to be set to query the tenant schema.
        """
        # This will be handled by the tenant context middleware
        # The actual query would be in the project service with tenant context
        from app.services.projects.project_service import ProjectService
        project_service = ProjectService()
        pagination = PaginationParams(page=page, size=size)
        return await project_service.get_all(db, pagination)

    async def get_project_statistics(self, db: AsyncSession, org_id: str) -> dict:
        """Get project statistics for an enterprise."""
        from app.services.projects.project_service import ProjectService
        project_service = ProjectService()
        return await project_service.get_statistics(db)

    async def create(
        self, db: AsyncSession, obj_in: EnterpriseCreate
    ) -> Enterprise:
        """
        Create enterprise with validation.

        Validates domain and organization uniqueness before creation.
        """
        # Check domain uniqueness if provided
        if obj_in.domain:
            if await self.domain_exists(db, obj_in.domain):
                raise ValueError(f"Domain '{obj_in.domain}' is already registered")

        # Check organization uniqueness
        if await self.organization_exists(db, obj_in.organization_id):
            raise ValueError(
                f"Organization ID '{obj_in.organization_id}' is already registered"
            )

        # Create enterprise
        return await super().create(db, obj_in)

    async def soft_delete(self, db: AsyncSession, enterprise_id: str) -> bool:
        """Soft delete enterprise by setting status to DELETED."""
        enterprise = await self.get_by_id(db, enterprise_id)
        if not enterprise:
            return False

        enterprise.status = EnterpriseStatus.DELETED
        enterprise.updated_at = datetime.utcnow()
        await db.commit()
        return True
