from typing import Generic, TypeVar, Type, Optional, List, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, asc, desc

from math import ceil

from app.core.cache import cacheable
from app.schemas.base import CamelModel
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.core.logging import get_class_logger

# Type variables for generic service
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=CamelModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=CamelModel)
SearchSchemaType = TypeVar("SearchSchemaType", bound=CamelModel)


class CRUDService(
    Generic[ModelType, CreateSchemaType, UpdateSchemaType, SearchSchemaType]
):
    """
    Generic CRUD service with caching, pagination, and search capabilities.

    This service provides standard CRUD operations for any SQLAlchemy model
    with automatic caching, permission checking, and search functionality.
    """

    def __init__(
        self,
        model: Type[ModelType],
        cache_prefix: Optional[str] = None,
        default_cache_ttl: int = 300,
        searchable_fields: Optional[List[str]] = None,
        sortable_fields: Optional[List[str]] = None,
        cached_methods: Optional[List[str]] = None,
        excluded_methods: Optional[List[str]] = None,
    ):
        """
        Initialize CRUD service.

        Args:
            model: SQLAlchemy model class
            cache_prefix: Prefix for cache keys (defaults to lowercase model name)
            default_cache_ttl: Default TTL for cached items in seconds
            searchable_fields: List of fields that can be searched
            sortable_fields: List of fields that can be used for sorting
            cached_methods: List of method names to cache (if None, no methods are cached)
            excluded_methods: List of method names to exclude from caching
        """
        self.model = model
        self.cache_prefix = cache_prefix or model.__name__.lower()
        self.default_cache_ttl = default_cache_ttl
        self.searchable_fields = searchable_fields or []
        self.sortable_fields = sortable_fields or [
            self._get_primary_key_name()
        ]
        self.logger = get_class_logger(self.__class__)

        # Cache configuration
        self.cached_methods = set(cached_methods or [])
        self.excluded_methods = set(excluded_methods or [])

        # Validate and apply caching
        self._validate_cache_methods()
        self._apply_conditional_caching()

    def _get_primary_key_name(self) -> str:
        """Get the primary key field name."""
        return self.model.__mapper__.primary_key[0].name

    def _get_primary_key_value(self, obj: ModelType) -> Any:
        """Get the primary key value from an object."""
        pk_name = self._get_primary_key_name()
        return getattr(obj, pk_name)

    def _build_cache_key(self, operation: str, identifier: Any = None) -> str:
        """Build cache key for operations."""
        if identifier is not None:
            return f"{self.cache_prefix}:{operation}:{identifier}"
        return f"{self.cache_prefix}:{operation}"

    def _build_search_filters(self, search_params: Dict[str, Any]) -> List:
        """Build search filters from search parameters."""
        filters = []

        # Fields that should use exact matching even if they are strings
        exact_match_fields = getattr(self, 'exact_match_fields', [])

        for field, value in search_params.items():
            if value is not None and field in self.searchable_fields:
                column = getattr(self.model, field, None)
                if column is not None:
                    if isinstance(value, str) and field not in exact_match_fields:
                        # Use ILIKE for case-insensitive partial matching
                        filters.append(column.ilike(f"%{value}%"))
                    else:
                        # Exact match for non-string values or exact_match_fields
                        filters.append(column == value)

        return filters

    def _get_sort_column(self, sort_by: str):
        """Get sort column, ensuring it's allowed."""
        if sort_by not in self.sortable_fields:
            sort_by = self._get_primary_key_name()

        return getattr(self.model, sort_by, None)

    def _validate_cache_methods(self):
        """Validate that specified cache methods exist and return results."""
        # Get all methods that can be cached (read operations that return data)
        cacheable_methods = {
            "get_by_id",
            "exists",
            "get_all",
            "search",
            "count",
            "get_by_field",
            "get_multiple_by_field",
        }

        # Check if cached methods exist and are cacheable
        invalid_methods = []
        for method_name in self.cached_methods:
            if not hasattr(self, method_name):
                invalid_methods.append(
                    f"Method '{method_name}' does not exist"
                )
            elif method_name not in cacheable_methods:
                invalid_methods.append(
                    f"Method '{method_name}' is not a cacheable read operation"
                )

        if invalid_methods:
            raise ValueError(
                f"Invalid cached methods: {'; '.join(invalid_methods)}"
            )

    def _apply_conditional_caching(self):
        """Apply caching to specified methods."""
        if not self.cached_methods:
            return

        # Cache configurations for different methods
        cache_configs = {
            "get_by_id": {
                "ttl": 300,
                "key_template": "{cache_prefix}:get_by_id:{obj_id}",
                "unless": "result is None",
            },
            "exists": {
                "ttl": 600,
                "key_template": "{cache_prefix}:exists:{obj_id}",
            },
            "get_all": {
                "ttl": 120,
                "key_template": "{cache_prefix}:list:page_{page}:size_{size}:sort_{sort_by}_{sort_order}",
                "compression": True,
            },
            "search": {
                "ttl": 120,
                "key_template": "{cache_prefix}:search:{hash_search_params}:page_{page}:size_{size}",
                "compression": True,
            },
            "count": {
                "ttl": 300,
                "key_template": "{cache_prefix}:count:{hash_filters}",
            },
            "get_by_field": {
                "ttl": 300,
                "key_template": "{cache_prefix}:field:{field_name}:{field_value}",
                "unless": "result is None",
            },
            "get_multiple_by_field": {
                "ttl": 300,
                "key_template": "{cache_prefix}:multi_field:{field_name}:{hash_field_values}",
                "compression": True,
            },
        }

        # Apply caching to specified methods
        for method_name in self.cached_methods:
            if method_name in self.excluded_methods:
                continue

            if method_name in cache_configs:
                self._apply_cache_to_method(
                    method_name, cache_configs[method_name]
                )

    def _apply_cache_to_method(self, method_name: str, config: dict):
        """Apply caching to a specific method."""
        original_method = getattr(self, method_name)

        # Apply cacheable decorator
        cached_method = cacheable(**config)(original_method)
        setattr(self, method_name, cached_method)

    # READ Operations

    async def get_by_id(
        self, db: AsyncSession, obj_id: Any
    ) -> Optional[ModelType]:
        """
        Get object by ID with caching.

        Args:
            db: Database session
            obj_id: Object ID

        Returns:
            Object instance or None if not found
        """
        return await db.get(self.model, obj_id)

    async def exists(self, db: AsyncSession, obj_id: Any) -> bool:
        """
        Check if object exists by ID.

        Args:
            db: Database session
            obj_id: Object ID

        Returns:
            True if object exists, False otherwise
        """
        query = select(self.model).where(
            getattr(self.model, self._get_primary_key_name()) == obj_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_all(
        self,
        db: AsyncSession,
        pagination: PaginationParams,
        locale: Optional[str] = None,
    ) -> PaginatedResponse:
        """
        Get paginated list of objects.

        Args:
            db: Database session
            pagination: Pagination parameters

        Returns:
            Paginated response with objects
        """
        self.logger.info("DB Called")
        # Build base query
        query = select(self.model)

        # Get total count
        count_query = select(func.count(self.model.id)).select_from(self.model)
        total = await db.scalar(count_query)

        # Apply sorting
        sort_column = self._get_sort_column(pagination.sort_by)
        if sort_column is not None:
            if pagination.sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))

        # Apply pagination (skip if size = -1 to fetch all records)
        if pagination.size != -1:
            offset = (pagination.page - 1) * pagination.size
            query = query.offset(offset).limit(pagination.size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        if pagination.size == -1:
            # When fetching all records
            pages = 1
            has_next = False
            has_prev = False
            page = 1
            size = total
        else:
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

    async def search(
        self,
        db: AsyncSession,
        search_params: Union[SearchSchemaType, Dict[str, Any]],
        pagination: PaginationParams,
        locale: Optional[str] = None,
    ) -> PaginatedResponse:
        """
        Search objects with filters and pagination.

        Args:
            db: Database session
            search_params: Search parameters (Pydantic model or dict)
            pagination: Pagination parameters

        Returns:
            Paginated response with matching objects
        """
        self.logger.info("Search DB Called")
        # Convert SearchSchemaType to dict if needed
        if hasattr(search_params, "model_dump"):
            search_dict = search_params.model_dump(exclude_unset=True)
        elif hasattr(search_params, "dict"):
            search_dict = search_params.dict(exclude_unset=True)
        else:
            search_dict = search_params

        # Build search filters
        filters = self._build_search_filters(search_dict)

        # Build base query
        query = select(self.model)
        count_query = select(func.count(self.model.id)).select_from(self.model)

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
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))

        # Apply pagination (skip if size = -1 to fetch all records)
        if pagination.size != -1:
            offset = (pagination.page - 1) * pagination.size
            query = query.offset(offset).limit(pagination.size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        if pagination.size == -1:
            # When fetching all records
            pages = 1
            has_next = False
            has_prev = False
            page = 1
            size = total
        else:
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

    # CREATE Operations

    async def create(
        self, db: AsyncSession, obj_in: CreateSchemaType
    ) -> ModelType:
        """
        Create new object.

        Args:
            db: Database session
            obj_in: Object creation data

        Returns:
            Created object
        """
        # Convert Pydantic model to dict
        if hasattr(obj_in, "model_dump"):
            obj_data = obj_in.model_dump()
        elif hasattr(obj_in, "dict"):
            obj_data = obj_in.dict()
        else:
            obj_data = dict(obj_in)

        # Create object
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def create_bulk(
        self, db: AsyncSession, objects_in: List[CreateSchemaType]
    ) -> List[ModelType]:
        """
        Create multiple objects in bulk.

        Args:
            db: Database session
            objects_in: List of object creation data

        Returns:
            List of created objects
        """
        db_objects = []

        for obj_in in objects_in:
            # Convert Pydantic model to dict
            if hasattr(obj_in, "model_dump"):
                obj_data = obj_in.model_dump()
            elif hasattr(obj_in, "dict"):
                obj_data = obj_in.dict()
            else:
                obj_data = dict(obj_in)

            db_obj = self.model(**obj_data)
            db_objects.append(db_obj)

        # Bulk insert
        db.add_all(db_objects)
        await db.commit()

        # Refresh all objects
        for db_obj in db_objects:
            await db.refresh(db_obj)

        return db_objects

    # UPDATE Operations

    async def update(
        self, db: AsyncSession, obj_id: Any, obj_in: UpdateSchemaType
    ) -> Optional[ModelType]:
        """
        Update object by ID.

        Args:
            db: Database session
            obj_id: Object ID
            obj_in: Update data

        Returns:
            Updated object or None if not found
        """
        # Get existing object
        db_obj = await db.get(self.model, obj_id)
        if not db_obj:
            return None

        # Convert Pydantic model to dict, excluding unset fields
        if hasattr(obj_in, "model_dump"):
            obj_data = obj_in.model_dump(exclude_unset=True)
        elif hasattr(obj_in, "dict"):
            obj_data = obj_in.dict(exclude_unset=True)
        else:
            obj_data = {k: v for k, v in dict(obj_in).items() if v is not None}

        # Update object
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def patch(
        self, db: AsyncSession, obj_id: Any, obj_in: Dict[str, Any]
    ) -> Optional[ModelType]:
        """
        Partially update object by ID.

        Args:
            db: Database session
            obj_id: Object ID
            obj_in: Partial update data

        Returns:
            Updated object or None if not found
        """
        # Get existing object
        db_obj = await db.get(self.model, obj_id)
        if not db_obj:
            return None

        # Update only provided fields
        for field, value in obj_in.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)

        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    # DELETE Operations

    async def delete(self, db: AsyncSession, obj_id: Any) -> bool:
        """
        Delete object by ID.

        Args:
            db: Database session
            obj_id: Object ID

        Returns:
            True if deleted, False if not found
        """
        db_obj = await db.get(self.model, obj_id)
        if not db_obj:
            return False

        await db.delete(db_obj)
        await db.commit()
        return True

    async def delete_bulk(self, db: AsyncSession, obj_ids: List[Any]) -> int:
        """
        Delete multiple objects by IDs.

        Args:
            db: Database session
            obj_ids: List of object IDs

        Returns:
            Number of deleted objects
        """
        pk_name = self._get_primary_key_name()
        pk_column = getattr(self.model, pk_name)

        query = select(self.model).where(pk_column.in_(obj_ids))
        result = await db.execute(query)
        objects_to_delete = result.scalars().all()

        deleted_count = len(objects_to_delete)

        for obj in objects_to_delete:
            await db.delete(obj)

        await db.commit()
        return deleted_count

    # Utility Methods

    async def count(
        self, db: AsyncSession, filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Count objects with optional filters.

        Args:
            db: Database session
            filters: Optional filters

        Returns:
            Count of objects
        """
        query = select(func.count(self.model.id)).select_from(self.model)

        if filters:
            filter_conditions = self._build_search_filters(filters)
            if filter_conditions:
                query = query.where(and_(*filter_conditions))

        return await db.scalar(query)

    async def get_by_field(
        self, db: AsyncSession, field_name: str, field_value: Any
    ) -> Optional[ModelType]:
        """
        Get object by specific field value.

        Args:
            db: Database session
            field_name: Field name
            field_value: Field value

        Returns:
            Object or None if not found
        """
        if not hasattr(self.model, field_name):
            return None

        column = getattr(self.model, field_name)
        query = select(self.model).where(column == field_value)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multiple_by_field(
        self,
        db: AsyncSession,
        field_name: str,
        field_values: List[Any],
        pagination: Optional[PaginationParams] = None,
        locale: Optional[str] = None,
    ) -> Union[List[ModelType], PaginatedResponse]:
        """
        Get multiple objects by field values with optional pagination.

        Args:
            db: Database session
            field_name: Field name
            field_values: List of field values
            pagination: Optional pagination parameters

        Returns:
            List of objects or PaginatedResponse if pagination is provided
        """
        if not hasattr(self.model, field_name):
            if pagination:
                return PaginatedResponse(
                    items=[],
                    total=0,
                    page=pagination.page,
                    size=pagination.size,
                    pages=0,
                    has_next=False,
                    has_prev=False,
                )
            return []

        column = getattr(self.model, field_name)
        base_filter = column.in_(field_values)

        if pagination:
            # Build paginated query
            query = select(self.model).where(base_filter)
            count_query = (
                select(func.count(self.model.id))
                .select_from(self.model)
                .where(base_filter)
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

            # Apply pagination (skip if size = -1 to fetch all records)
            if pagination.size != -1:
                offset = (pagination.page - 1) * pagination.size
                query = query.offset(offset).limit(pagination.size)

            # Execute query
            result = await db.execute(query)
            items = result.scalars().all()

            # Calculate pagination info
            if pagination.size == -1:
                # When fetching all records
                pages = 1
                has_next = False
                has_prev = False
                page = 1
                size = total
            else:
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
        else:
            # Simple list query
            query = select(self.model).where(base_filter)
            result = await db.execute(query)
            return result.scalars().all()
