# Cache Decorators Documentation

## Overview

The Cache Decorators system provides Spring Framework-like caching annotations for Python, allowing you to add intelligent caching to your methods with simple `@cacheable` and `@cacheevict` decorators. The system is built on top of the existing cache strategy pattern and supports Redis and in-memory caching.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Decorators](#core-decorators)
3. [Configuration](#configuration)
4. [Key Generation](#key-generation)
5. [Serialization](#serialization)
6. [Statistics & Monitoring](#statistics--monitoring)
7. [Debugging & Utilities](#debugging--utilities)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)

## Quick Start

### Basic Usage

```python
from app.core.cache import cacheable, cacheevict, EvictionStrategy

class UserService:
    @cacheable(ttl=600, key_prefix="user")
    async def get_user_by_email(self, db: AsyncSession, email: str):
        # Method automatically cached for 10 minutes
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @cacheevict(pattern="user:*", strategy=EvictionStrategy.PATTERN)
    async def create_user(self, db: AsyncSession, user_data: UserCreate):
        # Evicts all user-related cache entries after creation
        user = User(**user_data.dict())
        db.add(user)
        await db.commit()
        return user
```

### Configuration

```python
from app.core.cache import configure_cache

# Global configuration
configure_cache(
    default_ttl=300,
    compression_enabled=True,
    enable_stats=True
)

# Environment variable configuration
export CACHE_TYPE=redis  # or memory
```

## Core Decorators

### @cacheable

The `@cacheable` decorator automatically caches method results based on method name and parameters.

#### Basic Syntax

```python
@cacheable(
    ttl=300,                    # Time to live in seconds
    key_prefix="user",          # Prefix for cache keys
    key_template="user:{id}",   # Custom key template
    condition="id > 0",         # Cache condition
    unless="result is None",    # Skip caching condition
    compression=True,           # Enable compression
    namespace="app"             # Cache namespace
)
async def get_user(self, id: int):
    pass
```

#### Parameters

- **ttl** (int, optional): Time to live in seconds. Defaults to global setting.
- **key_prefix** (str, optional): Prefix added to generated cache keys.
- **key_template** (str, optional): Custom template for cache key generation.
- **condition** (str/callable, optional): Condition that must be true to cache.
- **unless** (str/callable, optional): Condition that prevents caching.
- **compression** (bool, optional): Enable compression for large objects.
- **namespace** (str, optional): Cache namespace for key separation.

#### Examples

```python
# Simple caching with TTL
@cacheable(ttl=600)
async def get_user(self, user_id: int):
    return await self.db.get(User, user_id)

# Custom key template
@cacheable(
    ttl=300,
    key_template="user:profile:{user_id}:{include_private}"
)
async def get_user_profile(self, user_id: int, include_private: bool = False):
    # Cache key: "cache:user:profile:123:False"
    pass

# Conditional caching
@cacheable(
    ttl=120,
    condition="len(query) > 3",     # Only cache if query is long enough
    unless="len(result) == 0"       # Don't cache empty results
)
async def search_users(self, query: str):
    pass

# Compression for large objects
@cacheable(ttl=3600, compression=True)
async def get_user_activity_log(self, user_id: int):
    # Large result sets will be compressed
    pass
```

### @cacheevict

The `@cacheevict` decorator removes cache entries when methods are called.

#### Basic Syntax

```python
@cacheevict(
    keys=["user:{id}"],              # Specific keys to evict
    pattern="user:*",                # Pattern for eviction
    strategy=EvictionStrategy.PATTERN, # Eviction strategy
    condition="result.success",      # Eviction condition
    before_invocation=False,         # When to evict
    all_entries=False               # Clear all cache
)
async def update_user(self, id: int, data: dict):
    pass
```

#### Eviction Strategies

- **EXACT_KEY**: Remove specific cache keys
- **PATTERN**: Remove keys matching a pattern
- **CONDITIONAL**: Remove keys based on conditions
- **ALL_KEYS**: Clear entire cache

#### Examples

```python
# Evict specific user cache
@cacheevict(
    keys=["user:profile:{user_id}"],
    strategy=EvictionStrategy.EXACT_KEY
)
async def update_user_profile(self, user_id: int, profile_data: dict):
    pass

# Pattern-based eviction
@cacheevict(
    pattern="user:{user_id}:*",
    strategy=EvictionStrategy.PATTERN
)
async def update_user(self, user_id: int, user_data: dict):
    # Evicts all cache entries for this user
    pass

# Conditional eviction
@cacheevict(
    pattern="users:*",
    strategy=EvictionStrategy.PATTERN,
    condition="result.modified_count > 0"
)
async def bulk_update_users(self, filter_criteria: dict, updates: dict):
    # Only evict if users were actually modified
    pass

# Evict before method execution
@cacheevict(
    keys=["user:{user_id}"],
    before_invocation=True
)
async def delete_user(self, user_id: int):
    # Cache is evicted before deletion (safer for consistency)
    pass

# Clear all cache entries
@cacheevict(all_entries=True)
async def reset_system(self):
    # Completely clear cache
    pass
```

## Configuration

### Global Configuration

```python
from app.core.cache import configure_cache

configure_cache(
    default_ttl=300,              # Default TTL in seconds
    compression_enabled=False,    # Enable compression globally
    enable_stats=True,           # Enable statistics collection
    graceful_degradation=True,   # Continue on cache errors
    namespace="myapp"            # Global cache namespace
)
```

### Method-Specific Configuration

```python
from app.core.cache import configure_method

configure_method(
    "UserService.get_user_by_email",
    ttl=1800,
    compression=True,
    key_prefix="user_email"
)
```

### Environment Configuration

```bash
# Cache backend selection
export CACHE_TYPE=redis          # redis or memory

# Redis configuration (if using Redis)
export REDIS_URL=redis://localhost:6379/0

# Cache-specific settings
export CACHE_DEFAULT_TTL=300
export CACHE_COMPRESSION_ENABLED=true
export CACHE_STATS_ENABLED=true
```

## Key Generation

### Automatic Key Generation

Cache keys are automatically generated from:
- Method name (including class name)
- Method parameters (excluding database sessions)
- Optional key prefix
- Global namespace

Example generated key: `myapp:user:UserService:get_user_by_email:abc123`

### Custom Key Templates

Use `key_template` for precise control over cache keys:

```python
@cacheable(key_template="user:email:{email}")
async def get_user_by_email(self, email: str):
    pass
# Results in key: "myapp:user:email:john@example.com"

@cacheable(key_template="products:cat:{category}:page:{page}")
async def get_products_page(self, category: str, page: int, limit: int):
    pass
# Results in key: "myapp:products:cat:electronics:page:1"
```

### Key Generation Rules

1. **Database sessions** are automatically excluded from keys
2. **None values** are excluded from key generation
3. **Complex objects** are serialized consistently
4. **Parameter order** doesn't affect key generation (uses names)

## Serialization

### Automatic Serialization

The system automatically handles serialization for:
- Primitive types (str, int, float, bool)
- Pydantic models
- SQLAlchemy models (basic support)
- Lists, dictionaries, and sets
- DateTime objects
- Custom objects with `__dict__`

### Compression

Enable compression for large objects:

```python
@cacheable(ttl=3600, compression=True)
async def get_large_dataset(self):
    # Large results are automatically compressed
    return big_list_of_data
```

### Custom Serialization

For complex serialization needs, implement custom serializers:

```python
from app.core.cache.serializers import CacheSerializer

class CustomSerializer(CacheSerializer):
    def _make_serializable(self, obj):
        if isinstance(obj, MyCustomType):
            return {"_type": "MyCustomType", "data": obj.to_dict()}
        return super()._make_serializable(obj)
```

## Statistics & Monitoring

### Basic Statistics

```python
from app.core.cache import get_cache_stats, get_performance_summary

# Get comprehensive statistics
stats = await get_cache_stats()

# Get performance summary
performance = await get_performance_summary()
print(f"Hit rate: {performance['global_hit_rate']:.1f}%")
```

### Method-Level Statistics

```python
from app.core.cache import stats_collector

# Get stats for specific method
method_stats = await stats_collector.get_method_stats("UserService.get_user")
print(f"Hit rate: {method_stats.hit_rate:.1f}%")
print(f"Average response time: {method_stats.average_response_time:.2f}ms")
```

### Health Monitoring

```python
from app.core.cache import get_cache_health_report

health = await get_cache_health_report()
print(f"Cache status: {health['health_status']}")
print(f"Total keys: {health['size_info']['total_keys']}")
```

## Debugging & Utilities

### Cache Inspection

```python
from app.core.cache import CacheInspector

# Inspect specific key
key_info = await CacheInspector.inspect_key("user:email:john@example.com")
print(f"Value: {key_info['value']}")
print(f"TTL: {key_info['ttl']} seconds")

# List keys by pattern
keys = await CacheInspector.list_keys_by_pattern("user:*", limit=50)
```

### Key Generation Debugging

```python
from app.core.cache import CacheKeyDebugger

# Debug key generation
debug_info = CacheKeyDebugger.debug_key_generation(
    method_func, args, kwargs
)
print(f"Generated key: {debug_info['generated_key']}")
print(f"Cacheable params: {debug_info['cacheable_parameters']}")
```

### Method Cache Debugging

```python
from app.core.cache import debug_method_cache

# Debug specific method call
debug_info = await debug_method_cache(
    UserService.get_user_by_email,
    user_service_instance,
    email="john@example.com"
)
```

## Best Practices

### 1. TTL Selection

```python
# Short TTL for frequently changing data
@cacheable(ttl=60)  # 1 minute
async def get_live_stock_price(self, symbol: str):
    pass

# Medium TTL for semi-static data
@cacheable(ttl=3600)  # 1 hour
async def get_user_profile(self, user_id: int):
    pass

# Long TTL for static data
@cacheable(ttl=86400)  # 24 hours
async def get_country_list(self):
    pass
```

### 2. Conditional Caching

```python
# Don't cache empty or error results
@cacheable(
    ttl=300,
    unless="result is None or len(result) == 0"
)
async def search_products(self, query: str):
    pass

# Only cache for valid inputs
@cacheable(
    ttl=600,
    condition="user_id > 0 and email is not None"
)
async def get_user_by_email(self, user_id: int, email: str):
    pass
```

### 3. Strategic Cache Eviction

```python
# Evict related caches on updates
@cacheevict(
    pattern="user:{user_id}:*",
    strategy=EvictionStrategy.PATTERN
)
async def update_user(self, user_id: int, data: dict):
    pass

# Evict before critical operations
@cacheevict(
    keys=["user:{user_id}"],
    before_invocation=True
)
async def delete_user(self, user_id: int):
    pass
```

### 4. Performance Optimization

```python
# Use compression for large objects
@cacheable(ttl=3600, compression=True)
async def get_user_activity_history(self, user_id: int):
    pass

# Custom key templates for better cache distribution
@cacheable(
    ttl=300,
    key_template="search:{category}:{hash(query)}"
)
async def search_products(self, category: str, query: str):
    pass
```

### 5. Error Handling

```python
# Always enable graceful degradation in production
configure_cache(graceful_degradation=True)

# Handle cache-specific errors
@cacheable(ttl=300)
async def get_user(self, user_id: int):
    try:
        # Your business logic
        return await self.fetch_user(user_id)
    except DatabaseError:
        # Don't cache database errors
        raise
```

## API Reference

### Management Endpoints

The cache system provides REST API endpoints for management:

```bash
# Get cache statistics
GET /api/v1/cache/stats

# Get performance summary
GET /api/v1/cache/performance

# List cache keys
GET /api/v1/cache/keys?pattern=user:*&limit=100

# Inspect specific key
GET /api/v1/cache/keys/user:email:john@example.com

# Delete specific key
DELETE /api/v1/cache/keys/user:email:john@example.com

# Delete by pattern
DELETE /api/v1/cache/pattern/user:*

# Clear all cache
DELETE /api/v1/cache/clear

# Configure cache settings
POST /api/v1/cache/configure
{
    "default_ttl": 600,
    "compression_enabled": true
}
```

### Programmatic API

```python
from app.core.cache import (
    cache_manager,
    get_cache_stats,
    get_performance_summary,
    CacheInspector,
    configure_cache
)

# Direct cache operations
await cache_manager.set("key", "value", expire=300)
value = await cache_manager.get("key")
await cache_manager.delete("key")

# Bulk operations
keys = await cache_manager.keys("pattern:*")
deleted_count = await cache_manager.delete_pattern("pattern:*")
await cache_manager.clear()

# Statistics
stats = await get_cache_stats()
performance = await get_performance_summary()

# Configuration
configure_cache(default_ttl=600, compression_enabled=True)
```

## Migration Guide

### From Manual Caching

Before:
```python
async def get_user(self, user_id: int):
    cache_key = f"user:{user_id}"
    cached = await cache_manager.get(cache_key)
    if cached:
        return json.loads(cached)

    user = await self.db.get(User, user_id)
    await cache_manager.set(cache_key, json.dumps(user), expire=300)
    return user
```

After:
```python
@cacheable(ttl=300, key_template="user:{user_id}")
async def get_user(self, user_id: int):
    return await self.db.get(User, user_id)
```

### From Redis Client

Before:
```python
from app.core.redis import redis_client

async def update_user(self, user_id: int, data: dict):
    user = await self.db.update(User, user_id, data)
    await redis_client.delete(f"user:{user_id}")
    return user
```

After:
```python
@cacheevict(keys=["user:{user_id}"])
async def update_user(self, user_id: int, data: dict):
    return await self.db.update(User, user_id, data)
```

## Troubleshooting

### Common Issues

1. **Cache misses due to parameter changes**
   - Check key generation with `CacheKeyDebugger`
   - Ensure consistent parameter types and names

2. **Memory usage concerns**
   - Enable compression for large objects
   - Set appropriate TTL values
   - Monitor cache size with `/api/v1/cache/size`

3. **Performance issues**
   - Check cache hit rates with statistics
   - Optimize key patterns to avoid hotspots
   - Consider cache warming for critical data

4. **Serialization errors**
   - Check object types being cached
   - Implement custom serializers for complex types
   - Use `unless` condition to skip problematic objects

### Debug Commands

```python
# Check if caching is working
from app.core.cache import debug_method_cache
info = await debug_method_cache(service.method, instance, *args, **kwargs)

# Inspect cache key generation
from app.core.cache import CacheKeyDebugger
debug = CacheKeyDebugger.debug_key_generation(func, args, kwargs)

# Monitor cache operations
from app.core.cache import stats_collector
recent_ops = await stats_collector.get_recent_operations(limit=50)
```

This comprehensive caching system provides powerful, flexible caching capabilities while maintaining simplicity and ease of use. The decorators integrate seamlessly with your existing code and provide extensive monitoring and debugging capabilities.