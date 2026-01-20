"""
Patient Screening AI Schemas

Schemas for AI-powered endpoints including column description generation.
"""

from enum import Enum
from typing import Optional, Dict, List, Any
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.base import CamelModel


class ColumnCategory(str, Enum):
    """Clinical category classification for dataset columns"""
    DEMOGRAPHICS = "Demographics"
    CLINICAL_LAB_VALUES = "Clinical/Lab Values"
    TREATMENT_HISTORY = "Treatment History"
    SAFETY_EXCLUSIONS = "Safety/Exclusions"
    STUDY_SPECIFIC = "Study-Specific"
    ADMINISTRATIVE = "Administrative"


class ColumnMetadataInput(CamelModel):
    """Metadata for a single column in request"""
    name: str = Field(..., min_length=1, description="Column name")
    data_type: Optional[str] = Field(
        None,
        description="Data type: 'string', 'number', or 'categorical'"
    )
    sample_values: Optional[List[Any]] = Field(
        None,
        description="Sample values from the column (up to 10)"
    )


class GenerateColumnDescriptionsRequest(CamelModel):
    """Request schema for generating clinical descriptions for columns"""

    # Option 1: Provide master_data_id to auto-fetch columns
    master_data_id: Optional[UUID] = Field(
        None,
        description="Master data ID to get columns automatically"
    )

    # Option 2: Provide columns with metadata
    columns: Optional[List[ColumnMetadataInput]] = Field(
        None,
        description="List of columns with optional metadata"
    )

    # Option 3: Simple mode - just column names
    column_names: Optional[List[str]] = Field(
        None,
        description="Simple list of column names"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "column_names": [
                        "age", "bmi", "easi_score", "hba1c",
                        "pregnant_or_breastfeeding", "prior_biologic_treatment"
                    ]
                },
                {
                    "columns": [
                        {"name": "bmi", "data_type": "number", "sample_values": [22.5, 28.1, 31.2]},
                        {"name": "gender", "data_type": "categorical", "sample_values": ["Male", "Female"]}
                    ]
                },
                {
                    "master_data_id": "550e8400-e29b-41d4-a716-446655440000"
                }
            ]
        }
    }


class ColumnDescription(CamelModel):
    """Clinical description for a single column"""
    column_name: str = Field(..., description="Original column name")
    clinical_description: str = Field(
        ...,
        description="Clinical/medical description of the column"
    )
    category: ColumnCategory = Field(
        ...,
        description="Clinical category classification"
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for the description (0-1)"
    )
    inferred_data_type: Optional[str] = Field(
        None,
        description="Original data type: 'string', 'number', or 'categorical'"
    )
    recommended_data_type: str = Field(
        ...,
        description="Recommended type: 'string', 'number', 'categorical', or 'text'"
    )
    abbreviation_expansion: Optional[str] = Field(
        None,
        description="Expanded form if column name is an abbreviation"
    )
    unit_of_measure: Optional[str] = Field(
        None,
        description="Standard unit of measure if applicable"
    )
    reference_range: Optional[str] = Field(
        None,
        description="Normal/reference range if applicable"
    )


class GenerateColumnDescriptionsData(CamelModel):
    """Data payload for column descriptions response"""
    descriptions: List[ColumnDescription] = Field(
        ...,
        description="List of column descriptions"
    )
    total_columns: int = Field(..., description="Total columns processed")
    master_data_id: Optional[str] = Field(
        None,
        description="Master data ID if used"
    )
    processing_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional processing metadata"
    )


class GenerateColumnDescriptionsResponse(BaseModel):
    """Response schema for column descriptions endpoint"""
    status: str = "success"
    message: Optional[str] = None
    data: GenerateColumnDescriptionsData
