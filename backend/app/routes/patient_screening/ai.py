"""
AI Routes for Patient Screening

API endpoints for AI/LLM-powered operations including
filter generation, column description generation, and criteria processing.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Dict, Optional, List, Any
from uuid import UUID

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions, Auth0User
from app.services.patient_screening.llm_service import get_llm_service
from app.services.patient_screening import DataService
from app.schemas.patient_screening.data_schemas import (
    UnifiedCriteriaRequest,
    UnifiedCriteriaResponse,
)
from app.schemas.patient_screening.ai_schemas import (
    GenerateColumnDescriptionsRequest,
    GenerateColumnDescriptionsResponse,
    ColumnDescription,
    ColumnCategory,
)
from app.schemas.patient_screening.common import SuccessResponse
from app.core.logging import get_class_logger

logger = get_class_logger(__name__)

router = APIRouter(tags=["Patient Screening - AI"])


class GenerateFilterRequest(BaseModel):
    """Request schema for generating filter from criteria."""

    # Option 1: Provide master_data_id to auto-fetch columns
    master_data_id: Optional[UUID] = Field(
        None, description="Master data ID to get available columns"
    )

    # Option 2: Provide columns directly
    columns: Optional[Dict[str, str]] = Field(
        None,
        description="Column names and types directly (e.g., {'age': 'number'})",
    )

    # Criteria text (at least one required)
    inclusion_criteria: Optional[str] = Field(
        None, description="Natural language inclusion criteria text"
    )
    exclusion_criteria: Optional[str] = Field(
        None, description="Natural language exclusion criteria text"
    )


class GenerateFilterResponse(BaseModel):
    """Response schema for generated filter."""

    status: str = "success"
    message: Optional[str] = None
    data: dict


@router.post(
    "/ai/generate-filter",
    response_model=GenerateFilterResponse,
    summary="Generate filter from natural language criteria",
    dependencies=[Depends(has_permissions("patient_screening_ai:execute"))],
)
async def generate_filter_from_criteria(
    request: GenerateFilterRequest,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Generate a filter from natural language inclusion/exclusion criteria.

    Uses LLM to convert text-based eligibility criteria into structured filter rules.

    You can either:
    1. Provide master_data_id to auto-fetch available columns
    2. Provide columns directly as a dictionary

    At least one of inclusion_criteria or exclusion_criteria must be provided.
    """
    # Validate criteria
    if not request.inclusion_criteria and not request.exclusion_criteria:
        raise HTTPException(
            status_code=400,
            detail="At least one of inclusion_criteria or exclusion_criteria must be provided",
        )

    # Validate column source
    if not request.master_data_id and not request.columns:
        raise HTTPException(
            status_code=400,
            detail="Either master_data_id or columns must be provided",
        )

    try:
        available_columns: Dict[str, str] = {}
        sample_data: Optional[List[Dict[str, Any]]] = None
        master_data_id_str: Optional[str] = None

        # Option 1: Get columns from master data
        if request.master_data_id:
            data_service = DataService()
            master_data = await data_service.get_master_data_by_id(db, request.master_data_id)

            if not master_data:
                raise HTTPException(status_code=404, detail="Master data not found")

            available_columns = master_data.columns
            sample_data = master_data.sample_data
            master_data_id_str = str(request.master_data_id)

        # Option 2: Use provided columns directly
        elif request.columns:
            available_columns = request.columns

        # Generate filter using LLM
        llm_service = get_llm_service()
        filter_group = await llm_service.generate_filter_from_criteria(
            inclusion_criteria=request.inclusion_criteria,
            exclusion_criteria=request.exclusion_criteria,
            available_columns=available_columns,
            sample_data=sample_data,
        )

        logger.info(
            f"Generated filter from criteria (master_data: {master_data_id_str or 'direct columns'})"
        )

        return GenerateFilterResponse(
            status="success",
            message="Filter generated successfully from criteria",
            data={
                "filter": filter_group.model_dump(),
                "master_data_id": master_data_id_str,
                "columns_used": list(available_columns.keys()),
                "inclusion_criteria": request.inclusion_criteria,
                "exclusion_criteria": request.exclusion_criteria,
            },
        )

    except ValueError as e:
        logger.error(f"Filter generation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in filter generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate filter from criteria")


@router.post(
    "/ai/generate-column-descriptions",
    response_model=GenerateColumnDescriptionsResponse,
    summary="Generate column descriptions using AI",
    dependencies=[Depends(has_permissions("patient_screening_ai:execute"))],
)
async def generate_column_descriptions(
    request: GenerateColumnDescriptionsRequest,
    current_user: Auth0User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Generate clinical descriptions for dataset columns using AI.

    Uses LLM to analyze column names and metadata to generate:
    - Clinical descriptions based on authoritative medical knowledge
    - Category classifications (Demographics, Clinical/Lab Values, etc.)
    - Confidence scores indicating reliability of the description
    - Expanded abbreviations and units of measure where applicable

    Input modes:
    1. master_data_id: Fetch columns from stored master data
    2. columns: Provide column metadata directly
    3. column_names: Simple list of column names
    """
    # Validate input
    if not request.master_data_id and not request.columns and not request.column_names:
        raise HTTPException(
            status_code=400,
            detail="Must provide one of: master_data_id, columns, or column_names",
        )

    try:
        columns_to_process: List[Dict[str, Any]] = []
        sample_data: Optional[List[Dict[str, Any]]] = None
        master_data_id_str: Optional[str] = None

        # Option 1: Get columns from master data
        if request.master_data_id:
            data_service = DataService()
            master_data = await data_service.get_master_data_by_id(db, request.master_data_id)

            if not master_data:
                raise HTTPException(status_code=404, detail="Master data not found")

            # Convert columns dict to list format
            for col_name, col_type in master_data.columns.items():
                col_info = {"name": col_name, "data_type": col_type}
                if master_data.sample_data:
                    col_info["sample_values"] = [
                        row.get(col_name)
                        for row in master_data.sample_data
                        if row.get(col_name) is not None
                    ][:10]
                columns_to_process.append(col_info)

            sample_data = master_data.sample_data
            master_data_id_str = str(request.master_data_id)

        # Option 2: Use provided columns with metadata
        elif request.columns:
            columns_to_process = [col.model_dump() for col in request.columns]

        # Option 3: Use simple column names
        elif request.column_names:
            columns_to_process = [{"name": name} for name in request.column_names]

        # Generate descriptions using LLM
        llm_service = get_llm_service()
        raw_descriptions = await llm_service.generate_column_descriptions(
            columns=columns_to_process,
            sample_data=sample_data,
        )

        # Build a lookup for input data types
        input_data_types = {}
        for col in columns_to_process:
            input_data_types[col.get("name", "")] = col.get("data_type", "string")

        # Parse and validate descriptions
        descriptions = []
        for desc in raw_descriptions:
            try:
                category = ColumnCategory(desc.get("category", "Administrative"))
            except ValueError:
                category = ColumnCategory.ADMINISTRATIVE

            column_name = desc["column_name"]
            inferred_data_type = input_data_types.get(column_name)
            recommended_data_type = desc.get("recommended_data_type") or desc.get("data_type")
            if not recommended_data_type:
                recommended_data_type = inferred_data_type or "string"

            descriptions.append(
                ColumnDescription(
                    column_name=column_name,
                    clinical_description=desc.get("clinical_description", "No description available"),
                    category=category,
                    confidence_score=min(max(float(desc.get("confidence_score", 0.5)), 0.0), 1.0),
                    inferred_data_type=inferred_data_type,
                    recommended_data_type=recommended_data_type,
                    abbreviation_expansion=desc.get("abbreviation_expansion"),
                    unit_of_measure=desc.get("unit_of_measure"),
                    reference_range=desc.get("reference_range"),
                )
            )

        logger.info(
            f"Generated descriptions for {len(descriptions)} columns "
            f"(master_data: {master_data_id_str or 'direct input'})"
        )

        return GenerateColumnDescriptionsResponse(
            status="success",
            message=f"Generated descriptions for {len(descriptions)} columns",
            descriptions=descriptions,
            total_columns=len(descriptions),
            master_data_id=master_data_id_str,
        )

    except ValueError as e:
        logger.error(f"Column description generation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in column description generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate column descriptions")


@router.post(
    "/ai/process-criteria",
    response_model=UnifiedCriteriaResponse,
    summary="Process criteria into filter formulas",
    dependencies=[Depends(has_permissions("patient_screening_ai:execute"))],
)
async def process_criteria_unified(
    request: UnifiedCriteriaRequest,
    current_user: Auth0User = Depends(get_current_user),
):
    """
    Process inclusion/exclusion criteria into sentence-by-sentence formulas.

    This unified endpoint:
    1. Parses criteria text preserving exact user wording
    2. Generates filter formulas for each sentence
    3. Provides confidence-scored column suggestions (top 3 per field)
    4. Handles exclusions as negated formulas

    Each call creates a FRESH filter from scratch - this is a stateless operation.

    Required fields:
    - columns: Column metadata (enhanced or simple format)
    - inclusion_criteria and/or exclusion_criteria
    """
    try:
        # Normalize columns input
        columns_metadata = {}
        if isinstance(request.columns, dict):
            for col_name, col_info in request.columns.items():
                if isinstance(col_info, dict):
                    columns_metadata[col_name] = col_info
                else:
                    columns_metadata[col_name] = {"type": col_info}

        logger.info(
            f"Generating FRESH filter from criteria: "
            f"{len(request.inclusion_criteria) if request.inclusion_criteria else 0} chars inclusion, "
            f"{len(request.exclusion_criteria) if request.exclusion_criteria else 0} chars exclusion"
        )

        # Process criteria with unified LLM method
        llm_service = get_llm_service()
        result = await llm_service.process_criteria_unified(
            inclusion_criteria=request.inclusion_criteria,
            exclusion_criteria=request.exclusion_criteria,
            columns_metadata=columns_metadata,
        )

        logger.info(
            f"Processed criteria: {result['total_sentences']} sentences, "
            f"{result['mapped_sentences']} mapped, {result['unmapped_sentences']} unmapped"
        )

        # Validate that regeneration produced results
        if result["total_sentences"] == 0:
            logger.error("Filter regeneration produced zero sentences")
            raise HTTPException(
                status_code=400,
                detail="Filter regeneration failed: No criteria sentences could be parsed.",
            )

        # Build response message
        message = f"Processed {result['total_sentences']} criteria sentences"
        if result["unmapped_sentences"] > 0:
            if result["unmapped_sentences"] / result["total_sentences"] > 0.5:
                message += f" (Warning: {result['unmapped_sentences']} sentences could not be mapped)"
            else:
                message += f" ({result['mapped_sentences']} mapped, {result['unmapped_sentences']} unmapped)"

        return UnifiedCriteriaResponse(
            status="success",
            message=message,
            criteria_formulas=result["criteria_formulas"],
            total_sentences=result["total_sentences"],
            mapped_sentences=result["mapped_sentences"],
            unmapped_sentences=result["unmapped_sentences"],
            columns_used=result["columns_used"],
            inclusion_criteria=request.inclusion_criteria,
            exclusion_criteria=request.exclusion_criteria,
        )

    except ValueError as e:
        logger.error(f"Criteria processing failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in criteria processing: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process criteria")
