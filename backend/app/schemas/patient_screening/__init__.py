"""
Patient Screening Schemas Package

Pydantic schemas for patient screening API request/response validation.
"""

from app.schemas.patient_screening.common import (
    ErrorResponse,
    DeleteResponse,
    SuccessResponse,
)
from app.schemas.patient_screening.filter_schemas import (
    LogicType,
    OperatorType,
    FilterRule,
    FilterGroup,
    SavedFilterCreate,
    SavedFilterUpdate,
    SavedFilterResponse,
    SavedFilterListResponse,
)
from app.schemas.patient_screening.study_schemas import (
    StudyStatus,
    StudyCreate,
    StudyUpdate,
    StudyResponse,
    StudyWithCounts,
    StudySummary,
    StudyListResponse,
    CohortFromMergeRequest,
    MergeResultResponse,
)
from app.schemas.patient_screening.cohort_schemas import (
    CohortCreate,
    CohortUpdate,
    CohortResponse,
    CohortListResponse,
    CohortPatientIds,
    StudyCohortPatientIdsResponse,
)
from app.schemas.patient_screening.data_schemas import (
    MasterDataUploadResponse,
    PresignedUrlResponse,
    MasterDataPreviewResponse,
    ValidateSchemaRequest,
    ValidateSchemaResponse,
    UnifiedCriteriaRequest,
    UnifiedCriteriaResponse,
    CriteriaType,
    CriteriaCategory,
)
from app.schemas.patient_screening.ai_schemas import (
    ColumnCategory,
    GenerateColumnDescriptionsRequest,
    GenerateColumnDescriptionsResponse,
)
from app.schemas.patient_screening.comparison_schemas import (
    CompareRequest,
    CompareResponse,
)
from app.schemas.patient_screening.analytics_schemas import (
    ActivityResponse,
    AnalyticsResponse,
)

__all__ = [
    # Common
    "ErrorResponse",
    "DeleteResponse",
    "SuccessResponse",
    # Filter
    "LogicType",
    "OperatorType",
    "FilterRule",
    "FilterGroup",
    "SavedFilterCreate",
    "SavedFilterUpdate",
    "SavedFilterResponse",
    "SavedFilterListResponse",
    # Study
    "StudyStatus",
    "StudyCreate",
    "StudyUpdate",
    "StudyResponse",
    "StudyWithCounts",
    "StudySummary",
    "StudyListResponse",
    "CohortFromMergeRequest",
    "MergeResultResponse",
    # Cohort
    "CohortCreate",
    "CohortUpdate",
    "CohortResponse",
    "CohortListResponse",
    "CohortPatientIds",
    "StudyCohortPatientIdsResponse",
    # Data
    "MasterDataUploadResponse",
    "PresignedUrlResponse",
    "MasterDataPreviewResponse",
    "ValidateSchemaRequest",
    "ValidateSchemaResponse",
    "UnifiedCriteriaRequest",
    "UnifiedCriteriaResponse",
    "CriteriaType",
    "CriteriaCategory",
    # AI
    "ColumnCategory",
    "GenerateColumnDescriptionsRequest",
    "GenerateColumnDescriptionsResponse",
    # Comparison
    "CompareRequest",
    "CompareResponse",
    # Analytics
    "ActivityResponse",
    "AnalyticsResponse",
]
