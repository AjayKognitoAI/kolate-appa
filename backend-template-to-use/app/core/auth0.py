"""
Auth0 JWT Verification Module

This module provides JWT verification for Auth0 tokens, including:
- JWKS (JSON Web Key Set) caching and retrieval
- Token verification with RS256 algorithm
- Claims extraction and validation
- Role and permission extraction from Auth0 tokens
"""

from typing import Optional, Dict, Any, List
from functools import lru_cache
import httpx
from jose import jwt, jwk, JWTError
from jose.exceptions import JWKError
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Auth0Config:
    """Auth0 configuration holder."""

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.audience = settings.AUTH0_AUDIENCE
        self.algorithms = settings.AUTH0_ALGORITHMS
        self.issuer = settings.AUTH0_ISSUER or f"https://{self.domain}/"
        self.jwks_uri = f"https://{self.domain}/.well-known/jwks.json"
        self.permissions_claim = settings.AUTH0_PERMISSIONS_CLAIM
        self.roles_claim = settings.AUTH0_ROLES_CLAIM
        self.use_rbac = settings.AUTH0_USE_RBAC


auth0_config = Auth0Config()


class Auth0TokenPayload(BaseModel):
    """Structured representation of Auth0 JWT payload."""

    sub: str  # User ID (Auth0 user_id)
    iss: str  # Issuer
    aud: List[str]  # Audience(s)
    exp: int  # Expiration time
    iat: int  # Issued at time
    azp: Optional[str] = None  # Authorized party (client_id)
    scope: Optional[str] = None  # OAuth scopes
    permissions: List[str] = []  # RBAC permissions from Auth0
    roles: List[str] = []  # Custom roles claim
    email: Optional[str] = None
    email_verified: Optional[bool] = None
    name: Optional[str] = None
    nickname: Optional[str] = None
    picture: Optional[str] = None

    @property
    def scopes(self) -> List[str]:
        """Parse scope string into list."""
        if self.scope:
            return self.scope.split()
        return []


class JWKSCache:
    """Cache for JWKS (JSON Web Key Set) from Auth0."""

    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Optional[Dict[str, Any]] = None
        self._cache_time: Optional[datetime] = None
        self._ttl = timedelta(seconds=ttl_seconds)

    def is_expired(self) -> bool:
        """Check if cache is expired."""
        if self._cache_time is None:
            return True
        return datetime.utcnow() - self._cache_time > self._ttl

    async def get_jwks(self) -> Dict[str, Any]:
        """Get JWKS, fetching from Auth0 if cache is expired."""
        if self._cache is None or self.is_expired():
            await self._refresh_cache()
        return self._cache

    async def _refresh_cache(self):
        """Fetch JWKS from Auth0."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    auth0_config.jwks_uri,
                    timeout=10.0
                )
                response.raise_for_status()
                self._cache = response.json()
                self._cache_time = datetime.utcnow()
                logger.info("JWKS cache refreshed from Auth0")
        except Exception as e:
            logger.error(f"Failed to fetch JWKS from Auth0: {e}")
            if self._cache is None:
                raise RuntimeError(f"Cannot fetch JWKS from Auth0: {e}")
            # Use stale cache if available
            logger.warning("Using stale JWKS cache due to fetch failure")

    def invalidate(self):
        """Invalidate the cache, forcing a refresh on next access."""
        self._cache = None
        self._cache_time = None


# Global JWKS cache instance
jwks_cache = JWKSCache()


async def get_signing_key(token: str) -> Optional[Dict[str, Any]]:
    """
    Get the signing key for a token from JWKS.

    Args:
        token: The JWT token to get signing key for

    Returns:
        The signing key dict or None if not found
    """
    try:
        # Get unverified header to find the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            logger.warning("Token missing 'kid' header")
            return None

        # Get JWKS
        jwks = await jwks_cache.get_jwks()

        # Find the matching key
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key

        logger.warning(f"No matching key found for kid: {kid}")
        return None

    except JWTError as e:
        logger.error(f"Error parsing token header: {e}")
        return None


async def verify_token(token: str) -> Optional[Auth0TokenPayload]:
    """
    Verify an Auth0 JWT token and return the payload.

    Args:
        token: The JWT token to verify

    Returns:
        Auth0TokenPayload if valid, None if invalid

    Raises:
        JWTError: If token verification fails
    """
    try:
        # Get the signing key
        signing_key = await get_signing_key(token)
        if not signing_key:
            logger.warning("Could not find signing key for token")
            return None

        # Construct the RSA public key
        try:
            rsa_key = jwk.construct(signing_key)
        except JWKError as e:
            logger.error(f"Error constructing RSA key: {e}")
            return None

        # Verify and decode the token
        payload = jwt.decode(
            token,
            rsa_key.to_pem().decode("utf-8"),
            algorithms=auth0_config.algorithms,
            audience=auth0_config.audience,
            issuer=auth0_config.issuer,
        )

        # Extract permissions from the configured claim
        permissions = payload.get(auth0_config.permissions_claim, [])

        # Extract roles from the configured claim (custom namespace)
        roles = payload.get(auth0_config.roles_claim, [])

        # Handle audience - can be string or list
        audience = payload.get("aud", [])
        if isinstance(audience, str):
            audience = [audience]

        # Build the token payload
        token_payload = Auth0TokenPayload(
            sub=payload["sub"],
            iss=payload["iss"],
            aud=audience,
            exp=payload["exp"],
            iat=payload["iat"],
            azp=payload.get("azp"),
            scope=payload.get("scope"),
            permissions=permissions if isinstance(permissions, list) else [],
            roles=roles if isinstance(roles, list) else [],
            email=payload.get("email"),
            email_verified=payload.get("email_verified"),
            name=payload.get("name"),
            nickname=payload.get("nickname"),
            picture=payload.get("picture"),
        )

        logger.debug(
            f"Token verified for user: {token_payload.sub}",
            extra={"permissions_count": len(token_payload.permissions)}
        )

        return token_payload

    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.JWTClaimsError as e:
        logger.warning(f"Invalid token claims: {e}")
        return None
    except JWTError as e:
        logger.error(f"Token verification failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {e}")
        return None


def has_permission(payload: Auth0TokenPayload, required_permission: str) -> bool:
    """
    Check if the token has a specific permission.

    Args:
        payload: The verified token payload
        required_permission: The permission to check for

    Returns:
        True if the permission is present, False otherwise
    """
    return required_permission in payload.permissions


def has_any_permission(payload: Auth0TokenPayload, required_permissions: List[str]) -> bool:
    """
    Check if the token has any of the required permissions.

    Args:
        payload: The verified token payload
        required_permissions: List of permissions to check

    Returns:
        True if any permission is present, False otherwise
    """
    return any(perm in payload.permissions for perm in required_permissions)


def has_all_permissions(payload: Auth0TokenPayload, required_permissions: List[str]) -> bool:
    """
    Check if the token has all of the required permissions.

    Args:
        payload: The verified token payload
        required_permissions: List of permissions to check

    Returns:
        True if all permissions are present, False otherwise
    """
    return all(perm in payload.permissions for perm in required_permissions)


def has_role(payload: Auth0TokenPayload, role: str) -> bool:
    """
    Check if the token has a specific role.

    Args:
        payload: The verified token payload
        role: The role to check for

    Returns:
        True if the role is present, False otherwise
    """
    return role in payload.roles


def has_scope(payload: Auth0TokenPayload, scope: str) -> bool:
    """
    Check if the token has a specific OAuth scope.

    Args:
        payload: The verified token payload
        scope: The scope to check for

    Returns:
        True if the scope is present, False otherwise
    """
    return scope in payload.scopes
