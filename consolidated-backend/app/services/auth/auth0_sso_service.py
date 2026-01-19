"""
Auth0 SSO Service

Service for SSO ticket operations:
- Create SSO tickets for self-service profiles
- Generate passwordless authentication tickets
"""

import httpx
from typing import Optional, Dict, Any
from app.config.settings import settings
from app.services.auth.auth0_token_service import Auth0TokenService


class Auth0SsoService:
    """Auth0 SSO ticket service."""

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.token_service = Auth0TokenService()
        self.base_url = f"https://{self.domain}/api/v2"
        self.default_profile_id = settings.AUTH0_SSO_PROFILE_ID

    async def create_sso_ticket(
        self,
        user_id: str,
        profile_id: str,
        result_url: Optional[str] = None,
        ttl_sec: int = 300,
    ) -> Dict[str, Any]:
        """
        Create an SSO ticket for a specific self-service profile.

        This allows users to access self-service profile pages (like password reset,
        profile update) without needing to authenticate.

        Args:
            user_id: Auth0 user ID
            profile_id: Self-service profile ID
            result_url: URL to redirect to after action completion
            ttl_sec: Time to live in seconds (default: 300 = 5 minutes)

        Returns:
            dict: SSO ticket data with structure:
                {
                    "ticket": str (URL to the SSO ticket)
                }

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        payload = {
            "user_id": user_id,
            "ttl_sec": ttl_sec,
        }

        if result_url:
            payload["result_url"] = result_url

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/self-service-profiles/{profile_id}/sso-ticket",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def create_generic_sso_ticket(
        self,
        user_id: str,
        result_url: Optional[str] = None,
        ttl_sec: int = 300,
    ) -> Dict[str, Any]:
        """
        Create an SSO ticket using the default configured profile.

        Args:
            user_id: Auth0 user ID
            result_url: URL to redirect to after action completion
            ttl_sec: Time to live in seconds (default: 300 = 5 minutes)

        Returns:
            dict: SSO ticket data

        Raises:
            ValueError: If default profile ID is not configured
            httpx.HTTPError: If API call fails
        """
        if not self.default_profile_id:
            raise ValueError(
                "Default SSO profile not configured. "
                "Set AUTH0_SSO_PROFILE_ID in settings."
            )

        return await self.create_sso_ticket(
            user_id, self.default_profile_id, result_url, ttl_sec
        )

    async def create_password_change_ticket(
        self,
        user_id: str,
        result_url: Optional[str] = None,
        ttl_sec: int = 432000,
    ) -> Dict[str, Any]:
        """
        Create a password change ticket for a user.

        This is different from SSO tickets - it generates a link for password change
        that can be sent via email.

        Args:
            user_id: Auth0 user ID
            result_url: URL to redirect after password change
            ttl_sec: Time to live in seconds (default: 432000 = 5 days)

        Returns:
            dict: Ticket data with structure:
                {
                    "ticket": str (URL to the password change page)
                }

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        payload = {
            "user_id": user_id,
            "ttl_sec": ttl_sec,
            "mark_email_as_verified": False,
            "includeEmailInRedirect": False,
        }

        if result_url:
            payload["result_url"] = result_url

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/tickets/password-change",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def create_email_verification_ticket(
        self,
        user_id: str,
        result_url: Optional[str] = None,
        ttl_sec: int = 432000,
    ) -> Dict[str, Any]:
        """
        Create an email verification ticket for a user.

        Args:
            user_id: Auth0 user ID
            result_url: URL to redirect after email verification
            ttl_sec: Time to live in seconds (default: 432000 = 5 days)

        Returns:
            dict: Ticket data with structure:
                {
                    "ticket": str (URL to the email verification page)
                }

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        payload = {
            "user_id": user_id,
            "ttl_sec": ttl_sec,
        }

        if result_url:
            payload["result_url"] = result_url

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/tickets/email-verification",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def send_verification_email(self, user_id: str) -> Dict[str, Any]:
        """
        Trigger Auth0 to send a verification email to a user.

        This uses Auth0's built-in email sending functionality.

        Args:
            user_id: Auth0 user ID

        Returns:
            dict: Response from Auth0

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        payload = {"user_id": user_id}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/jobs/verification-email",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def get_self_service_profile(self, profile_id: str) -> Dict[str, Any]:
        """
        Get self-service profile configuration.

        Args:
            profile_id: Self-service profile ID

        Returns:
            dict: Profile configuration

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/self-service-profiles/{profile_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()
