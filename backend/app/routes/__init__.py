"""
Routes Registration

Registers all API routers with the FastAPI application.
"""

from fastapi import APIRouter

# Template routes (keep existing)
from .auth import router as auth_router
from .users import router as users_router
from .user_media import router as user_media_router
from .features import router as feature_router
from .actions import router as actions_router
from .permissions import router as permissions_router
from .roles import router as roles_router
from .master_data import router as master_data_router
from .guest import router as guest_router

# Auth routes (Auth0 Management API)
from .auth.users import router as auth_users_router
from .auth.organizations import router as auth_orgs_router
from .auth.roles import router as auth_roles_router
from .auth.sso import router as auth_sso_router

# Enterprise routes (public schema)
from .enterprises.enterprises import router as enterprises_router
from .enterprises.admins import router as enterprise_admins_router
from .enterprises.modules import router as enterprise_modules_router
from .enterprises.onboarding import router as enterprise_onboarding_router
from .enterprises.trials import router as trials_router
from .enterprises.invite import router as enterprise_invite_router

# Project routes (tenant schema)
from .projects.projects import router as projects_router
from .projects.project_users import router as project_users_router
from .projects.project_roles import router as project_roles_router

# Patient records routes (PostgreSQL with JSONB)
from .patient_records.records import router as patient_records_router
from .patient_records.executions import router as executions_router

# Asset routes
from .assets.uploads import router as uploads_router

# Supporting routes
from .bookmarks import router as bookmarks_router
from .notifications import router as notifications_router

# Patient Screening routes (tenant schema with S3/LLM)
from .patient_screening import router as patient_screening_router

from app.config.settings import settings

api_router = APIRouter()


# =============================================================================
# Template Routes (keep existing functionality)
# =============================================================================

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


# =============================================================================
# Migrated Routes (from Spring Boot microservices)
# =============================================================================

# Auth0 Management API Routes
api_router.include_router(
    auth_users_router,
    prefix="/auth",
    tags=["auth-management"]
)
api_router.include_router(
    auth_orgs_router,
    prefix="/auth/organizations",
    tags=["auth-organizations"]
)
api_router.include_router(
    auth_roles_router,
    prefix="/auth/roles",
    tags=["auth-roles"]
)
api_router.include_router(
    auth_sso_router,
    prefix="/auth",
    tags=["auth-sso"]
)

# Enterprise Management Routes (public schema)
api_router.include_router(
    enterprises_router,
    prefix="/enterprises",
    tags=["enterprises"]
)
api_router.include_router(
    enterprise_admins_router,
    prefix="/enterprises",
    tags=["enterprise-admins"]
)
api_router.include_router(
    enterprise_modules_router,
    prefix="/enterprises",
    tags=["enterprise-modules"]
)
api_router.include_router(
    enterprise_onboarding_router,
    prefix="/enterprises",
    tags=["enterprise-onboarding"]
)
api_router.include_router(
    enterprise_invite_router,
    prefix="/enterprises",
    tags=["enterprise-invite"]
)
api_router.include_router(
    trials_router,
    prefix="/trials",
    tags=["trials"]
)

# Project Management Routes (tenant schema)
api_router.include_router(
    projects_router,
    prefix="/projects",
    tags=["projects"]
)
api_router.include_router(
    project_users_router,
    prefix="/projects",
    tags=["project-users"]
)
api_router.include_router(
    project_roles_router,
    prefix="/projects",
    tags=["project-roles"]
)

# Patient Record Routes (PostgreSQL with JSONB)
api_router.include_router(
    patient_records_router,
    prefix="/patient-records",
    tags=["patient-records"]
)
api_router.include_router(
    executions_router,
    prefix="/executions",
    tags=["executions"]
)

# Asset Management Routes
api_router.include_router(
    uploads_router,
    prefix="/assets",
    tags=["assets"]
)

# Supporting Routes
api_router.include_router(
    bookmarks_router,
    prefix="/bookmarks",
    tags=["bookmarks"]
)
api_router.include_router(
    notifications_router,
    prefix="/notifications",
    tags=["notifications"]
)

# Patient Screening Routes (tenant schema with S3/LLM integration)
api_router.include_router(
    patient_screening_router,
    prefix="/patient-screening",
    tags=["patient-screening"]
)


# =============================================================================
# Development Routes
# =============================================================================

if settings.ENVIRONMENT == "development":
    from .health import router as health_router
    api_router.include_router(health_router, prefix="/health", tags=["health"])
    from .cache import router as cache_router
    api_router.include_router(cache_router, prefix="/cache", tags=["cache"])
