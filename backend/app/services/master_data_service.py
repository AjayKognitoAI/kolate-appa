from typing import Optional, List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.orm import selectinload, joinedload

from app.services.crud_service import CRUDService
from app.models.master_data import MasterData, MasterDataLocale
from app.schemas.master_data import (
    MasterDataCreate,
    MasterDataUpdate,
    MasterDataSearch,
    MasterDataLocaleCreate,
    MasterDataLocaleUpdate,
    MasterDataWithLocaleOut
)
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.core.logging import get_class_logger
from math import ceil
from sqlalchemy.exc import IntegrityError
from app.exceptions.base import BusinessLogicError


class MasterDataService(CRUDService[MasterData, MasterDataCreate, MasterDataUpdate, MasterDataSearch]):
    """
    Specialized service for master data with locale support.
    """

    def __init__(self):
        super().__init__(
            model=MasterData,
            cache_prefix="master_data",
            default_cache_ttl=600,  # Longer cache for master data
            searchable_fields=["scope", "code", "display_name", "parent_scope", "parent_code"],
            sortable_fields=["id", "scope", "code", "display_name", "sort_order", "created_at"],
            cached_methods=["get_by_id", "get_all", "search", "count"]
        )
        self.logger = get_class_logger(self.__class__)

    def _apply_locale_filter_to_query(self, query, locale: Optional[str]):
        """Apply locale filtering to query for localized results."""
        if locale:
            # Join with locale table and filter by locale
            query = query.outerjoin(
                MasterDataLocale,
                and_(
                    MasterData.id == MasterDataLocale.master_id,
                    MasterDataLocale.locale == locale
                )
            ).options(selectinload(MasterData.locales))
        else:
            query = query.options(selectinload(MasterData.locales))
        return query

    async def get_all(
        self,
        db: AsyncSession,
        pagination: PaginationParams,
        locale: Optional[str] = None
    ) -> PaginatedResponse:
        """Get paginated list of master data with optional locale filtering."""
        # Build base query
        query = select(self.model)
        query = self._apply_locale_filter_to_query(query, locale)

        # Get total count
        count_query = select(func.count(self.model.id)).select_from(self.model)
        if locale:
            count_query = count_query.outerjoin(
                MasterDataLocale,
                and_(
                    MasterData.id == MasterDataLocale.master_id,
                    MasterDataLocale.locale == locale
                )
            )
        total = await db.scalar(count_query)

        # Apply sorting
        sort_column = self._get_sort_column(pagination.sort_by)
        if sort_column is not None:
            if pagination.sort_order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

        # Apply pagination
        if pagination.size != -1:
            offset = (pagination.page - 1) * pagination.size
            query = query.offset(offset).limit(pagination.size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().unique().all()

        # Calculate pagination info
        pages = ceil(total / pagination.size) if total > 0 else 0
        has_next = pagination.page < pages
        has_prev = pagination.page > 1

        return PaginatedResponse(
            items=list(items),
            total=total,
            page=pagination.page,
            size=pagination.size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev
        )

    async def search(
        self,
        db: AsyncSession,
        search_params: Union[MasterDataSearch, Dict[str, Any]],
        pagination: PaginationParams,
        locale: Optional[str] = None
    ) -> PaginatedResponse:
        """Search master data with filters and pagination."""
        # Convert SearchSchemaType to dict if needed
        if hasattr(search_params, 'model_dump'):
            search_dict = search_params.model_dump(exclude_unset=True)
        elif hasattr(search_params, 'dict'):
            search_dict = search_params.dict(exclude_unset=True)
        else:
            search_dict = search_params

        # Build search filters
        filters = self._build_search_filters(search_dict)

        # Build base query
        query = select(self.model)
        query = self._apply_locale_filter_to_query(query, locale)

        count_query = select(func.count(self.model.id)).select_from(self.model)
        if locale:
            count_query = count_query.outerjoin(
                MasterDataLocale,
                and_(
                    MasterData.id == MasterDataLocale.master_id,
                    MasterDataLocale.locale == locale
                )
            )

        # Apply filters
        if filters:
            filter_condition = and_(*filters)
            query = query.where(filter_condition)
            count_query = count_query.where(filter_condition)

        # Get total count
        total = await db.scalar(count_query)

        # Apply sorting
        sort_column = self._get_sort_column(pagination.sort_by)
        if sort_column is not None:
            if pagination.sort_order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())

        # Apply pagination
        if pagination.size != -1:
            offset = (pagination.page - 1) * pagination.size
            query = query.offset(offset).limit(pagination.size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().unique().all()

        # Calculate pagination info
        pages = ceil(total / pagination.size) if total > 0 else 0
        has_next = pagination.page < pages
        has_prev = pagination.page > 1

        return PaginatedResponse(
            items=list(items),
            total=total,
            page=pagination.page,
            size=pagination.size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev
        )

    async def get_by_id_with_locale(
        self,
        db: AsyncSession,
        master_id: int,
        locale: Optional[str] = None
    ) -> Optional[MasterDataWithLocaleOut]:
        """Get master data by ID with locale-specific values."""
        # Base query with eager loading of locales
        query = select(MasterData).where(MasterData.id == master_id).options(selectinload(MasterData.locales))
        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            return None

        # Find locale-specific values
        localized_display_name = master_data.display_name
        localized_description = master_data.description
        used_locale = None

        if locale and master_data.locales:
            for locale_entry in master_data.locales:
                if locale_entry.locale == locale:
                    localized_display_name = locale_entry.display_name
                    localized_description = locale_entry.description
                    used_locale = locale
                    break

        return MasterDataWithLocaleOut(
            id=master_data.id,
            scope=master_data.scope,
            code=master_data.code,
            display_name=localized_display_name,
            parent_scope=master_data.parent_scope,
            parent_code=master_data.parent_code,
            description=localized_description,
            is_active=master_data.is_active,
            sort_order=master_data.sort_order,
            locale=used_locale
        )

    # Locale management methods
    async def create_locale(
        self,
        db: AsyncSession,
        master_id: int,
        locale_data: MasterDataLocaleCreate
    ) -> Optional[MasterDataLocale]:
        """Create a new locale entry for master data."""
        # Check if master data exists
        master_data = await self.get_by_id(db, master_id)
        if not master_data:
            return None

        try:
            # Create locale entry
            locale_obj = MasterDataLocale(
                master_id=master_id,
                locale=locale_data.locale,
                display_name=locale_data.display_name,
                description=locale_data.description
            )

            db.add(locale_obj)
            await db.commit()
            await db.refresh(locale_obj)
            return locale_obj

        except IntegrityError as e:
            await db.rollback()

            # Check if it's the unique constraint violation for locale
            if "uq_master_data_locale_master_locale" in str(e.orig):
                raise BusinessLogicError(
                    f"Locale '{locale_data.locale}' already exists for master data {master_id}",
                    constraint="unique_master_locale"
                )

            # Re-raise if it's a different integrity error
            raise BusinessLogicError(f"Database constraint violation: {str(e.orig)}")

    async def update_locale(
        self,
        db: AsyncSession,
        locale_id: int,
        locale_data: MasterDataLocaleUpdate
    ) -> Optional[MasterDataLocale]:
        """Update a locale entry."""
        locale_obj = await db.get(MasterDataLocale, locale_id)
        if not locale_obj:
            return None

        # Update fields
        update_data = locale_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(locale_obj, field):
                setattr(locale_obj, field, value)

        await db.commit()
        await db.refresh(locale_obj)
        return locale_obj

    async def delete_locale(
        self,
        db: AsyncSession,
        locale_id: int
    ) -> bool:
        """Delete a locale entry."""
        locale_obj = await db.get(MasterDataLocale, locale_id)
        if not locale_obj:
            return False

        await db.delete(locale_obj)
        await db.commit()
        return True

    async def get_locales_by_master_id(
        self,
        db: AsyncSession,
        master_id: int
    ) -> List[MasterDataLocale]:
        """Get all locale entries for a master data."""
        query = select(MasterDataLocale).where(MasterDataLocale.master_id == master_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_locale_by_master_and_locale(
        self,
        db: AsyncSession,
        master_id: int,
        locale: str
    ) -> Optional[MasterDataLocale]:
        """Get a specific locale entry for master data."""
        query = select(MasterDataLocale).where(
            and_(
                MasterDataLocale.master_id == master_id,
                MasterDataLocale.locale == locale
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_scope_and_code(
        self,
        db: AsyncSession,
        scope: str,
        code: str,
        locale: Optional[str] = None
    ) -> Optional[MasterDataWithLocaleOut]:
        """Get master data by scope and code with optional locale."""
        query = select(MasterData).where(
            and_(MasterData.scope == scope, MasterData.code == code)
        ).options(selectinload(MasterData.locales))

        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            return None

        # Apply locale logic similar to get_by_id_with_locale
        localized_display_name = master_data.display_name
        localized_description = master_data.description
        used_locale = None

        if locale and master_data.locales:
            for locale_entry in master_data.locales:
                if locale_entry.locale == locale:
                    localized_display_name = locale_entry.display_name
                    localized_description = locale_entry.description
                    used_locale = locale
                    break

        return MasterDataWithLocaleOut(
            id=master_data.id,
            scope=master_data.scope,
            code=master_data.code,
            display_name=localized_display_name,
            parent_scope=master_data.parent_scope,
            parent_code=master_data.parent_code,
            description=localized_description,
            is_active=master_data.is_active,
            sort_order=master_data.sort_order,
            locale=used_locale
        )

    async def get_by_scope(
        self,
        db: AsyncSession,
        scope: str,
        pagination: PaginationParams,
        locale: Optional[str] = None
    ) -> PaginatedResponse:
        """Get all master data entries for a specific scope."""
        search_params = MasterDataSearch(scope=scope)
        return await self.search(db, search_params, pagination, locale)

    async def get_by_id_with_all_locales(
        self,
        db: AsyncSession,
        master_id: int
    ) -> Optional[MasterData]:
        """Get master data by ID with all locale entries eagerly loaded."""
        from sqlalchemy.orm import selectinload
        from sqlalchemy import select

        query = select(MasterData).where(MasterData.id == master_id).options(selectinload(MasterData.locales))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_all_scopes(self, db: AsyncSession) -> List[str]:
        """Get all unique active scopes available in master data."""
        from sqlalchemy import select, distinct

        query = select(distinct(MasterData.scope)).where(MasterData.is_active == True).order_by(MasterData.scope)
        result = await db.execute(query)
        scopes = result.scalars().all()
        return list(scopes)

    async def get_locale_by_id(
        self,
        db: AsyncSession,
        locale_id: int
    ) -> Optional[MasterDataLocale]:
        """Get locale entry by ID."""
        return await db.get(MasterDataLocale, locale_id)

    # Override create method to handle unique constraint violations
    async def create(self, db: AsyncSession, obj_in: MasterDataCreate) -> MasterData:
        """
        Create new master data with proper error handling for unique constraints.
        """
        try:
            return await super().create(db, obj_in)
        except IntegrityError as e:
            await db.rollback()

            # Check if it's the unique constraint violation we expect
            if "uq_master_data_scope_code" in str(e.orig):
                raise BusinessLogicError(
                    f"Master data with scope '{obj_in.scope}' and code '{obj_in.code}' already exists",
                    constraint="unique_scope_code"
                )

            # Re-raise if it's a different integrity error
            raise BusinessLogicError(f"Database constraint violation: {str(e.orig)}")

    async def create_bulk(self, db: AsyncSession, objects_in: List[MasterDataCreate]) -> List[MasterData]:
        """
        Create multiple master data entries with proper error handling.
        """
        try:
            return await super().create_bulk(db, objects_in)
        except IntegrityError as e:
            await db.rollback()

            # Check if it's the unique constraint violation
            if "uq_master_data_scope_code" in str(e.orig):
                raise BusinessLogicError(
                    "One or more master data entries have duplicate scope/code combinations",
                    constraint="unique_scope_code"
                )

            # Re-raise if it's a different integrity error
            raise BusinessLogicError(f"Database constraint violation: {str(e.orig)}")

    async def update(
        self,
        db: AsyncSession,
        obj_id: Any,
        obj_in: MasterDataUpdate
    ) -> Optional[MasterData]:
        """
        Update master data with proper error handling for unique constraints.
        """
        try:
            return await super().update(db, obj_id, obj_in)
        except IntegrityError as e:
            await db.rollback()

            # Check if it's the unique constraint violation
            if "uq_master_data_scope_code" in str(e.orig):
                raise BusinessLogicError(
                    f"Master data with scope '{obj_in.scope}' and code '{obj_in.code}' already exists",
                    constraint="unique_scope_code"
                )

            # Re-raise if it's a different integrity error
            raise BusinessLogicError(f"Database constraint violation: {str(e.orig)}")