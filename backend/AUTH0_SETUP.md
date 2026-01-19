# Auth0 Setup Guide

This guide explains how to configure Auth0 for use with this FastAPI template.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Auth0 Dashboard Configuration](#auth0-dashboard-configuration)
3. [Environment Configuration](#environment-configuration)
4. [RBAC Setup](#rbac-setup)
5. [Usage in Code](#usage-in-code)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- An Auth0 account (free tier works for development)
- A registered Auth0 Application (Single Page Application, Native, or Regular Web App)
- An Auth0 API configured for your backend

## Auth0 Dashboard Configuration

### Step 1: Create an API

1. Go to **Auth0 Dashboard** → **Applications** → **APIs**
2. Click **+ Create API**
3. Fill in the details:
   - **Name**: Your API Name (e.g., "FastAPI Backend")
   - **Identifier**: Your API audience URL (e.g., `https://api.example.com`)
   - **Signing Algorithm**: RS256 (recommended)
4. Click **Create**

### Step 2: Configure API Permissions (Scopes)

In your API settings → **Permissions** tab, add the permissions your application needs:

```
features:read       - Read access to features
features:write      - Write access to features
features:delete     - Delete access to features
features:admin      - Admin access to features
users:read          - Read access to users
users:write         - Write access to users
users:delete        - Delete access to users
users:admin         - Admin access to users
users:read:self     - Read own user data
users:write:self    - Update own user data
```

Add permissions following the pattern: `{resource}:{action}` or `{resource}:{action}:{scope}`.

### Step 3: Enable RBAC

1. Go to your API settings → **RBAC Settings**
2. Enable **Enable RBAC**
3. Enable **Add Permissions in the Access Token**

This ensures permissions are included in the JWT access token.

### Step 4: Create Roles

1. Go to **User Management** → **Roles**
2. Create roles and assign permissions:

**Admin Role:**
- `features:read`, `features:write`, `features:delete`, `features:admin`
- `users:read`, `users:write`, `users:delete`, `users:admin`

**User Role:**
- `features:read`
- `users:read:self`, `users:write:self`

**Manager Role:**
- `features:read`, `features:write`
- `users:read`, `users:write`

### Step 5: Add Custom Claims (Optional)

To include roles in the token, create a **Post Login Action**:

1. Go to **Actions** → **Library**
2. Click **Build Custom**
3. Create an action with this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://your-namespace';

  if (event.authorization) {
    // Add roles to the access token
    api.accessToken.setCustomClaim(
      `${namespace}/roles`,
      event.authorization.roles
    );

    // Add roles to the ID token
    api.idToken.setCustomClaim(
      `${namespace}/roles`,
      event.authorization.roles
    );
  }
};
```

4. Deploy the action
5. Add it to the **Login Flow** under **Actions** → **Flows**

## Environment Configuration

Configure these environment variables in your `.env` file:

```bash
# Required Auth0 Settings
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.example.com

# Optional Settings (with defaults)
AUTH0_ALGORITHMS=RS256
AUTH0_ISSUER=https://your-tenant.auth0.com/

# RBAC Configuration
AUTH0_PERMISSIONS_CLAIM=permissions
AUTH0_ROLES_CLAIM=https://your-namespace/roles
AUTH0_USE_RBAC=true
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH0_DOMAIN` | Your Auth0 tenant domain | Required |
| `AUTH0_AUDIENCE` | API identifier (audience) | Required |
| `AUTH0_ALGORITHMS` | JWT signing algorithms | `RS256` |
| `AUTH0_ISSUER` | Token issuer URL | `https://{domain}/` |
| `AUTH0_PERMISSIONS_CLAIM` | Claim containing permissions | `permissions` |
| `AUTH0_ROLES_CLAIM` | Claim containing roles | (custom namespace) |
| `AUTH0_USE_RBAC` | Enable database RBAC augmentation | `true` |

## RBAC Setup

### Permission Format

This template uses a permission format compatible with Auth0:

```
{resource}:{action}[:{scope}]

Examples:
- features:read         # Read all features
- features:write        # Create/update features
- features:delete       # Delete features
- users:read:self       # Read own user data
- users:write:admin     # Admin write access to users
```

### How Permissions Work

1. **Token Permissions**: When a user authenticates, Auth0 includes their permissions in the JWT token under the `permissions` claim.

2. **Permission Checking**: The `has_permissions()` dependency checks these permissions:

```python
from app.core.permissions import has_permissions, get_current_user, Auth0User

@router.get("/features")
async def get_features(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("features:read"))
):
    # User must have "features:read" permission
    return {"features": [...]}
```

3. **Hybrid RBAC (Optional)**: If `AUTH0_USE_RBAC=true`, permissions can also come from the database, allowing you to augment Auth0 permissions with application-specific ones.

## Usage in Code

### Basic Authentication

```python
from fastapi import Depends
from app.core.permissions import get_current_user, Auth0User

@router.get("/profile")
async def get_profile(
    current_user: Auth0User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "permissions": current_user.permissions,
        "roles": current_user.roles
    }
```

### Permission-Based Authorization

```python
from app.core.permissions import has_permissions

# Single permission
@router.get("/features")
async def list_features(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions("features:read"))
):
    return await feature_service.get_all(db)

# Multiple permissions (ANY)
@router.post("/features")
async def create_feature(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions(["features:write", "features:admin"]))
):
    # User needs either features:write OR features:admin
    pass

# Multiple permissions (ALL)
@router.delete("/features/{id}")
async def delete_feature(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_permissions(
        ["features:delete", "features:admin"],
        require_all=True
    ))
):
    # User needs BOTH features:delete AND features:admin
    pass
```

### Role-Based Authorization

```python
from app.core.permissions import has_role

@router.get("/admin/dashboard")
async def admin_dashboard(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_role("admin"))
):
    # User must have "admin" role
    return {"dashboard": "admin data"}
```

### Scope-Based Authorization

```python
from app.core.permissions import has_scope

@router.get("/data/export")
async def export_data(
    current_user: Auth0User = Depends(get_current_user),
    _: None = Depends(has_scope("read:data"))
):
    # User must have "read:data" OAuth scope
    return {"data": [...]}
```

### Using with CRUD Router

The CRUD Router automatically applies permissions:

```python
from app.routes.crud_router import CRUDRouter

crud_router = CRUDRouter(
    service_class=FeatureService,
    schema=FeatureOut,
    create_schema=FeatureCreate,
    update_schema=FeatureUpdate,
    prefix="/features",
    tags=["Features"],
    resource_name="features",  # Generates features:read, features:write, etc.
)

router = crud_router.get_router()
```

Custom permission mappings:

```python
crud_router = CRUDRouter(
    # ...
    custom_permissions={
        "get_all": "features:list",
        "create": "features:create",
        "delete": "admin:delete"
    }
)
```

## Testing

### Get a Test Token

1. **Using Auth0 Test Token Generator:**
   - Go to your API in Auth0 Dashboard
   - Click **Test** tab
   - Copy the generated token

2. **Using cURL:**
   ```bash
   curl --request POST \
     --url https://YOUR_DOMAIN/oauth/token \
     --header 'content-type: application/json' \
     --data '{
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET",
       "audience": "YOUR_API_AUDIENCE",
       "grant_type": "client_credentials"
     }'
   ```

### Test the API

```bash
# Get token from above command
TOKEN="your_access_token"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/features

# Test with Swagger UI
# 1. Visit http://localhost:8000/docs
# 2. Click "Authorize" button
# 3. Enter: Bearer YOUR_TOKEN
```

### Unit Testing with Mock Auth

```python
import pytest
from unittest.mock import patch
from app.core.permissions import Auth0User

@pytest.fixture
def mock_current_user():
    return Auth0User(
        id="auth0|123456",
        email="test@example.com",
        permissions=["features:read", "features:write"],
        roles=["user"],
    )

@pytest.mark.asyncio
async def test_get_features(client, mock_current_user):
    with patch("app.core.permissions.get_current_user", return_value=mock_current_user):
        response = await client.get("/api/v1/features")
        assert response.status_code == 200
```

## Troubleshooting

### Common Issues

**1. "Invalid authentication credentials"**
- Verify `AUTH0_DOMAIN` is correct (without `https://`)
- Check that `AUTH0_AUDIENCE` matches your API identifier
- Ensure the token hasn't expired

**2. "Insufficient permissions"**
- Verify permissions are enabled in API settings
- Check that roles are assigned to the user
- Verify permissions are added to the access token (RBAC settings)

**3. "Could not validate credentials"**
- Check if JWKS endpoint is accessible
- Verify the token algorithm matches `AUTH0_ALGORITHMS`
- Check issuer URL matches `AUTH0_ISSUER`

**4. Permissions not appearing in token**
- Enable "Add Permissions in the Access Token" in API RBAC settings
- Ensure user has roles with the required permissions assigned
- For roles, verify the Post Login Action is deployed and in the flow

### Debug Mode

Enable debug logging to see token validation details:

```python
# In app/core/auth0.py, logging is already configured
# Set LOG_LEVEL=DEBUG in .env to see detailed logs
```

### Token Inspection

Use [jwt.io](https://jwt.io) to decode and inspect your tokens. Verify:
- `iss` matches your Auth0 domain
- `aud` contains your API audience
- `permissions` array contains expected permissions
- Token is not expired (`exp` claim)

## Security Best Practices

1. **Never expose secrets**: Keep `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` secure
2. **Use RS256**: Asymmetric signing prevents token forgery
3. **Validate audience**: Always verify the token audience
4. **Short token expiry**: Use short-lived access tokens (15-60 min)
5. **Use refresh tokens**: Implement refresh token rotation for long sessions
6. **Scope permissions narrowly**: Only grant the minimum required permissions

## Additional Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Python SDK](https://auth0.com/docs/quickstart/backend/python)
- [JWT.io](https://jwt.io) - JWT decoder
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac-overview)
