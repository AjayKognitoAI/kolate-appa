from app.schemas.action import (
    ActionOut, ActionCreate, ActionUpdate, ActionPatch,
    ActionSearch
)
from app.services.action_service import ActionService
from app.routes.crud_router import CRUDRouter

# Create the CRUD router for actions
action_crud_router = CRUDRouter(
    service_class=ActionService,
    schema=ActionOut,
    create_schema=ActionCreate,
    update_schema=ActionUpdate,
    patch_schema=ActionPatch,
    search_schema=ActionSearch,
    prefix="",
    tags=[],
    resource_name="actions",
    include_only=["get_all", "get_by_id", "create", "update", "search", "count", "delete"]
)

# Get the router instance
router = action_crud_router.get_router()

# Add custom routes specific to actions

# Export the router
__all__ = ["router"]