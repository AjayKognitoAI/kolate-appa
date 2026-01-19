"""
Project Role Service

Manages project-specific roles and their permissions.
All operations occur in tenant-specific schema (org_xxx).
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, func
from sqlalchemy.orm import selectinload

from app.models.tenant import (
    ProjectRole,
    ProjectPermission,
    DefaultRole,
    DefaultPermission,
    Project,
    ProjectUser,
    ModuleType,
    AccessType,
)
from app.schemas.project import (
    ProjectRoleCreate,
    ProjectRoleUpdate,
    ProjectPermissionBase,
)
from app.core.logging import get_class_logger


class ProjectRoleService:
    """
    Service for managing project roles and permissions.

    Handles:
    - Creating/deleting project roles
    - Managing role permissions
    - Applying default role templates
    - Role migration when deleting
    """

    def __init__(self):
        """Initialize Project Role service."""
        self.logger = get_class_logger(self.__class__)

    async def get_project_roles(
        self,
        db: AsyncSession,
        project_id: UUID,
    ) -> List[ProjectRole]:
        """
        Get all roles for a project.

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            List of ProjectRole instances
        """
        self.logger.info(f"Getting roles for project: {project_id}")

        query = select(ProjectRole).where(ProjectRole.project_id == project_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_project_roles_with_permissions(
        self,
        db: AsyncSession,
        project_id: UUID,
    ) -> List[Dict[str, Any]]:
        """
        Get all roles for a project with their permissions.

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            List of roles with permissions
        """
        self.logger.info(f"Getting roles with permissions for project: {project_id}")

        query = (
            select(ProjectRole)
            .where(ProjectRole.project_id == project_id)
            .options(selectinload(ProjectRole.permissions))
        )

        result = await db.execute(query)
        roles = result.scalars().all()

        # Build response
        roles_list = []
        for role in roles:
            role_dict = {
                "id": str(role.id),
                "project_id": str(role.project_id),
                "name": role.name,
                "description": role.description,
                "default_role_id": str(role.default_role_id) if role.default_role_id else None,
                "created_at": role.created_at.isoformat(),
                "updated_at": role.updated_at.isoformat(),
                "permissions": [
                    {
                        "id": str(perm.id),
                        "module": perm.module.value,
                        "access": perm.access_type.value,
                    }
                    for perm in role.permissions
                ],
            }
            roles_list.append(role_dict)

        return roles_list

    async def create_project_role(
        self,
        db: AsyncSession,
        project_id: UUID,
        role_data: ProjectRoleCreate,
    ) -> ProjectRole:
        """
        Create a new project role with permissions.

        Args:
            db: Database session
            project_id: Project ID
            role_data: Role creation data

        Returns:
            Created ProjectRole

        Raises:
            ValueError: If project doesn't exist or role name already exists
        """
        self.logger.info(f"Creating role '{role_data.name}' for project {project_id}")

        # Check if project exists
        project_query = select(Project).where(Project.id == project_id)
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Check if role name already exists in project
        existing_query = select(ProjectRole).where(
            and_(
                ProjectRole.project_id == project_id,
                ProjectRole.name == role_data.name,
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise ValueError(
                f"Role with name '{role_data.name}' already exists in project {project_id}"
            )

        # Create role
        role = ProjectRole(
            project_id=project_id,
            name=role_data.name,
            description=role_data.description,
        )

        db.add(role)
        await db.flush()  # Flush to get role ID

        # Add permissions if provided
        if role_data.permissions:
            for perm_data in role_data.permissions:
                permission = ProjectPermission(
                    role_id=role.id,
                    module=perm_data.module,
                    access_type=perm_data.access,
                )
                db.add(permission)

        await db.commit()
        await db.refresh(role)

        self.logger.info(f"Created role {role.id} for project {project_id}")
        return role

    async def delete_project_role(
        self,
        db: AsyncSession,
        project_id: UUID,
        role_id: UUID,
    ) -> bool:
        """
        Delete a project role.

        Args:
            db: Database session
            project_id: Project ID
            role_id: Role ID

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If role is in use by project members
        """
        self.logger.info(f"Deleting role {role_id} from project {project_id}")

        # Check if role exists
        role_query = select(ProjectRole).where(
            and_(
                ProjectRole.id == role_id,
                ProjectRole.project_id == project_id,
            )
        )
        role_result = await db.execute(role_query)
        role = role_result.scalar_one_or_none()
        if not role:
            return False

        # Check if role is in use
        users_query = select(func.count(ProjectUser.id)).where(
            ProjectUser.role_id == role_id
        )
        users_count = await db.scalar(users_query)
        if users_count > 0:
            raise ValueError(
                f"Cannot delete role {role_id}: it is assigned to {users_count} user(s). "
                "Please reassign users first using move_users_and_delete_role."
            )

        # Delete role (permissions cascade delete automatically)
        await db.delete(role)
        await db.commit()

        self.logger.info(f"Deleted role {role_id}")
        return True

    async def move_users_and_delete_role(
        self,
        db: AsyncSession,
        project_id: UUID,
        old_role_id: UUID,
        new_role_id: UUID,
    ) -> Dict[str, int]:
        """
        Move all users from one role to another, then delete the old role.

        Args:
            db: Database session
            project_id: Project ID
            old_role_id: Role to delete
            new_role_id: Role to move users to

        Returns:
            Dictionary with counts of moved users

        Raises:
            ValueError: If roles don't exist or are the same
        """
        self.logger.info(
            f"Moving users from role {old_role_id} to {new_role_id} in project {project_id}"
        )

        if old_role_id == new_role_id:
            raise ValueError("Old and new role IDs cannot be the same")

        # Validate both roles exist in project
        roles_query = select(ProjectRole).where(
            and_(
                ProjectRole.project_id == project_id,
                ProjectRole.id.in_([old_role_id, new_role_id]),
            )
        )
        roles_result = await db.execute(roles_query)
        roles = roles_result.scalars().all()

        if len(roles) != 2:
            raise ValueError("One or both roles not found in project")

        # Get users with old role
        users_query = select(ProjectUser).where(ProjectUser.role_id == old_role_id)
        users_result = await db.execute(users_query)
        users = users_result.scalars().all()

        # Move users to new role
        moved_count = 0
        for user in users:
            user.role_id = new_role_id
            moved_count += 1

        await db.flush()

        # Delete old role
        old_role = next(r for r in roles if r.id == old_role_id)
        await db.delete(old_role)
        await db.commit()

        self.logger.info(
            f"Moved {moved_count} users and deleted role {old_role_id}"
        )

        return {
            "moved_users": moved_count,
            "deleted_role_id": str(old_role_id),
        }

    async def get_role_with_permissions(
        self,
        db: AsyncSession,
        role_id: UUID,
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific role with its permissions.

        Args:
            db: Database session
            role_id: Role ID

        Returns:
            Role with permissions or None if not found
        """
        self.logger.info(f"Getting role {role_id} with permissions")

        query = (
            select(ProjectRole)
            .where(ProjectRole.id == role_id)
            .options(selectinload(ProjectRole.permissions))
        )

        result = await db.execute(query)
        role = result.scalar_one_or_none()

        if not role:
            return None

        return {
            "id": str(role.id),
            "project_id": str(role.project_id),
            "name": role.name,
            "description": role.description,
            "default_role_id": str(role.default_role_id) if role.default_role_id else None,
            "created_at": role.created_at.isoformat(),
            "updated_at": role.updated_at.isoformat(),
            "permissions": [
                {
                    "id": str(perm.id),
                    "module": perm.module.value,
                    "access": perm.access_type.value,
                }
                for perm in role.permissions
            ],
        }

    async def update_role_permissions(
        self,
        db: AsyncSession,
        role_id: UUID,
        permissions: List[ProjectPermissionBase],
    ) -> ProjectRole:
        """
        Update all permissions for a role (replaces existing).

        Args:
            db: Database session
            role_id: Role ID
            permissions: New list of permissions

        Returns:
            Updated ProjectRole

        Raises:
            ValueError: If role doesn't exist
        """
        self.logger.info(f"Updating permissions for role {role_id}")

        # Get role
        role_query = select(ProjectRole).where(ProjectRole.id == role_id)
        role_result = await db.execute(role_query)
        role = role_result.scalar_one_or_none()
        if not role:
            raise ValueError(f"Role {role_id} not found")

        # Delete existing permissions
        delete_query = delete(ProjectPermission).where(
            ProjectPermission.role_id == role_id
        )
        await db.execute(delete_query)

        # Add new permissions
        for perm_data in permissions:
            permission = ProjectPermission(
                role_id=role_id,
                module=perm_data.module,
                access_type=perm_data.access,
            )
            db.add(permission)

        await db.commit()
        await db.refresh(role)

        self.logger.info(f"Updated {len(permissions)} permissions for role {role_id}")
        return role

    async def get_default_roles(
        self,
        db: AsyncSession,
    ) -> List[Dict[str, Any]]:
        """
        Get all default role templates with permissions.

        Args:
            db: Database session

        Returns:
            List of default roles with permissions
        """
        self.logger.info("Getting default role templates")

        query = select(DefaultRole).options(
            selectinload(DefaultRole.permissions)
        )

        result = await db.execute(query)
        default_roles = result.scalars().all()

        # Build response
        roles_list = []
        for role in default_roles:
            role_dict = {
                "id": str(role.id),
                "name": role.name,
                "description": role.description,
                "created_at": role.created_at.isoformat(),
                "permissions": [
                    {
                        "module": perm.module.value,
                        "access": perm.access_type.value,
                    }
                    for perm in role.permissions
                ],
            }
            roles_list.append(role_dict)

        return roles_list

    async def apply_default_role_permissions(
        self,
        db: AsyncSession,
        role_id: UUID,
        default_role_id: UUID,
    ) -> ProjectRole:
        """
        Apply permissions from a default role template to a project role.

        Args:
            db: Database session
            role_id: Project role ID
            default_role_id: Default role template ID

        Returns:
            Updated ProjectRole

        Raises:
            ValueError: If role or default role doesn't exist
        """
        self.logger.info(
            f"Applying default role {default_role_id} permissions to role {role_id}"
        )

        # Get project role
        role_query = select(ProjectRole).where(ProjectRole.id == role_id)
        role_result = await db.execute(role_query)
        role = role_result.scalar_one_or_none()
        if not role:
            raise ValueError(f"Role {role_id} not found")

        # Get default role with permissions
        default_query = (
            select(DefaultRole)
            .where(DefaultRole.id == default_role_id)
            .options(selectinload(DefaultRole.permissions))
        )
        default_result = await db.execute(default_query)
        default_role = default_result.scalar_one_or_none()
        if not default_role:
            raise ValueError(f"Default role {default_role_id} not found")

        # Delete existing permissions
        delete_query = delete(ProjectPermission).where(
            ProjectPermission.role_id == role_id
        )
        await db.execute(delete_query)

        # Copy permissions from default role
        for default_perm in default_role.permissions:
            permission = ProjectPermission(
                role_id=role_id,
                module=default_perm.module,
                access_type=default_perm.access_type,
            )
            db.add(permission)

        # Update default_role_id reference
        role.default_role_id = default_role_id
        await db.commit()
        await db.refresh(role)

        self.logger.info(
            f"Applied {len(default_role.permissions)} permissions from default role"
        )
        return role

    async def create_role_from_default(
        self,
        db: AsyncSession,
        project_id: UUID,
        default_role_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> ProjectRole:
        """
        Create a new project role based on a default role template.

        Args:
            db: Database session
            project_id: Project ID
            default_role_id: Default role template ID
            name: Optional custom name (uses default role name if not provided)
            description: Optional custom description

        Returns:
            Created ProjectRole

        Raises:
            ValueError: If project or default role doesn't exist
        """
        self.logger.info(
            f"Creating role from default {default_role_id} for project {project_id}"
        )

        # Check if project exists
        project_query = select(Project).where(Project.id == project_id)
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Get default role with permissions
        default_query = (
            select(DefaultRole)
            .where(DefaultRole.id == default_role_id)
            .options(selectinload(DefaultRole.permissions))
        )
        default_result = await db.execute(default_query)
        default_role = default_result.scalar_one_or_none()
        if not default_role:
            raise ValueError(f"Default role {default_role_id} not found")

        # Use default name if not provided
        role_name = name or default_role.name
        role_description = description or default_role.description

        # Check if role name already exists in project
        existing_query = select(ProjectRole).where(
            and_(
                ProjectRole.project_id == project_id,
                ProjectRole.name == role_name,
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise ValueError(
                f"Role with name '{role_name}' already exists in project {project_id}"
            )

        # Create role
        role = ProjectRole(
            project_id=project_id,
            name=role_name,
            description=role_description,
            default_role_id=default_role_id,
        )

        db.add(role)
        await db.flush()  # Flush to get role ID

        # Copy permissions from default role
        for default_perm in default_role.permissions:
            permission = ProjectPermission(
                role_id=role.id,
                module=default_perm.module,
                access_type=default_perm.access_type,
            )
            db.add(permission)

        await db.commit()
        await db.refresh(role)

        self.logger.info(f"Created role {role.id} from default role {default_role_id}")
        return role


# Global service instance
project_role_service = ProjectRoleService()
