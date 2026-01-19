"""
Project User Service

Manages user membership and roles within projects.
All operations occur in tenant-specific schema (org_xxx).
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, delete
from sqlalchemy.orm import selectinload

from app.models.tenant import ProjectUser, ProjectRole, TenantUser, Project
from app.schemas.project import ProjectUserCreate, ProjectUserResponse
from app.core.logging import get_class_logger


class ProjectUserService:
    """
    Service for managing project user memberships and roles.

    Handles:
    - Adding/removing users from projects
    - Assigning/updating user roles
    - Querying project members
    - Checking user permissions
    """

    def __init__(self):
        """Initialize Project User service."""
        self.logger = get_class_logger(self.__class__)

    async def get_project_users(
        self,
        db: AsyncSession,
        project_id: UUID,
    ) -> List[Dict[str, Any]]:
        """
        Get all users in a project with their roles.

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            List of project users with role information
        """
        self.logger.info(f"Getting users for project: {project_id}")

        # Query project users with role and user info
        query = (
            select(ProjectUser)
            .where(ProjectUser.project_id == project_id)
            .options(
                selectinload(ProjectUser.role).selectinload(ProjectRole.permissions),
                selectinload(ProjectUser.user),
            )
        )

        result = await db.execute(query)
        project_users = result.scalars().all()

        # Build response
        users_list = []
        for pu in project_users:
            user_dict = {
                "id": str(pu.id),
                "project_id": str(pu.project_id),
                "user_auth0_id": pu.user_auth0_id,
                "role_id": str(pu.role_id) if pu.role_id else None,
                "role_name": pu.role.name if pu.role else None,
                "joined_at": pu.created_at.isoformat(),
                "user_details": None,
            }

            # Add user details if available
            if pu.user:
                user_dict["user_details"] = {
                    "email": pu.user.email,
                    "first_name": pu.user.first_name,
                    "last_name": pu.user.last_name,
                    "avatar_url": pu.user.avatar_url,
                    "status": pu.user.status.value,
                }

            users_list.append(user_dict)

        return users_list

    async def add_user_to_project(
        self,
        db: AsyncSession,
        project_id: UUID,
        user_data: ProjectUserCreate,
    ) -> ProjectUser:
        """
        Add a user to a project with optional role.

        Args:
            db: Database session
            project_id: Project ID
            user_data: User creation data (user_auth0_id, role_id)

        Returns:
            Created ProjectUser

        Raises:
            ValueError: If user is already in project or project/role doesn't exist
        """
        self.logger.info(f"Adding user {user_data.user_auth0_id} to project {project_id}")

        # Check if project exists
        project_query = select(Project).where(Project.id == project_id)
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Check if user is already in project
        existing = await self.is_user_in_project(db, project_id, user_data.user_auth0_id)
        if existing:
            raise ValueError(
                f"User {user_data.user_auth0_id} is already a member of project {project_id}"
            )

        # Validate role if provided
        if user_data.role_id:
            role_query = select(ProjectRole).where(
                and_(
                    ProjectRole.id == user_data.role_id,
                    ProjectRole.project_id == project_id,
                )
            )
            role_result = await db.execute(role_query)
            role = role_result.scalar_one_or_none()
            if not role:
                raise ValueError(
                    f"Role {user_data.role_id} not found in project {project_id}"
                )

        # Get or create tenant user (if exists)
        user_query = select(TenantUser).where(
            TenantUser.auth0_id == user_data.user_auth0_id
        )
        user_result = await db.execute(user_query)
        tenant_user = user_result.scalar_one_or_none()

        # Create project user
        project_user = ProjectUser(
            project_id=project_id,
            user_auth0_id=user_data.user_auth0_id,
            user_id=tenant_user.id if tenant_user else None,
            role_id=user_data.role_id,
        )

        db.add(project_user)
        await db.commit()
        await db.refresh(project_user)

        self.logger.info(f"Added user {user_data.user_auth0_id} to project {project_id}")
        return project_user

    async def remove_user_from_project(
        self,
        db: AsyncSession,
        project_id: UUID,
        user_auth0_id: str,
    ) -> bool:
        """
        Remove a user from a project.

        Args:
            db: Database session
            project_id: Project ID
            user_auth0_id: Auth0 user ID

        Returns:
            True if user was removed, False if not found
        """
        self.logger.info(f"Removing user {user_auth0_id} from project {project_id}")

        # Delete project user
        delete_query = delete(ProjectUser).where(
            and_(
                ProjectUser.project_id == project_id,
                ProjectUser.user_auth0_id == user_auth0_id,
            )
        )

        result = await db.execute(delete_query)
        await db.commit()

        removed = result.rowcount > 0
        if removed:
            self.logger.info(f"Removed user {user_auth0_id} from project {project_id}")
        else:
            self.logger.warning(
                f"User {user_auth0_id} not found in project {project_id}"
            )

        return removed

    async def get_user_project_role(
        self,
        db: AsyncSession,
        project_id: UUID,
        user_auth0_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get a user's role in a specific project.

        Args:
            db: Database session
            project_id: Project ID
            user_auth0_id: Auth0 user ID

        Returns:
            Role information with permissions or None if user not in project
        """
        self.logger.info(f"Getting role for user {user_auth0_id} in project {project_id}")

        # Query project user with role
        query = (
            select(ProjectUser)
            .where(
                and_(
                    ProjectUser.project_id == project_id,
                    ProjectUser.user_auth0_id == user_auth0_id,
                )
            )
            .options(selectinload(ProjectUser.role).selectinload(ProjectRole.permissions))
        )

        result = await db.execute(query)
        project_user = result.scalar_one_or_none()

        if not project_user:
            return None

        if not project_user.role:
            return {
                "role_id": None,
                "role_name": None,
                "permissions": [],
            }

        return {
            "role_id": str(project_user.role_id),
            "role_name": project_user.role.name,
            "permissions": [
                {
                    "module": perm.module.value,
                    "access": perm.access_type.value,
                }
                for perm in project_user.role.permissions
            ],
        }

    async def is_user_in_project(
        self,
        db: AsyncSession,
        project_id: UUID,
        user_auth0_id: str,
    ) -> bool:
        """
        Check if a user is a member of a project.

        Args:
            db: Database session
            project_id: Project ID
            user_auth0_id: Auth0 user ID

        Returns:
            True if user is in project, False otherwise
        """
        query = select(ProjectUser.id).where(
            and_(
                ProjectUser.project_id == project_id,
                ProjectUser.user_auth0_id == user_auth0_id,
            )
        )

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def update_user_role(
        self,
        db: AsyncSession,
        project_id: UUID,
        user_auth0_id: str,
        role_id: UUID,
    ) -> Optional[ProjectUser]:
        """
        Update a user's role in a project.

        Args:
            db: Database session
            project_id: Project ID
            user_auth0_id: Auth0 user ID
            role_id: New role ID

        Returns:
            Updated ProjectUser or None if user not found

        Raises:
            ValueError: If role doesn't exist in project
        """
        self.logger.info(
            f"Updating role for user {user_auth0_id} in project {project_id} to {role_id}"
        )

        # Validate role exists in project
        role_query = select(ProjectRole).where(
            and_(
                ProjectRole.id == role_id,
                ProjectRole.project_id == project_id,
            )
        )
        role_result = await db.execute(role_query)
        role = role_result.scalar_one_or_none()
        if not role:
            raise ValueError(f"Role {role_id} not found in project {project_id}")

        # Get project user
        query = select(ProjectUser).where(
            and_(
                ProjectUser.project_id == project_id,
                ProjectUser.user_auth0_id == user_auth0_id,
            )
        )
        result = await db.execute(query)
        project_user = result.scalar_one_or_none()

        if not project_user:
            return None

        # Update role
        project_user.role_id = role_id
        await db.commit()
        await db.refresh(project_user)

        self.logger.info(f"Updated user {user_auth0_id} role to {role_id}")
        return project_user

    async def get_user_count(
        self,
        db: AsyncSession,
        project_id: UUID,
    ) -> int:
        """
        Get the number of users in a project.

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            Count of users
        """
        query = select(func.count(ProjectUser.id)).where(
            ProjectUser.project_id == project_id
        )
        result = await db.scalar(query)
        return result or 0

    async def get_users_by_role(
        self,
        db: AsyncSession,
        project_id: UUID,
        role_id: UUID,
    ) -> List[ProjectUser]:
        """
        Get all users in a project with a specific role.

        Args:
            db: Database session
            project_id: Project ID
            role_id: Role ID

        Returns:
            List of ProjectUser instances
        """
        query = select(ProjectUser).where(
            and_(
                ProjectUser.project_id == project_id,
                ProjectUser.role_id == role_id,
            )
        )

        result = await db.execute(query)
        return result.scalars().all()

    async def bulk_add_users(
        self,
        db: AsyncSession,
        project_id: UUID,
        user_auth0_ids: List[str],
        role_id: Optional[UUID] = None,
    ) -> List[ProjectUser]:
        """
        Add multiple users to a project in bulk.

        Args:
            db: Database session
            project_id: Project ID
            user_auth0_ids: List of Auth0 user IDs
            role_id: Optional role ID for all users

        Returns:
            List of created ProjectUser instances

        Raises:
            ValueError: If any user is already in project
        """
        self.logger.info(f"Bulk adding {len(user_auth0_ids)} users to project {project_id}")

        # Check if project exists
        project_query = select(Project).where(Project.id == project_id)
        project_result = await db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        # Check for existing memberships
        existing_query = select(ProjectUser.user_auth0_id).where(
            and_(
                ProjectUser.project_id == project_id,
                ProjectUser.user_auth0_id.in_(user_auth0_ids),
            )
        )
        existing_result = await db.execute(existing_query)
        existing_users = [row[0] for row in existing_result.fetchall()]

        if existing_users:
            raise ValueError(
                f"Users {existing_users} are already members of project {project_id}"
            )

        # Create project users
        project_users = []
        for user_auth0_id in user_auth0_ids:
            # Get tenant user if exists
            user_query = select(TenantUser).where(
                TenantUser.auth0_id == user_auth0_id
            )
            user_result = await db.execute(user_query)
            tenant_user = user_result.scalar_one_or_none()

            project_user = ProjectUser(
                project_id=project_id,
                user_auth0_id=user_auth0_id,
                user_id=tenant_user.id if tenant_user else None,
                role_id=role_id,
            )
            db.add(project_user)
            project_users.append(project_user)

        await db.commit()

        # Refresh all instances
        for pu in project_users:
            await db.refresh(pu)

        self.logger.info(f"Added {len(project_users)} users to project {project_id}")
        return project_users


# Global service instance
project_user_service = ProjectUserService()
