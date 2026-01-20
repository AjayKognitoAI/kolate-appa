"""
Patient Screening Services Package

This module provides services for the patient screening functionality,
including study management, cohort creation, filter evaluation, and AI-powered
filter generation from natural language criteria.
"""

# Core business services (require DB session)
from app.services.patient_screening.study_service import StudyService
from app.services.patient_screening.cohort_service import CohortService
from app.services.patient_screening.filter_service import FilterService
from app.services.patient_screening.data_service import DataService
from app.services.patient_screening.comparison_service import ComparisonService
from app.services.patient_screening.analytics_service import AnalyticsService

# Utility services (stateless)
from app.services.patient_screening.llm_service import LLMService, get_llm_service
from app.services.patient_screening.filter_evaluation_service import (
    FilterEvaluationService,
    filter_evaluation_service,
)
from app.services.patient_screening.type_inference_service import (
    TypeInferenceService,
    type_inference_service,
)

# S3 Client
from app.services.patient_screening.s3_client import (
    PatientScreeningS3Client,
    patient_screening_s3_client,
)

__all__ = [
    # Core Services (require DB session)
    "StudyService",
    "CohortService",
    "FilterService",
    "DataService",
    "ComparisonService",
    "AnalyticsService",
    # Utility Services
    "LLMService",
    "get_llm_service",
    "FilterEvaluationService",
    "filter_evaluation_service",
    "TypeInferenceService",
    "type_inference_service",
    # S3 Client
    "PatientScreeningS3Client",
    "patient_screening_s3_client",
]
