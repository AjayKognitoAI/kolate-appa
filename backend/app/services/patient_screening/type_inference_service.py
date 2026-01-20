"""
Type Inference Service

Service for inferring column types from pandas DataFrame data.
Used by master data upload to automatically detect column types.
"""

import re
from typing import Dict, List, Optional
import pandas as pd

from app.core.logging import get_class_logger


class TypeInferenceService:
    """
    Service for inferring column types from data.

    Analyzes pandas DataFrame columns to determine their types:
    - number: Numeric values for calculations
    - categorical: Fixed set of options (low cardinality)
    - date: Date/datetime values
    - string: General text values
    """

    # If unique values < 5% of rows, treat as categorical
    CATEGORICAL_THRESHOLD = 0.05
    # If 80%+ of non-empty values match date patterns, treat as date
    DATE_THRESHOLD = 0.8

    # Date patterns for detection
    DATE_PATTERNS = [
        r'^\d{4}[-/]\d{1,2}[-/]\d{1,2}$',           # ISO: 2024-01-15, 2024/01/15
        r'^\d{1,2}[-/]\d{1,2}[-/]\d{4}$',           # US/EU: 01/15/2024, 01-15-2024
        r'^\d{1,2}[-/]\d{1,2}[-/]\d{2}$',           # Short: 01/15/24, 01-15-24
        r'^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$',     # Text: January 15, 2024
        r'^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$',       # EU text: 15 January 2024
    ]

    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    def infer_column_types(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        Infer column types from DataFrame.

        Args:
            df: pandas DataFrame to analyze

        Returns:
            Dictionary mapping column names to inferred types
        """
        column_types = {}

        for col in df.columns:
            col_type = self._infer_single_column(df[col])
            column_types[col] = col_type

        self.logger.debug(f"Inferred types for {len(column_types)} columns")
        return column_types

    def _matches_date_pattern(self, value: str) -> bool:
        """Check if a value matches any date pattern."""
        if not isinstance(value, str):
            value = str(value)
        value = value.strip()
        for pattern in self.DATE_PATTERNS:
            if re.match(pattern, value):
                return True
        return False

    def _is_date_column(self, series: pd.Series) -> bool:
        """Check if a column contains date values."""
        # Get non-empty values
        non_empty = series.dropna()
        non_empty = non_empty[non_empty.astype(str).str.strip() != '']

        if len(non_empty) == 0:
            return False

        # Check if 80%+ of non-empty values match date patterns
        date_count = sum(1 for v in non_empty if self._matches_date_pattern(str(v)))
        return (date_count / len(non_empty)) >= self.DATE_THRESHOLD

    def _infer_single_column(self, series: pd.Series) -> str:
        """
        Infer type for a single column.

        Args:
            series: pandas Series to analyze

        Returns:
            Inferred type string: "number", "categorical", "date", or "string"
        """
        # Check for datetime dtype first
        if pd.api.types.is_datetime64_any_dtype(series):
            return "date"

        # Check if numeric
        if pd.api.types.is_numeric_dtype(series):
            unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0
            if unique_ratio < self.CATEGORICAL_THRESHOLD:
                return "categorical"
            return "number"

        # String type - check for date patterns first
        if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
            # Check if it's a date column
            if self._is_date_column(series):
                return "date"

            unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0
            if unique_ratio < self.CATEGORICAL_THRESHOLD:
                return "categorical"
            return "string"

        # Default to string
        return "string"

    def get_column_sample_values(
        self,
        df: pd.DataFrame,
        column: str,
        max_samples: int = 10
    ) -> List:
        """
        Get sample values from a column.

        Args:
            df: DataFrame containing the column
            column: Column name
            max_samples: Maximum number of samples to return

        Returns:
            List of unique sample values
        """
        if column not in df.columns:
            return []

        # Get unique non-null values
        unique_values = df[column].dropna().unique()[:max_samples]
        return unique_values.tolist()

    def get_column_statistics(self, df: pd.DataFrame, column: str) -> Dict:
        """
        Get statistics for a column.

        Args:
            df: DataFrame containing the column
            column: Column name

        Returns:
            Dictionary with column statistics
        """
        if column not in df.columns:
            return {}

        series = df[column]
        col_type = self._infer_single_column(series)

        stats = {
            "type": col_type,
            "total_count": len(series),
            "null_count": series.isna().sum(),
            "unique_count": series.nunique(),
        }

        if col_type == "number":
            stats.update({
                "min": float(series.min()) if not series.isna().all() else None,
                "max": float(series.max()) if not series.isna().all() else None,
                "mean": float(series.mean()) if not series.isna().all() else None,
            })
        elif col_type == "categorical":
            value_counts = series.value_counts().head(10).to_dict()
            stats["value_distribution"] = value_counts

        return stats


# Singleton instance for convenience
type_inference_service = TypeInferenceService()
