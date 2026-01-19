# Auth0 Services

Complete implementation of Auth0 Management API services for the FastAPI backend migration.

## Overview

These services provide a clean, async interface to the Auth0 Management API:

- **Auth0TokenService** - M2M token management with caching
- **Auth0UserService** - User and invitation management
- **Auth0OrgService** - Organization management
- **Auth0RoleService** - Role management and RBAC
- **Auth0SsoService** - SSO ticket generation

## Configuration

Required environment variables in `.env`:

```bash
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_M2M_CLIENT_ID=your_client_id
AUTH0_M2M_CLIENT_SECRET=your_client_secret
AUTH0_MGMT_AUDIENCE=https://your-tenant.auth0.com/api/v2/
AUTH0_SSO_PROFILE_ID=ssp_xxxxx  # Optional, for SSO tickets
```

## Usage Examples

### User Management

```python
from app.services.auth import Auth0UserService

# Initialize service
user_service = Auth0UserService()

# Get organization members (paginated)
members = await user_service.get_organization_members(
    org_id="org_abc123",
    page=1,
    size=50
)

# Get all members with roles
members_with_roles = await user_service.get_organization_members_with_roles(
    org_id="org_abc123"
)

# Create invitation
invitation = await user_service.create_invitation(
    org_id="org_abc123",
    invitation_data={
        "invitee": {"email": "user@example.com"},
        "client_id": "your_client_id",
        "roles": ["rol_abc123"],
        "send_invitation_email": True
    }
)

# Assign roles to user
await user_service.assign_roles(
    user_id="auth0|123456",
    role_ids=["rol_abc123", "rol_def456"]
)

# Block/unblock user
await user_service.set_user_blocked(
    user_id="auth0|123456",
    blocked=True
)
```

### Organization Management

```python
from app.services.auth import Auth0OrgService

org_service = Auth0OrgService()

# Create organization
org = await org_service.create_organization({
    "name": "acme-corp",
    "display_name": "ACME Corporation",
    "metadata": {"industry": "technology"}
})

# Get organization details
org = await org_service.get_organization("org_abc123")

# Get organization connections
connections = await org_service.get_organization_connections("org_abc123")

# Add connection to organization
await org_service.add_connection(
    org_id="org_abc123",
    connection_id="con_abc123",
    assign_membership=True
)
```

### Role Management

```python
from app.services.auth import Auth0RoleService

role_service = Auth0RoleService()

# Get all roles
roles = await role_service.get_all_roles()

# Get role details
role = await role_service.get_role("rol_abc123")

# Get users with role
users = await role_service.get_role_users("rol_abc123")

# Get role permissions
permissions = await role_service.get_role_permissions("rol_abc123")

# Create role
new_role = await role_service.create_role({
    "name": "Project Manager",
    "description": "Can manage projects"
})

# Add permissions to role
await role_service.add_role_permissions(
    role_id="rol_abc123",
    permissions=[
        {
            "resource_server_identifier": "https://api.example.com",
            "permission_name": "read:projects"
        }
    ]
)
```

### SSO Tickets

```python
from app.services.auth import Auth0SsoService

sso_service = Auth0SsoService()

# Create SSO ticket for self-service profile
ticket = await sso_service.create_sso_ticket(
    user_id="auth0|123456",
    profile_id="ssp_abc123",
    result_url="https://app.example.com/dashboard",
    ttl_sec=300
)
# Returns: {"ticket": "https://your-tenant.auth0.com/..."}

# Create password change ticket
ticket = await sso_service.create_password_change_ticket(
    user_id="auth0|123456",
    result_url="https://app.example.com/login"
)

# Create email verification ticket
ticket = await sso_service.create_email_verification_ticket(
    user_id="auth0|123456",
    result_url="https://app.example.com/verified"
)

# Send verification email
await sso_service.send_verification_email("auth0|123456")
```

### Token Management

```python
from app.services.auth import Auth0TokenService

token_service = Auth0TokenService()

# Get management token (automatically cached)
token = await token_service.get_management_token()

# Invalidate cached token (force refresh)
await token_service.invalidate_token()
```

## Using in FastAPI Routes

```python
from fastapi import APIRouter, Depends
from app.core.permissions import get_current_user, Auth0User
from app.services.auth import Auth0UserService, Auth0OrgService

router = APIRouter()

@router.get("/organizations/{org_id}/members")
async def get_org_members(
    org_id: str,
    page: int = 1,
    size: int = 50,
    current_user: Auth0User = Depends(get_current_user)
):
    """Get organization members with pagination."""
    user_service = Auth0UserService()
    members = await user_service.get_organization_members(org_id, page, size)
    return members

@router.post("/organizations/{org_id}/invitations")
async def create_invitation(
    org_id: str,
    invitation_data: dict,
    current_user: Auth0User = Depends(get_current_user)
):
    """Create organization invitation."""
    user_service = Auth0UserService()
    invitation = await user_service.create_invitation(
        org_id,
        invitation_data,
        current_user={"email": current_user.email, "name": current_user.name}
    )
    return invitation
```

## Error Handling

All services use httpx and will raise `httpx.HTTPError` on API failures:

```python
import httpx
from app.services.auth import Auth0UserService

user_service = Auth0UserService()

try:
    members = await user_service.get_organization_members("org_abc123")
except httpx.HTTPStatusError as e:
    # Handle HTTP errors (4xx, 5xx)
    print(f"HTTP {e.response.status_code}: {e.response.text}")
except httpx.RequestError as e:
    # Handle connection errors
    print(f"Request failed: {e}")
```

## Token Caching

The `Auth0TokenService` automatically caches M2M tokens in both memory and Redis:

- **In-memory cache**: Fast access, survives for the lifetime of the service instance
- **Redis cache**: Shared across instances, survives restarts
- **Automatic refresh**: Tokens are refreshed 5 minutes before expiry
- **Fallback**: If Redis fails, falls back to in-memory cache

## Performance Considerations

1. **Token Caching**: Management API tokens are cached and reused across requests
2. **Pagination**: Use paginated methods for large datasets to avoid timeouts
3. **Batch Operations**: Use `get_all_*` methods judiciously as they fetch all pages
4. **Connection Pooling**: httpx AsyncClient handles connection pooling automatically

## Testing

Mock the services in tests using pytest fixtures:

```python
import pytest
from unittest.mock import AsyncMock
from app.services.auth import Auth0UserService

@pytest.fixture
def mock_user_service(monkeypatch):
    service = Auth0UserService()
    service.get_organization_members = AsyncMock(return_value={
        "members": [{"user_id": "auth0|123", "email": "test@example.com"}],
        "total": 1
    })
    return service

async def test_get_members(mock_user_service):
    members = await mock_user_service.get_organization_members("org_123")
    assert len(members["members"]) == 1
```

## Migration Notes

These services replace the Spring Boot Auth0 service implementations:

| Spring Boot Service | FastAPI Service | Methods |
|---------------------|-----------------|---------|
| Auth0ManagementService | Auth0UserService | User/invitation operations |
| Auth0OrganizationService | Auth0OrgService | Organization CRUD |
| Auth0RoleService | Auth0RoleService | Role management |
| Auth0TokenService | Auth0TokenService | Token management |
| Auth0SsoService | Auth0SsoService | SSO ticket generation |

All methods are now async and use httpx instead of RestTemplate.
