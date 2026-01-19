import functools
import inspect
import time
from typing import Any, Callable, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger, get_class_logger

# Default logger for utilities
utils_logger = get_logger("logging_utils")


# === Helpers === #

def sanitize_args_kwargs(args, kwargs):
    """Sanitize args and kwargs for safe logging (redacts secrets)."""
    safe_args = []
    safe_kwargs = {}

    for i, arg in enumerate(args):
        if isinstance(arg, (str, int, float, bool, list, dict)):
            safe_args.append(arg)
        else:
            safe_args.append(f"<{type(arg).__name__}>")

    for key, value in kwargs.items():
        if key.lower() in ["password", "secret", "token", "key", "hash"]:
            safe_kwargs[key] = "<REDACTED>"
        elif isinstance(value, (str, int, float, bool, list, dict)):
            safe_kwargs[key] = value
        else:
            safe_kwargs[key] = f"<{type(value).__name__}>"

    return safe_args, safe_kwargs


def safe_log_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure only safe values go to logger extra."""
    return {k: (v if isinstance(v, (str, int, float, bool, list, dict)) else str(v)) for k, v in data.items()}


# === Function Call Logger === #

def log_function_call(
    level: str = "info",
    log_args: bool = True,
    log_kwargs: bool = True,
    log_duration: bool = True,
    log_result: bool = False,
    logger_instance: Optional[Any] = None,
):
    """
    Decorator to automatically log function calls.

    Args:
        level: Log level to use ('debug', 'info', 'warning', 'error')
        log_args: Whether to log function positional arguments
        log_kwargs: Whether to log function keyword arguments
        log_duration: Whether to log execution duration
        log_result: Whether to log function return value
        logger_instance: Custom logger instance to use
    """

    def decorator(func: Callable) -> Callable:
        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                logger = (
                    logger_instance
                    or (get_class_logger(args[0].__class__) if args and hasattr(args[0], "__class__") else get_logger(f"{func.__module__}.{func.__name__}"))
                )

                safe_args, safe_kwargs = sanitize_args_kwargs(args, kwargs)
                log_data = {"function": func.__name__, "module": func.__module__}

                if log_args and safe_args:
                    log_data["args"] = safe_args[1:]  # skip self for methods
                if log_kwargs and safe_kwargs:
                    log_data["kwargs"] = safe_kwargs

                start_time = time.time() if log_duration else None
                getattr(logger, level)(f"Entering {func.__name__}", extra=safe_log_data(log_data))

                try:
                    result = await func(*args, **kwargs)
                    if log_duration and start_time is not None:
                        log_data["duration_ms"] = round((time.time() - start_time) * 1000, 2)
                    if log_result and result is not None:
                        log_data["result"] = result if isinstance(result, (str, int, float, bool, list, dict)) else f"<{type(result).__name__}>"

                    getattr(logger, level)(f"Completed {func.__name__}", extra=safe_log_data(log_data))
                    return result
                except Exception as e:
                    if log_duration and start_time is not None:
                        log_data["duration_ms"] = round((time.time() - start_time) * 1000, 2)
                    log_data.update({"error": str(e), "error_type": type(e).__name__})
                    logger.error(f"Error in {func.__name__}", extra=safe_log_data(log_data))
                    raise

            return async_wrapper

        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                logger = (
                    logger_instance
                    or (get_class_logger(args[0].__class__) if args and hasattr(args[0], "__class__") else get_logger(f"{func.__module__}.{func.__name__}"))
                )

                safe_args, safe_kwargs = sanitize_args_kwargs(args, kwargs)
                log_data = {"function": func.__name__, "module": func.__module__}

                if log_args and safe_args:
                    log_data["args"] = safe_args[1:]
                if log_kwargs and safe_kwargs:
                    log_data["kwargs"] = safe_kwargs

                start_time = time.time() if log_duration else None
                getattr(logger, level)(f"Entering {func.__name__}", extra=safe_log_data(log_data))

                try:
                    result = func(*args, **kwargs)
                    if log_duration and start_time is not None:
                        log_data["duration_ms"] = round((time.time() - start_time) * 1000, 2)
                    if log_result and result is not None:
                        log_data["result"] = result if isinstance(result, (str, int, float, bool, list, dict)) else f"<{type(result).__name__}>"

                    getattr(logger, level)(f"Completed {func.__name__}", extra=safe_log_data(log_data))
                    return result
                except Exception as e:
                    if log_duration and start_time is not None:
                        log_data["duration_ms"] = round((time.time() - start_time) * 1000, 2)
                    log_data.update({"error": str(e), "error_type": type(e).__name__})
                    logger.error(f"Error in {func.__name__}", extra=safe_log_data(log_data))
                    raise

            return sync_wrapper

    return decorator


# === Database Logging === #

async def log_database_operation(
    db: AsyncSession,
    operation: str,
    table: str,
    conditions: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    logger_instance: Optional[Any] = None,
):
    """Log database operations with timing."""
    logger = logger_instance or get_logger("database")

    start_time = time.time()

    log_data = {"operation": operation, "table": table, "conditions": conditions, "data_size": len(data) if data else 0}

    # Filter sensitive data
    if data:
        safe_data = {}
        for key, value in data.items():
            if key.lower() in ["password", "secret", "token", "hash"]:
                safe_data[key] = "<REDACTED>"
            else:
                safe_data[key] = value
        log_data["data"] = safe_data

    logger.info(f"Database {operation} on {table}", extra=safe_log_data(log_data))

    try:
        duration = time.time() - start_time
        logger.debug(
            f"Database {operation} completed",
            extra=safe_log_data(
                {"operation": operation, "table": table, "duration_ms": round(duration * 1000, 2)}
            ),
        )
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            f"Database {operation} failed",
            extra=safe_log_data(
                {
                    "operation": operation,
                    "table": table,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": round(duration * 1000, 2),
                }
            ),
        )
        raise


# === Performance Logging === #

def log_performance(threshold_ms: float = 1000.0, logger_instance: Optional[Any] = None):
    """
    Decorator to log performance warnings for slow operations.

    Args:
        threshold_ms: Threshold in milliseconds to trigger performance warning
        logger_instance: Logger to use
    """

    def decorator(func: Callable) -> Callable:
        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                logger = logger_instance or get_logger("performance")
                start_time = time.time()

                try:
                    result = await func(*args, **kwargs)
                    duration = (time.time() - start_time) * 1000
                    if duration > threshold_ms:
                        logger.warning(
                            f"Slow operation detected: {func.__name__}",
                            extra=safe_log_data(
                                {
                                    "function": func.__name__,
                                    "module": func.__module__,
                                    "duration_ms": round(duration, 2),
                                    "threshold_ms": threshold_ms,
                                }
                            ),
                        )
                    return result
                except Exception as e:
                    duration = (time.time() - start_time) * 1000
                    logger.error(
                        f"Error in performance-monitored function: {func.__name__}",
                        extra=safe_log_data(
                            {"function": func.__name__, "error": str(e), "duration_ms": round(duration, 2)}
                        ),
                    )
                    raise

            return async_wrapper

        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                logger = logger_instance or get_logger("performance")
                start_time = time.time()

                try:
                    result = func(*args, **kwargs)
                    duration = (time.time() - start_time) * 1000
                    if duration > threshold_ms:
                        logger.warning(
                            f"Slow operation detected: {func.__name__}",
                            extra=safe_log_data(
                                {
                                    "function": func.__name__,
                                    "module": func.__module__,
                                    "duration_ms": round(duration, 2),
                                    "threshold_ms": threshold_ms,
                                }
                            ),
                        )
                    return result
                except Exception as e:
                    duration = (time.time() - start_time) * 1000
                    logger.error(
                        f"Error in performance-monitored function: {func.__name__}",
                        extra=safe_log_data(
                            {"function": func.__name__, "error": str(e), "duration_ms": round(duration, 2)}
                        ),
                    )
                    raise

            return sync_wrapper

    return decorator


# === Authentication & Authorization Logging === #

def log_authentication_event(
    event_type: str,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    success: bool = True,
    reason: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    logger_instance: Optional[Any] = None,
):
    """Log authentication-related events."""
    logger = logger_instance or get_logger("authentication")

    log_data = {
        "event_type": event_type,
        "user_id": user_id or "unknown",
        "email": email or "unknown",
        "success": success,
        "metadata": metadata or {},
    }

    if reason:
        log_data["reason"] = reason

    level = "info" if success else "warning"
    message = f"Authentication event: {event_type} - {'SUCCESS' if success else 'FAILED'}"

    getattr(logger, level)(message, extra=safe_log_data(log_data))


def log_authorization_event(
    user_id: str,
    resource: str,
    action: str,
    allowed: bool,
    permissions: Optional[list] = None,
    reason: Optional[str] = None,
    logger_instance: Optional[Any] = None,
):
    """Log authorization-related events."""
    logger = logger_instance or get_logger("authorization")

    log_data = {"user_id": user_id, "resource": resource, "action": action, "allowed": allowed, "permissions": permissions or []}

    if reason:
        log_data["reason"] = reason

    level = "info" if allowed else "warning"
    message = f"Authorization check: {resource}:{action} - {'ALLOWED' if allowed else 'DENIED'}"

    getattr(logger, level)(message, extra=safe_log_data(log_data))


# === Service Logger === #

class ServiceLogger:
    """Base logger class for services."""

    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = get_logger(service_name)

    def log_service_start(self, operation: str, **kwargs):
        """Log service operation start."""
        self.logger.info(f"Service operation started: {operation}", extra=safe_log_data({"operation": operation, **kwargs}))

    def log_service_success(self, operation: str, duration_ms: float = None, **kwargs):
        """Log successful service operation."""
        log_data = {"operation": operation}
        if duration_ms:
            log_data["duration_ms"] = round(duration_ms, 2)
        log_data.update(kwargs)
        self.logger.info(f"Service operation completed: {operation}", extra=safe_log_data(log_data))

    def log_service_error(self, operation: str, error: Exception, duration_ms: float = None, **kwargs):
        """Log service operation error."""
        log_data = {"operation": operation, "error": str(error), "error_type": type(error).__name__}
        if duration_ms:
            log_data["duration_ms"] = round(duration_ms, 2)
        log_data.update(kwargs)
        self.logger.error(f"Service operation failed: {operation}", extra=safe_log_data(log_data))

    def log_validation_error(self, field: str, value: Any, reason: str, **kwargs):
        """Log validation errors."""
        self.logger.warning(
            f"Validation failed for {field}",
            extra=safe_log_data({"field": field, "value_type": type(value).__name__, "reason": reason, **kwargs}),
        )

    def log_business_rule_violation(self, rule: str, context: Dict[str, Any], **kwargs):
        """Log business rule violations."""
        self.logger.warning(
            f"Business rule violation: {rule}", extra=safe_log_data({"rule": rule, "context": context, **kwargs})
        )
