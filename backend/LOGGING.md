# GigConnect Logging System

A comprehensive logging system that provides structured JSON logging with class name, line number, timestamp, IP address, log level, and message as requested.

## Features

✅ **Class name and line number extraction** - Automatically captures the class and line where the log was called
✅ **Timestamp in ISO format** - Every log includes precise UTC timestamp
✅ **IP address from request context** - Captures client IP from HTTP requests
✅ **Structured JSON format** - All logs are output as structured JSON
✅ **Request context tracking** - Middleware automatically tracks request information
✅ **Performance monitoring** - Built-in performance decorators
✅ **Authentication/Authorization logging** - Specialized logging for auth events
✅ **Function call tracking** - Decorators for automatic function entry/exit logging

## Quick Start

### Basic Logging

```python
from app.core.logging import info, debug, warning, error, critical

# Simple logging
info("User action completed", user_id="12345")
error("Database connection failed", error_code="DB001")
```

### Class-Based Logging

```python
from app.core.logging import get_class_logger

class MyService:
    def __init__(self):
        self.logger = get_class_logger(self.__class__)

    def process_data(self):
        self.logger.info("Processing started", operation="data_sync")
```

### Function Call Logging (Decorator)

```python
from app.core.logging_utils import log_function_call

class UserService:
    @log_function_call(log_args=True, log_duration=True)
    async def create_user(self, user_data: dict):
        # Function entry/exit automatically logged
        return user
```

### Performance Monitoring

```python
from app.core.logging_utils import log_performance

@log_performance(threshold_ms=500.0)
async def slow_operation():
    # Warns if operation takes longer than 500ms
    pass
```

### Authentication Event Logging

```python
from app.core.logging_utils import log_authentication_event

# Successful login
log_authentication_event(
    event_type='login',
    user_id='user_123',
    email='user@example.com',
    success=True,
    metadata={'ip_address': '192.168.1.1', 'session_id': 'sess_456'}
)

# Failed login
log_authentication_event(
    event_type='login',
    email='user@example.com',
    success=False,
    reason='invalid_password',
    metadata={'ip_address': '192.168.1.1'}
)
```

### Service-Level Logging

```python
from app.core.logging_utils import ServiceLogger

class AuthService:
    def __init__(self):
        self.service_logger = ServiceLogger('auth_service')

    async def login_user(self, email, password):
        self.service_logger.log_service_start('login_user', email=email)

        try:
            # ... business logic ...
            self.service_logger.log_service_success('login_user', user_id=user.id)
        except Exception as e:
            self.service_logger.log_service_error('login_user', e)
```

## Log Format

Each log entry includes:

```json
{
    "timestamp": "2025-09-18T10:30:45.123456+00:00",
    "level": "INFO",
    "logger": "gigconnect.authentication_service",
    "class_name": "AuthenticationService",
    "function_name": "authenticate_user",
    "file_name": "authentication_service.py",
    "line_number": 142,
    "ip_address": "192.168.1.100",
    "user_id": "user_12345",
    "request_id": "req_abc123",
    "message": "User authenticated successfully",
    "extra": {
        "session_id": "sess_xyz789",
        "duration_ms": 45.2
    }
}
```

## Integration Points

### 1. Middleware Integration

The `LoggingMiddleware` is automatically added to FastAPI and captures:
- Request ID (auto-generated UUID)
- Client IP address (with proxy support)
- User ID from JWT token (if authenticated)
- Request method and path
- Request/response timing

### 2. Authentication Service Integration

The `AuthenticationService` now includes comprehensive logging for:
- User registration attempts
- Login attempts (success/failure with reasons)
- Password changes
- Session operations
- Token operations

### 3. Route Handler Integration

Add logging to any route handler:

```python
from app.core.logging import get_logger

logger = get_logger('user_routes')

@router.get("/users/{user_id}")
async def get_user(user_id: str):
    logger.info("Fetching user", user_id=user_id)
    # ... route logic ...
```

## Configuration

The logging system supports both console and file logging with configurable options:

### Environment Variables

Configure logging behavior using these environment variables:

```bash
# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Enable/disable file logging
ENABLE_FILE_LOGGING=true

# Directory for log files
LOG_DIRECTORY=logs

# Log format: 'json' for structured JSON logs, 'text' for human-readable format
LOG_FORMAT=json

# Main log file size limit (bytes)
LOG_MAX_FILE_SIZE=10485760  # 10MB

# Number of backup files to keep
LOG_BACKUP_COUNT=5

# Error log file size limit (bytes)
LOG_ERROR_FILE_SIZE=5242880  # 5MB

# Number of error backup files to keep
LOG_ERROR_BACKUP_COUNT=3
```

### Runtime Configuration

You can also configure logging at runtime:

```python
from app.core.logging import configure_logging, get_logging_config

# Update logging configuration
configure_logging(
    log_level='DEBUG',
    enable_file_logging=True,
    log_directory='custom_logs',
    log_format='text',  # Switch to human-readable format
    max_file_size=20 * 1024 * 1024,  # 20MB
    backup_count=10
)

# Get current configuration
config = get_logging_config()
print(config['log_format'])  # 'text'
```

### Log Files

When file logging is enabled, the system creates several log files:

- `logs/gigconnect.log` - All application logs (rotated)
- `logs/gigconnect-errors.log` - Error level logs only (rotated)
- `logs/gigconnect-auth.log` - Authentication events only (rotated)

Files are automatically rotated when they reach the configured size limit.

### Log Format Options

#### JSON Format (Default)
Structured JSON logs ideal for log aggregation systems:

```json
{
    "timestamp": "2025-09-18T10:30:45.123456+00:00",
    "level": "INFO",
    "class_name": "AuthenticationService",
    "function_name": "authenticate_user",
    "file_name": "authentication_service.py",
    "line_number": 142,
    "ip_address": "192.168.1.100",
    "user_id": "user_12345",
    "request_id": "req_abc123",
    "message": "User authenticated successfully"
}
```

#### Text Format
Human-readable logs for development and debugging:

```
2025-09-18T10:30:45.123456+00:00 [INFO] authentication_service.py:142 (AuthenticationService.authenticate_user) [req_abc123] [user_12345@192.168.1.100] User authenticated successfully
```

### Default Settings

- Console output: INFO level and above
- Console format: Configurable (JSON or text via LOG_FORMAT)
- File output: DEBUG level and above (all logs, always JSON)
- Error file: ERROR level and above only (JSON)
- Auth file: INFO level authentication events (JSON)
- Request context: Automatically managed by middleware
- Performance thresholds: Configurable per operation

### Docker Integration

Log files are automatically accessible on the host system:

```yaml
# docker-compose.yml
volumes:
  - ./logs:/app/logs  # Maps container logs to host ./logs directory
```

Access logs from your host system:
```bash
# View live logs
tail -f logs/gigconnect.log

# View errors only
tail -f logs/gigconnect-errors.log

# View authentication events
tail -f logs/gigconnect-auth.log

# Parse JSON logs with jq
tail -f logs/gigconnect.log | jq '.message'
```

## Testing

Run the demonstration script to see all logging features:

```bash
python test_logging.py
```

This will show examples of all logging patterns and output formats.

## Files Structure

```
app/core/
├── logging.py              # Core logging module with formatter
├── logging_middleware.py   # FastAPI middleware for request context
├── logging_utils.py        # Decorators and utility functions
└── ...
```

The logging system is now fully integrated into the authentication service and ready to be used throughout the application.