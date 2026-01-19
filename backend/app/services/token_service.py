from datetime import datetime, timedelta, timezone
import traceback
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.config.settings import settings
from app.core.logging import get_class_logger
from app.models.user_session import UserSession
from app.models.user_auth import UserAuth, AuthType
from app.models.user import User
from app.schemas.auth import TokenPayload, AuthConfig
from app.core.cache import cache_manager


class TokenService:
    """Enhanced JWT token service with session management."""

    def __init__(self, config: Optional[AuthConfig] = None):
        """Initialize token service with configuration."""
        self.config = config or AuthConfig(
            jwt_secret_key=settings.SECRET_KEY,
            jwt_algorithm=settings.ALGORITHM,
            access_token_expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            refresh_token_expire_hours=getattr(settings, 'REFRESH_TOKEN_EXPIRE_HOURS', 168),
            session_cookie_name=getattr(settings, 'SESSION_COOKIE_NAME', 'session_id'),
            session_cookie_secure=getattr(settings, 'SESSION_COOKIE_SECURE', True),
            session_cookie_httponly=getattr(settings, 'SESSION_COOKIE_HTTPONLY', True),
            session_cookie_samesite=getattr(settings, 'SESSION_COOKIE_SAMESITE', 'strict')
        )
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.logger = get_class_logger(self.__class__)
        

    def create_access_token(
        self,
        user_id: str,
        email: str,
        session_jti: str,
        session_id: Optional[str] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token with session information."""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.config.access_token_expire_minutes)

        to_encode = {
            "sub": user_id,
            "email": email,
            "type": "user",  # Mark this as a user token for consistency
            "jti": session_jti,
            "iat": datetime.now(timezone.utc),
            "exp": expire
        }

        # Add session_id if provided and configured
        if session_id and getattr(settings, 'INCLUDE_SESSION_IN_TOKEN', True):
            to_encode["session_id"] = session_id

        encoded_jwt = jwt.encode(to_encode, self.config.jwt_secret_key, algorithm=self.config.jwt_algorithm)
        return encoded_jwt

    def create_refresh_token(self) -> str:
        """Create secure refresh token."""
        return secrets.token_urlsafe(32)

    def verify_token(self, token: str) -> Optional[TokenPayload]:
        """Verify JWT token and return payload."""
        try:
            payload = jwt.decode(token, self.config.jwt_secret_key, algorithms=[self.config.jwt_algorithm])
            return TokenPayload(**payload)
        except JWTError:
            return None

    def decode_token_ignore_expiry(self, token: str) -> Optional[TokenPayload]:
        """
        Decode JWT token without verifying expiration.
        Used for refresh flow to extract JTI from expired access tokens.
        """
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret_key,
                algorithms=[self.config.jwt_algorithm],
                options={"verify_exp": False}  # Skip expiration check
            )
            return TokenPayload(**payload)
        except JWTError as ex:
            self.logger.debug("Exception ", exc = str(traceback.format_exc()))
            return None

    async def create_user_session(
        self,
        db: AsyncSession,
        user_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_fingerprint: Optional[str] = None
    ) -> UserSession:
        """Create a new user session with refresh token."""
        refresh_token = self.create_refresh_token()

        session = UserSession.create_session(
            user_id=user_id,
            refresh_token=self.pwd_context.hash(refresh_token),
            expires_hours=self.config.refresh_token_expire_hours,
            user_agent=user_agent,
            ip_address=ip_address,
            device_fingerprint=device_fingerprint
        )

        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Store the plain refresh token temporarily for cookie setting
        session._plain_refresh_token = refresh_token

        return session

    async def create_tokens_with_session(
        self,
        db: AsyncSession,
        user_id: str,
        email: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_fingerprint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create access token and refresh token with session management."""
        # Create session
        session = await self.create_user_session(
            db, user_id, user_agent, ip_address, device_fingerprint
        )

        # Create access token with session info
        access_token = self.create_access_token(
            user_id=user_id,
            email=email,
            session_jti=session.jti,
            session_id=str(session.id)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.config.access_token_expire_minutes * 60,
            "refresh_token": session._plain_refresh_token,
            "refresh_expires_in": self.config.refresh_token_expire_hours * 3600,
            "session": session
        }

    async def refresh_access_token(
        self,
        db: AsyncSession,
        refresh_token: str,
        session_jti: str
    ) -> Optional[Dict[str, Any]]:
        """Refresh access token using refresh token and session JTI."""
        # Get session by JTI
        query = select(UserSession).where(
            and_(
                UserSession.jti == session_jti,
                UserSession.is_active == True
            )
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if not session or not session.is_valid():
            return None

        # Verify refresh token
        if not self.pwd_context.verify(refresh_token, session.refresh_token):
            return None

        # Get user info
        user = await db.get(User, session.user_id)
        if not user or not user.is_active:
            return None

        # Extend session expiry (optional)
        session.extend_expiry(self.config.refresh_token_expire_hours)
        await db.commit()

        # Create new access token
        access_token = self.create_access_token(
            user_id=user.id,
            email=user.email,
            session_jti=session.jti,
            session_id=str(session.id)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.config.access_token_expire_minutes * 60
        }

    async def revoke_session(self, db: AsyncSession, session_jti: str) -> bool:
        """Revoke a user session."""
        query = select(UserSession).where(UserSession.jti == session_jti)
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if session:
            session.deactivate()
            await db.commit()

            # Blacklist all tokens for this session
            await self.blacklist_session_tokens(session_jti)
            return True

        return False

    async def revoke_all_user_sessions(self, db: AsyncSession, user_id: str) -> int:
        """Revoke all sessions for a user."""
        query = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_active == True
            )
        )
        result = await db.execute(query)
        sessions = result.scalars().all()

        count = 0
        for session in sessions:
            session.deactivate()
            await self.blacklist_session_tokens(session.jti)
            count += 1

        if count > 0:
            await db.commit()

        return count

    async def blacklist_session_tokens(self, session_jti: str):
        """Blacklist all tokens for a session."""
        # Cache blacklisted session JTI
        await cache_manager.set(
            f"blacklist_session:{session_jti}",
            "true",
            expire=self.config.access_token_expire_minutes * 60
        )

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted."""
        try:
            payload = self.verify_token(token)
            if not payload:
                return True

            # Check if session is blacklisted
            is_session_blacklisted = await cache_manager.exists(f"blacklist_session:{payload.jti}")
            if is_session_blacklisted:
                return True

            # Check if specific token is blacklisted
            is_token_blacklisted = await cache_manager.exists(f"blacklist_token:{token}")
            return is_token_blacklisted

        except Exception:
            return True

    async def validate_session(self, db: AsyncSession, session_jti: str) -> Optional[UserSession]:
        """Validate and return session if valid."""
        query = select(UserSession).where(UserSession.jti == session_jti)
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if session and session.is_valid():
            return session

        return None

    async def get_active_sessions(self, db: AsyncSession, user_id: str) -> list[UserSession]:
        """Get all active sessions for a user."""
        query = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.utcnow()
            )
        ).order_by(UserSession.issued_at.desc())

        result = await db.execute(query)
        return result.scalars().all()

    async def cleanup_expired_sessions(self, db: AsyncSession) -> int:
        """Clean up expired sessions."""
        query = select(UserSession).where(
            UserSession.expires_at <= datetime.utcnow()
        )
        result = await db.execute(query)
        expired_sessions = result.scalars().all()

        count = 0
        for session in expired_sessions:
            session.deactivate()
            count += 1

        if count > 0:
            await db.commit()

        return count

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash password."""
        return self.pwd_context.hash(password)

    def create_guest_access_token(
        self,
        guest_id: str,
        session_id: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token for guest user."""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.config.access_token_expire_minutes)

        to_encode = {
            "sub": guest_id,
            "session_id": session_id,
            "type": "guest",  # Mark this as a guest token
            "iat": datetime.now(timezone.utc),
            "exp": expire
        }

        encoded_jwt = jwt.encode(to_encode, self.config.jwt_secret_key, algorithm=self.config.jwt_algorithm)
        return encoded_jwt


# Global token service instance
token_service = TokenService()