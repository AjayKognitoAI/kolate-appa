"""
SSO Service

Business logic for SSO ticket management.
"""

from typing import Optional
from datetime import datetime, timedelta
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enterprise import SsoTicket, Enterprise
from app.schemas.enterprise import SsoTicketCreate, SsoTicketValidation
from app.config.settings import settings


class SsoService:
    """SSO ticket management service."""

    DEFAULT_TTL_SECONDS = 300  # 5 minutes

    async def create_ticket(
        self, db: AsyncSession, enterprise_id: str, ticket_data: SsoTicketCreate
    ) -> SsoTicket:
        """Create an SSO ticket for enterprise authentication."""
        # Get enterprise to verify it exists
        result = await db.execute(
            select(Enterprise).where(Enterprise.id == enterprise_id)
        )
        enterprise = result.scalar_one_or_none()
        if not enterprise:
            raise ValueError("Enterprise not found")

        # Generate secure ticket
        ticket_value = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(seconds=self.DEFAULT_TTL_SECONDS)

        # Create ticket
        ticket = SsoTicket(
            enterprise_id=enterprise_id,
            user_id=ticket_data.user_id,
            ticket=ticket_value,
            target_url=ticket_data.target_url,
            expires_at=expires_at,
        )
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    async def validate_ticket(
        self, db: AsyncSession, enterprise_id: str, ticket_value: str
    ) -> SsoTicketValidation:
        """Validate an SSO ticket."""
        result = await db.execute(
            select(SsoTicket).where(
                SsoTicket.enterprise_id == enterprise_id,
                SsoTicket.ticket == ticket_value
            )
        )
        ticket = result.scalar_one_or_none()

        if not ticket:
            return SsoTicketValidation(
                user_id="",
                enterprise_id=enterprise_id,
                organization_id="",
                is_valid=False
            )

        # Check if expired
        if ticket.expires_at < datetime.utcnow():
            return SsoTicketValidation(
                user_id=ticket.user_id,
                enterprise_id=str(ticket.enterprise_id),
                organization_id="",
                is_valid=False
            )

        # Get enterprise for organization_id
        result = await db.execute(
            select(Enterprise).where(Enterprise.id == enterprise_id)
        )
        enterprise = result.scalar_one_or_none()
        organization_id = enterprise.organization_id if enterprise else ""

        # Mark ticket as used
        ticket.used_at = datetime.utcnow()
        await db.commit()

        return SsoTicketValidation(
            user_id=ticket.user_id,
            enterprise_id=str(ticket.enterprise_id),
            organization_id=organization_id,
            is_valid=True
        )

    async def delete_ticket(
        self, db: AsyncSession, enterprise_id: str, ticket_value: str
    ) -> bool:
        """Delete/invalidate an SSO ticket."""
        result = await db.execute(
            select(SsoTicket).where(
                SsoTicket.enterprise_id == enterprise_id,
                SsoTicket.ticket == ticket_value
            )
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            return False

        await db.delete(ticket)
        await db.commit()
        return True

    async def cleanup_expired_tickets(self, db: AsyncSession) -> int:
        """Clean up expired SSO tickets."""
        result = await db.execute(
            select(SsoTicket).where(SsoTicket.expires_at < datetime.utcnow())
        )
        expired_tickets = result.scalars().all()
        count = len(expired_tickets)

        for ticket in expired_tickets:
            await db.delete(ticket)

        await db.commit()
        return count
