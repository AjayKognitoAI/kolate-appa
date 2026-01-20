"""
Patient Screening Routes Package

API routes for the patient screening module using CRUDRouter for standard
CRUD operations and custom routes for business logic:
- Studies: Study CRUD + workflow operations
- Cohorts: Cohort CRUD + patient ID updates
- Filters: Filter CRUD + templates + duplication
- Data: Master data upload/preview (business logic only)
- AI: LLM-powered filter generation
- Comparison: Cohort comparison analytics
- Analytics: Activity logging (read-only)
"""

from fastapi import APIRouter

from app.routes.crud_router import CRUDRouter

# Import models
from app.models.tenant.patient_screening import Study, Cohort, Filter

# Import schemas
from app.schemas.patient_screening.study_schemas import (
    StudyCreate,
    StudyUpdate,
    StudyResponse,
)
from app.schemas.patient_screening.cohort_schemas import (
    CohortCreate,
    CohortUpdate,
    CohortResponse,
)
from app.schemas.patient_screening.filter_schemas import (
    SavedFilterCreate,
    SavedFilterUpdate,
    SavedFilterResponse,
)

# Import services
from app.services.patient_screening import (
    StudyService,
    CohortService,
    FilterService,
)

# Import custom route modules
from .studies import custom_study_router
from .cohorts import custom_cohort_router
from .data import router as data_router
from .filters import custom_filter_router
from .ai import router as ai_router
from .comparison import router as comparison_router
from .analytics import router as analytics_router

# ============== Create CRUDRouters ==============

# Study CRUD Router (uses UUID/string IDs)
study_crud = CRUDRouter(
    service_class=StudyService,
    schema=StudyResponse,
    create_schema=StudyCreate,
    update_schema=StudyUpdate,
    prefix="/studies",
    tags=["Patient Screening - Studies"],
    resource_name="patient_screening_studies",
    exclude=["create_bulk", "patch", "search", "count"],  # Use custom routes
    id_type="str",  # UUID as string
)

# Cohort CRUD Router
cohort_crud = CRUDRouter(
    service_class=CohortService,
    schema=CohortResponse,
    create_schema=CohortCreate,
    update_schema=CohortUpdate,
    prefix="/cohorts",
    tags=["Patient Screening - Cohorts"],
    resource_name="patient_screening_cohorts",
    exclude=["create_bulk", "patch", "search", "count"],
    id_type="str",
)

# Filter CRUD Router
filter_crud = CRUDRouter(
    service_class=FilterService,
    schema=SavedFilterResponse,
    create_schema=SavedFilterCreate,
    update_schema=SavedFilterUpdate,
    prefix="/filters",
    tags=["Patient Screening - Filters"],
    resource_name="patient_screening_filters",
    exclude=["create_bulk", "patch", "search", "count"],
    id_type="str",
)


# ============== Combined Router ==============

router = APIRouter()

# Include CRUD routers
router.include_router(study_crud.get_router())
router.include_router(cohort_crud.get_router())
router.include_router(filter_crud.get_router())

# Include custom routes (business logic beyond CRUD)
router.include_router(custom_study_router, prefix="/studies", tags=["Patient Screening - Studies"])
router.include_router(custom_cohort_router, prefix="/cohorts", tags=["Patient Screening - Cohorts"])
router.include_router(custom_filter_router, prefix="/filters", tags=["Patient Screening - Filters"])

# Include data management routes (upload, preview, etc.)
router.include_router(data_router)

# Include AI/LLM endpoints
router.include_router(ai_router)

# Include comparison endpoints
router.include_router(comparison_router)

# Include analytics (activity logs) - read-only
router.include_router(analytics_router)

__all__ = ["router"]
