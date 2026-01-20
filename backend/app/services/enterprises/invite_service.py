"""
Enterprise Invite Service

Orchestrates the complete enterprise invitation and onboarding flow:
- Create enterprise record
- Create Auth0 organization
- Create PostgreSQL tenant schema
- Send admin invitation
- Track onboarding progress
"""

import uuid
import secrets
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.logging import get_logger
from app.core.tenant import TenantSchemaManager
from app.models.enterprise import (
    Enterprise,
    EnterpriseStatus,
    EnterpriseOnboardingProgress,
    OnboardingStep,
)
from app.services.auth.auth0_org_service import Auth0OrgService
from app.services.auth.auth0_user_service import Auth0UserService
from app.services.enterprises.onboarding_service import OnboardingService
from app.config.settings import settings


logger = get_logger(__name__)


class EnterpriseInviteService:
    """
    Handles enterprise invitation and onboarding orchestration.

    This service coordinates:
    1. Enterprise record creation in database
    2. Auth0 organization creation
    3. PostgreSQL tenant schema creation
    4. Admin invitation via Auth0
    5. Onboarding progress tracking
    """

    def __init__(self):
        self.auth0_org_service = Auth0OrgService()
        self.auth0_user_service = Auth0UserService()
        self.onboarding_service = OnboardingService()

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            # Remove www. prefix if present
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return url

    def _generate_org_name(self, enterprise_name: str) -> str:
        """
        Generate a unique Auth0 organization name.

        Auth0 org names must be unique and can only contain
        lowercase letters, numbers, and dashes.
        """
        # Normalize name: lowercase, replace spaces with dashes
        base_name = enterprise_name.lower().replace(" ", "-")
        # Remove any invalid characters
        base_name = "".join(c for c in base_name if c.isalnum() or c == "-")
        # Ensure it starts with a letter
        if base_name and not base_name[0].isalpha():
            base_name = "org-" + base_name
        # Add random suffix for uniqueness
        suffix = secrets.token_hex(4)
        return f"{base_name}-{suffix}"[:50]  # Auth0 has max length

    def _generate_onboarding_token(self) -> str:
        """Generate a secure onboarding token."""
        return secrets.token_urlsafe(32)

    async def invite_enterprise(
        self,
        db: AsyncSession,
        enterprise_name: str,
        admin_email: str,
        enterprise_url: str,
        inviter_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full enterprise invitation flow.

        Steps:
        1. Validate inputs (domain uniqueness, etc.)
        2. Create Enterprise record (status=PENDING)
        3. Create Auth0 Organization
        4. Create PostgreSQL tenant schema
        5. Create onboarding progress record
        6. Send admin invitation email

        Args:
            db: Database session
            enterprise_name: Name of the enterprise
            admin_email: Admin's email address
            enterprise_url: Enterprise website URL
            inviter_name: Name of the person sending the invite

        Returns:
            dict: Invite response with enterprise details

        Raises:
            ValueError: If validation fails
            Exception: If any step fails
        """
        domain = self._extract_domain(enterprise_url)
        org_name = self._generate_org_name(enterprise_name)
        onboarding_token = self._generate_onboarding_token()

        logger.info(
            "Starting enterprise invite flow",
            enterprise_name=enterprise_name,
            admin_email=admin_email,
            domain=domain,
        )

        # Step 1: Validate domain uniqueness
        existing = await db.execute(
            select(Enterprise).where(Enterprise.domain == domain)
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Domain '{domain}' is already registered")

        # Check email uniqueness
        existing_email = await db.execute(
            select(Enterprise).where(Enterprise.admin_email == admin_email)
        )
        if existing_email.scalar_one_or_none():
            raise ValueError(f"Email '{admin_email}' is already registered")

        auth0_org = None
        enterprise = None

        try:
            # Step 2: Create Auth0 Organization
            logger.info("Creating Auth0 organization", org_name=org_name)
            auth0_org = await self.auth0_org_service.create_organization({
                "name": org_name,
                "display_name": enterprise_name,
                "metadata": {
                    "admin_email": admin_email,
                    "domain": domain,
                    "onboarding_token": onboarding_token,
                },
            })
            auth0_org_id = auth0_org.get("id")
            logger.info("Auth0 organization created", org_id=auth0_org_id)

            # Step 3: Add default connection to organization
            # This allows users to sign up/login with the default connection
            if settings.AUTH0_DEFAULT_CONNECTION_ID:
                try:
                    await self.auth0_org_service.add_connection(
                        auth0_org_id,
                        settings.AUTH0_DEFAULT_CONNECTION_ID,
                        assign_membership=True,
                    )
                    logger.info("Added default connection to organization")
                except Exception as conn_err:
                    logger.warning(
                        "Failed to add default connection",
                        error=str(conn_err),
                    )

            # Step 4: Create Enterprise record in database
            enterprise = Enterprise(
                organization_id=auth0_org_id,
                name=enterprise_name,
                domain=domain,
                admin_email=admin_email,
                status=EnterpriseStatus.PENDING,
                settings={
                    "onboarding_token": onboarding_token,
                    "enterprise_url": enterprise_url,
                },
            )
            db.add(enterprise)
            await db.flush()  # Get enterprise ID
            logger.info("Enterprise record created", enterprise_id=str(enterprise.id))

            # Step 5: Create PostgreSQL tenant schema
            logger.info("Creating tenant schema", org_id=auth0_org_id)
            await TenantSchemaManager.create_schema(db, auth0_org_id)
            logger.info("Tenant schema created")

            # Step 6: Create onboarding progress
            progress = EnterpriseOnboardingProgress(
                enterprise_id=enterprise.id,
                current_step=OnboardingStep.INVITED,
                progress_data={
                    "onboarding_token": onboarding_token,
                    "invited_at": datetime.utcnow().isoformat(),
                    "inviter_name": inviter_name,
                },
            )
            db.add(progress)

            # Step 7: Send invitation email via Auth0
            try:
                invitation = await self.auth0_user_service.create_invitation(
                    auth0_org_id,
                    {
                        "inviter": {"name": inviter_name or "Kolate Admin"},
                        "invitee": {"email": admin_email},
                        "client_id": settings.AUTH0_CLIENT_ID,
                        "send_invitation_email": True,
                        "ttl_sec": 604800,  # 7 days
                        "roles": [settings.AUTH0_ORG_ADMIN_ROLE_ID] if settings.AUTH0_ORG_ADMIN_ROLE_ID else [],
                    }
                )
                logger.info("Invitation email sent", invitation_id=invitation.get("id"))

                # Update progress with invitation info
                progress.progress_data["invitation_id"] = invitation.get("id")
                progress.progress_data["invitation_url"] = invitation.get("invitation_url")
                progress.current_step = OnboardingStep.EMAIL_SENT

            except Exception as invite_err:
                logger.warning(
                    "Failed to send Auth0 invitation, enterprise created but needs manual invite",
                    error=str(invite_err),
                )
                progress.progress_data["invitation_error"] = str(invite_err)

            await db.commit()
            await db.refresh(enterprise)

            # Build onboarding URL
            onboarding_url = f"{settings.FRONTEND_URL}/onboarding/{onboarding_token}"

            return {
                "enterprise_id": str(enterprise.id),
                "enterprise_name": enterprise.name,
                "enterprise_domain": enterprise.domain,
                "admin_email": enterprise.admin_email,
                "organization_id": auth0_org_id,
                "onboarding_url": onboarding_url,
                "onboarding_token": onboarding_token,
                "message": "Enterprise invited successfully. Invitation email sent to admin.",
            }

        except Exception as e:
            logger.error("Enterprise invite failed", error=str(e))
            await db.rollback()

            # Cleanup Auth0 org if it was created
            if auth0_org:
                try:
                    await self.auth0_org_service.delete_organization(auth0_org.get("id"))
                    logger.info("Cleaned up Auth0 organization after failure")
                except Exception:
                    pass

            raise

    async def resend_invitation(
        self,
        db: AsyncSession,
        enterprise_id: str,
        inviter_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Resend invitation email to enterprise admin.

        Args:
            db: Database session
            enterprise_id: Enterprise UUID
            inviter_name: Name of the person resending

        Returns:
            dict: Result with new invitation details
        """
        # Get enterprise
        result = await db.execute(
            select(Enterprise).where(Enterprise.id == enterprise_id)
        )
        enterprise = result.scalar_one_or_none()

        if not enterprise:
            raise ValueError("Enterprise not found")

        if enterprise.status not in [EnterpriseStatus.PENDING, EnterpriseStatus.INACTIVE]:
            raise ValueError(f"Cannot resend invitation for enterprise with status '{enterprise.status}'")

        # Send new invitation
        invitation = await self.auth0_user_service.create_invitation(
            enterprise.organization_id,
            {
                "inviter": {"name": inviter_name or "Kolate Admin"},
                "invitee": {"email": enterprise.admin_email},
                "client_id": settings.AUTH0_CLIENT_ID,
                "send_invitation_email": True,
                "ttl_sec": 604800,  # 7 days
                "roles": [settings.AUTH0_ORG_ADMIN_ROLE_ID] if settings.AUTH0_ORG_ADMIN_ROLE_ID else [],
            }
        )

        # Update onboarding progress
        progress_result = await db.execute(
            select(EnterpriseOnboardingProgress).where(
                EnterpriseOnboardingProgress.enterprise_id == enterprise.id
            )
        )
        progress = progress_result.scalar_one_or_none()

        if progress:
            progress.progress_data["reinvited_at"] = datetime.utcnow().isoformat()
            progress.progress_data["invitation_id"] = invitation.get("id")
            progress.current_step = OnboardingStep.EMAIL_SENT
            await db.commit()

        logger.info(
            "Invitation resent",
            enterprise_id=enterprise_id,
            admin_email=enterprise.admin_email,
        )

        return {
            "enterprise_id": str(enterprise.id),
            "admin_email": enterprise.admin_email,
            "invitation_id": invitation.get("id"),
            "message": "Invitation resent successfully",
        }

    async def get_onboarding_by_token(
        self,
        db: AsyncSession,
        token: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get enterprise onboarding status by token.

        Args:
            db: Database session
            token: Onboarding token

        Returns:
            dict: Enterprise and onboarding progress, or None if not found
        """
        # Find enterprise by onboarding token
        result = await db.execute(
            select(Enterprise).where(
                Enterprise.settings["onboarding_token"].astext == token
            )
        )
        enterprise = result.scalar_one_or_none()

        if not enterprise:
            return None

        # Get onboarding progress
        progress_result = await db.execute(
            select(EnterpriseOnboardingProgress).where(
                EnterpriseOnboardingProgress.enterprise_id == enterprise.id
            )
        )
        progress = progress_result.scalar_one_or_none()

        return {
            "enterprise_id": str(enterprise.id),
            "enterprise_name": enterprise.name,
            "enterprise_domain": enterprise.domain,
            "admin_email": enterprise.admin_email,
            "organization_id": enterprise.organization_id,
            "status": enterprise.status.value,
            "onboarding": {
                "current_step": progress.current_step.value if progress else None,
                "is_completed": progress.is_complete if progress else False,
                "progress_data": progress.progress_data if progress else {},
            } if progress else None,
        }

    async def update_onboarding_step(
        self,
        db: AsyncSession,
        token: str,
        step: OnboardingStep,
        step_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Update onboarding progress for a specific step.

        Args:
            db: Database session
            token: Onboarding token
            step: The step being completed
            step_data: Data from this step

        Returns:
            dict: Updated progress
        """
        # Find enterprise
        result = await db.execute(
            select(Enterprise).where(
                Enterprise.settings["onboarding_token"].astext == token
            )
        )
        enterprise = result.scalar_one_or_none()

        if not enterprise:
            raise ValueError("Invalid onboarding token")

        # Get/create progress
        progress_result = await db.execute(
            select(EnterpriseOnboardingProgress).where(
                EnterpriseOnboardingProgress.enterprise_id == enterprise.id
            )
        )
        progress = progress_result.scalar_one_or_none()

        if not progress:
            raise ValueError("Onboarding progress not found")

        # Update progress
        progress.advance_to_step(step, step_data)
        progress.updated_at = datetime.utcnow()

        # If step is COMPLETED, activate enterprise
        if step == OnboardingStep.COMPLETED:
            enterprise.status = EnterpriseStatus.ACTIVE
            enterprise.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(progress)

        return {
            "enterprise_id": str(enterprise.id),
            "current_step": progress.current_step.value,
            "is_completed": progress.is_complete,
            "progress_data": progress.progress_data,
        }

    async def complete_onboarding(
        self,
        db: AsyncSession,
        token: str,
        company_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Complete the onboarding process.

        Args:
            db: Database session
            token: Onboarding token
            company_data: Final company data to save

        Returns:
            dict: Completion result
        """
        # Find enterprise
        result = await db.execute(
            select(Enterprise).where(
                Enterprise.settings["onboarding_token"].astext == token
            )
        )
        enterprise = result.scalar_one_or_none()

        if not enterprise:
            raise ValueError("Invalid onboarding token")

        # Update enterprise with final data
        if company_data:
            if "name" in company_data:
                enterprise.name = company_data["name"]
            if "logo_url" in company_data:
                enterprise.logo_url = company_data["logo_url"]
            if "settings" in company_data:
                enterprise.settings = {
                    **enterprise.settings,
                    **company_data["settings"],
                }

        # Activate enterprise
        enterprise.status = EnterpriseStatus.ACTIVE
        enterprise.updated_at = datetime.utcnow()

        # Complete onboarding progress
        progress_result = await db.execute(
            select(EnterpriseOnboardingProgress).where(
                EnterpriseOnboardingProgress.enterprise_id == enterprise.id
            )
        )
        progress = progress_result.scalar_one_or_none()

        if progress:
            progress.advance_to_step(OnboardingStep.COMPLETED, company_data)
            progress.completed_at = datetime.utcnow()

        # Remove onboarding token from settings (security)
        if "onboarding_token" in enterprise.settings:
            del enterprise.settings["onboarding_token"]

        await db.commit()

        logger.info(
            "Enterprise onboarding completed",
            enterprise_id=str(enterprise.id),
            enterprise_name=enterprise.name,
        )

        return {
            "enterprise_id": str(enterprise.id),
            "enterprise_name": enterprise.name,
            "organization_id": enterprise.organization_id,
            "status": enterprise.status.value,
            "message": "Onboarding completed successfully. Enterprise is now active.",
        }
