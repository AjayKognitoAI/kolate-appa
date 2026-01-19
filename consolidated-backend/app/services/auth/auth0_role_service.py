"""
Auth0 Role Service

Service for managing Auth0 roles:
- Get all roles
- Get role details
- Get role users
"""

import httpx
from typing import List, Dict, Any
from app.config.settings import settings
from app.services.auth.auth0_token_service import Auth0TokenService


class Auth0RoleService:
    """Auth0 role management service."""

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.token_service = Auth0TokenService()
        self.base_url = f"https://{self.domain}/api/v2"

    async def get_all_roles(self) -> List[Dict[str, Any]]:
        """
        Get all roles from Auth0.

        Returns:
            list: All roles

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()
        all_roles = []
        page = 0
        page_size = 100

        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    f"{self.base_url}/roles",
                    headers={"Authorization": f"Bearer {token}"},
                    params={
                        "page": page,
                        "per_page": page_size,
                        "include_totals": "true",
                    },
                )
                response.raise_for_status()
                data = response.json()

                roles = data.get("roles", [])
                all_roles.extend(roles)

                # Check if there are more pages
                total = data.get("total", 0)
                if len(all_roles) >= total:
                    break

                page += 1

        return all_roles

    async def get_role(self, role_id: str) -> Dict[str, Any]:
        """
        Get role details.

        Args:
            role_id: Auth0 role ID

        Returns:
            dict: Role data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/roles/{role_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def get_role_users(
        self, role_id: str, page: int = 1, size: int = 50
    ) -> Dict[str, Any]:
        """
        Get users assigned to a role.

        Args:
            role_id: Auth0 role ID
            page: Page number (1-indexed)
            size: Page size

        Returns:
            dict: Paginated users data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/roles/{role_id}/users",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "page": page - 1,
                    "per_page": size,
                    "include_totals": "true",
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_all_role_users(self, role_id: str) -> List[Dict[str, Any]]:
        """
        Get all users assigned to a role (across all pages).

        Args:
            role_id: Auth0 role ID

        Returns:
            list: All users with this role

        Raises:
            httpx.HTTPError: If API call fails
        """
        all_users = []
        page = 1
        page_size = 100

        while True:
            response = await self.get_role_users(role_id, page, page_size)
            users = response.get("users", [])
            all_users.extend(users)

            # Check if there are more pages
            total = response.get("total", 0)
            if len(all_users) >= total:
                break

            page += 1

        return all_users

    async def get_role_permissions(self, role_id: str) -> List[Dict[str, Any]]:
        """
        Get permissions assigned to a role.

        Args:
            role_id: Auth0 role ID

        Returns:
            list: Role permissions

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/roles/{role_id}/permissions",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            return response.json()

    async def create_role(self, role_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new role.

        Args:
            role_data: Role data with structure:
                {
                    "name": str (required),
                    "description": str (optional)
                }

        Returns:
            dict: Created role data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/roles",
                headers={"Authorization": f"Bearer {token}"},
                json=role_data,
            )
            response.raise_for_status()
            return response.json()

    async def update_role(
        self, role_id: str, role_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update role details.

        Args:
            role_id: Auth0 role ID
            role_data: Role data to update

        Returns:
            dict: Updated role data

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.base_url}/roles/{role_id}",
                headers={"Authorization": f"Bearer {token}"},
                json=role_data,
            )
            response.raise_for_status()
            return response.json()

    async def delete_role(self, role_id: str) -> None:
        """
        Delete a role.

        Args:
            role_id: Auth0 role ID

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/roles/{role_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()

    async def add_role_permissions(
        self, role_id: str, permissions: List[Dict[str, str]]
    ) -> None:
        """
        Add permissions to a role.

        Args:
            role_id: Auth0 role ID
            permissions: List of permissions with structure:
                [
                    {
                        "resource_server_identifier": str,
                        "permission_name": str
                    }
                ]

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/roles/{role_id}/permissions",
                headers={"Authorization": f"Bearer {token}"},
                json={"permissions": permissions},
            )
            response.raise_for_status()

    async def remove_role_permissions(
        self, role_id: str, permissions: List[Dict[str, str]]
    ) -> None:
        """
        Remove permissions from a role.

        Args:
            role_id: Auth0 role ID
            permissions: List of permissions to remove

        Raises:
            httpx.HTTPError: If API call fails
        """
        token = await self.token_service.get_management_token()

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/roles/{role_id}/permissions",
                headers={"Authorization": f"Bearer {token}"},
                json={"permissions": permissions},
            )
            response.raise_for_status()
