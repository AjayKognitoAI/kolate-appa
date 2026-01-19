import json
import pickle
import gzip
import base64
from typing import Any, Dict, List, Optional, Type, Union
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.orm import DeclarativeBase


class SerializationError(Exception):
    """Exception raised when serialization/deserialization fails."""
    pass


class CacheSerializer:
    """Handles serialization and deserialization of objects for caching."""

    def __init__(self, compression: bool = False, compression_threshold: int = 1024):
        """
        Initialize serializer.

        Args:
            compression: Whether to compress large objects
            compression_threshold: Size threshold for compression in bytes
        """
        self.compression = compression
        self.compression_threshold = compression_threshold

    def serialize(self, obj: Any) -> str:
        """
        Serialize object to string for cache storage.

        Args:
            obj: Object to serialize

        Returns:
            Serialized string representation

        Raises:
            SerializationError: If serialization fails
        """
        try:
            # Create serializable representation
            serializable_obj = self._make_serializable(obj)

            # Add metadata for deserialization
            cache_data = {
                'data': serializable_obj,
                'type_info': self._get_type_info(obj),
                'serialized_at': datetime.utcnow().isoformat()
            }

            # Convert to JSON
            json_str = json.dumps(cache_data, default=self._json_default)

            # Compress if enabled and data is large enough
            if self.compression and len(json_str.encode('utf-8')) > self.compression_threshold:
                compressed_data = gzip.compress(json_str.encode('utf-8'))
                encoded_data = base64.b64encode(compressed_data).decode('utf-8')
                return f"COMPRESSED:{encoded_data}"

            return json_str

        except Exception as e:
            raise SerializationError(f"Failed to serialize object: {str(e)}") from e

    def deserialize(self, data: str) -> Any:
        """
        Deserialize string back to original object.

        Args:
            data: Serialized string data

        Returns:
            Deserialized object

        Raises:
            SerializationError: If deserialization fails
        """
        try:
            # Handle compressed data
            if data.startswith("COMPRESSED:"):
                encoded_data = data[11:]  # Remove "COMPRESSED:" prefix
                compressed_data = base64.b64decode(encoded_data.encode('utf-8'))
                json_str = gzip.decompress(compressed_data).decode('utf-8')
            else:
                json_str = data

            # Parse JSON
            cache_data = json.loads(json_str)

            # Extract data and type information
            obj_data = cache_data['data']
            type_info = cache_data['type_info']

            # Reconstruct original object
            return self._reconstruct_object(obj_data, type_info)

        except Exception as e:
            raise SerializationError(f"Failed to deserialize object: {str(e)}") from e

    def _make_serializable(self, obj: Any, embed_type_info: bool = False) -> Any:
        """Convert object to JSON-serializable format."""
        if obj is None:
            return None

        # Handle basic types
        if isinstance(obj, (str, int, float, bool)):
            return obj

        # Handle datetime objects
        if isinstance(obj, datetime):
            return obj.isoformat()

        if isinstance(obj, date):
            return obj.isoformat()

        # Handle Decimal
        if isinstance(obj, Decimal):
            return str(obj)

        # Handle Enum
        if isinstance(obj, Enum):
            return {
                '_enum_name': obj.__class__.__name__,
                '_enum_module': obj.__class__.__module__,
                'value': obj.value
            }

        # Handle Pydantic models
        if isinstance(obj, BaseModel):
            # Manually extract attributes to preserve nested object types
            result = {}
            for field_name, field_info in obj.model_fields.items():
                value = getattr(obj, field_name, None)
                result[field_name] = self._make_serializable(value, embed_type_info=True)

            if embed_type_info:
                result['__type_info__'] = self._get_type_info(obj)
            return result

        # Handle SQLAlchemy models (basic approach)
        if hasattr(obj, '__table__'):
            # Convert SQLAlchemy model to dict
            result = {}
            for column in obj.__table__.columns:
                value = getattr(obj, column.name)
                result[column.name] = self._make_serializable(value, embed_type_info=True)

            if embed_type_info:
                result['__type_info__'] = self._get_type_info(obj)
            return result

        # Handle lists and tuples
        if isinstance(obj, (list, tuple)):
            return [self._make_serializable(item, embed_type_info=True) for item in obj]

        # Handle dictionaries
        if isinstance(obj, dict):
            return {k: self._make_serializable(v, embed_type_info=True) for k, v in obj.items()}

        # Handle sets
        if isinstance(obj, set):
            return list(self._make_serializable(item, embed_type_info=True) for item in obj)

        # For other objects, try to use their dict representation
        if hasattr(obj, '__dict__'):
            result = {k: self._make_serializable(v, embed_type_info=True) for k, v in obj.__dict__.items() if not k.startswith('_')}
            if embed_type_info:
                result['__type_info__'] = self._get_type_info(obj)
            return result

        # Fallback to string representation
        return str(obj)

    def _get_type_info(self, obj: Any) -> Dict[str, Any]:
        """Get type information for proper deserialization."""
        if obj is None:
            return {'type': 'none'}

        obj_type = type(obj)

        type_info = {
            'type': obj_type.__name__,
            'module': obj_type.__module__
        }

        # Special handling for different types
        if isinstance(obj, (list, tuple)):
            type_info['container_type'] = 'list' if isinstance(obj, list) else 'tuple'
            if obj:  # Get type info for first element if available
                type_info['element_type_info'] = self._get_type_info(obj[0])

        elif isinstance(obj, dict):
            type_info['container_type'] = 'dict'

        elif isinstance(obj, set):
            type_info['container_type'] = 'set'

        elif isinstance(obj, BaseModel):
            type_info['is_pydantic'] = True
            type_info['pydantic_model'] = obj.__class__.__name__

        elif hasattr(obj, '__table__'):
            type_info['is_sqlalchemy'] = True
            type_info['table_name'] = obj.__table__.name

        return type_info

    def _reconstruct_object(self, data: Any, type_info: Dict[str, Any]) -> Any:
        """Reconstruct object from serialized data and type information."""
        # Check if data has embedded type information
        if isinstance(data, dict) and '__type_info__' in data:
            embedded_type_info = data.pop('__type_info__')
            return self._reconstruct_object(data, embedded_type_info)

        obj_type = type_info.get('type')

        if obj_type == 'none' or data is None:
            return None

        # Handle basic types
        if obj_type in ('str', 'int', 'float', 'bool'):
            return data

        # Handle datetime
        if obj_type == 'datetime':
            return datetime.fromisoformat(data)

        if obj_type == 'date':
            return datetime.fromisoformat(data).date()

        # Handle Decimal
        if obj_type == 'Decimal':
            return Decimal(data)

        # Handle Enum
        if '_enum_name' in data and '_enum_module' in data:
            # This is a simplified approach - in production you might want
            # to dynamically import the enum class
            return data['value']

        # Handle containers
        container_type = type_info.get('container_type')

        if container_type == 'list':
            return [self._reconstruct_object(item, type_info.get('element_type_info', {})) if isinstance(item, dict) else item for item in data]

        if container_type == 'tuple':
            return tuple(self._reconstruct_object(item, type_info.get('element_type_info', {})) if isinstance(item, dict) else item for item in data)

        if container_type == 'set':
            return set(data)

        if container_type == 'dict':
            return data

        # Handle Pydantic models
        if type_info.get('is_pydantic'):
            # Dynamically import and reconstruct Pydantic model
            module_name = type_info.get('module')
            class_name = type_info.get('type')

            try:
                # Import the module and get the class
                import importlib
                module = importlib.import_module(module_name)
                model_class = getattr(module, class_name)

                # Process nested objects in data before reconstruction
                processed_data = {}
                for key, value in data.items():
                    if isinstance(value, list):
                        # Handle lists that might contain objects needing reconstruction
                        processed_data[key] = [
                            self._reconstruct_object(item, {}) if isinstance(item, dict) else item
                            for item in value
                        ]
                    elif isinstance(value, dict):
                        # Handle nested objects
                        processed_data[key] = self._reconstruct_object(value, {})
                    else:
                        processed_data[key] = value

                # Reconstruct Pydantic model from processed data
                instance = model_class(**processed_data)
                return instance
            except (ImportError, AttributeError, TypeError) as e:
                # Log the error for debugging
                import logging
                logging.warning(f"Failed to reconstruct Pydantic model {class_name}: {e}")
                # Fallback to dict if reconstruction fails
                return data

        # Handle SQLAlchemy models
        if type_info.get('is_sqlalchemy'):
            # Dynamically import and reconstruct SQLAlchemy model
            module_name = type_info.get('module')
            class_name = type_info.get('type')

            try:
                # Import the module and get the class
                import importlib
                from sqlalchemy.orm import object_session
                from sqlalchemy.inspection import inspect as sqlalchemy_inspect

                module = importlib.import_module(module_name)
                model_class = getattr(module, class_name)

                # Create instance properly by calling the constructor
                instance = model_class()

                # Set attributes (skip __type_info__ if it exists)
                for key, value in data.items():
                    if key != '__type_info__':
                        setattr(instance, key, value)

                return instance
            except (ImportError, AttributeError) as e:
                # Log the error for debugging
                import logging
                logging.warning(f"Failed to reconstruct SQLAlchemy model {class_name}: {e}")
                # Fallback to dict if reconstruction fails
                return data

        # Default: return as-is
        return data

    def _json_default(self, obj: Any) -> Any:
        """Default JSON serializer for non-standard types."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, Enum):
            return obj.value
        if isinstance(obj, BaseModel):
            return obj.model_dump()

        # Fallback
        return str(obj)


# Global serializer instances
json_serializer = CacheSerializer(compression=False)
compressed_serializer = CacheSerializer(compression=True, compression_threshold=512)


def serialize_for_cache(obj: Any, use_compression: bool = False) -> str:
    """
    Convenience function to serialize objects for caching.

    Args:
        obj: Object to serialize
        use_compression: Whether to use compression

    Returns:
        Serialized string
    """
    serializer = compressed_serializer if use_compression else json_serializer
    return serializer.serialize(obj)


def deserialize_from_cache(data: str) -> Any:
    """
    Convenience function to deserialize objects from cache.

    Args:
        data: Serialized string data

    Returns:
        Deserialized object
    """
    # Automatically detect compression
    if data.startswith("COMPRESSED:"):
        return compressed_serializer.deserialize(data)
    else:
        return json_serializer.deserialize(data)