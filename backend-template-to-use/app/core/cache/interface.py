from abc import ABC, abstractmethod
from typing import Optional, Any, List


class CacheInterface(ABC):
    """Abstract base class for cache implementations."""

    @abstractmethod
    async def connect(self) -> None:
        """Initialize connection to cache."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to cache."""
        pass

    @abstractmethod
    async def get(self, key: str) -> Optional[str]:
        """Get value by key from cache."""
        pass

    @abstractmethod
    async def set(self, key: str, value: str, expire: Optional[int] = None) -> None:
        """Set key-value pair in cache with optional expiration."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete key from cache."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if cache service is healthy."""
        pass

    @abstractmethod
    async def keys(self, pattern: str = "*") -> List[str]:
        """Get all keys matching pattern."""
        pass

    @abstractmethod
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern. Returns number of deleted keys."""
        pass

    @abstractmethod
    async def clear(self) -> None:
        """Clear all cache entries."""
        pass

    @abstractmethod
    async def ttl(self, key: str) -> Optional[int]:
        """Get time to live for a key in seconds."""
        pass

    @abstractmethod
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for a key."""
        pass