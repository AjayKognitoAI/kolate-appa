"""
MongoDB Connection and Tenant Management

This module provides async MongoDB connectivity using Motor driver
with multi-tenant support for the Kolate application.
"""

from typing import Optional, Dict, Any
from contextvars import ContextVar
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config.settings import settings

# Context variable for current MongoDB tenant
mongo_tenant_var: ContextVar[str] = ContextVar("mongo_tenant", default="default")

# Global MongoDB client
_mongo_client: Optional[AsyncIOMotorClient] = None


async def get_mongo_client() -> AsyncIOMotorClient:
    """
    Get or create the MongoDB client.

    Returns:
        AsyncIOMotorClient: The MongoDB async client
    """
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(
            settings.MONGO_URL,
            minPoolSize=settings.MONGO_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGO_MAX_POOL_SIZE,
        )
    return _mongo_client


async def close_mongo_client():
    """Close the MongoDB client connection."""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None


async def get_mongo_database(org_id: Optional[str] = None) -> AsyncIOMotorDatabase:
    """
    Get the MongoDB database for the current tenant.

    Args:
        org_id: Optional organization ID. If not provided, uses context var.

    Returns:
        AsyncIOMotorDatabase: The tenant's MongoDB database
    """
    client = await get_mongo_client()

    # Get tenant ID from parameter or context
    tenant_id = org_id or mongo_tenant_var.get()

    if settings.ENABLE_MULTI_TENANT and tenant_id and tenant_id != "default":
        # Multi-tenant: use tenant-specific database
        db_name = f"{settings.MONGO_DATABASE}_{tenant_id}"
    else:
        # Single-tenant: use default database
        db_name = settings.MONGO_DATABASE

    return client[db_name]


def get_collection_name(project_id: str, trial_slug: str, collection_type: str) -> str:
    """
    Generate a collection name for project/trial specific data.

    Args:
        project_id: The project ID
        trial_slug: The trial slug identifier
        collection_type: The type of collection (e.g., "patient_records", "execution_records")

    Returns:
        str: The collection name
    """
    # Sanitize inputs to ensure valid collection names
    safe_project_id = project_id.replace("-", "_")
    safe_trial_slug = trial_slug.replace("-", "_")
    return f"{safe_project_id}_{safe_trial_slug}_{collection_type}"


async def get_collection(
    project_id: str,
    trial_slug: str,
    collection_type: str,
    org_id: Optional[str] = None
):
    """
    Get a MongoDB collection for project/trial specific data.

    Args:
        project_id: The project ID
        trial_slug: The trial slug identifier
        collection_type: The type of collection
        org_id: Optional organization ID

    Returns:
        The MongoDB collection
    """
    db = await get_mongo_database(org_id)
    collection_name = get_collection_name(project_id, trial_slug, collection_type)
    return db[collection_name]


def set_mongo_tenant(org_id: str):
    """Set the current MongoDB tenant in context."""
    mongo_tenant_var.set(org_id)


def get_mongo_tenant() -> str:
    """Get the current MongoDB tenant from context."""
    return mongo_tenant_var.get()


def clear_mongo_tenant():
    """Clear the MongoDB tenant context."""
    mongo_tenant_var.set("default")


class MongoTenantContext:
    """
    Context manager for MongoDB tenant operations.

    Usage:
        async with MongoTenantContext(org_id="abc123"):
            db = await get_mongo_database()
            # Operations on tenant's database
    """

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.previous_tenant: Optional[str] = None

    async def __aenter__(self):
        self.previous_tenant = get_mongo_tenant()
        set_mongo_tenant(self.org_id)
        return await get_mongo_database(self.org_id)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.previous_tenant is not None:
            set_mongo_tenant(self.previous_tenant)
        else:
            clear_mongo_tenant()
        return False
