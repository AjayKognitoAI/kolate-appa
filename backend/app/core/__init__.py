"""
Core module - shared infrastructure components.

This module provides centralized clients and utilities used across the application:
- S3Client: Centralized AWS S3 operations
- LLMClient: Centralized OpenAI/Azure OpenAI operations
"""

from app.core.s3_client import S3Client, get_s3_client, get_s3_client_for_bucket
from app.core.llm_client import LLMClient, get_llm_client, get_llm_client_with_config

__all__ = [
    # S3 Client
    "S3Client",
    "get_s3_client",
    "get_s3_client_for_bucket",
    # LLM Client
    "LLMClient",
    "get_llm_client",
    "get_llm_client_with_config",
]
