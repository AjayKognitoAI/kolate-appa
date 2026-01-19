"""
API Gateway Middleware

Replicates Spring Cloud Gateway's JwtAuthenticationFilter functionality:
- Extracts user-id and org-id from JWT tokens
- Adds headers for downstream services
- Handles public/external paths without authentication
- Provides request context for multi-tenancy
"""

import re
from typing import Optional, Set
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED

from app.core.auth0 import verify_token
from app.core.logging import logger


class APIGatewayMiddleware(BaseHTTPMiddleware):
    """
    API Gateway middleware that provides authentication header propagation.

    This middleware replicates the behavior of Spring Cloud Gateway's
    JwtAuthenticationFilter by:
    1. Extracting JWT tokens from Authorization headers
    2. Validating tokens with Auth0
    3. Extracting user_id (sub claim) and org_id from token
    4. Adding user-id and org-id headers for downstream processing

    Features:
    - Skip authentication for public/external paths
    - Graceful handling of invalid tokens
    - Request context population for multi-tenancy
    """

    # Paths that don't require authentication (like Spring's permitAll())
    PUBLIC_PATHS: Set[str] = {
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    # Path prefixes that don't require authentication
    PUBLIC_PATH_PREFIXES = [
        "/api/v1/external/",
        "/api/v1/public/",
        "/api/v1/health",
        "/api/v1/auth/callback",
        "/api/v1/auth/login",
    ]

    # Custom claim for organization ID in Auth0 token
    ORG_ID_CLAIM = "https://kolate.ai/org_id"

    def __init__(
        self,
        app,
        public_paths: Optional[Set[str]] = None,
        public_path_prefixes: Optional[list] = None,
        enforce_auth: bool = True,
    ):
        """
        Initialize the API Gateway middleware.

        Args:
            app: ASGI application
            public_paths: Exact paths that don't require authentication
            public_path_prefixes: Path prefixes that don't require authentication
            enforce_auth: If True, return 401 for invalid tokens. If False, proceed without user context.
        """
        super().__init__(app)
        self.public_paths = public_paths or self.PUBLIC_PATHS
        self.public_path_prefixes = public_path_prefixes or self.PUBLIC_PATH_PREFIXES
        self.enforce_auth = enforce_auth

    def _is_public_path(self, path: str) -> bool:
        """Check if the path is public and doesn't require authentication."""
        # Exact match
        if path in self.public_paths:
            return True

        # Prefix match
        for prefix in self.public_path_prefixes:
            if path.startswith(prefix):
                return True

        return False

    def _extract_bearer_token(self, request: Request) -> Optional[str]:
        """Extract Bearer token from Authorization header."""
        auth_header = request.headers.get("authorization")
        if not auth_header:
            return None

        # Handle "Bearer <token>" format
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

        return None

    def _extract_org_id_from_token(self, payload: dict) -> Optional[str]:
        """
        Extract organization ID from token payload.

        Checks multiple possible locations:
        1. Custom claim (https://kolate.ai/org_id)
        2. app_metadata.org_id
        3. user_metadata.org_id
        """
        # Check custom claim
        org_id = payload.get(self.ORG_ID_CLAIM)
        if org_id:
            return org_id

        # Check app_metadata
        app_metadata = payload.get("app_metadata", {})
        if app_metadata and "org_id" in app_metadata:
            return app_metadata["org_id"]

        # Check user_metadata
        user_metadata = payload.get("user_metadata", {})
        if user_metadata and "org_id" in user_metadata:
            return user_metadata["org_id"]

        # Check organization claim (Auth0 Organizations)
        org = payload.get("org_id")
        if org:
            return org

        return None

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Process request through API Gateway authentication.

        Similar to Spring's JwtAuthenticationFilter:
        1. Skip auth for public paths
        2. Validate JWT token
        3. Extract user info and org info
        4. Add headers for downstream services
        """
        path = request.url.path

        # Skip authentication for public paths
        if self._is_public_path(path):
            return await call_next(request)

        # Extract Bearer token
        token = self._extract_bearer_token(request)

        if not token:
            if self.enforce_auth:
                logger.warning("Missing authorization token", path=path)
                return JSONResponse(
                    status_code=HTTP_401_UNAUTHORIZED,
                    content={"detail": "Authorization token required"},
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # Proceed without authentication context
            return await call_next(request)

        try:
            # Verify token with Auth0
            payload = await verify_token(token)

            if payload is None:
                if self.enforce_auth:
                    logger.warning("Invalid authorization token", path=path)
                    return JSONResponse(
                        status_code=HTTP_401_UNAUTHORIZED,
                        content={"detail": "Invalid or expired token"},
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                return await call_next(request)

            # Extract user_id (sub claim)
            user_id = payload.sub

            # Extract org_id from token
            raw_payload = payload.model_dump()
            org_id = self._extract_org_id_from_token(raw_payload)

            # Create new scope with additional headers
            # This adds the headers to the request for downstream handlers
            new_scope = dict(request.scope)
            new_headers = list(request.scope.get("headers", []))

            # Add user-id header (similar to Spring's mutate().headers())
            new_headers.append((b"x-user-id", user_id.encode()))

            # Add org-id header if available
            if org_id:
                new_headers.append((b"x-org-id", org_id.encode()))

            # Add email if available
            if payload.email:
                new_headers.append((b"x-user-email", payload.email.encode()))

            # Store headers in scope
            new_scope["headers"] = new_headers

            # Create new request with modified scope
            request = Request(new_scope, request.receive)

            # Also store user info in request state for easy access
            request.state.user_id = user_id
            request.state.org_id = org_id
            request.state.user_email = payload.email

            logger.debug(
                "API Gateway authenticated request",
                user_id=user_id,
                org_id=org_id,
                path=path,
            )

        except Exception as e:
            logger.error("API Gateway authentication error", error=str(e), path=path)
            if self.enforce_auth:
                return JSONResponse(
                    status_code=HTTP_401_UNAUTHORIZED,
                    content={"detail": "Authentication failed"},
                    headers={"WWW-Authenticate": "Bearer"},
                )

        return await call_next(request)


def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Helper function to get user_id from request.

    Can be used in route handlers to access the authenticated user ID.
    """
    # Try request state first (set by middleware)
    if hasattr(request.state, "user_id"):
        return request.state.user_id

    # Fall back to header
    return request.headers.get("x-user-id")


def get_org_id_from_request(request: Request) -> Optional[str]:
    """
    Helper function to get org_id from request.

    Can be used in route handlers to access the organization ID
    for multi-tenant queries.
    """
    # Try request state first (set by middleware)
    if hasattr(request.state, "org_id"):
        return request.state.org_id

    # Fall back to header
    return request.headers.get("x-org-id")
