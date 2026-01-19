import json
import asyncio
from typing import Any, Dict, List, Optional, Callable, Tuple
from datetime import datetime

from .manager import cache_manager
from .key_generator import create_cache_key
from .serializers import deserialize_from_cache, serialize_for_cache
from .stats import stats_collector
from .config import config_manager


class CacheInspector:
    """Utility class for inspecting and debugging cache contents."""

    @staticmethod
    async def inspect_key(key: str) -> Dict[str, Any]:
        """
        Inspect a specific cache key and return detailed information.

        Args:
            key: Cache key to inspect

        Returns:
            Dictionary with key information
        """
        result = {
            'key': key,
            'exists': False,
            'ttl': None,
            'value': None,
            'value_size': 0,
            'value_type': None,
            'cached_at': None,
            'error': None
        }

        try:
            # Check if key exists
            result['exists'] = await cache_manager.exists(key)

            if result['exists']:
                # Get TTL
                result['ttl'] = await cache_manager.ttl(key)

                # Get value
                raw_value = await cache_manager.get(key)
                if raw_value:
                    result['value_size'] = len(raw_value.encode('utf-8'))

                    try:
                        # Try to deserialize
                        deserialized_value = deserialize_from_cache(raw_value)
                        result['value'] = deserialized_value
                        result['value_type'] = type(deserialized_value).__name__

                        # Try to extract cached_at from serialized data
                        if raw_value.startswith('COMPRESSED:'):
                            import base64
                            import gzip
                            encoded_data = raw_value[11:]
                            compressed_data = base64.b64decode(encoded_data.encode('utf-8'))
                            json_str = gzip.decompress(compressed_data).decode('utf-8')
                        else:
                            json_str = raw_value

                        cache_data = json.loads(json_str)
                        if 'serialized_at' in cache_data:
                            result['cached_at'] = cache_data['serialized_at']
                    except Exception as e:
                        result['value'] = f"<Could not deserialize: {str(e)}>"
                        result['value_type'] = "unknown"

        except Exception as e:
            result['error'] = str(e)

        return result

    @staticmethod
    async def list_keys_by_pattern(pattern: str = "*", limit: int = 100) -> List[Dict[str, Any]]:
        """
        List cache keys matching a pattern with basic information.

        Args:
            pattern: Pattern to match (e.g., "user:*")
            limit: Maximum number of keys to return

        Returns:
            List of key information dictionaries
        """
        try:
            keys = await cache_manager.keys(pattern)
            keys = keys[:limit]  # Limit results

            results = []
            for key in keys:
                key_info = await CacheInspector.inspect_key(key)
                # Simplify for listing (don't include full value)
                results.append({
                    'key': key_info['key'],
                    'exists': key_info['exists'],
                    'ttl': key_info['ttl'],
                    'value_size': key_info['value_size'],
                    'value_type': key_info['value_type'],
                    'cached_at': key_info['cached_at']
                })

            return results

        except Exception as e:
            return [{'error': str(e)}]

    @staticmethod
    async def get_cache_size_info() -> Dict[str, Any]:
        """Get information about cache size and usage."""
        try:
            all_keys = await cache_manager.keys("*")
            total_keys = len(all_keys)

            total_size = 0
            expired_keys = 0
            persistent_keys = 0

            for key in all_keys[:1000]:  # Sample first 1000 keys for performance
                try:
                    ttl = await cache_manager.ttl(key)
                    if ttl is None:
                        expired_keys += 1
                    elif ttl == -1:
                        persistent_keys += 1

                    value = await cache_manager.get(key)
                    if value:
                        total_size += len(value.encode('utf-8'))
                except Exception:
                    continue

            return {
                'total_keys': total_keys,
                'estimated_total_size_bytes': total_size,
                'estimated_total_size_mb': round(total_size / (1024 * 1024), 2),
                'expired_keys': expired_keys,
                'persistent_keys': persistent_keys,
                'cache_type': cache_manager.get_cache_type().value
            }

        except Exception as e:
            return {'error': str(e)}


class CacheKeyDebugger:
    """Utility for debugging cache key generation."""

    @staticmethod
    def debug_key_generation(
        func: Callable,
        args: tuple,
        kwargs: dict,
        key_prefix: Optional[str] = None,
        key_template: Optional[str] = None,
        include_class_name: bool = True
    ) -> Dict[str, Any]:
        """
        Debug cache key generation for a function call.

        Args:
            func: Function to debug
            args: Function arguments
            kwargs: Function keyword arguments
            key_prefix: Key prefix
            key_template: Key template
            include_class_name: Include class name in key

        Returns:
            Debug information about key generation
        """
        import inspect

        try:
            # Generate the actual key
            cache_key = create_cache_key(
                func=func,
                args=args,
                kwargs=kwargs,
                key_prefix=key_prefix,
                key_template=key_template,
                include_class_name=include_class_name
            )

            # Get function signature
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()

            # Analyze parameters
            from .key_generator import key_generator
            filtered_params = key_generator._filter_cacheable_params(bound_args.arguments)

            return {
                'generated_key': cache_key,
                'function_name': func.__name__,
                'is_method': hasattr(func, '__self__'),
                'class_name': func.__self__.__class__.__name__ if hasattr(func, '__self__') else None,
                'all_parameters': dict(bound_args.arguments),
                'cacheable_parameters': filtered_params,
                'excluded_parameters': {
                    k: v for k, v in bound_args.arguments.items()
                    if k not in filtered_params
                },
                'key_prefix': key_prefix,
                'key_template': key_template,
                'include_class_name': include_class_name
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def test_key_collision(
        test_cases: List[Tuple[Callable, tuple, dict]]
    ) -> Dict[str, Any]:
        """
        Test for potential key collisions across multiple function calls.

        Args:
            test_cases: List of (function, args, kwargs) tuples

        Returns:
            Collision analysis results
        """
        keys = {}
        collisions = []

        for i, (func, args, kwargs) in enumerate(test_cases):
            try:
                cache_key = create_cache_key(func, args, kwargs)

                if cache_key in keys:
                    collisions.append({
                        'key': cache_key,
                        'first_case': keys[cache_key],
                        'second_case': i,
                        'first_function': keys[cache_key]['function'],
                        'second_function': func.__name__
                    })
                else:
                    keys[cache_key] = {
                        'case_index': i,
                        'function': func.__name__,
                        'args': args,
                        'kwargs': kwargs
                    }
            except Exception as e:
                collisions.append({
                    'case_index': i,
                    'error': str(e)
                })

        return {
            'total_test_cases': len(test_cases),
            'unique_keys': len(keys),
            'collisions': collisions,
            'collision_rate': len(collisions) / len(test_cases) if test_cases else 0
        }


class CacheManager:
    """High-level cache management utilities."""

    @staticmethod
    async def warm_cache(warmers: List[Callable]) -> Dict[str, Any]:
        """
        Warm cache by executing a list of functions.

        Args:
            warmers: List of async functions to execute for warming

        Returns:
            Results of cache warming
        """
        results = {
            'total_warmers': len(warmers),
            'successful': 0,
            'failed': 0,
            'errors': []
        }

        for i, warmer in enumerate(warmers):
            try:
                if asyncio.iscoroutinefunction(warmer):
                    await warmer()
                else:
                    warmer()
                results['successful'] += 1
            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'warmer_index': i,
                    'warmer_name': getattr(warmer, '__name__', 'unknown'),
                    'error': str(e)
                })

        return results

    @staticmethod
    async def cleanup_expired_keys() -> Dict[str, Any]:
        """
        Clean up expired keys manually.

        Returns:
            Cleanup results
        """
        try:
            # Get all keys
            all_keys = await cache_manager.keys("*")
            expired_keys = []

            for key in all_keys:
                try:
                    ttl = await cache_manager.ttl(key)
                    if ttl is None:  # Key doesn't exist or is expired
                        expired_keys.append(key)
                except Exception:
                    continue

            # Delete expired keys
            deleted_count = 0
            for key in expired_keys:
                try:
                    await cache_manager.delete(key)
                    deleted_count += 1
                except Exception:
                    continue

            return {
                'total_keys_checked': len(all_keys),
                'expired_keys_found': len(expired_keys),
                'keys_deleted': deleted_count
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    async def export_cache_dump(pattern: str = "*", include_values: bool = False) -> Dict[str, Any]:
        """
        Export cache contents for backup or analysis.

        Args:
            pattern: Pattern to match for export
            include_values: Whether to include actual values

        Returns:
            Cache dump data
        """
        try:
            keys = await cache_manager.keys(pattern)

            dump_data = {
                'export_timestamp': datetime.utcnow().isoformat(),
                'pattern': pattern,
                'total_keys': len(keys),
                'cache_type': cache_manager.get_cache_type().value,
                'keys': []
            }

            for key in keys:
                key_data = {'key': key}

                try:
                    key_data['ttl'] = await cache_manager.ttl(key)

                    if include_values:
                        value = await cache_manager.get(key)
                        key_data['value'] = value
                        key_data['value_size'] = len(value.encode('utf-8')) if value else 0

                except Exception as e:
                    key_data['error'] = str(e)

                dump_data['keys'].append(key_data)

            return dump_data

        except Exception as e:
            return {'error': str(e)}


# Convenience functions for common debugging tasks

async def debug_method_cache(
    method: Callable,
    instance: Any,
    *args,
    **kwargs
) -> Dict[str, Any]:
    """
    Debug cache behavior for a specific method call.

    Args:
        method: Method to debug
        instance: Instance to call method on
        *args: Method arguments
        **kwargs: Method keyword arguments

    Returns:
        Debug information
    """
    bound_method = method.__get__(instance, type(instance))

    # Generate cache key
    key_debug = CacheKeyDebugger.debug_key_generation(
        bound_method, args, kwargs
    )

    # Check if key exists in cache
    cache_key = key_debug.get('generated_key')
    cache_info = None
    if cache_key:
        cache_info = await CacheInspector.inspect_key(cache_key)

    return {
        'method_info': {
            'method_name': method.__name__,
            'class_name': type(instance).__name__,
            'arguments': {'args': args, 'kwargs': kwargs}
        },
        'key_debug': key_debug,
        'cache_info': cache_info
    }


async def get_cache_health_report() -> Dict[str, Any]:
    """
    Generate a comprehensive cache health report.

    Returns:
        Cache health report
    """
    # Get basic health
    is_healthy = await cache_manager.health_check()

    # Get size info
    size_info = await CacheInspector.get_cache_size_info()

    # Get statistics
    stats = await stats_collector.export_stats()

    # Get configuration
    global_config = config_manager.get_global_config()

    return {
        'timestamp': datetime.utcnow().isoformat(),
        'health_status': 'healthy' if is_healthy else 'unhealthy',
        'cache_type': cache_manager.get_cache_type().value,
        'size_info': size_info,
        'statistics': stats,
        'configuration': {
            'default_ttl': global_config.default_ttl,
            'compression_enabled': global_config.compression_enabled,
            'stats_enabled': global_config.enable_stats,
            'graceful_degradation': global_config.graceful_degradation
        }
    }


# Export main utility classes
__all__ = [
    'CacheInspector',
    'CacheKeyDebugger',
    'CacheManager',
    'debug_method_cache',
    'get_cache_health_report'
]