"""
Code Execution Agent Module

A Google ADK-based agent system that:
1. Selects relevant files from S3/local storage for a query
2. Generates Python analysis code using LLM
3. Executes code locally (no file size limits)
4. Formats results into user-friendly responses

Supports large files (>512MB) and complex multi-file analysis.

Two usage modes:
1. Orchestrator Mode: Use CodeExecutionOrchestrator for step-by-step control
2. ADK Agent Mode: Use DataScienceAgent for function-calling with auto tool selection
"""

from .orchestrator import CodeExecutionOrchestrator
from .file_selector import FileSelector
from .code_generator import CodeGenerator
from .code_executor import CodeExecutor
from .response_formatter import ResponseFormatter
from .adk_agent import DataScienceAgent, create_agent

__all__ = [
    # Orchestrator mode (explicit control)
    "CodeExecutionOrchestrator",
    "FileSelector",
    "CodeGenerator",
    "CodeExecutor",
    "ResponseFormatter",
    # ADK Agent mode (function calling)
    "DataScienceAgent",
    "create_agent",
]
