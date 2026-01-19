# Enterprise Onboarding Guide

This document describes the enterprise customer onboarding workflow for the Kolate platform.

## Overview

Enterprise onboarding is a multi-phase process that provisions a new customer organization with all necessary infrastructure and access. The process involves both platform administrators and the enterprise customer.

## Onboarding Phases

### Phase 1: Invitation

The platform admin initiates onboarding by creating an enterprise entry and sending invitations.

**Steps:**

1. **Admin Creates Enterprise**
   - Navigate to Admin Dashboard → Enterprises → Create New
   - Enter enterprise details:
     - Company Name
     - Admin Email
     - Industry
     - Company Size
   - System generates unique Enterprise ID

2. **System Sends Invitation**
   - Invitation email sent to enterprise admin
   - Email contains:
     - Welcome message
     - Setup link with secure token
     - Token expires in 7 days

3. **Database Operations:**
   ```sql
   -- Enterprise record created in public schema
   INSERT INTO public.enterprises (
       id, name, admin_email, status, created_at
   ) VALUES (
       uuid_generate_v4(), 'Company Name', 'admin@company.com', 'INVITED', NOW()
   );
   ```

**API Endpoints:**

```bash
# Create enterprise (Admin only)
POST /api/v1/enterprises
{
    "name": "Acme Corporation",
    "admin_email": "admin@acme.com",
    "industry": "Healthcare",
    "company_size": "500-1000"
}

# Send invitation
POST /api/v1/enterprises/{enterprise_id}/invite
```

### Phase 2: SSO Setup

Enterprise admin configures Single Sign-On (SSO) for their organization.

**Steps:**

1. **Enterprise Admin Clicks Setup Link**
   - Validates invitation token
   - Redirects to SSO configuration wizard

2. **SSO Configuration Options:**
   - **Auth0 Organizations** (Recommended)
   - **SAML 2.0** (for enterprise IdPs)
   - **OIDC** (OpenID Connect)

3. **Auth0 SSO Setup:**
   - Create Auth0 Organization for enterprise
   - Configure SSO connection (if using external IdP)
   - Set up domain verification
   - Configure login/logout URLs

4. **Generate SSO Ticket:**
   ```python
   # Using Auth0 Management API
   async def create_sso_ticket(enterprise_id: str, admin_email: str):
       ticket = await auth0_mgmt.organizations.create_invitation(
           org_id=org_id,
           inviter={"name": "Kolate Platform"},
           invitee={"email": admin_email},
           client_id=settings.AUTH0_CLIENT_ID,
           roles=["org:admin"]
       )
       return ticket
   ```

**API Endpoints:**

```bash
# Validate invitation token
GET /api/v1/enterprises/setup/{token}

# Configure SSO
POST /api/v1/enterprises/{enterprise_id}/sso
{
    "provider": "auth0",
    "domain": "acme.com",
    "connection_type": "saml"
}

# Generate SSO ticket for admin
POST /api/v1/enterprises/{enterprise_id}/sso/ticket
```

### Phase 3: Completion

Final setup and provisioning of tenant infrastructure.

**Steps:**

1. **Provision Tenant Schema**
   - Create PostgreSQL schema for tenant
   - Initialize tenant tables
   ```sql
   -- Create tenant schema
   SELECT create_tenant_schema('enterprise_id');

   -- Creates: org_<enterprise_id>
   -- Tables: projects, users, roles, permissions, etc.
   ```

2. **Initial Data Setup**
   - Create default roles (Admin, Manager, User)
   - Create default permissions
   - Configure module access

3. **Enterprise Admin First Login**
   - Admin completes Auth0 authentication
   - Profile created in tenant schema
   - Assigned admin role

4. **Update Enterprise Status**
   ```python
   enterprise.status = EnterpriseStatus.ACTIVE
   enterprise.activated_at = datetime.utcnow()
   ```

**API Endpoints:**

```bash
# Complete onboarding
POST /api/v1/enterprises/{enterprise_id}/complete
{
    "admin_profile": {
        "name": "John Doe",
        "phone": "+1-555-0123"
    }
}

# Get onboarding status
GET /api/v1/enterprises/{enterprise_id}/onboarding-status
```

## Tenant Provisioning Script

Use the provided script to manually provision tenant schemas:

```bash
# Create new tenant
python scripts/provision_tenant.py <org_id>

# List all tenants
python scripts/provision_tenant.py --list

# Delete tenant (careful!)
python scripts/provision_tenant.py <org_id> --delete --confirm
```

## Module Access Management

After onboarding, configure which modules the enterprise can access:

```bash
# Grant module access
POST /api/v1/enterprises/{enterprise_id}/modules
{
    "module_id": "patient-screening",
    "trial_ids": ["trial-a", "trial-b"],
    "is_active": true
}

# Revoke module access
DELETE /api/v1/enterprises/{enterprise_id}/modules/{access_id}

# Get available modules
GET /api/v1/enterprises/{enterprise_id}/modules
```

## User Invitation Flow

After enterprise is active, invite users:

```bash
# Invite user to organization
POST /api/v1/organizations/{org_id}/users/invite
{
    "email": "user@acme.com",
    "role": "user",
    "projects": ["project-a"]
}
```

## Troubleshooting

### Common Issues

1. **Invitation Email Not Received**
   - Check spam folder
   - Verify email configuration in settings
   - Resend invitation via admin dashboard

2. **SSO Configuration Fails**
   - Verify domain ownership
   - Check Auth0 organization settings
   - Review connection configuration

3. **Tenant Schema Not Created**
   - Run manual provisioning script
   - Check database permissions
   - Review PostgreSQL logs

### Support Contacts

- Technical Support: support@kolate.ai
- Admin Dashboard: https://admin.kolate.ai
- Documentation: https://docs.kolate.ai

## Appendix: Database Schema

### Public Schema Tables

| Table | Description |
|-------|-------------|
| enterprises | Enterprise records |
| enterprise_datasources | Connection configurations |
| enterprise_module_access | Module permissions |
| default_roles | Default role templates |
| modules | Available platform modules |
| trials | Clinical trial definitions |
| sso_tickets | SSO setup tickets |

### Tenant Schema Tables (org_xxx)

| Table | Description |
|-------|-------------|
| users | Organization users |
| projects | User projects |
| project_roles | Project-specific roles |
| project_permissions | Permission assignments |
| project_users | Project membership |
| patient_records | Patient data (JSONB) |
| execution_records | ML execution history |
| bookmarks | User bookmarks |
| notifications | User notifications |
