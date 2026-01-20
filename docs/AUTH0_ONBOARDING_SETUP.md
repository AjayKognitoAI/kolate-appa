# Auth0 & Enterprise Onboarding Setup Guide

## Overview

This document provides step-by-step instructions for configuring Auth0 to support the enterprise onboarding flow in Kolate. The system uses Auth0 Organizations for multi-tenancy, with role-based access control (RBAC) for different user types.

---

## Table of Contents

1. [Auth0 Tenant Setup](#1-auth0-tenant-setup)
2. [Application Configuration](#2-application-configuration)
3. [API Configuration](#3-api-configuration)
4. [Organizations Feature](#4-organizations-feature)
5. [Roles & Permissions](#5-roles--permissions)
6. [Connections Setup](#6-connections-setup)
7. [Environment Variables](#7-environment-variables)
8. [Testing the Flow](#8-testing-the-flow)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Auth0 Tenant Setup

### 1.1 Create Auth0 Tenant

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new tenant or use an existing one
3. Note your **Auth0 Domain** (e.g., `your-tenant.us.auth0.com`)

### 1.2 Enable Required Features

Navigate to **Settings** > **General** and ensure:
- ✅ **Organizations** feature is enabled
- ✅ **API Authorization** is enabled

---

## 2. Application Configuration

### 2.1 Create Regular Web Application

1. Go to **Applications** > **Applications** > **Create Application**
2. Name: `Kolate Web App`
3. Type: **Regular Web Applications**
4. Click **Create**

### 2.2 Configure Application Settings

In the application settings:

```
Allowed Callback URLs:
  http://localhost:3000/api/auth/callback/auth0
  https://your-domain.com/api/auth/callback/auth0

Allowed Logout URLs:
  http://localhost:3000
  https://your-domain.com

Allowed Web Origins:
  http://localhost:3000
  https://your-domain.com
```

### 2.3 Configure JWT Settings

In **Advanced Settings** > **OAuth**:
- **JSON Web Token (JWT) Signature Algorithm**: RS256
- ✅ **OIDC Conformant**

### 2.4 Note Application Credentials

Copy these values for environment variables:
- **Domain**: `AUTH0_DOMAIN`
- **Client ID**: `AUTH0_CLIENT_ID`
- **Client Secret**: `AUTH0_CLIENT_SECRET`

---

## 3. API Configuration

### 3.1 Create API

1. Go to **Applications** > **APIs** > **Create API**
2. Name: `Kolate Backend API`
3. Identifier: `https://api.kolate.io` (or your API URL)
4. Signing Algorithm: RS256
5. Click **Create**

### 3.2 Configure API Permissions

In the API settings, add these permissions under **Permissions** tab:

| Permission | Description |
|------------|-------------|
| `read:enterprises` | Read enterprise data |
| `write:enterprises` | Create/update enterprises |
| `enterprises:invite` | Invite new enterprises |
| `delete:enterprises` | Delete enterprises |
| `read:users` | Read user data |
| `write:users` | Create/update users |
| `manage:organization` | Manage organization settings |
| `read:projects` | Read project data |
| `write:projects` | Create/update projects |

### 3.3 Enable RBAC

In API settings > **Settings** tab:
- ✅ **Enable RBAC**
- ✅ **Add Permissions in the Access Token**

---

## 4. Organizations Feature

### 4.1 Enable Organizations

1. Go to **Organizations** in the sidebar
2. If not enabled, click **Enable Organizations**

### 4.2 Organization Settings

Configure default settings:

```
Default Login Experience: Universal Login
Member Roles: Will be assigned during invite
```

### 4.3 Organization Branding (Optional)

Set default branding that can be overridden per organization:
- Logo URL
- Primary Color
- Background Color

---

## 5. Roles & Permissions

### 5.1 Create Roles

Go to **User Management** > **Roles** > **Create Role**

#### Role 1: Platform Admin (`root:admin`)

```
Name: root:admin
Description: Platform administrator with full access to admin dashboard
```

Assign permissions:
- `enterprises:invite`
- `read:enterprises`
- `write:enterprises`
- `delete:enterprises`
- `manage:organization`

#### Role 2: Organization Admin (`org:admin`)

```
Name: org:admin
Description: Organization administrator with full access to their org
```

Assign permissions:
- `read:enterprises`
- `manage:organization`
- `read:users`
- `write:users`
- `read:projects`
- `write:projects`

#### Role 3: Organization Member (`org:member`)

```
Name: org:member
Description: Regular organization member
```

Assign permissions:
- `read:users`
- `read:projects`
- `write:projects`

### 5.2 Note Role IDs

After creating roles, note the **Role ID** for each:
- `org:admin` Role ID → `AUTH0_ORG_ADMIN_ROLE_ID`

---

## 6. Connections Setup

### 6.1 Database Connection

1. Go to **Authentication** > **Database** > **Username-Password-Authentication**
2. Ensure it's enabled
3. Note the **Connection ID** → `AUTH0_DEFAULT_CONNECTION_ID`

### 6.2 Social Connections (Optional)

Enable social logins as needed:
- Google
- Microsoft
- GitHub

### 6.3 Enterprise Connections (For SSO)

For enterprise SSO during onboarding:

1. Go to **Authentication** > **Enterprise**
2. Add connections as needed:
   - **SAML** - For generic SAML IdPs
   - **OIDC** - For OpenID Connect providers
   - **Azure AD** - For Microsoft
   - **Okta** - For Okta IdPs
   - **Google Workspace** - For Google SSO

---

## 7. Environment Variables

### 7.1 Backend Environment (`.env`)

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.kolate.io
AUTH0_ISSUER=https://your-tenant.us.auth0.com/
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_MANAGEMENT_API_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/

# Organization Configuration
AUTH0_DEFAULT_CONNECTION_ID=con_xxxxxxxxxx
AUTH0_ORG_ADMIN_ROLE_ID=rol_xxxxxxxxxx

# Frontend URL (for onboarding links)
FRONTEND_URL=http://localhost:3000
```

### 7.2 Frontend Environment (`.env.local`)

```bash
# Auth0 Configuration
AUTH0_SECRET=your-secret-key-min-32-chars
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.kolate.io

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### 7.3 Get Management API Token

For the backend to create organizations, you need Management API access:

1. Go to **Applications** > **APIs** > **Auth0 Management API**
2. Under **Machine to Machine Applications**, authorize your backend app
3. Grant these scopes:
   - `read:organizations`
   - `create:organizations`
   - `update:organizations`
   - `delete:organizations`
   - `read:organization_members`
   - `create:organization_members`
   - `delete:organization_members`
   - `read:organization_invitations`
   - `create:organization_invitations`
   - `delete:organization_invitations`
   - `read:organization_connections`
   - `create:organization_connections`
   - `delete:organization_connections`
   - `read:users`
   - `create:users`
   - `update:users`
   - `read:roles`
   - `create:role_members`

---

## 8. Testing the Flow

### 8.1 Invite Flow Test

1. **Login as root:admin**
   - Access `/admin/dashboard`
   - Navigate to `/admin/enterprises`

2. **Invite New Enterprise**
   - Click "Add Enterprise"
   - Fill in:
     - Enterprise Name: `Test Corp`
     - Admin Email: `admin@testcorp.com`
     - Enterprise URL: `https://testcorp.com`
   - Submit

3. **Verify Creation**
   - Check Auth0 Dashboard → Organizations
   - Verify organization created with format: `test-corp-{random}`
   - Check invitation was sent

### 8.2 Onboarding Flow Test

1. **Access Onboarding Link**
   - Get token from enterprise table (Copy Onboarding Link)
   - Open URL: `/onboarding/{token}`

2. **Complete Wizard Steps**
   - Step 1: Company Information
   - Step 2: Admin Profile
   - Step 3: SSO Configuration (optional)
   - Step 4: Invite Team Members (optional)
   - Step 5: Data Source (optional)
   - Step 6: Review & Complete

3. **Verify Activation**
   - Enterprise status changes to ACTIVE
   - Organization is fully configured in Auth0
   - Admin can login

### 8.3 Role-Based Access Test

| User Role | Should Access | Should NOT Access |
|-----------|---------------|-------------------|
| `root:admin` | `/admin/*` | `/org/*`, regular app |
| `org:admin` | `/org/*` | `/admin/*` |
| `org:member` | Regular app routes | `/admin/*`, `/org/*` |

---

## 9. Troubleshooting

### 9.1 Common Issues

#### "Invalid token" on onboarding

**Cause**: Token expired or already used
**Solution**:
- Check if enterprise status is already ACTIVE
- Resend invitation from admin panel

#### "Failed to create organization"

**Cause**: Missing Management API permissions
**Solution**:
1. Go to Auth0 → APIs → Auth0 Management API
2. Authorize your application
3. Grant `create:organizations` scope

#### "Connection not enabled for organization"

**Cause**: Default connection not added to organization
**Solution**:
- Verify `AUTH0_DEFAULT_CONNECTION_ID` is correct
- Check backend logs for connection errors

#### "User has no roles"

**Cause**: Role assignment failed during invite
**Solution**:
1. Verify `AUTH0_ORG_ADMIN_ROLE_ID` is correct
2. Check if role exists in Auth0
3. Manually assign role in Auth0 Dashboard

### 9.2 Debug Logging

Enable debug logging in backend:

```python
# backend/app/config/settings.py
LOG_LEVEL = "DEBUG"
```

Check logs for:
- Auth0 API call responses
- Organization creation details
- Invitation send results

### 9.3 Auth0 Logs

Monitor Auth0 logs for:
1. Go to **Monitoring** > **Logs**
2. Filter by:
   - `Type: Success Login (s)`
   - `Type: Failed Login (f)`
   - `Type: Success API Operation (sapi)`
   - `Type: Failed API Operation (fapi)`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Enterprise Onboarding Flow                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  root:admin  │────▶│  Admin UI    │────▶│ POST /invite │
│   (Kolate)   │     │ /admin/      │     │              │
└──────────────┘     │ enterprises  │     └──────┬───────┘
                     └──────────────┘            │
                                                 ▼
                     ┌────────────────────────────────────────────────┐
                     │              Backend Invite Service             │
                     │                                                 │
                     │  1. Validate enterprise data                    │
                     │  2. Create Auth0 Organization ──────────────▶ Auth0
                     │  3. Add default connection                      │
                     │  4. Create Enterprise record ───────────────▶ PostgreSQL
                     │  5. Create tenant schema (org_{id})             │
                     │  6. Create onboarding progress                  │
                     │  7. Send invitation email ──────────────────▶ Auth0
                     │                                                 │
                     └─────────────────────┬──────────────────────────┘
                                           │
                                           ▼
                     ┌──────────────────────────────────────────────┐
                     │              Admin Receives Email             │
                     │                                               │
                     │  Contains: Onboarding link with token         │
                     │  URL: /onboarding/{token}                     │
                     │                                               │
                     └─────────────────────┬────────────────────────┘
                                           │
                                           ▼
┌─────────────┐     ┌──────────────────────────────────────────────┐
│  Enterprise │────▶│           Onboarding Wizard UI               │
│    Admin    │     │                                               │
└─────────────┘     │  Step 1: Company Info                        │
                    │  Step 2: Admin Profile                        │
                    │  Step 3: SSO Config (optional)                │
                    │  Step 4: Invite Team (optional)               │
                    │  Step 5: Data Source (optional)               │
                    │  Step 6: Review & Complete                    │
                    │                                               │
                    └─────────────────────┬────────────────────────┘
                                          │
                                          ▼
                    ┌──────────────────────────────────────────────┐
                    │           POST /complete                      │
                    │                                               │
                    │  1. Update enterprise data                    │
                    │  2. Set status = ACTIVE                       │
                    │  3. Mark onboarding complete                  │
                    │  4. Invalidate token                          │
                    │                                               │
                    └──────────────────────────────────────────────┘
```

---

## Role-Based Access Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    Frontend Middleware (middleware.ts)              │
└────────────────────────────────────────────────────────────────────┘

                              User Request
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   Check Authentication   │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Not Logged In   │ │ Logged In,    │ │ Logged In,    │
    │                 │ │ No Roles      │ │ Has Roles     │
    └────────┬────────┘ └───────┬───────┘ └───────┬───────┘
             │                  │                  │
             ▼                  ▼                  ▼
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Public routes   │ │ Redirect to   │ │ Check role    │
    │ only (/, /on-   │ │ /setup        │ │ permissions   │
    │ boarding/*)     │ │               │ │               │
    └─────────────────┘ └───────────────┘ └───────┬───────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────┐
                    │                             │                 │
                    ▼                             ▼                 ▼
         ┌──────────────────┐         ┌────────────────┐  ┌────────────────┐
         │   root:admin     │         │   org:admin    │  │   org:member   │
         │                  │         │                │  │                │
         │ Access: /admin/* │         │ Access: /org/* │  │ Access: app    │
         │ Redirect to:     │         │ Redirect to:   │  │ routes only    │
         │ /admin/dashboard │         │ /org/dashboard │  │                │
         └──────────────────┘         └────────────────┘  └────────────────┘
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `backend/app/services/enterprises/invite_service.py` | Enterprise invitation orchestration |
| `backend/app/routes/enterprises/invite.py` | Invite API endpoints |
| `backend/app/services/auth/auth0_org_service.py` | Auth0 organization management |
| `backend/app/services/auth/auth0_user_service.py` | Auth0 user & invitation management |
| `backend/app/middleware/api_gateway.py` | JWT validation & auth middleware |
| `frontend/middleware.ts` | Route protection & role-based access |
| `frontend/context/OnboardingContext.tsx` | Onboarding wizard state |
| `frontend/app/(public)/onboarding/[token]/page.tsx` | Onboarding wizard UI |
| `frontend/services/onboarding/onboarding-service.ts` | Onboarding API service |

---

## Quick Start Checklist

- [ ] Auth0 tenant created
- [ ] Web application created in Auth0
- [ ] API created with permissions
- [ ] Organizations feature enabled
- [ ] Roles created (`root:admin`, `org:admin`, `org:member`)
- [ ] Database connection enabled
- [ ] Management API authorized with required scopes
- [ ] Backend environment variables set
- [ ] Frontend environment variables set
- [ ] Test invite flow works
- [ ] Test onboarding wizard works
- [ ] Test role-based access works

---

**Last Updated**: January 2026
**Version**: 1.0
