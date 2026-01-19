"""LiteLLM wrapper for multi-model support (Azure AI, OpenAI, Claude, etc.)."""

import os
from typing import Optional, Dict, Any, List
from litellm import completion
import litellm


class LiteLLMWrapper:
    """
    Wrapper for LiteLLM to support multiple LLM providers.

    Supports:
    - Google AI (Gemini)
    - Azure OpenAI
    - OpenAI
    - Anthropic Claude
    - And many more via LiteLLM
    """

    def __init__(
        self,
        model: str = "gemini/gemini-2.0-flash-exp",
        api_key: Optional[str] = None,
        azure_config: Optional[Dict[str, str]] = None,
        **kwargs
    ):
        """
        Initialize LiteLLM wrapper.

        Args:
            model: Model identifier (e.g., "gemini/gemini-pro", "azure/gpt-4", "claude-3-sonnet")
            api_key: API key for the provider
            azure_config: Azure-specific configuration (api_base, api_version, etc.)
            **kwargs: Additional arguments for the model
        """
        self.model = model
        self.api_key = api_key
        self.azure_config = azure_config or {}
        self.kwargs = kwargs

        # Set API keys based on provider
        if "gemini" in model.lower() or "google" in model.lower():
            os.environ["GEMINI_API_KEY"] = api_key or os.getenv("GOOGLE_API_KEY", "")
        elif "azure" in model.lower():
            os.environ["AZURE_API_KEY"] = api_key or os.getenv("AZURE_API_KEY", "")
            if azure_config:
                os.environ["AZURE_API_BASE"] = azure_config.get("api_base", "")
                os.environ["AZURE_API_VERSION"] = azure_config.get("api_version", "")
        elif "gpt" in model.lower() or "openai" in model.lower():
            os.environ["OPENAI_API_KEY"] = api_key or os.getenv("OPENAI_API_KEY", "")
        elif "claude" in model.lower():
            os.environ["ANTHROPIC_API_KEY"] = api_key or os.getenv("ANTHROPIC_API_KEY", "")

        # Enable verbose logging if in debug mode
        if os.getenv("LITELLM_DEBUG"):
            litellm.set_verbose = True

    def generate_content(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Any:
        """
        Generate content using the configured model.

        Args:
            prompt: The input prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional arguments for the completion call

        Returns:
            Response object with text attribute
        """
        messages = [{"role": "user", "content": prompt}]

        response = completion(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **{**self.kwargs, **kwargs}
        )

        # Create a simple response object with text attribute
        class Response:
            def __init__(self, content):
                self.text = content

        return Response(response.choices[0].message.content)

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        Chat completion with conversation history.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional arguments

        Returns:
            Response text
        """
        response = completion(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **{**self.kwargs, **kwargs}
        )

        return response.choices[0].message.content


# Example usage configurations for different providers

PROVIDER_EXAMPLES = {
    "google_gemini": {
        "model": "gemini/gemini-2.0-flash-exp",
        "api_key": "YOUR_GOOGLE_API_KEY",
    },
    "azure_openai_gpt4": {
        "model": "azure/gpt-4",
        "api_key": "YOUR_AZURE_API_KEY",
        "azure_config": {
            "api_base": "https://YOUR-RESOURCE.openai.azure.com/",
            "api_version": "2023-05-15"
        }
    },
    "openai_gpt4": {
        "model": "gpt-4-turbo-preview",
        "api_key": "YOUR_OPENAI_API_KEY",
    },
    "anthropic_claude": {
        "model": "claude-3-sonnet-20240229",
        "api_key": "YOUR_ANTHROPIC_API_KEY",
    },
    "azure_ai_models": {
        "model": "azure/YOUR-DEPLOYMENT-NAME",
        "api_key": "YOUR_AZURE_API_KEY",
        "azure_config": {
            "api_base": "https://YOUR-RESOURCE.openai.azure.com/",
            "api_version": "2024-02-01"
        }
    }
}
