"""
Rate Limiter Middleware

Implements IP-based rate limiting similar to Spring Cloud Gateway's
RequestRateLimiter with KeyResolver based on client IP.

Uses Redis as a backend for distributed rate limiting.
"""

import time
import hashlib
from typing import Optional, Tuple
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from app.core.cache import cache_manager
from app.config.settings import settings
from app.core.logging import logger


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using sliding window algorithm.

    Features:
    - IP-based rate limiting (like Spring's KeyResolver)
    - Configurable limits per time window
    - Redis-backed for distributed systems
    - Graceful degradation when Redis is unavailable
    - Skip rate limiting for public/health endpoints
    """

    def __init__(
        self,
        app,
        requests_per_window: int = 100,
        window_seconds: int = 60,
        skip_paths: Optional[list] = None,
    ):
        """
        Initialize rate limiter.

        Args:
            app: ASGI application
            requests_per_window: Maximum requests allowed per window
            window_seconds: Time window in seconds
            skip_paths: Paths to skip rate limiting (e.g., health checks)
        """
        super().__init__(app)
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.skip_paths = skip_paths or [
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/health",
            "/api/v1/external/",
            "/api/v1/public/",
        ]

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract client IP address from request.

        Handles X-Forwarded-For header for reverse proxy setups
        (similar to Spring's XForwardedRemoteAddressResolver).
        """
        # Check for X-Forwarded-For header (common with load balancers/proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain (original client)
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"

    def _get_rate_limit_key(self, client_ip: str, path: str) -> str:
        """
        Generate rate limit key for Redis.

        Uses hashed IP for privacy and includes path prefix for
        different limits on different endpoint groups.
        """
        # Hash IP for privacy
        ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]

        # Determine path group (e.g., /api/v1/enterprises -> enterprises)
        path_parts = path.strip("/").split("/")
        if len(path_parts) >= 3:
            path_group = path_parts[2]  # e.g., "enterprises", "users"
        else:
            path_group = "default"

        return f"rate_limit:{ip_hash}:{path_group}"

    def _should_skip(self, path: str) -> bool:
        """Check if the path should skip rate limiting."""
        for skip_path in self.skip_paths:
            if path.startswith(skip_path):
                return True
        return False

    async def _check_rate_limit(self, key: str) -> Tuple[bool, int, int]:
        """
        Check rate limit using sliding window algorithm.

        Returns:
            Tuple of (is_allowed, current_count, remaining_requests)
        """
        try:
            if not cache_manager.is_connected():
                # Allow request if Redis is unavailable (graceful degradation)
                logger.warning("Rate limiter: Redis unavailable, allowing request")
                return True, 0, self.requests_per_window

            current_time = int(time.time())
            window_start = current_time - self.window_seconds

            # Use Redis pipeline for atomic operations
            redis = cache_manager._redis
            if redis is None:
                return True, 0, self.requests_per_window

            # Sliding window implementation using sorted sets
            pipe = redis.pipeline()

            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)

            # Count current entries in window
            pipe.zcard(key)

            # Add current request timestamp
            pipe.zadd(key, {str(current_time): current_time})

            # Set TTL on the key
            pipe.expire(key, self.window_seconds * 2)

            results = await pipe.execute()
            current_count = results[1]  # zcard result

            remaining = max(0, self.requests_per_window - current_count - 1)
            is_allowed = current_count < self.requests_per_window

            return is_allowed, current_count + 1, remaining

        except Exception as e:
            logger.error("Rate limiter error", error=str(e))
            # Allow request on error (graceful degradation)
            return True, 0, self.requests_per_window

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process request through rate limiter."""
        path = request.url.path

        # Skip rate limiting for certain paths
        if self._should_skip(path):
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Generate rate limit key
        key = self._get_rate_limit_key(client_ip, path)

        # Check rate limit
        is_allowed, current_count, remaining = await self._check_rate_limit(key)

        if not is_allowed:
            logger.warning(
                "Rate limit exceeded",
                client_ip=client_ip,
                path=path,
                current_count=current_count,
                limit=self.requests_per_window,
            )
            return JSONResponse(
                status_code=HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": self.window_seconds,
                },
                headers={
                    "X-RateLimit-Limit": str(self.requests_per_window),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + self.window_seconds),
                    "Retry-After": str(self.window_seconds),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_window)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(
            int(time.time()) + self.window_seconds
        )

        return response


class EndpointRateLimiter:
    """
    Endpoint-specific rate limiter decorator.

    Allows different rate limits for specific endpoints.
    """

    def __init__(
        self,
        requests_per_window: int = 10,
        window_seconds: int = 60,
    ):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds

    async def check(self, request: Request, endpoint_name: str) -> bool:
        """Check if request is within rate limit for specific endpoint."""
        try:
            if not cache_manager.is_connected():
                return True

            client_ip = request.headers.get(
                "x-forwarded-for",
                request.headers.get("x-real-ip", request.client.host if request.client else "unknown")
            )
            if "," in client_ip:
                client_ip = client_ip.split(",")[0].strip()

            ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()[:16]
            key = f"endpoint_rate:{ip_hash}:{endpoint_name}"

            current_time = int(time.time())
            window_start = current_time - self.window_seconds

            redis = cache_manager._redis
            if redis is None:
                return True

            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(current_time): current_time})
            pipe.expire(key, self.window_seconds * 2)

            results = await pipe.execute()
            current_count = results[1]

            return current_count < self.requests_per_window

        except Exception:
            return True
