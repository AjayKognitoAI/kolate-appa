"""
Auth0 User Service

Service for managing users via Auth0 Management API:
- Organization member operations
- User invitations
- Role assignments
- User blocking/unblocking
"""

import httpx
from typing import Optional, List, Dict, Any
from app.config.settings import settings
from app.services.auth.auth0_token_service import Auth0TokenService


class Auth0UserService:
    """Auth0 user management service."""

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.token_service = Auth0TokenService()
        self.base_url = f"https://{self.domain}/api/v2"

    async def get_organization_members(
        self, org_id: str, page: int = 1, size: int = 50
    ) -> Dict[str, Any]:
        """
        Get paginated organization members.

        Args:
            org_id: Auth0 organization ID
            page: Page number (1-indexed)
            size: Page size

        Returns:
            dict: Paginated members data with structure:
                {
                    "members": [...],
                    "start": int,
                    "limit": int,
                    "total": int
                }

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/organizations/{org_id}/members",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "page": page - 1,  # Auth0 uses 0-indexed pagination
                    "per_page": size,
                    "include_totals": "true",
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_all_organization_members(self, org_id: str) -> List[Dict[str, Any]]:
        """
        Get all organization members (across all pages).

        Args:
            org_id: Auth0 organization ID

        Returns:
            list: All organization members

        Raises:
            httpx.HTTPError: If API call fails
        """
        all_members = []
        page = 1
        page_size = 100

        while True:
            response = await self.get_organization_members(org_id, page, page_size)
            members = response.get("members", [])
            all_members.extend(members)

            # Check if there are more pages
            total = response.get("total", 0)
            if len(all_members) >= total:
                break

            page += 1

        return all_members

    async def get_organization_members_with_roles(
        self, org_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all organization members with their roles.

        Args:
            org_id: Auth0 organization ID

        Returns:
            list: Members with roles data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()
        all_members = []
        page = 0
        page_size = 100

        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    f"{self.base_url}/organizations/{org_id}/members",
                    headers={"Authorization": f"Bearer {token}"},
                    params={
                        "page": page,
                        "per_page": page_size,
                        "include_totals": "true",
                        "fields": "user_id,email,name,picture,roles",
                    },
                )
                response.raise_for_status()
                data = response.json()

                members = data.get("members", [])
                all_members.extend(members)

                # Check if there are more pages
                total = data.get("total", 0)
                if len(all_members) >= total:
                    break

                page += 1

        # Fetch roles for each member
        for member in all_members:
            user_id = member.get("user_id")
            if user_id:
                try:
                    roles = await self._get_user_roles(user_id)
                    member["roles"] = roles
                except Exception:
                    member["roles"] = []

        return all_members

    async def _get_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get roles assigned to a user.

        Args:
            user_id: Auth0 user ID

        Returns:
            list: User roles

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users/{user_id}/roles",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def create_invitation(
        self,
        org_id: str,
        invitation_data: Dict[str, Any],
        current_user: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create an organization invitation.

        Args:
            org_id: Auth0 organization ID
            invitation_data: Invitation data with structure:
                {
                    "inviter": {"name": str},
                    "invitee": {"email": str},
                    "client_id": str,
                    "connection_id": str (optional),
                    "roles": [str] (optional),
                    "send_invitation_email": bool (optional, default: true),
                    "ttl_sec": int (optional, default: 604800 - 7 days)
                }
            current_user: Current user data for inviter info

        Returns:
            dict: Created invitation data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        # Set inviter name if current_user provided
        if current_user and "inviter" not in invitation_data:
            invitation_data["inviter"] = {
                "name": current_user.get("name") or current_user.get("email", "Admin")
            }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/organizations/{org_id}/invitations",
                headers={"Authorization": f"Bearer {token}"},
                json=invitation_data,
            )
            response.raise_for_status()
            return response.json()

    async def get_organization_invitations(
        self, org_id: str, page: int = 1, size: int = 50
    ) -> Dict[str, Any]:
        """
        Get organization invitations.

        Args:
            org_id: Auth0 organization ID
            page: Page number (1-indexed)
            size: Page size

        Returns:
            dict: Paginated invitations data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/organizations/{org_id}/invitations",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "page": page - 1,
                    "per_page": size,
                    "include_totals": "true",
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_invitation(self, org_id: str, invitation_id: str) -> Dict[str, Any]:
        """
        Get a specific invitation.

        Args:
            org_id: Auth0 organization ID
            invitation_id: Invitation ID

        Returns:
            dict: Invitation data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/organizations/{org_id}/invitations/{invitation_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def delete_invitation(self, org_id: str, invitation_id: str) -> None:
        """
        Delete an invitation.

        Args:
            org_id: Auth0 organization ID
            invitation_id: Invitation ID

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/organizations/{org_id}/invitations/{invitation_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()

    async def assign_roles(self, user_id: str, role_ids: List[str]) -> None:
        """
        Assign roles to a user.

        Args:
            user_id: Auth0 user ID
            role_ids: List of role IDs to assign

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/users/{user_id}/roles",
                headers={"Authorization": f"Bearer {token}"},
                json={"roles": role_ids},
            )
            response.raise_for_status()

    async def change_roles(
        self, user_id: str, add_roles: List[str], remove_roles: List[str]
    ) -> None:
        """
        Change user roles by adding and removing roles.

        Args:
            user_id: Auth0 user ID
            add_roles: List of role IDs to add
            remove_roles: List of role IDs to remove

        Raises:
            httpx.HTTPError: If API call fails
        """
        # Remove roles first
        if remove_roles:
            await self.remove_roles(user_id, remove_roles)

        # Then add new roles
        if add_roles:
            await self.assign_roles(user_id, add_roles)

    async def remove_roles(self, user_id: str, role_ids: List[str]) -> None:
        """
        Remove roles from a user.

        Args:
            user_id: Auth0 user ID
            role_ids: List of role IDs to remove

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/users/{user_id}/roles",
                headers={"Authorization": f"Bearer {token}"},
                json={"roles": role_ids},
            )
            response.raise_for_status()

    async def set_user_blocked(self, user_id: str, blocked: bool) -> Dict[str, Any]:
        """
        Block or unblock a user.

        Args:
            user_id: Auth0 user ID
            blocked: True to block, False to unblock

        Returns:
            dict: Updated user data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
                json={"blocked": blocked},
            )
            response.raise_for_status()
            return response.json()

    async def get_user(self, user_id: str) -> Dict[str, Any]:
        """
        Get user details.

        Args:
            user_id: Auth0 user ID

        Returns:
            dict: User data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def update_user(
        self, user_id: str, user_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update user details.

        Args:
            user_id: Auth0 user ID
            user_data: User data to update (e.g., name, email, user_metadata)

        Returns:
            dict: Updated user data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/users/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
                json=user_data,
            )
            response.raise_for_status()
            return response.json()
