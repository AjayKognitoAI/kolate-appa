"""
Configuration for Code Execution Agent
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field


class CodeExecutionConfig(BaseModel):
    """Configuration for code execution agent system."""

    # LLM Configuration
    model_name: str = Field(
        default="gemini-2.0-flash-exp",
        description="Google Gemini model to use"
    )
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4000, gt=0)

    # File Storage
    s3_bucket: Optional[str] = Field(
        default=os.getenv("S3_BUCKET_NAME"),
        description="S3 bucket containing data files"
    )
    s3_base_path: str = Field(
        default=os.getenv("S3_BASE_PATH", "clinical-trials/"),
        description="Base path in S3 bucket"
    )
    local_cache_dir: Path = Field(
        default=Path("./data/code_execution_cache"),
        description="Local cache for downloaded S3 files"
    )

    # Code Execution
    execution_timeout: int = Field(
        default=300,
        description="Maximum seconds for code execution"
    )
    max_file_size_mb: int = Field(
        default=5000,
        description="Maximum file size to process (MB)"
    )
    sandbox_enabled: bool = Field(
        default=True,
        description="Run code in restricted sandbox"
    )
    allowed_imports: list[str] = Field(
        default=[
            "pandas", "numpy", "scipy", "matplotlib", "seaborn",
            "sklearn", "statsmodels", "plotly", "json", "csv",
            "os", "sys", "pathlib", "datetime", "typing", "warnings"
        ],
        description="Python packages allowed in generated code"
    )

    # File Selection
    max_files_to_select: int = Field(
        default=10,
        description="Maximum files to select for analysis"
    )
    file_metadata_cache_ttl: int = Field(
        default=3600,
        description="Seconds to cache file metadata"
    )

    # Visualization
    viz_output_dir: Path = Field(
        default=Path("./data/visualizations"),
        description="Directory to save generated visualizations"
    )
    max_plots: int = Field(default=10, description="Max plots per query")

    # Safety
    max_code_lines: int = Field(
        default=500,
        description="Maximum lines of generated code"
    )
    disallowed_code_patterns: list[str] = Field(
        default=[
            "exec(", "eval(", "__import__", "compile(",
            "open(", "write(", "delete(", "rm ", "rmdir",
            "subprocess", "os.system", "os.popen"
        ],
        description="Code patterns to reject for safety"
    )

    class Config:
        env_prefix = "CODE_EXEC_"


def get_config() -> CodeExecutionConfig:
    """Get configuration singleton."""
    return CodeExecutionConfig()
