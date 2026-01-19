# Data Science & ML Chatbot with Automatic Insights

A comprehensive multi-agent chatbot system that analyzes datasets, research papers, and provides expert-level data science and machine learning guidance **with automatic insight generation and evidence-based analysis**. Built using Google's ADK (Agent Development Kit) framework.

## 🌟 Features

### Multi-Agent Architecture
- **Main Orchestrator Agent**: Coordinates tasks and routes requests to specialized sub-agents
- **CSV Analyzer** (Enhanced): Loads and analyzes tabular data with **automatic EDA and insights**
- **Research Paper Analyzer**: Extracts and analyzes information from PDF research papers
- **Statistical Analyzer**: Performs rigorous statistical tests and hypothesis testing
- **ML Analyzer**: Provides machine learning recommendations and guidance

### 🆕 NEW: Automatic Insights & EDA
✅ **Comprehensive EDA**
- Automatic insight generation across 6 categories
- Data quality scoring (0-100)
- Pattern and anomaly detection
- Evidence-based claims
- Actionable recommendations with priorities
- Data storytelling and narratives

✅ **Insight Categories**
- **Data Quality**: Missing values, duplicates, constant columns
- **Distributions**: Skewness, normality, zero-inflation
- **Relationships**: Correlations, multicollinearity
- **Patterns**: Trends, dominant categories, high cardinality
- **Anomalies**: Outliers, extreme values
- **Summary**: Key findings and recommendations

### Core Capabilities
✅ **Data Analysis**
- Load and inspect CSV files
- **Automatic comprehensive EDA** (NEW!)
- **Generate data-driven insights** (NEW!)
- **Evidence-based analysis** (NEW!)
- Descriptive statistics for all data types
- Correlation analysis
- Outlier detection
- Data quality assessment

✅ **Statistical Analysis**
- T-tests (independent, paired)
- Chi-square tests
- ANOVA
- Normality testing
- Confidence intervals
- Advanced hypothesis testing

✅ **Research Paper Analysis**
- PDF text extraction
- Key findings extraction
- Methodology identification
- Statistical information extraction
- Paper summarization

✅ **Machine Learning Guidance**
- Algorithm recommendations
- Feature engineering suggestions
- ML readiness assessment
- Model evaluation strategies

✅ **Visualization**
- Histograms
- Box plots
- Correlation heatmaps
- Scatter plots
- Line plots
- Bar charts
- Distribution plots
- Time series plots

✅ **Session Management**
- Persistent session storage
- Conversation history tracking
- Analysis results caching
- File upload management

## 🏗️ Architecture

```
data_science_agent/
├── database/              # Session and state management
│   ├── models.py         # SQLAlchemy models
│   └── db_manager.py     # Database operations
├── shared_libraries/     # Common utilities
│   ├── data_loader.py    # Data loading utilities
│   ├── statistics_helper.py  # Statistical functions
│   ├── visualization_helper.py  # Plotting functions
│   └── file_handler.py   # File operations
├── sub_agents/           # Specialized agents
│   ├── csv_analyzer/     # CSV analysis agent
│   ├── research_analyzer/  # Research paper analysis
│   ├── statistical_analyzer/  # Statistical testing
│   └── ml_analyzer/      # ML recommendations
├── agent.py              # Main orchestrator
└── prompt.py             # Main agent prompt
```

### Architecture Restructuring (v2.0)

To improve modularity and encapsulation, the core agent logic has been refactored and moved into the API service structure:

1. **New `api/agent` Module**: The core agent components (`RAGSystem`, `AnalysisPipeline`, `ChatHandler`) and `shared_libraries` have been moved to `api/agent`.
2. **Self-Contained API**: The API no longer depends on the external `data_science_agent` package for its core functionality, making it more robust and easier to deploy.
3. **Updated Imports**: All API routes (`api/routes/`) now import directly from `api.agent` instead of `data_science_agent`.

New Structure:
```
api/
├── agent/                 # Encapsulated Agent Logic
│   ├── shared_libraries/  # Data processing utilities
│   ├── analysis_pipeline.py
│   ├── chat_handler.py
│   └── rag_system.py
├── routes/               # API Endpoints
├── crud/                 # Database Operations
└── models/               # Database Models
```

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or higher
- Poetry (for dependency management)
- Google API Key for Gemini

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd copilot-data-science-ml-agent
```

2. **Install Poetry** (if not already installed)
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

3. **Install dependencies**
```bash
poetry install
```

4. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
# Google AI Configuration
GOOGLE_API_KEY=your_google_api_key_here

# Database Configuration (SQLite for local development)
DATABASE_URL=sqlite:///./data_science_agent.db

# Agent Configuration
MODEL_NAME=gemini-2.0-flash-exp
TEMPERATURE=0.7
MAX_ITERATIONS=10

# File Upload Configuration
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE_MB=100

# Session Configuration
SESSION_TIMEOUT_MINUTES=60
```

### Quick Start

#### 1. Interactive CLI Mode

```bash
poetry run python -m data_science_agent.agent
```

This starts an interactive session where you can:
- Ask questions about data science and ML
- Upload files for analysis
- Get statistical insights
- Receive ML recommendations

Example interaction:
```
You: file:/path/to/your/data.csv
Agent: [Loads and analyzes the file]

You: Show me descriptive statistics for all numeric columns
Agent: [Provides comprehensive statistics]

You: Create a correlation heatmap
Agent: [Generates and saves visualization]

You: Recommend ML algorithms for classification
Agent: [Provides algorithm recommendations]
```

#### 2. Python API Usage

```python
from data_science_agent.agent import DataScienceAgent

# Initialize agent
agent = DataScienceAgent()

# Create a session
session_id = agent.create_session(user_id="your_user_id")

# Analyze data
response = agent.analyze(
    session_id=session_id,
    user_message="Analyze this CSV file",
    file_paths=["data/sample.csv"]
)

print(response)

# Get session history
history = agent.get_session_history(session_id)

# Get analysis results
analyses = agent.get_session_analyses(session_id)
```

#### 3. Using Individual Tools

```python
from data_science_agent.sub_agents.csv_analyzer.tools import (
    load_csv_file,
    get_column_statistics,
    create_visualization
)

# Load CSV
result = load_csv_file("data/sample.csv")
print(result)

# Get statistics
stats = get_column_statistics("data/sample.csv", columns=["age", "salary"])
print(stats)

# Create visualization
viz = create_visualization(
    "data/sample.csv",
    viz_type="correlation_heatmap",
    title="Feature Correlations"
)
print(viz)
```

## 📊 Example Use Cases

### 1. Comprehensive EDA with Automatic Insights (NEW!)

```python
# Get automatic insights, patterns, and recommendations
agent.analyze(
    session_id,
    "Perform comprehensive EDA on this dataset with automatic insights",
    file_paths=["data/patients.csv"]
)

# Output includes:
# - Data quality score (0-100)
# - Automatic insights across 6 categories
# - Pattern detection
# - Anomaly identification
# - Prioritized recommendations
# - Visualization suggestions
```

### 2. Evidence-Based Analysis (NEW!)

```python
# Find evidence for specific claims
agent.analyze(
    session_id,
    "Is there evidence that treatment duration is related to patient age?",
    file_paths=["data/clinical_trial.csv"]
)

# Output includes:
# - Statistical evidence (correlations, p-values)
# - Confidence level
# - Supporting visualizations
# - Conclusion
```

### 3. Generate Data Stories (NEW!)

```python
# Create narrative summaries
agent.analyze(
    session_id,
    "Create a data story from this sales dataset",
    file_paths=["data/sales.csv"]
)

# Output includes:
# - Narrative structure with chapters
# - Key findings in story format
# - Evidence supporting each claim
# - Recommendations as next steps
```

### 4. Pattern Detection (NEW!)

```python
# Detect patterns automatically
agent.analyze(
    session_id,
    "What patterns and trends can you detect in this data?",
    file_paths=["data/timeseries.csv"]
)

# Output includes:
# - Upward/downward trends
# - Dominant categories
# - Cyclical patterns
# - Anomalies
```

### 5. Traditional CSV Data Analysis

```python
# Load and analyze a dataset (traditional approach)
agent.analyze(
    session_id,
    "Load the file and provide descriptive statistics and correlations",
    file_paths=["data/patients.csv"]
)
```

### 2. Statistical Testing

```python
# Perform a t-test
agent.analyze(
    session_id,
    "Perform an independent t-test comparing treatment_group and control_group on the outcome variable"
)
```

### 3. Research Paper Analysis

```python
# Analyze a research paper
agent.analyze(
    session_id,
    "Analyze the research paper at papers/study.pdf and extract key findings, methodology, and statistical results"
)
```

### 4. ML Recommendations

```python
# Get ML algorithm recommendations
agent.analyze(
    session_id,
    "I have a dataset with 50,000 rows and want to predict customer churn. Recommend suitable ML algorithms"
)
```

## 🔧 Configuration

### Database Options

**SQLite (Default - Easiest)**
```env
DATABASE_URL=sqlite:///./data_science_agent.db
```

**PostgreSQL (Production)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/data_science_agent
```

### Model Configuration

Change the model in your `.env` file:
```env
MODEL_NAME=gemini-2.0-flash-exp  # Fast and efficient
# or
MODEL_NAME=gemini-pro  # More capable
```

## 📁 Project Structure

```
copilot-data-science-ml-agent/
├── data_science_agent/        # Main package
│   ├── __init__.py
│   ├── agent.py              # Main orchestrator
│   ├── prompt.py             # Main prompt
│   ├── database/             # Database layer
│   ├── shared_libraries/     # Utilities
│   └── sub_agents/           # Specialized agents
│       ├── csv_analyzer/
│       │   ├── prompt.py
│       │   ├── tools/
│       │   └── __init__.py
│       ├── research_analyzer/
│       ├── statistical_analyzer/
│       └── ml_analyzer/
├── data/                      # Data directory
│   ├── uploads/              # Uploaded files
│   └── visualizations/       # Generated plots
├── tests/                     # Test files
├── eval/                      # Evaluation scripts
├── deployment/               # Deployment configs
├── pyproject.toml            # Poetry configuration
├── .env.example              # Environment template
├── .gitignore
└── README.md
```

## 🧪 Testing

Run tests with:
```bash
poetry run pytest tests/
```

## 📈 Evaluation

The system can be evaluated using the eval framework:

```bash
cd eval/
python evaluate.py
```

## 🚢 Deployment

### Local Deployment

```bash
poetry run python -m data_science_agent.agent
```

### Docker Deployment

```bash
# Build image
docker build -t data-science-agent .

# Run container
docker run -p 8000:8000 -e GOOGLE_API_KEY=your_key data-science-agent
```

### Vertex AI Deployment

See `deployment/README.md` for instructions on deploying to Google Cloud Vertex AI.

## 🛠️ Development

### Adding New Tools

1. Create a new tool function in the appropriate sub-agent's `tools/` directory
2. Register the tool in the sub-agent's `tools/__init__.py`
3. Add the tool to the main agent's tool registry in `agent.py`

### Adding New Sub-Agents

1. Create a new directory under `sub_agents/`
2. Add `prompt.py`, `agent.py`, and `tools/` directory
3. Implement the sub-agent's tools
4. Register in the main orchestrator

## 📚 Documentation

- **Tool Documentation**: Each tool has comprehensive docstrings
- **API Documentation**: See `docs/API.md`
- **Architecture Guide**: See `docs/ARCHITECTURE.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Google ADK](https://github.com/google/adk-samples)
- Uses Google Gemini AI models
- Inspired by the Google ADK data-science agent example

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review example use cases

## 🔮 Future Enhancements

- [ ] Add support for more file formats (Excel, JSON, XML)
- [ ] Implement advanced ML model training capabilities
- [ ] Add natural language to SQL for database querying
- [ ] Integrate with BigQuery for large-scale data analysis
- [ ] Add real-time data streaming analysis
- [ ] Implement collaborative filtering recommendations
- [ ] Add automated report generation
- [ ] Integrate with Jupyter notebooks
- [ ] Add voice interface support
- [ ] Implement multi-language support

---

**Version**: 0.1.0
**Last Updated**: November 2024
**Status**: Active Development
