from app.schemas.permission import (
    PermissionOut, PermissionCreate, PermissionUpdate, PermissionPatch,
    PermissionSearch
)
from app.services.permission_service import PermissionService
from app.routes.crud_router import CRUDRouter

# Create the CRUD router for permissions
permission_crud_router = CRUDRouter(
    service_class=PermissionService,
    schema=PermissionOut,
    create_schema=PermissionCreate,
    update_schema=PermissionUpdate,
    patch_schema=PermissionPatch,
    search_schema=PermissionSearch,
    prefix="",
    tags=[],
    resource_name="permissions",
    include_only=["get_all", "get_by_id", "create", "update", "search", "count", "delete"]
)

# Get the router instance
router = permission_crud_router.get_router()

# Add custom routes specific to permissions

# Export the router
__all__ = ["router"]