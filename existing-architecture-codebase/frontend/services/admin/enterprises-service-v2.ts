/**
 * Enterprise Service (Migrated)
 *
 * This service has been migrated to use the consolidated FastAPI backend.
 * It uses the new unified API client and endpoint configuration.
 *
 * Migration Changes:
 * - Old: privateAxios with /api/enterprise-manager/v1/* endpoints
 * - New: apiClient with /api/v1/enterprises/* endpoints
 */

import { apiClient } from "@/utils/api-client";
import { ENDPOINTS, buildPaginatedEndpoint } from "@/utils/api-endpoints";

// =============================================================================
// Types
// =============================================================================

export interface EnterpriseInviteRequest {
  enterprise_name: string;
  admin_email: string;
  enterprise_url: string;
}

export interface EnterpriseInviteResponse {
  enterprise_id: string;
  enterprise_name: string;
  enterprise_domain: string;
  admin_email: string;
  message: string;
}

export interface ApiResponse<T> {
  state: string;
  status: string;
  message: string | null;
  data: T;
}

export interface Enterprise {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  domain: string;
  description: string | null;
  logo_url: string | null;
  admin_email: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_count: number;
}

export interface EnterpriseSearchResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  enterprises: Enterprise[];
}

export interface EnterpriseStats {
  total_enterprises: number;
  deactivated_enterprises: number;
}

export interface EnterpriseCreateRequest {
  name: string;
  url?: string;
  domain?: string;
  description?: string;
  admin_email: string;
  zip_code?: string;
  region?: string;
  size?: string;
  contact_number?: string;
}

export interface EnterpriseUpdateRequest {
  name?: string;
  url?: string;
  domain?: string;
  description?: string;
  logo_url?: string;
  zip_code?: string;
  region?: string;
  size?: string;
  contact_number?: string;
  status?: string;
}

// =============================================================================
// Enterprise Service
// =============================================================================

export const enterpriseService = {
  /**
   * Invites a new enterprise by sending admin and enterprise details
   */
  inviteEnterprise: async (
    data: EnterpriseInviteRequest
  ): Promise<ApiResponse<EnterpriseInviteResponse>> => {
    return apiClient.post(ENDPOINTS.ENTERPRISES.INVITE, data);
  },

  /**
   * Re-invites an enterprise by enterprise_id
   */
  reInviteEnterprise: async (
    enterprise_id: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.post(ENDPOINTS.ENTERPRISES.RE_INVITE, { enterprise_id });
  },

  /**
   * Gets an enterprise by ID
   */
  getEnterprise: async (
    enterprise_id: string
  ): Promise<ApiResponse<Enterprise>> => {
    return apiClient.get(ENDPOINTS.ENTERPRISES.BY_ID(enterprise_id));
  },

  /**
   * Gets an enterprise by organization ID
   */
  getEnterpriseByOrgId: async (
    org_id: string
  ): Promise<ApiResponse<Enterprise>> => {
    return apiClient.get(ENDPOINTS.ENTERPRISES.BY_ORG_ID(org_id));
  },

  /**
   * Creates a new enterprise
   */
  createEnterprise: async (
    data: EnterpriseCreateRequest
  ): Promise<ApiResponse<Enterprise>> => {
    return apiClient.post(ENDPOINTS.ENTERPRISES.CREATE, data);
  },

  /**
   * Updates an enterprise
   */
  updateEnterprise: async (
    enterprise_id: string,
    data: EnterpriseUpdateRequest
  ): Promise<ApiResponse<Enterprise>> => {
    return apiClient.put(ENDPOINTS.ENTERPRISES.UPDATE(enterprise_id), data);
  },

  /**
   * Deletes an enterprise by enterprise_id
   */
  deleteEnterprise: async (
    enterprise_id: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.delete(ENDPOINTS.ENTERPRISES.DELETE(enterprise_id));
  },

  /**
   * Searches for enterprises based on keyword and pagination
   */
  searchEnterprises: async (
    keyword: string,
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<EnterpriseSearchResponse>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.ENTERPRISES.SEARCH,
      page,
      size,
      { keyword }
    );
    return apiClient.get(endpoint);
  },

  /**
   * Fetches all enterprises with pagination
   */
  listEnterprises: async (
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<EnterpriseSearchResponse>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.ENTERPRISES.LIST,
      page,
      size
    );
    return apiClient.get(endpoint);
  },

  /**
   * Fetches enterprise statistics (total and deactivated enterprises)
   */
  getEnterpriseStats: async (): Promise<ApiResponse<EnterpriseStats>> => {
    return apiClient.get(ENDPOINTS.ENTERPRISES.STATS);
  },

  /**
   * Gets enterprise admins
   */
  getEnterpriseAdmins: async (
    enterprise_id: string,
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<unknown>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.ENTERPRISES.ADMINS(enterprise_id),
      page,
      size
    );
    return apiClient.get(endpoint);
  },

  /**
   * Gets enterprise module access
   */
  getEnterpriseModuleAccess: async (
    enterprise_id: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.get(ENDPOINTS.ENTERPRISES.MODULE_ACCESS(enterprise_id));
  },

  /**
   * Updates enterprise module access
   */
  updateEnterpriseModuleAccess: async (
    enterprise_id: string,
    modules: string[]
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.put(ENDPOINTS.ENTERPRISES.MODULE_ACCESS(enterprise_id), {
      modules,
    });
  },

  /**
   * Gets enterprise onboarding progress
   */
  getOnboardingProgress: async (
    enterprise_id: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.get(ENDPOINTS.ENTERPRISES.ONBOARDING_PROGRESS(enterprise_id));
  },

  /**
   * Updates enterprise onboarding progress
   */
  updateOnboardingProgress: async (
    enterprise_id: string,
    progress: Record<string, unknown>
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.put(
      ENDPOINTS.ENTERPRISES.ONBOARDING_UPDATE(enterprise_id),
      progress
    );
  },
};

export default enterpriseService;
