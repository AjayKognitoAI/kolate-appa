from typing import Optional
from datetime import timedelta
from app.core.security import create_access_token, verify_token
from app.core.cache import cache_manager, cacheable, cacheevict, EvictionStrategy
from app.config.settings import settings


class AuthService:
    @staticmethod
    def create_tokens(user_id: int, email: str) -> dict:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_id), "email": email}, expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }

    @staticmethod
    async def verify_access_token(token: str) -> Optional[dict]:
        payload = verify_token(token)
        if payload is None:
            return None

        user_id = payload.get("sub")
        if user_id is None:
            return None

        # Check if token is blacklisted
        is_blacklisted = await cache_manager.exists(f"blacklist:{token}")
        if is_blacklisted:
            return None

        return payload

    @staticmethod
    async def blacklist_token(token: str):
        # Blacklist token until it expires
        await cache_manager.set(
            f"blacklist:{token}",
            "true",
            expire=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    @staticmethod
    @cacheable(
        ttl=300,
        key_template="user_data:{user_id}",
        condition="user_data is not None"
    )
    async def cache_user_data(user_id: int, user_data: dict, expire: int = 300):
        # This method now automatically caches the user_data using the decorator
        # The actual caching is handled by @cacheable, so we just return the data
        return user_data

    @staticmethod
    @cacheable(
        ttl=300,
        key_template="user_data:{user_id}",
        unless="result is None"
    )
    async def get_cached_user_data(user_id: int) -> Optional[dict]:
        # This method would normally fetch from database or another source
        # For now, it returns None to indicate cache miss
        # In practice, you'd implement the actual data fetching logic here
        return None

    @staticmethod
    @cacheevict(
        keys=["user_data:{user_id}"],
        strategy=EvictionStrategy.EXACT_KEY
    )
    async def clear_user_cache(user_id: int):
        # Cache eviction is handled by @cacheevict decorator
        # Method can perform additional cleanup if needed
        pass


auth_service = AuthService()