"""
Admin Service

CRUD operations for enterprise administrator management.
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.crud_service import CRUDService
from app.models.enterprise import Admin
from app.schemas.enterprise import AdminCreate, AdminResponse


class AdminService(CRUDService[Admin, AdminCreate, AdminCreate, dict]):
    """Enterprise admin management service."""

    def __init__(self):
        super().__init__(
            model=Admin,
            cache_prefix="admins",
            searchable_fields=["email", "name"],
            sortable_fields=["id", "email", "created_at", "is_primary"],
        )

    async def create_admin(
        self, db: AsyncSession, enterprise_id: str, admin_data: AdminCreate
    ) -> Admin:
        """Add an admin to an enterprise."""
        # Check if admin with this email already exists for the enterprise
        existing = await self.get_admin_by_email(db, enterprise_id, admin_data.email)
        if existing:
            raise ValueError(f"Admin with email '{admin_data.email}' already exists")

        # Create admin
        admin = Admin(
            enterprise_id=enterprise_id,
            email=admin_data.email,
            name=admin_data.name,
            is_primary=admin_data.is_primary,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        return admin

    async def get_admins_by_enterprise(
        self, db: AsyncSession, enterprise_id: str
    ) -> List[Admin]:
        """Get all admins for an enterprise."""
        result = await db.execute(
            select(Admin).where(Admin.enterprise_id == enterprise_id)
        )
        return list(result.scalars().all())

    async def get_admin_by_email(
        self, db: AsyncSession, enterprise_id: str, email: str
    ) -> Optional[Admin]:
        """Get admin by email within an enterprise."""
        result = await db.execute(
            select(Admin).where(
                Admin.enterprise_id == enterprise_id,
                Admin.email == email
            )
        )
        return result.scalar_one_or_none()

    async def delete_admin(
        self, db: AsyncSession, enterprise_id: str, admin_id: str
    ) -> bool:
        """Remove an admin from an enterprise."""
        admin = await self.get_by_id(db, admin_id)
        if not admin or str(admin.enterprise_id) != enterprise_id:
            return False

        # Don't allow deleting the last primary admin
        if admin.is_primary:
            admins = await self.get_admins_by_enterprise(db, enterprise_id)
            primary_count = sum(1 for a in admins if a.is_primary)
            if primary_count <= 1:
                raise ValueError("Cannot delete the last primary admin")

        await db.delete(admin)
        await db.commit()
        return True

    async def set_primary_admin(
        self, db: AsyncSession, enterprise_id: str, admin_id: str
    ) -> Optional[Admin]:
        """Set an admin as the primary admin for the enterprise."""
        admin = await self.get_by_id(db, admin_id)
        if not admin or str(admin.enterprise_id) != enterprise_id:
            return None

        # Remove primary status from other admins
        admins = await self.get_admins_by_enterprise(db, enterprise_id)
        for a in admins:
            if a.is_primary and str(a.id) != admin_id:
                a.is_primary = False

        # Set this admin as primary
        admin.is_primary = True
        await db.commit()
        await db.refresh(admin)
        return admin
