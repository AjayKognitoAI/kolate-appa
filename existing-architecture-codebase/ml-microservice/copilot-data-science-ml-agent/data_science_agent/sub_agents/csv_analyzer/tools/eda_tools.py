"""Enhanced EDA (Exploratory Data Analysis) tools."""

import pandas as pd
import json
from typing import Dict, Any, Optional, List

from data_science_agent.shared_libraries import DataLoader, VisualizationHelper
from data_science_agent.shared_libraries.insight_generator import InsightGenerator
from data_science_agent.sub_agents.csv_analyzer.tools.csv_tools import _dataframe_cache
from data_science_agent.path_resolver import PathResolver


def perform_comprehensive_eda(
    file_path: str,
    generate_visualizations: bool = True
) -> str:
    """
    Perform comprehensive Exploratory Data Analysis with automatic insights.

    Args:
        file_path: Path to the CSV file
        generate_visualizations: Whether to generate visualization recommendations

    Returns:
        JSON string with comprehensive EDA results and insights
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
        else:
            df = _dataframe_cache[file_path]
            loader = DataLoader()

        insight_gen = InsightGenerator()

        # Get comprehensive insights
        insights = insight_gen.generate_comprehensive_insights(df)

        # Get DataFrame info
        df_info = loader.get_dataframe_info(df)

        # Generate visualization recommendations
        viz_recommendations = []
        if generate_visualizations:
            viz_recommendations = _generate_viz_recommendations(df, insights)

        # Compile EDA report
        eda_report = {
            "status": "success",
            "file_path": file_path,
            "dataset_overview": {
                "rows": df_info['num_rows'],
                "columns": df_info['num_columns'],
                "memory_usage_mb": df_info['memory_usage_mb'],
                "numeric_columns": df_info['numeric_columns'],
                "categorical_columns": df_info['categorical_columns'],
            },
            "insights": insights,
            "visualization_recommendations": viz_recommendations,
            "summary": _generate_eda_summary(df, insights)
        }

        return json.dumps(eda_report, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def generate_insights(
    file_path: str,
    focus_area: Optional[str] = None
) -> str:
    """
    Generate data-driven insights from the dataset.

    Args:
        file_path: Path to the CSV file
        focus_area: Optional focus area ('quality', 'distributions', 'relationships', 'patterns', 'anomalies')

    Returns:
        JSON string with insights
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
        else:
            df = _dataframe_cache[file_path]

        insight_gen = InsightGenerator()

        # Generate comprehensive insights
        all_insights = insight_gen.generate_comprehensive_insights(df)

        # Filter by focus area if specified
        if focus_area:
            focus_mapping = {
                'quality': 'data_quality',
                'distributions': 'distributions',
                'relationships': 'relationships',
                'patterns': 'patterns',
                'anomalies': 'anomalies'
            }

            if focus_area in focus_mapping:
                category = focus_mapping[focus_area]
                filtered_insights = {
                    category: all_insights.get(category, []),
                    "key_findings": all_insights.get("key_findings", []),
                    "recommendations": [
                        r for r in all_insights.get("recommendations", [])
                        if r.get("category") == focus_area or r.get("category") == category
                    ]
                }
                result = {
                    "status": "success",
                    "focus_area": focus_area,
                    "insights": filtered_insights
                }
            else:
                return json.dumps({
                    "status": "error",
                    "message": f"Invalid focus area. Choose from: quality, distributions, relationships, patterns, anomalies"
                })
        else:
            result = {
                "status": "success",
                "insights": all_insights
            }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def find_evidence(
    file_path: str,
    claim: str,
    variables: Optional[List[str]] = None
) -> str:
    """
    Find evidence to support or refute a claim about the data.

    Args:
        file_path: Path to the CSV file
        claim: The claim to investigate (e.g., "Sales increase with marketing spend")
        variables: List of variables involved (auto-detected if not provided)

    Returns:
        JSON string with evidence and conclusion
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
        else:
            df = _dataframe_cache[file_path]

        insight_gen = InsightGenerator()

        # If variables not provided, try to extract from claim
        if not variables:
            # Simple keyword matching (in practice, could use NLP)
            variables = [col for col in df.columns if col.lower() in claim.lower()]

        if not variables or len(variables) < 1:
            return json.dumps({
                "status": "error",
                "message": "Could not identify variables. Please specify variables explicitly."
            })

        # Generate evidence
        evidence = insight_gen.generate_evidence_based_claim(df, claim, variables)

        result = {
            "status": "success",
            "claim_investigation": evidence
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def detect_patterns(
    file_path: str,
    pattern_types: Optional[List[str]] = None
) -> str:
    """
    Detect specific types of patterns in the data.

    Args:
        file_path: Path to the CSV file
        pattern_types: Types of patterns to look for (['trend', 'seasonal', 'cyclic', 'dominant_category'])

    Returns:
        JSON string with detected patterns
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
        else:
            df = _dataframe_cache[file_path]

        insight_gen = InsightGenerator()

        # Get all pattern insights
        pattern_insights = insight_gen._generate_pattern_insights(df)

        # Filter by pattern type if specified
        if pattern_types:
            filtered_patterns = [
                p for p in pattern_insights
                if p.get("category") in pattern_types
            ]
            result = {
                "status": "success",
                "pattern_types_searched": pattern_types,
                "patterns_found": filtered_patterns,
                "count": len(filtered_patterns)
            }
        else:
            result = {
                "status": "success",
                "patterns_found": pattern_insights,
                "count": len(pattern_insights)
            }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def generate_data_story(file_path: str) -> str:
    """
    Generate a narrative data story from the dataset.

    Args:
        file_path: Path to the CSV file

    Returns:
        JSON string with narrative insights
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
        else:
            df = _dataframe_cache[file_path]
            loader = DataLoader()

        insight_gen = InsightGenerator()

        # Get all insights
        insights = insight_gen.generate_comprehensive_insights(df)
        df_info = loader.get_dataframe_info(df)

        # Build narrative
        narrative = _build_data_narrative(df, df_info, insights)

        result = {
            "status": "success",
            "data_story": narrative
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


# Helper functions

def _generate_viz_recommendations(df: pd.DataFrame, insights: Dict[str, Any]) -> List[Dict[str, str]]:
    """Generate visualization recommendations based on data and insights."""
    recommendations = []

    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    # Distribution visualizations
    if len(numeric_cols) > 0:
        recommendations.append({
            "type": "distribution_plot",
            "columns": numeric_cols[:3],  # Top 3
            "purpose": "Visualize the distribution of numeric variables",
            "insight_support": "Supports understanding of data distributions and skewness"
        })

        recommendations.append({
            "type": "boxplot",
            "columns": numeric_cols[:5],
            "purpose": "Identify outliers and compare distributions",
            "insight_support": "Helps visualize anomalies and quartile distributions"
        })

    # Correlation heatmap
    if len(numeric_cols) >= 2:
        recommendations.append({
            "type": "correlation_heatmap",
            "columns": numeric_cols,
            "purpose": "Show relationships between all numeric variables",
            "insight_support": "Visualizes correlation insights"
        })

    # Categorical visualizations
    if len(categorical_cols) > 0:
        recommendations.append({
            "type": "bar_chart",
            "columns": categorical_cols[:2],
            "purpose": "Show distribution of categorical variables",
            "insight_support": "Identifies dominant categories and imbalances"
        })

    # Scatter plots for strong correlations
    relationship_insights = insights.get("relationships", [])
    for r_insight in relationship_insights:
        if r_insight.get("category") == "correlation":
            corrs = r_insight.get("evidence", {}).get("correlations", [])
            if corrs:
                top_corr = corrs[0]
                recommendations.append({
                    "type": "scatter_plot",
                    "columns": [top_corr["var1"], top_corr["var2"]],
                    "purpose": f"Visualize strong correlation (r={top_corr['correlation']:.3f})",
                    "insight_support": "Shows the relationship between strongly correlated variables"
                })
                break

    return recommendations


def _generate_eda_summary(df: pd.DataFrame, insights: Dict[str, Any]) -> Dict[str, Any]:
    """Generate executive summary of EDA."""
    all_insights = []
    for category, insight_list in insights.items():
        if isinstance(insight_list, list):
            all_insights.extend(insight_list)

    return {
        "total_insights": len(all_insights),
        "high_priority_insights": len([i for i in all_insights if i.get("importance") == "high"]),
        "action_items": len([i for i in all_insights if i.get("action_required")]),
        "key_findings": insights.get("key_findings", []),
        "top_recommendations": insights.get("recommendations", [])[:3],
        "data_quality_score": _calculate_data_quality_score(df, insights)
    }


def _calculate_data_quality_score(df: pd.DataFrame, insights: Dict[str, Any]) -> int:
    """Calculate a data quality score (0-100)."""
    score = 100

    # Deduct points for issues
    data_quality_insights = insights.get("data_quality", [])

    for dq_insight in data_quality_insights:
        if dq_insight.get("importance") == "high" and dq_insight.get("action_required"):
            score -= 20
        elif dq_insight.get("importance") == "medium":
            score -= 10
        elif dq_insight.get("importance") == "low" and dq_insight.get("action_required"):
            score -= 5

    return max(0, score)


def _build_data_narrative(df: pd.DataFrame, df_info: Dict, insights: Dict) -> Dict[str, Any]:
    """Build a narrative structure for the data story."""
    narrative = {
        "title": "Data Analysis Story",
        "chapters": []
    }

    # Chapter 1: Introduction
    narrative["chapters"].append({
        "chapter": 1,
        "title": "Dataset Overview",
        "content": f"This dataset contains {df_info['num_rows']:,} observations across {df_info['num_columns']} variables, "
                   f"with {len(df_info['numeric_columns'])} numeric and {len(df_info['categorical_columns'])} categorical features."
    })

    # Chapter 2: Data Quality
    quality_insights = insights.get("data_quality", [])
    if quality_insights:
        quality_summary = []
        for qi in quality_insights:
            quality_summary.append(qi["insight"])

        narrative["chapters"].append({
            "chapter": 2,
            "title": "Data Quality Assessment",
            "content": " ".join(quality_summary[:3])  # Top 3
        })

    # Chapter 3: Key Patterns
    pattern_insights = insights.get("patterns", [])
    if pattern_insights:
        narrative["chapters"].append({
            "chapter": 3,
            "title": "Patterns and Trends",
            "content": " ".join([p["insight"] for p in pattern_insights[:3]])
        })

    # Chapter 4: Relationships
    relationship_insights = insights.get("relationships", [])
    if relationship_insights:
        narrative["chapters"].append({
            "chapter": 4,
            "title": "Variable Relationships",
            "content": " ".join([r["insight"] for r in relationship_insights[:2]])
        })

    # Chapter 5: Recommendations
    recommendations = insights.get("recommendations", [])
    if recommendations:
        rec_text = "Based on this analysis, we recommend: " + "; ".join([
            f"{i+1}. {rec['recommendation']}"
            for i, rec in enumerate(recommendations[:3])
        ])
        narrative["chapters"].append({
            "chapter": 5,
            "title": "Recommendations",
            "content": rec_text
        })

    return narrative
