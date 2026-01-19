"""
Enterprise Models Package

Models stored in the public schema (shared across tenants):
- Enterprise: Main organization entity
- Admin: Enterprise administrators
- EnterpriseDatasource: Tenant database configuration
- EnterpriseOnboardingProgress: Onboarding workflow tracking
- Module: System modules/features
- Trial: Sub-features within modules
- EnterpriseModuleAccess: Module access grants
- SsoTicket: SSO authentication tickets
"""

from app.models.enterprise.enterprise import Enterprise, EnterpriseStatus
from app.models.enterprise.admin import Admin
from app.models.enterprise.datasource import EnterpriseDatasource
from app.models.enterprise.onboarding import (
    EnterpriseOnboardingProgress,
    OnboardingStep
)
from app.models.enterprise.module import Module, Trial
from app.models.enterprise.access import EnterpriseModuleAccess
from app.models.enterprise.sso_ticket import SsoTicket

__all__ = [
    # Enterprise
    "Enterprise",
    "EnterpriseStatus",
    # Admin
    "Admin",
    # Datasource
    "EnterpriseDatasource",
    # Onboarding
    "EnterpriseOnboardingProgress",
    "OnboardingStep",
    # Module & Trial
    "Module",
    "Trial",
    # Access
    "EnterpriseModuleAccess",
    # SSO
    "SsoTicket",
]
