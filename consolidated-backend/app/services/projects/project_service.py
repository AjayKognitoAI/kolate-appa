"""
Project Service

CRUD operations and business logic for project management within tenant context.
All operations occur in tenant-specific schema (org_xxx) set via search_path.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, asc, desc
from sqlalchemy.orm import selectinload

from app.services.crud_service import CRUDService
from app.models.tenant import Project, ProjectUser, ProjectStatus
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSearch,
    ProjectStatistics,
    ProjectResponse,
)
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.core.logging import get_class_logger


class ProjectService(CRUDService[Project, ProjectCreate, ProjectUpdate, ProjectSearch]):
    """
    Project management service with CRUD operations, search, and statistics.

    Extends CRUDService with project-specific functionality including:
    - User project filtering
    - Project statistics
    - Archive/restore operations
    - Permission-aware queries
    """

    def __init__(self):
        """Initialize Project service with specific configurations."""
        super().__init__(
            model=Project,
            cache_prefix="projects",
            default_cache_ttl=300,  # Cache for 5 minutes
            searchable_fields=["name", "description", "status", "created_by"],
            sortable_fields=["id", "name", "created_at", "updated_at", "status"],
            cached_methods=["get_by_id", "exists"],
            excluded_methods=[]
        )
        self.logger = get_class_logger(self.__class__)

    async def search_projects(
        self,
        db: AsyncSession,
        search_params: ProjectSearch,
        pagination: PaginationParams,
    ) -> PaginatedResponse:
        """
        Search projects with advanced filtering.

        Args:
            db: Database session (tenant schema already set)
            search_params: Search parameters (name, status, created_by)
            pagination: Pagination parameters

        Returns:
            PaginatedResponse with matching projects
        """
        self.logger.info(f"Searching projects with params: {search_params}")
        return await self.search(db, search_params, pagination)

    async def get_user_projects(
        self,
        db: AsyncSession,
        user_auth0_id: str,
        pagination: PaginationParams,
    ) -> PaginatedResponse:
        """
        Get all projects where user is a member.

        Args:
            db: Database session
            user_auth0_id: Auth0 user ID
            pagination: Pagination parameters

        Returns:
            PaginatedResponse with user's projects
        """
        self.logger.info(f"Getting projects for user: {user_auth0_id}")

        # Build query with join to project_users
        query = (
            select(Project)
            .join(ProjectUser, Project.id == ProjectUser.project_id)
            .where(ProjectUser.user_auth0_id == user_auth0_id)
        )

        # Count query
        count_query = (
            select(func.count(Project.id))
            .select_from(Project)
            .join(ProjectUser, Project.id == ProjectUser.project_id)
            .where(ProjectUser.user_auth0_id == user_auth0_id)
        )

        # Get total count
        total = await db.scalar(count_query)

        # Apply sorting
        sort_column = self._get_sort_column(pagination.sort_by)
        if sort_column is not None:
            if pagination.sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))

        # Apply pagination
        if pagination.size != -1:
            offset = (pagination.page - 1) * pagination.size
            query = query.offset(offset).limit(pagination.size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        if pagination.size == -1:
            pages = 1
            has_next = False
            has_prev = False
            page = 1
            size = total
        else:
            from math import ceil
            pages = ceil(total / pagination.size) if total > 0 else 0
            has_next = pagination.page < pages
            has_prev = pagination.page > 1
            page = pagination.page
            size = pagination.size

        return PaginatedResponse(
            items=list(items),
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev,
        )

    async def get_user_projects_with_permissions(
        self,
        db: AsyncSession,
        user_auth0_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Get all projects for a user with their role and permissions.

        Args:
            db: Database session
            user_auth0_id: Auth0 user ID

        Returns:
            List of projects with user's role and permissions
        """
        self.logger.info(f"Getting projects with permissions for user: {user_auth0_id}")

        # Query projects with user's membership and role information
        query = (
            select(Project, ProjectUser)
            .join(ProjectUser, Project.id == ProjectUser.project_id)
            .where(ProjectUser.user_auth0_id == user_auth0_id)
            .options(
                selectinload(Project.members),
                selectinload(Project.roles),
            )
        )

        result = await db.execute(query)
        rows = result.all()

        # Build response with project and role info
        projects_with_permissions = []
        for project, project_user in rows:
            project_dict = {
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "status": project.status.value,
                "created_by": project.created_by,
                "created_at": project.created_at.isoformat(),
                "updated_at": project.updated_at.isoformat(),
                "role_id": str(project_user.role_id) if project_user.role_id else None,
                "permissions": [],
            }

            # Add permissions if role exists
            if project_user.role:
                project_dict["role_name"] = project_user.role.name
                project_dict["permissions"] = [
                    {
                        "module": perm.module.value,
                        "access": perm.access_type.value,
                    }
                    for perm in project_user.role.permissions
                ]

            projects_with_permissions.append(project_dict)

        return projects_with_permissions

    async def get_statistics(self, db: AsyncSession) -> ProjectStatistics:
        """
        Get project statistics for the tenant.

        Args:
            db: Database session

        Returns:
            ProjectStatistics with counts
        """
        self.logger.info("Getting project statistics")

        # Total projects
        total_query = select(func.count(Project.id))
        total_projects = await db.scalar(total_query)

        # Active projects
        active_query = select(func.count(Project.id)).where(
            Project.status == ProjectStatus.ACTIVE
        )
        active_projects = await db.scalar(active_query)

        # Archived projects
        archived_query = select(func.count(Project.id)).where(
            Project.status == ProjectStatus.ARCHIVED
        )
        archived_projects = await db.scalar(archived_query)

        # Total unique users across all projects
        users_query = select(func.count(func.distinct(ProjectUser.user_auth0_id)))
        total_users = await db.scalar(users_query)

        return ProjectStatistics(
            total_projects=total_projects or 0,
            active_projects=active_projects or 0,
            archived_projects=archived_projects or 0,
            total_users=total_users or 0,
        )

    async def archive_project(
        self,
        db: AsyncSession,
        project_id: UUID,
    ) -> Optional[Project]:
        """
        Archive a project (soft delete).

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            Archived project or None if not found

        Raises:
            ValueError: If project is already archived
        """
        self.logger.info(f"Archiving project: {project_id}")

        project = await self.get_by_id(db, project_id)
        if not project:
            return None

        if project.status == ProjectStatus.ARCHIVED:
            raise ValueError(f"Project {project_id} is already archived")

        # Update status to archived
        project.status = ProjectStatus.ARCHIVED
        await db.commit()
        await db.refresh(project)

        return project

    async def restore_project(
        self,
        db: AsyncSession,
        project_id: UUID,
    ) -> Optional[Project]:
        """
        Restore an archived project.

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            Restored project or None if not found

        Raises:
            ValueError: If project is not archived
        """
        self.logger.info(f"Restoring project: {project_id}")

        project = await self.get_by_id(db, project_id)
        if not project:
            return None

        if project.status != ProjectStatus.ARCHIVED:
            raise ValueError(f"Project {project_id} is not archived")

        # Update status to active
        project.status = ProjectStatus.ACTIVE
        await db.commit()
        await db.refresh(project)

        return project

    async def get_by_name(
        self,
        db: AsyncSession,
        name: str,
    ) -> Optional[Project]:
        """
        Get project by name.

        Args:
            db: Database session
            name: Project name

        Returns:
            Project or None if not found
        """
        return await self.get_by_field(db, "name", name)

    async def check_name_exists(
        self,
        db: AsyncSession,
        name: str,
        exclude_id: Optional[UUID] = None,
    ) -> bool:
        """
        Check if project name already exists in tenant.

        Args:
            db: Database session
            name: Project name to check
            exclude_id: Project ID to exclude from check (for updates)

        Returns:
            True if name exists, False otherwise
        """
        query = select(Project.id).where(Project.name == name)

        if exclude_id:
            query = query.where(Project.id != exclude_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def create_with_validation(
        self,
        db: AsyncSession,
        project_in: ProjectCreate,
        created_by: str,
    ) -> Project:
        """
        Create project with name uniqueness validation.

        Args:
            db: Database session
            project_in: Project creation data
            created_by: Auth0 ID of creator

        Returns:
            Created project

        Raises:
            ValueError: If project name already exists
        """
        # Check if name already exists
        if await self.check_name_exists(db, project_in.name):
            raise ValueError(f"Project with name '{project_in.name}' already exists")

        # Create project with creator info
        project_data = project_in.model_dump()
        project_data["created_by"] = created_by
        project_data["status"] = ProjectStatus.ACTIVE

        project = Project(**project_data)
        db.add(project)
        await db.commit()
        await db.refresh(project)

        self.logger.info(f"Created project: {project.id} by {created_by}")
        return project

    async def update_with_validation(
        self,
        db: AsyncSession,
        project_id: UUID,
        project_in: ProjectUpdate,
        updated_by: str,
    ) -> Optional[Project]:
        """
        Update project with name uniqueness validation.

        Args:
            db: Database session
            project_id: Project ID
            project_in: Project update data
            updated_by: Auth0 ID of updater

        Returns:
            Updated project or None if not found

        Raises:
            ValueError: If project name already exists for another project
        """
        # Check if name already exists for another project
        if project_in.name and await self.check_name_exists(
            db, project_in.name, exclude_id=project_id
        ):
            raise ValueError(f"Project with name '{project_in.name}' already exists")

        # Get existing project
        project = await self.get_by_id(db, project_id)
        if not project:
            return None

        # Update fields
        update_data = project_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(project, field):
                setattr(project, field, value)

        project.updated_by = updated_by
        await db.commit()
        await db.refresh(project)

        self.logger.info(f"Updated project: {project_id} by {updated_by}")
        return project


# Global service instance
project_service = ProjectService()
