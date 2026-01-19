"""
Auth0 Organization Service

Service for managing Auth0 organizations:
- Create organizations
- Get/delete organization connections
"""

import httpx
from typing import Optional, List, Dict, Any
from app.config.settings import settings
from app.services.auth.auth0_token_service import Auth0TokenService


class Auth0OrgService:
    """Auth0 organization management service."""

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.token_service = Auth0TokenService()
        self.base_url = f"https://{self.domain}/api/v2"

    async def create_organization(self, org_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new Auth0 organization.

        Args:
            org_data: Organization data with structure:
                {
                    "name": str (required, unique identifier),
                    "display_name": str (optional, human-readable name),
                    "branding": dict (optional),
                    "metadata": dict (optional)
                }

        Returns:
            dict: Created organization data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/organizations",
                headers={"Authorization": f"Bearer {token}"},
                json=org_data,
            )
            response.raise_for_status()
            return response.json()

    async def get_organization(self, org_id: str) -> Dict[str, Any]:
        """
        Get organization details.

        Args:
            org_id: Auth0 organization ID

        Returns:
            dict: Organization data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/organizations/{org_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def get_organization_connections(
        self, org_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get organization connections (identity providers).

        Args:
            org_id: Auth0 organization ID

        Returns:
            list: Organization connections

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/organizations/{org_id}/enabled_connections",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def add_connection(
        self,
        org_id: str,
        connection_id: str,
        assign_membership: bool = False
    ) -> Dict[str, Any]:
        """
        Add a connection to an organization.

        Args:
            org_id: Auth0 organization ID
            connection_id: Connection ID to add
            assign_membership: Whether to automatically assign membership

        Returns:
            dict: Connection data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        payload = {
            "connection_id": connection_id,
            "assign_membership_on_login": assign_membership,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/organizations/{org_id}/enabled_connections",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def delete_connection(self, org_id: str, connection_id: str) -> None:
        """
        Remove a connection from an organization.

        Args:
            org_id: Auth0 organization ID
            connection_id: Connection ID to remove

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/organizations/{org_id}/enabled_connections/{connection_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()

    async def update_organization(
        self, org_id: str, org_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update organization details.

        Args:
            org_id: Auth0 organization ID
            org_data: Organization data to update

        Returns:
            dict: Updated organization data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/organizations/{org_id}",
                headers={"Authorization": f"Bearer {token}"},
                json=org_data,
            )
            response.raise_for_status()
            return response.json()

    async def delete_organization(self, org_id: str) -> None:
        """
        Delete an organization.

        Args:
            org_id: Auth0 organization ID

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/organizations/{org_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()

    async def get_organizations(
        self, page: int = 1, size: int = 50
    ) -> Dict[str, Any]:
        """
        Get all organizations (paginated).

        Args:
            page: Page number (1-indexed)
            size: Page size

        Returns:
            dict: Paginated organizations data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/organizations",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "page": page - 1,
                    "per_page": size,
                    "include_totals": "true",
                },
            )
            response.raise_for_status()
            return response.json()
