
from app.schemas.feature import (
    FeatureOut, FeatureCreate, FeatureUpdate, FeaturePatch,
    FeatureSearch
)
from app.services.feature_service import FeatureService
from app.routes.crud_router import CRUDRouter

# Create the CRUD router for features
feature_crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    create_schema=FeatureCreate,
    update_schema=FeatureUpdate,
    patch_schema=FeaturePatch,
    search_schema=FeatureSearch,
    prefix="",
    tags=[],
    resource_name="features",
    # exclude=["delete", "update"],  # As specified in requirements
    # include_only=["get_all", "get_by_id", "create", "create_bulk", "patch", "search", "count"]
    include_only=["get_all", "get_by_id", "create", "update", "search", "count", "delete"]
    
)

# Get the router instance
router = feature_crud_router.get_router()

# Add custom routes specific to features

# Export the router
__all__ = ["router"]