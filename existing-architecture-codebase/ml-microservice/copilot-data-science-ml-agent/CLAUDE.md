# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Data Science & ML Chatbot with Automatic Insights** - A multi-agent system built on Google's ADK (Agent Development Kit) that analyzes datasets, research papers, and provides expert-level data science and machine learning guidance with automatic insight generation and evidence-based analysis.

- **Status:** Active Development
- **Python Version:** ^3.10
- **Main Technologies:** Google Generative AI (Gemini), FastAPI, React, SQLAlchemy, pandas, scikit-learn

## Common Development Commands

### Backend (Python)

```bash
# Install dependencies
poetry install

# Run FastAPI server with auto-reload
poetry run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Run interactive CLI
poetry run python -m data_science_agent.agent

# Run tests
poetry run pytest tests/ -v

# Run tests with coverage
poetry run pytest tests/ --cov=data_science_agent

# Format code
poetry run black .

# Lint code
poetry run flake8 data_science_agent api

# Type check
poetry run mypy data_science_agent api
```

### Frontend (React)

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm start

# Build for production
npm build

# Run tests
npm test
```

### Database

```bash
# The database is automatically initialized on first run
# Default: SQLite at ./data_science_agent.db
# Switch to PostgreSQL via DATABASE_URL environment variable
```

## Project Structure

### Backend Architecture (`data_science_agent/`)

**Main Orchestrator:**
- `agent.py` - Central agent that routes requests to specialized sub-agents and manages 25+ tools

**Sub-agents** (specialized modules with domain-specific tools):
- `csv_analyzer/` - CSV/tabular data analysis with **automatic EDA and insight generation** (new feature)
  - Tools: load CSV, statistics, correlations, outliers, data quality, comprehensive EDA, insights generation, pattern detection, data storytelling
- `research_analyzer/` - Research paper (PDF) analysis
  - Tools: PDF parsing, key findings extraction, statistics extraction, summarization
- `statistical_analyzer/` - Rigorous statistical hypothesis testing
  - Tools: t-tests, chi-square, ANOVA, normality tests, confidence intervals, correlation tests, advanced outlier detection
- `ml_analyzer/` - ML guidance and recommendations
  - Tools: algorithm recommendations, feature engineering suggestions, ML readiness assessment, model evaluation strategies

**Shared Libraries** (`shared_libraries/`):
- `data_loader.py` - CSV/file operations
- `statistics_helper.py` - Statistical computations (10,400+ lines)
- `visualization_helper.py` - Plot generation (10,480+ lines)
- `insight_generator.py` - **Automatic EDA insight generation** across 6 categories: data quality, distributions, relationships, patterns, anomalies, summary
- `file_handler.py` - File management and validation

**Database** (`database/`):
- SQLAlchemy ORM models: Session, ConversationState, AnalysisResult, UploadedFile
- Supports SQLite (dev) and PostgreSQL (prod)
- DatabaseManager handles connections, transactions, session lifecycle

### API Layer (`api/main.py`)

FastAPI REST API with endpoints for:
- Session management (create, get, delete)
- Analysis requests
- File uploads
- Conversation history retrieval
- Analysis results retrieval
- Visualization serving

### Frontend (`frontend/`)

React.js application with components:
- `App.js` - Main controller, session creation, message state management
- `ChatMessage.js` - Message rendering with markdown support
- `FileUpload.js` - Drag-and-drop file upload with validation
- Styling: Modern gradient theme, responsive design

## Architecture Overview

```
React Frontend (port 3000)
         ↓ (HTTP/JSON)
FastAPI API (port 8000)
         ↓
Main Orchestrator Agent (agent.py)
         ├→ CSV Analyzer (load, stats, EDA, insights, patterns, stories)
         ├→ Research Analyzer (PDF parsing, extraction, summarization)
         ├→ Statistical Analyzer (hypothesis tests, confidence intervals)
         └→ ML Analyzer (algorithm recommendations, feature engineering)
         ↓
Shared Libraries (statistics, visualization, insights)
         ↓
Database (SQLAlchemy) + File System
```

**Key Pattern:** Multi-agent orchestration with tool registry. Each sub-agent has specific tools. Main agent delegates requests and routes to appropriate sub-agent.

**Session Management:** UUID-based sessions with persistent conversation history and analysis results in database.

**LLM Support:** Google Gemini (default: `gemini-2.0-flash-exp`) with pluggable LiteLLM wrapper for multi-provider support (OpenAI, Claude, Azure, etc.).

## Configuration

### Environment Variables

```bash
# Required
GOOGLE_API_KEY=your_google_api_key

# Optional (with defaults)
DATABASE_URL=sqlite:///./data_science_agent.db  # or postgresql://...
MODEL_NAME=gemini-2.0-flash-exp
TEMPERATURE=0.7
MAX_ITERATIONS=10
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE_MB=100
SESSION_TIMEOUT_MINUTES=60
```

Setup: Copy `.env.example` to `.env` and fill in required values.

### Database

- **Development:** SQLite (automatic, no setup needed)
- **Production:** PostgreSQL (update DATABASE_URL in .env)

Database tables are created automatically on first run.

## Key Features & Capabilities

### **Automatic EDA with Insights** (NEW)

The CSV Analyzer automatically generates insights across 6 categories:
1. **Data Quality** - Missing values, duplicates, type consistency (0-100 score)
2. **Distributions** - Skewness, normality, zero-inflation
3. **Relationships** - Correlations, multicollinearity
4. **Patterns** - Trends, dominant categories, cyclical patterns
5. **Anomalies** - Outliers, extreme values, anomaly scoring
6. **Summary & Recommendations** - Key findings, actionable recommendations

All insights are evidence-based with statistical support.

### Core Capabilities

**Data Analysis:**
- CSV loading and inspection with automatic caching
- Comprehensive EDA generation
- Descriptive statistics, correlations, outlier detection
- Data quality assessment with scoring
- Pattern and trend detection
- Data storytelling narratives

**Statistical Testing:**
- T-tests, chi-square, ANOVA
- Normality testing (Shapiro-Wilk, Anderson-Darling, Kolmogorov-Smirnov)
- Confidence intervals, correlation significance
- Advanced outlier detection (IQR, Z-score, Isolation Forest)

**Research Paper Analysis:**
- PDF text extraction
- Key findings and methodology extraction
- Statistical results identification
- Paper summarization

**ML Guidance:**
- Algorithm recommendations based on problem type
- Feature engineering suggestions
- ML model readiness assessment
- Model evaluation strategy recommendations

**Visualization:**
- Histograms, box plots, scatter, line, bar charts
- Correlation heatmaps, distribution plots (KDE, violin)
- Time series plots, multi-plot dashboards
- Automatic saving to `data/visualizations/`

## Important Implementation Details

### CSV Analyzer - Core Tools

Located in `data_science_agent/sub_agents/csv_analyzer/tools/csv_tools.py`:

- `load_csv_file()` - Loads CSV and caches DataFrame in memory
- `get_column_statistics()` - Descriptive stats (mean, median, std, quartiles, etc.)
- `analyze_correlations()` - Correlation matrices (Pearson, Spearman, Kendall)
- `detect_outliers()` - IQR-based, Z-score, Isolation Forest methods
- `check_data_quality()` - Missing values, duplicates, constant columns
- `create_visualization()` - Generates plots (histograms, box, scatter, heatmaps)
- `perform_comprehensive_eda()` - Full EDA analysis with automatic insights
- `generate_insights()` - Focused insight generation for specific aspects
- `find_evidence()` - Validates and provides evidence for claims
- `detect_patterns()` - Identifies trends, cyclical patterns, high-cardinality columns
- `generate_data_story()` - Creates narrative descriptions of data

### Insight Generator

Located in `data_science_agent/shared_libraries/insight_generator.py` (657 lines):

Key functions:
- `InsightGenerator` class - Main orchestrator
- `generate_comprehensive_insights()` - Generates insights across all 6 categories
- `_analyze_data_quality()` - Quality metrics and scoring
- `_analyze_distributions()` - Statistical distribution analysis
- `_analyze_relationships()` - Correlation and multicollinearity
- `_analyze_patterns()` - Trend and pattern detection
- `_analyze_anomalies()` - Outlier and anomaly detection
- `_generate_summary()` - Synthesis and recommendations

### DataFrame Caching

DataFrames are cached in memory by file path in the CSV Analyzer to avoid re-loading:
```python
_dataframe_cache = {}  # keyed by file_path
```

This is efficient for repeated operations on the same file but uses memory. Consider memory constraints on large datasets or high concurrency.

### API Gateway Pattern

All frontend requests go through FastAPI endpoints in `api/main.py`. The API:
- Manages session lifecycle
- Handles file uploads
- Routes analysis requests to the main agent
- Returns structured JSON responses

CORS is currently open to all origins (`allow_origins: ["*"]`) - **restrict this for production**.

### Database Persistence

- **Session** - Tracks user sessions with metadata
- **ConversationState** - Stores every user message and agent response with agent type
- **AnalysisResult** - Caches analysis outputs (JSON) and visualization references
- **UploadedFile** - Tracks uploaded files and their status

Default session timeout: 60 minutes. Configure via `SESSION_TIMEOUT_MINUTES` environment variable.

## Common Tasks

### Adding a New Tool to CSV Analyzer

1. Add function to `data_science_agent/sub_agents/csv_analyzer/tools/csv_tools.py`
2. Define the tool schema (name, description, parameters)
3. Register in the CSV Analyzer's prompt file
4. Add to main agent's tool registry if needed

### Switching to a Different LLM Provider

LiteLLM wrapper enables easy switching. Update environment variables:
```bash
# For Claude (Anthropic)
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_key

# For OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key

# For Azure OpenAI
LLM_PROVIDER=azure
AZURE_API_KEY=your_key
AZURE_ENDPOINT=your_endpoint
```

See `data_science_agent/litellm_wrapper.py` for configuration details.

### Adding Visualization Types

Visualization logic is in `data_science_agent/shared_libraries/visualization_helper.py`. Add new plot functions and update the `create_visualization()` tool in CSV Analyzer.

### Extending to New File Formats

1. Add loader function to `data_science_agent/shared_libraries/data_loader.py`
2. Update `detect_data_types()` for new format
3. Extend file upload endpoint to support format
4. Consider creating new sub-agent if analysis differs significantly from CSV

## Known Limitations & TODOs

- **Tests:** `tests/` and `eval/` directories are empty - test suite needs implementation
- **Deployment:** `deployment/` directory empty - need Docker, Kubernetes configs
- **Frontend:** Limited export, visualization options
- **Real-time:** No WebSocket support for streaming responses
- **File Formats:** CSV-focused, limited Excel/JSON/Parquet support
- **Caching:** In-memory DataFrame cache only, no distributed caching
- **Observability:** No comprehensive logging, monitoring, or tracing
- **Security:** CORS wide-open in development, needs restriction for production

## Performance Notes

- DataFrame caching keeps data in memory - monitor for large files
- Comprehensive EDA can be slow on large datasets (100k+ rows)
- Visualization generation has disk I/O overhead (saves to disk)
- Conversation history loaded from DB on each request - consider pagination for long sessions

## Security Considerations

1. **CORS** - Currently allows all origins. Restrict to frontend domain in production.
2. **File Uploads** - Validate file size and type. Current: 100MB max.
3. **API Keys** - Never commit `.env` file. Use environment variables only.
4. **Database** - Use strong passwords for PostgreSQL in production.
5. **Session Timeout** - Default 60 minutes. Adjust based on security requirements.
6. **Input Validation** - FastAPI validates request schemas automatically.

## Testing Notes

The `tests/` directory is empty. When adding tests:
- Use `pytest` for unit/integration tests
- Configure in `pyproject.toml` (already done)
- Use `pytest-asyncio` for async function testing
- Aim for high coverage on critical paths (agent routing, database ops, API endpoints)
