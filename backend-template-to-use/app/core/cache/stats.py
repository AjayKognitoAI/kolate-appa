import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import asyncio
import logging


logger = logging.getLogger(__name__)


@dataclass
class CacheMethodStats:
    """Statistics for a specific cached method."""
    method_name: str
    hits: int = 0
    misses: int = 0
    errors: int = 0
    total_response_time: float = 0.0
    last_hit: Optional[datetime] = None
    last_miss: Optional[datetime] = None
    last_error: Optional[datetime] = None
    cache_keys: set = field(default_factory=set)

    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate as percentage."""
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0

    @property
    def total_requests(self) -> int:
        """Total number of cache requests."""
        return self.hits + self.misses

    @property
    def average_response_time(self) -> float:
        """Average response time in milliseconds."""
        total = self.hits + self.misses
        return (self.total_response_time / total) if total > 0 else 0.0


@dataclass
class CacheGlobalStats:
    """Global cache statistics."""
    total_hits: int = 0
    total_misses: int = 0
    total_errors: int = 0
    total_evictions: int = 0
    cache_size: int = 0
    memory_usage: int = 0  # bytes
    start_time: datetime = field(default_factory=datetime.utcnow)

    @property
    def global_hit_rate(self) -> float:
        """Calculate global cache hit rate as percentage."""
        total = self.total_hits + self.total_misses
        return (self.total_hits / total * 100) if total > 0 else 0.0

    @property
    def uptime(self) -> timedelta:
        """Cache system uptime."""
        return datetime.utcnow() - self.start_time


class CacheStatsCollector:
    """Collects and manages cache statistics."""

    def __init__(self, max_recent_operations: int = 1000):
        self.method_stats: Dict[str, CacheMethodStats] = {}
        self.global_stats = CacheGlobalStats()
        self.max_recent_operations = max_recent_operations

        # Store recent operations for analysis
        self.recent_operations: deque = deque(maxlen=max_recent_operations)

        # Performance metrics
        self.response_times: defaultdict = defaultdict(list)

        # Enable/disable statistics collection
        self.enabled = True

        # Lock for thread safety
        self._lock = asyncio.Lock()

    async def record_cache_hit(self, method_name: str, cache_key: str, response_time: float = 0.0) -> None:
        """Record a cache hit."""
        if not self.enabled:
            return

        async with self._lock:
            # Update method stats
            if method_name not in self.method_stats:
                self.method_stats[method_name] = CacheMethodStats(method_name=method_name)

            method_stat = self.method_stats[method_name]
            method_stat.hits += 1
            method_stat.total_response_time += response_time
            method_stat.last_hit = datetime.utcnow()
            method_stat.cache_keys.add(cache_key)

            # Update global stats
            self.global_stats.total_hits += 1

            # Record recent operation
            self.recent_operations.append({
                'type': 'hit',
                'method': method_name,
                'key': cache_key,
                'timestamp': datetime.utcnow(),
                'response_time': response_time
            })

            # Record response time
            self.response_times[method_name].append(response_time)
            if len(self.response_times[method_name]) > 100:  # Keep last 100 response times
                self.response_times[method_name].pop(0)

    async def record_cache_miss(self, method_name: str, cache_key: str, response_time: float = 0.0) -> None:
        """Record a cache miss."""
        if not self.enabled:
            return

        async with self._lock:
            # Update method stats
            if method_name not in self.method_stats:
                self.method_stats[method_name] = CacheMethodStats(method_name=method_name)

            method_stat = self.method_stats[method_name]
            method_stat.misses += 1
            method_stat.total_response_time += response_time
            method_stat.last_miss = datetime.utcnow()
            method_stat.cache_keys.add(cache_key)

            # Update global stats
            self.global_stats.total_misses += 1

            # Record recent operation
            self.recent_operations.append({
                'type': 'miss',
                'method': method_name,
                'key': cache_key,
                'timestamp': datetime.utcnow(),
                'response_time': response_time
            })

            # Record response time
            self.response_times[method_name].append(response_time)
            if len(self.response_times[method_name]) > 100:  # Keep last 100 response times
                self.response_times[method_name].pop(0)

    async def record_cache_error(self, method_name: str, cache_key: str, error: str) -> None:
        """Record a cache error."""
        if not self.enabled:
            return

        async with self._lock:
            # Update method stats
            if method_name not in self.method_stats:
                self.method_stats[method_name] = CacheMethodStats(method_name=method_name)

            method_stat = self.method_stats[method_name]
            method_stat.errors += 1
            method_stat.last_error = datetime.utcnow()

            # Update global stats
            self.global_stats.total_errors += 1

            # Record recent operation
            self.recent_operations.append({
                'type': 'error',
                'method': method_name,
                'key': cache_key,
                'timestamp': datetime.utcnow(),
                'error': error
            })

    async def record_cache_eviction(self, method_name: Optional[str], keys_count: int) -> None:
        """Record cache eviction."""
        if not self.enabled:
            return

        async with self._lock:
            self.global_stats.total_evictions += keys_count

            # Record recent operation
            self.recent_operations.append({
                'type': 'eviction',
                'method': method_name,
                'keys_count': keys_count,
                'timestamp': datetime.utcnow()
            })

    async def get_method_stats(self, method_name: str) -> Optional[CacheMethodStats]:
        """Get statistics for a specific method."""
        async with self._lock:
            return self.method_stats.get(method_name)

    async def get_all_method_stats(self) -> Dict[str, CacheMethodStats]:
        """Get statistics for all methods."""
        async with self._lock:
            return self.method_stats.copy()

    async def get_global_stats(self) -> CacheGlobalStats:
        """Get global cache statistics."""
        async with self._lock:
            return self.global_stats

    async def get_recent_operations(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent cache operations."""
        async with self._lock:
            operations = list(self.recent_operations)
            return operations[-limit:] if len(operations) > limit else operations

    async def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary."""
        async with self._lock:
            summary = {
                'global_hit_rate': self.global_stats.global_hit_rate,
                'total_requests': self.global_stats.total_hits + self.global_stats.total_misses,
                'total_errors': self.global_stats.total_errors,
                'uptime_seconds': self.global_stats.uptime.total_seconds(),
                'methods': {}
            }

            for method_name, stats in self.method_stats.items():
                method_response_times = self.response_times.get(method_name, [])

                summary['methods'][method_name] = {
                    'hit_rate': stats.hit_rate,
                    'total_requests': stats.total_requests,
                    'errors': stats.errors,
                    'avg_response_time': stats.average_response_time,
                    'min_response_time': min(method_response_times) if method_response_times else 0,
                    'max_response_time': max(method_response_times) if method_response_times else 0,
                    'unique_keys': len(stats.cache_keys)
                }

            return summary

    async def clear_stats(self) -> None:
        """Clear all statistics."""
        async with self._lock:
            self.method_stats.clear()
            self.global_stats = CacheGlobalStats()
            self.recent_operations.clear()
            self.response_times.clear()

    async def export_stats(self) -> Dict[str, Any]:
        """Export all statistics for external analysis."""
        async with self._lock:
            return {
                'global_stats': {
                    'total_hits': self.global_stats.total_hits,
                    'total_misses': self.global_stats.total_misses,
                    'total_errors': self.global_stats.total_errors,
                    'total_evictions': self.global_stats.total_evictions,
                    'global_hit_rate': self.global_stats.global_hit_rate,
                    'uptime_seconds': self.global_stats.uptime.total_seconds(),
                    'start_time': self.global_stats.start_time.isoformat()
                },
                'method_stats': {
                    name: {
                        'hits': stats.hits,
                        'misses': stats.misses,
                        'errors': stats.errors,
                        'hit_rate': stats.hit_rate,
                        'total_requests': stats.total_requests,
                        'average_response_time': stats.average_response_time,
                        'unique_keys_count': len(stats.cache_keys),
                        'last_hit': stats.last_hit.isoformat() if stats.last_hit else None,
                        'last_miss': stats.last_miss.isoformat() if stats.last_miss else None,
                        'last_error': stats.last_error.isoformat() if stats.last_error else None
                    }
                    for name, stats in self.method_stats.items()
                },
                'recent_operations': list(self.recent_operations)
            }

    def enable_stats(self) -> None:
        """Enable statistics collection."""
        self.enabled = True

    def disable_stats(self) -> None:
        """Disable statistics collection."""
        self.enabled = False


# Global statistics collector instance
stats_collector = CacheStatsCollector()


# Convenience functions
async def record_hit(method_name: str, cache_key: str, response_time: float = 0.0) -> None:
    """Record a cache hit."""
    await stats_collector.record_cache_hit(method_name, cache_key, response_time)


async def record_miss(method_name: str, cache_key: str, response_time: float = 0.0) -> None:
    """Record a cache miss."""
    await stats_collector.record_cache_miss(method_name, cache_key, response_time)


async def record_error(method_name: str, cache_key: str, error: str) -> None:
    """Record a cache error."""
    await stats_collector.record_cache_error(method_name, cache_key, error)


async def record_eviction(method_name: Optional[str], keys_count: int) -> None:
    """Record cache eviction."""
    await stats_collector.record_cache_eviction(method_name, keys_count)


async def get_cache_stats() -> Dict[str, Any]:
    """Get comprehensive cache statistics."""
    return await stats_collector.export_stats()


async def get_performance_summary() -> Dict[str, Any]:
    """Get cache performance summary."""
    return await stats_collector.get_performance_summary()