from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .user_media import router as user_media_router
from .features import router as feature_router
from .actions import router as actions_router
from .permissions import router as permissions_router
from .roles import router as roles_router
from .master_data import router as master_data_router
from .guest import router as guest_router
from app.config.settings import settings

api_router = APIRouter()

# Authentication & Authorization
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(user_media_router, prefix="/user-media", tags=["user-media"])

# RBAC System
api_router.include_router(feature_router, prefix="/features", tags=["features"])
api_router.include_router(actions_router, prefix="/actions", tags=["actions"])
api_router.include_router(permissions_router, prefix="/permissions", tags=["permissions"])
api_router.include_router(roles_router, prefix="/roles", tags=["roles"])

# Core Framework Features
api_router.include_router(master_data_router, prefix="/master-data", tags=["master-data"])
api_router.include_router(guest_router, prefix="/guest", tags=["guest"])

# Add your application-specific routers here
# Example:
# from .your_entity import router as your_entity_router
# api_router.include_router(your_entity_router, prefix="/your-entities", tags=["your-entities"])

if settings.ENVIRONMENT == "development":
    from .health import router as health_router
    api_router.include_router(health_router, prefix="/health", tags=["health"])
    from .cache import router as cache_router
    api_router.include_router(cache_router, prefix="/cache", tags=["cache"])

