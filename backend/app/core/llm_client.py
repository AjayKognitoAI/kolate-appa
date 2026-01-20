"""
Centralized LLM Client

Provides a single, reusable async LLM client for all backend services.
Supports OpenAI and Azure OpenAI providers.
"""

from typing import Optional, Dict, List, Any, Union
import json

from openai import AsyncOpenAI, AsyncAzureOpenAI

from app.config.settings import settings
from app.core.logging import get_class_logger


class LLMClient:
    """
    Centralized async LLM client for all LLM operations.

    This client should be used by all services that need LLM access.
    It provides a consistent interface for OpenAI and Azure OpenAI.

    Features:
    - Support for OpenAI and Azure OpenAI providers
    - Async chat completions
    - JSON response mode support
    - Configurable temperature and model
    """

    _instance: Optional["LLMClient"] = None

    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
    ):
        """
        Initialize LLM client.

        Args:
            provider: LLM provider ("openai" or "azure"), defaults to settings.LLM_PROVIDER
            api_key: API key, defaults to settings based on provider
            model: Model name/deployment, defaults to settings
            temperature: Default temperature, defaults to settings.LLM_TEMPERATURE
        """
        self.logger = get_class_logger(self.__class__)
        self.provider = (provider or settings.LLM_PROVIDER).lower()
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE

        self._api_key = api_key
        self._model = model
        self._client: Optional[Union[AsyncOpenAI, AsyncAzureOpenAI]] = None

        self.logger.info(f"LLMClient initialized with provider: {self.provider}")

    @property
    def client(self) -> Union[AsyncOpenAI, AsyncAzureOpenAI]:
        """Lazy-load the OpenAI client."""
        if self._client is None:
            self._client = self._create_client()
        return self._client

    @property
    def model(self) -> str:
        """Get the model name based on provider and configuration."""
        if self._model:
            return self._model

        if self.provider == "azure":
            if not settings.AZURE_OPENAI_DEPLOYMENT_NAME:
                raise ValueError("AZURE_OPENAI_DEPLOYMENT_NAME not configured")
            return settings.AZURE_OPENAI_DEPLOYMENT_NAME

        return settings.OPENAI_MODEL

    def _create_client(self) -> Union[AsyncOpenAI, AsyncAzureOpenAI]:
        """Create the appropriate OpenAI client based on provider."""
        if self.provider == "azure":
            api_key = self._api_key or settings.AZURE_OPENAI_API_KEY
            endpoint = settings.AZURE_OPENAI_ENDPOINT

            if not api_key or not endpoint:
                raise ValueError("Azure OpenAI credentials not configured")

            return AsyncAzureOpenAI(
                api_key=api_key,
                azure_endpoint=endpoint,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
        else:
            api_key = self._api_key or settings.OPENAI_API_KEY

            if not api_key:
                raise ValueError("OpenAI API key not configured")

            return AsyncOpenAI(api_key=api_key)

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        json_mode: bool = False,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Send a chat completion request.

        Args:
            messages: List of message dicts with "role" and "content"
            temperature: Override default temperature
            json_mode: If True, request JSON response format
            model: Override default model
            max_tokens: Maximum tokens in response

        Returns:
            Response content string

        Raises:
            ValueError: If LLM call fails
        """
        try:
            params: Dict[str, Any] = {
                "model": model or self.model,
                "messages": messages,
                "temperature": temperature if temperature is not None else self.temperature,
            }

            if json_mode:
                params["response_format"] = {"type": "json_object"}

            if max_tokens:
                params["max_tokens"] = max_tokens

            response = await self.client.chat.completions.create(**params)
            return response.choices[0].message.content

        except Exception as e:
            self.logger.error(f"LLM chat completion failed: {str(e)}")
            raise ValueError(f"LLM request failed: {str(e)}")

    async def chat_completion_json(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a chat completion request and parse JSON response.

        Args:
            messages: List of message dicts with "role" and "content"
            temperature: Override default temperature
            model: Override default model

        Returns:
            Parsed JSON response as dict

        Raises:
            ValueError: If LLM call fails or JSON parsing fails
        """
        content = await self.chat_completion(
            messages=messages,
            temperature=temperature,
            json_mode=True,
            model=model,
        )

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse LLM JSON response: {str(e)}")
            raise ValueError(f"Invalid JSON response from LLM: {str(e)}")

    async def simple_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        json_mode: bool = False,
    ) -> str:
        """
        Simple convenience method for system + user prompt pattern.

        Args:
            system_prompt: System message content
            user_prompt: User message content
            temperature: Override default temperature
            json_mode: If True, request JSON response format

        Returns:
            Response content string
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return await self.chat_completion(
            messages=messages,
            temperature=temperature,
            json_mode=json_mode,
        )

    async def simple_prompt_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Simple convenience method for system + user prompt with JSON response.

        Args:
            system_prompt: System message content
            user_prompt: User message content
            temperature: Override default temperature

        Returns:
            Parsed JSON response as dict
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return await self.chat_completion_json(
            messages=messages,
            temperature=temperature,
        )


# Global singleton instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """
    Get the global LLM client singleton.

    Returns:
        LLMClient instance
    """
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


def get_llm_client_with_config(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> LLMClient:
    """
    Get an LLM client with custom configuration.

    Use this when you need different settings than the default.

    Args:
        provider: LLM provider ("openai" or "azure")
        api_key: API key
        model: Model name/deployment
        temperature: Default temperature

    Returns:
        LLMClient instance with custom config
    """
    return LLMClient(
        provider=provider,
        api_key=api_key,
        model=model,
        temperature=temperature,
    )
