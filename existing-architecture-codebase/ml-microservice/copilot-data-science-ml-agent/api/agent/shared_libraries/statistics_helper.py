"""Statistical analysis helper functions."""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from scipy import stats
from sklearn.preprocessing import StandardScaler


class StatisticsHelper:
    """Provides statistical analysis functions."""

    @staticmethod
    def descriptive_statistics(df: pd.DataFrame, columns: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Calculate descriptive statistics for numeric columns.

        Args:
            df: pandas DataFrame
            columns: List of columns to analyze (default: all numeric)

        Returns:
            Dictionary with descriptive statistics
        """
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()

        if not columns:
            return {"error": "No numeric columns found"}

        results = {}
        for col in columns:
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                col_data = df[col].dropna()
                results[col] = {
                    "count": int(len(col_data)),
                    "mean": float(col_data.mean()),
                    "median": float(col_data.median()),
                    "mode": float(col_data.mode().iloc[0]) if len(col_data.mode()) > 0 else None,
                    "std": float(col_data.std()),
                    "variance": float(col_data.var()),
                    "min": float(col_data.min()),
                    "max": float(col_data.max()),
                    "q25": float(col_data.quantile(0.25)),
                    "q50": float(col_data.quantile(0.50)),
                    "q75": float(col_data.quantile(0.75)),
                    "iqr": float(col_data.quantile(0.75) - col_data.quantile(0.25)),
                    "skewness": float(col_data.skew()),
                    "kurtosis": float(col_data.kurtosis()),
                }

        return results

    @staticmethod
    def correlation_analysis(
        df: pd.DataFrame,
        method: str = "pearson",
        columns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate correlation matrix.

        Args:
            df: pandas DataFrame
            method: Correlation method ('pearson', 'spearman', 'kendall')
            columns: List of columns to include

        Returns:
            Dictionary with correlation matrix and significant correlations
        """
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()

        if len(columns) < 2:
            return {"error": "Need at least 2 numeric columns for correlation"}

        df_subset = df[columns].dropna()
        corr_matrix = df_subset.corr(method=method)

        # Find significant correlations (|r| > 0.5, excluding diagonal)
        significant_corr = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                corr_value = corr_matrix.iloc[i, j]
                if abs(corr_value) > 0.5:
                    significant_corr.append({
                        "variable1": corr_matrix.columns[i],
                        "variable2": corr_matrix.columns[j],
                        "correlation": float(corr_value),
                        "strength": "strong" if abs(corr_value) > 0.7 else "moderate"
                    })

        return {
            "correlation_matrix": corr_matrix.to_dict(),
            "significant_correlations": significant_corr,
            "method": method,
        }

    @staticmethod
    def hypothesis_test_ttest(
        group1: pd.Series,
        group2: pd.Series,
        alternative: str = "two-sided"
    ) -> Dict[str, Any]:
        """
        Perform independent t-test.

        Args:
            group1: First group data
            group2: Second group data
            alternative: 'two-sided', 'less', or 'greater'

        Returns:
            Dictionary with test results
        """
        group1_clean = group1.dropna()
        group2_clean = group2.dropna()

        t_stat, p_value = stats.ttest_ind(group1_clean, group2_clean, alternative=alternative)

        return {
            "test": "Independent t-test",
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "alternative": alternative,
            "group1_mean": float(group1_clean.mean()),
            "group2_mean": float(group2_clean.mean()),
            "group1_std": float(group1_clean.std()),
            "group2_std": float(group2_clean.std()),
            "group1_n": int(len(group1_clean)),
            "group2_n": int(len(group2_clean)),
            "significant_at_0.05": p_value < 0.05,
            "significant_at_0.01": p_value < 0.01,
        }

    @staticmethod
    def hypothesis_test_chi_square(
        df: pd.DataFrame,
        column1: str,
        column2: str
    ) -> Dict[str, Any]:
        """
        Perform chi-square test of independence.

        Args:
            df: pandas DataFrame
            column1: First categorical column
            column2: Second categorical column

        Returns:
            Dictionary with test results
        """
        contingency_table = pd.crosstab(df[column1], df[column2])
        chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)

        return {
            "test": "Chi-square test of independence",
            "chi2_statistic": float(chi2),
            "p_value": float(p_value),
            "degrees_of_freedom": int(dof),
            "contingency_table": contingency_table.to_dict(),
            "significant_at_0.05": p_value < 0.05,
            "significant_at_0.01": p_value < 0.01,
        }

    @staticmethod
    def normality_test(data: pd.Series) -> Dict[str, Any]:
        """
        Test for normality using Shapiro-Wilk test.

        Args:
            data: pandas Series

        Returns:
            Dictionary with test results
        """
        data_clean = data.dropna()

        if len(data_clean) < 3:
            return {"error": "Need at least 3 observations for normality test"}

        # Shapiro-Wilk test (works well for n < 5000)
        if len(data_clean) <= 5000:
            stat, p_value = stats.shapiro(data_clean)
            test_used = "Shapiro-Wilk"
        else:
            # For larger samples, use Kolmogorov-Smirnov
            stat, p_value = stats.kstest(data_clean, 'norm')
            test_used = "Kolmogorov-Smirnov"

        return {
            "test": test_used,
            "statistic": float(stat),
            "p_value": float(p_value),
            "is_normal_at_0.05": p_value > 0.05,
            "is_normal_at_0.01": p_value > 0.01,
            "sample_size": int(len(data_clean)),
        }

    @staticmethod
    def outlier_detection(data: pd.Series, method: str = "iqr") -> Dict[str, Any]:
        """
        Detect outliers using IQR or Z-score method.

        Args:
            data: pandas Series
            method: 'iqr' or 'zscore'

        Returns:
            Dictionary with outlier information
        """
        data_clean = data.dropna()

        if method == "iqr":
            Q1 = data_clean.quantile(0.25)
            Q3 = data_clean.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = data_clean[(data_clean < lower_bound) | (data_clean > upper_bound)]

            return {
                "method": "IQR",
                "lower_bound": float(lower_bound),
                "upper_bound": float(upper_bound),
                "outlier_count": int(len(outliers)),
                "outlier_percentage": float(len(outliers) / len(data_clean) * 100),
                "outlier_values": outliers.tolist()[:10],  # Limit to 10 for brevity
            }
        else:  # zscore
            z_scores = np.abs(stats.zscore(data_clean))
            outliers = data_clean[z_scores > 3]

            return {
                "method": "Z-score",
                "threshold": 3.0,
                "outlier_count": int(len(outliers)),
                "outlier_percentage": float(len(outliers) / len(data_clean) * 100),
                "outlier_values": outliers.tolist()[:10],
            }

    @staticmethod
    def confidence_interval(
        data: pd.Series,
        confidence: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculate confidence interval for the mean.

        Args:
            data: pandas Series
            confidence: Confidence level (default 0.95)

        Returns:
            Dictionary with confidence interval
        """
        data_clean = data.dropna()
        mean = data_clean.mean()
        std_err = stats.sem(data_clean)
        margin_of_error = std_err * stats.t.ppf((1 + confidence) / 2, len(data_clean) - 1)

        return {
            "mean": float(mean),
            "confidence_level": confidence,
            "margin_of_error": float(margin_of_error),
            "lower_bound": float(mean - margin_of_error),
            "upper_bound": float(mean + margin_of_error),
            "sample_size": int(len(data_clean)),
        }

    @staticmethod
    def anova_test(df: pd.DataFrame, value_column: str, group_column: str) -> Dict[str, Any]:
        """
        Perform one-way ANOVA test.

        Args:
            df: pandas DataFrame
            value_column: Column with numeric values
            group_column: Column with group labels

        Returns:
            Dictionary with ANOVA results
        """
        groups = [group[value_column].dropna() for name, group in df.groupby(group_column)]

        if len(groups) < 2:
            return {"error": "Need at least 2 groups for ANOVA"}

        f_stat, p_value = stats.f_oneway(*groups)

        return {
            "test": "One-way ANOVA",
            "f_statistic": float(f_stat),
            "p_value": float(p_value),
            "num_groups": len(groups),
            "significant_at_0.05": p_value < 0.05,
            "significant_at_0.01": p_value < 0.01,
        }
