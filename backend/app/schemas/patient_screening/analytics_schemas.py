"""
Patient Screening Analytics Schemas

Schemas for activity logging and analytics operations.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.base import CamelModel


class ActivityResponse(BaseModel):
    """Response for activity list"""
    status: str = "success"
    data: dict  # Contains: activities, total, page, size


class AnalyticsResponse(BaseModel):
    """Response for analytics data"""
    status: str = "success"
    data: dict  # Contains various analytics metrics


# ============== Activity Schemas ==============

class ActivityCreate(CamelModel):
    """Request for creating an activity record"""
    study_id: UUID
    entity_type: str  # study, master_data, cohort, filter
    entity_id: Optional[UUID] = None
    action: str  # created, updated, deleted, exported, compared, etc.
    description: str
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    activity_metadata: Optional[Dict[str, Any]] = None


class Activity(CamelModel):
    """Full activity details"""
    id: UUID
    study_id: UUID
    entity_type: str
    entity_id: Optional[UUID]
    action: str
    description: str
    previous_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    activity_metadata: Optional[Dict[str, Any]]
    user_id: str
    user_name: Optional[str]
    timestamp: datetime


# ============== Analytics Schemas ==============

class CohortAnalytics(CamelModel):
    """Analytics for a single cohort"""
    cohort_id: UUID
    cohort_name: str
    patient_count: int
    filter_rule_count: int
    column_usage: Dict[str, int]  # column_name -> usage count in filters
    filter_complexity: str  # low, medium, high


class StudyAnalytics(CamelModel):
    """Analytics for a study"""
    study_id: UUID
    study_name: str
    master_data_count: int
    cohort_count: int
    total_patients: int
    unique_patients_screened: int
    activity_count: int
    last_activity: Optional[datetime]


class FilterAnalytics(CamelModel):
    """Analytics for filter usage"""
    total_filters: int
    template_filters: int
    avg_rules_per_filter: float
    most_used_operators: List[Dict[str, Any]]  # [{operator, count}]
    most_filtered_columns: List[Dict[str, Any]]  # [{column, count}]
