# Quick Setup JSON Configuration Guide

This document describes the JSON format for the Quick Setup feature in the Study Configuration wizard. The Quick Setup allows you to configure all steps (models, fields, preprocessing, charts) in a single JSON file.

## How to Use

1. Navigate to **Admin > Trials > [Your Study] > Configure**
2. Click the **"Quick Setup (JSON)"** button in the top-right corner
3. Upload your JSON configuration file (drag-and-drop or click to browse)
4. Review any validation errors and fix them
5. Click **"Start Configuration"** to process
6. Once complete, click **"Go to Predict"** to start making predictions

You can also click **"Download Template"** in the dialog to get a sample JSON file to start with.

---

## JSON Schema

```json
{
  "models": [...],           // Required: Array of model configurations
  "fields": [...],           // Required: Array of field definitions
  "preprocessing": {...},    // Optional: Preprocessing settings
  "service_config": {...},   // Optional: Service configuration
  "chart_config": {...}      // Optional: Chart/analytics configuration
}
```

---

## Models Configuration

Each model in the `models` array must include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model_key` | string | Yes | Unique identifier (lowercase, numbers, underscores only) |
| `display_name` | string | Yes | User-friendly name shown in UI |
| `model_type` | string | Yes | `"classification"` or `"regression"` |
| `model_framework` | string | Yes | `"scikit-learn"`, `"xgboost"`, `"lightgbm"`, or `"random_forest"` |
| `version` | string | Yes | Semantic version (e.g., `"1.0.0"`) |
| `storage` | object | Yes | Storage configuration (see below) |
| `confidence_config` | object | No | Confidence calculation settings |
| `response_mapping` | object | No | Maps output values to labels |
| `description` | string | No | Optional description |
| `is_primary` | boolean | No | Set to `true` for the primary model (default: first model) |
| `display_order` | number | No | Display order in UI |

### Storage Configuration

The storage configuration supports three source types: S3, HTTP, and local filesystem.

**S3 Storage:**
```json
"storage": {
  "source_type": "s3",
  "s3_uri": "s3://bucket-name/path/model.pkl",
  "loader_type": "pickle"  // Optional: "pickle", "joblib", "cloudpickle"
}
```

**HTTP Storage:**
```json
"storage": {
  "source_type": "http",
  "http_url": "https://example.com/model.pkl",
  "loader_type": "pickle"  // Optional
}
```

**Filesystem Storage (Local Paths):**
```json
"storage": {
  "source_type": "filesystem",
  "file_path": "/path/to/local/model.pkl",
  "loader_type": "pickle"  // Optional
}
```

### Confidence Configuration (Optional)

```json
"confidence_config": {
  "strategy": "classification_probability",  // See strategies below
  "sample_fraction": 0.2                     // 0-1, default: 0.2
}
```

**Available strategies:**
- `"classification_probability"` - Standard for most models (default)
- `"xgboost_ensemble_variance"` - For XGBoost models
- `"random_forest_tree_variance"` - For Random Forest models

### Response Mapping (Optional)

Maps model output values to human-readable labels:

```json
"response_mapping": {
  "0": "Complete Response",
  "1": "Partial Response",
  "2": "No Response"
}
```

### Model Examples

**Example with S3 Storage:**
```json
{
  "model_key": "obj_response",
  "display_name": "Objective Response Predictor",
  "model_type": "classification",
  "model_framework": "xgboost",
  "version": "1.0.0",
  "storage": {
    "source_type": "s3",
    "s3_uri": "s3://ml-models/trials/lung-cancer/obj_response_v1.pkl"
  },
  "confidence_config": {
    "strategy": "xgboost_ensemble_variance",
    "sample_fraction": 0.2
  },
  "response_mapping": {
    "0": "Complete Response",
    "1": "Partial Response",
    "2": "Stable Disease",
    "3": "Progressive Disease"
  },
  "is_primary": true
}
```

**Example with Filesystem Storage:**
```json
{
  "model_key": "local_model",
  "display_name": "Local ML Model",
  "model_type": "classification",
  "model_framework": "scikit-learn",
  "version": "1.0.0",
  "storage": {
    "source_type": "filesystem",
    "file_path": "/data/models/my_model.pkl"
  },
  "is_primary": true
}
```

---

## Fields Configuration

Each field in the `fields` array defines an input field for predictions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Field name (must match training data column) |
| `type` | string | Yes | `"number"`, `"string"`, or `"categorical"` |
| `description` | string | No | Description with units (e.g., "Age in years") |
| `category` | string | Yes | `"continuous"` or `"categorical"` |
| `validation` | object | No | Validation rules |
| `ui_config` | object | No | UI display settings |

### Validation Rules

```json
"validation": {
  "required": true,           // Is field required?
  "min_value": 0,             // For numbers: minimum value
  "max_value": 120,           // For numbers: maximum value
  "allowed_values": ["A", "B"] // For categorical: valid options
}
```

### UI Configuration

```json
"ui_config": {
  "group": "Demographics",    // Group name for organizing fields
  "display_order": 1,         // Order in forms (lower = first)
  "placeholder": "Enter age", // Input placeholder
  "help_text": "Patient age"  // Help text
}
```

### Field Examples

**Numeric Field:**
```json
{
  "name": "age",
  "type": "number",
  "description": "Patient age in years",
  "category": "continuous",
  "validation": {
    "required": true,
    "min_value": 0,
    "max_value": 120
  },
  "ui_config": {
    "group": "Demographics",
    "display_order": 1
  }
}
```

**Categorical Field:**
```json
{
  "name": "stage",
  "type": "categorical",
  "description": "Disease stage",
  "category": "categorical",
  "validation": {
    "required": true,
    "allowed_values": ["I", "II", "III", "IV"]
  },
  "ui_config": {
    "group": "Clinical",
    "display_order": 2
  }
}
```

---

## Preprocessing Configuration (Optional)

```json
"preprocessing": {
  "requires_one_hot": true,              // Enable one-hot encoding for categorical
  "missing_value_strategy": "zero_fill"  // How to handle missing values
}
```

**Missing value strategies:**
- `"zero_fill"` - Fill with zeros (default)
- `"mean"` - Fill with column mean
- `"median"` - Fill with column median
- `"mode"` - Fill with most common value
- `"drop"` - Skip prediction if missing

---

## Service Configuration (Optional)

```json
"service_config": {
  "cache_ttl_seconds": 300,           // Cache duration (default: 300)
  "batch_prediction_max_rows": 1000,  // Max batch size (default: 1000)
  "enable_execution_tracking": true   // Track predictions for audit
}
```

---

## Chart Configuration (Optional)

Enable analytics charts for patient data visualization:

```json
"chart_config": {
  "enabled": true,                    // Enable/disable charts
  "mongo_collection": "patient_data", // MongoDB collection name
  "response_field": "bestrespg",      // Field containing outcomes
  "response_values": {                // Group outcomes
    "Responders": ["CR", "PR"],
    "Non-Responders": ["SD", "PD"]
  },
  "chart_types": [...]                // Chart definitions
}
```

### Chart Types

Each chart in `chart_types` array:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Chart title |
| `field` | string | Yes | Data field to visualize |
| `chart_type` | string | No | Chart type (see below) |
| `order` | array | No | Category order (array of strings) |
| `is_distribution` | boolean | No | Is this a distribution chart? |
| `custom_grouping` | boolean | No | Enable custom grouping? |
| `grouping_type` | string | No | Grouping type (e.g., "age", "range") |

**Chart types:** `"bar"`, `"pie"`, `"donut"`, `"line"`, `"area"`, `"stacked_bar"`, `"horizontal_bar"`

### Chart Example

```json
"chart_types": [
  {
    "name": "Age Distribution",
    "field": "age",
    "chart_type": "bar",
    "order": ["<30", "30-50", "50-70", ">70"],
    "is_distribution": true,
    "custom_grouping": true,
    "grouping_type": "age"
  },
  {
    "name": "Stage Distribution",
    "field": "stage",
    "chart_type": "pie",
    "order": ["I", "II", "III", "IV"],
    "is_distribution": true
  }
]
```

---

## Complete Example

This example shows a full configuration using S3 storage. You can also use `"filesystem"` storage by replacing the storage section with:
```json
"storage": {
  "source_type": "filesystem",
  "file_path": "/path/to/local/model.pkl"
}
```

```json
{
  "models": [
    {
      "model_key": "obj_response",
      "display_name": "Objective Response Predictor",
      "model_type": "classification",
      "model_framework": "xgboost",
      "version": "1.0.0",
      "storage": {
        "source_type": "s3",
        "s3_uri": "s3://ml-models/lung-cancer/obj_response.pkl"
      },
      "confidence_config": {
        "strategy": "classification_probability",
        "sample_fraction": 0.2
      },
      "response_mapping": {
        "0": "Complete Response",
        "1": "Partial Response",
        "2": "No Response"
      },
      "is_primary": true
    }
  ],
  "fields": [
    {
      "name": "age",
      "type": "number",
      "description": "Patient age in years",
      "category": "continuous",
      "validation": {
        "required": true,
        "min_value": 0,
        "max_value": 120
      },
      "ui_config": {
        "group": "Demographics",
        "display_order": 1
      }
    },
    {
      "name": "stage",
      "type": "categorical",
      "description": "Disease stage",
      "category": "categorical",
      "validation": {
        "required": true,
        "allowed_values": ["I", "II", "III", "IV"]
      },
      "ui_config": {
        "group": "Clinical",
        "display_order": 2
      }
    },
    {
      "name": "ecog_score",
      "type": "number",
      "description": "ECOG Performance Status (0-4)",
      "category": "continuous",
      "validation": {
        "required": true,
        "min_value": 0,
        "max_value": 4
      },
      "ui_config": {
        "group": "Clinical",
        "display_order": 3
      }
    }
  ],
  "preprocessing": {
    "requires_one_hot": true,
    "missing_value_strategy": "zero_fill"
  },
  "service_config": {
    "cache_ttl_seconds": 300,
    "batch_prediction_max_rows": 1000,
    "enable_execution_tracking": true
  },
  "chart_config": {
    "enabled": true,
    "mongo_collection": "patient_data",
    "response_field": "bestrespg",
    "response_values": {
      "Responders": ["CR", "PR"],
      "Non-Responders": ["SD", "PD"]
    },
    "chart_types": [
      {
        "name": "Age Distribution",
        "field": "age",
        "chart_type": "bar",
        "order": ["<30", "30-50", "50-70", ">70"],
        "is_distribution": true,
        "custom_grouping": true,
        "grouping_type": "age"
      },
      {
        "name": "Stage Distribution",
        "field": "stage",
        "chart_type": "pie",
        "order": ["I", "II", "III", "IV"],
        "is_distribution": true
      }
    ]
  }
}
```

---

## Validation Rules

The system validates your JSON with the following rules:

### Models
- At least one model is required
- `model_key` must be lowercase letters, numbers, and underscores only
- `model_key` must be unique across all models
- `storage.source_type` must be `"s3"`, `"http"`, or `"filesystem"`
- S3 URIs must start with `s3://`
- HTTP URLs must start with `http://` or `https://`
- Filesystem paths must be absolute paths (e.g., `/path/to/model.pkl` or `C:\path\to\model.pkl`)
- `loader_type` (if specified) must be `"pickle"`, `"joblib"`, or `"cloudpickle"`

### Fields
- At least one field is required
- Field names must be unique
- Categorical fields must have `validation.allowed_values`
- For number fields, `min_value` cannot be greater than `max_value`

### Charts (when enabled)
- `mongo_collection` is required
- `response_field` is required
- Each chart needs `name` and `field`
- `chart_type` must be a valid type

---

## Troubleshooting

**"Invalid JSON format"**
- Check for missing commas between items
- Ensure all strings use double quotes (not single quotes)
- Remove trailing commas after last items in arrays/objects

**"model_key must be lowercase"**
- Use only `a-z`, `0-9`, and `_` in model keys
- Example: `obj_response` not `ObjResponse`

**"s3_uri must start with s3://"**
- Ensure your S3 URI is properly formatted: `s3://bucket-name/path/to/model.pkl`

**"file_path is required when source_type is filesystem"**
- When using filesystem storage, you must provide a valid absolute file path:
  ```json
  "storage": {
    "source_type": "filesystem",
    "file_path": "/absolute/path/to/model.pkl"
  }
  ```

**"file_path should be an absolute path"**
- Filesystem paths must be absolute paths, not relative paths
- Linux/Mac: `/data/models/my_model.pkl`
- Windows: `C:\data\models\my_model.pkl`
- Invalid: `models/my_model.pkl` (relative path)

**"loader_type must be one of: pickle, joblib, cloudpickle"**
- If you specify a `loader_type`, it must be a valid option:
  ```json
  "storage": {
    "source_type": "filesystem",
    "file_path": "/path/to/model.pkl",
    "loader_type": "pickle"
  }
  ```

**"categorical fields should have allowed_values"**
- Add validation with allowed values for categorical fields:
  ```json
  "validation": { "allowed_values": ["A", "B", "C"] }
  ```
