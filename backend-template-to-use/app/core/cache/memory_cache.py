import asyncio
import fnmatch
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from time import time
from app.core.cache.interface import CacheInterface


@dataclass
class CacheItem:
    """Cache item with expiration support."""
    value: str
    expires_at: Optional[float] = None

    def is_expired(self) -> bool:
        """Check if cache item has expired."""
        if self.expires_at is None:
            return False
        return time() > self.expires_at


class InMemoryCacheStrategy(CacheInterface):
    """In-memory implementation of cache interface."""

    def __init__(self):
        self._cache: Dict[str, CacheItem] = {}
        self._lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None

    async def connect(self) -> None:
        """Initialize in-memory cache."""
        self._cleanup_task = asyncio.create_task(self._cleanup_expired())

    async def disconnect(self) -> None:
        """Clean up in-memory cache."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        async with self._lock:
            self._cache.clear()

    async def get(self, key: str) -> Optional[str]:
        """Get value by key from memory cache."""
        async with self._lock:
            item = self._cache.get(key)
            if item is None:
                return None
            if item.is_expired():
                del self._cache[key]
                return None
            return item.value

    async def set(self, key: str, value: str, expire: Optional[int] = None) -> None:
        """Set key-value pair in memory cache with optional expiration."""
        expires_at = None
        if expire is not None:
            expires_at = time() + expire

        async with self._lock:
            self._cache[key] = CacheItem(value=value, expires_at=expires_at)

    async def delete(self, key: str) -> None:
        """Delete key from memory cache."""
        async with self._lock:
            self._cache.pop(key, None)

    async def exists(self, key: str) -> bool:
        """Check if key exists in memory cache."""
        async with self._lock:
            item = self._cache.get(key)
            if item is None:
                return False
            if item.is_expired():
                del self._cache[key]
                return False
            return True

    async def health_check(self) -> bool:
        """Check if memory cache is healthy."""
        return True

    async def keys(self, pattern: str = "*") -> List[str]:
        """Get all keys matching pattern."""
        async with self._lock:
            # Clean up expired keys first
            current_time = time()
            expired_keys = [
                key for key, item in self._cache.items()
                if item.expires_at is not None and current_time > item.expires_at
            ]
            for key in expired_keys:
                del self._cache[key]

            # Return matching keys
            if pattern == "*":
                return list(self._cache.keys())
            else:
                return [key for key in self._cache.keys() if fnmatch.fnmatch(key, pattern)]

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern. Returns number of deleted keys."""
        async with self._lock:
            keys_to_delete = []

            if pattern == "*":
                keys_to_delete = list(self._cache.keys())
            else:
                keys_to_delete = [key for key in self._cache.keys() if fnmatch.fnmatch(key, pattern)]

            for key in keys_to_delete:
                del self._cache[key]

            return len(keys_to_delete)

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            self._cache.clear()

    async def ttl(self, key: str) -> Optional[int]:
        """Get time to live for a key in seconds."""
        async with self._lock:
            item = self._cache.get(key)
            if item is None:
                return None
            if item.expires_at is None:
                return -1  # No expiration
            if item.is_expired():
                del self._cache[key]
                return None
            return int(item.expires_at - time())

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for a key."""
        async with self._lock:
            item = self._cache.get(key)
            if item is None:
                return False

            item.expires_at = time() + seconds
            return True

    async def _cleanup_expired(self) -> None:
        """Background task to clean up expired cache entries."""
        while True:
            try:
                await asyncio.sleep(60)  # Run cleanup every minute
                current_time = time()
                async with self._lock:
                    expired_keys = [
                        key for key, item in self._cache.items()
                        if item.expires_at is not None and current_time > item.expires_at
                    ]
                    for key in expired_keys:
                        del self._cache[key]
            except asyncio.CancelledError:
                break
            except Exception:
                # Log error in production, but continue cleanup
                continue