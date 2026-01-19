"""Statistical analysis tools."""

import pandas as pd
import json
from typing import Dict, Any, Optional

from data_science_agent.shared_libraries import StatisticsHelper


# Reference to CSV analyzer's cache
from data_science_agent.sub_agents.csv_analyzer.tools.csv_tools import _dataframe_cache


def perform_ttest(
    file_path: str,
    column: str,
    group_column: str,
    group1_value: Any,
    group2_value: Any,
    alternative: str = "two-sided"
) -> str:
    """
    Perform independent t-test between two groups.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column: Numeric column to analyze
        group_column: Column containing group labels
        group1_value: Value identifying first group
        group2_value: Value identifying second group
        alternative: 'two-sided', 'less', or 'greater'

    Returns:
        JSON string with t-test results
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]

        if column not in df.columns or group_column not in df.columns:
            return json.dumps({
                "status": "error",
                "message": f"Column(s) not found in DataFrame."
            })

        # Split into groups
        group1 = df[df[group_column] == group1_value][column]
        group2 = df[df[group_column] == group2_value][column]

        if len(group1) == 0 or len(group2) == 0:
            return json.dumps({
                "status": "error",
                "message": "One or both groups are empty."
            })

        stats_helper = StatisticsHelper()
        result = stats_helper.hypothesis_test_ttest(group1, group2, alternative)

        result["status"] = "success"
        result["interpretation"] = _interpret_ttest(result)

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def perform_chi_square(
    file_path: str,
    column1: str,
    column2: str
) -> str:
    """
    Perform chi-square test of independence.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column1: First categorical column
        column2: Second categorical column

    Returns:
        JSON string with chi-square test results
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]

        if column1 not in df.columns or column2 not in df.columns:
            return json.dumps({
                "status": "error",
                "message": "Column(s) not found in DataFrame."
            })

        stats_helper = StatisticsHelper()
        result = stats_helper.hypothesis_test_chi_square(df, column1, column2)

        result["status"] = "success"
        result["interpretation"] = _interpret_chi_square(result)

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def perform_anova(
    file_path: str,
    value_column: str,
    group_column: str
) -> str:
    """
    Perform one-way ANOVA test.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        value_column: Numeric column with values
        group_column: Column with group labels

    Returns:
        JSON string with ANOVA results
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]

        if value_column not in df.columns or group_column not in df.columns:
            return json.dumps({
                "status": "error",
                "message": "Column(s) not found in DataFrame."
            })

        stats_helper = StatisticsHelper()
        result = stats_helper.anova_test(df, value_column, group_column)

        result["status"] = "success"
        result["interpretation"] = _interpret_anova(result)

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def test_normality(
    file_path: str,
    column: str
) -> str:
    """
    Test for normality using Shapiro-Wilk or KS test.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column: Column to test

    Returns:
        JSON string with normality test results
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
        result = stats_helper.normality_test(df[column])

        result["status"] = "success"
        result["interpretation"] = _interpret_normality(result)

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def calculate_confidence_interval(
    file_path: str,
    column: str,
    confidence: float = 0.95
) -> str:
    """
    Calculate confidence interval for the mean.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column: Column to analyze
        confidence: Confidence level (default: 0.95)

    Returns:
        JSON string with confidence interval
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
        result = stats_helper.confidence_interval(df[column], confidence)

        result["status"] = "success"
        result["interpretation"] = (
            f"We are {confidence*100}% confident that the true population mean "
            f"lies between {result['lower_bound']:.4f} and {result['upper_bound']:.4f}."
        )

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def perform_correlation_test(
    file_path: str,
    column1: str,
    column2: str,
    method: str = "pearson"
) -> str:
    """
    Perform correlation test between two variables.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column1: First numeric column
        column2: Second numeric column
        method: Correlation method ('pearson', 'spearman', 'kendall')

    Returns:
        JSON string with correlation results
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]

        if column1 not in df.columns or column2 not in df.columns:
            return json.dumps({
                "status": "error",
                "message": "Column(s) not found in DataFrame."
            })

        # Use correlation analysis from StatisticsHelper
        stats_helper = StatisticsHelper()
        corr_result = stats_helper.correlation_analysis(df, method, [column1, column2])

        if 'error' in corr_result:
            return json.dumps({"status": "error", "message": corr_result['error']})

        # Extract specific correlation
        corr_value = corr_result['correlation_matrix'][column1][column2]

        result = {
            "status": "success",
            "column1": column1,
            "column2": column2,
            "method": method,
            "correlation": corr_value,
            "interpretation": _interpret_correlation(corr_value, method),
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def detect_outliers_advanced(
    file_path: str,
    column: str,
    methods: Optional[list] = None
) -> str:
    """
    Detect outliers using multiple methods.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        column: Column to analyze
        methods: List of methods to use (['iqr', 'zscore'] or None for both)

    Returns:
        JSON string with outlier detection results from multiple methods
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

        if methods is None:
            methods = ['iqr', 'zscore']

        stats_helper = StatisticsHelper()
        results = {}

        for method in methods:
            results[method] = stats_helper.outlier_detection(df[column], method)

        result = {
            "status": "success",
            "column": column,
            "outlier_analyses": results,
            "interpretation": _interpret_outliers(results),
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# Interpretation helper functions

def _interpret_ttest(result: Dict) -> str:
    """Interpret t-test results."""
    p_value = result['p_value']
    mean1 = result['group1_mean']
    mean2 = result['group2_mean']

    if p_value < 0.01:
        sig_text = "highly statistically significant (p < 0.01)"
    elif p_value < 0.05:
        sig_text = "statistically significant (p < 0.05)"
    else:
        sig_text = "not statistically significant (p ≥ 0.05)"

    diff = abs(mean1 - mean2)

    return (
        f"The difference between groups is {sig_text}. "
        f"Group 1 mean ({mean1:.4f}) vs Group 2 mean ({mean2:.4f}), "
        f"with a difference of {diff:.4f}."
    )


def _interpret_chi_square(result: Dict) -> str:
    """Interpret chi-square test results."""
    p_value = result['p_value']

    if p_value < 0.01:
        sig_text = "highly statistically significant (p < 0.01)"
        conclusion = "strong evidence that the variables are not independent"
    elif p_value < 0.05:
        sig_text = "statistically significant (p < 0.05)"
        conclusion = "evidence that the variables are not independent"
    else:
        sig_text = "not statistically significant (p ≥ 0.05)"
        conclusion = "insufficient evidence to reject independence"

    return f"The association between variables is {sig_text}. There is {conclusion}."


def _interpret_anova(result: Dict) -> str:
    """Interpret ANOVA results."""
    p_value = result['p_value']
    num_groups = result['num_groups']

    if p_value < 0.01:
        sig_text = "highly statistically significant (p < 0.01)"
        conclusion = "strong evidence of differences among the groups"
    elif p_value < 0.05:
        sig_text = "statistically significant (p < 0.05)"
        conclusion = "evidence of differences among the groups"
    else:
        sig_text = "not statistically significant (p ≥ 0.05)"
        conclusion = "insufficient evidence of differences among the groups"

    return (
        f"The ANOVA test with {num_groups} groups is {sig_text}. "
        f"There is {conclusion}."
    )


def _interpret_normality(result: Dict) -> str:
    """Interpret normality test results."""
    p_value = result['p_value']
    test = result['test']

    if result['is_normal_at_0.05']:
        return (
            f"Based on the {test} test (p = {p_value:.4f}), "
            f"the data appears to be normally distributed (p > 0.05). "
            f"Parametric tests are appropriate."
        )
    else:
        return (
            f"Based on the {test} test (p = {p_value:.4f}), "
            f"the data significantly deviates from normal distribution (p < 0.05). "
            f"Consider using non-parametric tests or data transformation."
        )


def _interpret_correlation(corr_value: float, method: str) -> str:
    """Interpret correlation coefficient."""
    abs_corr = abs(corr_value)

    if abs_corr > 0.7:
        strength = "strong"
    elif abs_corr > 0.4:
        strength = "moderate"
    elif abs_corr > 0.2:
        strength = "weak"
    else:
        strength = "very weak or negligible"

    direction = "positive" if corr_value > 0 else "negative"

    return (
        f"The {method} correlation coefficient is {corr_value:.4f}, "
        f"indicating a {strength} {direction} relationship between the variables."
    )


def _interpret_outliers(results: Dict) -> str:
    """Interpret outlier detection results."""
    interpretations = []

    for method, result in results.items():
        count = result['outlier_count']
        pct = result['outlier_percentage']
        interpretations.append(
            f"{method.upper()} method: {count} outliers ({pct:.2f}% of data)"
        )

    return " | ".join(interpretations)
