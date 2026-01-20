"""
LLM Service for Patient Screening

Service for LLM-based filter generation from natural language criteria.
Uses the centralized LLM client for OpenAI/Azure OpenAI interactions.
"""

from typing import Dict, List, Any, Optional, Tuple
import json
import uuid
import re
import difflib

from app.config.settings import settings
from app.core.logging import get_class_logger
from app.core.llm_client import LLMClient, get_llm_client
from app.schemas.patient_screening.filter_schemas import (
    FilterGroup,
    FilterRule,
    LogicType,
    OperatorType,
)


class LLMService:
    """
    Service for LLM-based filter generation from natural language criteria.

    Uses the centralized LLM client and adds patient-screening specific:
    - Prompt engineering for filter generation
    - Column extraction from criteria
    - Clinical description generation
    - Filter parsing and validation
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize LLM service.

        Args:
            llm_client: Optional LLM client instance (uses global singleton if not provided)
        """
        self.logger = get_class_logger(self.__class__)
        self._llm_client = llm_client

    @property
    def llm_client(self) -> LLMClient:
        """Get LLM client (lazy-loaded singleton if not provided)."""
        if self._llm_client is None:
            self._llm_client = get_llm_client()
        return self._llm_client

    async def generate_filter_from_criteria(
        self,
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str],
        available_columns: Dict[str, str],
        sample_data: Optional[List[Dict[str, Any]]] = None,
    ) -> FilterGroup:
        """
        Generate a FilterGroup from natural language inclusion/exclusion criteria.

        Args:
            inclusion_criteria: Natural language description of inclusion criteria
            exclusion_criteria: Natural language description of exclusion criteria
            available_columns: Dictionary of column names to their types
            sample_data: Optional sample rows from the dataset

        Returns:
            FilterGroup object representing the criteria as filters
        """
        system_prompt = self._build_system_prompt(available_columns, sample_data)
        user_prompt = self._build_user_prompt(inclusion_criteria, exclusion_criteria)

        try:
            result = await self.llm_client.simple_prompt_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=settings.LLM_TEMPERATURE,
            )

            self.logger.info(f"LLM generated filter: {result}")
            return self._parse_llm_response(result)

        except Exception as e:
            self.logger.error(f"LLM filter generation failed: {str(e)}")
            raise ValueError(f"Failed to generate filter from criteria: {str(e)}")

    def _build_system_prompt(
        self,
        available_columns: Dict[str, str],
        sample_data: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Build the system prompt for filter generation."""
        columns_info = "\n".join(
            [f"  - {name}: {col_type}" for name, col_type in available_columns.items()]
        )

        sample_info = ""
        if sample_data and len(sample_data) > 0:
            sample_info = "\n\nSample data from the dataset (first few rows):\n"
            sample_info += json.dumps(sample_data[:5], indent=2, default=str)
            sample_info += "\n\nUse this sample data to understand actual values and realistic ranges."

        return f"""You are a clinical research patient screening filter generator. Convert natural language inclusion and exclusion criteria into structured filter rules organized by screening gates.

Available columns in the dataset:
{columns_info}{sample_info}

Available operators:
- equals: Exact match (for categorical/string fields)
- not_equals: Not equal to value
- contains: Partial match (for string fields)
- gt: Greater than (for number fields)
- gte: Greater than or equal (for number fields)
- lt: Less than (for number fields)
- lte: Less than or equal (for number fields)
- between: Between two values (for number fields, requires value and value2)
- is_empty: Field is empty/null
- is_not_empty: Field has a value

Organize filters into logical screening gates:
- Gate 1 - Demographics: Age, gender, location, etc.
- Gate 2 - Clinical Criteria: Diagnosis, conditions, lab values, etc.
- Gate 3 - Treatment History: Prior treatments, medications, procedures, etc.
- Gate 4 - Study Specific: Protocol-specific requirements
- Safety Exclusions: Flat group for all exclusion rules

Respond with valid JSON in this format:
{{
  "id": "unique-uuid-string",
  "name": "Patient Screening Filter",
  "logic": "AND",
  "negate": false,
  "rules": [
    {{
      "type": "group",
      "id": "unique-uuid-string",
      "name": "Gate 1 - Demographics",
      "logic": "AND",
      "negate": false,
      "rules": [
        {{
          "type": "rule",
          "id": "unique-uuid-string",
          "field": "column_name",
          "operator": "operator_name",
          "value": "value or number",
          "value2": null
        }}
      ]
    }}
  ]
}}

Rules:
1. Organize rules into named groups (gates) based on criteria type
2. Use "AND" logic at top level and within inclusion gates
3. For exclusion criteria, each rule checks patient does NOT have condition
4. Never use negate=true - handle negation in rule values
5. Each rule and group must have unique "id" (UUID format)
6. Match column names EXACTLY as provided
7. Only create gates that have applicable rules"""

    def _build_user_prompt(
        self,
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str],
    ) -> str:
        """Build the user prompt with the criteria."""
        prompt_parts = []

        if inclusion_criteria:
            prompt_parts.append(f"Inclusion Criteria:\n{inclusion_criteria}")

        if exclusion_criteria:
            prompt_parts.append(f"Exclusion Criteria:\n{exclusion_criteria}")

        if not prompt_parts:
            raise ValueError(
                "At least one of inclusion or exclusion criteria must be provided"
            )

        prompt_parts.append(
            "\n\nGenerate the filter JSON organizing criteria into appropriate gates."
        )

        return "\n".join(prompt_parts)

    def _parse_llm_response(self, response: Dict[str, Any]) -> FilterGroup:
        """Parse LLM response into FilterGroup object."""

        def parse_rules(rules: List[Dict]) -> List:
            parsed = []
            for rule in rules:
                if rule.get("type") == "group" or "rules" in rule:
                    # Nested group
                    parsed.append(
                        FilterGroup(
                            id=rule.get("id", str(uuid.uuid4())),
                            name=rule.get("name"),
                            logic=LogicType(rule.get("logic", "AND")),
                            negate=rule.get("negate", False),
                            rules=parse_rules(rule.get("rules", [])),
                        )
                    )
                else:
                    # Single rule
                    parsed.append(
                        FilterRule(
                            id=rule.get("id", str(uuid.uuid4())),
                            field=rule["field"],
                            operator=OperatorType(rule["operator"]),
                            value=rule.get("value"),
                            value2=rule.get("value2"),
                        )
                    )
            return parsed

        return FilterGroup(
            id=response.get("id", str(uuid.uuid4())),
            name=response.get("name", "Generated Filter"),
            logic=LogicType(response.get("logic", "AND")),
            negate=response.get("negate", False),
            rules=parse_rules(response.get("rules", [])),
        )

    async def extract_required_columns(
        self,
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str],
    ) -> Tuple[List[str], List[Dict[str, Any]]]:
        """
        Extract required column names from natural language criteria.

        Args:
            inclusion_criteria: Natural language inclusion criteria
            exclusion_criteria: Natural language exclusion criteria

        Returns:
            Tuple of (column names list, criteria-to-column mappings list)
        """
        if not inclusion_criteria and not exclusion_criteria:
            return [], []

        system_prompt = """You are a clinical research data modeler.

Extract the minimal set of dataset-level columns required to evaluate the given criteria.

Guidelines:
1. Group related conditions into single fields when appropriate
2. Prefer boolean or summary fields over fine-grained diagnoses
3. Extract fields that would realistically exist in a screening dataset
4. Use snake_case naming

Output Format (JSON):
{
  "required_columns": ["column_1", "column_2"],
  "criteria_mapping": [
    {"criterion": "Criterion text", "columns": ["column_1"], "type": "inclusion"}
  ]
}"""

        user_prompt_parts = []
        if inclusion_criteria:
            user_prompt_parts.append(f"Inclusion Criteria:\n{inclusion_criteria}")
        else:
            user_prompt_parts.append("Inclusion Criteria:\n(None provided)")

        if exclusion_criteria:
            user_prompt_parts.append(f"Exclusion Criteria:\n{exclusion_criteria}")
        else:
            user_prompt_parts.append("Exclusion Criteria:\n(None provided)")

        user_prompt = "\n\n".join(user_prompt_parts)

        try:
            result = await self.llm_client.simple_prompt_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=settings.LLM_TEMPERATURE,
            )

            self.logger.info(f"LLM extracted required columns: {result}")
            return result.get("required_columns", []), result.get("criteria_mapping", [])

        except Exception as e:
            self.logger.error(f"LLM column extraction failed: {str(e)}")
            raise ValueError(f"Failed to extract required columns: {str(e)}")

    async def generate_column_descriptions(
        self,
        columns: List[Dict[str, Any]],
        sample_data: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate clinical descriptions for dataset columns using LLM.

        Args:
            columns: List of column info dicts with 'name', 'data_type', 'sample_values'
            sample_data: Optional sample rows from the dataset

        Returns:
            List of column descriptions with clinical info
        """
        system_prompt = self._build_column_description_system_prompt()
        user_prompt = self._build_column_description_user_prompt(columns, sample_data)

        try:
            result = await self.llm_client.simple_prompt_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=settings.LLM_TEMPERATURE,
            )

            self.logger.info(f"LLM generated descriptions for {len(columns)} columns")
            return result.get("descriptions", [])

        except Exception as e:
            self.logger.error(f"LLM column description generation failed: {str(e)}")
            raise ValueError(f"Failed to generate column descriptions: {str(e)}")

    def _build_column_description_system_prompt(self) -> str:
        """Build the system prompt for column description generation."""
        return """You are a clinical research data dictionary specialist.

Generate meaningful clinical descriptions for dataset columns used in patient screening.

For each column, provide:
1. clinical_description: 2-3 sentences about what the column represents
2. category: Demographics | Clinical/Lab Values | Treatment History | Safety/Exclusions | Study-Specific | Administrative
3. confidence_score: 0.0-1.0 reflecting confidence in interpretation
4. recommended_data_type: number | categorical | string | text
5. abbreviation_expansion: Full name if abbreviation, else null
6. unit_of_measure: Standard units if applicable, else null
7. reference_range: Typical range if standardized, else null

RESPONSE FORMAT (JSON):
{
  "descriptions": [
    {
      "column_name": "original_column_name",
      "clinical_description": "2-3 sentences...",
      "category": "Category name",
      "confidence_score": 0.85,
      "recommended_data_type": "number",
      "abbreviation_expansion": "Full name or null",
      "unit_of_measure": "unit or null",
      "reference_range": "range or null"
    }
  ]
}"""

    def _build_column_description_user_prompt(
        self,
        columns: List[Dict[str, Any]],
        sample_data: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Build the user prompt with column information."""
        prompt_parts = ["Generate clinical descriptions for these columns:\n"]

        for col in columns:
            col_info = f"- {col['name']}"
            if col.get("data_type"):
                col_info += f" (type: {col['data_type']})"
            if col.get("sample_values"):
                samples = col["sample_values"][:5]
                col_info += f" [samples: {samples}]"
            prompt_parts.append(col_info)

        if sample_data:
            prompt_parts.append("\n\nSample data rows:")
            prompt_parts.append(json.dumps(sample_data[:3], indent=2, default=str))

        return "\n".join(prompt_parts)

    async def process_criteria_unified(
        self,
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str],
        columns_metadata: Dict[str, Any],
        sample_data: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Unified criteria processing - combines schema mapping and formula generation.

        Args:
            inclusion_criteria: Natural language inclusion criteria
            exclusion_criteria: Natural language exclusion criteria
            columns_metadata: Column metadata dictionary
            sample_data: Optional sample rows

        Returns:
            Dictionary with criteria_formulas and summary information
        """
        if not inclusion_criteria and not exclusion_criteria:
            raise ValueError(
                "At least one of inclusion or exclusion criteria must be provided"
            )

        system_prompt = self._build_unified_system_prompt(columns_metadata, sample_data)
        user_prompt = self._build_unified_user_prompt(
            inclusion_criteria, exclusion_criteria
        )
        available_columns = list(columns_metadata.keys())

        try:
            result = await self.llm_client.simple_prompt_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=settings.LLM_TEMPERATURE,
            )

            self.logger.info("LLM unified criteria processing result")

            return self._parse_unified_response(
                result,
                inclusion_criteria,
                exclusion_criteria,
                available_columns=available_columns,
            )

        except Exception as e:
            self.logger.error(f"LLM unified criteria processing failed: {str(e)}")
            raise ValueError(f"Failed to process criteria: {str(e)}")

    def _build_unified_system_prompt(
        self,
        columns_metadata: Dict[str, Any],
        sample_data: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Build system prompt for unified criteria processing."""
        columns_info = self._format_columns_for_prompt(columns_metadata)

        sample_info = ""
        if sample_data and len(sample_data) > 0:
            sample_info = "\n\n## Sample Data:\n"
            sample_info += json.dumps(sample_data[:5], indent=2, default=str)

        return f"""You are a clinical research criteria parser. Convert criteria into structured formulas.

Available Dataset Columns:
{columns_info}{sample_info}

Task:
1. Split criteria into logical sentences
2. Assign each to a category (Demographics, Clinical/Lab Values, Treatment History, Safety/Exclusions, Study-Specific, Administrative)
3. Generate filter formulas using operators: equals, not_equals, contains, gt, gte, lt, lte, between, is_empty, is_not_empty
4. For exclusions, negate the formula
5. Suggest matching columns with confidence scores

Response Format (JSON):
{{
  "criteria_formulas": [
    {{
      "sentence": "Age >= 18 years",
      "type": "inclusion",
      "category": "Demographics",
      "formula": {{"logic": "AND", "rules": [{{"field": "age", "operator": "gte", "value": 18}}]}},
      "column_suggestions": [{{"field_in_formula": "age", "suggestions": [{{"column": "age", "confidence": 100}}]}}],
      "unmapped_concepts": []
    }}
  ]
}}"""

    def _build_unified_user_prompt(
        self,
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str],
    ) -> str:
        """Build user prompt for unified criteria processing."""
        prompt_parts = []

        if inclusion_criteria:
            prompt_parts.append(f"Inclusion Criteria:\n{inclusion_criteria}")

        if exclusion_criteria:
            prompt_parts.append(f"Exclusion Criteria:\n{exclusion_criteria}")

        prompt_parts.append("\n\nProcess each criterion sentence-by-sentence.")

        return "\n\n".join(prompt_parts)

    def _format_columns_for_prompt(self, columns_metadata: Dict[str, Any]) -> str:
        """Format column metadata for inclusion in prompt."""
        lines = []

        for col_name, col_info in columns_metadata.items():
            if isinstance(col_info, dict):
                col_type = col_info.get("type", "string")
                description = col_info.get("description", "")
                samples = col_info.get("sample_values", [])

                line = f"- {col_name} ({col_type})"
                if description:
                    line += f": {description}"
                if samples:
                    sample_display = samples[:5] if len(samples) > 5 else samples
                    line += f" | Examples: {sample_display}"
                lines.append(line)
            else:
                lines.append(f"- {col_name} ({col_info})")

        return "\n".join(lines)

    def _parse_unified_response(
        self,
        response: Dict[str, Any],
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str],
        available_columns: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Parse and validate the LLM response for unified criteria processing."""
        criteria_formulas = response.get("criteria_formulas", [])

        validated_formulas = []
        columns_used = set()
        mapped_count = 0
        unmapped_count = 0

        for formula_data in criteria_formulas:
            unmapped_concepts = list(formula_data.get("unmapped_concepts", []))
            normalized_formula = self._normalize_formula(formula_data.get("formula", {}))

            if available_columns:
                unmapped_fields = []
                validated_formula_data = self._validate_formula_fields(
                    normalized_formula, available_columns, unmapped_fields
                )
                for field in unmapped_fields:
                    if field not in unmapped_concepts:
                        unmapped_concepts.append(field)
            else:
                validated_formula_data = normalized_formula

            formula_columns = self._extract_columns_from_formula(validated_formula_data)
            columns_used.update(formula_columns)

            if unmapped_concepts:
                unmapped_count += 1
            else:
                mapped_count += 1

            column_suggestions = formula_data.get("column_suggestions", [])
            if available_columns:
                column_suggestions = self._filter_column_suggestions(
                    column_suggestions, available_columns
                )

            validated_formula = {
                "sentence": formula_data.get("sentence", ""),
                "type": formula_data.get("type", "inclusion"),
                "category": formula_data.get("category", "Study-Specific"),
                "formula": validated_formula_data,
                "column_suggestions": column_suggestions,
                "unmapped_concepts": unmapped_concepts,
            }
            validated_formulas.append(validated_formula)

        return {
            "criteria_formulas": validated_formulas,
            "total_sentences": len(validated_formulas),
            "mapped_sentences": mapped_count,
            "unmapped_sentences": unmapped_count,
            "columns_used": list(columns_used),
            "inclusion_criteria": inclusion_criteria,
            "exclusion_criteria": exclusion_criteria,
        }

    def _normalize_formula(self, formula: Dict) -> Dict:
        """Normalize formula structure for consistency."""
        if not formula:
            return {}

        if "rules" in formula:
            return {
                "logic": formula.get("logic", "AND"),
                "negate": formula.get("negate", False),
                "rules": [self._normalize_formula(r) for r in formula["rules"]],
            }
        else:
            result = {
                "field": formula.get("field", ""),
                "operator": formula.get("operator", "equals"),
                "value": formula.get("value"),
            }
            if "value2" in formula and formula["value2"] is not None:
                result["value2"] = formula["value2"]
            return result

    def _extract_columns_from_formula(self, formula: Dict) -> List[str]:
        """Recursively extract all column names from a formula."""
        columns = []

        if "field" in formula:
            columns.append(formula["field"])

        if "rules" in formula:
            for rule in formula["rules"]:
                columns.extend(self._extract_columns_from_formula(rule))

        return columns

    def _filter_column_suggestions(
        self,
        column_suggestions: List[Dict],
        available_columns: List[str],
    ) -> List[Dict]:
        """Filter column suggestions to only include valid columns."""
        available_columns_set = set(available_columns)
        filtered_suggestions = []

        for field_suggestion in column_suggestions:
            field_in_formula = field_suggestion.get("field_in_formula", "")
            suggestions = field_suggestion.get("suggestions", [])

            valid_suggestions = [
                s for s in suggestions if s.get("column", "") in available_columns_set
            ]

            filtered_suggestions.append(
                {
                    "field_in_formula": field_in_formula,
                    "suggestions": valid_suggestions,
                }
            )

        return filtered_suggestions

    def _normalize_column_name(self, column_name: str) -> str:
        """Normalize column name by removing separators."""
        return re.sub(r"[_\-\s]+", "", column_name.lower())

    def _find_best_column_match(
        self,
        field_name: str,
        available_columns: List[str],
        confidence_threshold: float = 0.7,
    ) -> Tuple[Optional[str], float]:
        """Find the best matching column name for a field."""
        if not field_name or not available_columns:
            return None, 0.0

        field_lower = field_name.lower()
        available_lower = {col.lower(): col for col in available_columns}

        # Exact match
        if field_lower in available_lower:
            return available_lower[field_lower], 1.0

        # Normalized match
        field_normalized = self._normalize_column_name(field_name)
        for col in available_columns:
            if self._normalize_column_name(col) == field_normalized:
                return col, 0.95

        # Fuzzy matching
        matches = difflib.get_close_matches(
            field_lower, list(available_lower.keys()), n=1, cutoff=confidence_threshold
        )
        if matches:
            similarity = difflib.SequenceMatcher(None, field_lower, matches[0]).ratio()
            return available_lower[matches[0]], similarity

        # Substring match
        for col_lower, col_original in available_lower.items():
            col_parts = re.split(r"[_\-\s]+", col_lower)
            if field_lower in col_parts:
                return col_original, 0.9

            if field_lower in col_lower or col_lower in field_lower:
                overlap_ratio = len(field_lower) / max(len(col_lower), 1)
                if overlap_ratio > 0.3:
                    return col_original, overlap_ratio * 0.85

        return None, 0.0

    def _validate_formula_fields(
        self,
        formula: Dict,
        available_columns: List[str],
        unmapped_fields: List[str],
    ) -> Dict:
        """Recursively validate and correct field names in a formula."""
        if not formula:
            return formula

        if "rules" in formula:
            validated_rules = []
            for rule in formula["rules"]:
                validated_rules.append(
                    self._validate_formula_fields(rule, available_columns, unmapped_fields)
                )
            return {
                "logic": formula.get("logic", "AND"),
                "negate": formula.get("negate", False),
                "rules": validated_rules,
            }
        else:
            field_name = formula.get("field", "")

            if not field_name:
                return formula

            available_lower = {col.lower(): col for col in available_columns}
            if field_name.lower() in available_lower:
                corrected_field = available_lower[field_name.lower()]
            else:
                best_match, confidence = self._find_best_column_match(
                    field_name, available_columns
                )

                if best_match and confidence >= 0.7:
                    self.logger.info(
                        f"Formula field '{field_name}' matched to '{best_match}' "
                        f"(confidence: {confidence:.2f})"
                    )
                    corrected_field = best_match
                else:
                    self.logger.warning(
                        f"Formula field '{field_name}' could not be matched"
                    )
                    if field_name not in unmapped_fields:
                        unmapped_fields.append(field_name)
                    corrected_field = field_name

            result = {
                "field": corrected_field,
                "operator": formula.get("operator", "equals"),
                "value": formula.get("value"),
            }
            if "value2" in formula and formula["value2"] is not None:
                result["value2"] = formula["value2"]
            return result


# Singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get LLM service instance singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
