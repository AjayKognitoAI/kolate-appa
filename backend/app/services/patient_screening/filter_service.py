"""
Filter Service for Patient Screening

Business logic for saved filter CRUD operations.
Filters can be reused across cohorts and shared as templates.
Extends CRUDService for integration with CRUDRouter.
"""

from typing import List, Optional, Tuple, Dict, Any, Union
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models.tenant.patient_screening import Filter
from app.schemas.patient_screening.filter_schemas import (
    SavedFilterCreate,
    SavedFilterUpdate,
    SavedFilterResponse,
)
from app.services.crud_service import CRUDService
from app.core.logging import get_class_logger


class FilterService(CRUDService[Filter, SavedFilterCreate, SavedFilterUpdate, Dict[str, Any]]):
    """
    Business logic for filter operations.

    Extends CRUDService for standard CRUD with:
    - Template filter support
    - Search and pagination
    - Filter duplication
    """

    def __init__(self):
        super().__init__(
            model=Filter,
            cache_prefix="patient_screening_filter",
            default_cache_ttl=300,
            searchable_fields=["name", "description"],
            sortable_fields=["id", "name", "is_template", "created_at", "updated_at"],
        )

    # Override CREATE to handle filter data conversion
    async def create(
        self,
        db: AsyncSession,
        obj_in: SavedFilterCreate,
        user_id: Optional[str] = None,
    ) -> Filter:
        """
        Create a new saved filter.

        Args:
            db: Database session
            obj_in: SavedFilterCreate schema
            user_id: ID of the user creating the filter

        Returns:
            Created Filter model
        """
        saved_filter = Filter(
            name=obj_in.name,
            description=obj_in.description,
            filter=obj_in.filter.model_dump() if obj_in.filter else None,
            is_template=obj_in.is_template,
            created_by=user_id,
        )

        db.add(saved_filter)
        await db.commit()
        await db.refresh(saved_filter)

        self.logger.info(f"Created filter {saved_filter.id}: {saved_filter.name}")
        return saved_filter

    # Override UPDATE to handle filter data conversion
    async def update(
        self,
        db: AsyncSession,
        obj_id: Any,
        obj_in: Union[SavedFilterUpdate, Dict[str, Any]],
    ) -> Optional[Filter]:
        """
        Update a filter.

        Args:
            db: Database session
            obj_id: Filter ID (UUID)
            obj_in: SavedFilterUpdate schema

        Returns:
            Updated Filter model or None if not found
        """
        saved_filter = await db.get(Filter, obj_id)
        if not saved_filter:
            return None

        # Convert to dict if needed
        if hasattr(obj_in, "model_dump"):
            update_data = obj_in.model_dump(exclude_unset=True)
        else:
            update_data = dict(obj_in)

        # Handle filter field - convert FilterGroup to dict
        if "filter" in update_data and update_data["filter"]:
            if hasattr(update_data["filter"], "model_dump"):
                update_data["filter"] = update_data["filter"].model_dump()

        # Apply updates
        for field, value in update_data.items():
            if value is not None and hasattr(saved_filter, field):
                setattr(saved_filter, field, value)

        await db.commit()
        await db.refresh(saved_filter)

        self.logger.info(f"Updated filter {obj_id}")
        return saved_filter

    # Custom method: Get filter model by ID
    async def get_filter_model(self, db: AsyncSession, filter_id: UUID) -> Optional[Filter]:
        """
        Get filter model by ID.

        Args:
            db: Database session
            filter_id: UUID of the filter

        Returns:
            Filter model or None if not found
        """
        return await db.get(Filter, filter_id)

    # Custom method: Search filters with additional filters
    async def search_filters(
        self,
        db: AsyncSession,
        page: int = 0,
        size: int = 20,
        include_templates: bool = True,
        search: Optional[str] = None,
    ) -> Tuple[List[SavedFilterResponse], int]:
        """
        Search filters with pagination.

        Args:
            db: Database session
            page: Page number (0-indexed)
            size: Page size
            include_templates: Whether to include template filters
            search: Optional search term for name/description

        Returns:
            Tuple of (filters list, total count)
        """
        # Base query
        query = select(Filter)

        # Apply template filter
        if not include_templates:
            query = query.where(Filter.is_template == False)

        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                (Filter.name.ilike(search_pattern))
                | (Filter.description.ilike(search_pattern))
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and sorting
        query = query.order_by(desc(Filter.created_at))
        query = query.offset(page * size).limit(size)

        result = await db.execute(query)
        filters = list(result.scalars().all())

        return [SavedFilterResponse.model_validate(f) for f in filters], total

    # Custom method: Get template filters
    async def get_templates(self, db: AsyncSession) -> List[SavedFilterResponse]:
        """
        Get all template filters.

        Args:
            db: Database session

        Returns:
            List of template filters
        """
        query = select(Filter).where(Filter.is_template == True).order_by(Filter.name)

        result = await db.execute(query)
        filters = list(result.scalars().all())

        return [SavedFilterResponse.model_validate(f) for f in filters]

    # Custom method: Duplicate filter
    async def duplicate_filter(
        self,
        db: AsyncSession,
        filter_id: UUID,
        new_name: str,
        user_id: str,
    ) -> Optional[SavedFilterResponse]:
        """
        Duplicate an existing filter.

        Args:
            db: Database session
            filter_id: UUID of the filter to duplicate
            new_name: Name for the new filter
            user_id: ID of the user creating the duplicate

        Returns:
            New SavedFilterResponse or None if original not found
        """
        # Get original filter
        original = await db.get(Filter, filter_id)
        if not original:
            return None

        # Create duplicate
        duplicate = Filter(
            name=new_name,
            description=original.description,
            filter=original.filter,
            is_template=False,  # Duplicates are not templates by default
            created_by=user_id,
        )

        db.add(duplicate)
        await db.commit()
        await db.refresh(duplicate)

        self.logger.info(f"Duplicated filter {filter_id} as {duplicate.id}")
        return SavedFilterResponse.model_validate(duplicate)
