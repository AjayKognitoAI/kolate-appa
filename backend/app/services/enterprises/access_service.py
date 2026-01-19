"""
Access Service

Facade for enterprise module access management.
Provides a unified interface for access control operations.
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enterprise import EnterpriseModuleAccess, Module, Enterprise
from app.schemas.enterprise import ModuleAccessCreate
from app.services.enterprises.module_access_service import ModuleAccessService


class AccessService:
    """
    Enterprise access service.

    Provides a high-level interface for managing enterprise access to modules
    and trials. Delegates to ModuleAccessService for the underlying operations.
    """

    def __init__(self):
        self._module_access_service = ModuleAccessService()

    async def grant_access(
        self,
        db: AsyncSession,
        enterprise_id: UUID,
        module_id: int,
        trial_id: Optional[int] = None,
        access_level: str = "FULL"
    ) -> EnterpriseModuleAccess:
        """
        Grant module access to an enterprise.

        Args:
            db: Database session
            enterprise_id: Enterprise UUID
            module_id: Module ID to grant access to
            trial_id: Optional specific trial ID
            access_level: Access level (FULL, LIMITED, etc.)

        Returns:
            EnterpriseModuleAccess: Created access grant
        """
        access_data = ModuleAccessCreate(
            module_id=module_id,
            trial_ids=[trial_id] if trial_id else [],
            is_active=True,
        )
        return await self._module_access_service.grant_access(
            db, str(enterprise_id), access_data
        )

    async def revoke_access(
        self,
        db: AsyncSession,
        enterprise_id: UUID,
        module_id: int
    ) -> bool:
        """
        Revoke module access from an enterprise.

        Args:
            db: Database session
            enterprise_id: Enterprise UUID
            module_id: Module ID to revoke

        Returns:
            bool: True if revoked, False if not found
        """
        # Find the access grant
        result = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.enterprise_id == enterprise_id,
                EnterpriseModuleAccess.module_id == module_id
            )
        )
        access = result.scalar_one_or_none()

        if not access:
            return False

        return await self._module_access_service.revoke_access(
            db, str(enterprise_id), str(access.id)
        )

    async def get_by_organization(
        self,
        db: AsyncSession,
        org_id: str
    ) -> List[EnterpriseModuleAccess]:
        """
        Get all module access grants for an organization.

        Args:
            db: Database session
            org_id: Organization ID

        Returns:
            List[EnterpriseModuleAccess]: List of access grants
        """
        # Find enterprise by organization_id
        result = await db.execute(
            select(Enterprise).where(Enterprise.organization_id == org_id)
        )
        enterprise = result.scalar_one_or_none()

        if not enterprise:
            return []

        return await self._module_access_service.get_by_enterprise(
            db, str(enterprise.id)
        )

    async def get_full_access(
        self,
        db: AsyncSession,
        enterprise_id: UUID
    ) -> List[Module]:
        """
        Get all modules an enterprise has full access to.

        Args:
            db: Database session
            enterprise_id: Enterprise UUID

        Returns:
            List[Module]: List of accessible modules
        """
        return await self._module_access_service.get_available_modules(
            db, str(enterprise_id)
        )

    async def check_access(
        self,
        db: AsyncSession,
        enterprise_id: UUID,
        module_id: int
    ) -> bool:
        """
        Check if an enterprise has access to a specific module.

        Args:
            db: Database session
            enterprise_id: Enterprise UUID
            module_id: Module ID to check

        Returns:
            bool: True if access granted, False otherwise
        """
        return await self._module_access_service.check_module_access(
            db, str(enterprise_id), str(module_id)
        )

    async def check_trial_access(
        self,
        db: AsyncSession,
        enterprise_id: UUID,
        module_id: int,
        trial_id: int
    ) -> bool:
        """
        Check if an enterprise has access to a specific trial within a module.

        Args:
            db: Database session
            enterprise_id: Enterprise UUID
            module_id: Module ID
            trial_id: Trial ID to check

        Returns:
            bool: True if access granted, False otherwise
        """
        result = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.enterprise_id == enterprise_id,
                EnterpriseModuleAccess.module_id == module_id,
                EnterpriseModuleAccess.is_active == True
            )
        )
        access = result.scalar_one_or_none()

        if not access:
            return False

        # If trial_ids is empty, enterprise has access to all trials
        if not access.trial_ids:
            return True

        return trial_id in access.trial_ids
