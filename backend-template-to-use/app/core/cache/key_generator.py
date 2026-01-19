import hashlib
import json
import inspect
from typing import Any, Dict, List, Optional, Set, Callable, Union
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel


class CacheKeyGenerator:
    """Generates consistent cache keys from method calls and parameters."""

    # Parameters to exclude from cache key generation
    EXCLUDED_PARAM_TYPES = {
        Session,
        AsyncSession,
        # Add other types that shouldn't be part of cache keys
    }

    EXCLUDED_PARAM_NAMES = {
        'db', 'session', 'request', 'response', 'context'
    }

    def __init__(self, namespace: str = "cache", separator: str = ":"):
        self.namespace = namespace
        self.separator = separator

    def generate_key(
        self,
        func: Callable,
        args: tuple,
        kwargs: dict,
        key_prefix: Optional[str] = None,
        key_template: Optional[str] = None,
        include_class_name: bool = True
    ) -> str:
        """
        Generate cache key from function and its parameters.

        Args:
            func: The function being cached
            args: Positional arguments passed to function
            kwargs: Keyword arguments passed to function
            key_prefix: Optional prefix for the cache key
            key_template: Optional template for custom key generation
            include_class_name: Whether to include class name for methods

        Returns:
            Generated cache key string
        """
        if key_template:
            return self._generate_from_template(func, args, kwargs, key_template, key_prefix)

        key_parts = []

        # Add namespace
        if self.namespace:
            key_parts.append(self.namespace)

        # Add custom prefix
        if key_prefix:
            key_parts.append(key_prefix)

        # Add class name if this is a method
        if include_class_name and hasattr(func, '__self__'):
            class_name = func.__self__.__class__.__name__
            key_parts.append(class_name)

        # Add function name
        key_parts.append(func.__name__)

        # Add parameter hash
        param_hash = self._generate_param_hash(func, args, kwargs)
        if param_hash:
            key_parts.append(param_hash)

        return self.separator.join(key_parts)

    def _generate_from_template(
        self,
        func: Callable,
        args: tuple,
        kwargs: dict,
        template: str,
        prefix: Optional[str] = None
    ) -> str:
        """Generate cache key from a custom template."""
        # Get function signature for parameter mapping
        sig = inspect.signature(func)
        bound_args = sig.bind(*args, **kwargs)
        bound_args.apply_defaults()

        # Create template variables
        template_vars = dict(bound_args.arguments)
        template_vars['func_name'] = func.__name__

        if hasattr(func, '__self__'):
            template_vars['class_name'] = func.__self__.__class__.__name__
            # Add instance attributes that might be used in templates
            instance = func.__self__
            if hasattr(instance, 'cache_prefix'):
                template_vars['cache_prefix'] = instance.cache_prefix

        # Extract nested attributes from objects (e.g., pagination.page)
        for name, value in list(template_vars.items()):
            if hasattr(value, '__dict__') and not isinstance(value, (str, int, float, bool)):
                # Add attributes of the object as template variables
                for attr_name in dir(value):
                    if not attr_name.startswith('_') and not callable(getattr(value, attr_name, None)):
                        try:
                            attr_value = getattr(value, attr_name)
                            if not callable(attr_value):
                                template_vars[attr_name] = attr_value
                        except Exception:
                            pass

        # Pre-compute common template functions
        hash_vars = {}
        for name, value in template_vars.items():
            if value is not None:
                # Add hash of string representation for cache keys
                hash_vars[f'hash_{name}'] = abs(hash(str(value))) % (10**8)  # Use abs and modulo for consistency

        # Add hash variables to template_vars
        template_vars.update(hash_vars)

        # Build key from template
        try:
            key = template.format(**template_vars)
        except KeyError as e:
            raise ValueError(f"Template variable {e} not found in function parameters")

        # Add prefix if provided
        if prefix:
            key = f"{prefix}{self.separator}{key}"

        # Add namespace
        if self.namespace:
            key = f"{self.namespace}{self.separator}{key}"

        return key

    def _generate_param_hash(self, func: Callable, args: tuple, kwargs: dict) -> str:
        """Generate hash from function parameters, excluding non-cacheable ones."""
        # Get function signature for parameter mapping
        sig = inspect.signature(func)
        bound_args = sig.bind(*args, **kwargs)
        bound_args.apply_defaults()

        # Filter parameters for cache key generation
        filtered_params = self._filter_cacheable_params(bound_args.arguments)

        if not filtered_params:
            return ""

        # Create deterministic representation
        param_repr = self._create_param_representation(filtered_params)

        # Generate hash
        param_str = json.dumps(param_repr, sort_keys=True, default=str)
        return hashlib.md5(param_str.encode('utf-8')).hexdigest()[:12]

    def _filter_cacheable_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Filter out parameters that shouldn't be part of cache keys."""
        filtered = {}

        for name, value in params.items():
            # Skip excluded parameter names
            if name in self.EXCLUDED_PARAM_NAMES:
                continue

            # Skip excluded parameter types
            if any(isinstance(value, excluded_type) for excluded_type in self.EXCLUDED_PARAM_TYPES):
                continue

            # Skip None values (they don't add uniqueness)
            if value is None:
                continue

            filtered[name] = value

        return filtered

    def _create_param_representation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a JSON-serializable representation of parameters."""
        result = {}

        for name, value in params.items():
            try:
                result[name] = self._serialize_value(value)
            except (TypeError, ValueError) as e:
                # For non-serializable values, use string representation
                result[name] = f"<{type(value).__name__}:{str(value)[:50]}>"

        return result

    def _serialize_value(self, value: Any) -> Any:
        """Serialize a value for cache key generation."""
        # Handle basic types
        if value is None or isinstance(value, (str, int, float, bool)):
            return value

        # Handle Pydantic models
        if isinstance(value, BaseModel):
            return value.model_dump()

        # Handle lists and tuples
        if isinstance(value, (list, tuple)):
            return [self._serialize_value(item) for item in value]

        # Handle dictionaries
        if isinstance(value, dict):
            return {k: self._serialize_value(v) for k, v in value.items()}

        # Handle sets (convert to sorted list for consistency)
        if isinstance(value, set):
            return sorted([self._serialize_value(item) for item in value])

        # For other types, try to convert to string
        return str(value)

    def generate_pattern_key(self, pattern: str, prefix: Optional[str] = None) -> str:
        """Generate a pattern key for cache eviction."""
        key_parts = []

        if self.namespace:
            key_parts.append(self.namespace)

        if prefix:
            key_parts.append(prefix)

        key_parts.append(pattern)

        return self.separator.join(key_parts)


# Global key generator instance
key_generator = CacheKeyGenerator()


def create_cache_key(
    func: Callable,
    args: tuple,
    kwargs: dict,
    key_prefix: Optional[str] = None,
    key_template: Optional[str] = None,
    include_class_name: bool = True
) -> str:
    """
    Convenience function to generate cache keys.

    Args:
        func: Function being cached
        args: Function positional arguments
        kwargs: Function keyword arguments
        key_prefix: Optional key prefix
        key_template: Optional key template
        include_class_name: Include class name for methods

    Returns:
        Generated cache key
    """
    return key_generator.generate_key(
        func=func,
        args=args,
        kwargs=kwargs,
        key_prefix=key_prefix,
        key_template=key_template,
        include_class_name=include_class_name
    )