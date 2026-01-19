import logging
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.services.user_service import UserService
from app.services.email_service import EmailService
from app.models.user import User
from app.models.user_auth import UserAuth
from app.models.user_session import UserSession
from app.core.cache.decorators import cacheable, cacheevict
from app.core.cache.manager import cache_manager
from app.core.security import get_password_hash
from app.config.settings import settings

logger = logging.getLogger(__name__)


class PasswordResetService:
    """
    Service for managing password reset operations with OTP verification.
    Uses Redis via @cacheable decorator for OTP storage.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()

    async def request_password_reset(self, email: str) -> Dict[str, any]:
        """
        Step 1: Generate OTP and send to user's email.

        Args:
            email: User's email address

        Returns:
            Dict with success message and expiration time

        Raises:
            Exception: If rate limit exceeded or email sending fails
        """
        try:
            # Check rate limit
            await self._check_rate_limit(email)

            # Check if user exists (but don't reveal if not for security)
            user_service = UserService()
            user = await user_service.get_by_email_async(self.db, email=email)

            if not user:
                # Return success anyway to prevent email enumeration
                logger.warning(f"Password reset requested for non-existent email: {email}")
                return {
                    "message": "If an account with this email exists, an OTP has been sent",
                    "expires_in": settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES * 60,
                }

            # Generate OTP
            otp = self._generate_otp()

            # Store OTP in Redis using cacheable pattern
            await self._store_otp(email, user.id, otp)

            # Send OTP email
            await self.email_service.send_otp_email(
                to_email=email,
                otp=otp,
                expires_in_minutes=settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES,
            )

            logger.info(f"Password reset OTP sent to {email}")

            return {
                "message": "If an account with this email exists, an OTP has been sent",
                "expires_in": settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES * 60,
            }

        except ValueError as e:
            logger.error(f"Password reset request failed for {email}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in password reset request for {email}: {str(e)}")
            raise Exception("Failed to process password reset request")

    async def verify_otp_and_create_reset_session(
        self, email: str, otp: str
    ) -> Dict[str, str]:
        """
        Step 2: Verify OTP and generate reset token.

        Args:
            email: User's email address
            otp: 6-digit OTP from email

        Returns:
            Dict with reset_token and expiration time

        Raises:
            ValueError: If OTP is invalid or expired
        """
        try:
            # Retrieve and verify OTP from Redis
            otp_data = await self._get_otp(email)

            if not otp_data:
                raise ValueError("OTP has expired or does not exist")

            # Check max attempts
            if otp_data.get("attempts", 0) >= settings.PASSWORD_RESET_MAX_ATTEMPTS:
                await self._invalidate_otp(email)
                raise ValueError("Maximum OTP verification attempts exceeded")

            # Verify OTP
            if otp_data.get("otp") != otp:
                # Increment attempts
                await self._increment_otp_attempts(email, otp_data)
                remaining = settings.PASSWORD_RESET_MAX_ATTEMPTS - otp_data.get("attempts", 0) - 1
                raise ValueError(f"Invalid OTP. {remaining} attempts remaining")

            # OTP is valid - generate reset token
            reset_token = self._generate_reset_token()

            # Store reset session in Redis
            await self._store_reset_session(reset_token, otp_data.get("user_id"), email)

            # Invalidate OTP (single-use)
            await self._invalidate_otp(email)

            logger.info(f"OTP verified successfully for {email}")

            return {
                "reset_token": reset_token,
                "expires_in": settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60,
            }

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"OTP verification failed for {email}: {str(e)}")
            raise ValueError("OTP verification failed")

    async def reset_password(self, reset_token: str, new_password: str) -> Dict[str, str]:
        """
        Step 3: Reset user's password using reset token.

        Args:
            reset_token: Reset token from OTP verification
            new_password: New password (plain text, will be hashed)

        Returns:
            Dict with success message

        Raises:
            ValueError: If token is invalid or expired
        """
        try:
            # Validate reset token
            session_data = await self._get_reset_session(reset_token)

            if not session_data:
                raise ValueError("Reset token is invalid or has expired")

            user_id = session_data.get("user_id")
            email = session_data.get("email")

            # Hash new password
            hashed_password = get_password_hash(new_password)

            # Update password in database
            await self._update_user_password(user_id, hashed_password)

            # Invalidate all user sessions (force re-login everywhere)
            await self._invalidate_all_user_sessions(user_id)

            # Invalidate reset token
            await self._invalidate_reset_session(reset_token)

            # Send confirmation email
            reset_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
            await self.email_service.send_password_reset_success_email(email, reset_time)

            logger.info(f"Password reset successful for user {user_id}")

            return {"message": "Password reset successful. Please login with your new password."}

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Password reset failed: {str(e)}")
            raise Exception("Failed to reset password")

    # Helper methods with Redis caching

    async def _store_otp(self, email: str, user_id: str, otp: str) -> None:
        """Store OTP in Redis with TTL."""
        cache_key = f"otp:password_reset:{email}"
        otp_data = {
            "otp": otp,
            "user_id": user_id,
            "email": email,
            "attempts": 0,
            "created_at": datetime.utcnow().isoformat(),
        }
        ttl = settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES * 60
        # Serialize to JSON string for Redis
        await cache_manager.set(cache_key, json.dumps(otp_data), expire=ttl)

    async def _get_otp(self, email: str) -> Optional[Dict]:
        """Retrieve OTP data from Redis."""
        cache_key = f"otp:password_reset:{email}"
        data = await cache_manager.get(cache_key)
        if data:
            # Deserialize from JSON string
            return json.loads(data) if isinstance(data, str) else data
        return None

    async def _invalidate_otp(self, email: str) -> None:
        """Remove OTP from Redis."""
        cache_key = f"otp:password_reset:{email}"
        await cache_manager.delete(cache_key)

    async def _increment_otp_attempts(self, email: str, otp_data: Dict) -> None:
        """Increment OTP verification attempts."""
        otp_data["attempts"] = otp_data.get("attempts", 0) + 1
        cache_key = f"otp:password_reset:{email}"
        ttl = settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES * 60
        # Serialize to JSON string for Redis
        await cache_manager.set(cache_key, json.dumps(otp_data), expire=ttl)

    async def _store_reset_session(self, reset_token: str, user_id: str, email: str) -> None:
        """Store reset session in Redis with short TTL."""
        cache_key = f"password_reset_session:{reset_token}"
        session_data = {
            "user_id": user_id,
            "email": email,
            "otp_verified": True,
            "created_at": datetime.utcnow().isoformat(),
        }
        ttl = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60
        # Serialize to JSON string for Redis
        await cache_manager.set(cache_key, json.dumps(session_data), expire=ttl)

    async def _get_reset_session(self, reset_token: str) -> Optional[Dict]:
        """Retrieve reset session from Redis."""
        cache_key = f"password_reset_session:{reset_token}"
        data = await cache_manager.get(cache_key)
        if data:
            # Deserialize from JSON string
            return json.loads(data) if isinstance(data, str) else data
        return None

    async def _invalidate_reset_session(self, reset_token: str) -> None:
        """Remove reset session from Redis."""
        cache_key = f"password_reset_session:{reset_token}"
        await cache_manager.delete(cache_key)

    async def _check_rate_limit(self, email: str) -> None:
        """Check and enforce rate limiting for OTP requests."""
        cache_key = f"otp_rate_limit:password_reset:{email}"
        data = await cache_manager.get(cache_key)

        # Deserialize if needed
        rate_data = None
        if data:
            rate_data = json.loads(data) if isinstance(data, str) else data

        if not rate_data:
            # First request
            await cache_manager.set(
                cache_key, json.dumps({"count": 1}), expire=3600
            )  # 1 hour window
            return

        count = rate_data.get("count", 0)
        if count >= settings.PASSWORD_RESET_RATE_LIMIT_PER_HOUR:
            raise ValueError("Too many password reset requests. Please try again later.")

        # Increment count
        rate_data["count"] = count + 1
        await cache_manager.set(cache_key, json.dumps(rate_data), expire=3600)

    async def _update_user_password(self, user_id: str, hashed_password: str) -> None:
        """Update user's password in database."""
        stmt = (
            update(UserAuth)
            .where(UserAuth.user_id == user_id)
            .values(secret_hash=hashed_password)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def _invalidate_all_user_sessions(self, user_id: str) -> None:
        """Invalidate all user sessions for security."""
        # Delete from database
        stmt = update(UserSession).where(UserSession.user_id == user_id).values(is_active=False)
        await self.db.execute(stmt)
        await self.db.commit()

        # Also clear from cache if sessions are cached
        try:
            pattern = f"session:*:{user_id}:*"
            await cache_manager.delete_pattern(pattern)
        except Exception as e:
            # Log but don't fail the password reset if cache clear fails
            logger.warning(f"Failed to clear session cache: {str(e)}")

    def _generate_otp(self, length: int = 6) -> str:
        """Generate cryptographically secure 6-digit OTP."""
        return "".join([str(secrets.randbelow(10)) for _ in range(length)])

    def _generate_reset_token(self) -> str:
        """Generate cryptographically secure reset token."""
        return secrets.token_urlsafe(32)
