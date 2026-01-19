from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid
import secrets
from datetime import datetime, timedelta, timezone

from app.models.guest import Guest
from app.models.role import Role
from app.models.guest_role import GuestRole
from app.exceptions import GuestSessionExpiredError, GuestSessionNotFoundError
from app.core.logging import get_class_logger
from app.core.logging_utils import ServiceLogger, log_function_call


class GuestService:
    """Service for managing guest sessions and access."""

    def __init__(self):
        self.logger = get_class_logger(self.__class__)
        self.service_logger = ServiceLogger("guest_service")
        # Default guest session duration (24 hours)
        self.default_session_duration_hours = 24

    @log_function_call(log_args=True, log_duration=True)
    async def create_guest_session(
        self,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        device_fingerprint: Optional[str] = None,
        session_duration_hours: Optional[int] = None,
    ) -> Guest:
        """Create a new guest session."""
        self.service_logger.log_service_start(
            "create_guest_session", ip_address=ip_address, user_agent=user_agent
        )

        try:
            # Generate secure session ID
            session_id = self._generate_session_id()

            # Calculate expiration time
            duration = session_duration_hours or self.default_session_duration_hours
            expires_at = datetime.now(timezone.utc) + timedelta(hours=duration)

            # Create guest record
            guest = Guest.create_guest_session(
                session_id=session_id,
                expires_at=expires_at,
                ip_address=ip_address,
                user_agent=user_agent,
                device_fingerprint=device_fingerprint,
            )

            db.add(guest)
            await db.flush()

            # Assign Guest role
            await self._assign_guest_role(db, guest)

            await db.commit()

            self.service_logger.log_service_success(
                "create_guest_session",
                guest_id=guest.id,
                session_id=session_id,
                expires_at=expires_at.isoformat(),
            )

            self.logger.info(
                "Guest session created successfully",
                guest_id=guest.id,
                session_id=session_id,
                ip_address=ip_address,
            )

            return guest

        except Exception as e:
            self.service_logger.log_service_error(
                "create_guest_session", e, ip_address=ip_address
            )
            raise

    @log_function_call(log_duration=True)
    async def get_guest_by_session_id(
        self, db: AsyncSession, session_id: str, update_activity: bool = True
    ) -> Optional[Guest]:
        """Get guest by session ID and optionally update activity."""
        query = select(Guest).where(
            and_(Guest.session_id == session_id, Guest.is_active == True)
        )
        result = await db.execute(query)
        guest = result.scalar_one_or_none()

        if not guest:
            return None

        # Check if session is expired
        if guest.is_expired():
            # Deactivate expired session
            guest.is_active = False
            await db.commit()
            raise GuestSessionExpiredError(session_id=session_id)

        # Update last activity if requested
        if update_activity:
            guest.update_activity()
            await db.commit()

        return guest

    @log_function_call(log_duration=True)
    async def validate_guest_session(self, db: AsyncSession, session_id: str) -> bool:
        """Validate if guest session exists and is active."""
        try:
            guest = await self.get_guest_by_session_id(
                db, session_id, update_activity=True
            )
            return guest is not None
        except GuestSessionExpiredError:
            return False

    @log_function_call(log_duration=True)
    async def deactivate_guest_session(self, db: AsyncSession, session_id: str) -> bool:
        """Deactivate a guest session."""
        self.logger.info("Deactivating guest session", session_id=session_id)

        query = select(Guest).where(Guest.session_id == session_id)
        result = await db.execute(query)
        guest = result.scalar_one_or_none()

        if not guest:
            self.logger.warning(
                "Guest session not found for deactivation", session_id=session_id
            )
            return False

        guest.is_active = False
        await db.commit()

        self.logger.info(
            "Guest session deactivated successfully", session_id=session_id
        )
        return True

    @log_function_call(log_duration=True)
    async def extend_guest_session(
        self, db: AsyncSession, session_id: str, additional_hours: int = 24
    ) -> Optional[Guest]:
        """Extend guest session expiration time."""
        guest = await self.get_guest_by_session_id(
            db, session_id, update_activity=False
        )

        if not guest:
            raise GuestSessionNotFoundError(session_id=session_id)

        # Extend expiration time
        guest.expires_at = guest.expires_at + timedelta(hours=additional_hours)
        guest.update_activity()

        await db.commit()

        self.logger.info(
            "Guest session extended",
            session_id=session_id,
            new_expires_at=guest.expires_at.isoformat(),
            additional_hours=additional_hours,
        )

        return guest

    async def cleanup_expired_sessions(self, db: AsyncSession) -> int:
        """Clean up expired guest sessions."""
        current_time = datetime.now(timezone.utc)

        # Get all expired sessions
        query = select(Guest).where(
            and_(Guest.expires_at < current_time, Guest.is_active == True)
        )
        result = await db.execute(query)
        expired_guests = result.scalars().all()

        # Deactivate expired sessions
        count = 0
        for guest in expired_guests:
            guest.is_active = False
            count += 1

        if count > 0:
            await db.commit()
            self.logger.info(f"Cleaned up {count} expired guest sessions")

        return count

    def _generate_session_id(self) -> str:
        """Generate a secure session ID for guest."""
        # Combine UUID and random token for extra security
        uuid_part = str(uuid.uuid4()).replace("-", "")
        random_part = secrets.token_hex(16)
        return f"guest_{uuid_part}_{random_part}"

    async def _assign_guest_role(self, db: AsyncSession, guest: Guest) -> None:
        """Assign Guest role to the guest session."""
        # Get Guest role
        role_query = select(Role).where(Role.name == "Guest")
        role_result = await db.execute(role_query)
        guest_role = role_result.scalar_one_or_none()

        if guest_role:
            # Create guest role mapping
            # GuestRole is separate from UserRole to avoid FK constraint issues
            guest_role_mapping = GuestRole(guest_id=guest.id, role_id=guest_role.id)
            db.add(guest_role_mapping)


# Global guest service instance
guest_service = GuestService()
