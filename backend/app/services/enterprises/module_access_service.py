"""
Module Access Service

Business logic for enterprise module access management.
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enterprise import EnterpriseModuleAccess, Module, Enterprise
from app.schemas.enterprise import ModuleAccessCreate, ModuleResponse


class ModuleAccessService:
    """Enterprise module access service."""

    async def get_by_enterprise(
        self, db: AsyncSession, enterprise_id: str
    ) -> List[EnterpriseModuleAccess]:
        """Get all module access grants for an enterprise."""
        result = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.enterprise_id == enterprise_id
            )
        )
        return list(result.scalars().all())

    async def grant_access(
        self, db: AsyncSession, enterprise_id: str, access_data: ModuleAccessCreate
    ) -> EnterpriseModuleAccess:
        """Grant module access to an enterprise."""
        # Check if access already exists
        existing = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.enterprise_id == enterprise_id,
                EnterpriseModuleAccess.module_id == access_data.module_id
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Module access already granted")

        access = EnterpriseModuleAccess(
            enterprise_id=enterprise_id,
            module_id=access_data.module_id,
            trial_ids=access_data.trial_ids,
            is_active=access_data.is_active,
            granted_at=datetime.utcnow(),
        )
        db.add(access)
        await db.commit()
        await db.refresh(access)
        return access

    async def revoke_access(
        self, db: AsyncSession, enterprise_id: str, access_id: str
    ) -> bool:
        """Revoke module access from an enterprise."""
        result = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.id == access_id,
                EnterpriseModuleAccess.enterprise_id == enterprise_id
            )
        )
        access = result.scalar_one_or_none()
        if not access:
            return False

        await db.delete(access)
        await db.commit()
        return True

    async def get_available_modules(
        self, db: AsyncSession, enterprise_id: str
    ) -> List[Module]:
        """Get modules available to an enterprise (granted access)."""
        # Get all access grants for the enterprise
        result = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.enterprise_id == enterprise_id,
                EnterpriseModuleAccess.is_active == True
            )
        )
        access_grants = result.scalars().all()

        if not access_grants:
            return []

        # Get the actual module objects
        module_ids = [str(grant.module_id) for grant in access_grants]
        result = await db.execute(
            select(Module).where(Module.id.in_(module_ids))
        )
        return list(result.scalars().all())

    async def check_module_access(
        self, db: AsyncSession, enterprise_id: str, module_id: str
    ) -> bool:
        """Check if an enterprise has access to a module."""
        result = await db.execute(
            select(EnterpriseModuleAccess).where(
                EnterpriseModuleAccess.enterprise_id == enterprise_id,
                EnterpriseModuleAccess.module_id == module_id,
                EnterpriseModuleAccess.is_active == True
            )
        )
        return result.scalar_one_or_none() is not None
