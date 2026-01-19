"""Authentication configuration module."""
from app.config.settings import settings
from app.schemas.auth import AuthConfig


def get_auth_config() -> AuthConfig:
    """Get authentication configuration based on environment settings."""
    return AuthConfig(
        jwt_secret_key=settings.SECRET_KEY,
        jwt_algorithm=settings.ALGORITHM,
        access_token_expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        refresh_token_expire_hours=settings.REFRESH_TOKEN_EXPIRE_HOURS,
        session_cookie_name=settings.SESSION_COOKIE_NAME,
        # Set secure cookies to False for development HTTP
        session_cookie_secure=settings.SESSION_COOKIE_SECURE if settings.ENVIRONMENT == "production" else False,
        session_cookie_httponly=settings.SESSION_COOKIE_HTTPONLY,
        session_cookie_samesite=settings.SESSION_COOKIE_SAMESITE
    )


# Global auth configuration instance
auth_config = get_auth_config()