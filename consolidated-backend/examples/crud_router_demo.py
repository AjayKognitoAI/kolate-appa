"""
CRUD Router Demo

This file demonstrates how to use the generic CRUD router system
to quickly create REST API endpoints for any model.
"""

from fastapi import FastAPI
from app.models.feature import Feature
from app.schemas.feature import FeatureOut, FeatureCreate, FeatureUpdate
from app.services.feature_service import FeatureService
from app.routes.crud_router import CRUDRouter, create_crud_router, create_readonly_router

# Initialize FastAPI app
app = FastAPI(title="CRUD Router Demo", version="1.0.0")


# Example 1: Basic CRUD Router for Features
def create_basic_feature_router():
    """Create a basic CRUD router for features."""

    feature_router = CRUDRouter(
        service_class=FeatureService,
        schema=FeatureOut,
        create_schema=FeatureCreate,
        update_schema=FeatureUpdate,
        prefix="/features",
        tags=["features"],
        resource_name="features"
    )

    return feature_router.get_router()


# Example 2: Customized CRUD Router with exclusions
def create_customized_feature_router():
    """Create a customized CRUD router excluding certain endpoints."""

    feature_router = CRUDRouter(
        service_class=FeatureService,
        schema=FeatureOut,
        create_schema=FeatureCreate,
        update_schema=FeatureUpdate,
        prefix="/features",
        tags=["features"],
        resource_name="features",
        exclude=["delete", "update"]  # Exclude these endpoints
    )

    return feature_router.get_router()


# Example 3: Read-only router
def create_readonly_feature_router():
    """Create a read-only router (no create/update/delete operations)."""

    return create_readonly_router(
        model=Feature,
        service_class=FeatureService,
        schema=FeatureOut,
        prefix="/readonly-features",
        tags=["readonly-features"],
        resource_name="features"
    )


# Example 4: Router with custom permissions
def create_feature_router_with_custom_permissions():
    """Create a router with custom permission mappings."""

    feature_router = CRUDRouter(
        service_class=FeatureService,
        schema=FeatureOut,
        create_schema=FeatureCreate,
        update_schema=FeatureUpdate,
        prefix="/admin-features",
        tags=["admin-features"],
        resource_name="features",
        custom_permissions={
            "get_all": "admin:read",
            "get_by_id": "admin:read",
            "create": "admin:write",
            "update": "admin:write",
            "patch": "admin:write",
            "delete": "admin:delete",
            "search": "admin:read",
            "count": "admin:read"
        }
    )

    return feature_router.get_router()


# Example 5: Router with only specific endpoints
def create_limited_feature_router():
    """Create a router with only specific endpoints."""

    feature_router = CRUDRouter(
        service_class=FeatureService,
        schema=FeatureOut,
        prefix="/limited-features",
        tags=["limited-features"],
        resource_name="features",
        include_only=["get_all", "get_by_id", "search"]  # Only these endpoints
    )

    return feature_router.get_router()


# Example 6: Adding custom routes to CRUD router
def create_feature_router_with_custom_routes():
    """Create a router with additional custom routes."""

    feature_router = CRUDRouter(
        service_class=FeatureService,
        schema=FeatureOut,
        create_schema=FeatureCreate,
        update_schema=FeatureUpdate,
        prefix="/extended-features",
        tags=["extended-features"],
        resource_name="features"
    )

    # Add custom route
    @feature_router.router.get("/stats", summary="Get feature statistics")
    async def get_feature_stats():
        return {
            "total_features": 42,
            "active_features": 38,
            "deprecated_features": 4
        }

    # Add another custom route with permission
    feature_router.add_custom_route(
        path="/export",
        methods=["GET"],
        handler=export_features,
        permission="features:export",
        summary="Export features",
        response_model=dict
    )

    return feature_router.get_router()


async def export_features():
    """Custom handler for exporting features."""
    return {"message": "Features exported successfully", "count": 42}


# Example 7: Complete example with all features
def create_comprehensive_feature_router():
    """
    Create a comprehensive feature router demonstrating all capabilities.

    This router includes:
    - Custom schemas for different operations
    - Custom permissions
    - Excluded endpoints
    - Custom routes
    - Detailed configuration
    """

    # Create the CRUD router
    feature_router = CRUDRouter(
        service_class=FeatureService,
        schema=FeatureOut,
        create_schema=FeatureCreate,
        update_schema=FeatureUpdate,
        prefix="/api/v1/features",
        tags=["Features", "CRUD", "Management"],
        resource_name="features",
        exclude=["delete"],  # Don't allow deletion via API
        custom_permissions={
            "create": "features:create",
            "update": "features:update",
            "patch": "features:patch"
        }
    )

    # Add validation route
    @feature_router.router.post("/validate")
    async def validate_feature_data(feature_data: FeatureCreate):
        """Validate feature data without creating it."""
        # Validation logic here
        return {"valid": True, "message": "Feature data is valid"}

    # Add bulk operations
    @feature_router.router.post("/bulk-create")
    async def bulk_create_features(features: list[FeatureCreate]):
        """Create multiple features at once."""
        # Bulk creation logic here
        return {"created": len(features), "message": "Features created successfully"}

    # Add analytics route
    @feature_router.router.get("/analytics")
    async def get_feature_analytics():
        """Get feature usage analytics."""
        return {
            "most_used": "user_management",
            "least_used": "advanced_reporting",
            "total_usage": 1250
        }

    return feature_router.get_router()


# Register routers with the FastAPI app
def setup_demo_routers():
    """Set up all demo routers."""

    # Basic router
    app.include_router(
        create_basic_feature_router(),
        prefix="/api/v1"
    )

    # Customized router
    app.include_router(
        create_customized_feature_router(),
        prefix="/api/v1"
    )

    # Read-only router
    app.include_router(
        create_readonly_feature_router(),
        prefix="/api/v1"
    )

    # Custom permissions router
    app.include_router(
        create_feature_router_with_custom_permissions(),
        prefix="/api/v1"
    )

    # Limited router
    app.include_router(
        create_limited_feature_router(),
        prefix="/api/v1"
    )

    # Extended router
    app.include_router(
        create_feature_router_with_custom_routes(),
        prefix="/api/v1"
    )

    # Comprehensive router
    app.include_router(
        create_comprehensive_feature_router()
    )


if __name__ == "__main__":
    # Set up all demo routers
    setup_demo_routers()

    print("CRUD Router Demo Application")
    print("=" * 40)
    print("\nAvailable endpoints:")
    print("- GET /docs - OpenAPI documentation")
    print("- Basic CRUD: /api/v1/features/*")
    print("- Customized: /api/v1/features/* (no delete/update)")
    print("- Read-only: /api/v1/readonly-features/*")
    print("- Admin: /api/v1/admin-features/*")
    print("- Limited: /api/v1/limited-features/*")
    print("- Extended: /api/v1/extended-features/*")
    print("- Comprehensive: /api/v1/features/*")
    print("\nExample API calls:")
    print("curl -X GET 'http://localhost:8000/api/v1/features?page=1&size=10'")
    print("curl -X GET 'http://localhost:8000/api/v1/features/1'")
    print("curl -X POST 'http://localhost:8000/api/v1/features/search' -d '{}'")
    print("curl -X GET 'http://localhost:8000/api/v1/features/count'")


# Example usage patterns for different scenarios

class UsageExamples:
    """Examples of how to use CRUD routers for different scenarios."""

    @staticmethod
    def simple_resource():
        """Simple resource with basic CRUD operations."""
        return create_crud_router(
            model=Feature,
            service_class=FeatureService,
            schema=FeatureOut,
            create_schema=FeatureCreate,
            update_schema=FeatureUpdate,
            prefix="/simple-features",
            resource_name="features"
        )

    @staticmethod
    def public_readonly_resource():
        """Public read-only resource (no authentication required)."""
        # Note: You would need to customize permissions for this
        return create_readonly_router(
            model=Feature,
            service_class=FeatureService,
            schema=FeatureOut,
            prefix="/public/features",
            resource_name="features"
        )

    @staticmethod
    def admin_only_resource():
        """Admin-only resource with full CRUD operations."""
        router = CRUDRouter(
            service_class=FeatureService,
            schema=FeatureOut,
            create_schema=FeatureCreate,
            update_schema=FeatureUpdate,
            prefix="/admin/features",
            resource_name="features",
            custom_permissions={
                endpoint: "admin:full_access"
                for endpoint in ["get_all", "get_by_id", "create", "update", "patch", "delete", "search", "count"]
            }
        )
        return router.get_router()

    @staticmethod
    def versioned_api_resource():
        """Versioned API resource."""
        return create_crud_router(
            model=Feature,
            service_class=FeatureService,
            schema=FeatureOut,
            create_schema=FeatureCreate,
            update_schema=FeatureUpdate,
            prefix="/api/v2/features",
            tags=["Features V2"],
            resource_name="features"
        )

    @staticmethod
    def microservice_resource():
        """Resource for microservice architecture."""
        return create_crud_router(
            model=Feature,
            service_class=FeatureService,
            schema=FeatureOut,
            create_schema=FeatureCreate,
            update_schema=FeatureUpdate,
            prefix="/internal/features",
            tags=["Internal API"],
            resource_name="features",
            # Might exclude some endpoints for internal APIs
            exclude=["delete"]
        )


# Performance and caching examples
class PerformanceExamples:
    """Examples focusing on performance and caching."""

    @staticmethod
    def high_performance_readonly():
        """High-performance read-only resource with aggressive caching."""
        # The service would be configured with longer cache TTLs
        service_class = type("HighPerformanceFeatureService", (FeatureService,), {
            "__init__": lambda self: super(FeatureService, self).__init__(
                model=Feature,
                cache_prefix="hp_features",
                default_cache_ttl=3600,  # 1 hour cache
                searchable_fields=["name", "description"],
                sortable_fields=["feature_id", "name"]
            )
        })

        return create_readonly_router(
            model=Feature,
            service_class=service_class,
            schema=FeatureOut,
            prefix="/fast/features",
            resource_name="features"
        )

    @staticmethod
    def low_latency_resource():
        """Low-latency resource optimized for speed."""
        router = CRUDRouter(
            service_class=FeatureService,
            schema=FeatureOut,
            prefix="/fast/features",
            resource_name="features",
            include_only=["get_by_id", "get_all"],  # Only fast operations
        )
        return router.get_router()


print("\nCRUD Router system is ready!")
print("Use the examples above to create powerful REST APIs with minimal code.")