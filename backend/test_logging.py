#!/usr/bin/env python3
"""
Test script to demonstrate the logging functionality.

This script shows how the logging system works with different components:
1. Basic logging with class name, line number, timestamp
2. Request context simulation
3. Authentication logging
4. Service logging
5. Performance monitoring

Run this script to see the logging output format.
"""

import asyncio
import sys
import os
import time
from datetime import datetime

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.logging import (
    get_logger, get_class_logger, set_request_context,
    info, debug, warning, error, critical, configure_logging
)
from app.core.logging_utils import (
    log_function_call, log_performance, ServiceLogger,
    log_authentication_event, log_authorization_event
)


class SampleService:
    """Sample service class to demonstrate class-based logging."""

    def __init__(self):
        self.logger = get_class_logger(self.__class__)
        self.service_logger = ServiceLogger('sample_service')

    @log_function_call(log_args=True, log_duration=True)
    def process_data(self, data: dict, user_id: str):
        """Sample method with function call logging."""
        self.logger.info("Processing data for user", user_id=user_id, data_size=len(data))

        # Simulate some processing
        time.sleep(0.1)

        result = {"processed": True, "items": len(data)}
        self.logger.debug("Data processing completed", result=result)
        return result

    @log_performance(threshold_ms=50.0)
    async def async_operation(self, duration: float = 0.1):
        """Sample async operation with performance monitoring."""
        self.logger.info("Starting async operation", expected_duration=duration)

        # Simulate async work
        await asyncio.sleep(duration)

        self.logger.info("Async operation completed")
        return "completed"

    def demonstrate_service_logging(self):
        """Demonstrate service-level logging patterns."""
        operation = "data_validation"

        # Log service start
        self.service_logger.log_service_start(operation, user_id="test_user")

        try:
            # Simulate some work
            time.sleep(0.05)

            # Log successful completion
            self.service_logger.log_service_success(
                operation,
                duration_ms=50.0,
                records_processed=100
            )

        except Exception as e:
            # Log error (this won't execute in this demo)
            self.service_logger.log_service_error(operation, e, duration_ms=50.0)

    def demonstrate_business_logic_logging(self):
        """Demonstrate business rule and validation logging."""
        # Simulate validation error
        self.service_logger.log_validation_error(
            field="email",
            value="invalid-email",
            reason="Invalid email format"
        )

        # Simulate business rule violation
        self.service_logger.log_business_rule_violation(
            rule="maximum_sessions_per_user",
            context={"user_id": "test_user", "current_sessions": 5, "max_allowed": 3}
        )


def demonstrate_basic_logging():
    """Demonstrate basic logging functionality."""
    print("\n=== Basic Logging Demonstration ===")

    # Global logger functions
    info("This is an info message", component="test_script")
    debug("This is a debug message", details={"key": "value"})
    warning("This is a warning message", alert_level="medium")
    error("This is an error message", error_code="TEST_001")

    # Custom logger
    custom_logger = get_logger("custom_component")
    custom_logger.info("Custom logger message", feature="logging_demo")


def demonstrate_format_switching():
    """Demonstrate switching between JSON and text formats."""
    print("\n=== Log Format Switching Demonstration ===")

    # Test with JSON format (default)
    info("Testing JSON format", format_type="json")

    # Switch to text format
    configure_logging(log_format='text')
    info("Testing text format", format_type="text")

    # Switch back to JSON
    configure_logging(log_format='json')
    info("Back to JSON format", format_type="json")


def demonstrate_request_context():
    """Demonstrate request context logging."""
    print("\n=== Request Context Demonstration ===")

    # Simulate request context
    set_request_context(
        request_id="req_12345",
        ip_address="192.168.1.100",
        user_id="user_12345",
        method="POST",
        path="/api/v1/auth/login"
    )

    logger = get_logger("request_demo")
    logger.info("Processing login request")
    logger.debug("Request validated", validation_time_ms=15.2)

    # Clear context (normally done by middleware)
    from app.core.logging import clear_request_context
    clear_request_context()


def demonstrate_authentication_logging():
    """Demonstrate authentication event logging."""
    print("\n=== Authentication Logging Demonstration ===")

    # Successful login
    log_authentication_event(
        event_type='login',
        user_id='user_12345',
        email='user@example.com',
        success=True,
        metadata={
            'ip_address': '192.168.1.100',
            'user_agent': 'Mozilla/5.0...',
            'session_id': 'sess_67890'
        }
    )

    # Failed login
    log_authentication_event(
        event_type='login',
        email='user@example.com',
        success=False,
        reason='invalid_password',
        metadata={'ip_address': '192.168.1.100', 'attempt_count': 3}
    )

    # Password change
    log_authentication_event(
        event_type='password_change',
        user_id='user_12345',
        email='user@example.com',
        success=True,
        metadata={'revoked_sessions': 2}
    )


def demonstrate_authorization_logging():
    """Demonstrate authorization event logging."""
    print("\n=== Authorization Logging Demonstration ===")

    # Allowed access
    log_authorization_event(
        user_id='user_12345',
        resource='features',
        action='read',
        allowed=True,
        permissions=['features:read', 'features:write']
    )

    # Denied access
    log_authorization_event(
        user_id='user_12345',
        resource='users',
        action='admin',
        allowed=False,
        permissions=['features:read'],
        reason='insufficient_permissions'
    )


async def demonstrate_service_logging():
    """Demonstrate service-level logging patterns."""
    print("\n=== Service Logging Demonstration ===")

    service = SampleService()

    # Function call logging
    result = service.process_data(
        data={"name": "test", "email": "test@example.com"},
        user_id="user_12345"
    )

    # Performance monitoring (normal operation)
    await service.async_operation(duration=0.03)

    # Performance monitoring (slow operation)
    await service.async_operation(duration=0.15)  # Will trigger warning

    # Service logging patterns
    service.demonstrate_service_logging()

    # Business logic logging
    service.demonstrate_business_logic_logging()


def demonstrate_error_logging():
    """Demonstrate error logging with exception handling."""
    print("\n=== Error Logging Demonstration ===")

    logger = get_logger("error_demo")

    try:
        # Simulate an error
        raise ValueError("This is a test error for logging demonstration")
    except Exception as e:
        logger.exception("Error occurred during demo", operation="test_error")


async def main():
    """Main demonstration function."""
    print("🚀 Starting GigConnect Logging System Demonstration")
    print("=" * 60)

    # Set up simulated request context for some demos
    set_request_context(
        request_id="demo_req_001",
        ip_address="127.0.0.1",
        user_id="demo_user"
    )

    try:
        # Run all demonstrations
        demonstrate_basic_logging()
        demonstrate_format_switching()
        demonstrate_request_context()
        demonstrate_authentication_logging()
        demonstrate_authorization_logging()
        await demonstrate_service_logging()
        demonstrate_error_logging()

        print("\n" + "=" * 60)
        print("✅ Logging demonstration completed successfully!")
        print("\nKey Features Demonstrated:")
        print("- ✅ Class name and line number extraction")
        print("- ✅ Timestamp in ISO format")
        print("- ✅ IP address from request context")
        print("- ✅ Configurable JSON and text logging formats")
        print("- ✅ Docker volume mapping for log accessibility")
        print("- ✅ Function call decorators with timing")
        print("- ✅ Performance monitoring")
        print("- ✅ Authentication event logging")
        print("- ✅ Authorization event logging")
        print("- ✅ Service-level logging patterns")
        print("- ✅ Exception logging with stack traces")
        print("- ✅ File rotation and multiple log files")

    except Exception as e:
        error("Demo failed", error=str(e))
        raise


if __name__ == "__main__":
    asyncio.run(main())