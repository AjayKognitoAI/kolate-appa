"""
Cache Decorators Demo

This file demonstrates various usage patterns for the @cacheable and @cacheevict decorators.
"""

import asyncio
from typing import List, Optional
from dataclasses import dataclass
from app.core.cache import cacheable, cacheevict, EvictionStrategy, configure_cache


@dataclass
class Product:
    """Example product model for demonstration."""
    id: int
    name: str
    price: float
    category: str
    in_stock: bool = True


class ProductService:
    """Example service demonstrating cache decorators usage."""

    def __init__(self):
        # Simulate database
        self._products = {
            1: Product(1, "Laptop", 999.99, "Electronics"),
            2: Product(2, "Mouse", 29.99, "Electronics"),
            3: Product(3, "Book", 15.99, "Books"),
            4: Product(4, "Chair", 199.99, "Furniture"),
        }

    # Basic caching example
    @cacheable(ttl=300, key_prefix="product")
    async def get_product(self, product_id: int) -> Optional[Product]:
        """Get product by ID - cached for 5 minutes."""
        print(f"Fetching product {product_id} from database...")
        await asyncio.sleep(0.1)  # Simulate database delay
        return self._products.get(product_id)

    # Custom key template example
    @cacheable(
        ttl=600,
        key_template="products:category:{category}:limit:{limit}",
        unless="len(result) == 0"  # Don't cache empty results
    )
    async def get_products_by_category(self, category: str, limit: int = 10) -> List[Product]:
        """Get products by category - custom cache key template."""
        print(f"Fetching products for category '{category}' from database...")
        await asyncio.sleep(0.2)  # Simulate database delay
        products = [p for p in self._products.values() if p.category == category]
        return products[:limit]

    # Conditional caching example
    @cacheable(
        ttl=120,
        condition="price_max > 0",  # Only cache if price_max is positive
        unless="len(result) == 0"   # Don't cache empty results
    )
    async def search_products(self, query: str, price_max: float = 0) -> List[Product]:
        """Search products - conditional caching."""
        print(f"Searching products with query '{query}', max price {price_max}...")
        await asyncio.sleep(0.15)  # Simulate search delay

        results = []
        for product in self._products.values():
            if query.lower() in product.name.lower():
                if price_max <= 0 or product.price <= price_max:
                    results.append(product)
        return results

    # Cache eviction examples
    @cacheevict(
        keys=["product:{product_id}"],
        strategy=EvictionStrategy.EXACT_KEY,
        condition="result is not None"
    )
    async def update_product(self, product_id: int, **updates) -> Optional[Product]:
        """Update product - evicts specific product cache."""
        print(f"Updating product {product_id}...")
        if product_id in self._products:
            product = self._products[product_id]
            for key, value in updates.items():
                if hasattr(product, key):
                    setattr(product, key, value)
            return product
        return None

    # Pattern-based eviction
    @cacheevict(
        pattern="products:category:*",
        strategy=EvictionStrategy.PATTERN
    )
    async def create_product(self, product: Product) -> Product:
        """Create product - evicts all category-based caches."""
        print(f"Creating new product: {product.name}")
        self._products[product.id] = product
        return product

    # Multiple eviction strategies
    @cacheevict(
        keys=["product:{product_id}"],
        strategy=EvictionStrategy.EXACT_KEY,
        before_invocation=True  # Evict before deletion
    )
    async def delete_product(self, product_id: int) -> bool:
        """Delete product - evicts cache before deletion."""
        print(f"Deleting product {product_id}...")
        if product_id in self._products:
            del self._products[product_id]
            return True
        return False

    # Combined decorators example
    @cacheable(ttl=180, key_prefix="inventory")
    @cacheevict(
        pattern="products:category:*",
        strategy=EvictionStrategy.PATTERN,
        condition="not result"  # Only evict if operation failed
    )
    async def update_inventory(self, product_id: int, in_stock: bool) -> bool:
        """Update inventory - caches result and evicts category cache on failure."""
        print(f"Updating inventory for product {product_id}: in_stock={in_stock}")
        if product_id in self._products:
            self._products[product_id].in_stock = in_stock
            return True
        return False


class UserPreferenceService:
    """Example service showing different caching patterns."""

    def __init__(self):
        self._preferences = {}

    @cacheable(
        ttl=3600,  # Cache for 1 hour
        key_template="user:preferences:{user_id}",
        compression=True  # Enable compression for large preference objects
    )
    async def get_user_preferences(self, user_id: int) -> dict:
        """Get user preferences - cached with compression."""
        print(f"Fetching preferences for user {user_id}...")
        await asyncio.sleep(0.05)
        return self._preferences.get(user_id, {
            "theme": "light",
            "language": "en",
            "notifications": True,
            "privacy_settings": {
                "profile_visibility": "public",
                "show_email": False
            }
        })

    @cacheevict(
        keys=["user:preferences:{user_id}"],
        strategy=EvictionStrategy.EXACT_KEY
    )
    async def update_user_preferences(self, user_id: int, preferences: dict) -> dict:
        """Update user preferences - evicts user's preference cache."""
        print(f"Updating preferences for user {user_id}...")
        self._preferences[user_id] = preferences
        return preferences

    @cacheevict(
        pattern="user:preferences:*",
        strategy=EvictionStrategy.PATTERN
    )
    async def reset_all_preferences(self) -> None:
        """Reset all user preferences - evicts all preference caches."""
        print("Resetting all user preferences...")
        self._preferences.clear()


async def demo_basic_caching():
    """Demonstrate basic caching functionality."""
    print("\n=== Basic Caching Demo ===")

    service = ProductService()

    # First call - will fetch from "database"
    print("First call (cache miss):")
    product1 = await service.get_product(1)
    print(f"Result: {product1}")

    # Second call - will return from cache
    print("\nSecond call (cache hit):")
    product2 = await service.get_product(1)
    print(f"Result: {product2}")

    print(f"Same object reference: {product1 is product2}")


async def demo_custom_key_templates():
    """Demonstrate custom key templates."""
    print("\n=== Custom Key Templates Demo ===")

    service = ProductService()

    # Cache with custom key template
    print("Fetching electronics (first time):")
    electronics1 = await service.get_products_by_category("Electronics", limit=5)
    print(f"Found {len(electronics1)} electronics")

    print("\nFetching electronics (from cache):")
    electronics2 = await service.get_products_by_category("Electronics", limit=5)
    print(f"Found {len(electronics2)} electronics (cached)")


async def demo_conditional_caching():
    """Demonstrate conditional caching."""
    print("\n=== Conditional Caching Demo ===")

    service = ProductService()

    # This will be cached (price_max > 0)
    print("Search with price limit (will be cached):")
    results1 = await service.search_products("Laptop", price_max=1000)
    print(f"Found {len(results1)} results")

    # This won't be cached (price_max = 0)
    print("\nSearch without price limit (won't be cached):")
    results2 = await service.search_products("Laptop", price_max=0)
    print(f"Found {len(results2)} results")

    # This should come from cache
    print("\nSearch with price limit again (from cache):")
    results3 = await service.search_products("Laptop", price_max=1000)
    print(f"Found {len(results3)} results (cached)")


async def demo_cache_eviction():
    """Demonstrate cache eviction."""
    print("\n=== Cache Eviction Demo ===")

    service = ProductService()

    # Cache a product
    print("Caching product:")
    product = await service.get_product(1)
    print(f"Cached: {product}")

    # Update product (will evict cache)
    print("\nUpdating product (evicts cache):")
    updated = await service.update_product(1, price=899.99)
    print(f"Updated: {updated}")

    # Next call will be cache miss
    print("\nFetching product again (cache miss after eviction):")
    product_after = await service.get_product(1)
    print(f"Result: {product_after}")


async def demo_pattern_eviction():
    """Demonstrate pattern-based eviction."""
    print("\n=== Pattern Eviction Demo ===")

    service = ProductService()

    # Cache category results
    print("Caching category results:")
    electronics = await service.get_products_by_category("Electronics")
    books = await service.get_products_by_category("Books")
    print(f"Cached electronics: {len(electronics)}, books: {len(books)}")

    # Create new product (evicts all category caches)
    print("\nCreating new product (evicts all category caches):")
    new_product = Product(5, "Tablet", 299.99, "Electronics")
    created = await service.create_product(new_product)
    print(f"Created: {created}")

    # Next category calls will be cache miss
    print("\nFetching categories again (cache miss after pattern eviction):")
    electronics_after = await service.get_products_by_category("Electronics")
    print(f"Electronics after eviction: {len(electronics_after)}")


async def demo_combined_decorators():
    """Demonstrate combining cacheable and cacheevict decorators."""
    print("\n=== Combined Decorators Demo ===")

    service = ProductService()

    # This operation will be cached
    print("Updating inventory (successful - will be cached):")
    success1 = await service.update_inventory(1, False)
    print(f"Result: {success1}")

    # This will come from cache
    print("\nSame inventory update (from cache):")
    success2 = await service.update_inventory(1, False)
    print(f"Result: {success2} (cached)")

    # This will fail and evict category caches
    print("\nUpdating inventory for non-existent product (will evict caches):")
    success3 = await service.update_inventory(999, True)
    print(f"Result: {success3} (failed, evicted category caches)")


async def demo_statistics():
    """Demonstrate cache statistics."""
    print("\n=== Cache Statistics Demo ===")

    from app.core.cache import get_cache_stats, get_performance_summary

    service = ProductService()

    # Perform some operations
    await service.get_product(1)  # Cache miss
    await service.get_product(1)  # Cache hit
    await service.get_product(2)  # Cache miss
    await service.get_products_by_category("Electronics")  # Cache miss

    # Get statistics
    print("\nCache statistics:")
    stats = await get_cache_stats()
    print(f"Global stats: {stats.get('global_stats', {})}")

    print("\nPerformance summary:")
    performance = await get_performance_summary()
    print(f"Hit rate: {performance.get('global_hit_rate', 0):.1f}%")
    print(f"Total requests: {performance.get('total_requests', 0)}")


async def main():
    """Run all demos."""
    print("Cache Decorators Demonstration")
    print("=" * 50)

    # Configure cache for demo
    configure_cache(
        default_ttl=300,
        compression_enabled=True,
        enable_stats=True
    )

    await demo_basic_caching()
    await demo_custom_key_templates()
    await demo_conditional_caching()
    await demo_cache_eviction()
    await demo_pattern_eviction()
    await demo_combined_decorators()
    await demo_statistics()

    print("\n" + "=" * 50)
    print("Demo completed!")


if __name__ == "__main__":
    asyncio.run(main())