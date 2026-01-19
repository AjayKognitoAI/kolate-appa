from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from sqlalchemy.orm import selectinload

from app.models.role import Role, RolePermission, UserRole
from app.models.permission import Permission
from app.schemas.role import RoleCreate, RoleUpdate, RoleSearch
from app.services.crud_service import CRUDService


class RoleService(CRUDService[Role, RoleCreate, RoleUpdate, RoleSearch]):
    """
    Role service with CRUD operations, caching, and search capabilities.

    This service extends the generic CRUD service with Role-specific
    functionality and configurations including role-permission mappings.
    """

    def __init__(self):
        """Initialize Role service with specific configurations."""
        super().__init__(
            model=Role,
            cache_prefix="roles",
            default_cache_ttl=600,  # Cache roles for 10 minutes
            searchable_fields=["name", "description"],
            sortable_fields=["id", "name", "created_at", "updated_at"],
            cached_methods=["get_by_id", "get_all", "exists", "get_by_field"],
            excluded_methods=[]
        )

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Role]:
        """
        Get role by name.

        Args:
            db: Database session
            name: Role name

        Returns:
            Role instance or None if not found
        """
        return await self.get_by_field(db, "name", name)

    async def get_multiple_by_names(self, db: AsyncSession, names: List[str]) -> List[Role]:
        """
        Get multiple roles by names.

        Args:
            db: Database session
            names: List of role names

        Returns:
            List of Role instances
        """
        return await self.get_multiple_by_field(db, "name", names)

    async def get_roles_with_permissions(self, db: AsyncSession) -> List[Role]:
        """
        Get all roles with their associated permissions.

        Args:
            db: Database session

        Returns:
            List of roles with permissions loaded
        """
        query = select(Role).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await db.execute(query)
        return result.scalars().all()

    async def get_role_with_permissions(self, db: AsyncSession, role_id: int) -> Optional[Role]:
        """
        Get a specific role with its permissions.

        Args:
            db: Database session
            role_id: Role ID

        Returns:
            Role with permissions loaded or None if not found
        """
        query = select(Role).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        ).where(Role.id == role_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_role_permissions(self, db: AsyncSession, role_id: int) -> List[Permission]:
        """
        Get all permissions for a specific role.

        Args:
            db: Database session
            role_id: Role ID

        Returns:
            List of Permission instances
        """
        query = select(Permission).join(RolePermission).where(RolePermission.role_id == role_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def add_permissions_to_role(self, db: AsyncSession, role_id: int, permission_ids: List[int]) -> List[RolePermission]:
        """
        Add permissions to a role.

        Args:
            db: Database session
            role_id: Role ID
            permission_ids: List of permission IDs to add

        Returns:
            List of created RolePermission instances

        Raises:
            ValueError: If role doesn't exist or some permissions already assigned
        """
        # Check if role exists
        role = await self.get_by_id(db, role_id)
        if not role:
            raise ValueError(f"Role with ID {role_id} not found")

        # Check which permissions are already assigned
        existing_query = select(RolePermission.permission_id).where(
            and_(
                RolePermission.role_id == role_id,
                RolePermission.permission_id.in_(permission_ids)
            )
        )
        existing_result = await db.execute(existing_query)
        existing_permission_ids = [row[0] for row in existing_result.fetchall()]

        if existing_permission_ids:
            raise ValueError(f"Permissions {existing_permission_ids} are already assigned to role {role_id}")

        # Create new role-permission mappings
        role_permissions = []
        for permission_id in permission_ids:
            role_permission = RolePermission(role_id=role_id, permission_id=permission_id)
            db.add(role_permission)
            role_permissions.append(role_permission)

        await db.commit()

        # Refresh all instances
        for rp in role_permissions:
            await db.refresh(rp)

        return role_permissions

    async def remove_permissions_from_role(self, db: AsyncSession, role_id: int, permission_ids: List[int]) -> int:
        """
        Remove permissions from a role.

        Args:
            db: Database session
            role_id: Role ID
            permission_ids: List of permission IDs to remove

        Returns:
            Number of permissions removed
        """
        delete_query = delete(RolePermission).where(
            and_(
                RolePermission.role_id == role_id,
                RolePermission.permission_id.in_(permission_ids)
            )
        )
        result = await db.execute(delete_query)
        await db.commit()
        return result.rowcount

    async def set_role_permissions(self, db: AsyncSession, role_id: int, permission_ids: List[int]) -> List[RolePermission]:
        """
        Set all permissions for a role (replaces existing permissions).

        Args:
            db: Database session
            role_id: Role ID
            permission_ids: Complete list of permission IDs for the role

        Returns:
            List of RolePermission instances

        Raises:
            ValueError: If role doesn't exist
        """
        # Check if role exists
        role = await self.get_by_id(db, role_id)
        if not role:
            raise ValueError(f"Role with ID {role_id} not found")

        # Remove all existing permissions for the role
        delete_query = delete(RolePermission).where(RolePermission.role_id == role_id)
        await db.execute(delete_query)

        # Add new permissions
        role_permissions = []
        for permission_id in permission_ids:
            role_permission = RolePermission(role_id=role_id, permission_id=permission_id)
            db.add(role_permission)
            role_permissions.append(role_permission)

        await db.commit()

        # Refresh all instances
        for rp in role_permissions:
            await db.refresh(rp)

        return role_permissions

    async def get_user_roles(self, db: AsyncSession, user_id: str) -> List[Role]:
        """
        Get all roles for a specific user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            List of Role instances
        """
        query = select(Role).join(UserRole).where(UserRole.user_id == user_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def assign_roles_to_user(self, db: AsyncSession, user_id: str, role_ids: List[int]) -> List[UserRole]:
        """
        Assign roles to a user.

        Args:
            db: Database session
            user_id: User ID
            role_ids: List of role IDs to assign

        Returns:
            List of created UserRole instances

        Raises:
            ValueError: If some roles are already assigned to user
        """
        # Check which roles are already assigned
        existing_query = select(UserRole.role_id).where(
            and_(
                UserRole.user_id == user_id,
                UserRole.role_id.in_(role_ids)
            )
        )
        existing_result = await db.execute(existing_query)
        existing_role_ids = [row[0] for row in existing_result.fetchall()]

        if existing_role_ids:
            raise ValueError(f"Roles {existing_role_ids} are already assigned to user {user_id}")

        # Create new user-role mappings
        user_roles = []
        for role_id in role_ids:
            user_role = UserRole(user_id=user_id, role_id=role_id)
            db.add(user_role)
            user_roles.append(user_role)

        await db.commit()

        # Refresh all instances
        for ur in user_roles:
            await db.refresh(ur)

        return user_roles

    async def remove_roles_from_user(self, db: AsyncSession, user_id: str, role_ids: List[int]) -> int:
        """
        Remove roles from a user.

        Args:
            db: Database session
            user_id: User ID
            role_ids: List of role IDs to remove

        Returns:
            Number of roles removed
        """
        delete_query = delete(UserRole).where(
            and_(
                UserRole.user_id == user_id,
                UserRole.role_id.in_(role_ids)
            )
        )
        result = await db.execute(delete_query)
        await db.commit()
        return result.rowcount

    async def bulk_update_user_roles(
        self,
        db: AsyncSession,
        user_id: str,
        add_role_ids: List[int],
        remove_role_ids: List[int]
    ) -> dict:
        """
        Bulk update user roles - add and remove roles in a single transaction.
        Optimized to use bulk operations instead of loops.

        Args:
            db: Database session
            user_id: User ID
            add_role_ids: List of role IDs to add
            remove_role_ids: List of role IDs to remove

        Returns:
            Dictionary with counts of added and removed roles

        Raises:
            ValueError: If attempting to add roles that already exist
        """
        added_count = 0
        removed_count = 0

        # Remove roles if specified
        if remove_role_ids:
            delete_query = delete(UserRole).where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.role_id.in_(remove_role_ids)
                )
            )
            result = await db.execute(delete_query)
            removed_count = result.rowcount

        # Add roles if specified
        if add_role_ids:
            # Check which roles are already assigned (after removal)
            existing_query = select(UserRole.role_id).where(
                and_(
                    UserRole.user_id == user_id,
                    UserRole.role_id.in_(add_role_ids)
                )
            )
            existing_result = await db.execute(existing_query)
            existing_role_ids = [row[0] for row in existing_result.fetchall()]

            if existing_role_ids:
                raise ValueError(f"Roles {existing_role_ids} are already assigned to user {user_id}")

            # Bulk insert using bulk_insert_mappings for better performance
            mappings = [{"user_id": user_id, "role_id": role_id} for role_id in add_role_ids]
            await db.execute(
                UserRole.__table__.insert(),
                mappings
            )
            added_count = len(add_role_ids)

        await db.commit()

        return {
            "added": added_count,
            "removed": removed_count
        }

    async def check_name_exists(self, db: AsyncSession, name: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if role name already exists.

        Args:
            db: Database session
            name: Role name to check
            exclude_id: Role ID to exclude from check (for updates)

        Returns:
            True if name exists, False otherwise
        """
        query = select(Role.id).where(Role.name == name)

        if exclude_id:
            query = query.where(Role.id != exclude_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def create_with_validation(self, db: AsyncSession, role_in: RoleCreate) -> Role:
        """
        Create role with name uniqueness validation.

        Args:
            db: Database session
            role_in: Role creation data

        Returns:
            Created role

        Raises:
            ValueError: If role name already exists
        """
        # Check if name already exists
        if await self.check_name_exists(db, role_in.name):
            raise ValueError(f"Role with name '{role_in.name}' already exists")

        return await self.create(db, role_in)

    async def update_with_validation(
        self,
        db: AsyncSession,
        role_id: int,
        role_in: RoleUpdate
    ) -> Optional[Role]:
        """
        Update role with name uniqueness validation.

        Args:
            db: Database session
            role_id: Role ID
            role_in: Role update data

        Returns:
            Updated role or None if not found

        Raises:
            ValueError: If role name already exists for another role
        """
        # Check if name already exists for another role
        if role_in.name and await self.check_name_exists(db, role_in.name, exclude_id=role_id):
            raise ValueError(f"Role with name '{role_in.name}' already exists")

        return await self.update(db, role_id, role_in)


# Global service instance
role_service = RoleService()