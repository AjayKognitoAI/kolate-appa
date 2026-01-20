"""
Tenant Models Package

Models stored in tenant-specific schemas (org_xxx):
- TenantUser: Users within an organization
- Project: Project entities
- ProjectUser: Project membership
- ProjectRole: Project-specific roles
- ProjectPermission: Role permissions
- DefaultRole: Role templates
- DefaultPermission: Template permissions
- Notification: User notifications
- TrialShare: Trial sharing records
- UserBookmark: User bookmarks
- PatientRecord: Clinical patient data records
- ExecutionRecord: ML prediction/execution records
- Patient Screening: Study, MasterData, Cohort, Filter, Comparison, Activity
"""

from app.models.tenant.user import TenantUser, UserStatus
from app.models.tenant.project import Project, ProjectUser, ProjectStatus
from app.models.tenant.role import (
    ProjectRole,
    ProjectPermission,
    DefaultRole,
    DefaultPermission,
    ModuleType,
    AccessType
)
from app.models.tenant.notification import (
    Notification,
    NotificationStatus,
    NotificationType
)
from app.models.tenant.sharing import TrialShare
from app.models.tenant.bookmark import UserBookmark
from app.models.tenant.patient_record import PatientRecord, ExecutionRecord

# Patient Screening Models
from app.models.tenant.patient_screening import (
    Study,
    StudyStatus,
    MasterData,
    Cohort,
    Filter,
    CohortComparison,
    StudyActivity,
    EntityType,
    ActivityAction,
)

__all__ = [
    # User
    "TenantUser",
    "UserStatus",
    # Project
    "Project",
    "ProjectUser",
    "ProjectStatus",
    # Role & Permission
    "ProjectRole",
    "ProjectPermission",
    "DefaultRole",
    "DefaultPermission",
    "ModuleType",
    "AccessType",
    # Notification
    "Notification",
    "NotificationStatus",
    "NotificationType",
    # Sharing
    "TrialShare",
    # Bookmark
    "UserBookmark",
    # Patient & Execution Records
    "PatientRecord",
    "ExecutionRecord",
    # Patient Screening
    "Study",
    "StudyStatus",
    "MasterData",
    "Cohort",
    "Filter",
    "CohortComparison",
    "StudyActivity",
    "EntityType",
    "ActivityAction",
]
