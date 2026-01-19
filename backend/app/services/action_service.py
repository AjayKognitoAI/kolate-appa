from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action import Action
from app.schemas.action import ActionCreate, ActionUpdate, ActionSearch
from app.services.crud_service import CRUDService


class ActionService(CRUDService[Action, ActionCreate, ActionUpdate, ActionSearch]):
    """
    Action service with CRUD operations, caching, and search capabilities.

    This service extends the generic CRUD service with Action-specific
    functionality and configurations.
    """

    def __init__(self):
        """Initialize Action service with specific configurations."""
        super().__init__(
            model=Action,
            cache_prefix="actions",
            default_cache_ttl=600,  # Cache actions for 10 minutes
            searchable_fields=["name", "description"],
            sortable_fields=["id", "name", "created_at", "updated_at"],
            cached_methods=["get_by_id", "get_all", "exists"],
            excluded_methods=[]  # Can exclude specific methods if needed
        )

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Action]:
        """
        Get action by name.

        Args:
            db: Database session
            name: Action name

        Returns:
            Action instance or None if not found
        """
        return await self.get_by_field(db, "name", name)

    async def get_multiple_by_names(self, db: AsyncSession, names: List[str]) -> List[Action]:
        """
        Get multiple actions by names.

        Args:
            db: Database session
            names: List of action names

        Returns:
            List of Action instances
        """
        return await self.get_multiple_by_field(db, "name", names)

    async def check_name_exists(self, db: AsyncSession, name: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if action name already exists.

        Args:
            db: Database session
            name: Action name to check
            exclude_id: Action ID to exclude from check (for updates)

        Returns:
            True if name exists, False otherwise
        """
        from sqlalchemy import select, and_

        query = select(Action.id).where(Action.name == name)

        if exclude_id:
            query = query.where(Action.id != exclude_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def create_with_validation(self, db: AsyncSession, action_in: ActionCreate) -> Action:
        """
        Create action with name uniqueness validation.

        Args:
            db: Database session
            action_in: Action creation data

        Returns:
            Created action

        Raises:
            ValueError: If action name already exists
        """
        # Check if name already exists
        if await self.check_name_exists(db, action_in.name):
            raise ValueError(f"Action with name '{action_in.name}' already exists")

        return await self.create(db, action_in)

    async def update_with_validation(
        self,
        db: AsyncSession,
        action_id: int,
        action_in: ActionUpdate
    ) -> Optional[Action]:
        """
        Update action with name uniqueness validation.

        Args:
            db: Database session
            action_id: Action ID
            action_in: Action update data

        Returns:
            Updated action or None if not found

        Raises:
            ValueError: If action name already exists for another action
        """
        # Check if name already exists for another action
        if action_in.name and await self.check_name_exists(db, action_in.name, exclude_id=action_id):
            raise ValueError(f"Action with name '{action_in.name}' already exists")

        return await self.update(db, action_id, action_in)

    async def create_bulk_with_validation(self, db: AsyncSession, actions_in: List[ActionCreate]) -> List[Action]:
        """
        Create multiple actions in bulk with name uniqueness validation.

        Args:
            db: Database session
            actions_in: List of action creation data

        Returns:
            List of created actions

        Raises:
            ValueError: If duplicate names in request or names already exist
        """
        # Validate that all names are unique within the request
        names = [a.name for a in actions_in]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate action names in request")

        # Check if any names already exist in database
        for action_in in actions_in:
            if await self.check_name_exists(db, action_in.name):
                raise ValueError(f"Action with name '{action_in.name}' already exists")

        # Use the parent's bulk creation method
        return await self.create_bulk(db, actions_in)


# Global service instance
action_service = ActionService()