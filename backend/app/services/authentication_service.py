from typing import Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid
import time

from app.models.user import User
from app.models.user_auth import UserAuth, AuthType
from app.models.user_session import UserSession
from app.models.role import Role, UserRole
from app.exceptions import (
    EmailAlreadyExistsError,
    UserNotFoundError,
    AccountInactiveError,
    InvalidPasswordError,
    NoAuthRecordError,
    InvalidRefreshTokenError,
    PasswordChangeError,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    RefreshTokenResponse,
    UserAuthCreate,
    SessionInfo,
)
from app.services.token_service import (
    TokenService,
    token_service as global_token_service,
)
from app.core.cache import cacheable, cacheevict, EvictionStrategy
from app.core.logging_utils import (
    ServiceLogger,
    log_authentication_event,
    log_authorization_event,
    log_function_call,
    log_performance,
)
from app.core.logging import get_class_logger


class AuthenticationService:
    """Authentication service handling login, registration, and session management."""

    def __init__(self, token_service: TokenService = None):
        self.token_service = token_service or global_token_service
        self.logger = get_class_logger(self.__class__)
        self.service_logger = ServiceLogger("authentication_service")

    @log_function_call(log_args=True, log_duration=True)
    async def register_user(
        self,
        db: AsyncSession,
        registration: RegisterRequest,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> RegisterResponse:
        """Register a new user with email/password authentication."""
        start_time = time.time()

        self.service_logger.log_service_start(
            "register_user",
            email=registration.email,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        try:
            # Check if user already exists
            existing_user = await self.get_user_by_email(db, registration.email)
            if existing_user:
                # Smart handling: If user exists but is NOT verified, resend OTP
                if not existing_user.is_active:
                    self.logger.info(
                        "User exists but unverified - resending verification OTP",
                        email=registration.email,
                        user_id=existing_user.id,
                        ip_address=ip_address,
                    )

                    # Send verification OTP (bypass rate limit for re-registration)
                    from app.services.email_verification_service import EmailVerificationService
                    verification_service = EmailVerificationService(db)
                    try:
                        # Invalidate old OTP and send new one (bypass rate limit)
                        await verification_service._invalidate_otp(registration.email)
                        await verification_service.send_verification_otp(
                            email=registration.email,
                            user_id=existing_user.id,
                            bypass_rate_limit=True  # Allow re-registration without rate limit issues
                        )
                    except Exception as otp_error:
                        self.logger.error(
                            "Failed to resend verification OTP",
                            email=registration.email,
                            error=str(otp_error),
                        )

                    return RegisterResponse(
                        user_id=existing_user.id,
                        message="An account with this email is pending verification. We've sent a new OTP to your email."
                    )

                # User exists and is already verified
                self.logger.warning(
                    "Registration failed: email already verified and active",
                    email=registration.email,
                    ip_address=ip_address,
                )

                log_authentication_event(
                    event_type="registration",
                    email=registration.email,
                    success=False,
                    reason="email_already_exists",
                    metadata={"ip_address": ip_address, "user_agent": user_agent},
                )

                raise EmailAlreadyExistsError(email=registration.email)

            # Create user with is_active=False (requires email verification)
            user_id = str(uuid.uuid4())
            user = User(
                id=user_id,
                name=registration.name,
                email=registration.email,
                phone=registration.phone,
                is_active=False,  # User must verify email before activation
            )

            db.add(user)
            await db.flush()  # Get the user ID

            # Create authentication record
            password_hash = self.token_service.get_password_hash(registration.password)
            user_auth = UserAuth.create_email_auth(
                user_id=user.id, email=registration.email, password_hash=password_hash
            )

            db.add(user_auth)
            await db.flush()

            # Assign role to user
            role = await self.get_role_by_name(db, registration.role)
            if role:
                user_role = UserRole(user_id=user.id, role_id=role.id)
                db.add(user_role)

            # Create role-specific records
            if registration.role == "Homeowner":
                from app.models.homeowner import Homeowner
                homeowner = Homeowner(user_id=user.id)
                db.add(homeowner)
            elif registration.role == "ServiceProvider":
                from app.models.service_provider import ServiceProvider
                service_provider = ServiceProvider(user_id=user.id)
                db.add(service_provider)

            await db.commit()

            # Send email verification OTP
            from app.services.email_verification_service import EmailVerificationService
            verification_service = EmailVerificationService(db)
            try:
                await verification_service.send_verification_otp(
                    email=registration.email,
                    user_id=user.id
                )
            except Exception as otp_error:
                # Log but don't fail registration if email sending fails
                self.logger.error(
                    "Failed to send verification OTP email",
                    user_id=user.id,
                    email=registration.email,
                    error=str(otp_error),
                )

            # Log successful registration
            duration = time.time() - start_time
            self.service_logger.log_service_success(
                "register_user",
                duration_ms=duration * 1000,
                user_id=user.id,
                email=registration.email,
            )

            log_authentication_event(
                event_type="registration",
                user_id=user.id,
                email=registration.email,
                success=True,
                metadata={"ip_address": ip_address, "user_agent": user_agent},
            )

            self.logger.info(
                "User registered successfully (awaiting email verification)",
                user_id=user.id,
                email=registration.email,
                ip_address=ip_address,
            )

            return RegisterResponse(
                user_id=user.id,
                message="Registration successful. Please check your email to verify your account."
            )

        except (EmailAlreadyExistsError,):
            raise
        except Exception as e:
            duration = time.time() - start_time
            self.service_logger.log_service_error(
                "register_user",
                e,
                duration_ms=duration * 1000,
                email=registration.email,
            )

            log_authentication_event(
                event_type="registration",
                email=registration.email,
                success=False,
                reason="system_error",
                metadata={"error": str(e), "ip_address": ip_address},
            )
            raise

    @log_function_call(log_duration=True)
    @log_performance(threshold_ms=500.0)
    async def authenticate_user(
        self,
        db: AsyncSession,
        login_request: LoginRequest,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
    ) -> LoginResponse:
        """Authenticate user and create session."""
        start_time = time.time()

        self.service_logger.log_service_start(
            "authenticate_user",
            email=login_request.email,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        try:
            # Get user by email
            user = await self.get_user_by_email(db, login_request.email)
            if not user:
                self.logger.warning(
                    "Login failed: user not found",
                    email=login_request.email,
                    ip_address=ip_address,
                )

                log_authentication_event(
                    event_type="login",
                    email=login_request.email,
                    success=False,
                    reason="user_not_found",
                    metadata={"ip_address": ip_address, "user_agent": user_agent},
                )

                raise UserNotFoundError(email=login_request.email)

            if not user.is_active:
                self.logger.warning(
                    "Login failed: user account inactive",
                    user_id=user.id,
                    email=login_request.email,
                    ip_address=ip_address,
                )

                log_authentication_event(
                    event_type="login",
                    user_id=user.id,
                    email=login_request.email,
                    success=False,
                    reason="account_inactive",
                    metadata={"ip_address": ip_address, "user_agent": user_agent},
                )

                raise AccountInactiveError(user_id=user.id, email=login_request.email)

            # Get user authentication record
            user_auth = await self.get_user_auth_by_email(db, login_request.email)
            if not user_auth:
                self.logger.warning(
                    "Login failed: no auth record found",
                    user_id=user.id,
                    email=login_request.email,
                    ip_address=ip_address,
                )

                log_authentication_event(
                    event_type="login",
                    user_id=user.id,
                    email=login_request.email,
                    success=False,
                    reason="no_auth_record",
                    metadata={"ip_address": ip_address, "user_agent": user_agent},
                )

                raise NoAuthRecordError(
                    user_id=user.id, email=login_request.email, auth_type="email"
                )

            # Verify password
            if not self.token_service.verify_password(
                login_request.password, user_auth.secret_hash
            ):
                self.logger.warning(
                    "Login failed: invalid password",
                    user_id=user.id,
                    email=login_request.email,
                    ip_address=ip_address,
                )

                log_authentication_event(
                    event_type="login",
                    user_id=user.id,
                    email=login_request.email,
                    success=False,
                    reason="invalid_password",
                    metadata={"ip_address": ip_address, "user_agent": user_agent},
                )

                raise InvalidPasswordError(
                    user_id=user.id, email=login_request.email, context="login"
                )

            # Create tokens with session
            tokens = await self.token_service.create_tokens_with_session(
                db=db,
                user_id=user.id,
                email=user.email,
                user_agent=user_agent,
                ip_address=ip_address,
                device_fingerprint=device_fingerprint,
            )

            # Log successful login
            duration = time.time() - start_time
            self.service_logger.log_service_success(
                "authenticate_user",
                duration_ms=duration * 1000,
                user_id=user.id,
                email=user.email,
                session_id=str(tokens["session"].id),
            )

            log_authentication_event(
                event_type="login",
                user_id=user.id,
                email=user.email,
                success=True,
                metadata={
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "device_fingerprint": device_fingerprint,
                    "session_id": str(tokens["session"].id),
                },
            )

            self.logger.info(
                "User authenticated successfully",
                user_id=user.id,
                email=user.email,
                session_id=str(tokens["session"].id),
                ip_address=ip_address,
            )

            # Get user's roles
            roles_query = select(Role).join(UserRole).where(UserRole.user_id == user.id)
            roles_result = await db.execute(roles_query)
            user_roles = [role.name for role in roles_result.scalars().all()]

            # Get service provider verification status if user is a service provider
            from app.models.service_provider import ServiceProvider
            provider_query = select(ServiceProvider).where(ServiceProvider.user_id == user.id)
            provider_result = await db.execute(provider_query)
            provider = provider_result.scalar_one_or_none()

            verification_status = None
            if provider:
                verification_status = provider.verification_status

            return LoginResponse(
                access_token=tokens["access_token"],
                token_type=tokens["token_type"],
                expires_in=tokens["expires_in"],
                user_id=user.id,
                session_id=str(tokens["session"].id),  # Only session_id exposed, not refresh_token
                refresh_expires_in=tokens["refresh_expires_in"],
                user={
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "phone": user.phone,
                    "is_active": user.is_active,
                    "roles": user_roles,
                    "verification_status": verification_status,  # pending | verified | rejected
                },
            )

        except (
            UserNotFoundError,
            AccountInactiveError,
            NoAuthRecordError,
            InvalidPasswordError,
        ):
            raise
        except Exception as e:
            duration = time.time() - start_time
            self.service_logger.log_service_error(
                "authenticate_user",
                e,
                duration_ms=duration * 1000,
                email=login_request.email,
            )

            log_authentication_event(
                event_type="login",
                email=login_request.email,
                success=False,
                reason="system_error",
                metadata={"error": str(e), "ip_address": ip_address},
            )
            raise

    async def refresh_token(
        self, db: AsyncSession, refresh_token: str, session_jti: str
    ) -> RefreshTokenResponse:
        """Refresh access token using refresh token."""
        result = await self.token_service.refresh_access_token(
            db=db, refresh_token=refresh_token, session_jti=session_jti
        )

        if not result:
            raise InvalidRefreshTokenError(session_jti=session_jti)

        return RefreshTokenResponse(
            access_token=result["access_token"],
            token_type=result["token_type"],
            expires_in=result["expires_in"],
        )

    async def refresh_by_session_id(
        self, db: AsyncSession, session_id: str, access_token: str
    ) -> Optional[RefreshTokenResponse]:
        """
        Refresh access token using session_id and expired access token.

        Security model:
        1. Decode expired access token to extract JTI (even if expired)
        2. Validate session_id exists in database
        3. Verify JTI from access token matches session's JTI
        4. Generate NEW JTI for new access token
        5. Update session with new JTI
        6. Return new access token

        This prevents:
        - Session hijacking (requires both session_id AND valid JTI)
        - Token replay attacks (JTI rotates on each refresh)
        """
        # Decode access token (even if expired) to extract JTI
        token_payload = self.token_service.decode_token_ignore_expiry(access_token)

        if not token_payload or not token_payload.jti:
            self.logger.warning("Refresh failed: invalid access token", session_id=session_id)
            return None

        old_jti = token_payload.jti

        # Get session by ID (session_id is now UUID string)
        result = await db.execute(
            select(UserSession).where(
                and_(
                    UserSession.id == session_id,
                    UserSession.is_active == True
                )
            )
        )
        session = result.scalar_one_or_none()

        if not session:
            self.logger.warning("Refresh failed: session not found", session_id=session_id)
            return None

        # CRITICAL: Verify JTI from access token matches session's JTI
        self.logger.debug("Verifying jtis", token_jti= old_jti, saved_jti= session.jti)
        if session.jti != old_jti:
            self.logger.warning(
                "Refresh failed: JTI mismatch (possible session hijacking)",
                session_id=session_id,
                expected_jti=session.jti,
                received_jti=old_jti
            )
            # Deactivate session as security measure
            session.deactivate()
            await db.commit()
            return None

        # Check if session is expired
        if session.is_expired():
            self.logger.warning("Refresh failed: session expired", session_id=session_id)
            session.deactivate()
            await db.commit()
            return None

        # Generate NEW JTI for rotation
        new_jti = str(uuid.uuid4())

        # Get user info for new token
        result = await db.execute(
            select(User).where(User.id == session.user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            self.logger.warning("Refresh failed: user not found", session_id=session_id)
            return None

        # Create new access token with NEW JTI
        new_access_token = self.token_service.create_access_token(
            user_id=user.id,
            email=user.email,
            session_jti=new_jti,
            session_id=session_id
        )

        # Update session with new JTI
        session.jti = new_jti
        await db.commit()

        self.logger.info(
            "Access token refreshed successfully with JTI rotation",
            session_id=session_id,
            user_id=session.user_id,
            old_jti=old_jti,
            new_jti=new_jti
        )

        return RefreshTokenResponse(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=self.token_service.config.access_token_expire_minutes * 60,
        )

    @log_function_call(log_duration=True)
    async def logout_user(self, db: AsyncSession, session_jti: str) -> bool:
        """Logout user by revoking session."""
        self.logger.info("Logging out user session", session_jti=session_jti)

        result = await self.token_service.revoke_session(db, session_jti)

        if result:
            log_authentication_event(
                event_type="logout", success=True, metadata={"session_jti": session_jti}
            )
            self.logger.info("User logged out successfully", session_jti=session_jti)
        else:
            self.logger.warning(
                "Failed to logout user session", session_jti=session_jti
            )

        return result

    async def logout_all_sessions(self, db: AsyncSession, user_id: str) -> int:
        """Logout user from all sessions."""
        return await self.token_service.revoke_all_user_sessions(db, user_id)

    async def get_session_info(
        self, db: AsyncSession, session_jti: str
    ) -> Optional[SessionInfo]:
        """Get current session information."""
        session = await self.token_service.validate_session(db, session_jti)
        if not session:
            return None

        return SessionInfo(
            session_id=str(session.id),
            user_id=session.user_id,
            jti=session.jti,
            issued_at=session.issued_at,
            expires_at=session.expires_at,
            is_active=session.is_active,
            user_agent=session.user_agent,
            ip_address=session.ip_address,
            device_fingerprint=session.device_fingerprint,
        )

    async def get_active_sessions(
        self, db: AsyncSession, user_id: str
    ) -> list[SessionInfo]:
        """Get all active sessions for user."""
        sessions = await self.token_service.get_active_sessions(db, user_id)
        return [
            SessionInfo(
                session_id=str(session.id),
                user_id=session.user_id,
                jti=session.jti,
                issued_at=session.issued_at,
                expires_at=session.expires_at,
                is_active=session.is_active,
                user_agent=session.user_agent,
                ip_address=session.ip_address,
                device_fingerprint=session.device_fingerprint,
            )
            for session in sessions
        ]

    async def revoke_session_by_id(
        self, db: AsyncSession, session_id: str, user_id: str
    ) -> bool:
        """Revoke a specific session by ID."""
        # First verify the session belongs to the user (session_id is now UUID string)
        query = select(UserSession).where(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id,
                UserSession.is_active == True,
            )
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            return False

        return await self.token_service.revoke_session(db, session.jti)

    @log_function_call(log_duration=True)
    async def change_password(
        self, db: AsyncSession, user_id: str, current_password: str, new_password: str
    ) -> bool:
        """Change user password."""
        start_time = time.time()

        self.service_logger.log_service_start("change_password", user_id=user_id)

        try:
            # Get user authentication record
            user_auth = await self.get_user_auth_by_user_id(db, user_id, AuthType.EMAIL)
            if not user_auth:
                self.logger.warning(
                    "Password change failed: no email auth record", user_id=user_id
                )

                log_authentication_event(
                    event_type="password_change",
                    user_id=user_id,
                    success=False,
                    reason="no_auth_record",
                )

                raise PasswordChangeError(
                    message="No email authentication found for user",
                    user_id=user_id,
                    reason="no_auth_record",
                )

            # Verify current password
            if not self.token_service.verify_password(
                current_password, user_auth.secret_hash
            ):
                self.logger.warning(
                    "Password change failed: incorrect current password",
                    user_id=user_id,
                )

                log_authentication_event(
                    event_type="password_change",
                    user_id=user_id,
                    success=False,
                    reason="incorrect_current_password",
                )

                raise InvalidPasswordError(user_id=user_id, context="change_password")

            # Update password
            user_auth.secret_hash = self.token_service.get_password_hash(new_password)
            await db.commit()

            # Revoke all sessions (force re-login)
            revoked_sessions = await self.logout_all_sessions(db, user_id)

            # Log successful password change
            duration = time.time() - start_time
            self.service_logger.log_service_success(
                "change_password",
                duration_ms=duration * 1000,
                user_id=user_id,
                revoked_sessions=revoked_sessions,
            )

            log_authentication_event(
                event_type="password_change",
                user_id=user_id,
                success=True,
                metadata={"revoked_sessions": revoked_sessions},
            )

            self.logger.info(
                "Password changed successfully",
                user_id=user_id,
                revoked_sessions=revoked_sessions,
            )

            return True

        except (PasswordChangeError, InvalidPasswordError):
            raise
        except Exception as e:
            duration = time.time() - start_time
            self.service_logger.log_service_error(
                "change_password", e, duration_ms=duration * 1000, user_id=user_id
            )

            log_authentication_event(
                event_type="password_change",
                user_id=user_id,
                success=False,
                reason="system_error",
                metadata={"error": str(e)},
            )
            raise

    @cacheable(ttl=300, key_template="user_by_email:{email}", unless="result is None")
    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email with caching."""
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_auth_by_email(
        self, db: AsyncSession, email: str
    ) -> Optional[UserAuth]:
        """Get user authentication record by email."""
        query = select(UserAuth).where(
            and_(UserAuth.identifier == email, UserAuth.auth_type == AuthType.EMAIL)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_auth_by_user_id(
        self, db: AsyncSession, user_id: str, auth_type: AuthType
    ) -> Optional[UserAuth]:
        """Get user authentication record by user ID and type."""
        query = select(UserAuth).where(
            and_(UserAuth.user_id == user_id, UserAuth.auth_type == auth_type)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @cacheevict(pattern="user_by_email:*", strategy=EvictionStrategy.PATTERN)
    async def invalidate_user_cache(self):
        """Invalidate user cache."""
        pass

    async def cleanup_expired_sessions(self, db: AsyncSession) -> int:
        """Clean up expired sessions."""
        return await self.token_service.cleanup_expired_sessions(db)

    async def get_role_by_name(
        self, db: AsyncSession, role_name: str
    ) -> Optional[Role]:
        """Get role by name."""
        query = select(Role).where(Role.name == role_name)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @log_function_call(log_args=True, log_duration=True)
    async def authenticate_guest(
        self,
        db: AsyncSession,
        session_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Authenticate a guest user and return access token.

        Args:
            db: Database session
            session_id: Guest session ID

        Returns:
            Dictionary containing access_token and related info, or None if invalid
        """
        from app.models.guest import Guest

        self.service_logger.log_service_start(
            "authenticate_guest",
            session_id=session_id
        )

        try:
            # Get and validate guest session
            query = select(Guest).where(
                and_(Guest.session_id == session_id, Guest.is_active == True)
            )
            result = await db.execute(query)
            guest = result.scalar_one_or_none()

            if not guest:
                self.logger.warning("Guest authentication failed: session not found", session_id=session_id)
                return None

            # Check if session is expired
            if guest.is_expired():
                guest.is_active = False
                await db.commit()
                self.logger.warning("Guest authentication failed: session expired", session_id=session_id)
                return None

            # Update last activity
            guest.update_activity()
            await db.commit()

            # Create access token for guest
            access_token = self.token_service.create_guest_access_token(
                guest_id=str(guest.id),
                session_id=session_id
            )

            self.service_logger.log_service_success(
                "authenticate_guest",
                guest_id=guest.id,
                session_id=session_id
            )

            self.logger.info(
                "Guest authenticated successfully",
                guest_id=guest.id,
                session_id=session_id
            )

            return {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": self.token_service.config.access_token_expire_minutes * 60,
                "guest_id": str(guest.id),
                "session_id": session_id,
                "session_expires_at": guest.expires_at
            }

        except Exception as e:
            self.service_logger.log_service_error(
                "authenticate_guest",
                e,
                session_id=session_id
            )
            raise


# Global authentication service instance
auth_service = AuthenticationService()
