"""
Enterprise Onboarding Routes

Endpoints for enterprise onboarding workflow:
- Invite enterprise
- Onboard enterprise (create Auth0 org, SSO ticket)
- Webhook handlers
"""

from fastapi import APIRouter

router = APIRouter()

# TODO: Implement onboarding endpoints
# POST /invite
# POST /re-invite
# POST /onboard (external/public)
# POST /webhooks/connection (external/webhook)
