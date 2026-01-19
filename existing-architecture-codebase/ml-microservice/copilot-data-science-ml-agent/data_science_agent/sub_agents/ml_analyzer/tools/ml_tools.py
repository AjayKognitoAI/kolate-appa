"""Machine learning analysis and recommendation tools."""

import pandas as pd
import json
from typing import Dict, Any, List, Optional

from data_science_agent.shared_libraries import DataLoader
from data_science_agent.sub_agents.csv_analyzer.tools.csv_tools import _dataframe_cache


def recommend_ml_algorithm(
    file_path: str,
    problem_type: str,
    target_column: Optional[str] = None
) -> str:
    """
    Recommend ML algorithms based on problem type and data characteristics.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        problem_type: Type of ML problem ('classification', 'regression', 'clustering', 'time_series')
        target_column: Target variable column (for supervised learning)

    Returns:
        JSON string with algorithm recommendations
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]
        loader = DataLoader()
        df_info = loader.get_dataframe_info(df)

        num_rows = df_info['num_rows']
        num_features = df_info['num_columns']
        numeric_features = len(df_info['numeric_columns'])
        categorical_features = len(df_info['categorical_columns'])

        recommendations = []

        if problem_type.lower() == 'classification':
            # Check if binary or multiclass
            if target_column and target_column in df.columns:
                num_classes = df[target_column].nunique()
                is_binary = num_classes == 2
            else:
                is_binary = None
                num_classes = None

            if num_rows < 1000:
                recommendations.extend([
                    {
                        "algorithm": "Logistic Regression",
                        "reason": "Small dataset; interpretable; good baseline",
                        "pros": ["Fast", "Interpretable", "Works well with small data"],
                        "cons": ["Assumes linear relationship", "May underfit complex data"],
                        "scikit_learn": "LogisticRegression"
                    },
                    {
                        "algorithm": "Random Forest",
                        "reason": "Handles non-linear relationships; robust",
                        "pros": ["Non-linear", "Feature importance", "Handles missing values"],
                        "cons": ["Less interpretable", "Can overfit on small data"],
                        "scikit_learn": "RandomForestClassifier"
                    }
                ])
            else:
                recommendations.extend([
                    {
                        "algorithm": "XGBoost",
                        "reason": "High performance; handles large datasets well",
                        "pros": ["State-of-the-art performance", "Handles missing values", "Feature importance"],
                        "cons": ["Requires hyperparameter tuning", "Less interpretable"],
                        "library": "xgboost.XGBClassifier"
                    },
                    {
                        "algorithm": "Random Forest",
                        "reason": "Robust; good for large datasets",
                        "pros": ["Non-linear", "Feature importance", "Parallel training"],
                        "cons": ["Memory intensive", "Slower prediction"],
                        "scikit_learn": "RandomForestClassifier"
                    },
                    {
                        "algorithm": "LightGBM",
                        "reason": "Fast training; memory efficient",
                        "pros": ["Very fast", "Memory efficient", "High accuracy"],
                        "cons": ["Can overfit small data", "Requires tuning"],
                        "library": "lightgbm.LGBMClassifier"
                    }
                ])

        elif problem_type.lower() == 'regression':
            if num_rows < 1000:
                recommendations.extend([
                    {
                        "algorithm": "Linear Regression",
                        "reason": "Small dataset; interpretable baseline",
                        "pros": ["Fast", "Interpretable", "Simple"],
                        "cons": ["Assumes linearity", "Sensitive to outliers"],
                        "scikit_learn": "LinearRegression"
                    },
                    {
                        "algorithm": "Ridge/Lasso Regression",
                        "reason": "Regularization helps prevent overfitting",
                        "pros": ["Feature selection (Lasso)", "Prevents overfitting", "Interpretable"],
                        "cons": ["Assumes linearity", "Requires scaling"],
                        "scikit_learn": "Ridge or Lasso"
                    }
                ])
            else:
                recommendations.extend([
                    {
                        "algorithm": "XGBoost Regressor",
                        "reason": "High performance for large datasets",
                        "pros": ["State-of-the-art", "Handles non-linearity", "Feature importance"],
                        "cons": ["Requires tuning", "Computationally intensive"],
                        "library": "xgboost.XGBRegressor"
                    },
                    {
                        "algorithm": "Random Forest Regressor",
                        "reason": "Robust; handles non-linear relationships",
                        "pros": ["Non-linear", "Feature importance", "Robust to outliers"],
                        "cons": ["Memory intensive", "Slower"],
                        "scikit_learn": "RandomForestRegressor"
                    }
                ])

        elif problem_type.lower() == 'clustering':
            recommendations.extend([
                {
                    "algorithm": "K-Means",
                    "reason": "Fast; works well for spherical clusters",
                    "pros": ["Fast", "Scalable", "Simple"],
                    "cons": ["Requires specifying K", "Assumes spherical clusters"],
                    "scikit_learn": "KMeans"
                },
                {
                    "algorithm": "DBSCAN",
                    "reason": "Finds arbitrary shaped clusters; handles outliers",
                    "pros": ["No need to specify K", "Finds arbitrary shapes", "Handles outliers"],
                    "cons": ["Sensitive to parameters", "Struggles with varying density"],
                    "scikit_learn": "DBSCAN"
                },
                {
                    "algorithm": "Hierarchical Clustering",
                    "reason": "Provides dendrogram; no need to specify K upfront",
                    "pros": ["Visual dendrogram", "No K needed", "Deterministic"],
                    "cons": ["Slow for large datasets", "Memory intensive"],
                    "scikit_learn": "AgglomerativeClustering"
                }
            ])

        elif problem_type.lower() == 'time_series':
            recommendations.extend([
                {
                    "algorithm": "ARIMA",
                    "reason": "Classical time series method",
                    "pros": ["Interpretable", "Works well for stationary series", "Statistical foundation"],
                    "cons": ["Requires stationarity", "Univariate", "Manual parameter selection"],
                    "library": "statsmodels.tsa.arima.model.ARIMA"
                },
                {
                    "algorithm": "Prophet",
                    "reason": "Handles seasonality and holidays well",
                    "pros": ["Automatic seasonality", "Handles missing data", "Interpretable"],
                    "cons": ["Designed for daily/sub-daily data", "Slower"],
                    "library": "prophet.Prophet"
                },
                {
                    "algorithm": "LSTM",
                    "reason": "Deep learning for complex patterns",
                    "pros": ["Captures complex patterns", "Multivariate", "Non-linear"],
                    "cons": ["Requires large data", "Computationally expensive", "Less interpretable"],
                    "library": "tensorflow.keras.layers.LSTM"
                }
            ])

        result = {
            "status": "success",
            "problem_type": problem_type,
            "data_characteristics": {
                "num_rows": num_rows,
                "num_features": num_features,
                "numeric_features": numeric_features,
                "categorical_features": categorical_features,
            },
            "recommendations": recommendations,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def suggest_feature_engineering(
    file_path: str,
    problem_type: str
) -> str:
    """
    Suggest feature engineering techniques based on data and problem type.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        problem_type: Type of ML problem

    Returns:
        JSON string with feature engineering suggestions
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]
        loader = DataLoader()
        df_info = loader.get_dataframe_info(df)

        suggestions = []

        # Numeric features
        if df_info['numeric_columns']:
            suggestions.append({
                "technique": "Scaling/Normalization",
                "reason": "Numeric features may have different scales",
                "methods": [
                    "StandardScaler (mean=0, std=1)",
                    "MinMaxScaler (range 0-1)",
                    "RobustScaler (robust to outliers)"
                ],
                "when_to_use": "Distance-based algorithms (SVM, KNN, Neural Networks)"
            })

            suggestions.append({
                "technique": "Polynomial Features",
                "reason": "Capture non-linear relationships",
                "methods": ["PolynomialFeatures from sklearn"],
                "when_to_use": "Linear models that need to capture non-linearity"
            })

        # Categorical features
        if df_info['categorical_columns']:
            suggestions.append({
                "technique": "Encoding Categorical Variables",
                "reason": "Convert categorical variables to numeric",
                "methods": [
                    "One-Hot Encoding (for nominal variables)",
                    "Label Encoding (for ordinal variables)",
                    "Target Encoding (for high cardinality)"
                ],
                "when_to_use": "All ML algorithms (required)"
            })

        # Missing values
        cols_with_missing = [c for c in df_info['column_details'] if c['null_count'] > 0]
        if cols_with_missing:
            suggestions.append({
                "technique": "Handle Missing Values",
                "reason": f"{len(cols_with_missing)} columns have missing values",
                "methods": [
                    "Drop rows/columns (if < 5% missing)",
                    "Mean/Median imputation (numeric)",
                    "Mode imputation (categorical)",
                    "KNN imputation (multivariate)"
                ],
                "when_to_use": "Before any modeling (required)"
            })

        # Feature interactions
        if len(df_info['numeric_columns']) > 1:
            suggestions.append({
                "technique": "Feature Interactions",
                "reason": "Capture relationships between features",
                "methods": [
                    "Multiplicative interactions (A * B)",
                    "Ratio features (A / B)",
                    "Difference features (A - B)"
                ],
                "when_to_use": "When domain knowledge suggests interactions"
            })

        # Feature selection
        if df_info['num_columns'] > 20:
            suggestions.append({
                "technique": "Feature Selection",
                "reason": "High number of features may cause overfitting",
                "methods": [
                    "Correlation-based selection",
                    "Recursive Feature Elimination (RFE)",
                    "Feature importance from tree models",
                    "L1 regularization (Lasso)"
                ],
                "when_to_use": "When you have many features relative to samples"
            })

        result = {
            "status": "success",
            "feature_engineering_suggestions": suggestions,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def check_ml_readiness(file_path: str, target_column: Optional[str] = None) -> str:
    """
    Check if data is ready for ML modeling.

    Args:
        file_path: Path to the CSV file (must be loaded first)
        target_column: Target variable column

    Returns:
        JSON string with ML readiness assessment
    """
    try:
        if file_path not in _dataframe_cache:
            return json.dumps({
                "status": "error",
                "message": "File not loaded. Please load the CSV file first."
            })

        df = _dataframe_cache[file_path]
        loader = DataLoader()
        df_info = loader.get_dataframe_info(df)

        issues = []
        recommendations = []

        # Check sample size
        if df_info['num_rows'] < 100:
            issues.append({
                "severity": "high",
                "issue": "Very small sample size (< 100 rows)",
                "recommendation": "Collect more data or use simple models"
            })
        elif df_info['num_rows'] < 1000:
            issues.append({
                "severity": "medium",
                "issue": "Small sample size (< 1000 rows)",
                "recommendation": "Use simple models and cross-validation"
            })

        # Check feature to sample ratio
        if df_info['num_columns'] > df_info['num_rows'] / 10:
            issues.append({
                "severity": "high",
                "issue": "Too many features relative to samples",
                "recommendation": "Perform feature selection or collect more data"
            })

        # Check for missing values
        if any(c['null_percentage'] > 0 for c in df_info['column_details']):
            high_missing = [c for c in df_info['column_details'] if c['null_percentage'] > 50]
            if high_missing:
                issues.append({
                    "severity": "high",
                    "issue": f"{len(high_missing)} columns with >50% missing data",
                    "recommendation": "Drop these columns or impute carefully"
                })
            else:
                issues.append({
                    "severity": "low",
                    "issue": "Some columns have missing values",
                    "recommendation": "Impute missing values before modeling"
                })

        # Check for duplicates
        if df_info['has_duplicates']:
            issues.append({
                "severity": "medium",
                "issue": f"{df_info['duplicate_count']} duplicate rows found",
                "recommendation": "Remove duplicates before modeling"
            })

        # Check target variable
        if target_column:
            if target_column not in df.columns:
                issues.append({
                    "severity": "high",
                    "issue": "Target column not found in data",
                    "recommendation": "Verify target column name"
                })
            else:
                target_info = next((c for c in df_info['column_details'] if c['name'] == target_column), None)
                if target_info:
                    # Check class imbalance for classification
                    if target_info['dtype'] in ['object', 'category', 'int64']:
                        if target_info['null_count'] > 0:
                            issues.append({
                                "severity": "high",
                                "issue": "Target variable has missing values",
                                "recommendation": "Handle missing values in target"
                            })

        # Overall readiness
        high_severity_count = len([i for i in issues if i['severity'] == 'high'])
        if high_severity_count == 0:
            readiness = "Ready for modeling"
            readiness_score = 90
        elif high_severity_count <= 2:
            readiness = "Mostly ready (address issues first)"
            readiness_score = 70
        else:
            readiness = "Not ready (significant issues)"
            readiness_score = 40

        result = {
            "status": "success",
            "ml_readiness": readiness,
            "readiness_score": readiness_score,
            "issues_found": len(issues),
            "issues": issues,
            "data_summary": {
                "num_rows": df_info['num_rows'],
                "num_features": df_info['num_columns'],
                "has_missing": any(c['null_count'] > 0 for c in df_info['column_details']),
                "has_duplicates": df_info['has_duplicates'],
            }
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})


def suggest_model_evaluation(problem_type: str, class_imbalance: bool = False) -> str:
    """
    Suggest appropriate evaluation metrics and strategies.

    Args:
        problem_type: Type of ML problem
        class_imbalance: Whether there is class imbalance (for classification)

    Returns:
        JSON string with evaluation suggestions
    """
    try:
        suggestions = {}

        if problem_type.lower() == 'classification':
            metrics = [
                {
                    "metric": "Accuracy",
                    "when_to_use": "Balanced classes",
                    "formula": "(TP + TN) / Total",
                    "sklearn": "accuracy_score"
                },
                {
                    "metric": "Precision",
                    "when_to_use": "When false positives are costly",
                    "formula": "TP / (TP + FP)",
                    "sklearn": "precision_score"
                },
                {
                    "metric": "Recall (Sensitivity)",
                    "when_to_use": "When false negatives are costly",
                    "formula": "TP / (TP + FN)",
                    "sklearn": "recall_score"
                },
                {
                    "metric": "F1-Score",
                    "when_to_use": "Balance between precision and recall",
                    "formula": "2 * (Precision * Recall) / (Precision + Recall)",
                    "sklearn": "f1_score"
                },
                {
                    "metric": "ROC-AUC",
                    "when_to_use": "Overall model performance across thresholds",
                    "formula": "Area under ROC curve",
                    "sklearn": "roc_auc_score"
                }
            ]

            if class_imbalance:
                primary_metrics = ["F1-Score", "ROC-AUC", "Precision-Recall AUC"]
                suggestions["note"] = "With class imbalance, avoid using accuracy alone"
            else:
                primary_metrics = ["Accuracy", "F1-Score", "ROC-AUC"]

            suggestions["metrics"] = metrics
            suggestions["primary_metrics"] = primary_metrics

        elif problem_type.lower() == 'regression':
            metrics = [
                {
                    "metric": "Mean Absolute Error (MAE)",
                    "when_to_use": "Interpretable; same units as target",
                    "formula": "mean(|y_true - y_pred|)",
                    "sklearn": "mean_absolute_error"
                },
                {
                    "metric": "Mean Squared Error (MSE)",
                    "when_to_use": "Penalizes large errors more",
                    "formula": "mean((y_true - y_pred)^2)",
                    "sklearn": "mean_squared_error"
                },
                {
                    "metric": "Root Mean Squared Error (RMSE)",
                    "when_to_use": "Same units as target; penalizes large errors",
                    "formula": "sqrt(MSE)",
                    "sklearn": "mean_squared_error (then sqrt)"
                },
                {
                    "metric": "R-squared (R²)",
                    "when_to_use": "Proportion of variance explained",
                    "formula": "1 - (SS_res / SS_tot)",
                    "sklearn": "r2_score"
                },
                {
                    "metric": "Mean Absolute Percentage Error (MAPE)",
                    "when_to_use": "Percentage error; scale-independent",
                    "formula": "mean(|y_true - y_pred| / y_true) * 100",
                    "sklearn": "mean_absolute_percentage_error"
                }
            ]

            suggestions["metrics"] = metrics
            suggestions["primary_metrics"] = ["RMSE", "R²", "MAE"]

        # Cross-validation strategy
        cv_strategies = [
            {
                "strategy": "K-Fold Cross-Validation",
                "description": "Split data into K folds; train on K-1, test on 1",
                "when_to_use": "Standard approach for most problems",
                "sklearn": "KFold or cross_val_score"
            },
            {
                "strategy": "Stratified K-Fold",
                "description": "K-Fold with balanced class distribution",
                "when_to_use": "Classification with imbalanced classes",
                "sklearn": "StratifiedKFold"
            },
            {
                "strategy": "Time Series Split",
                "description": "Respects temporal order",
                "when_to_use": "Time series data",
                "sklearn": "TimeSeriesSplit"
            }
        ]

        suggestions["cross_validation"] = cv_strategies
        suggestions["recommended_k_folds"] = 5

        result = {
            "status": "success",
            "problem_type": problem_type,
            "evaluation_strategy": suggestions,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"status": "error", "message": str(e)})
