# Patient Screening Module - Business Logic Documentation

## Overview

The Patient Screening module enables clinical research teams to upload patient datasets, define complex eligibility criteria through filters, and identify patients who meet specific clinical trial requirements. This document describes the business logic, rules, and context needed to implement the backend APIs.

---

## Core Concepts

### 1. Master Data
- **Definition**: Raw patient data uploaded by users (CSV, Excel, or JSON files)
- **Storage**: Files stored in S3 bucket, metadata stored in PostgreSQL
- **Immutability**: Once uploaded, master data is never modified - it serves as the source of truth
- **Sharing**: Multiple cohorts can reference the same master data file

### 2. Cohorts
- **Definition**: A named collection of patients filtered from master data based on eligibility criteria
- **Relationship**: Many cohorts can reference one master data file (1:N relationship)
- **Filters**: Each cohort has a filter configuration that defines which patients are included

### 3. Filtering Architecture
- **Client-side filtering**: All filter logic is executed on the frontend
- **Why client-side?**:
  - Immediate feedback as users build filters
  - No round-trip latency for filter preview
  - Master data is typically <50MB (fits in browser memory)
  - Backend doesn't need complex filter engine
- **Backend stores results**: After filtering, frontend sends `filtered_patient_ids` to backend for caching

### 4. Saved Filters (Reusable Filters)
- **Definition**: Filter configurations saved separately for reuse across multiple cohorts
- **Storage**: Stored in `patient_screening_filters` table with name, description, and filter JSON
- **Sharing**: Can be marked as templates for enterprise-wide visibility
- **Usage Tracking**: System tracks how many cohorts reference each saved filter

### 5. AI-Powered Filter Mapping
When applying a saved filter to new master data with different column names:
1. User selects a saved filter from the list
2. System detects column name mismatches between filter fields and new data columns
3. AI/LLM analyzes both sets of column names and suggests mappings
4. User reviews and confirms the mappings
5. Filter is adapted with new column names and applied

**Example:**
- Saved filter has: `{"field": "patient_age", "operator": "gte", "value": 18}`
- New data has columns: `["age", "gender", "diagnosis"]`
- AI maps: `patient_age` → `age`
- Adapted filter: `{"field": "age", "operator": "gte", "value": 18}`

---

## Filter System

### Filter Structure (Recursive)

```
FilterGroup {
  id: string
  name?: string
  logic: "AND" | "OR"
  negate: boolean
  rules: (FilterRule | FilterGroup)[]
}

FilterRule {
  id: string
  field: string
  operator: OperatorType
  value: string | number
  value2?: string | number  // For "between" operator
}
```

### Supported Operators

| Operator | Symbol | Description | Applicable Types |
|----------|--------|-------------|------------------|
| `equals` | = | Exact match | string, number, categorical |
| `not_equals` | ≠ | Not equal | string, number, categorical |
| `contains` | ~ | Substring match (case-insensitive) | string |
| `gt` | > | Greater than | number |
| `gte` | ≥ | Greater than or equal | number |
| `lt` | < | Less than | number |
| `lte` | ≤ | Less than or equal | number |
| `between` | ... | Value in range (inclusive) | number |
| `is_empty` | = null | Field is null/empty | all |
| `is_not_empty` | ≠ null | Field has value | all |
| `in_cohort` | ∈ | Patient exists in another cohort | special |
| `not_in_cohort` | ∉ | Patient not in another cohort | special |

### Filter Evaluation Logic

```python
def evaluate_group(patient, group):
    if not group.rules:
        return True  # Empty group matches all

    results = [evaluate_item(patient, rule) for rule in group.rules]

    if group.logic == "AND":
        result = all(results)
    else:  # OR
        result = any(results)

    return not result if group.negate else result

def evaluate_item(patient, item):
    if is_group(item):
        return evaluate_group(patient, item)
    else:
        return evaluate_rule(patient, item)
```

### Column Type Handling

| Column Type | Storage | Comparison Behavior |
|-------------|---------|---------------------|
| `string` | TEXT | Case-insensitive string comparison |
| `number` | NUMERIC | Numeric comparison after type coercion |
| `categorical` | TEXT | Case-insensitive exact match |

---

## API Business Rules

### 1. Master Data Upload (`POST /cohorts/upload-master-data`)

**Business Rules:**
1. Validate file format (CSV, XLSX, JSON only)
2. Maximum file size: 100MB
3. Parse file to extract:
   - Column names from header row
   - Infer column types by analyzing first 1000 rows
   - Count total rows (excluding header)
4. Upload file to S3 with path: `master-data/{master_data_id}/{original_filename}`
5. Store metadata in `master_data` table
6. Return `master_data_id` for use in cohort creation

**Column Type Inference Algorithm:**
```python
def infer_column_type(values):
    # Sample first 1000 non-null values
    sample = [v for v in values[:1000] if v is not None and v != ""]

    if not sample:
        return "string"

    # Check if all values are numeric
    numeric_count = sum(1 for v in sample if is_numeric(v))
    if numeric_count / len(sample) > 0.9:
        return "number"

    # Check if categorical (≤20 unique values)
    unique_values = set(sample)
    if len(unique_values) <= 20:
        return "categorical"

    return "string"
```

### 2. Create Cohort (`POST /cohorts`)

**Business Rules:**
1. Validate `master_data_id` exists
2. Validate `name` is not empty and ≤255 characters
3. Validate `filter` structure (valid JSON, proper schema)
4. Store cohort with provided `filtered_patient_ids` (computed by frontend)
5. Calculate `patient_count` from `filtered_patient_ids.length`
6. Log activity: "Cohort created"

**Filter Validation:**
- Each rule must reference a valid column from `columns` schema
- Operator must be valid for the column type
- Value must match column type (numbers for numeric columns)
- Nested groups must follow same rules recursively

### 3. Update Cohort (`PUT /cohorts/{id}`)

**Business Rules:**
1. Validate cohort exists
2. If `filter` is updated:
   - Frontend must also send updated `filtered_patient_ids`
   - Recalculate `patient_count`
   - Log activity: "Filter changed" with diff
3. If only `name`/`description` updated:
   - Log activity: "Cohort updated"
4. Update `updated_at` timestamp automatically

### 4. Get Master Data URL (`GET /cohorts/{id}/master-data`)

**Business Rules:**
1. Generate presigned S3 URL with expiration (default: 15 minutes)
2. Return URL for frontend to fetch data directly from S3
3. No data processing on backend - just URL generation

### 5. Download Master Data (`GET /cohorts/{id}/master-data/download`)

**Business Rules:**
1. Stream file directly from S3 to client
2. If format conversion requested:
   - CSV → XLSX: Parse CSV, write to Excel format
   - CSV → JSON: Parse CSV, serialize as JSON array
   - XLSX → CSV: Parse Excel, write as CSV
   - etc.
3. Set appropriate Content-Type and Content-Disposition headers
4. Log activity: "Exported master data" with format

### 6. Download Screened Data (`POST /cohorts/{id}/screened-data/download`)

**Business Rules:**
1. Fetch master data from S3
2. Filter rows where `patient_id` is in `filtered_patient_ids`
3. Convert to requested format (CSV, XLSX, JSON)
4. Stream to client
5. Log activity: "Exported screened data" with format and count

### 7. Compare Cohorts (`POST /cohorts/compare`)

**Business Rules:**
1. Validate 2-5 cohort IDs provided
2. Validate all cohorts exist and user has access
3. Calculate statistics for each cohort:
   ```python
   {
     "patient_count": len(filtered_patient_ids),
     "master_patient_count": master_data.row_count,
     "match_rate": patient_count / master_patient_count * 100,
     "filter_count": count_rules(filter)
   }
   ```
4. Calculate pairwise overlaps:
   ```python
   for i, cohort_a in enumerate(cohorts):
       for cohort_b in cohorts[i+1:]:
           overlap = set(cohort_a.patient_ids) & set(cohort_b.patient_ids)
           unique_a = len(cohort_a.patient_ids) - len(overlap)
           unique_b = len(cohort_b.patient_ids) - len(overlap)
           smaller = min(len(cohort_a.patient_ids), len(cohort_b.patient_ids))
           overlap_pct = len(overlap) / smaller * 100 if smaller > 0 else 0
   ```
5. Calculate `total_unique_patients` (union of all cohorts)
6. Calculate `common_to_all` (intersection of all cohorts)
7. Optionally cache results for 24 hours

---

## Data Flow Diagrams

### Cohort Creation Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User uploads file                                                    │
│          │                                                               │
│          ▼                                                               │
│  2. POST /upload-master-data ──────────────────────┐                     │
│          │                                         │                     │
│          │  Returns: master_data_id, columns       │                     │
│          ▼                                         │                     │
│  3. User builds filter in UI                       │                     │
│          │                                         │                     │
│          ▼                                         │                     │
│  4. Frontend applies filter to data (client-side)  │                     │
│          │                                         │                     │
│          │  filtered_patient_ids = [...]           │                     │
│          ▼                                         │                     │
│  5. POST /cohorts                                  │                     │
│     {                                              │                     │
│       name, description,                           │                     │
│       master_data_id,                              │                     │
│       columns, filter,                             │                     │
│       filtered_patient_ids,                        │                     │
│       patient_count                                │                     │
│     }                                              │                     │
│          │                                         │                     │
└──────────┼─────────────────────────────────────────┼─────────────────────┘
           │                                         │
           ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  POST /upload-master-data:           POST /cohorts:                      │
│    1. Validate file                    1. Validate request               │
│    2. Parse columns                    2. Store cohort in DB             │
│    3. Upload to S3                     3. Log activity                   │
│    4. Store metadata in DB             4. Return cohort                  │
│    5. Return master_data_id                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cohort View Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Navigate to /patient-screening/{cohort_id}                           │
│          │                                                               │
│          ▼                                                               │
│  2. GET /cohorts/{cohort_id} ─────────────────────────┐                  │
│          │                                            │                  │
│          │  Returns: cohort metadata + filter         │                  │
│          ▼                                            │                  │
│  3. GET /cohorts/{cohort_id}/master-data              │                  │
│          │                                            │                  │
│          │  Returns: presigned S3 URL                 │                  │
│          ▼                                            │                  │
│  4. Fetch data directly from S3 URL                   │                  │
│          │                                            │                  │
│          ▼                                            │                  │
│  5. Apply filter client-side                          │                  │
│          │                                            │                  │
│          ▼                                            │                  │
│  6. Display master count + screened count             │                  │
│                                                       │                  │
└───────────────────────────────────────────────────────┼──────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND + S3                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GET /cohorts/{id}:              GET /cohorts/{id}/master-data:          │
│    - Query PostgreSQL              - Generate presigned S3 URL           │
│    - Return cohort metadata        - 15 min expiration                   │
│                                    - Return URL                          │
│                                                                          │
│                                  S3 Bucket:                              │
│                                    - Direct file download                │
│                                    - No backend processing               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Standard Error Response
```json
{
  "status": "error",
  "message": "Human-readable error message",
  "error_code": "UNIQUE_ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `COHORT_NOT_FOUND` | 404 | Cohort ID does not exist |
| `MASTER_DATA_NOT_FOUND` | 404 | Master data ID does not exist |
| `INVALID_FILE_FORMAT` | 400 | Unsupported file type |
| `FILE_TOO_LARGE` | 413 | File exceeds 100MB limit |
| `INVALID_FILTER` | 400 | Filter structure is invalid |
| `INVALID_OPERATOR` | 400 | Operator not valid for column type |
| `COLUMN_NOT_FOUND` | 400 | Filter references unknown column |
| `COMPARISON_MIN_COHORTS` | 400 | Fewer than 2 cohorts for comparison |
| `COMPARISON_MAX_COHORTS` | 400 | More than 5 cohorts for comparison |

---

## Performance Considerations

### S3 Storage
- Use multipart upload for files >100MB
- Enable server-side encryption (SSE-S3)
- Set lifecycle policy to move old master data to Glacier after 90 days

### Database
- Index `filtered_patient_ids` with GIN for overlap queries
- Index `enterprise_id` on all tables (injected by API gateway)
- Use connection pooling (min: 5, max: 20)

> **Note**: `enterprise_id`, `user_id`, `user_name`, and `project_id` fields are passed in the request body when needed. The backend service does not handle authentication directly - this is managed by the API Gateway.

### Caching
- Cache presigned URLs for 5 minutes (shorter than expiration)
- Cache comparison results for 24 hours
- Invalidate comparison cache when cohort filter changes

### Pagination
- Default page size: 20
- Maximum page size: 100
- Use cursor-based pagination for activity logs (high volume)

---

## Activity Logging

### Events to Log
| Action | Description | Metadata |
|--------|-------------|----------|
| `created` | Cohort created | `{initial_patient_count, rule_count}` |
| `updated` | Name/description changed | `{previous_value, new_value}` |
| `filter_changed` | Filter modified | `{previous_count, new_count, changed_rules}` |
| `exported` | Data downloaded | `{format, record_count, type: master\|screened}` |
| `compared` | Cohort compared | `{compared_with, overlap_count}` |

### Log Entry Structure
```python
{
    "cohort_id": uuid,
    "action": "filter_changed",
    "description": "Updated EASI score threshold from 12 to 16",
    "user_id": uuid,
    "user_name": "Dr. Sarah Chen",  # Denormalized for display
    "previous_value": {"field": "EASI_score", "value": 12},
    "new_value": {"field": "EASI_score", "value": 16},
    "metadata": {"previous_count": 2340, "new_count": 1875},
    "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Clinical Trial Context

### Common Use Cases

1. **Basic Eligibility Screening**
   - Age requirements (≥18 years)
   - Disease duration minimums
   - Exclude pregnant/breastfeeding patients

2. **Disease Severity Criteria**
   - Score-based thresholds (EASI, vIGA, ECOG, etc.)
   - Percentage-based criteria (BSA coverage)
   - Stage/grade classifications

3. **Treatment History**
   - Prior treatment failures
   - Washout periods (no recent biologics)
   - Number of prior therapy lines

4. **Safety Exclusions**
   - Active infections
   - Organ function requirements
   - Contraindicated conditions

5. **Biomarker-Based Selection**
   - Mutation status (EGFR, ALK, KRAS)
   - Expression levels (PD-L1, CD19)
   - Genetic markers

### Example Filter Configurations

**Atopic Dermatitis Trial:**
```json
{
  "logic": "AND",
  "rules": [
    {"field": "age", "operator": "gte", "value": 18},
    {"field": "EASI_score", "operator": "gte", "value": 16},
    {"field": "BSA_percent", "operator": "gte", "value": 10},
    {"field": "active_skin_infection", "operator": "equals", "value": "No"}
  ]
}
```

**Lung Cancer Immunotherapy:**
```json
{
  "logic": "AND",
  "rules": [
    {"field": "pd_l1_expression", "operator": "gte", "value": 50},
    {"field": "egfr_mutation", "operator": "equals", "value": "Negative"},
    {"field": "alk_rearrangement", "operator": "equals", "value": "Negative"},
    {"field": "ECOG_score", "operator": "lte", "value": 1},
    {
      "logic": "OR",
      "rules": [
        {"field": "tumor_stage", "operator": "equals", "value": "IIIB"},
        {"field": "tumor_stage", "operator": "equals", "value": "IV"}
      ]
    }
  ]
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Filter evaluation with all operator types
- [ ] Nested group evaluation (AND within OR, etc.)
- [ ] Negation handling at group level
- [ ] Column type coercion (string to number)
- [ ] Empty filter handling (returns all records)
- [ ] Invalid filter structure detection

### Integration Tests
- [ ] File upload to S3 (all formats)
- [ ] Presigned URL generation and access
- [ ] Cohort CRUD operations
- [ ] Activity logging on all actions
- [ ] Comparison calculation accuracy
- [ ] Enterprise isolation (multi-tenant)

### Performance Tests
- [ ] Upload 50MB file under 30 seconds
- [ ] Filter 100,000 patients under 2 seconds (frontend)
- [ ] Compare 5 cohorts under 5 seconds
- [ ] Concurrent user access (100 users)

---

## Migration Notes

### From In-Memory to Backend
The current frontend implementation stores cohorts in localStorage. Migration requires:

1. **Data Export**: Extract cohorts from localStorage
2. **Master Data Upload**: Upload source files to S3
3. **Cohort Recreation**: Create cohorts via API with filters
4. **Verification**: Compare patient counts match

### Backward Compatibility
- Frontend should check for localStorage cohorts on first load
- Offer migration wizard to move to backend storage
- Keep localStorage as fallback when offline
