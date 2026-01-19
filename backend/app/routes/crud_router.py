from typing import (
    Generic,
    TypeVar,
    Type,
    List,
    Optional,
    Any,
    Dict,
    Callable,
    Union,
)
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.services.crud_service import CRUDService

# Type variables
ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
PatchSchemaType = TypeVar("PatchSchemaType", bound=BaseModel)
OutputSchemaType = TypeVar("OutputSchemaType", bound=BaseModel)
SearchSchemaType = TypeVar("SearchSchemaType", bound=BaseModel)


def validate_size(size: int) -> int:
    """Validate pagination size parameter."""
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Size cannot be 0. Use -1 for all records or >= 1 for pagination.",
        )
    if size < -1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Size must be -1 (all records) or >= 1.",
        )
    return size


class CRUDRouter(
    Generic[ModelType, CreateSchemaType, UpdateSchemaType, OutputSchemaType]
):
    """
    Generic CRUD Router that creates REST API endpoints for any model.

    This router automatically generates standard CRUD endpoints with:
    - Permission-based security
    - Automatic pagination for list operations
    - Search functionality
    - Caching integration
    - Configurable endpoint inclusion/exclusion
    """

    def __init__(
        self,
        service_class: Type[CRUDService],
        schema: Type[OutputSchemaType],
        create_schema: Optional[Type[CreateSchemaType]] = None,
        update_schema: Optional[Type[UpdateSchemaType]] = None,
        patch_schema: Optional[Type[BaseModel]] = None,
        search_schema: Optional[Type[SearchSchemaType]] = None,
        prefix: str = "",
        tags: Optional[List[str]] = None,
        resource_name: Optional[str] = None,
        exclude: Optional[List[str]] = None,
        include_only: Optional[List[str]] = None,
        custom_permissions: Optional[Dict[str, str]] = None,
        dependencies: Optional[List[Callable]] = None,
        enable_self_endpoints: bool = False,
        access_verification_method: Optional[str] = None,
        id_type: Optional[str] = "int"  # int/str
    ):
        """
        Initialize CRUD Router.

        Args:
            service_class: CRUD service class to use
            schema: Output schema for responses
            create_schema: Schema for create operations
            update_schema: Schema for update operations
            patch_schema: Schema for patch operations
            search_schema: Schema for search parameters
            prefix: URL prefix for all routes
            tags: OpenAPI tags for routes
            resource_name: Resource name for permissions (e.g., "features")
            exclude: List of endpoints to exclude
            include_only: List of endpoints to include (excludes all others)
            custom_permissions: Custom permission mappings for endpoints
            dependencies: Additional dependencies for all routes
            enable_self_endpoints: Enable /self/{id} endpoints for user-specific operations
            access_verification_method: Method name in service to verify user access to entity
        """
        self.service_class = service_class
        self.schema = schema
        self.create_schema = create_schema
        self.update_schema = update_schema
        self.patch_schema = patch_schema
        self.search_schema = search_schema
        self.prefix = prefix
        self.tags = tags or []
        self.resource_name = resource_name or self._extract_resource_name(prefix)
        self.dependencies = dependencies or []
        self.enable_self_endpoints = enable_self_endpoints
        self.access_verification_method = (
            access_verification_method
            or f"verify_{self.resource_name.rstrip('s')}_access"
        )
        self.id_type = int if id_type == "int" else str

        # Determine which endpoints to include
        self.available_endpoints = {
            "get_all",
            "get_by_id",
            "create",
            "create_bulk",
            "update",
            "patch",
            "delete",
            "search",
            "count",
        }

        # Add self endpoints to available endpoints if enabled
        if self.enable_self_endpoints:
            self.available_endpoints.update(
                {"self_get_all", "self_get", "self_update", "self_patch", "self_delete"}
            )

        if include_only is not None:
            self.included_endpoints = set(include_only)
        else:
            self.included_endpoints = self.available_endpoints.copy()
            if exclude:
                self.included_endpoints -= set(exclude)

        # Set up permission mappings
        self.permissions = {
            "get_all": f"{self.resource_name}:read",
            "get_by_id": f"{self.resource_name}:read",
            "search": f"{self.resource_name}:read",
            "count": f"{self.resource_name}:read",
            "create": f"{self.resource_name}:write",
            "create_bulk": f"{self.resource_name}:write",
            "update": f"{self.resource_name}:write",
            "patch": f"{self.resource_name}:write",
            "delete": f"{self.resource_name}:delete",
            # Self endpoints use read/write permissions as they are user-specific with access verification
            "self_get_all": f"{self.resource_name}:read:self",
            "self_get": f"{self.resource_name}:read:self",
            "self_update": f"{self.resource_name}:write:self",
            "self_patch": f"{self.resource_name}:write:self",
            "self_delete": f"{self.resource_name}:delete:self",
        }

        # Apply custom permission overrides
        if custom_permissions:
            self.permissions.update(custom_permissions)

        # Create router
        self.router = APIRouter(prefix=prefix, tags=self.tags)
        self._setup_routes()

    def _extract_resource_name(self, prefix: str) -> str:
        """Extract resource name from prefix."""
        return prefix.strip("/").split("/")[-1] if prefix else "resource"

    def _get_service(self) -> CRUDService:
        """Get service instance."""
        return self.service_class()

    def _setup_routes(self):
        """Set up all CRUD routes."""
        if "get_all" in self.included_endpoints:
            self._add_get_all_route()

        if "count" in self.included_endpoints:
            self._add_count_route()

        # Add self endpoints if enabled (must be declared before /{item_id})
        if self.enable_self_endpoints:
            if "self_get_all" in self.included_endpoints:
                self._add_self_get_all_route()

            if "self_get" in self.included_endpoints:
                self._add_self_get_route()

            if "self_update" in self.included_endpoints and self.update_schema:
                self._add_self_update_route()

            if "self_patch" in self.included_endpoints:
                self._add_self_patch_route()

            if "self_delete" in self.included_endpoints:
                self._add_self_delete_route()

        if "get_by_id" in self.included_endpoints:
            self._add_get_by_id_route()

        if "create" in self.included_endpoints and self.create_schema:
            self._add_create_route()

        if "create_bulk" in self.included_endpoints and self.create_schema:
            self._add_create_bulk_route()

        if "update" in self.included_endpoints and self.update_schema:
            self._add_update_route()

        if "patch" in self.included_endpoints:
            self._add_patch_route()

        if "delete" in self.included_endpoints:
            self._add_delete_route()

        if "search" in self.included_endpoints:
            self._add_search_route()

    def _add_get_all_route(self):
        """Add GET all endpoint with pagination."""

        @self.router.get(
            "",
            response_model=PaginatedResponse,
            summary=f"Get all {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["get_all"]))],
        )
        async def get_all(
            page: int = Query(1, ge=1, description="Page number"),
            size: int = Query(10, le=100, description="Page size (-1 for all records)"),
            sort_by: Optional[str] = Query(
                None, alias="sortBy", description="Field to sort by"
            ),
            sort_order: str = Query(
                "asc",
                alias="sortOrder",
                regex="^(asc|desc)$",
                description="Sort order",
            ),
            locale: Optional[str] = Query(
                None, description="Locale for localized content (optional)"
            ),
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Validate size parameter
            size = validate_size(size)

            # Set default sort_by if not provided
            if sort_by is None:
                sort_by = service._get_primary_key_name()

            pagination = PaginationParams(
                page=page, size=size, sort_by=sort_by, sort_order=sort_order
            )

            result = await service.get_all(db, pagination, locale)

            # Convert items to output schema
            result.items = [self.schema.model_validate(item) for item in result.items]
            return result

    def _add_get_by_id_route(self):
        """Add GET by ID endpoint."""

        @self.router.get(
            "/{item_id}",
            response_model=self.schema,
            summary=f"Get {self.resource_name} by ID",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["get_by_id"]))],
        )
        async def get_by_id(
            item_id: self.id_type,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()
            item = await service.get_by_id(db, item_id)

            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

            return self.schema.model_validate(item)

    def _add_create_route(self):
        """Add POST create endpoint."""

        @self.router.post(
            "",
            response_model=self.schema,
            status_code=status.HTTP_201_CREATED,
            summary=f"Create {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["create"]))],
        )
        async def create(
            item_in: self.create_schema,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()
            item = await service.create(db, item_in)
            return self.schema.model_validate(item)

    def _add_create_bulk_route(self):
        """Add POST bulk create endpoint."""

        @self.router.post(
            "/bulk",
            response_model=List[self.schema],
            status_code=status.HTTP_201_CREATED,
            summary=f"Create multiple {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["create_bulk"]))],
        )
        async def create_bulk(
            items_in: List[self.create_schema],
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Check if service has validation method, otherwise use standard bulk create
            if hasattr(service, "create_bulk_with_validation"):
                try:
                    items = await service.create_bulk_with_validation(db, items_in)
                except ValueError as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
                    )
            else:
                items = await service.create_bulk(db, items_in)

            return [self.schema.model_validate(item) for item in items]

    def _add_update_route(self):
        """Add PUT update endpoint."""

        @self.router.put(
            "/{item_id}",
            response_model=self.schema,
            summary=f"Update {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["update"]))],
        )
        async def update(
            item_id: self.id_type,
            item_in: self.update_schema,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()
            item = await service.update(db, item_id, item_in)

            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

            return self.schema.model_validate(item)

    def _add_patch_route(self):
        """Add PATCH partial update endpoint."""

        @self.router.patch(
            "/{item_id}",
            response_model=self.schema,
            summary=f"Partially update {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["patch"]))],
        )
        async def patch(
            item_id: self.id_type,
            item_in: Dict[str, Any] = Body(...),
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()
            item = await service.patch(db, item_id, item_in)

            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

            return self.schema.model_validate(item)

    def _add_delete_route(self):
        """Add DELETE endpoint."""

        @self.router.delete(
            "/{item_id}",
            status_code=status.HTTP_204_NO_CONTENT,
            summary=f"Delete {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["delete"]))],
        )
        async def delete(
            item_id: self.id_type,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()
            deleted = await service.delete(db, item_id)

            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

    def _add_search_route(self):
        """Add POST search endpoint with pagination."""
        search_schema = self.search_schema or Dict[str, Any]

        @self.router.post(
            "/search",
            response_model=PaginatedResponse,
            summary=f"Search {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["search"]))],
        )
        async def search(
            search_params: Union[search_schema, Dict[str, Any]] = Body({}),
            page: int = Query(1, ge=1, description="Page number"),
            size: int = Query(10, le=100, description="Page size (-1 for all records)"),
            sort_by: Optional[str] = Query(None, description="Field to sort by"),
            sort_order: str = Query(
                "asc", regex="^(asc|desc)$", description="Sort order"
            ),
            locale: Optional[str] = Query(
                None, description="Locale for localized content (optional)"
            ),
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Validate size parameter
            size = validate_size(size)

            # Set default sort_by if not provided
            if sort_by is None:
                sort_by = service._get_primary_key_name()

            pagination = PaginationParams(
                page=page, size=size, sort_by=sort_by, sort_order=sort_order
            )

            result = await service.search(db, search_params, pagination, locale)

            # Convert items to output schema
            result.items = [self.schema.model_validate(item) for item in result.items]
            return result

    def _add_count_route(self):
        """Add GET count endpoint."""

        @self.router.get(
            "/count",
            response_model=Dict[str, int],
            summary=f"Count {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["count"]))],
        )
        async def count(
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()
            total = await service.count(db)
            return {"total": int(total)}

    def _add_self_get_all_route(self):
        """Add GET /self endpoint to get all resources belonging to current user."""

        @self.router.get(
            "/self",
            response_model=PaginatedResponse,
            summary=f"Get my {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["self_get_all"]))],
        )
        async def get_self_all(
            page: int = Query(1, ge=1, description="Page number"),
            size: int = Query(10, le=100, description="Page size (-1 for all records)"),
            sort_by: Optional[str] = Query(
                None, alias="sortBy", description="Field to sort by"
            ),
            sort_order: str = Query(
                "asc",
                alias="sortOrder",
                regex="^(asc|desc)$",
                description="Sort order",
            ),
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Check if service has a method to get all by user
            get_by_user_method = getattr(service, "get_all_by_user", None)
            if not get_by_user_method:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Service method 'get_all_by_user' not found",
                )

            # Validate size parameter
            size = validate_size(size)

            # Set default sort_by if not provided
            if sort_by is None:
                sort_by = service._get_primary_key_name()

            pagination = PaginationParams(
                page=page, size=size, sort_by=sort_by, sort_order=sort_order
            )

            result = await get_by_user_method(db, current_user.id, pagination)

            # Convert items to output schema
            result.items = [self.schema.model_validate(item) for item in result.items]
            return result

    def _add_self_get_route(self):
        """Add GET /self/{item_id} endpoint."""

        @self.router.get(
            "/self/{item_id}",
            response_model=self.schema,
            summary=f"Get my {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["self_get"]))],
        )
        async def get_self(
            item_id: self.id_type,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Verify user has access to this entity
            access_method = getattr(service, self.access_verification_method, None)
            if not access_method:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Service method {self.access_verification_method} not found",
                )

            has_access = await access_method(db, current_user.id, item_id)
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to {self.resource_name}",
                )

            item = await service.get_by_id(db, item_id)
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

            return self.schema.model_validate(item)

    def _add_self_update_route(self):
        """Add PUT /self/{item_id} endpoint."""

        @self.router.put(
            "/self/{item_id}",
            response_model=self.schema,
            summary=f"Update my {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["self_update"]))],
        )
        async def update_self(
            item_id: self.id_type,
            item_in: self.update_schema,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Verify user has access to this entity
            access_method = getattr(service, self.access_verification_method, None)
            if not access_method:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Service method {self.access_verification_method} not found",
                )

            has_access = await access_method(db, current_user.id, item_id)
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to {self.resource_name}",
                )

            # Try to call update with current_user parameter if service supports it
            update_method = service.update
            import inspect
            sig = inspect.signature(update_method)
            if 'current_user' in sig.parameters:
                item = await service.update(db, item_id, item_in, current_user=current_user)
            else:
                item = await service.update(db, item_id, item_in)

            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

            return self.schema.model_validate(item)

    def _add_self_patch_route(self):
        """Add PATCH /self/{item_id} endpoint."""

        @self.router.patch(
            "/self/{item_id}",
            response_model=self.schema,
            summary=f"Partially update my {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["self_patch"]))],
        )
        async def patch_self(
            item_id: self.id_type,
            item_in: Dict[str, Any] = Body(...),
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Verify user has access to this entity
            access_method = getattr(service, self.access_verification_method, None)
            if not access_method:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Service method {self.access_verification_method} not found",
                )

            has_access = await access_method(db, current_user.id, item_id)
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to {self.resource_name}",
                )

            item = await service.patch(db, item_id, item_in)
            if not item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

            return self.schema.model_validate(item)

    def _add_self_delete_route(self):
        """Add DELETE /self/{item_id} endpoint."""

        @self.router.delete(
            "/self/{item_id}",
            status_code=status.HTTP_204_NO_CONTENT,
            summary=f"Delete my {self.resource_name}",
            dependencies=self.dependencies
            + [Depends(has_permissions(self.permissions["self_delete"]))],
        )
        async def delete_self(
            item_id: self.id_type,
            current_user: Auth0User = Depends(get_current_user),
            db: AsyncSession = Depends(get_async_db),
        ):
            service = self._get_service()

            # Verify user has access to this entity
            access_method = getattr(service, self.access_verification_method, None)
            if not access_method:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Service method {self.access_verification_method} not found",
                )

            has_access = await access_method(db, current_user.id, item_id)
            if not has_access:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to {self.resource_name}",
                )

            # Try to call delete with current_user parameter if service supports it
            delete_method = service.delete
            import inspect
            sig = inspect.signature(delete_method)
            if 'current_user' in sig.parameters:
                deleted = await service.delete(db, item_id, current_user=current_user)
            else:
                deleted = await service.delete(db, item_id)

            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.resource_name.title()} not found",
                )

    def add_custom_route(
        self,
        path: str,
        methods: List[str],
        handler: Callable,
        permission: Optional[str] = None,
        **kwargs,
    ):
        """
        Add custom route to the router.

        Args:
            path: Route path
            methods: HTTP methods
            handler: Route handler function
            permission: Required permission
            **kwargs: Additional arguments for route decorator
        """
        deps = self.dependencies.copy()
        if permission:
            deps.append(Depends(has_permissions(permission)))

        for method in methods:
            route_decorator = getattr(self.router, method.lower())
            route_decorator(path, dependencies=deps, **kwargs)(handler)

    def get_router(self) -> APIRouter:
        """Get the configured router."""
        return self.router


# Convenience functions for creating common router configurations


def create_crud_router(
    model: Type[ModelType],
    service_class: Type[CRUDService],
    schema: Type[OutputSchemaType],
    create_schema: Optional[Type[CreateSchemaType]] = None,
    update_schema: Optional[Type[UpdateSchemaType]] = None,
    prefix: str = "",
    tags: Optional[List[str]] = None,
    resource_name: Optional[str] = None,
    exclude: Optional[List[str]] = None,
    **kwargs,
) -> APIRouter:
    """
    Create a CRUD router with sensible defaults.

    Args:
        model: SQLAlchemy model
        service_class: CRUD service class
        schema: Output schema
        create_schema: Create schema
        update_schema: Update schema
        prefix: URL prefix
        tags: OpenAPI tags
        resource_name: Resource name
        exclude: Endpoints to exclude
        **kwargs: Additional router arguments

    Returns:
        Configured APIRouter
    """
    crud_router = CRUDRouter(
        service_class=service_class,
        schema=schema,
        create_schema=create_schema,
        update_schema=update_schema,
        prefix=prefix,
        tags=tags,
        resource_name=resource_name,
        exclude=exclude,
        **kwargs,
    )
    return crud_router.get_router()


def create_readonly_router(
    model: Type[ModelType],
    service_class: Type[CRUDService],
    schema: Type[OutputSchemaType],
    prefix: str = "",
    tags: Optional[List[str]] = None,
    resource_name: Optional[str] = None,
    **kwargs,
) -> APIRouter:
    """
    Create a read-only CRUD router (no create/update/delete).

    Args:
        model: SQLAlchemy model
        service_class: CRUD service class
        schema: Output schema
        prefix: URL prefix
        tags: OpenAPI tags
        resource_name: Resource name
        **kwargs: Additional router arguments

    Returns:
        Configured APIRouter
    """
    return create_crud_router(
        model=model,
        service_class=service_class,
        schema=schema,
        prefix=prefix,
        tags=tags,
        resource_name=resource_name,
        exclude=["create", "update", "patch", "delete"],
        **kwargs,
    )
