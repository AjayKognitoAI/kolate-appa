import logging
import secrets
import json
from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from app.services.user_service import UserService
from app.services.email_service import EmailService
from app.models.user import User
from app.core.cache.manager import cache_manager
from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailVerificationService:
    """
    Service for managing email verification during user registration.
    Uses Redis for OTP storage, similar to password reset flow.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()

    async def send_verification_otp(self, email: str, user_id: str, bypass_rate_limit: bool = False) -> Dict[str, any]:
        """
        Generate and send verification OTP to user's email.

        Args:
            email: User's email address
            user_id: User's ID
            bypass_rate_limit: Skip rate limit check (used for re-registration)

        Returns:
            Dict with success message and expiration time

        Raises:
            ValueError: If rate limit exceeded
            Exception: If email sending fails
        """
        try:
            # Check rate limit (unless bypassed for re-registration)
            if not bypass_rate_limit:
                await self._check_rate_limit(email)

            # Generate OTP
            otp = self._generate_otp()

            # Store OTP in Redis
            await self._store_otp(email, user_id, otp)

            # Send OTP email
            await self.email_service.send_verification_otp_email(
                to_email=email,
                otp=otp,
                expires_in_minutes=settings.EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES,
            )

            logger.info(f"Verification OTP sent to {email}")

            return {
                "message": "Verification OTP has been sent to your email",
                "expires_in": settings.EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES * 60,
            }

        except ValueError as e:
            logger.error(f"Email verification OTP send failed for {email}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending verification OTP to {email}: {str(e)}")
            raise Exception("Failed to send verification OTP")

    async def verify_otp_and_activate_user(self, email: str, otp: str) -> Dict[str, any]:
        """
        Verify OTP and activate user account.

        Args:
            email: User's email address
            otp: 6-digit OTP from email

        Returns:
            Dict with success message

        Raises:
            ValueError: If OTP is invalid or expired
        """
        try:
            # Retrieve and verify OTP from Redis
            otp_data = await self._get_otp(email)

            if not otp_data:
                raise ValueError("OTP has expired or does not exist")

            # Check max attempts
            if otp_data.get("attempts", 0) >= settings.EMAIL_VERIFICATION_MAX_ATTEMPTS:
                await self._invalidate_otp(email)
                raise ValueError("Maximum OTP verification attempts exceeded")

            # Verify OTP
            if otp_data.get("otp") != otp:
                # Increment attempts
                await self._increment_otp_attempts(email, otp_data)
                remaining = settings.EMAIL_VERIFICATION_MAX_ATTEMPTS - otp_data.get("attempts", 0) - 1
                raise ValueError(f"Invalid OTP. {remaining} attempts remaining")

            # OTP is valid - activate user
            user_id = otp_data.get("user_id")
            await self._activate_user(user_id)

            # Invalidate OTP (single-use)
            await self._invalidate_otp(email)

            logger.info(f"Email verified and user activated: {email}")

            return {
                "message": "Email verified successfully. You can now login.",
                "success": True,
            }

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Email verification failed for {email}: {str(e)}")
            raise ValueError("Email verification failed")

    async def resend_verification_otp(self, email: str) -> Dict[str, any]:
        """
        Resend verification OTP to user's email.

        Args:
            email: User's email address

        Returns:
            Dict with success message and expiration time

        Raises:
            ValueError: If user not found, already verified, or rate limit exceeded
        """
        try:
            # Check if user exists
            user_service = UserService()
            user = await user_service.get_by_email_async(self.db, email=email)

            if not user:
                # Don't reveal if user doesn't exist for security
                logger.warning(f"Resend verification OTP requested for non-existent email: {email}")
                return {
                    "message": "If an unverified account exists, a new OTP has been sent",
                    "expires_in": settings.EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES * 60,
                }

            # Check if user is already verified
            if user.is_active:
                raise ValueError("Email is already verified")

            # Send new OTP
            result = await self.send_verification_otp(email, user.id)
            return result

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to resend verification OTP to {email}: {str(e)}")
            raise Exception("Failed to resend verification OTP")

    # Helper methods with Redis caching

    async def _store_otp(self, email: str, user_id: str, otp: str) -> None:
        """Store OTP in Redis with TTL."""
        cache_key = f"otp:email_verification:{email}"
        otp_data = {
            "otp": otp,
            "user_id": user_id,
            "email": email,
            "attempts": 0,
            "created_at": datetime.utcnow().isoformat(),
        }
        ttl = settings.EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES * 60
        await cache_manager.set(cache_key, json.dumps(otp_data), expire=ttl)

    async def _get_otp(self, email: str) -> Optional[Dict]:
        """Retrieve OTP data from Redis."""
        cache_key = f"otp:email_verification:{email}"
        data = await cache_manager.get(cache_key)
        if data:
            return json.loads(data) if isinstance(data, str) else data
        return None

    async def _invalidate_otp(self, email: str) -> None:
        """Remove OTP from Redis."""
        cache_key = f"otp:email_verification:{email}"
        await cache_manager.delete(cache_key)

    async def _increment_otp_attempts(self, email: str, otp_data: Dict) -> None:
        """Increment OTP verification attempts."""
        otp_data["attempts"] = otp_data.get("attempts", 0) + 1
        cache_key = f"otp:email_verification:{email}"
        ttl = settings.EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES * 60
        await cache_manager.set(cache_key, json.dumps(otp_data), expire=ttl)

    async def _check_rate_limit(self, email: str) -> None:
        """Check and enforce rate limiting for OTP requests."""
        cache_key = f"otp_rate_limit:email_verification:{email}"
        data = await cache_manager.get(cache_key)

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
        if count >= settings.EMAIL_VERIFICATION_RATE_LIMIT_PER_HOUR:
            raise ValueError("Too many verification requests. Please try again later.")

        # Increment count
        rate_data["count"] = count + 1
        await cache_manager.set(cache_key, json.dumps(rate_data), expire=3600)

    async def _activate_user(self, user_id: str) -> None:
        """Activate user account by setting is_active to True."""
        stmt = update(User).where(User.id == user_id).values(is_active=True)
        await self.db.execute(stmt)
        await self.db.commit()

    def _generate_otp(self, length: int = 6) -> str:
        """Generate cryptographically secure 6-digit OTP."""
        return "".join([str(secrets.randbelow(10)) for _ in range(length)])
