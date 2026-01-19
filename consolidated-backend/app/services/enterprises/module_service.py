"""
Module Service

CRUD operations for module management.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.crud_service import CRUDService
from app.models.enterprise import Module
from app.schemas.enterprise import ModuleCreate, ModuleResponse


class ModuleService(CRUDService[Module, ModuleCreate, ModuleCreate, dict]):
    """Module management service."""

    def __init__(self):
        super().__init__(
            model=Module,
            cache_prefix="modules",
            searchable_fields=["name", "code", "description"],
            sortable_fields=["id", "name", "code", "created_at", "is_active"],
        )

    async def get_all_modules(self, db: AsyncSession) -> List[Module]:
        """Get all modules."""
        result = await db.execute(select(Module))
        return list(result.scalars().all())

    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Module]:
        """Get module by code."""
        result = await db.execute(
            select(Module).where(Module.code == code)
        )
        return result.scalar_one_or_none()

    async def get_active_modules(self, db: AsyncSession) -> List[Module]:
        """Get all active modules."""
        result = await db.execute(
            select(Module).where(Module.is_active == True)
        )
        return list(result.scalars().all())
