from typing import Any, Dict, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum


class SerializationStrategy(Enum):
    """Available serialization strategies."""
    JSON = "json"
    JSON_COMPRESSED = "json_compressed"
    PICKLE = "pickle"  # Future implementation
    CUSTOM = "custom"


class EvictionStrategy(Enum):
    """Cache eviction strategies."""
    EXACT_KEY = "exact_key"
    PATTERN = "pattern"
    ALL_KEYS = "all_keys"
    CONDITIONAL = "conditional"


@dataclass
class CacheConfig:
    """Configuration for cache decorators."""

    # Default settings
    default_ttl: int = 300  # 5 minutes
    default_namespace: str = "cache"
    default_key_separator: str = ":"

    # Serialization settings
    serialization_strategy: SerializationStrategy = SerializationStrategy.JSON
    compression_enabled: bool = False
    compression_threshold: int = 1024  # bytes

    # Performance settings
    enable_stats: bool = True
    enable_async_refresh: bool = False
    max_key_length: int = 250

    # Error handling
    graceful_degradation: bool = True  # Continue execution if cache fails
    log_cache_errors: bool = True

    # Key generation settings
    include_class_name: bool = True
    hash_large_params: bool = True
    param_hash_length: int = 12

    # Method-specific overrides
    method_configs: Dict[str, Dict[str, Any]] = field(default_factory=dict)


@dataclass
class CacheableConfig:
    """Configuration specific to @cacheable decorator."""

    ttl: Optional[int] = None
    key_prefix: Optional[str] = None
    key_template: Optional[str] = None
    condition: Optional[Union[str, Callable]] = None
    unless: Optional[Union[str, Callable]] = None
    compression: Optional[bool] = None
    namespace: Optional[str] = None
    include_class_name: Optional[bool] = None

    # Advanced options
    async_refresh: bool = False
    refresh_threshold: float = 0.8  # Refresh when 80% of TTL has passed
    background_refresh: bool = False


@dataclass
class CacheEvictConfig:
    """Configuration specific to @cacheevict decorator."""

    keys: Optional[Union[str, list]] = None
    pattern: Optional[str] = None
    strategy: EvictionStrategy = EvictionStrategy.EXACT_KEY
    condition: Optional[Union[str, Callable]] = None
    before_invocation: bool = False
    all_entries: bool = False
    namespace: Optional[str] = None


class CacheConfigManager:
    """Manages cache configuration globally and per-method."""

    def __init__(self, config: Optional[CacheConfig] = None):
        self.global_config = config or CacheConfig()
        self._method_configs: Dict[str, Dict[str, Any]] = {}

    def get_global_config(self) -> CacheConfig:
        """Get global cache configuration."""
        return self.global_config

    def update_global_config(self, **kwargs) -> None:
        """Update global cache configuration."""
        for key, value in kwargs.items():
            if hasattr(self.global_config, key):
                setattr(self.global_config, key, value)
            else:
                raise ValueError(f"Unknown configuration option: {key}")

    def set_method_config(self, method_key: str, config: Dict[str, Any]) -> None:
        """Set configuration for a specific method."""
        self._method_configs[method_key] = config

    def get_method_config(self, method_key: str) -> Dict[str, Any]:
        """Get configuration for a specific method."""
        return self._method_configs.get(method_key, {})

    def get_effective_config(self, method_key: str, decorator_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get effective configuration by merging global, method-specific, and decorator configs.

        Priority: decorator_config > method_config > global_config
        """
        # Start with global defaults
        effective_config = {
            'ttl': self.global_config.default_ttl,
            'namespace': self.global_config.default_namespace,
            'compression': self.global_config.compression_enabled,
            'include_class_name': self.global_config.include_class_name,
            'graceful_degradation': self.global_config.graceful_degradation,
        }

        # Apply method-specific configuration
        method_config = self.get_method_config(method_key)
        effective_config.update(method_config)

        # Apply decorator-specific configuration (highest priority)
        decorator_filtered = {k: v for k, v in decorator_config.items() if v is not None}
        effective_config.update(decorator_filtered)

        return effective_config

    def generate_method_key(self, func: Callable) -> str:
        """Generate a unique key for a method."""
        if hasattr(func, '__self__'):
            # Instance method
            class_name = func.__self__.__class__.__name__
            return f"{class_name}.{func.__name__}"
        else:
            # Function or static method
            module_name = getattr(func, '__module__', 'unknown')
            return f"{module_name}.{func.__name__}"

    def should_enable_compression(self, config: Dict[str, Any]) -> bool:
        """Determine if compression should be enabled based on configuration."""
        if 'compression' in config and config['compression'] is not None:
            return config['compression']
        return self.global_config.compression_enabled

    def get_serialization_strategy(self, config: Dict[str, Any]) -> SerializationStrategy:
        """Get serialization strategy based on configuration."""
        if self.should_enable_compression(config):
            return SerializationStrategy.JSON_COMPRESSED
        return SerializationStrategy.JSON

    def evaluate_condition(self, condition: Optional[Union[str, Callable]],
                         context: Dict[str, Any]) -> bool:
        """
        Evaluate a condition expression or callable.

        Args:
            condition: Condition to evaluate (string expression or callable)
            context: Context variables for evaluation

        Returns:
            True if condition passes, False otherwise
        """
        if condition is None:
            return True

        try:
            if callable(condition):
                return bool(condition(**context))
            elif isinstance(condition, str):
                # Simple string evaluation - in production, consider using a safer evaluator
                return bool(eval(condition, {"__builtins__": {}}, context))
            else:
                return bool(condition)
        except Exception:
            # If evaluation fails, default to True (graceful degradation)
            return True


# Global configuration manager instance
config_manager = CacheConfigManager()


def configure_cache(**kwargs) -> None:
    """
    Configure global cache settings.

    Example:
        configure_cache(
            default_ttl=600,
            compression_enabled=True,
            enable_stats=True
        )
    """
    config_manager.update_global_config(**kwargs)


def configure_method(method_identifier: str, **kwargs) -> None:
    """
    Configure cache settings for a specific method.

    Args:
        method_identifier: Method identifier (class.method or module.function)
        **kwargs: Configuration options

    Example:
        configure_method(
            "UserService.get_by_email_async",
            ttl=1800,
            compression=True
        )
    """
    config_manager.set_method_config(method_identifier, kwargs)