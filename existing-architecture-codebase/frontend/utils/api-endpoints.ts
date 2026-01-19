/**
 * API Endpoint Configuration for Consolidated Backend
 *
 * This file maps all endpoints from the Spring Boot microservices to the
 * consolidated FastAPI backend.
 *
 * Migration Mapping:
 * - /api/enterprise-manager/v1/* → /api/v1/enterprises/*
 * - /api/project-manager/v1/* → /api/v1/projects/*
 * - /api/user-manager/v1/* → /api/v1/users/*
 * - /api/mongo-database-manager/v1/* → /api/v1/patient-records/*, /api/v1/executions/*
 * - /api/asset-manager/v1/* → /api/v1/assets/*
 * - /api/auth-manager/v1/* → /api/v1/auth/*
 */

// =============================================================================
// API Version
// =============================================================================

export const API_VERSION = "/api/v1";

// =============================================================================
// Endpoint Definitions
// =============================================================================

export const ENDPOINTS = {
  // ===========================================================================
  // Authentication & Authorization
  // (Old: /api/auth-manager/v1/*)
  // ===========================================================================
  AUTH: {
    // Auth0 Integration
    LOGIN: `${API_VERSION}/auth/login`,
    LOGOUT: `${API_VERSION}/auth/logout`,
    REFRESH: `${API_VERSION}/auth/refresh`,
    ME: `${API_VERSION}/auth/me`,

    // User Management (Auth0 Management API)
    USERS: `${API_VERSION}/auth/users`,
    USER_BY_ID: (userId: string) => `${API_VERSION}/auth/users/${userId}`,
    USER_ROLES: (userId: string) => `${API_VERSION}/auth/users/${userId}/roles`,

    // Organization Management
    ORGANIZATIONS: `${API_VERSION}/auth/organizations`,
    ORGANIZATION_BY_ID: (orgId: string) =>
      `${API_VERSION}/auth/organizations/${orgId}`,
    ORGANIZATION_MEMBERS: (orgId: string) =>
      `${API_VERSION}/auth/organizations/${orgId}/members`,
    ORGANIZATION_INVITATIONS: (orgId: string) =>
      `${API_VERSION}/auth/organizations/${orgId}/invitations`,

    // Roles
    ROLES: `${API_VERSION}/auth/roles`,
    ROLE_BY_ID: (roleId: string) => `${API_VERSION}/auth/roles/${roleId}`,

    // SSO Configuration
    SSO_CONFIG: `${API_VERSION}/auth/sso-config`,
    SSO_VERIFY: `${API_VERSION}/auth/sso/verify`,
  },

  // ===========================================================================
  // Enterprise Management
  // (Old: /api/enterprise-manager/v1/*)
  // ===========================================================================
  ENTERPRISES: {
    // CRUD
    LIST: `${API_VERSION}/enterprises`,
    CREATE: `${API_VERSION}/enterprises`,
    BY_ID: (id: string) => `${API_VERSION}/enterprises/${id}`,
    UPDATE: (id: string) => `${API_VERSION}/enterprises/${id}`,
    DELETE: (id: string) => `${API_VERSION}/enterprises/${id}`,

    // Search & Stats
    SEARCH: `${API_VERSION}/enterprises/search`,
    STATS: `${API_VERSION}/enterprises/stats`,
    STATISTICS: `${API_VERSION}/enterprises/statistics`,

    // Organization Operations
    INVITE: `${API_VERSION}/enterprises/invite`,
    RE_INVITE: `${API_VERSION}/enterprises/re-invite`,
    DELETE_REQUEST: `${API_VERSION}/enterprises/delete-request`,

    // By Organization ID
    BY_ORG_ID: (orgId: string) => `${API_VERSION}/enterprises/org/${orgId}`,

    // Admins
    ADMINS: (enterpriseId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/admins`,
    ADMIN_BY_ID: (enterpriseId: string, adminId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/admins/${adminId}`,

    // Modules/Access
    MODULES: (enterpriseId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/modules`,
    MODULE_ACCESS: (enterpriseId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/module-access`,

    // Onboarding
    ONBOARDING_PROGRESS: (enterpriseId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/onboarding-progress`,
    ONBOARDING_UPDATE: (enterpriseId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/onboarding-progress`,

    // Datasources
    DATASOURCES: (enterpriseId: string) =>
      `${API_VERSION}/enterprises/${enterpriseId}/datasources`,
  },

  // ===========================================================================
  // Trials Management
  // (Old: /api/enterprise-manager/v1/trials/*)
  // ===========================================================================
  TRIALS: {
    LIST: `${API_VERSION}/trials`,
    CREATE: `${API_VERSION}/trials`,
    BY_ID: (id: string) => `${API_VERSION}/trials/${id}`,
    BY_SLUG: (slug: string) => `${API_VERSION}/trials/slug/${slug}`,
    UPDATE: (id: string) => `${API_VERSION}/trials/${id}`,
    DELETE: (id: string) => `${API_VERSION}/trials/${id}`,

    // By Module
    BY_MODULE: (moduleId: string) => `${API_VERSION}/trials/module/${moduleId}`,

    // Validation
    EXISTS_SLUG: (slug: string) => `${API_VERSION}/trials/exists/slug/${slug}`,
  },

  // ===========================================================================
  // Project Management
  // (Old: /api/project-manager/v1/*)
  // ===========================================================================
  PROJECTS: {
    // CRUD
    LIST: `${API_VERSION}/projects`,
    CREATE: `${API_VERSION}/projects`,
    BY_ID: (id: string) => `${API_VERSION}/projects/${id}`,
    UPDATE: (id: string) => `${API_VERSION}/projects/${id}`,
    DELETE: (id: string) => `${API_VERSION}/projects/${id}`,

    // Search & Stats
    SEARCH: `${API_VERSION}/projects/search`,
    STATISTICS: `${API_VERSION}/projects/statistics`,

    // Project Users
    USERS: (projectId: string) => `${API_VERSION}/projects/${projectId}/users`,
    USER_BY_ID: (projectId: string, userId: string) =>
      `${API_VERSION}/projects/${projectId}/users/${userId}`,

    // Project Roles
    ROLES: (projectId: string) => `${API_VERSION}/projects/${projectId}/roles`,
    ROLE_BY_ID: (projectId: string, roleId: string) =>
      `${API_VERSION}/projects/${projectId}/roles/${roleId}`,
  },

  // ===========================================================================
  // User Management
  // (Old: /api/user-manager/v1/*)
  // ===========================================================================
  USERS: {
    // CRUD
    LIST: `${API_VERSION}/users`,
    CREATE: `${API_VERSION}/users`,
    BY_ID: (id: string) => `${API_VERSION}/users/${id}`,
    UPDATE: (id: string) => `${API_VERSION}/users/${id}`,
    DELETE: (id: string) => `${API_VERSION}/users/${id}`,

    // Current user
    ME: `${API_VERSION}/users/me`,
    PROFILE: `${API_VERSION}/users/me/profile`,

    // Search
    SEARCH: `${API_VERSION}/users/search`,

    // Roles
    ROLES: `${API_VERSION}/users/roles`,
    USER_ROLES: (userId: string) => `${API_VERSION}/users/${userId}/roles`,

    // Invitations
    INVITE: `${API_VERSION}/users/invite`,
  },

  // ===========================================================================
  // Patient Records (PostgreSQL JSONB - replaces MongoDB)
  // (Old: /api/mongo-database-manager/v1/patient-record/*)
  // ===========================================================================
  PATIENT_RECORDS: {
    // CRUD
    LIST: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}`,
    CREATE: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}`,
    BY_ID: (projectId: string, trialSlug: string, recordId: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}/${recordId}`,
    UPDATE: (projectId: string, trialSlug: string, recordId: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}/${recordId}`,
    DELETE: (projectId: string, trialSlug: string, recordId: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}/${recordId}`,

    // Bulk Operations
    BULK_GET: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}/bulk`,

    // User Records
    BY_USER: (projectId: string, trialSlug: string, userId: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}/user/${userId}`,

    // Count
    COUNT: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/patient-records/${projectId}/${trialSlug}/count`,
  },

  // ===========================================================================
  // Execution Records (PostgreSQL JSONB - replaces MongoDB)
  // (Old: /api/mongo-database-manager/v1/execution-record/*)
  // ===========================================================================
  EXECUTIONS: {
    // CRUD
    LIST: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}`,
    CREATE: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}`,
    BY_ID: (projectId: string, trialSlug: string, executionId: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}/${executionId}`,
    UPDATE: (projectId: string, trialSlug: string, executionId: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}/${executionId}`,
    DELETE: (projectId: string, trialSlug: string, executionId: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}/${executionId}`,

    // Bulk Operations
    BULK_GET: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}/bulk`,

    // User Executions
    BY_USER: (projectId: string, trialSlug: string, userId: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}/user/${userId}`,

    // Count
    COUNT: (projectId: string, trialSlug: string) =>
      `${API_VERSION}/executions/${projectId}/${trialSlug}/count`,
  },

  // ===========================================================================
  // Asset Management
  // (Old: /api/asset-manager/v1/*)
  // ===========================================================================
  ASSETS: {
    // File Upload
    UPLOAD: `${API_VERSION}/assets/upload`,
    ENTERPRISE_UPLOAD: `${API_VERSION}/assets/enterprise-upload`,

    // File Operations
    BY_ID: (assetId: string) => `${API_VERSION}/assets/${assetId}`,
    DOWNLOAD: (assetId: string) => `${API_VERSION}/assets/${assetId}/download`,
    DELETE: (assetId: string) => `${API_VERSION}/assets/${assetId}`,

    // User Media
    USER_MEDIA: `${API_VERSION}/user-media`,
    USER_MEDIA_UPLOAD: `${API_VERSION}/user-media/upload`,
  },

  // ===========================================================================
  // Bookmarks
  // (Old: /api/project-manager/v1/bookmarks/*)
  // ===========================================================================
  BOOKMARKS: {
    LIST: `${API_VERSION}/bookmarks`,
    CREATE: `${API_VERSION}/bookmarks`,
    BY_ID: (id: string) => `${API_VERSION}/bookmarks/${id}`,
    DELETE: (id: string) => `${API_VERSION}/bookmarks/${id}`,
  },

  // ===========================================================================
  // Notifications
  // ===========================================================================
  NOTIFICATIONS: {
    LIST: `${API_VERSION}/notifications`,
    BY_ID: (id: string) => `${API_VERSION}/notifications/${id}`,
    MARK_READ: (id: string) => `${API_VERSION}/notifications/${id}/read`,
    MARK_ALL_READ: `${API_VERSION}/notifications/read-all`,
    UNREAD_COUNT: `${API_VERSION}/notifications/unread-count`,
  },

  // ===========================================================================
  // RBAC (Features, Actions, Permissions, Roles)
  // ===========================================================================
  RBAC: {
    // Features
    FEATURES: `${API_VERSION}/features`,
    FEATURE_BY_ID: (id: string) => `${API_VERSION}/features/${id}`,

    // Actions
    ACTIONS: `${API_VERSION}/actions`,
    ACTION_BY_ID: (id: string) => `${API_VERSION}/actions/${id}`,

    // Permissions
    PERMISSIONS: `${API_VERSION}/permissions`,
    PERMISSION_BY_ID: (id: string) => `${API_VERSION}/permissions/${id}`,

    // Roles
    ROLES: `${API_VERSION}/roles`,
    ROLE_BY_ID: (id: string) => `${API_VERSION}/roles/${id}`,
  },

  // ===========================================================================
  // Master Data
  // ===========================================================================
  MASTER_DATA: {
    LIST: `${API_VERSION}/master-data`,
    BY_ID: (id: string) => `${API_VERSION}/master-data/${id}`,
    BY_KEY: (key: string) => `${API_VERSION}/master-data/key/${key}`,
  },

  // ===========================================================================
  // Health & System
  // ===========================================================================
  SYSTEM: {
    HEALTH: "/health",
    ROOT: "/",
  },
} as const;

// =============================================================================
// Legacy Endpoint Mapping (for backward compatibility)
// =============================================================================

/**
 * Maps old microservice endpoints to new consolidated endpoints
 * Use this for gradual migration of existing services
 */
export const LEGACY_ENDPOINT_MAP: Record<string, string> = {
  // Enterprise Manager
  "/api/enterprise-manager/v1/enterprises": ENDPOINTS.ENTERPRISES.LIST,
  "/api/enterprise-manager/v1/enterprises/search": ENDPOINTS.ENTERPRISES.SEARCH,
  "/api/enterprise-manager/v1/enterprises/stats": ENDPOINTS.ENTERPRISES.STATS,
  "/api/enterprise-manager/v1/organization/invite": ENDPOINTS.ENTERPRISES.INVITE,
  "/api/enterprise-manager/v1/organization/re-invite": ENDPOINTS.ENTERPRISES.RE_INVITE,
  "/api/enterprise-manager/v1/onboarding-progress": `${API_VERSION}/enterprises/onboarding-progress`,
  "/api/enterprise-manager/v1/trials": ENDPOINTS.TRIALS.LIST,
  "/api/enterprise-manager/v1/enterprise-access": `${API_VERSION}/enterprises/module-access`,

  // Project Manager
  "/api/project-manager/v1/project": ENDPOINTS.PROJECTS.LIST,
  "/api/project-manager/v1/project/search": ENDPOINTS.PROJECTS.SEARCH,
  "/api/project-manager/v1/projects/statistics": ENDPOINTS.PROJECTS.STATISTICS,
  "/api/project-manager/v1/bookmarks": ENDPOINTS.BOOKMARKS.LIST,

  // User Manager
  "/api/user-manager/v1/user": ENDPOINTS.USERS.LIST,
  "/api/user-manager/v1/users": ENDPOINTS.USERS.LIST,
  "/api/user-manager/v1/users/search": ENDPOINTS.USERS.SEARCH,
  "/api/user-manager/v1/users/roles": ENDPOINTS.USERS.ROLES,
  "/api/user-manager/v1/user/invite": ENDPOINTS.USERS.INVITE,

  // MongoDB Database Manager (now PostgreSQL)
  "/api/mongo-database-manager/v1/patient-record": `${API_VERSION}/patient-records`,
  "/api/mongo-database-manager/v1/execution-record": `${API_VERSION}/executions`,

  // Asset Manager
  "/api/asset-manager/v1/enterprise-upload": ENDPOINTS.ASSETS.ENTERPRISE_UPLOAD,
};

/**
 * Convert legacy endpoint to new endpoint
 */
export function mapLegacyEndpoint(legacyEndpoint: string): string {
  // Check direct mapping
  if (LEGACY_ENDPOINT_MAP[legacyEndpoint]) {
    return LEGACY_ENDPOINT_MAP[legacyEndpoint];
  }

  // Check prefix mapping for dynamic endpoints
  for (const [oldPrefix, newEndpoint] of Object.entries(LEGACY_ENDPOINT_MAP)) {
    if (legacyEndpoint.startsWith(oldPrefix)) {
      const suffix = legacyEndpoint.slice(oldPrefix.length);
      return `${newEndpoint}${suffix}`;
    }
  }

  // If no mapping found, assume it's already a new endpoint
  return legacyEndpoint;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build endpoint with query parameters
 */
export function buildEndpointWithParams(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

  return filteredParams ? `${endpoint}?${filteredParams}` : endpoint;
}

/**
 * Build paginated endpoint
 */
export function buildPaginatedEndpoint(
  endpoint: string,
  page: number = 1,
  size: number = 10,
  additionalParams?: Record<string, string | number | boolean | undefined>
): string {
  return buildEndpointWithParams(endpoint, {
    page,
    size,
    ...additionalParams,
  });
}

export default ENDPOINTS;
