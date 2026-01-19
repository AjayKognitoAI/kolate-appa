from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.core.cache import (
    get_cache_stats, get_performance_summary, get_cache_health_report,
    CacheInspector, configure_cache, stats_collector
)
from app.schemas.common import MessageResponse

router = APIRouter()


@router.get("/stats")
async def get_cache_statistics():
    """Get comprehensive cache statistics."""
    try:
        stats = await get_cache_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")


@router.get("/performance")
async def get_cache_performance():
    """Get cache performance summary."""
    try:
        performance = await get_performance_summary()
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance data: {str(e)}")


@router.get("/health")
async def get_cache_health():
    """Get comprehensive cache health report."""
    try:
        health_report = await get_cache_health_report()
        return health_report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health report: {str(e)}")


@router.get("/keys")
async def list_cache_keys(
    pattern: str = Query(default="*", description="Pattern to match cache keys"),
    limit: int = Query(default=100, description="Maximum number of keys to return")
):
    """List cache keys matching a pattern."""
    try:
        keys = await CacheInspector.list_keys_by_pattern(pattern, limit)
        return {
            "pattern": pattern,
            "limit": limit,
            "keys": keys,
            "total_found": len(keys)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list keys: {str(e)}")


@router.get("/keys/{key}")
async def inspect_cache_key(key: str):
    """Inspect a specific cache key."""
    try:
        key_info = await CacheInspector.inspect_key(key)
        return key_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect key: {str(e)}")


@router.delete("/keys/{key}")
async def delete_cache_key(key: str):
    """Delete a specific cache key."""
    try:
        from app.core.cache import cache_manager
        await cache_manager.delete(key)
        return MessageResponse(message=f"Cache key '{key}' deleted successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete key: {str(e)}")


@router.delete("/pattern/{pattern}")
async def delete_cache_pattern(pattern: str):
    """Delete all cache keys matching a pattern."""
    try:
        from app.core.cache import cache_manager
        deleted_count = await cache_manager.delete_pattern(pattern)
        return {
            "message": f"Deleted {deleted_count} keys matching pattern '{pattern}'",
            "pattern": pattern,
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete pattern: {str(e)}")


@router.delete("/clear")
async def clear_all_cache():
    """Clear all cache entries."""
    try:
        from app.core.cache import cache_manager
        await cache_manager.clear()
        return MessageResponse(message="All cache entries cleared successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.get("/size")
async def get_cache_size():
    """Get cache size information."""
    try:
        size_info = await CacheInspector.get_cache_size_info()
        return size_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache size: {str(e)}")


@router.post("/configure")
async def configure_cache_settings(
    default_ttl: Optional[int] = None,
    compression_enabled: Optional[bool] = None,
    enable_stats: Optional[bool] = None
):
    """Configure global cache settings."""
    try:
        config_updates = {}
        if default_ttl is not None:
            config_updates['default_ttl'] = default_ttl
        if compression_enabled is not None:
            config_updates['compression_enabled'] = compression_enabled
        if enable_stats is not None:
            config_updates['enable_stats'] = enable_stats

        if config_updates:
            configure_cache(**config_updates)
            return {
                "message": "Cache configuration updated successfully",
                "updates": config_updates
            }
        else:
            return MessageResponse(message="No configuration changes provided")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure cache: {str(e)}")


@router.post("/stats/reset")
async def reset_cache_statistics():
    """Reset cache statistics."""
    try:
        await stats_collector.clear_stats()
        return MessageResponse(message="Cache statistics reset successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset stats: {str(e)}")


@router.post("/stats/enable")
async def enable_cache_statistics():
    """Enable cache statistics collection."""
    try:
        stats_collector.enable_stats()
        return MessageResponse(message="Cache statistics collection enabled")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enable stats: {str(e)}")


@router.post("/stats/disable")
async def disable_cache_statistics():
    """Disable cache statistics collection."""
    try:
        stats_collector.disable_stats()
        return MessageResponse(message="Cache statistics collection disabled")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disable stats: {str(e)}")


@router.get("/methods/{method_name}/stats")
async def get_method_cache_stats(method_name: str):
    """Get cache statistics for a specific method."""
    try:
        method_stats = await stats_collector.get_method_stats(method_name)
        if method_stats:
            return {
                "method_name": method_name,
                "hits": method_stats.hits,
                "misses": method_stats.misses,
                "errors": method_stats.errors,
                "hit_rate": method_stats.hit_rate,
                "total_requests": method_stats.total_requests,
                "average_response_time": method_stats.average_response_time,
                "last_hit": method_stats.last_hit.isoformat() if method_stats.last_hit else None,
                "last_miss": method_stats.last_miss.isoformat() if method_stats.last_miss else None,
                "last_error": method_stats.last_error.isoformat() if method_stats.last_error else None,
                "unique_cache_keys": len(method_stats.cache_keys)
            }
        else:
            raise HTTPException(status_code=404, detail=f"No statistics found for method '{method_name}'")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get method stats: {str(e)}")


@router.get("/export")
async def export_cache_data(
    pattern: str = Query(default="*", description="Pattern to match for export"),
    include_values: bool = Query(default=False, description="Include actual cache values")
):
    """Export cache data for backup or analysis."""
    try:
        from app.core.cache.utils import CacheManager
        cache_dump = await CacheManager.export_cache_dump(pattern, include_values)
        return cache_dump
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export cache data: {str(e)}")