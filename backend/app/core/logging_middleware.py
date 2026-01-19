import uuid
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import set_request_context, clear_request_context, get_logger
from app.services.token_service import token_service

logger = get_logger('middleware')


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to capture request context for logging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())

        # Extract client IP address
        ip_address = self._get_client_ip(request)

        # Extract user information from token if present
        user_id = await self._get_user_id_from_request(request)

        # Start time for request duration
        start_time = time.time()

        # Set request context for logging
        set_request_context(
            request_id=request_id,
            ip_address=ip_address,
            user_id=user_id,
            method=request.method,
            path=request.url.path,
            user_agent=request.headers.get('user-agent', 'N/A')
        )

        # Log request start
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            request_id=request_id,
            ip_address=ip_address,
            user_id=user_id,
            user_agent=request.headers.get('user-agent', 'N/A')
        )

        try:
            # Process request
            response = await call_next(request)

            # Calculate request duration
            duration = time.time() - start_time

            # Log successful request completion
            logger.info(
                f"Request completed: {request.method} {request.url.path} - {response.status_code}",
                request_id=request_id,
                status_code=response.status_code,
                duration_ms=round(duration * 1000, 2),
                ip_address=ip_address,
                user_id=user_id
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            # Calculate request duration for failed requests
            duration = time.time() - start_time

            # Log request failure
            logger.error(
                f"Request failed: {request.method} {request.url.path} - {str(e)}",
                request_id=request_id,
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=round(duration * 1000, 2),
                ip_address=ip_address,
                user_id=user_id
            )

            # Re-raise the exception
            raise

        finally:
            # Clear request context
            clear_request_context()

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request headers."""
        # Check for forwarded headers (when behind proxy/load balancer)
        forwarded_for = request.headers.get('x-forwarded-for')
        if forwarded_for:
            # Get first IP in the chain
            return forwarded_for.split(',')[0].strip()

        # Check for real IP header
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip.strip()

        # Fall back to direct client host
        if request.client:
            return request.client.host

        return 'unknown'

    async def _get_user_id_from_request(self, request: Request) -> str:
        """Extract user ID from JWT token if present."""
        try:
            # Get authorization header
            auth_header = request.headers.get('authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return 'anonymous'

            # Extract token
            token = auth_header.split(' ', 1)[1]

            # Verify token and get payload
            payload = token_service.verify_token(token)
            if payload and payload.sub:
                return payload.sub

        except Exception:
            # If any error occurs during token verification, treat as anonymous
            pass

        return 'anonymous'


class RequestLogFilter:
    """Filter to exclude certain requests from detailed logging."""

    def __init__(self, excluded_paths=None, excluded_methods=None):
        self.excluded_paths = excluded_paths or [
            '/health',
            '/docs',
            '/openapi.json',
            '/favicon.ico'
        ]
        self.excluded_methods = excluded_methods or []

    def should_log(self, request: Request) -> bool:
        """Determine if request should be logged."""
        # Check if path should be excluded
        if request.url.path in self.excluded_paths:
            return False

        # Check if method should be excluded
        if request.method in self.excluded_methods:
            return False

        return True


# Utility functions for request logging
async def log_request_data(request: Request, logger_instance=None):
    """Log request data including headers and body (if applicable)."""
    if logger_instance is None:
        logger_instance = logger

    # Log headers (excluding sensitive ones)
    safe_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ['authorization', 'cookie', 'x-api-key']
    }

    logger_instance.debug(
        "Request headers",
        headers=safe_headers,
        content_type=request.headers.get('content-type'),
        content_length=request.headers.get('content-length')
    )

    # Log query parameters
    if request.query_params:
        logger_instance.debug(
            "Request query parameters",
            query_params=dict(request.query_params)
        )


async def log_response_data(response: Response, logger_instance=None):
    """Log response data."""
    if logger_instance is None:
        logger_instance = logger

    logger_instance.debug(
        "Response data",
        status_code=response.status_code,
        content_type=response.headers.get('content-type'),
        content_length=response.headers.get('content-length')
    )