import redis.asyncio as redis
from typing import Optional, List
from app.core.cache.interface import CacheInterface
from app.config.settings import settings


class RedisCacheStrategy(CacheInterface):
    """Redis implementation of cache interface."""

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Initialize Redis connection."""
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()

    async def get(self, key: str) -> Optional[str]:
        """Get value by key from Redis."""
        if self.redis_client:
            return await self.redis_client.get(key)
        return None

    async def set(self, key: str, value: str, expire: Optional[int] = None) -> None:
        """Set key-value pair in Redis with optional expiration."""
        if self.redis_client:
            await self.redis_client.set(key, value, ex=expire)

    async def delete(self, key: str) -> None:
        """Delete key from Redis."""
        if self.redis_client:
            await self.redis_client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        if self.redis_client:
            return bool(await self.redis_client.exists(key))
        return False

    async def health_check(self) -> bool:
        """Check if Redis service is healthy."""
        try:
            if not self.redis_client:
                return False
            await self.redis_client.ping()
            return True
        except Exception:
            return False

    async def keys(self, pattern: str = "*") -> List[str]:
        """Get all keys matching pattern."""
        if self.redis_client:
            return await self.redis_client.keys(pattern)
        return []

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern. Returns number of deleted keys."""
        if not self.redis_client:
            return 0

        keys = await self.redis_client.keys(pattern)
        if keys:
            return await self.redis_client.delete(*keys)
        return 0

    async def clear(self) -> None:
        """Clear all cache entries."""
        if self.redis_client:
            await self.redis_client.flushdb()

    async def ttl(self, key: str) -> Optional[int]:
        """Get time to live for a key in seconds."""
        if self.redis_client:
            ttl_value = await self.redis_client.ttl(key)
            return ttl_value if ttl_value >= 0 else None
        return None

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for a key."""
        if self.redis_client:
            return bool(await self.redis_client.expire(key, seconds))
        return False