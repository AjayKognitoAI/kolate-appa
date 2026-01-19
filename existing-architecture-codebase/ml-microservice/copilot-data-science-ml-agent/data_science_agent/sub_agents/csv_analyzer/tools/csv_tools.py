"""CSV analysis tools."""

import pandas as pd
from typing import Dict, Any, List, Optional
import json

from data_science_agent.shared_libraries import (
    DataLoader,
    StatisticsHelper,
    VisualizationHelper,
)
from data_science_agent.path_resolver import PathResolver


# Global cache for loaded DataFrames (keyed by file_path)
_dataframe_cache: Dict[str, pd.DataFrame] = {}


def clear_session_cache(session_id: str) -> int:
    """
    Clear all cached DataFrames for a specific session.

    Args:
        session_id: Session ID to clear cache for

    Returns:
        Number of cache entries removed
    """
    keys_to_remove = [key for key in _dataframe_cache.keys() if session_id in key]
    for key in keys_to_remove:
        del _dataframe_cache[key]
    return len(keys_to_remove)


def get_cache_size() -> int:
    """
    Get the number of DataFrames currently cached.

    Returns:
        Number of cached DataFrames
    """
    return len(_dataframe_cache)


def load_csv_file(
    file_path: str,
    encoding: str = "utf-8",
    delimiter: str = ","
) -> str:
    """
    Load a CSV file and return basic information about it.

    Args:
        file_path: Path to the CSV file
        encoding: File encoding (default: utf-8)
        delimiter: CSV delimiter (default: ,)

    Returns:
        JSON string with file and DataFrame information
    """
    try:
        # Resolve the file path intelligently
        resolved_path = PathResolver.resolve(file_path)
        loader = DataLoader()

        # Load the CSV
        df = loader.load_csv(resolved_path, encoding=encoding, delimiter=delimiter)

        # Cache the DataFrame using both original and resolved path
        _dataframe_cache[file_path] = df
        _dataframe_cache[resolved_path] = df

        # Get file info
        file_info = loader.get_file_info(file_path)

        # Get DataFrame info
        df_info = loader.get_dataframe_info(df)

        # Get data type suggestions
        type_suggestions = loader.detect_data_types(df)

        result = {
            "status": "success",
            "file_info": file_info,
            "dataframe_info": df_info,
            "type_suggestions": type_suggestions,
            "sample_rows": df.head(5).to_dict(orient='records'),
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def get_column_statistics(
    file_path: str,
    columns: Optional[List[str]] = None
) -> str:
    """
    Get descriptive statistics for specified columns.

    Args:
        file_path: Path to the CSV file
        columns: List of column names (if None, analyzes all numeric columns)

    Returns:
        JSON string with statistical analysis
    """
    try:
        # Auto-load file if not in cache
        if file_path not in _dataframe_cache:
            try:
                resolved_path = PathResolver.resolve(file_path)
                loader = DataLoader()
                df = loader.load_csv(resolved_path)
                _dataframe_cache[file_path] = df
                _dataframe_cache[resolved_path] = df
            except Exception as e:
                return json.dumps({
                    "status": "error",
                    "message": f"Could not load file: {str(e)}"
                })

        df = _dataframe_cache[file_path]
        stats_helper = StatisticsHelper()

        # Get descriptive statistics
        statistics = stats_helper.descriptive_statistics(df, columns)

        result = {
            "status": "success",
            "statistics": statistics,
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def analyze_correlations(
    file_path: str,
    method: str = "pearson",
    columns: Optional[List[str]] = None
) -> str:
    """
    Analyze correlations between numeric columns.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        method: Correlation method ('pearson', 'spearman', or 'kendall')
        columns: List of columns to include (if None, uses all numeric columns)

    Returns:
        JSON string with correlation analysis
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]
        stats_helper = StatisticsHelper()

        # Analyze correlations
        correlation_result = stats_helper.correlation_analysis(df, method, columns)

        result = {
            "status": "success",
            "correlation_analysis": correlation_result,
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def detect_outliers(
    file_path: str,
    column: str,
    method: str = "iqr"
) -> str:
    """
    Detect outliers in a numeric column.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column: Column name to analyze
        method: Detection method ('iqr' or 'zscore')

    Returns:
        JSON string with outlier detection results
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]

        if column not in df.columns:
            return json.dumps({
                "status": "error",
                "message": f"Column '{column}' not found in DataFrame."
            })

        stats_helper = StatisticsHelper()

        # Detect outliers
        outlier_result = stats_helper.outlier_detection(df[column], method)

        result = {
            "status": "success",
            "column": column,
            "outlier_analysis": outlier_result,
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def create_visualization(
    file_path: str,
    viz_type: str,
    columns: Optional[List[str]] = None,
    title: Optional[str] = None,
    **kwargs
) -> str:
    """
    Create a visualization for the data.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        viz_type: Type of visualization ('histogram', 'boxplot', 'correlation_heatmap',
                 'scatter', 'line', 'bar', 'pie', 'distribution')
        columns: Columns to visualize (depends on viz_type)
        title: Plot title
        **kwargs: Additional arguments specific to viz_type

    Returns:
        JSON string with path to saved visualization
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]
        viz_helper = VisualizationHelper()

        plot_path = None

        if viz_type == "histogram":
            if not columns or len(columns) != 1:
                return json.dumps({
                    "status": "error",
                    "message": "Histogram requires exactly one column."
                })
            plot_path = viz_helper.create_histogram(df[columns[0]], title=title)

        elif viz_type == "boxplot":
            plot_path = viz_helper.create_boxplot(df, columns=columns, title=title)

        elif viz_type == "correlation_heatmap":
            plot_path = viz_helper.create_correlation_heatmap(
                df, columns=columns, title=title,
                method=kwargs.get('method', 'pearson')
            )

        elif viz_type == "scatter":
            if not columns or len(columns) < 2:
                return json.dumps({
                    "status": "error",
                    "message": "Scatter plot requires at least 2 columns (x, y)."
                })
            plot_path = viz_helper.create_scatter_plot(
                df, columns[0], columns[1],
                hue_column=columns[2] if len(columns) > 2 else None,
                title=title
            )

        elif viz_type == "line":
            if not columns or len(columns) < 2:
                return json.dumps({
                    "status": "error",
                    "message": "Line plot requires at least 2 columns (x, y1, y2, ...)."
                })
            plot_path = viz_helper.create_line_plot(
                df, columns[0], columns[1:], title=title
            )

        elif viz_type == "bar":
            if not columns or len(columns) != 2:
                return json.dumps({
                    "status": "error",
                    "message": "Bar chart requires exactly 2 columns (x, y)."
                })
            plot_path = viz_helper.create_bar_chart(
                df, columns[0], columns[1], title=title
            )

        elif viz_type == "pie":
            if not columns or len(columns) != 1:
                return json.dumps({
                    "status": "error",
                    "message": "Pie chart requires exactly one column."
                })
            plot_path = viz_helper.create_pie_chart(
                df[columns[0]], title=title,
                top_n=kwargs.get('top_n')
            )

        elif viz_type == "distribution":
            if not columns or len(columns) != 1:
                return json.dumps({
                    "status": "error",
                    "message": "Distribution plot requires exactly one column."
                })
            plot_path = viz_helper.create_distribution_plot(
                df[columns[0]], title=title
            )

        else:
            return json.dumps({
                "status": "error",
                "message": f"Unknown visualization type: {viz_type}"
            })

        result = {
            "status": "success",
            "visualization_type": viz_type,
            "plot_path": plot_path,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def check_data_quality(file_path: str) -> str:
    """
    Check data quality issues in the CSV file.

    Args:
        file_path: Path to the CSV file (must be loaded first)

    Returns:
        JSON string with data quality report
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]
        loader = DataLoader()

        # Get DataFrame info (includes missing values, duplicates)
        df_info = loader.get_dataframe_info(df)

        # Additional quality checks
        issues = []

        # Check for columns with high missing percentage
        for col_detail in df_info['column_details']:
            if col_detail['null_percentage'] > 50:
                issues.append({
                    "severity": "high",
                    "column": col_detail['name'],
                    "issue": f"High missing data percentage: {col_detail['null_percentage']}%"
                })
            elif col_detail['null_percentage'] > 20:
                issues.append({
                    "severity": "medium",
                    "column": col_detail['name'],
                    "issue": f"Moderate missing data percentage: {col_detail['null_percentage']}%"
                })

        # Check for potential data type issues
        type_suggestions = loader.detect_data_types(df)
        for col, suggested_type in type_suggestions.items():
            current_type = str(df[col].dtype)
            if suggested_type == "numeric" and current_type == "object":
                issues.append({
                    "severity": "medium",
                    "column": col,
                    "issue": "Column appears to be numeric but stored as text"
                })
            elif suggested_type == "datetime" and current_type == "object":
                issues.append({
                    "severity": "low",
                    "column": col,
                    "issue": "Column appears to be datetime but stored as text"
                })

        result = {
            "status": "success",
            "total_rows": df_info['num_rows'],
            "total_columns": df_info['num_columns'],
            "has_duplicates": df_info['has_duplicates'],
            "duplicate_count": df_info['duplicate_count'],
            "columns_with_missing": len([c for c in df_info['column_details'] if c['null_count'] > 0]),
            "quality_issues": issues,
            "data_quality_score": max(0, 100 - len(issues) * 10),  # Simple scoring
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
