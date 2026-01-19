"""
Enterprise Schemas Package

Pydantic schemas for enterprise-related entities.
"""

from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import Field, EmailStr

from app.schemas.base import CamelModel
from app.models.enterprise import EnterpriseStatus, OnboardingStep


# Enterprise Schemas
class EnterpriseBase(CamelModel):
    """Base enterprise schema."""
    organization_id: str = Field(..., description="Auth0 organization ID")
    name: str = Field(..., min_length=1, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    admin_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = Field(default_factory=dict)


class EnterpriseCreate(EnterpriseBase):
    """Schema for creating an enterprise."""
    pass


class EnterpriseUpdate(CamelModel):
    """Schema for updating an enterprise."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    domain: Optional[str] = Field(None, max_length=255)
    admin_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = None


class EnterpriseStatusUpdate(CamelModel):
    """Schema for updating enterprise status."""
    status: EnterpriseStatus


class EnterpriseResponse(EnterpriseBase):
    """Enterprise response schema."""
    id: UUID
    status: EnterpriseStatus
    created_at: datetime
    updated_at: datetime


class EnterpriseListResponse(CamelModel):
    """Enterprise list response with pagination."""
    items: List[EnterpriseResponse]
    total: int
    page: int
    size: int
    pages: int


# Admin Schemas
class AdminBase(CamelModel):
    """Base admin schema."""
    email: EmailStr
    name: Optional[str] = Field(None, max_length=255)
    is_primary: bool = False


class AdminCreate(AdminBase):
    """Schema for creating an admin."""
    pass


class AdminResponse(AdminBase):
    """Admin response schema."""
    id: UUID
    enterprise_id: UUID
    auth0_id: Optional[str] = None
    created_at: datetime


# Datasource Schemas
class DatasourceBase(CamelModel):
    """Base datasource schema."""
    name: str = Field(..., min_length=1, max_length=255)
    host: str
    port: int = 5432
    database_name: str
    username: str
    is_primary: bool = False


class DatasourceCreate(DatasourceBase):
    """Schema for creating a datasource."""
    password: str  # Only required on create


class DatasourceUpdate(CamelModel):
    """Schema for updating a datasource."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None  # Optional on update
    is_primary: Optional[bool] = None


class DatasourceResponse(DatasourceBase):
    """Datasource response schema (no password)."""
    id: UUID
    enterprise_id: UUID
    created_at: datetime
    updated_at: datetime


# Onboarding Schemas
class OnboardingProgressBase(CamelModel):
    """Base onboarding progress schema."""
    current_step: OnboardingStep
    is_completed: bool = False


class OnboardingProgressUpdate(CamelModel):
    """Schema for updating onboarding progress."""
    current_step: Optional[OnboardingStep] = None
    steps_completed: Optional[List[str]] = None


class OnboardingProgressResponse(OnboardingProgressBase):
    """Onboarding progress response schema."""
    id: UUID
    enterprise_id: UUID
    steps_completed: List[str] = Field(default_factory=list)
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Module Schemas
class ModuleBase(CamelModel):
    """Base module schema."""
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    is_active: bool = True


class ModuleCreate(ModuleBase):
    """Schema for creating a module."""
    pass


class ModuleResponse(ModuleBase):
    """Module response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Trial Schemas
class TrialBase(CamelModel):
    """Base trial schema."""
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    module_id: UUID
    is_active: bool = True


class TrialCreate(TrialBase):
    """Schema for creating a trial."""
    pass


class TrialResponse(TrialBase):
    """Trial response schema."""
    id: UUID
    created_at: datetime
    updated_at: datetime


# Module Access Schemas
class ModuleAccessBase(CamelModel):
    """Base module access schema."""
    module_id: UUID
    trial_ids: List[UUID] = Field(default_factory=list)
    is_active: bool = True


class ModuleAccessCreate(ModuleAccessBase):
    """Schema for granting module access."""
    pass


class ModuleAccessResponse(ModuleAccessBase):
    """Module access response schema."""
    id: UUID
    enterprise_id: UUID
    granted_at: datetime
    expires_at: Optional[datetime] = None


# SSO Ticket Schemas
class SsoTicketCreate(CamelModel):
    """Schema for creating an SSO ticket."""
    user_id: str  # Auth0 user ID
    target_url: Optional[str] = None


class SsoTicketResponse(CamelModel):
    """SSO ticket response schema."""
    ticket: str
    expires_at: datetime


class SsoTicketValidation(CamelModel):
    """SSO ticket validation response."""
    user_id: str
    enterprise_id: UUID
    organization_id: str
    is_valid: bool


# Search Schemas
class EnterpriseSearch(CamelModel):
    """Enterprise search parameters."""
    name: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[EnterpriseStatus] = None
    admin_email: Optional[str] = None


# Statistics Schemas
class EnterpriseStats(CamelModel):
    """Enterprise statistics."""
    total_enterprises: int
    active_enterprises: int
    pending_enterprises: int
    suspended_enterprises: int


# Delete Request Schema
class DeleteRequest(CamelModel):
    """Schema for enterprise deletion request."""
    reason: Optional[str] = None
    confirm_deletion: bool = False


# Check Schemas
class DomainCheck(CamelModel):
    """Domain availability check response."""
    domain: str
    exists: bool


class OrganizationCheck(CamelModel):
    """Organization availability check response."""
    organization_id: str
    exists: bool


__all__ = [
    # Enterprise
    "EnterpriseBase",
    "EnterpriseCreate",
    "EnterpriseUpdate",
    "EnterpriseStatusUpdate",
    "EnterpriseResponse",
    "EnterpriseListResponse",
    "EnterpriseSearch",
    "EnterpriseStats",
    # Admin
    "AdminBase",
    "AdminCreate",
    "AdminResponse",
    # Datasource
    "DatasourceBase",
    "DatasourceCreate",
    "DatasourceUpdate",
    "DatasourceResponse",
    # Onboarding
    "OnboardingProgressBase",
    "OnboardingProgressUpdate",
    "OnboardingProgressResponse",
    # Module
    "ModuleBase",
    "ModuleCreate",
    "ModuleResponse",
    # Trial
    "TrialBase",
    "TrialCreate",
    "TrialResponse",
    # Module Access
    "ModuleAccessBase",
    "ModuleAccessCreate",
    "ModuleAccessResponse",
    # SSO
    "SsoTicketCreate",
    "SsoTicketResponse",
    "SsoTicketValidation",
    # Utility
    "DeleteRequest",
    "DomainCheck",
    "OrganizationCheck",
]
