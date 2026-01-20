"""
Patient Screening Filter Schemas

Schemas for filter creation, management, and evaluation.
Supports recursive filter groups with nested rules.
"""

from enum import Enum
from typing import Optional, List, Union
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.base import CamelModel


class LogicType(str, Enum):
    """Logical operators for combining rules"""
    AND = "AND"
    OR = "OR"


class OperatorType(str, Enum):
    """Filter operators for comparing values"""
    # Standard operators
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    BETWEEN = "between"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"
    # Cohort operators
    IN_COHORT = "in_cohort"
    NOT_IN_COHORT = "not_in_cohort"
    # Date operators
    ON_DATE = "on_date"              # Exact date match (=)
    BEFORE = "before"                # Date is before (<)
    AFTER = "after"                  # Date is after (>)
    ON_OR_BEFORE = "on_or_before"    # Date is on or before (<=)
    ON_OR_AFTER = "on_or_after"      # Date is on or after (>=)
    BETWEEN_DATES = "between_dates"  # Date is within range (inclusive)


class FilterRule(BaseModel):
    """
    Single filter condition.

    Represents an atomic filter rule that compares a field's value
    using an operator.

    Examples:
        - {"id": "r1", "field": "age", "operator": "gte", "value": 18}
        - {"id": "r2", "field": "diagnosis_date", "operator": "between", "value": "2020-01-01", "value2": "2023-12-31"}
    """
    id: str
    field: str
    operator: OperatorType
    value: Union[str, int, float, None] = None
    value2: Union[str, int, float, None] = None  # For 'between' operators


class FilterGroup(BaseModel):
    """
    Group of filter rules with logical operator.

    Supports recursive nesting for complex filter logic.
    Can be negated to invert the entire group's result.

    Structure:
        {
            "id": "g1",
            "name": "Demographics",
            "logic": "AND",
            "negate": false,
            "rules": [
                {"id": "r1", "field": "age", "operator": "gte", "value": 18},
                {
                    "id": "g2",
                    "name": "Geographic",
                    "logic": "OR",
                    "rules": [
                        {"id": "r2", "field": "country", "operator": "equals", "value": "US"},
                        {"id": "r3", "field": "country", "operator": "equals", "value": "CA"}
                    ]
                }
            ]
        }
    """
    id: str
    name: Optional[str] = None
    logic: LogicType
    negate: bool = False
    rules: List[Union['FilterRule', 'FilterGroup']]  # Recursive structure


# Required for recursive model
FilterGroup.model_rebuild()


# ============== Request Schemas ==============

class SavedFilterCreate(CamelModel):
    """Request schema for creating a saved filter"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    filter: FilterGroup
    is_template: bool = False
    # Note: enterprise_id removed - handled by tenant context
    # Note: user_id/user_name come from auth context


class SavedFilterUpdate(CamelModel):
    """Request schema for updating a saved filter"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    filter: Optional[FilterGroup] = None
    is_template: Optional[bool] = None


# ============== Response Schemas ==============

class SavedFilter(CamelModel):
    """Full saved filter details"""
    id: UUID
    name: str
    description: Optional[str]
    filter: FilterGroup
    is_template: bool
    usage_count: int
    created_by: str
    created_at: datetime
    updated_at: datetime


class SavedFilterResponse(BaseModel):
    """Single filter response"""
    status: str = "success"
    message: Optional[str] = None
    data: SavedFilter


class SavedFilterListResponse(BaseModel):
    """Paginated filter list response"""
    status: str = "success"
    data: dict  # Contains: content, total_elements, page, size, total_pages
