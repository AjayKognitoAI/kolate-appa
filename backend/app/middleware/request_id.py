"""
Request ID Middleware

Generates and propagates unique request IDs for request tracing
across distributed systems.

Similar to Spring Cloud Sleuth/Zipkin correlation IDs.
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to generate and propagate request IDs.

    Features:
    - Generates unique request ID for each request
    - Accepts existing X-Request-ID header from upstream services
    - Adds request ID to response headers
    - Provides correlation ID for distributed tracing
    """

    REQUEST_ID_HEADER = "x-request-id"
    CORRELATION_ID_HEADER = "x-correlation-id"

    def __init__(
        self,
        app,
        header_name: str = "x-request-id",
        generate_if_missing: bool = True,
    ):
        """
        Initialize RequestID middleware.

        Args:
            app: ASGI application
            header_name: Header name for request ID
            generate_if_missing: Generate new ID if not present in request
        """
        super().__init__(app)
        self.header_name = header_name
        self.generate_if_missing = generate_if_missing

    def _generate_request_id(self) -> str:
        """Generate a unique request ID."""
        return str(uuid.uuid4())

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Process request with request ID tracking.
        """
        # Get or generate request ID
        request_id = request.headers.get(self.header_name)

        if not request_id and self.generate_if_missing:
            request_id = self._generate_request_id()

        # Get correlation ID (separate from request ID for distributed tracing)
        correlation_id = request.headers.get(
            self.CORRELATION_ID_HEADER,
            request_id  # Use request ID as correlation ID if not provided
        )

        # Store in request state for access in handlers
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id

        # Process request
        response = await call_next(request)

        # Add request ID to response
        if request_id:
            response.headers[self.REQUEST_ID_HEADER] = request_id
            response.headers[self.CORRELATION_ID_HEADER] = correlation_id

        return response


def get_request_id(request: Request) -> str:
    """
    Get the request ID from the current request.

    Can be used in route handlers for logging and tracing.
    """
    if hasattr(request.state, "request_id"):
        return request.state.request_id
    return request.headers.get("x-request-id", str(uuid.uuid4()))


def get_correlation_id(request: Request) -> str:
    """
    Get the correlation ID from the current request.

    Useful for distributed tracing across services.
    """
    if hasattr(request.state, "correlation_id"):
        return request.state.correlation_id
    return request.headers.get("x-correlation-id", get_request_id(request))
