from app.core.cache.interface import CacheInterface
from app.core.cache.factory import CacheFactory, CacheType
from app.core.cache.manager import CacheManager, cache_manager
from app.core.cache.redis_cache import RedisCacheStrategy
from app.core.cache.memory_cache import InMemoryCacheStrategy

# Decorators
from app.core.cache.decorators import cacheable, cacheevict

# Configuration
from app.core.cache.config import (
    configure_cache, configure_method, CacheableConfig, CacheEvictConfig,
    EvictionStrategy, SerializationStrategy, config_manager
)

# Statistics
from app.core.cache.stats import (
    stats_collector, get_cache_stats, get_performance_summary,
    record_hit, record_miss, record_error, record_eviction
)

# Utilities
from app.core.cache.utils import (
    CacheInspector, CacheKeyDebugger, debug_method_cache,
    get_cache_health_report
)

# Key generation and serialization
from app.core.cache.key_generator import create_cache_key
from app.core.cache.serializers import serialize_for_cache, deserialize_from_cache

__all__ = [
    # Core components
    "CacheInterface",
    "CacheFactory",
    "CacheType",
    "CacheManager",
    "cache_manager",
    "RedisCacheStrategy",
    "InMemoryCacheStrategy",

    # Decorators
    "cacheable",
    "cacheevict",

    # Configuration
    "configure_cache",
    "configure_method",
    "CacheableConfig",
    "CacheEvictConfig",
    "EvictionStrategy",
    "SerializationStrategy",
    "config_manager",

    # Statistics
    "stats_collector",
    "get_cache_stats",
    "get_performance_summary",
    "record_hit",
    "record_miss",
    "record_error",
    "record_eviction",

    # Utilities
    "CacheInspector",
    "CacheKeyDebugger",
    "debug_method_cache",
    "get_cache_health_report",

    # Key generation and serialization
    "create_cache_key",
    "serialize_for_cache",
    "deserialize_from_cache",
]