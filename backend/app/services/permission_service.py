from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.permission import Permission
from app.schemas.permission import PermissionCreate, PermissionUpdate, PermissionSearch
from app.services.crud_service import CRUDService


class PermissionService(CRUDService[Permission, PermissionCreate, PermissionUpdate, PermissionSearch]):
    """
    Permission service with CRUD operations, caching, and search capabilities.

    This service extends the generic CRUD service with Permission-specific
    functionality and configurations.
    """

    def __init__(self):
        """Initialize Permission service with specific configurations."""
        super().__init__(
            model=Permission,
            cache_prefix="permissions",
            default_cache_ttl=600,  # Cache permissions for 10 minutes
            searchable_fields=["code"],
            sortable_fields=["id", "code", "created_at", "updated_at"],
            cached_methods=["get_by_id", "get_all", "exists", "get_by_field"],
            excluded_methods=[]
        )

    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Permission]:
        """
        Get permission by code.

        Args:
            db: Database session
            code: Permission code

        Returns:
            Permission instance or None if not found
        """
        return await self.get_by_field(db, "code", code)

    async def get_multiple_by_codes(self, db: AsyncSession, codes: List[str]) -> List[Permission]:
        """
        Get multiple permissions by codes.

        Args:
            db: Database session
            codes: List of permission codes

        Returns:
            List of Permission instances
        """
        return await self.get_multiple_by_field(db, "code", codes)

    async def get_permissions_with_details(self, db: AsyncSession) -> List[Permission]:
        """
        Get all permissions with their associated feature and action details.

        Args:
            db: Database session

        Returns:
            List of permissions with feature and action loaded
        """
        query = select(Permission).options(
            selectinload(Permission.feature),
            selectinload(Permission.action)
        )
        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_feature_and_action(
        self,
        db: AsyncSession,
        feature_id: int,
        action_id: int
    ) -> Optional[Permission]:
        """
        Get permission by feature and action IDs.

        Args:
            db: Database session
            feature_id: Feature ID
            action_id: Action ID

        Returns:
            Permission instance or None if not found
        """
        query = select(Permission).where(
            Permission.feature_id == feature_id,
            Permission.action_id == action_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_feature_id(self, db: AsyncSession, feature_id: int) -> List[Permission]:
        """
        Get all permissions for a specific feature.

        Args:
            db: Database session
            feature_id: Feature ID

        Returns:
            List of Permission instances
        """
        return await self.get_multiple_by_field(db, "feature_id", [feature_id])

    async def get_by_action_id(self, db: AsyncSession, action_id: int) -> List[Permission]:
        """
        Get all permissions for a specific action.

        Args:
            db: Database session
            action_id: Action ID

        Returns:
            List of Permission instances
        """
        return await self.get_multiple_by_field(db, "action_id", [action_id])

    async def check_code_exists(self, db: AsyncSession, code: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if permission code already exists.

        Args:
            db: Database session
            code: Permission code to check
            exclude_id: Permission ID to exclude from check (for updates)

        Returns:
            True if code exists, False otherwise
        """
        query = select(Permission.id).where(Permission.code == code)

        if exclude_id:
            query = query.where(Permission.id != exclude_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def check_feature_action_exists(
        self,
        db: AsyncSession,
        feature_id: int,
        action_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """
        Check if permission with feature and action combination already exists.

        Args:
            db: Database session
            feature_id: Feature ID
            action_id: Action ID
            exclude_id: Permission ID to exclude from check (for updates)

        Returns:
            True if combination exists, False otherwise
        """
        query = select(Permission.id).where(
            Permission.feature_id == feature_id,
            Permission.action_id == action_id
        )

        if exclude_id:
            query = query.where(Permission.id != exclude_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def create_with_validation(self, db: AsyncSession, permission_in: PermissionCreate) -> Permission:
        """
        Create permission with validation.

        Args:
            db: Database session
            permission_in: Permission creation data

        Returns:
            Created permission

        Raises:
            ValueError: If permission code already exists or feature/action combination exists
        """
        # Check if code already exists
        if await self.check_code_exists(db, permission_in.code):
            raise ValueError(f"Permission with code '{permission_in.code}' already exists")

        # Check if feature/action combination already exists
        if await self.check_feature_action_exists(db, permission_in.feature_id, permission_in.action_id):
            raise ValueError(f"Permission for feature {permission_in.feature_id} and action {permission_in.action_id} already exists")

        return await self.create(db, permission_in)

    async def update_with_validation(
        self,
        db: AsyncSession,
        permission_id: int,
        permission_in: PermissionUpdate
    ) -> Optional[Permission]:
        """
        Update permission with validation.

        Args:
            db: Database session
            permission_id: Permission ID
            permission_in: Permission update data

        Returns:
            Updated permission or None if not found

        Raises:
            ValueError: If permission code already exists or feature/action combination exists
        """
        # Check if code already exists for another permission
        if permission_in.code and await self.check_code_exists(db, permission_in.code, exclude_id=permission_id):
            raise ValueError(f"Permission with code '{permission_in.code}' already exists")

        # Check if feature/action combination already exists for another permission
        if permission_in.feature_id and permission_in.action_id:
            if await self.check_feature_action_exists(db, permission_in.feature_id, permission_in.action_id, exclude_id=permission_id):
                raise ValueError(f"Permission for feature {permission_in.feature_id} and action {permission_in.action_id} already exists")

        return await self.update(db, permission_id, permission_in)

    async def create_bulk_with_validation(self, db: AsyncSession, permissions_in: List[PermissionCreate]) -> List[Permission]:
        """
        Create multiple permissions in bulk with validation.

        Args:
            db: Database session
            permissions_in: List of permission creation data

        Returns:
            List of created permissions

        Raises:
            ValueError: If duplicate codes or feature/action combinations in request or already exist
        """
        # Validate that all codes are unique within the request
        codes = [p.code for p in permissions_in]
        if len(codes) != len(set(codes)):
            raise ValueError("Duplicate permission codes in request")

        # Validate that all feature/action combinations are unique within the request
        combinations = [(p.feature_id, p.action_id) for p in permissions_in]
        if len(combinations) != len(set(combinations)):
            raise ValueError("Duplicate feature/action combinations in request")

        # Check if any codes or combinations already exist in database
        for permission_in in permissions_in:
            if await self.check_code_exists(db, permission_in.code):
                raise ValueError(f"Permission with code '{permission_in.code}' already exists")

            if await self.check_feature_action_exists(db, permission_in.feature_id, permission_in.action_id):
                raise ValueError(f"Permission for feature {permission_in.feature_id} and action {permission_in.action_id} already exists")

        # Use the parent's bulk creation method
        return await self.create_bulk(db, permissions_in)


# Global service instance
permission_service = PermissionService()