from enum import Enum
from typing import Dict, Type
from app.core.cache.interface import CacheInterface
from app.core.cache.redis_cache import RedisCacheStrategy
from app.core.cache.memory_cache import InMemoryCacheStrategy


class CacheType(Enum):
    """Available cache types."""
    REDIS = "redis"
    MEMORY = "memory"


class CacheFactory:
    """Factory for creating cache strategy instances."""

    _strategies: Dict[CacheType, Type[CacheInterface]] = {
        CacheType.REDIS: RedisCacheStrategy,
        CacheType.MEMORY: InMemoryCacheStrategy,
    }

    @classmethod
    def create_cache(cls, cache_type: CacheType) -> CacheInterface:
        """Create cache instance based on type."""
        if cache_type not in cls._strategies:
            raise ValueError(f"Unsupported cache type: {cache_type}")

        strategy_class = cls._strategies[cache_type]
        return strategy_class()

    @classmethod
    def register_strategy(cls, cache_type: CacheType, strategy_class: Type[CacheInterface]) -> None:
        """Register a new cache strategy."""
        cls._strategies[cache_type] = strategy_class

    @classmethod
    def get_available_types(cls) -> list[CacheType]:
        """Get list of available cache types."""
        return list(cls._strategies.keys())