# GigConnect Configuration Guide

This document provides a comprehensive guide to configuring the MindTrip GigConnect backend application.

## Environment Files

The project uses multiple environment files for different deployment scenarios:

- **`.env`** - Local development configuration
- **`.env.example`** - Template with all available options
- **`.env.docker`** - Docker-specific configuration
- **`docker-compose.yml`** - Development environment variables
- **`docker-compose.prod.yml`** - Production environment variables

## Configuration Categories

### Database Configuration
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mindtrip_gigconnect
DATABASE_USER=username
DATABASE_PASSWORD=password
```

### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=optional_password
CACHE_TYPE=redis  # or 'memory'
```

### Application Configuration
```bash
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development  # or 'production'
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

### Authentication Configuration
```bash
REFRESH_TOKEN_EXPIRE_HOURS=168  # 7 days
SESSION_COOKIE_NAME=session_id
SESSION_COOKIE_SECURE=true  # false for development
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict  # or 'lax' for development
INCLUDE_SESSION_IN_TOKEN=true
```

### CORS Configuration
```bash
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:8080"]
ALLOWED_METHODS=["GET", "POST", "PUT", "DELETE"]
ALLOWED_HEADERS=["*"]
```

### Logging Configuration
```bash
# Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL=INFO

# Enable/disable file logging
ENABLE_FILE_LOGGING=true

# Directory for log files (relative to project root)
LOG_DIRECTORY=logs

# Log format: 'json' for structured logs, 'text' for human-readable
LOG_FORMAT=json

# Maximum size of main log file in bytes (10MB default)
LOG_MAX_FILE_SIZE=10485760

# Number of backup log files to keep
LOG_BACKUP_COUNT=5

# Maximum size of error log file in bytes (5MB default)
LOG_ERROR_FILE_SIZE=5242880

# Number of backup error log files to keep
LOG_ERROR_BACKUP_COUNT=3
```

## Logging Configuration Details

### Log Levels
- **DEBUG**: Detailed diagnostic information
- **INFO**: General operational messages
- **WARNING**: Warning messages for unexpected but not critical events
- **ERROR**: Error conditions that don't stop the application
- **CRITICAL**: Serious errors that may stop the application

### Log Formats

#### JSON Format (Recommended for Production)
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

#### Text Format (Recommended for Development)
```
2025-09-18T10:30:45.123456+00:00 [INFO] authentication_service.py:142 (AuthenticationService.authenticate_user) [req_abc123] [user_12345@192.168.1.100] User authenticated successfully
```

### Log Files Created

When file logging is enabled, the system creates:

1. **`logs/gigconnect.log`** - All application logs (DEBUG and above)
2. **`logs/gigconnect-errors.log`** - Error logs only (ERROR and above)
3. **`logs/gigconnect-auth.log`** - Authentication events (INFO and above)

### File Rotation

Log files automatically rotate when they reach the configured size:
- Main log: 10MB by default, keeps 5 backups
- Error log: 5MB by default, keeps 3 backups
- Auth log: 5MB by default, keeps 3 backups

## Environment-Specific Settings

### Development (.env)
- `LOG_LEVEL=DEBUG` - Show all logs
- `LOG_FORMAT=text` - Human-readable format
- `DEBUG=true` - Enable debug mode
- `SESSION_COOKIE_SECURE=false` - Allow HTTP cookies

### Docker Development (.env.docker)
- `LOG_FORMAT=json` - Structured logs for container environments
- `DATABASE_HOST=db` - Docker service name
- `REDIS_HOST=redis` - Docker service name

### Production (docker-compose.prod.yml)
- `LOG_LEVEL=INFO` - Reduce log verbosity
- `LOG_FORMAT=json` - Structured logs for aggregation
- `DEBUG=false` - Disable debug mode
- `SESSION_COOKIE_SECURE=true` - Require HTTPS cookies

## Configuration Validation

The application validates configuration values:

- **LOG_LEVEL**: Must be one of DEBUG, INFO, WARNING, ERROR, CRITICAL
- **LOG_FORMAT**: Must be either 'json' or 'text'
- **CORS Origins**: Automatically parsed from comma-separated strings
- **File Sizes**: Must be positive integers (bytes)

## Runtime Configuration

You can also update logging configuration at runtime:

```python
from app.core.logging import configure_logging

# Switch to text format for debugging
configure_logging(log_format='text', log_level='DEBUG')

# Switch back to JSON for production
configure_logging(log_format='json', log_level='INFO')
```

## Docker Integration

### Volume Mapping
```yaml
volumes:
  - ./logs:/app/logs  # Maps container logs to host
```

### Environment Variables
All configuration is passed via environment variables in Docker Compose files, making it easy to adjust settings without rebuilding containers.

## Security Considerations

- **SECRET_KEY**: Use a strong, unique key for production
- **Database Passwords**: Use strong passwords and consider using Docker secrets
- **CORS Origins**: Restrict to known frontend domains in production
- **Session Cookies**: Enable secure flags in production (HTTPS)
- **Log Files**: Ensure log files don't contain sensitive information (automatically redacted)

## Troubleshooting

### Common Issues

1. **Log files not created**: Check `ENABLE_FILE_LOGGING=true` and directory permissions
2. **Invalid log format**: Ensure `LOG_FORMAT` is either 'json' or 'text'
3. **CORS errors**: Verify `ALLOWED_ORIGINS` includes your frontend URL
4. **Database connection**: Check all database environment variables are set correctly

### Checking Current Configuration

```python
from app.core.logging import get_logging_config
config = get_logging_config()
print(config)
```

This will show the current logging configuration including format, level, and file settings.