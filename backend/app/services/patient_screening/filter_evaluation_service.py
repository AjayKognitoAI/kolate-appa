"""
Filter Evaluation Service

Service for evaluating filter rules against patient data.
Supports recursive filter groups, various operators, and date handling.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, date
import logging

from app.schemas.patient_screening.filter_schemas import (
    FilterGroup,
    FilterRule,
    OperatorType,
    LogicType,
)
from app.core.logging import get_class_logger

logger = logging.getLogger(__name__)


def parse_date(value: Any) -> Optional[date]:
    """
    Parse various date formats to date object.

    Args:
        value: Value to parse (string, datetime, date, or None)

    Returns:
        Parsed date object or None if parsing fails
    """
    if value is None or value == "":
        return None

    # Already a date/datetime object
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    # Try parsing string formats
    value_str = str(value).strip()
    if not value_str:
        return None

    # Common date formats to try
    date_formats = [
        "%Y-%m-%d",      # ISO: 2024-01-15
        "%Y/%m/%d",      # ISO with slash: 2024/01/15
        "%m/%d/%Y",      # US: 01/15/2024
        "%m-%d-%Y",      # US with dash: 01-15-2024
        "%d/%m/%Y",      # EU: 15/01/2024
        "%d-%m-%Y",      # EU with dash: 15-01-2024
        "%m/%d/%y",      # Short US: 01/15/24
        "%m-%d-%y",      # Short US with dash: 01-15-24
        "%d/%m/%y",      # Short EU: 15/01/24
        "%d-%m-%y",      # Short EU with dash: 15-01-24
        "%B %d, %Y",     # Text: January 15, 2024
        "%B %d %Y",      # Text without comma: January 15 2024
        "%b %d, %Y",     # Short text: Jan 15, 2024
        "%b %d %Y",      # Short text without comma: Jan 15 2024
        "%d %B %Y",      # EU text: 15 January 2024
        "%d %b %Y",      # EU short text: 15 Jan 2024
    ]

    for fmt in date_formats:
        try:
            return datetime.strptime(value_str, fmt).date()
        except ValueError:
            continue

    return None


class FilterEvaluationService:
    """
    Service for evaluating filters against patient data.

    Features:
    - Recursive filter group evaluation
    - Support for all operator types (equals, gt, between, etc.)
    - Date comparison operators
    - Logic operators (AND/OR) with negation support
    """

    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    def evaluate_filter(
        self,
        filter_group: FilterGroup,
        patient_data: Dict[str, Any]
    ) -> bool:
        """
        Recursively evaluate a filter group against patient data.

        Args:
            filter_group: FilterGroup containing rules and/or nested groups
            patient_data: Dictionary of patient field values

        Returns:
            True if patient matches the filter criteria
        """
        results = []

        for rule in filter_group.rules:
            if isinstance(rule, FilterRule):
                result = self._evaluate_rule(rule, patient_data)
            else:  # Nested FilterGroup
                result = self.evaluate_filter(rule, patient_data)

            results.append(result)

        # Apply logic operator
        if filter_group.logic == LogicType.AND:
            final_result = all(results) if results else True
        else:  # OR
            final_result = any(results) if results else False

        # Apply negation
        if filter_group.negate:
            final_result = not final_result

        return final_result

    def _evaluate_rule(
        self,
        rule: FilterRule,
        patient_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate a single filter rule.

        Args:
            rule: FilterRule to evaluate
            patient_data: Dictionary of patient field values

        Returns:
            True if the rule matches
        """
        field_value = patient_data.get(rule.field)

        try:
            if rule.operator == OperatorType.EQUALS:
                return field_value == rule.value

            elif rule.operator == OperatorType.NOT_EQUALS:
                return field_value != rule.value

            elif rule.operator == OperatorType.CONTAINS:
                if field_value is None:
                    return False
                return str(rule.value).lower() in str(field_value).lower()

            elif rule.operator == OperatorType.GT:
                return float(field_value) > float(rule.value)

            elif rule.operator == OperatorType.GTE:
                return float(field_value) >= float(rule.value)

            elif rule.operator == OperatorType.LT:
                return float(field_value) < float(rule.value)

            elif rule.operator == OperatorType.LTE:
                return float(field_value) <= float(rule.value)

            elif rule.operator == OperatorType.BETWEEN:
                val = float(field_value)
                return float(rule.value) <= val <= float(rule.value2)

            elif rule.operator == OperatorType.IS_EMPTY:
                return field_value is None or field_value == ""

            elif rule.operator == OperatorType.IS_NOT_EMPTY:
                return field_value is not None and field_value != ""

            # Date operators
            elif rule.operator == OperatorType.ON_DATE:
                field_date = parse_date(field_value)
                compare_date = parse_date(rule.value)
                if field_date is None or compare_date is None:
                    return False
                return field_date == compare_date

            elif rule.operator == OperatorType.BEFORE:
                field_date = parse_date(field_value)
                compare_date = parse_date(rule.value)
                if field_date is None or compare_date is None:
                    return False
                return field_date < compare_date

            elif rule.operator == OperatorType.AFTER:
                field_date = parse_date(field_value)
                compare_date = parse_date(rule.value)
                if field_date is None or compare_date is None:
                    return False
                return field_date > compare_date

            elif rule.operator == OperatorType.ON_OR_BEFORE:
                field_date = parse_date(field_value)
                compare_date = parse_date(rule.value)
                if field_date is None or compare_date is None:
                    return False
                return field_date <= compare_date

            elif rule.operator == OperatorType.ON_OR_AFTER:
                field_date = parse_date(field_value)
                compare_date = parse_date(rule.value)
                if field_date is None or compare_date is None:
                    return False
                return field_date >= compare_date

            elif rule.operator == OperatorType.BETWEEN_DATES:
                field_date = parse_date(field_value)
                start_date = parse_date(rule.value)
                end_date = parse_date(rule.value2)
                if field_date is None or start_date is None or end_date is None:
                    return False
                return start_date <= field_date <= end_date

        except (TypeError, ValueError) as e:
            self.logger.warning(f"Filter evaluation error on field '{rule.field}': {e}")
            return False

        return False

    def evaluate_patients(
        self,
        filter_group: FilterGroup,
        patients: List[Dict[str, Any]],
        patient_id_field: str = "patient_id"
    ) -> List[str]:
        """
        Evaluate filter against multiple patients and return matching IDs.

        Args:
            filter_group: FilterGroup to evaluate
            patients: List of patient data dictionaries
            patient_id_field: Field name containing patient ID

        Returns:
            List of patient IDs that match the filter
        """
        matching_ids = []

        for patient in patients:
            if self.evaluate_filter(filter_group, patient):
                patient_id = patient.get(patient_id_field)
                if patient_id is not None:
                    matching_ids.append(str(patient_id))

        self.logger.info(
            f"Filter evaluation: {len(matching_ids)}/{len(patients)} patients matched"
        )
        return matching_ids


# Singleton instance for convenience
filter_evaluation_service = FilterEvaluationService()
