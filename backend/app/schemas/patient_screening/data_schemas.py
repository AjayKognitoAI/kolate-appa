"""
Patient Screening Data Schemas

Schemas for master data upload, download, and preview operations.
Includes unified criteria processing schemas.
"""

from enum import Enum
from typing import Optional, Dict, List, Any, Union
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.base import CamelModel


# ============== Basic Response Schemas ==============

class MasterDataUploadResponse(BaseModel):
    """Response for master data upload"""
    status: str = "success"
    message: Optional[str] = None
    data: dict  # Contains: master_data_id, file_name, row_count, columns, sample_data


class PresignedUrlResponse(BaseModel):
    """Response for presigned URL request"""
    status: str = "success"
    data: dict  # Contains: url, expires_in


# ============== Master Data Preview ==============

class MasterDataPreviewData(CamelModel):
    """Data payload for master data preview response"""
    master_data_id: UUID
    rows: List[Dict[str, Any]]
    total_rows: int
    columns: Dict[str, str]  # column_name -> "string" | "number" | "categorical" | "date"
    patient_id_column: Optional[str] = None
    column_descriptions: Optional[Dict[str, Any]] = None
    page: int = 0
    size: int = 100


class MasterDataPreviewResponse(BaseModel):
    """Response schema for master data preview endpoint"""
    status: str = "success"
    data: MasterDataPreviewData


# ============== Schema Validation ==============

class ValidateSchemaRequest(CamelModel):
    """Request schema for validating dataset columns against criteria"""
    columns: List[str] = Field(..., description="List of column names from the dataset")
    inclusion_criteria: Optional[str] = Field(None, description="Natural language inclusion criteria")
    exclusion_criteria: Optional[str] = Field(None, description="Natural language exclusion criteria")


class CriterionColumnMapping(CamelModel):
    """Mapping of a criterion to its required columns"""
    criterion: str = Field(..., description="The specific criterion text")
    columns: List[str] = Field(..., description="Column names required for this criterion")
    type: str = Field(..., description="Type: 'inclusion' or 'exclusion'")


class ValidateSchemaData(CamelModel):
    """Data payload for schema validation response"""
    is_valid: bool = Field(..., description="Whether dataset has all required columns")
    missing_columns: List[str] = Field(default_factory=list, description="Required but missing columns")
    required_columns: List[str] = Field(default_factory=list, description="All columns required by criteria")
    available_columns: List[str] = Field(default_factory=list, description="Columns provided in request")
    criteria_mapping: List[CriterionColumnMapping] = Field(
        default_factory=list,
        description="Mapping of each criterion to required columns"
    )
    suggested_mappings: Dict[str, str] = Field(
        default_factory=dict,
        description="AI-suggested mappings from missing to available columns"
    )


class ValidateSchemaResponse(BaseModel):
    """Response schema for schema validation endpoint"""
    status: str = "success"
    message: Optional[str] = None
    data: ValidateSchemaData


# ============== Unified Criteria Processing ==============

class CriteriaType(str, Enum):
    """Type of criteria - inclusion or exclusion"""
    INCLUSION = "inclusion"
    EXCLUSION = "exclusion"


class CriteriaCategory(str, Enum):
    """Category of criteria for organizing filters"""
    DEMOGRAPHICS = "Demographics"
    CLINICAL_LAB_VALUES = "Clinical/Lab Values"
    TREATMENT_HISTORY = "Treatment History"
    SAFETY_EXCLUSIONS = "Safety/Exclusions"
    STUDY_SPECIFIC = "Study-Specific"
    ADMINISTRATIVE = "Administrative"


class ColumnMetadata(CamelModel):
    """Enhanced metadata for a single column"""
    type: str = Field(..., description="Column type: number, string, categorical, date")
    description: Optional[str] = Field(None, description="Human-readable column description")
    sample_values: List[Any] = Field(default_factory=list, description="Sample values from column")
    unique_count: int = Field(0, description="Number of unique values")
    null_count: int = Field(0, description="Number of null/empty values")


class ColumnSuggestion(CamelModel):
    """A single column suggestion with confidence score"""
    column: str = Field(..., description="Column name from available columns")
    confidence: int = Field(..., ge=0, le=100, description="Confidence percentage (0-100)")


class FieldColumnSuggestions(CamelModel):
    """Column suggestions for a field used in a formula"""
    field_in_formula: str = Field(..., description="Field name used in the formula")
    suggestions: List[ColumnSuggestion] = Field(..., description="Top column suggestions with confidence")


class FormulaRule(CamelModel):
    """A single rule within a formula"""
    field: str = Field(..., description="Column/field name")
    operator: str = Field(..., description="Operator: equals, not_equals, gte, lte, between, etc.")
    value: Union[str, int, float, None] = Field(None, description="Primary comparison value")
    value2: Union[str, int, float, None] = Field(None, description="Secondary value (for 'between')")


class FormulaGroup(CamelModel):
    """A group of rules with logic operator"""
    logic: str = Field("AND", description="Logic operator: AND or OR")
    negate: bool = Field(False, description="Whether to negate the group result")
    rules: List[Union[FormulaRule, 'FormulaGroup']] = Field(..., description="List of rules or nested groups")


# Required for recursive model
FormulaGroup.model_rebuild()


class CriteriaFormula(CamelModel):
    """A single sentence/criterion with its formula and column mappings"""
    sentence: str = Field(..., description="Original sentence/criterion text")
    type: CriteriaType = Field(..., description="Type: inclusion or exclusion")
    category: CriteriaCategory = Field(..., description="Category for organizing filters")
    formula: Union[FormulaGroup, FormulaRule] = Field(..., description="Filter formula for this sentence")
    column_suggestions: List[FieldColumnSuggestions] = Field(
        default_factory=list,
        description="Column suggestions for each field in formula"
    )
    unmapped_concepts: List[str] = Field(
        default_factory=list,
        description="Concepts that could not be mapped to columns"
    )


class UnifiedCriteriaRequest(CamelModel):
    """Request for unified criteria processing"""
    columns: Dict[str, Any] = Field(
        ...,
        description="Column metadata - enhanced: {col: {type, description, ...}} or simple: {col: type}"
    )
    inclusion_criteria: str = Field(..., description="Natural language inclusion criteria")
    exclusion_criteria: str = Field(..., description="Natural language exclusion criteria")


class UnifiedCriteriaResponseData(CamelModel):
    """Response data for unified criteria processing"""
    criteria_formulas: List[CriteriaFormula] = Field(
        ...,
        description="Sentence-by-sentence formulas with suggestions"
    )
    total_sentences: int = Field(..., description="Total sentences processed")
    mapped_sentences: int = Field(..., description="Successfully mapped sentences")
    unmapped_sentences: int = Field(..., description="Sentences with unmapped concepts")
    columns_used: List[str] = Field(default_factory=list, description="Columns referenced in formulas")
    inclusion_criteria: Optional[str] = None
    exclusion_criteria: Optional[str] = None


class UnifiedCriteriaResponse(BaseModel):
    """Response for unified criteria processing endpoint"""
    status: str = "success"
    message: Optional[str] = None
    data: UnifiedCriteriaResponseData
