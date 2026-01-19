# Code Execution Agent

A Google ADK-based agent system that dynamically generates and executes Python code for data analysis.

## Overview

Instead of pre-computing all possible analyses and storing them in ChromaDB, this system:

1. **Selects relevant files** from S3/local storage based on the user's query
2. **Generates Python analysis code** using LLM (Google Gemini)
3. **Executes code locally** with no file size limits
4. **Formats results** into user-friendly responses

## Architecture

```
User Query
    ↓
FileSelector (LLM) → Identifies relevant files from S3/local
    ↓
CodeGenerator (LLM) → Generates Python analysis code
    ↓
CodeExecutor (Local) → Runs code safely, captures output & plots
    ↓
ResponseFormatter (LLM) → Creates formatted response
    ↓
Response to User
```

## Key Features

- ✅ **Supports large files** (>512MB, >1GB) - no limits
- ✅ **Dynamic analysis** - LLM can generate any Python code needed
- ✅ **S3 integration** - Automatically accesses files from S3
- ✅ **Local execution** - Fast, no external API calls for code execution
- ✅ **Safe sandbox** - Restricted imports and code patterns
- ✅ **Automatic plots** - Generates and saves matplotlib/seaborn visualizations
- ✅ **Multi-file analysis** - Can analyze multiple files together

## Installation

### Prerequisites

```bash
# Required Python packages
poetry add google-generativeai boto3 pandas numpy matplotlib seaborn scipy scikit-learn

# Or with pip
pip install google-generativeai boto3 pandas numpy matplotlib seaborn scipy scikit-learn
```

### Environment Variables

```bash
# Required
export GOOGLE_API_KEY="your-google-api-key"

# Optional (for S3 access)
export S3_BUCKET_NAME="your-s3-bucket"
export S3_BASE_PATH="clinical-trials/"
export AWS_ACCESS_KEY_ID="your-aws-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret"

# Optional (customization)
export CODE_EXEC_MODEL_NAME="gemini-2.0-flash-exp"
export CODE_EXEC_TEMPERATURE="0.3"
export CODE_EXEC_MAX_FILES_TO_SELECT="10"
```

## Usage

### Basic Usage

```python
from data_science_agent.code_execution_agent import CodeExecutionOrchestrator

# Initialize orchestrator
orchestrator = CodeExecutionOrchestrator()

# Process a query
result = orchestrator.process_query(
    query="What are the strongest correlations in the patient data?",
    trial_name="trial_001"  # Optional: filter to specific trial
)

# Get response
print(result['response'])  # Formatted markdown response
print(f"Success: {result['success']}")
print(f"Plots: {result['plots']}")  # List of plot file paths
print(f"Metadata: {result['metadata']}")  # Debug info
```

### Advanced Usage: Custom Code

```python
# Execute custom Python code
result = orchestrator.process_query_with_custom_code(
    code="""
# Custom analysis code
corr = df1.corr()
top_5 = corr.unstack().sort_values(ascending=False).head(10)

plt.figure(figsize=(10, 8))
sns.heatmap(corr, annot=True, cmap='coolwarm')
plt.title('Correlation Matrix')

result = top_5.to_dict()
""",
    file_paths={
        "df1": "s3://my-bucket/trial_1/data.csv",
    },
    query="Show correlations"  # Optional
)
```

### List Available Files

```python
# Get all available files
files_info = orchestrator.get_available_files()
print(f"Found {files_info['count']} files")
for file in files_info['files']:
    print(f"  - {file['file_name']} ({file['file_size_mb']} MB)")

# Filter by trial
trial_files = orchestrator.get_available_files(trial_name="trial_001")
```

### Get File Details

```python
# Get detailed metadata about a file
metadata = orchestrator.get_file_info("s3://bucket/trial_1/data.csv")
print(f"Columns: {metadata['column_names']}")
print(f"Rows: {metadata['num_rows']}")
print(f"Sample: {metadata['sample_data']}")
```

## Configuration

Edit [config.py](config.py) or use environment variables:

```python
from data_science_agent.code_execution_agent.config import CodeExecutionConfig

config = CodeExecutionConfig(
    model_name="gemini-2.0-flash-exp",
    temperature=0.3,
    max_tokens=4000,
    execution_timeout=300,  # seconds
    max_file_size_mb=5000,  # 5GB
    max_files_to_select=10,
    allowed_imports=[
        "pandas", "numpy", "scipy", "matplotlib",
        "seaborn", "sklearn", "statsmodels"
    ],
    disallowed_code_patterns=[
        "exec(", "eval(", "__import__",
        "os.system", "subprocess"
    ]
)
```

## Example Queries

**Correlations:**
```python
result = orchestrator.process_query(
    "What are the top 5 correlations between variables in the dataset?"
)
```

**Distributions:**
```python
result = orchestrator.process_query(
    "Show me the distribution of patient ages and identify outliers"
)
```

**Multi-file Analysis:**
```python
result = orchestrator.process_query(
    "Compare lab results between trial_1 and trial_2",
    trial_name=None  # Don't filter, allow multi-trial
)
```

**Statistical Tests:**
```python
result = orchestrator.process_query(
    "Perform a t-test to compare blood pressure between treatment groups"
)
```

**Time Series:**
```python
result = orchestrator.process_query(
    "Analyze trends in patient vitals over time and create visualizations"
)
```

## Safety Features

### Code Execution Safety

- **Restricted imports**: Only whitelisted packages allowed
- **Pattern blocking**: Blocks dangerous patterns (`exec`, `eval`, `os.system`, etc.)
- **Timeout**: Maximum execution time (default 300s)
- **AST validation**: Parses code before execution
- **No file writes**: Code cannot write files (except plots to designated dir)

### Allowed Packages

```python
pandas, numpy, scipy, matplotlib, seaborn, sklearn,
statsmodels, plotly, json, csv, datetime, typing
```

### Blocked Patterns

```python
exec(, eval(, __import__, compile(, open(, write(,
os.system, os.popen, subprocess, rm, rmdir
```

## Workflow Details

### 1. File Selection

**FileSelector** agent:
- Lists available files from S3 and local storage
- Gets metadata (columns, types, sample data) for each file
- Uses LLM to select most relevant files for query
- Returns selection with reasoning

**Output:**
```json
{
  "selected_files": [
    {
      "file_path": "s3://bucket/trial_1/data.csv",
      "file_name": "data.csv",
      "reason": "Contains patient demographics needed for analysis",
      "metadata": {
        "num_rows": 1000,
        "num_columns": 15,
        "column_names": ["age", "gender", "bp_systolic", ...],
        "sample_data": [...]
      }
    }
  ],
  "file_count": 1,
  "total_size_mb": 5.2
}
```

### 2. Code Generation

**CodeGenerator** agent:
- Takes query + file metadata
- Uses LLM to generate Python analysis code
- Maps files to DataFrame variables (df1, df2, ...)
- Ensures code stores result in `result` variable

**Output:**
```python
# Analyze blood pressure by age group
print("Dataset shape:", df1.shape)

# Create age groups
df1['age_group'] = pd.cut(df1['age'], bins=[0, 30, 50, 70, 100])

# Calculate mean BP by age group
bp_by_age = df1.groupby('age_group')['bp_systolic'].agg(['mean', 'std', 'count'])
print("\nBlood pressure by age group:")
print(bp_by_age)

# Visualize
plt.figure(figsize=(10, 6))
df1.boxplot(column='bp_systolic', by='age_group')
plt.title('Blood Pressure Distribution by Age Group')

result = bp_by_age.to_dict()
```

### 3. Code Execution

**CodeExecutor**:
- Validates code safety (AST parsing, pattern checking)
- Downloads files from S3 if needed
- Loads files into pandas DataFrames
- Executes code in restricted namespace
- Captures stdout/stderr
- Saves matplotlib plots to disk
- Returns results

**Output:**
```json
{
  "success": true,
  "output": "Dataset shape: (1000, 15)\n\nBlood pressure by age group:\n...",
  "result": {
    "mean": {"(0, 30]": 120.5, "(30, 50]": 125.2, ...},
    "std": {"(0, 30]": 8.3, "(30, 50]": 9.1, ...}
  },
  "plots": ["/data/visualizations/plot_0_1234.png"],
  "error": null
}
```

### 4. Response Formatting

**ResponseFormatter** agent:
- Takes execution results + original query
- Uses LLM to format into user-friendly markdown
- Highlights key findings
- References visualizations
- Suggests follow-ups

**Output:**
```markdown
## Blood Pressure Analysis by Age Group

The analysis shows a clear positive trend in blood pressure with age,
with a 15.2 mmHg increase from youngest to oldest age group.

### Key Findings
- Age 0-30: Mean BP 120.5 ± 8.3 mmHg (n=250)
- Age 30-50: Mean BP 125.2 ± 9.1 mmHg (n=400)
- Age 50-70: Mean BP 132.8 ± 10.5 mmHg (n=280)
- Age 70+: Mean BP 135.7 ± 11.2 mmHg (n=70)

### Visualizations
- Box plot showing blood pressure distribution across age groups

### Recommendations
Consider performing ANOVA to test statistical significance of
differences between age groups.
```

## Performance

| Metric | Value |
|--------|-------|
| File selection | 2-5 seconds |
| Code generation | 3-8 seconds |
| Code execution | 5-60 seconds (depends on file size) |
| Response formatting | 2-5 seconds |
| **Total** | **12-78 seconds** |

**Tips for faster performance:**
- Use `max_files` parameter to limit file selection
- Pre-filter by `trial_name` when possible
- Cache common analyses in Redis
- Use smaller data samples for exploratory queries

## Comparison to ChromaDB Approach

| Aspect | ChromaDB (Old) | Code Execution (New) |
|--------|---------------|----------------------|
| **Pre-computation** | Full EDA per file | None (just metadata) |
| **Storage** | ~100-500 KB per file | Minimal |
| **Query flexibility** | Limited to pre-computed | Unlimited (any Python) |
| **Response time** | <1s (cached) | 5-60s (dynamic) |
| **File size limit** | Memory limited | No limit (5GB+) |
| **Maintenance** | 15,000+ lines | ~2,000 lines |
| **Accuracy** | Good | Better (raw data access) |

## Troubleshooting

### "No files found"
- Check S3 credentials and bucket name
- Verify `S3_BASE_PATH` is correct
- Ensure files are CSV/Excel format

### "Code execution failed"
- Check generated code in `metadata['generated_code']`
- Verify file columns match query expectations
- Look for missing data issues in output

### "Disallowed import"
- Add package to `allowed_imports` in config
- Or modify code generation prompt to use allowed packages

### Timeout errors
- Increase `execution_timeout` in config
- Use smaller data samples for testing
- Optimize code (vectorized pandas operations)

## Next Steps

1. **Integration with API**: See `integration_example.py` for FastAPI integration
2. **Caching**: Add Redis caching for common queries
3. **Monitoring**: Add logging and metrics collection
4. **Testing**: Add unit tests for each component

## Support

For issues or questions:
- Check the main project [CLAUDE.md](../../CLAUDE.md)
- Review error messages in `metadata` field
- Enable debug logging in config
