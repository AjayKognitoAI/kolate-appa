"""Data loading utilities for various file formats."""

import pandas as pd
from typing import Optional, Dict, Any, List
import os


class DataLoader:
    """Handles loading data from various file formats."""

    @staticmethod
    def load_csv(
        file_path: str,
        encoding: str = "utf-8",
        delimiter: str = ",",
        **kwargs
    ) -> pd.DataFrame:
        """
        Load CSV file into pandas DataFrame.

        Args:
            file_path: Path to CSV file
            encoding: File encoding
            delimiter: CSV delimiter
            **kwargs: Additional arguments for pd.read_csv

        Returns:
            pandas DataFrame
        """
        try:
            df = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter, **kwargs)
            return df
        except Exception as e:
            raise Exception(f"Error loading CSV file: {str(e)}")

    @staticmethod
    def load_excel(file_path: str, sheet_name: Optional[str] = None, **kwargs) -> pd.DataFrame:
        """
        Load Excel file into pandas DataFrame.

        Args:
            file_path: Path to Excel file
            sheet_name: Name of sheet to load (default: first sheet)
            **kwargs: Additional arguments for pd.read_excel

        Returns:
            pandas DataFrame
        """
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name or 0, **kwargs)
            return df
        except Exception as e:
            raise Exception(f"Error loading Excel file: {str(e)}")

    @staticmethod
    def get_file_info(file_path: str) -> Dict[str, Any]:
        """
        Get basic information about a file.

        Args:
            file_path: Path to file

        Returns:
            Dictionary with file information
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_stats = os.stat(file_path)
        file_extension = os.path.splitext(file_path)[1].lower()

        return {
            "filename": os.path.basename(file_path),
            "file_path": file_path,
            "file_size_bytes": file_stats.st_size,
            "file_size_mb": round(file_stats.st_size / (1024 * 1024), 2),
            "file_type": file_extension,
            "modified_time": file_stats.st_mtime,
        }

    @staticmethod
    def get_dataframe_info(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Get comprehensive information about a DataFrame.

        Args:
            df: pandas DataFrame

        Returns:
            Dictionary with DataFrame information
        """
        numeric_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
        categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
        datetime_cols = df.select_dtypes(include=["datetime64"]).columns.tolist()

        column_info = []
        for col in df.columns:
            col_info = {
                "name": col,
                "dtype": str(df[col].dtype),
                "non_null_count": int(df[col].count()),
                "null_count": int(df[col].isnull().sum()),
                "null_percentage": round(df[col].isnull().sum() / len(df) * 100, 2),
                "unique_count": int(df[col].nunique()),
            }

            # Add sample values
            if df[col].nunique() > 0:
                col_info["sample_values"] = df[col].dropna().head(3).tolist()

            column_info.append(col_info)

        return {
            "shape": df.shape,
            "num_rows": len(df),
            "num_columns": len(df.columns),
            "columns": df.columns.tolist(),
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "datetime_columns": datetime_cols,
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2),
            "column_details": column_info,
            "has_duplicates": bool(df.duplicated().any()),
            "duplicate_count": int(df.duplicated().sum()),
        }

    @staticmethod
    def detect_data_types(df: pd.DataFrame) -> Dict[str, str]:
        """
        Detect appropriate data types for DataFrame columns.

        Args:
            df: pandas DataFrame

        Returns:
            Dictionary mapping column names to suggested types
        """
        type_suggestions = {}

        for col in df.columns:
            if df[col].dtype == "object":
                # Try to convert to numeric
                try:
                    pd.to_numeric(df[col])
                    type_suggestions[col] = "numeric"
                except (ValueError, TypeError):
                    # Try to convert to datetime
                    try:
                        pd.to_datetime(df[col])
                        type_suggestions[col] = "datetime"
                    except (ValueError, TypeError):
                        type_suggestions[col] = "categorical"
            elif df[col].dtype in ["int64", "float64"]:
                type_suggestions[col] = "numeric"
            elif df[col].dtype in ["datetime64[ns]", "datetime64"]:
                type_suggestions[col] = "datetime"
            else:
                type_suggestions[col] = str(df[col].dtype)

        return type_suggestions

    @staticmethod
    def clean_dataframe(
        df: pd.DataFrame,
        drop_duplicates: bool = False,
        drop_missing: bool = False,
        fill_missing: Optional[Dict[str, Any]] = None,
    ) -> pd.DataFrame:
        """
        Clean DataFrame with various options.

        Args:
            df: pandas DataFrame
            drop_duplicates: Whether to drop duplicate rows
            drop_missing: Whether to drop rows with missing values
            fill_missing: Dictionary mapping column names to fill values

        Returns:
            Cleaned DataFrame
        """
        df_cleaned = df.copy()

        if drop_duplicates:
            df_cleaned = df_cleaned.drop_duplicates()

        if drop_missing:
            df_cleaned = df_cleaned.dropna()
        elif fill_missing:
            df_cleaned = df_cleaned.fillna(fill_missing)

        return df_cleaned
