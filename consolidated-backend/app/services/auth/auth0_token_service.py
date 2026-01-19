"""
Auth0 Token Service

Service for managing Auth0 M2M tokens:
- Get/cache M2M access token
- Token refresh
"""

import httpx
from typing import Optional
from datetime import datetime, timedelta
from app.config.settings import settings
from app.core.cache import cache_manager


class Auth0TokenService:
    """
    Auth0 M2M token management service.

    Handles fetching and caching of Machine-to-Machine tokens
    for Auth0 Management API access.
    """

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.client_id = settings.AUTH0_M2M_CLIENT_ID
        self.client_secret = settings.AUTH0_M2M_CLIENT_SECRET
        self.audience = settings.AUTH0_MGMT_AUDIENCE or f"https://{self.domain}/api/v2/"
        self._token_cache_key = "auth0:management_token"
        self._token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def get_management_token(self) -> str:
        """
        Get cached Auth0 Management API token or fetch a new one.

        Returns:
            str: Valid Auth0 Management API access token

        Raises:
            ValueError: If Auth0 M2M credentials are not configured
            httpx.HTTPError: If token fetch fails
        """
        if not all([self.client_id, self.client_secret]):
            raise ValueError(
                "Auth0 M2M credentials not configured. "
                "Set AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET."
            )

        # Check in-memory cache first
        if self._token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at:
                return self._token

        # Try to get from Redis cache
        try:
            cached_token = await cache_manager.get(self._token_cache_key)
            if cached_token:
                self._token = cached_token
                # Set a conservative expiry (we don't know exact expiry from cache)
                self._token_expires_at = datetime.utcnow() + timedelta(hours=1)
                return cached_token
        except Exception:
            # If cache fails, continue to fetch new token
            pass

        # Fetch new token
        token_data = await self._fetch_new_token()
        token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 86400)  # Default 24 hours

        # Cache the token
        await self._cache_token(token, expires_in)

        return token

    async def _fetch_new_token(self) -> dict:
        """
        Fetch a new M2M token from Auth0.

        Returns:
            dict: Token response with access_token and expires_in

        Raises:
            httpx.HTTPError: If token fetch fails
        """
        url = f"https://{self.domain}/oauth/token"
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "audience": self.audience,
            "grant_type": "client_credentials",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()

    async def _cache_token(self, token: str, expires_in: int) -> None:
        """
        Cache the token in both memory and Redis.

        Args:
            token: The access token to cache
            expires_in: Token lifetime in seconds
        """
        # Cache in memory with buffer (expire 5 minutes early)
        buffer_seconds = 300
        expiry_buffer = max(expires_in - buffer_seconds, 60)
        self._token = token
        self._token_expires_at = datetime.utcnow() + timedelta(seconds=expiry_buffer)

        # Cache in Redis with TTL
        try:
            await cache_manager.set(
                self._token_cache_key,
                token,
                ttl=expiry_buffer,
            )
        except Exception:
            # If Redis caching fails, we still have in-memory cache
            pass

    async def invalidate_token(self) -> None:
        """
        Invalidate the cached token (useful for testing or manual refresh).
        """
        self._token = None
        self._token_expires_at = None
        try:
            await cache_manager.delete(self._token_cache_key)
        except Exception:
            pass
