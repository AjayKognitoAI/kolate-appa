"""
Project Service

CRUD operations and business logic for project management.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.crud_service import CRUDService

# TODO: Implement ProjectService extending CRUDService
# - get_by_status(status, page, size)
# - get_by_user(user_auth0_id)
# - get_user_projects_with_roles(user_auth0_id)
# - get_stats()


class ProjectService:
    """Project management service."""
    pass
