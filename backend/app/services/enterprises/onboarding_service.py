"""
Onboarding Service

Business logic for enterprise onboarding workflow:
- Enterprise invitation
- Auth0 organization creation
- SSO ticket generation
- Progress tracking
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enterprise import (
    EnterpriseOnboardingProgress,
    OnboardingStep,
    Enterprise,
    EnterpriseStatus,
)
from app.schemas.enterprise import OnboardingProgressUpdate


class OnboardingService:
    """Enterprise onboarding workflow service."""

    STEP_SEQUENCE = [
        OnboardingStep.INVITATION_SENT,
        OnboardingStep.ACCOUNT_CREATED,
        OnboardingStep.PROFILE_COMPLETED,
        OnboardingStep.DATASOURCE_CONFIGURED,
        OnboardingStep.USERS_INVITED,
        OnboardingStep.COMPLETED,
    ]

    async def get_progress(
        self, db: AsyncSession, enterprise_id: str
    ) -> Optional[EnterpriseOnboardingProgress]:
        """Get enterprise onboarding progress."""
        result = await db.execute(
            select(EnterpriseOnboardingProgress).where(
                EnterpriseOnboardingProgress.enterprise_id == enterprise_id
            )
        )
        return result.scalar_one_or_none()

    async def create_progress(
        self, db: AsyncSession, enterprise_id: str
    ) -> EnterpriseOnboardingProgress:
        """Create onboarding progress for a new enterprise."""
        progress = EnterpriseOnboardingProgress(
            enterprise_id=enterprise_id,
            current_step=OnboardingStep.INVITATION_SENT,
            steps_completed=[],
            is_completed=False,
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)
        return progress

    async def update_progress(
        self, db: AsyncSession, enterprise_id: str, update_data: OnboardingProgressUpdate
    ) -> Optional[EnterpriseOnboardingProgress]:
        """Update enterprise onboarding progress."""
        progress = await self.get_progress(db, enterprise_id)
        if not progress:
            progress = await self.create_progress(db, enterprise_id)

        if update_data.current_step:
            progress.current_step = update_data.current_step
            # Add to completed steps if not already there
            if update_data.current_step.value not in progress.steps_completed:
                progress.steps_completed = [
                    *progress.steps_completed,
                    update_data.current_step.value
                ]

        if update_data.steps_completed:
            progress.steps_completed = update_data.steps_completed

        progress.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(progress)
        return progress

    async def complete_onboarding(
        self, db: AsyncSession, enterprise_id: str
    ) -> bool:
        """Mark enterprise onboarding as complete."""
        progress = await self.get_progress(db, enterprise_id)
        if not progress:
            return False

        progress.current_step = OnboardingStep.COMPLETED
        progress.is_completed = True
        progress.completed_at = datetime.utcnow()
        progress.updated_at = datetime.utcnow()

        # Update enterprise status to ACTIVE
        result = await db.execute(
            select(Enterprise).where(Enterprise.id == enterprise_id)
        )
        enterprise = result.scalar_one_or_none()
        if enterprise:
            enterprise.status = EnterpriseStatus.ACTIVE
            enterprise.updated_at = datetime.utcnow()

        await db.commit()
        return True

    def get_next_step(self, current_step: OnboardingStep) -> Optional[OnboardingStep]:
        """Get the next step in the onboarding sequence."""
        try:
            current_index = self.STEP_SEQUENCE.index(current_step)
            if current_index < len(self.STEP_SEQUENCE) - 1:
                return self.STEP_SEQUENCE[current_index + 1]
        except ValueError:
            pass
        return None

    async def send_invitation(
        self, db: AsyncSession, enterprise_id: str
    ) -> bool:
        """Send onboarding invitation to enterprise admin."""
        result = await db.execute(
            select(Enterprise).where(Enterprise.id == enterprise_id)
        )
        enterprise = result.scalar_one_or_none()
        if not enterprise or not enterprise.admin_email:
            return False

        # Create or update progress
        progress = await self.get_progress(db, enterprise_id)
        if not progress:
            progress = await self.create_progress(db, enterprise_id)

        progress.current_step = OnboardingStep.INVITATION_SENT
        progress.updated_at = datetime.utcnow()

        # TODO: Send actual email via email service
        # For now, just update the progress

        await db.commit()
        return True

    async def resend_invitation(
        self, db: AsyncSession, enterprise_id: str
    ) -> bool:
        """Resend onboarding invitation to enterprise admin."""
        return await self.send_invitation(db, enterprise_id)

    async def handle_connection_webhook(
        self, db: AsyncSession, payload: Dict[str, Any]
    ) -> None:
        """
        Handle Auth0 connection webhook.

        Called when a connection is established or modified.
        """
        event_type = payload.get("event")
        data = payload.get("data", {})
        org_id = data.get("organization_id")

        if not org_id:
            return

        # Find enterprise by organization_id
        result = await db.execute(
            select(Enterprise).where(Enterprise.organization_id == org_id)
        )
        enterprise = result.scalar_one_or_none()
        if not enterprise:
            return

        # Update onboarding progress based on event
        if event_type == "connection.created":
            await self.update_progress(
                db,
                str(enterprise.id),
                OnboardingProgressUpdate(
                    current_step=OnboardingStep.DATASOURCE_CONFIGURED
                )
            )
        elif event_type == "user.created":
            await self.update_progress(
                db,
                str(enterprise.id),
                OnboardingProgressUpdate(
                    current_step=OnboardingStep.USERS_INVITED
                )
            )
