"""Insight generation utilities for automatic EDA and pattern detection."""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from scipy import stats
import warnings

warnings.filterwarnings('ignore')


class InsightGenerator:
    """Generates data-driven insights and evidence-based analysis."""

    @staticmethod
    def generate_comprehensive_insights(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate comprehensive insights from a DataFrame.

        Args:
            df: pandas DataFrame

        Returns:
            Dictionary with categorized insights
        """
        insights = {
            "summary": InsightGenerator._generate_summary_insights(df),
            "data_quality": InsightGenerator._generate_data_quality_insights(df),
            "distributions": InsightGenerator._generate_distribution_insights(df),
            "relationships": InsightGenerator._generate_relationship_insights(df),
            "patterns": InsightGenerator._generate_pattern_insights(df),
            "anomalies": InsightGenerator._generate_anomaly_insights(df),
            "key_findings": [],
            "recommendations": [],
        }

        # Synthesize key findings
        insights["key_findings"] = InsightGenerator._synthesize_key_findings(insights)

        # Generate recommendations
        insights["recommendations"] = InsightGenerator._generate_recommendations(df, insights)

        return insights

    @staticmethod
    def _generate_summary_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate summary-level insights."""
        insights = []

        # Dataset size insight
        insights.append({
            "type": "summary",
            "category": "dataset_size",
            "insight": f"Dataset contains {len(df):,} rows and {len(df.columns)} columns",
            "evidence": {
                "rows": len(df),
                "columns": len(df.columns),
                "total_cells": len(df) * len(df.columns)
            },
            "importance": "low"
        })

        # Data type distribution
        type_counts = df.dtypes.value_counts().to_dict()
        numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
        categorical_cols = len(df.select_dtypes(include=['object', 'category']).columns)

        insights.append({
            "type": "summary",
            "category": "data_types",
            "insight": f"Dataset has {numeric_cols} numeric and {categorical_cols} categorical columns",
            "evidence": {
                "numeric_columns": numeric_cols,
                "categorical_columns": categorical_cols,
                "type_distribution": {str(k): int(v) for k, v in type_counts.items()}
            },
            "importance": "low"
        })

        return insights

    @staticmethod
    def _generate_data_quality_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate data quality insights."""
        insights = []

        # Missing data analysis
        missing_data = df.isnull().sum()
        missing_pct = (missing_data / len(df) * 100).round(2)
        cols_with_missing = missing_data[missing_data > 0]

        if len(cols_with_missing) > 0:
            high_missing = cols_with_missing[missing_pct > 50]
            if len(high_missing) > 0:
                insights.append({
                    "type": "data_quality",
                    "category": "missing_data",
                    "insight": f"⚠️ {len(high_missing)} columns have >50% missing data",
                    "evidence": {
                        "columns": high_missing.to_dict(),
                        "percentages": missing_pct[high_missing.index].to_dict()
                    },
                    "importance": "high",
                    "action_required": True
                })
            else:
                insights.append({
                    "type": "data_quality",
                    "category": "missing_data",
                    "insight": f"{len(cols_with_missing)} columns have missing values (all <50%)",
                    "evidence": {
                        "columns": cols_with_missing.to_dict(),
                        "percentages": missing_pct[cols_with_missing.index].to_dict()
                    },
                    "importance": "medium"
                })
        else:
            insights.append({
                "type": "data_quality",
                "category": "missing_data",
                "insight": "✓ No missing values detected - excellent data quality",
                "evidence": {"missing_count": 0},
                "importance": "low"
            })

        # Duplicate detection
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            insights.append({
                "type": "data_quality",
                "category": "duplicates",
                "insight": f"⚠️ Found {duplicate_count} duplicate rows ({duplicate_count/len(df)*100:.2f}%)",
                "evidence": {
                    "duplicate_count": int(duplicate_count),
                    "duplicate_percentage": float(duplicate_count/len(df)*100)
                },
                "importance": "medium",
                "action_required": True
            })

        # Check for constant columns
        constant_cols = [col for col in df.columns if df[col].nunique() == 1]
        if constant_cols:
            insights.append({
                "type": "data_quality",
                "category": "constant_columns",
                "insight": f"⚠️ {len(constant_cols)} columns have constant values (no variance)",
                "evidence": {"columns": constant_cols},
                "importance": "medium",
                "action_required": True
            })

        return insights

    @staticmethod
    def _generate_distribution_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate insights about data distributions."""
        insights = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            data = df[col].dropna()
            if len(data) == 0:
                continue

            # Check for skewness
            skewness = data.skew()
            if abs(skewness) > 1:
                direction = "right" if skewness > 0 else "left"
                insights.append({
                    "type": "distribution",
                    "category": "skewness",
                    "insight": f"'{col}' is highly skewed to the {direction} (skewness: {skewness:.2f})",
                    "evidence": {
                        "column": col,
                        "skewness": float(skewness),
                        "mean": float(data.mean()),
                        "median": float(data.median())
                    },
                    "importance": "medium"
                })

            # Check for normality
            if len(data) >= 3 and len(data) <= 5000:
                _, p_value = stats.shapiro(data)
                if p_value < 0.05:
                    insights.append({
                        "type": "distribution",
                        "category": "normality",
                        "insight": f"'{col}' significantly deviates from normal distribution (p={p_value:.4f})",
                        "evidence": {
                            "column": col,
                            "p_value": float(p_value),
                            "is_normal": False
                        },
                        "importance": "low"
                    })

            # Check for zero-inflation
            zero_pct = (data == 0).sum() / len(data) * 100
            if zero_pct > 30:
                insights.append({
                    "type": "distribution",
                    "category": "zero_inflation",
                    "insight": f"'{col}' has {zero_pct:.1f}% zero values (zero-inflated)",
                    "evidence": {
                        "column": col,
                        "zero_percentage": float(zero_pct),
                        "zero_count": int((data == 0).sum())
                    },
                    "importance": "medium"
                })

        return insights

    @staticmethod
    def _generate_relationship_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate insights about relationships between variables."""
        insights = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if len(numeric_cols) < 2:
            return insights

        # Correlation analysis
        corr_matrix = df[numeric_cols].corr()

        # Find strong correlations
        strong_correlations = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                corr_value = corr_matrix.iloc[i, j]
                if abs(corr_value) > 0.7:
                    strong_correlations.append({
                        "var1": corr_matrix.columns[i],
                        "var2": corr_matrix.columns[j],
                        "correlation": float(corr_value),
                        "strength": "very strong" if abs(corr_value) > 0.9 else "strong"
                    })

        if strong_correlations:
            insights.append({
                "type": "relationship",
                "category": "correlation",
                "insight": f"Found {len(strong_correlations)} strong correlations between variables",
                "evidence": {
                    "correlations": strong_correlations,
                    "count": len(strong_correlations)
                },
                "importance": "high"
            })

        # Check for multicollinearity
        very_strong = [c for c in strong_correlations if abs(c['correlation']) > 0.9]
        if very_strong:
            insights.append({
                "type": "relationship",
                "category": "multicollinearity",
                "insight": f"⚠️ Detected potential multicollinearity: {len(very_strong)} variable pairs with correlation >0.9",
                "evidence": {"pairs": very_strong},
                "importance": "high",
                "action_required": True
            })

        return insights

    @staticmethod
    def _generate_pattern_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate insights about patterns in the data."""
        insights = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        # Check for monotonic trends
        for col in numeric_cols:
            data = df[col].dropna()
            if len(data) > 10:
                # Check if consistently increasing/decreasing
                diff = data.diff().dropna()
                increasing_pct = (diff > 0).sum() / len(diff)
                decreasing_pct = (diff < 0).sum() / len(diff)

                if increasing_pct > 0.8:
                    insights.append({
                        "type": "pattern",
                        "category": "trend",
                        "insight": f"'{col}' shows a strong upward trend ({increasing_pct*100:.1f}% increasing)",
                        "evidence": {
                            "column": col,
                            "trend": "increasing",
                            "strength": float(increasing_pct)
                        },
                        "importance": "medium"
                    })
                elif decreasing_pct > 0.8:
                    insights.append({
                        "type": "pattern",
                        "category": "trend",
                        "insight": f"'{col}' shows a strong downward trend ({decreasing_pct*100:.1f}% decreasing)",
                        "evidence": {
                            "column": col,
                            "trend": "decreasing",
                            "strength": float(decreasing_pct)
                        },
                        "importance": "medium"
                    })

        # Categorical patterns
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        for col in categorical_cols:
            value_counts = df[col].value_counts()
            if len(value_counts) > 0:
                # Check for dominant category
                dominant_pct = value_counts.iloc[0] / len(df) * 100
                if dominant_pct > 80:
                    insights.append({
                        "type": "pattern",
                        "category": "dominant_category",
                        "insight": f"'{col}' has one dominant category: '{value_counts.index[0]}' ({dominant_pct:.1f}%)",
                        "evidence": {
                            "column": col,
                            "dominant_value": str(value_counts.index[0]),
                            "percentage": float(dominant_pct)
                        },
                        "importance": "medium"
                    })

                # Check for high cardinality
                if len(value_counts) > len(df) * 0.9:
                    insights.append({
                        "type": "pattern",
                        "category": "high_cardinality",
                        "insight": f"⚠️ '{col}' has very high cardinality ({len(value_counts)} unique values)",
                        "evidence": {
                            "column": col,
                            "unique_count": int(len(value_counts)),
                            "cardinality_ratio": float(len(value_counts) / len(df))
                        },
                        "importance": "medium"
                    })

        return insights

    @staticmethod
    def _generate_anomaly_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate insights about anomalies and outliers."""
        insights = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            data = df[col].dropna()
            if len(data) < 10:
                continue

            # IQR method for outliers
            Q1 = data.quantile(0.25)
            Q3 = data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers = data[(data < lower_bound) | (data > upper_bound)]

            if len(outliers) > 0:
                outlier_pct = len(outliers) / len(data) * 100
                if outlier_pct > 5:
                    insights.append({
                        "type": "anomaly",
                        "category": "outliers",
                        "insight": f"⚠️ '{col}' has {len(outliers)} outliers ({outlier_pct:.1f}% of data)",
                        "evidence": {
                            "column": col,
                            "outlier_count": int(len(outliers)),
                            "outlier_percentage": float(outlier_pct),
                            "bounds": {
                                "lower": float(lower_bound),
                                "upper": float(upper_bound)
                            },
                            "sample_outliers": outliers.head(5).tolist()
                        },
                        "importance": "high"
                    })

            # Check for extreme values
            mean = data.mean()
            std = data.std()
            extreme = data[abs(data - mean) > 3 * std]
            if len(extreme) > 0:
                insights.append({
                    "type": "anomaly",
                    "category": "extreme_values",
                    "insight": f"'{col}' has {len(extreme)} extreme values (>3 std from mean)",
                    "evidence": {
                        "column": col,
                        "extreme_count": int(len(extreme)),
                        "sample_values": extreme.head(5).tolist()
                    },
                    "importance": "medium"
                })

        return insights

    @staticmethod
    def _synthesize_key_findings(insights: Dict[str, Any]) -> List[str]:
        """Synthesize the most important findings."""
        findings = []

        # Count high-importance insights
        all_insights = []
        for category, insight_list in insights.items():
            if isinstance(insight_list, list):
                all_insights.extend(insight_list)

        high_importance = [i for i in all_insights if i.get("importance") == "high"]

        if high_importance:
            findings.append(f"🔍 Identified {len(high_importance)} high-priority insights requiring attention")

        # Summarize action items
        action_required = [i for i in all_insights if i.get("action_required")]
        if action_required:
            findings.append(f"⚡ {len(action_required)} data quality issues need to be addressed")

        # Data quality summary
        data_quality_insights = insights.get("data_quality", [])
        if data_quality_insights:
            missing_data_insights = [i for i in data_quality_insights if i.get("category") == "missing_data"]
            if missing_data_insights and "excellent" in missing_data_insights[0]["insight"]:
                findings.append("✓ Data quality is excellent - no missing values detected")

        # Relationship summary
        relationship_insights = insights.get("relationships", [])
        strong_corr = [i for i in relationship_insights if i.get("category") == "correlation"]
        if strong_corr:
            findings.append(f"📊 Detected strong relationships between {strong_corr[0]['evidence']['count']} variable pairs")

        return findings

    @staticmethod
    def _generate_recommendations(df: pd.DataFrame, insights: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations based on insights."""
        recommendations = []

        all_insights = []
        for category, insight_list in insights.items():
            if isinstance(insight_list, list):
                # Only include dict items (skip strings like key_findings)
                for item in insight_list:
                    if isinstance(item, dict):
                        all_insights.append(item)

        # Missing data recommendations
        high_missing = [i for i in all_insights
                       if i.get("category") == "missing_data"
                       and i.get("importance") == "high"]
        if high_missing:
            recommendations.append({
                "category": "data_quality",
                "priority": "high",
                "recommendation": "Drop columns with >50% missing data or carefully impute based on domain knowledge",
                "rationale": "High missing data percentage reduces data quality and model performance"
            })

        # Duplicate recommendations
        duplicates = [i for i in all_insights if i.get("category") == "duplicates"]
        if duplicates:
            recommendations.append({
                "category": "data_quality",
                "priority": "high",
                "recommendation": "Remove duplicate rows before analysis to avoid bias",
                "rationale": "Duplicates can skew statistical analyses and model training"
            })

        # Skewness recommendations
        skewed = [i for i in all_insights if i.get("category") == "skewness"]
        if skewed:
            recommendations.append({
                "category": "preprocessing",
                "priority": "medium",
                "recommendation": "Consider log transformation or Box-Cox transformation for highly skewed variables",
                "rationale": "Transformations can improve model performance and meet statistical assumptions"
            })

        # Multicollinearity recommendations
        multicollin = [i for i in all_insights if i.get("category") == "multicollinearity"]
        if multicollin:
            recommendations.append({
                "category": "feature_engineering",
                "priority": "high",
                "recommendation": "Address multicollinearity by removing redundant features or using PCA",
                "rationale": "High correlation between predictors can cause instability in regression models"
            })

        # Outlier recommendations
        outliers = [i for i in all_insights
                   if i.get("category") == "outliers"
                   and i.get("importance") == "high"]
        if outliers:
            recommendations.append({
                "category": "preprocessing",
                "priority": "medium",
                "recommendation": "Investigate and handle outliers - consider winsorization or robust methods",
                "rationale": "Outliers can significantly impact statistical tests and model performance"
            })

        # Sample size recommendations
        if len(df) < 100:
            recommendations.append({
                "category": "data_collection",
                "priority": "high",
                "recommendation": "Collect more data - current sample size is very small (<100)",
                "rationale": "Small sample sizes reduce statistical power and model generalization"
            })

        return recommendations

    @staticmethod
    def generate_evidence_based_claim(
        df: pd.DataFrame,
        claim: str,
        variables: List[str]
    ) -> Dict[str, Any]:
        """
        Generate evidence for a specific claim about the data.

        Args:
            df: pandas DataFrame
            claim: The claim to investigate (e.g., "X is correlated with Y")
            variables: List of variables involved in the claim

        Returns:
            Dictionary with evidence and conclusion
        """
        evidence = {
            "claim": claim,
            "variables": variables,
            "evidence": [],
            "conclusion": "",
            "confidence": ""
        }

        # This is a simplified implementation
        # In practice, you'd parse the claim and generate appropriate evidence

        if len(variables) == 2 and all(v in df.columns for v in variables):
            # Check if both numeric for correlation
            if all(pd.api.types.is_numeric_dtype(df[v]) for v in variables):
                corr = df[variables[0]].corr(df[variables[1]])
                evidence["evidence"].append({
                    "type": "correlation",
                    "value": float(corr),
                    "description": f"Pearson correlation: {corr:.3f}"
                })

                if abs(corr) > 0.7:
                    evidence["conclusion"] = f"Strong evidence supports the claim (|r|={abs(corr):.3f})"
                    evidence["confidence"] = "high"
                elif abs(corr) > 0.4:
                    evidence["conclusion"] = f"Moderate evidence supports the claim (|r|={abs(corr):.3f})"
                    evidence["confidence"] = "medium"
                else:
                    evidence["conclusion"] = f"Weak evidence for the claim (|r|={abs(corr):.3f})"
                    evidence["confidence"] = "low"

        return evidence
