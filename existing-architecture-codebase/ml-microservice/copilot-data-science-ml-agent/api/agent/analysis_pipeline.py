"""Pre-computation pipeline for analyzing datasets on upload."""

import pandas as pd
import json
import os
from typing import Dict, Any, Optional
from datetime import datetime

from api.agent.shared_libraries.data_loader import DataLoader
from api.agent.shared_libraries.insight_generator import InsightGenerator
from api.agent.shared_libraries.statistics_helper import StatisticsHelper
from api.agent.shared_libraries.visualization_helper import VisualizationHelper


class AnalysisPipeline:
    """Pre-computes comprehensive analysis on file upload."""

    def __init__(self, upload_dir: str = "./data/uploads"):
        """Initialize analysis pipeline.

        Args:
            upload_dir: Directory where uploaded files are stored
        """
        self.upload_dir = upload_dir
        self.visualization_dir = os.getenv("VISUALIZATION_DIR", os.path.join(upload_dir, "..", "visualizations"))
        self.analysis_cache_dir = os.getenv("ANALYSIS_CACHE_DIR", os.path.join(upload_dir, "..", "analysis_cache"))
        os.makedirs(self.visualization_dir, exist_ok=True)
        os.makedirs(self.analysis_cache_dir, exist_ok=True)

    def analyze_file(self, file_path: str, session_id: str) -> Dict[str, Any]:
        """Comprehensively analyze an uploaded file.

        Args:
            file_path: Path to the uploaded file
            session_id: Session ID for organizing output

        Returns:
            Dictionary with complete analysis results
        """
        try:
            # Load data
            df = self._load_file(file_path)
            if df is None:
                return {"error": "Unable to load file"}

            # Log the actual row count for debugging
            print(f"[AnalysisPipeline] ========================================")
            print(f"[AnalysisPipeline] Loaded file: {file_path}")
            print(f"[AnalysisPipeline] Total rows: {len(df)}")
            print(f"[AnalysisPipeline] Total columns: {len(df.columns)}")
            print(f"[AnalysisPipeline] Column names: {list(df.columns)}")
            print(f"[AnalysisPipeline] ========================================")

            # Compile analysis
            analysis = {
                "file_info": self._get_file_info(file_path),
                "dataframe_info": self._get_dataframe_info(df),
                "data_quality": self._analyze_data_quality(df),
                "pandas_describe": self._get_pandas_describe(df),
                "descriptive_stats": self._get_descriptive_statistics(df),
                "categorical_stats": self._get_categorical_statistics(df),
                "correlations": self._get_correlations(df),
                "distributions": self._analyze_distributions(df),
                "outliers": self._detect_outliers(df),
                "insights": self._generate_insights(df),
                "visualizations": self._create_visualizations(df, session_id, file_path),
                "timestamp": datetime.now().isoformat(),
            }

            return analysis
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}

    def _load_file(self, file_path: str) -> Optional[pd.DataFrame]:
        """Load CSV or Excel file."""
        try:
            if file_path.endswith('.csv'):
                return DataLoader.load_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                return DataLoader.load_excel(file_path)
            else:
                return None
        except Exception as e:
            print(f"Error loading file: {e}")
            return None

    def _get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get file metadata."""
        return DataLoader.get_file_info(file_path)

    def _get_dataframe_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get DataFrame structure information."""
        return DataLoader.get_dataframe_info(df)

    def _analyze_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze data quality metrics."""
        quality = {}

        # Missing values
        missing = df.isnull().sum()
        quality["missing_values"] = {
            col: {"count": int(missing[col]), "percentage": round(missing[col] / len(df) * 100, 2)}
            for col in df.columns if missing[col] > 0
        }

        # Duplicates
        quality["duplicates"] = {
            "count": int(df.duplicated().sum()),
            "percentage": round(df.duplicated().sum() / len(df) * 100, 2)
        }

        # Data type consistency
        quality["data_types"] = DataLoader.detect_data_types(df)

        return quality

    def _get_pandas_describe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get pandas describe() for all columns."""
        try:
            # Numeric describe
            numeric_describe = df.describe(include='number').to_dict()

            # Object/categorical describe
            try:
                object_describe = df.describe(include='object').to_dict()
            except Exception:
                object_describe = {}

            # All columns describe
            try:
                all_describe = df.describe(include='all').to_dict()
            except Exception:
                all_describe = {}

            return {
                "numeric": numeric_describe,
                "categorical": object_describe,
                "all_columns": all_describe
            }
        except Exception as e:
            print(f"Error getting pandas describe: {e}")
            return {}

    def _get_categorical_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get statistics for categorical columns."""
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        stats = {}

        for col in categorical_cols:
            try:
                value_counts = df[col].value_counts()
                stats[col] = {
                    "unique_count": int(df[col].nunique()),
                    "most_common": str(value_counts.index[0]) if len(value_counts) > 0 else None,
                    "most_common_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                    "most_common_percentage": float(value_counts.iloc[0] / len(df) * 100) if len(value_counts) > 0 else 0,
                    "value_counts": {str(k): int(v) for k, v in value_counts.head(20).items()},
                    "missing_count": int(df[col].isnull().sum()),
                    "missing_percentage": float(df[col].isnull().sum() / len(df) * 100)
                }
            except Exception as e:
                print(f"Error getting categorical stats for {col}: {e}")

        return stats

    def _get_descriptive_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get descriptive statistics for numeric columns."""
        try:
            return StatisticsHelper.descriptive_statistics(df)
        except Exception as e:
            print(f"Error getting descriptive stats: {e}")
            return {}

    def _get_correlations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate correlations between numeric columns."""
        numeric_df = df.select_dtypes(include=['int64', 'float64'])

        correlations = {}
        try:
            # Pearson correlation
            pearson = numeric_df.corr(method='pearson')
            correlations["pearson"] = pearson.to_dict()

            # Spearman correlation (rank-based, handles outliers better)
            if len(numeric_df) > 2:
                spearman = numeric_df.corr(method='spearman')
                correlations["spearman"] = spearman.to_dict()
        except Exception as e:
            print(f"Error computing correlations: {e}")

        return correlations

    def _analyze_distributions(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze distributions of columns."""
        numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
        distributions = {}

        for col in numeric_cols:
            try:
                col_data = df[col].dropna()
                if len(col_data) > 2:
                    # Use normality_test for distribution analysis
                    dist = StatisticsHelper.normality_test(col_data)
                    distributions[col] = dist
            except Exception as e:
                print(f"Error analyzing distribution for {col}: {e}")

        return distributions

    def _detect_outliers(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect outliers using multiple methods."""
        numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
        outliers = {}

        for col in numeric_cols:
            try:
                col_data = df[col].dropna()
                # Use outlier_detection method with IQR
                outlier_info = StatisticsHelper.outlier_detection(col_data, method="iqr")
                if outlier_info.get('outlier_count', 0) > 0:
                    outliers[col] = outlier_info
            except Exception as e:
                print(f"Error detecting outliers for {col}: {e}")

        return outliers

    def _generate_insights(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate automatic insights using InsightGenerator."""
        try:
            insights = InsightGenerator.generate_comprehensive_insights(df)
            # Ensure we return a dict, not a string
            if isinstance(insights, dict):
                return insights
            else:
                print(f"Insights returned unexpected type: {type(insights)}")
                return {"raw": str(insights)}
        except Exception as e:
            import traceback
            print(f"Error generating insights: {e}")
            print(traceback.format_exc())
            return {"error": str(e)}

    def _create_visualizations(self, df: pd.DataFrame, session_id: str, file_path: str) -> Dict[str, str]:
        """Create and save visualizations."""
        viz = {}
        session_viz_dir = os.path.join(self.visualization_dir, session_id)
        os.makedirs(session_viz_dir, exist_ok=True)

        try:
            # Instantiate VisualizationHelper with the session directory
            viz_helper = VisualizationHelper(output_dir=session_viz_dir)

            numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns

            # Create distributions for ALL numeric columns
            for col in numeric_cols:
                try:
                    # Sanitize column name for filename
                    safe_col_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in str(col))
                    path = viz_helper.create_histogram(
                        df[col],
                        title=f"Distribution of {col}",
                        filename=f"distribution_{safe_col_name}.png"
                    )
                    if path:
                        viz[f"distribution_{col}"] = path
                except Exception as e:
                    print(f"Error creating histogram for {col}: {e}")

            # Create correlation heatmap if numeric columns exist
            if len(numeric_cols) > 1:
                try:
                    path = viz_helper.create_correlation_heatmap(
                        df,
                        columns=list(numeric_cols),
                        filename="correlation_matrix.png"
                    )
                    if path:
                        viz["correlation_matrix"] = path
                except Exception as e:
                    print(f"Error creating correlation heatmap: {e}")

            # Create box plots for ALL numeric columns
            if len(numeric_cols) > 0:
                try:
                    path = viz_helper.create_boxplot(
                        df,
                        columns=list(numeric_cols),
                        title="Box Plot - Outlier Detection",
                        filename="boxplot_outliers.png"
                    )
                    if path:
                        viz["boxplot"] = path
                except Exception as e:
                    print(f"Error creating boxplot: {e}")

            # Create bar charts for categorical columns
            for col in categorical_cols:
                try:
                    safe_col_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in str(col))
                    value_counts = df[col].value_counts().head(20)  # Top 20 categories
                    if len(value_counts) > 0:
                        # Convert Series to DataFrame for bar chart
                        vc_df = value_counts.reset_index()
                        vc_df.columns = ['category', 'count']
                        path = viz_helper.create_bar_chart(
                            vc_df,
                            x_column='category',
                            y_column='count',
                            title=f"Distribution of {col}",
                            filename=f"categorical_{safe_col_name}.png"
                        )
                        if path:
                            viz[f"categorical_{col}"] = path
                except Exception as e:
                    print(f"Error creating bar chart for {col}: {e}")

        except Exception as e:
            print(f"Error creating visualizations: {e}")

        return viz

    def save_analysis(self, analysis: Dict[str, Any], session_id: str, file_name: str) -> str:
        """Save analysis as JSON cache.

        Args:
            analysis: Analysis results dictionary
            session_id: Session ID
            file_name: Original file name

        Returns:
            Path to saved JSON
        """
        os.makedirs(self.analysis_cache_dir, exist_ok=True)

        cache_file = os.path.join(self.analysis_cache_dir, f"{session_id}_{file_name}.json")

        # Convert non-serializable objects
        analysis_copy = self._make_serializable(analysis)

        with open(cache_file, 'w') as f:
            json.dump(analysis_copy, f, indent=2)

        return cache_file

    @staticmethod
    def _make_serializable(obj: Any) -> Any:
        """Convert non-serializable objects to serializable ones."""
        if isinstance(obj, dict):
            return {k: AnalysisPipeline._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [AnalysisPipeline._make_serializable(v) for v in obj]
        elif isinstance(obj, (pd.DataFrame, pd.Series)):
            return obj.to_dict()
        elif hasattr(obj, '__dict__'):
            return str(obj)
        else:
            try:
                json.dumps(obj)
                return obj
            except (TypeError, ValueError):
                return str(obj)
