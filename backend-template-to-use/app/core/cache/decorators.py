import asyncio
import functools
import logging
import time
from typing import Any, Callable, Optional, Union, Dict, List

from .config import (
    CacheableConfig, CacheEvictConfig, EvictionStrategy,
    config_manager, SerializationStrategy
)
from .key_generator import create_cache_key
from .serializers import serialize_for_cache, deserialize_from_cache
from .manager import cache_manager
from .stats import record_hit, record_miss, record_error, record_eviction


logger = logging.getLogger(__name__)


def cacheable(
    ttl: Optional[int] = None,
    key_prefix: Optional[str] = None,
    key_template: Optional[str] = None,
    condition: Optional[Union[str, Callable]] = None,
    unless: Optional[Union[str, Callable]] = None,
    compression: Optional[bool] = None,
    namespace: Optional[str] = None,
    include_class_name: Optional[bool] = None,
    async_refresh: bool = False,
    background_refresh: bool = False
):
    """
    Decorator to cache method results.

    Args:
        ttl: Time to live in seconds (None for no expiration)
        key_prefix: Prefix for cache key
        key_template: Custom key template (e.g., "user:{email}")
        condition: Condition for caching (string expression or callable)
        unless: Condition to skip caching (string expression or callable)
        compression: Enable compression for this cache entry
        namespace: Cache namespace
        include_class_name: Include class name in cache key
        async_refresh: Enable asynchronous cache refresh
        background_refresh: Enable background refresh before expiration

    Example:
        @cacheable(ttl=300, key_prefix="user")
        async def get_user_by_email(self, db: AsyncSession, email: str):
            # Method implementation
            pass

        @cacheable(
            ttl=600,
            key_template="user:profile:{user_id}",
            condition="user_id > 0"
        )
        async def get_user_profile(self, db: AsyncSession, user_id: int):
            # Method implementation
            pass
    """
    def decorator(func: Callable) -> Callable:
        # Generate method key for configuration lookup
        method_key = config_manager.generate_method_key(func)

        # Get effective configuration
        decorator_config = {
            'ttl': ttl,
            'key_prefix': key_prefix,
            'key_template': key_template,
            'condition': condition,
            'unless': unless,
            'compression': compression,
            'namespace': namespace,
            'include_class_name': include_class_name,
            'async_refresh': async_refresh,
            'background_refresh': background_refresh
        }

        effective_config = config_manager.get_effective_config(method_key, decorator_config)

        if asyncio.iscoroutinefunction(func):
            return _create_async_cacheable_wrapper(func, effective_config)
        else:
            return _create_sync_cacheable_wrapper(func, effective_config)

    return decorator


def _create_async_cacheable_wrapper(func: Callable, config: Dict[str, Any]) -> Callable:
    """Create async wrapper for cacheable decorator."""

    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        cache_key = None

        try:
            # Generate cache key
            cache_key = create_cache_key(
                func=func,
                args=args,
                kwargs=kwargs,
                key_prefix=config.get('key_prefix'),
                key_template=config.get('key_template'),
                include_class_name=config.get('include_class_name', True)
            )

            # Check conditions
            context = _build_context(func, args, kwargs, None)
            if not _should_cache(config, context):
                return await func(*args, **kwargs)

            # Try to get from cache
            try:
                cached_data = await cache_manager.get(cache_key)
                if cached_data is not None:
                    # Cache hit
                    result = deserialize_from_cache(cached_data)
                    response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                    await record_hit(func.__name__, cache_key, response_time)
                    return result
            except Exception as e:
                await record_error(func.__name__, cache_key or "unknown", str(e))
                if config.get('graceful_degradation', True):
                    logger.warning(f"Cache get failed for {cache_key}: {e}")
                else:
                    raise

            # Cache miss - execute function
            result = await func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds

            # Check unless condition with result
            context_with_result = _build_context(func, args, kwargs, result)
            if _should_skip_caching(config, context_with_result):
                await record_miss(func.__name__, cache_key, execution_time)
                return result

            # Store in cache
            try:
                serialized_result = serialize_for_cache(
                    result,
                    use_compression=config.get('compression', False)
                )
                await cache_manager.set(
                    cache_key,
                    serialized_result,
                    expire=config.get('ttl')
                )
                await record_miss(func.__name__, cache_key, execution_time)
            except Exception as e:
                await record_error(func.__name__, cache_key or "unknown", str(e))
                if config.get('graceful_degradation', True):
                    logger.warning(f"Cache set failed for {cache_key}: {e}")
                else:
                    raise

            return result

        except Exception as e:
            if cache_key:
                await record_error(func.__name__, cache_key, str(e))

            if config.get('graceful_degradation', True):
                logger.error(f"Cache operation failed for {func.__name__}: {e}")
                return await func(*args, **kwargs)
            else:
                raise

    return async_wrapper


def _create_sync_cacheable_wrapper(func: Callable, config: Dict[str, Any]) -> Callable:
    """Create sync wrapper for cacheable decorator."""

    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        try:
            # Generate cache key
            cache_key = create_cache_key(
                func=func,
                args=args,
                kwargs=kwargs,
                key_prefix=config.get('key_prefix'),
                key_template=config.get('key_template'),
                include_class_name=config.get('include_class_name', True)
            )

            # Check conditions
            context = _build_context(func, args, kwargs, None)
            if not _should_cache(config, context):
                return func(*args, **kwargs)

            # For sync functions, we need to use asyncio to call async cache methods
            # This is a simplified approach - in production you might want async/sync cache managers
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If we're already in an async context, we can't use run()
                    # This is a limitation - sync methods in async contexts need special handling
                    logger.warning(f"Sync cacheable method {func.__name__} called from async context")
                    return func(*args, **kwargs)
                else:
                    cached_data = loop.run_until_complete(cache_manager.get(cache_key))
            except RuntimeError:
                # No event loop
                cached_data = asyncio.run(cache_manager.get(cache_key))
            except Exception as e:
                if config.get('graceful_degradation', True):
                    logger.warning(f"Cache get failed for {cache_key}: {e}")
                    cached_data = None
                else:
                    raise

            if cached_data is not None:
                # Cache hit
                result = deserialize_from_cache(cached_data)
                _record_cache_hit(func.__name__, cache_key)
                return result

            # Cache miss - execute function
            result = func(*args, **kwargs)

            # Check unless condition with result
            context_with_result = _build_context(func, args, kwargs, result)
            if _should_skip_caching(config, context_with_result):
                return result

            # Store in cache
            try:
                serialized_result = serialize_for_cache(
                    result,
                    use_compression=config.get('compression', False)
                )

                try:
                    loop = asyncio.get_event_loop()
                    if not loop.is_running():
                        loop.run_until_complete(cache_manager.set(
                            cache_key, serialized_result, expire=config.get('ttl')
                        ))
                    else:
                        # Schedule for later execution
                        asyncio.create_task(cache_manager.set(
                            cache_key, serialized_result, expire=config.get('ttl')
                        ))
                except RuntimeError:
                    asyncio.run(cache_manager.set(
                        cache_key, serialized_result, expire=config.get('ttl')
                    ))

                _record_cache_miss(func.__name__, cache_key)
            except Exception as e:
                if config.get('graceful_degradation', True):
                    logger.warning(f"Cache set failed for {cache_key}: {e}")
                else:
                    raise

            return result

        except Exception as e:
            if config.get('graceful_degradation', True):
                logger.error(f"Cache operation failed for {func.__name__}: {e}")
                return func(*args, **kwargs)
            else:
                raise

    return sync_wrapper


def cacheevict(
    keys: Optional[Union[str, List[str]]] = None,
    pattern: Optional[str] = None,
    strategy: EvictionStrategy = EvictionStrategy.EXACT_KEY,
    condition: Optional[Union[str, Callable]] = None,
    before_invocation: bool = False,
    all_entries: bool = False,
    namespace: Optional[str] = None
):
    """
    Decorator to evict cache entries.

    Args:
        keys: Specific key(s) to evict
        pattern: Pattern for key eviction (e.g., "user:*")
        strategy: Eviction strategy
        condition: Condition for eviction
        before_invocation: Whether to evict before method execution
        all_entries: Whether to clear all cache entries
        namespace: Cache namespace

    Example:
        @cacheevict(pattern="user:*")
        async def update_user(self, db: AsyncSession, user_id: int, data: dict):
            # Method implementation
            pass

        @cacheevict(keys=["user:profile:{user_id}", "user:settings:{user_id}"])
        async def delete_user(self, db: AsyncSession, user_id: int):
            # Method implementation
            pass
    """
    def decorator(func: Callable) -> Callable:
        if asyncio.iscoroutinefunction(func):
            return _create_async_evict_wrapper(func, {
                'keys': keys,
                'pattern': pattern,
                'strategy': strategy,
                'condition': condition,
                'before_invocation': before_invocation,
                'all_entries': all_entries,
                'namespace': namespace
            })
        else:
            return _create_sync_evict_wrapper(func, {
                'keys': keys,
                'pattern': pattern,
                'strategy': strategy,
                'condition': condition,
                'before_invocation': before_invocation,
                'all_entries': all_entries,
                'namespace': namespace
            })

    return decorator


def _create_async_evict_wrapper(func: Callable, evict_config: Dict[str, Any]) -> Callable:
    """Create async wrapper for cacheevict decorator."""

    @functools.wraps(func)
    async def async_evict_wrapper(*args, **kwargs):
        try:
            # Build context for condition evaluation
            context = _build_context(func, args, kwargs, None)

            # Check condition before eviction (if before_invocation=True)
            if evict_config.get('before_invocation', False):
                if _should_evict(evict_config, context):
                    await _perform_eviction(evict_config, context)

            # Execute the function
            result = await func(*args, **kwargs)

            # Check condition after eviction (if before_invocation=False)
            if not evict_config.get('before_invocation', False):
                context_with_result = _build_context(func, args, kwargs, result)
                if _should_evict(evict_config, context_with_result):
                    await _perform_eviction(evict_config, context_with_result)

            return result

        except Exception as e:
            logger.error(f"Cache eviction failed for {func.__name__}: {e}")
            # Always execute the function even if eviction fails
            if evict_config.get('before_invocation', False):
                return await func(*args, **kwargs)
            raise

    return async_evict_wrapper


def _create_sync_evict_wrapper(func: Callable, evict_config: Dict[str, Any]) -> Callable:
    """Create sync wrapper for cacheevict decorator."""

    @functools.wraps(func)
    def sync_evict_wrapper(*args, **kwargs):
        try:
            # Build context for condition evaluation
            context = _build_context(func, args, kwargs, None)

            # Check condition before eviction (if before_invocation=True)
            if evict_config.get('before_invocation', False):
                if _should_evict(evict_config, context):
                    try:
                        loop = asyncio.get_event_loop()
                        if not loop.is_running():
                            loop.run_until_complete(_perform_eviction(evict_config, context))
                        else:
                            asyncio.create_task(_perform_eviction(evict_config, context))
                    except RuntimeError:
                        asyncio.run(_perform_eviction(evict_config, context))

            # Execute the function
            result = func(*args, **kwargs)

            # Check condition after eviction (if before_invocation=False)
            if not evict_config.get('before_invocation', False):
                context_with_result = _build_context(func, args, kwargs, result)
                if _should_evict(evict_config, context_with_result):
                    try:
                        loop = asyncio.get_event_loop()
                        if not loop.is_running():
                            loop.run_until_complete(_perform_eviction(evict_config, context_with_result))
                        else:
                            asyncio.create_task(_perform_eviction(evict_config, context_with_result))
                    except RuntimeError:
                        asyncio.run(_perform_eviction(evict_config, context_with_result))

            return result

        except Exception as e:
            logger.error(f"Cache eviction failed for {func.__name__}: {e}")
            # Always execute the function even if eviction fails
            if evict_config.get('before_invocation', False):
                return func(*args, **kwargs)
            raise

    return sync_evict_wrapper


# Helper functions

def _build_context(func: Callable, args: tuple, kwargs: dict, result: Any = None) -> Dict[str, Any]:
    """Build context for condition evaluation."""
    import inspect

    context = {}

    # Add function parameters
    try:
        sig = inspect.signature(func)
        bound_args = sig.bind(*args, **kwargs)
        bound_args.apply_defaults()
        context.update(bound_args.arguments)
    except Exception:
        # Fallback to simple kwargs
        context.update(kwargs)

    # Add result if available
    if result is not None:
        context['result'] = result

    return context


def _should_cache(config: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """Check if caching should be performed based on condition."""
    condition = config.get('condition')
    if condition is not None:
        return config_manager.evaluate_condition(condition, context)
    return True


def _should_skip_caching(config: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """Check if caching should be skipped based on unless condition."""
    unless = config.get('unless')
    if unless is not None:
        return config_manager.evaluate_condition(unless, context)
    return False


def _should_evict(evict_config: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """Check if eviction should be performed based on condition."""
    condition = evict_config.get('condition')
    if condition is not None:
        return config_manager.evaluate_condition(condition, context)
    return True


async def _perform_eviction(evict_config: Dict[str, Any], context: Dict[str, Any]) -> None:
    """Perform cache eviction based on configuration."""
    try:
        if evict_config.get('all_entries', False):
            # Clear all cache entries
            await cache_manager.clear()
            await record_eviction(None, 0)  # We don't know exact count
            return

        strategy = evict_config.get('strategy', EvictionStrategy.EXACT_KEY)
        total_evicted = 0

        if strategy == EvictionStrategy.EXACT_KEY:
            keys = evict_config.get('keys', [])
            if isinstance(keys, str):
                keys = [keys]

            for key_template in keys:
                try:
                    # Format key template with context variables
                    formatted_key = key_template.format(**context)
                    await cache_manager.delete(formatted_key)
                    total_evicted += 1
                except KeyError as e:
                    logger.warning(f"Template variable {e} not found for key {key_template}")
                except Exception as e:
                    logger.warning(f"Failed to evict key {key_template}: {e}")

        elif strategy == EvictionStrategy.PATTERN:
            pattern = evict_config.get('pattern')
            if pattern:
                try:
                    # Format pattern with context variables
                    formatted_pattern = pattern.format(**context)
                    total_evicted = await cache_manager.delete_pattern(formatted_pattern)
                except KeyError as e:
                    logger.warning(f"Template variable {e} not found for pattern {pattern}")
                except Exception as e:
                    logger.warning(f"Failed to evict pattern {pattern}: {e}")

        elif strategy == EvictionStrategy.CONDITIONAL:
            # For conditional eviction, we need to get keys and check conditions
            # This is a simplified implementation
            pattern = evict_config.get('pattern', '*')
            try:
                keys = await cache_manager.keys(pattern)
                for key in keys:
                    # In a more sophisticated implementation, you would check conditions here
                    await cache_manager.delete(key)
                    total_evicted += 1
            except Exception as e:
                logger.warning(f"Failed conditional eviction: {e}")

        else:
            logger.warning(f"Eviction strategy {strategy} not implemented")

        if total_evicted > 0:
            method_name = context.get('func_name') if 'func_name' in context else None
            await record_eviction(method_name, total_evicted)

    except Exception as e:
        logger.error(f"Cache eviction failed: {e}")


# Export the main statistics functions for convenience
from .stats import get_cache_stats, get_performance_summary