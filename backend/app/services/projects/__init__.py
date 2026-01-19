"""
Project Services Package

Services for managing projects, project users, project roles,
bookmarks, and notifications within tenant-specific schemas (org_xxx).
"""

from app.services.projects.project_service import ProjectService, project_service
from app.services.projects.project_user_service import (
    ProjectUserService,
    project_user_service,
)
from app.services.projects.project_role_service import (
    ProjectRoleService,
    project_role_service,
)
from app.services.projects.bookmark_service import BookmarkService
from app.services.projects.notification_service import NotificationService

__all__ = [
    "ProjectService",
    "project_service",
    "ProjectUserService",
    "project_user_service",
    "ProjectRoleService",
    "project_role_service",
    "BookmarkService",
    "NotificationService",
]
