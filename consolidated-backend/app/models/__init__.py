# Import order is important for SQLAlchemy relationships

# Template models (keep existing)
from .user import User

# Enterprise models (public schema - shared across tenants)
from .enterprise import (
    Enterprise, EnterpriseStatus,
    Admin,
    EnterpriseDatasource,
    EnterpriseOnboardingProgress, OnboardingStep,
    Module, Trial,
    EnterpriseModuleAccess,
    SsoTicket,
)

# Tenant models (org_xxx schemas - tenant-specific)
from .tenant import (
    TenantUser, UserStatus,
    Project, ProjectUser, ProjectStatus,
    ProjectRole, ProjectPermission, DefaultRole, DefaultPermission,
    ModuleType, AccessType,
    Notification, NotificationStatus, NotificationType,
    TrialShare,
    UserBookmark,
)

# MongoDB models (imported but not part of SQLAlchemy)
# These are Beanie documents for MongoDB
from .mongo import (
    PatientRecord, PatientRecordCreate,
    ExecutionRecord, ExecutionRecordCreate,
)
from .user_auth import UserAuth, AuthType
from .user_session import UserSession
from .user_media import UserMedia, UserMediaType
from .guest import Guest
from .guest_role import GuestRole
from .feature import Feature
from .action import Action
from .permission import Permission
from .role import Role, RolePermission, UserRole
from .homeowner import Homeowner
from .service_provider import ServiceProvider
from .address import Address
from .service_provider_address import ServiceProviderAddress
from .certification import Certification
from .service_category import ServiceCategory
from .service_subcategory import ServiceSubCategory
from .tag import Tag
from .service_category_tag import ServiceCategoryTag
from .service_subcategory_tag import ServiceSubCategoryTag
from .provider_tag import ProviderTag
from .gig_tag import GigTag
from .service_category_locale import ServiceCategoryLocale
from .service_subcategory_locale import ServiceSubCategoryLocale
from .tag_locale import TagLocale
from .gig_request import GigRequest, GigStatusHistory, GigRequestMedia, MediaType, GigUrgency, GigVisibility, GigStatus, GigEventType
from .bid import Bid, BidStatus
from .payment import Payment, PaymentStatus
from .dispute import Dispute, DisputeStatus
from .rating_review import RatingReview
from .master_data import MasterData, MasterDataLocale
from .portfolio_work import PortfolioWork
from .portfolio_media import PortfolioMedia

__all__ = [
    # Template models
    "User", "UserAuth", "UserSession", "UserMedia", "UserMediaType", "AuthType", "Guest", "GuestRole",
    "Feature", "Action", "Permission", "Role", "RolePermission", "UserRole",
    "Homeowner", "ServiceProvider", "Address", "ServiceProviderAddress", "Certification",
    "ServiceCategory", "ServiceSubCategory", "Tag",
    "ServiceCategoryTag", "ServiceSubCategoryTag", "ProviderTag", "GigTag",
    "ServiceCategoryLocale", "ServiceSubCategoryLocale", "TagLocale",
    "GigRequest", "GigStatusHistory", "GigRequestMedia", "MediaType", "GigUrgency", "GigVisibility", "GigStatus", "GigEventType",
    "Bid", "BidStatus",
    "Payment", "PaymentStatus",
    "Dispute", "DisputeStatus",
    "RatingReview",
    "MasterData", "MasterDataLocale",
    "PortfolioWork", "PortfolioMedia",
    # Enterprise models (public schema)
    "Enterprise", "EnterpriseStatus",
    "Admin",
    "EnterpriseDatasource",
    "EnterpriseOnboardingProgress", "OnboardingStep",
    "Module", "Trial",
    "EnterpriseModuleAccess",
    "SsoTicket",
    # Tenant models (org_xxx schemas)
    "TenantUser", "UserStatus",
    "Project", "ProjectUser", "ProjectStatus",
    "ProjectRole", "ProjectPermission", "DefaultRole", "DefaultPermission",
    "ModuleType", "AccessType",
    "Notification", "NotificationStatus", "NotificationType",
    "TrialShare",
    "UserBookmark",
    # MongoDB models
    "PatientRecord", "PatientRecordCreate",
    "ExecutionRecord", "ExecutionRecordCreate",
]