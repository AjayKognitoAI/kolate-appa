"""
Trial Service

CRUD operations for trial/feature management.
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.crud_service import CRUDService
from app.models.enterprise import Trial
from app.schemas.enterprise import TrialCreate, TrialResponse


class TrialService(CRUDService[Trial, TrialCreate, TrialCreate, dict]):
    """Trial management service."""

    def __init__(self):
        super().__init__(
            model=Trial,
            cache_prefix="trials",
            searchable_fields=["name", "slug", "description"],
            sortable_fields=["id", "name", "slug", "created_at", "is_active"],
        )

    async def get_by_slug(self, db: AsyncSession, slug: str) -> Optional[Trial]:
        """Get trial by slug."""
        result = await db.execute(
            select(Trial).where(Trial.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_module(self, db: AsyncSession, module_id: str) -> List[Trial]:
        """Get all trials for a module."""
        result = await db.execute(
            select(Trial).where(Trial.module_id == module_id)
        )
        return list(result.scalars().all())

    async def slug_exists(self, db: AsyncSession, slug: str) -> bool:
        """Check if a trial slug is already in use."""
        result = await db.execute(
            select(Trial.id).where(Trial.slug == slug)
        )
        return result.scalar_one_or_none() is not None

    async def set_active_status(
        self, db: AsyncSession, trial_id: str, is_active: bool
    ) -> Optional[Trial]:
        """Activate or deactivate a trial."""
        trial = await self.get_by_id(db, trial_id)
        if not trial:
            return None

        trial.is_active = is_active
        trial.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(trial)
        return trial

    async def get_active_trials(self, db: AsyncSession) -> List[Trial]:
        """Get all active trials."""
        result = await db.execute(
            select(Trial).where(Trial.is_active == True)
        )
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, obj_in: TrialCreate) -> Trial:
        """Create trial with slug uniqueness validation."""
        if await self.slug_exists(db, obj_in.slug):
            raise ValueError(f"Trial slug '{obj_in.slug}' is already in use")
        return await super().create(db, obj_in)
