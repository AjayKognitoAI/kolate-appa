from typing import List
from app.core.cache.interface import CacheInterface
from app.core.cache.factory import CacheFactory, CacheType
from app.config.settings import settings


class CacheManager:
    """Cache manager to handle cache operations with strategy pattern."""

    def __init__(self, cache_type: CacheType = CacheType.REDIS):
        self._cache: CacheInterface = CacheFactory.create_cache(cache_type)
        self._cache_type = cache_type

    async def connect(self) -> None:
        """Initialize cache connection."""
        await self._cache.connect()

    async def disconnect(self) -> None:
        """Close cache connection."""
        await self._cache.disconnect()

    async def get(self, key: str) -> str | None:
        """Get value by key from cache."""
        return await self._cache.get(key)

    async def set(self, key: str, value: str, expire: int | None = None) -> None:
        """Set key-value pair in cache with optional expiration."""
        await self._cache.set(key, value, expire)

    async def delete(self, key: str) -> None:
        """Delete key from cache."""
        await self._cache.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        return await self._cache.exists(key)

    async def health_check(self) -> bool:
        """Check if cache service is healthy."""
        return await self._cache.health_check()

    async def keys(self, pattern: str = "*") -> List[str]:
        """Get all keys matching pattern."""
        return await self._cache.keys(pattern)

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern. Returns number of deleted keys."""
        return await self._cache.delete_pattern(pattern)

    async def clear(self) -> None:
        """Clear all cache entries."""
        await self._cache.clear()

    async def ttl(self, key: str) -> int | None:
        """Get time to live for a key in seconds."""
        return await self._cache.ttl(key)

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for a key."""
        return await self._cache.expire(key, seconds)

    def get_cache_type(self) -> CacheType:
        """Get current cache type."""
        return self._cache_type

    def switch_cache(self, cache_type: CacheType) -> None:
        """Switch to a different cache strategy."""
        if cache_type != self._cache_type:
            self._cache = CacheFactory.create_cache(cache_type)
            self._cache_type = cache_type


def get_cache_type_from_settings() -> CacheType:
    """Determine cache type from environment settings."""
    cache_type_str = getattr(settings, 'CACHE_TYPE', 'redis').lower()
    try:
        return CacheType(cache_type_str)
    except ValueError:
        return CacheType.REDIS


# Global cache manager instance
cache_manager = CacheManager(get_cache_type_from_settings())