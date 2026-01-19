import logging
import sys
import inspect
import json
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from contextvars import ContextVar
from pathlib import Path
from logging.handlers import RotatingFileHandler

request_context: ContextVar[Dict[str, Any]] = ContextVar('request_context', default={})


class ContextualFormatter(logging.Formatter):
    """Custom formatter that includes class name, line number, timestamp, IP address, etc."""

    def __init__(self, format_type: str = 'json', *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.format_type = format_type.lower()

    def format(self, record: logging.LogRecord) -> str:
        # Get current timestamp
        timestamp = datetime.now(timezone.utc).isoformat()

        # Get request context
        context = request_context.get({})
        ip_address = context.get('ip_address', 'N/A')
        user_id = context.get('user_id', 'N/A')
        request_id = context.get('request_id', 'N/A')

        # Get caller information
        frame = self._get_caller_frame()
        class_name = self._get_class_name(frame)
        file_name = Path(frame.f_code.co_filename).name if frame else 'unknown.py'
        line_number = frame.f_lineno if frame else 0
        function_name = frame.f_code.co_name if frame else 'unknown'

        if self.format_type == 'json':
            return self._format_json(record, timestamp, ip_address, user_id, request_id,
                                   class_name, function_name, file_name, line_number)
        else:
            return self._format_text(record, timestamp, ip_address, user_id, request_id,
                                   class_name, function_name, file_name, line_number)

    def _format_json(self, record, timestamp, ip_address, user_id, request_id,
                     class_name, function_name, file_name, line_number) -> str:
        """Format log entry as JSON."""
        log_entry = {
            'timestamp': timestamp,
            'level': record.levelname,
            'logger': record.name,
            'class_name': class_name,
            'function_name': function_name,
            'file_name': file_name,
            'line_number': line_number,
            'ip_address': ip_address,
            'user_id': user_id,
            'request_id': request_id,
            'message': record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        # Add extra fields from record
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'getMessage']:
                log_entry['extra'] = log_entry.get('extra', {})
                log_entry['extra'][key] = value

        return json.dumps(log_entry, default=str, ensure_ascii=False)

    def _format_text(self, record, timestamp, ip_address, user_id, request_id,
                     class_name, function_name, file_name, line_number) -> str:
        """Format log entry as human-readable text."""
        # Build the base log line
        parts = [
            timestamp,
            f"[{record.levelname}]",
            f"{file_name}:{line_number}",
            f"({class_name}.{function_name})" if class_name != 'N/A' else f"({function_name})",
            f"[{request_id}]" if request_id != 'N/A' else "",
            f"[{user_id}@{ip_address}]" if user_id != 'N/A' and ip_address != 'N/A' else "",
            record.getMessage()
        ]

        # Filter out empty parts
        formatted_parts = [part for part in parts if part]
        base_message = " ".join(formatted_parts)

        # Add extra fields if any
        extra_fields = []
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'getMessage']:
                extra_fields.append(f"{key}={value}")

        if extra_fields:
            base_message += f" | {', '.join(extra_fields)}"

        # Add exception info if present
        if record.exc_info:
            base_message += f"\n{self.formatException(record.exc_info)}"

        return base_message

    def _get_caller_frame(self):
        """Get the frame of the actual caller (not the logging framework)."""
        current_frame = inspect.currentframe()
        try:
            # Walk up the stack to find the first frame outside the logging module
            frame = current_frame
            while frame:
                frame = frame.f_back
                if frame and not self._is_logging_frame(frame):
                    return frame
            return None
        finally:
            del current_frame

    def _is_logging_frame(self, frame) -> bool:
        """Check if the frame belongs to the logging framework."""
        filename = frame.f_code.co_filename
        return (
            'logging' in filename.lower() or
            filename.endswith('logging.py') or
            frame.f_code.co_name in ['debug', 'info', 'warning', 'error', 'critical', 'log']
        )

    def _get_class_name(self, frame) -> str:
        """Extract class name from frame if available."""
        if not frame:
            return 'N/A'

        # Try to get class from 'self' in locals
        frame_locals = frame.f_locals
        if 'self' in frame_locals:
            return frame_locals['self'].__class__.__name__

        # Try to get class from 'cls' in locals (class methods)
        if 'cls' in frame_locals:
            return frame_locals['cls'].__name__

        # If no class found, use module name
        module_name = frame.f_globals.get('__name__', 'unknown')
        if module_name != 'unknown':
            return module_name.split('.')[-1]

        return 'N/A'


class LogConfig:
    """Configuration class for logging settings."""

    def __init__(self):
        self.log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
        self.enable_file_logging = os.getenv('ENABLE_FILE_LOGGING', 'true').lower() == 'true'
        self.log_directory = Path(os.getenv('LOG_DIRECTORY', 'logs'))
        self.log_format = os.getenv('LOG_FORMAT', 'json').lower()  # 'json' or 'text'
        self.max_file_size = int(os.getenv('LOG_MAX_FILE_SIZE', '10485760'))  # 10MB
        self.backup_count = int(os.getenv('LOG_BACKUP_COUNT', '5'))
        self.error_file_size = int(os.getenv('LOG_ERROR_FILE_SIZE', '5242880'))  # 5MB
        self.error_backup_count = int(os.getenv('LOG_ERROR_BACKUP_COUNT', '3'))


# Global configuration
_log_config = LogConfig()


class GigConnectLogger:
    """Main logger class for the GigConnect application."""

    def __init__(self, name: str = None):
        self.name = name or 'gigconnect'
        self.logger = logging.getLogger(self.name)
        self._setup_logger()

    def _setup_logger(self):
        """Configure the logger with custom formatter."""
        if self.logger.handlers:
            return  # Already configured

        # Set log level from configuration
        log_level = getattr(logging, _log_config.log_level, logging.INFO)
        self.logger.setLevel(log_level)

        # Create formatters
        json_formatter = ContextualFormatter(format_type='json')
        text_formatter = ContextualFormatter(format_type='text')

        # Choose formatter based on configuration
        console_formatter = json_formatter if _log_config.log_format == 'json' else text_formatter
        file_formatter = json_formatter  # Files always use JSON for consistency

        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

        # Create file handler with rotation if enabled
        if _log_config.enable_file_logging:
            self._setup_file_handler(file_formatter)

        # Prevent propagation to root logger
        self.logger.propagate = False

    def _setup_file_handler(self, formatter):
        """Setup rotating file handler for logging."""
        try:
            # Create logs directory if it doesn't exist
            _log_config.log_directory.mkdir(exist_ok=True)

            # Create rotating file handler for all logs
            file_handler = RotatingFileHandler(
                filename=_log_config.log_directory / "gigconnect.log",
                maxBytes=_log_config.max_file_size,
                backupCount=_log_config.backup_count,
                encoding='utf-8'
            )

            file_handler.setLevel(logging.DEBUG)  # File logs everything
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

            # Separate file for errors only
            error_handler = RotatingFileHandler(
                filename=_log_config.log_directory / "gigconnect-errors.log",
                maxBytes=_log_config.error_file_size,
                backupCount=_log_config.error_backup_count,
                encoding='utf-8'
            )

            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(formatter)
            self.logger.addHandler(error_handler)

            # Add authentication-specific log file
            auth_handler = RotatingFileHandler(
                filename=_log_config.log_directory / "gigconnect-auth.log",
                maxBytes=_log_config.error_file_size,
                backupCount=_log_config.error_backup_count,
                encoding='utf-8'
            )

            # Custom filter for authentication events
            class AuthFilter(logging.Filter):
                def filter(self, record):
                    return hasattr(record, 'event_type') or 'authentication' in record.name.lower()

            auth_handler.addFilter(AuthFilter())
            auth_handler.setLevel(logging.INFO)
            auth_handler.setFormatter(formatter)
            self.logger.addHandler(auth_handler)

        except Exception as e:
            # If file logging fails, log to console and continue
            console_fallback = logging.StreamHandler(sys.stderr)
            console_fallback.setFormatter(formatter)
            console_fallback.emit(logging.LogRecord(
                name=self.name,
                level=logging.WARNING,
                pathname=__file__,
                lineno=0,
                msg=f"Failed to setup file logging: {e}",
                args=(),
                exc_info=None
            ))

    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self.logger.debug(message, extra=kwargs)

    def info(self, message: str, **kwargs):
        """Log info message."""
        self.logger.info(message, extra=kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self.logger.warning(message, extra=kwargs)

    def error(self, message: str, **kwargs):
        """Log error message."""
        self.logger.error(message, extra=kwargs)

    def critical(self, message: str, **kwargs):
        """Log critical message."""
        self.logger.critical(message, extra=kwargs)

    def exception(self, message: str, **kwargs):
        """Log exception with traceback."""
        self.logger.exception(message, extra=kwargs)


# Configuration management
def configure_logging(
    log_level: str = None,
    enable_file_logging: bool = None,
    log_directory: str = None,
    log_format: str = None,
    max_file_size: int = None,
    backup_count: int = None
):
    """Update logging configuration at runtime."""
    global _log_config

    if log_level:
        _log_config.log_level = log_level.upper()
    if enable_file_logging is not None:
        _log_config.enable_file_logging = enable_file_logging
    if log_directory:
        _log_config.log_directory = Path(log_directory)
    if log_format:
        _log_config.log_format = log_format.lower()
    if max_file_size:
        _log_config.max_file_size = max_file_size
    if backup_count:
        _log_config.backup_count = backup_count


def get_logging_config() -> Dict[str, Any]:
    """Get current logging configuration."""
    return {
        'log_level': _log_config.log_level,
        'enable_file_logging': _log_config.enable_file_logging,
        'log_directory': str(_log_config.log_directory),
        'log_format': _log_config.log_format,
        'max_file_size': _log_config.max_file_size,
        'backup_count': _log_config.backup_count,
        'error_file_size': _log_config.error_file_size,
        'error_backup_count': _log_config.error_backup_count
    }


# Context management functions
def set_request_context(**kwargs):
    """Set request context for logging."""
    current_context = request_context.get({})
    current_context.update(kwargs)
    request_context.set(current_context)


def get_request_context() -> Dict[str, Any]:
    """Get current request context."""
    return request_context.get({})


def clear_request_context():
    """Clear request context."""
    request_context.set({})


# Logger factory functions
def get_logger(name: str = None) -> GigConnectLogger:
    """Get a logger instance."""
    return GigConnectLogger(name)


def get_class_logger(cls) -> GigConnectLogger:
    """Get a logger for a specific class."""
    class_name = cls.__name__ if hasattr(cls, '__name__') else str(cls)
    module_name = getattr(cls, '__module__', 'unknown')
    logger_name = f"{module_name}.{class_name}"
    return GigConnectLogger(logger_name)


# Global logger instance
logger = GigConnectLogger('gigconnect')


# Convenience functions using global logger
def debug(message: str, **kwargs):
    """Log debug message using global logger."""
    logger.debug(message, **kwargs)


def info(message: str, **kwargs):
    """Log info message using global logger."""
    logger.info(message, **kwargs)


def warning(message: str, **kwargs):
    """Log warning message using global logger."""
    logger.warning(message, **kwargs)


def error(message: str, **kwargs):
    """Log error message using global logger."""
    logger.error(message, **kwargs)


def critical(message: str, **kwargs):
    """Log critical message using global logger."""
    logger.critical(message, **kwargs)


def exception(message: str, **kwargs):
    """Log exception using global logger."""
    logger.exception(message, **kwargs)