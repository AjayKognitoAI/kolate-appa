# GigConnect Logging Architecture Guide

This document explains the different types of loggers available in the GigConnect logging system, when to use each one, and provides practical examples.

## Overview

The logging system is designed with multiple specialized loggers to handle different use cases and provide structured, contextual logging throughout the application.

---

## 1. Basic Global Loggers

### **Global Logger Functions**
```python
from app.core.logging import info, debug, warning, error, critical, exception
```

**When to use:** Quick, simple logging without needing a logger instance.

**Example:**
```python
from app.core.logging import info, error

def process_payment(amount):
    info("Processing payment", amount=amount, currency="USD")

    try:
        # Payment logic
        result = charge_card(amount)
        info("Payment processed successfully", transaction_id=result.id)
        return result
    except Exception as e:
        error("Payment failed", amount=amount, error=str(e))
        raise
```

**Output:**
```json
{
    "timestamp": "2025-09-18T10:30:45.123456+00:00",
    "level": "INFO",
    "message": "Processing payment",
    "amount": 150.00,
    "currency": "USD",
    "class_name": "N/A",
    "line_number": 5
}
```

---

## 2. Named Loggers

### **Custom Named Logger**
```python
from app.core.logging import get_logger

logger = get_logger('payment_processor')
```

**When to use:** When you want a specific logger for a module or component.

**Example:**
```python
from app.core.logging import get_logger

logger = get_logger('email_service')

def send_welcome_email(user_email):
    logger.info("Sending welcome email", recipient=user_email)

    try:
        email_client.send(user_email, template='welcome')
        logger.info("Welcome email sent successfully", recipient=user_email)
    except Exception as e:
        logger.error("Failed to send welcome email",
                    recipient=user_email, error=str(e))
```

---

## 3. Class-Based Loggers

### **Class Logger**
```python
from app.core.logging import get_class_logger

class UserService:
    def __init__(self):
        self.logger = get_class_logger(self.__class__)
```

**When to use:** For service classes, repositories, or any class-based components.

**Example:**
```python
from app.core.logging import get_class_logger

class PaymentService:
    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    def process_refund(self, transaction_id, amount):
        self.logger.info("Processing refund",
                        transaction_id=transaction_id,
                        amount=amount)

        # Refund logic
        self.logger.info("Refund completed",
                        transaction_id=transaction_id)
```

**Output includes class name:**
```json
{
    "class_name": "PaymentService",
    "function_name": "process_refund",
    "message": "Processing refund"
}
```

---

## 4. Service Logger

### **ServiceLogger Class**
```python
from app.core.logging_utils import ServiceLogger

class NotificationService:
    def __init__(self):
        self.service_logger = ServiceLogger('notification_service')
```

**When to use:** For business logic services that need structured operation tracking.

**Example:**
```python
from app.core.logging_utils import ServiceLogger
import time

class OrderService:
    def __init__(self):
        self.service_logger = ServiceLogger('order_service')

    def create_order(self, user_id, items):
        start_time = time.time()

        # Log operation start
        self.service_logger.log_service_start(
            'create_order',
            user_id=user_id,
            item_count=len(items)
        )

        try:
            # Business logic
            order = self._process_order(user_id, items)

            # Log success
            duration = (time.time() - start_time) * 1000
            self.service_logger.log_service_success(
                'create_order',
                duration_ms=duration,
                order_id=order.id,
                total_amount=order.total
            )

            return order

        except Exception as e:
            # Log error
            duration = (time.time() - start_time) * 1000
            self.service_logger.log_service_error(
                'create_order',
                e,
                duration_ms=duration,
                user_id=user_id
            )
            raise

    def validate_inventory(self, items):
        for item in items:
            if item.quantity > item.stock:
                # Log validation error
                self.service_logger.log_validation_error(
                    field='quantity',
                    value=item.quantity,
                    reason=f'Insufficient stock. Available: {item.stock}',
                    item_id=item.id
                )

    def check_business_rules(self, order):
        if order.total > 10000 and not order.user.is_verified:
            # Log business rule violation
            self.service_logger.log_business_rule_violation(
                rule='high_value_order_requires_verification',
                context={
                    'order_total': order.total,
                    'user_verified': order.user.is_verified,
                    'user_id': order.user.id
                }
            )
```

**ServiceLogger Methods:**
- `log_service_start()` - Log operation beginning
- `log_service_success()` - Log successful completion
- `log_service_error()` - Log operation failure
- `log_validation_error()` - Log validation failures
- `log_business_rule_violation()` - Log business rule violations

---

## 5. Decorator-Based Logging

### **Function Call Logger**
```python
from app.core.logging_utils import log_function_call

@log_function_call(level='info', log_args=True, log_duration=True)
async def update_user_profile(user_id: str, profile_data: dict):
    # Function logic here
    return updated_profile
```

**When to use:** Automatic logging of function entry/exit with timing and arguments.

**Example:**
```python
from app.core.logging_utils import log_function_call

class UserController:
    @log_function_call(
        level='info',
        log_args=True,
        log_duration=True,
        log_result=False  # Don't log return value
    )
    async def get_user_profile(self, user_id: str, include_sensitive: bool = False):
        # This will automatically log:
        # - Function entry with sanitized arguments
        # - Function exit with duration
        # - Any exceptions with stack trace

        user = await self.user_service.get_by_id(user_id)
        if include_sensitive:
            # Sensitive data won't be logged due to sanitization
            user.include_payment_methods()

        return user.to_dict()
```

**Automatic Output:**
```json
// Entry log
{
    "message": "Entering get_user_profile",
    "function": "get_user_profile",
    "module": "user_controller",
    "args": ["user_123"],
    "kwargs": {"include_sensitive": "<REDACTED>"}
}

// Exit log
{
    "message": "Completed get_user_profile",
    "function": "get_user_profile",
    "duration_ms": 45.2
}
```

### **Performance Monitor**
```python
from app.core.logging_utils import log_performance

@log_performance(threshold_ms=500.0)
async def generate_report(report_type: str):
    # Warns if function takes longer than 500ms
    pass
```

**When to use:** Monitor function performance and identify slow operations.

**Example:**
```python
from app.core.logging_utils import log_performance

class ReportService:
    @log_performance(threshold_ms=1000.0)  # Warn if > 1 second
    async def generate_monthly_report(self, user_id: str):
        # Heavy computation
        await self._process_transactions(user_id)
        await self._calculate_metrics(user_id)
        return report

    @log_performance(threshold_ms=200.0)   # Warn if > 200ms
    async def get_quick_stats(self, user_id: str):
        # Should be fast
        return await self._get_cached_stats(user_id)
```

---

## 6. Specialized Event Loggers

### **Authentication Events**
```python
from app.core.logging_utils import log_authentication_event

log_authentication_event(
    event_type='login',
    user_id='user_123',
    email='user@example.com',
    success=True,
    metadata={'ip_address': '192.168.1.1'}
)
```

**When to use:** Track all authentication-related activities.

**Example:**
```python
from app.core.logging_utils import log_authentication_event

class AuthService:
    async def login(self, email: str, password: str, ip_address: str):
        # Log login attempt
        log_authentication_event(
            event_type='login_attempt',
            email=email,
            success=False,  # Will update if successful
            metadata={'ip_address': ip_address}
        )

        user = await self.validate_credentials(email, password)
        if user:
            # Log successful login
            log_authentication_event(
                event_type='login',
                user_id=user.id,
                email=email,
                success=True,
                metadata={
                    'ip_address': ip_address,
                    'login_method': 'password',
                    'session_id': session.id
                }
            )
        else:
            # Log failed login
            log_authentication_event(
                event_type='login',
                email=email,
                success=False,
                reason='invalid_credentials',
                metadata={'ip_address': ip_address}
            )

    async def change_password(self, user_id: str, old_password: str, new_password: str):
        log_authentication_event(
            event_type='password_change',
            user_id=user_id,
            success=True,
            metadata={'forced_logout_sessions': 3}
        )
```

### **Authorization Events**
```python
from app.core.logging_utils import log_authorization_event

log_authorization_event(
    user_id='user_123',
    resource='admin_panel',
    action='access',
    allowed=False,
    permissions=['user:read'],
    reason='insufficient_permissions'
)
```

**When to use:** Track access control decisions and permission checks.

**Example:**
```python
from app.core.logging_utils import log_authorization_event

class PermissionService:
    def check_permission(self, user_id: str, resource: str, action: str):
        user_permissions = self.get_user_permissions(user_id)
        required_permission = f"{resource}:{action}"

        allowed = required_permission in user_permissions

        # Log authorization decision
        log_authorization_event(
            user_id=user_id,
            resource=resource,
            action=action,
            allowed=allowed,
            permissions=user_permissions,
            reason=None if allowed else 'missing_permission'
        )

        return allowed
```

---

## 7. Database Operation Logger

### **Database Logging**
```python
from app.core.logging_utils import log_database_operation

await log_database_operation(
    db=db_session,
    operation='CREATE',
    table='users',
    data={'name': 'John', 'email': 'john@example.com'}
)
```

**When to use:** Track database operations for debugging and auditing.

**Example:**
```python
from app.core.logging_utils import log_database_operation

class UserRepository:
    async def create_user(self, db: AsyncSession, user_data: dict):
        # Log the database operation
        await log_database_operation(
            db=db,
            operation='INSERT',
            table='users',
            data=user_data  # Sensitive fields automatically redacted
        )

        user = User(**user_data)
        db.add(user)
        await db.commit()
        return user

    async def update_user(self, db: AsyncSession, user_id: str, updates: dict):
        await log_database_operation(
            db=db,
            operation='UPDATE',
            table='users',
            conditions={'id': user_id},
            data=updates
        )

        await db.execute(
            update(User).where(User.id == user_id).values(**updates)
        )
        await db.commit()
```

---

## 8. Request Context Logger (Middleware)

### **Automatic Request Logging**
The `LoggingMiddleware` automatically captures request context.

**When it's used:** Automatically for all HTTP requests.

**What it captures:**
- Request ID (auto-generated)
- Client IP address
- User ID (from JWT token if authenticated)
- Request method and path
- Request timing
- Response status codes

**Example Output:**
```json
{
    "message": "Request started: POST /api/v1/auth/login",
    "request_id": "req_abc123",
    "ip_address": "192.168.1.100",
    "user_id": "anonymous",
    "method": "POST",
    "path": "/api/v1/auth/login"
}

{
    "message": "Request completed: POST /api/v1/auth/login - 200",
    "request_id": "req_abc123",
    "status_code": 200,
    "duration_ms": 234.5
}
```

---

## Logger Selection Decision Tree

```
Are you logging in a class?
├─ Yes → Use get_class_logger(self.__class__)
└─ No
   └─ Is this a service with business operations?
      ├─ Yes → Use ServiceLogger('service_name')
      └─ No
         └─ Do you need automatic function logging?
            ├─ Yes → Use @log_function_call decorator
            └─ No
               └─ Is this an authentication event?
                  ├─ Yes → Use log_authentication_event()
                  └─ No
                     └─ Is this an authorization check?
                        ├─ Yes → Use log_authorization_event()
                        └─ No
                           └─ Is this a database operation?
                              ├─ Yes → Use log_database_operation()
                              └─ No → Use global functions (info, error, etc.)
```

---

## Best Practices

### **1. Choose the Right Logger**
- **Global functions**: Quick, simple logging
- **Class loggers**: Any class-based component
- **Service loggers**: Business logic services
- **Decorators**: Automatic function tracking
- **Event loggers**: Specific event types (auth, authz, db)

### **2. Include Context**
```python
# Good
logger.info("Order processed",
           order_id=order.id,
           user_id=user.id,
           amount=order.total)

# Bad
logger.info("Order processed")
```

### **3. Use Appropriate Log Levels**
- **DEBUG**: Detailed diagnostic information
- **INFO**: General operational messages
- **WARNING**: Something unexpected but not an error
- **ERROR**: Error conditions that don't stop the application
- **CRITICAL**: Serious errors that may stop the application

### **4. Structure Your Data**
```python
# Good - structured data
logger.info("Payment failed",
           payment_id="pay_123",
           amount=100.00,
           error_code="INSUFFICIENT_FUNDS",
           retry_count=3)

# Bad - unstructured message
logger.info(f"Payment pay_123 for $100.00 failed with INSUFFICIENT_FUNDS after 3 retries")
```

### **5. Sanitize Sensitive Data**
The logging system automatically redacts fields named: `password`, `secret`, `token`, `key`, `hash`.

```python
# This is automatically sanitized
user_data = {
    'email': 'user@example.com',
    'password': 'secret123',  # Will be logged as '<REDACTED>'
    'name': 'John Doe'
}
logger.info("User created", user_data=user_data)
```

---

## Summary

| Logger Type | When to Use | Best For |
|-------------|-------------|----------|
| Global functions | Quick logging | Utility functions, simple scripts |
| Named loggers | Module-specific logging | Components, utilities |
| Class loggers | Class-based components | Services, repositories, controllers |
| Service logger | Business operations | Complex business logic |
| Function decorators | Automatic tracking | Performance monitoring, debugging |
| Auth events | Authentication activities | Login, logout, password changes |
| Authorization events | Access control | Permission checks, role validation |
| Database logger | Data operations | CRUD operations, queries |
| Request middleware | HTTP requests | Automatic (no manual usage needed) |

Choose the logger that best fits your use case and provides the most relevant context for debugging and monitoring your application.