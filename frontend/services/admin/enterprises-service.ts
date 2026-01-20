import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

// Types
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
  organization_id: string;
  onboarding_url?: string;
  onboarding_token?: string;
  message: string;
}

export interface OnboardingStatus {
  enterprise_id: string;
  enterprise_name: string;
  enterprise_domain: string;
  admin_email: string;
  organization_id: string;
  status: string;
  onboarding: {
    current_step: string | null;
    is_completed: boolean;
    progress_data: Record<string, any>;
  } | null;
}

export interface OnboardingStepUpdate {
  step: string;
  step_data?: Record<string, any>;
}

export interface OnboardingStepResponse {
  enterprise_id: string;
  current_step: string;
  is_completed: boolean;
  progress_data: Record<string, any>;
}

export interface OnboardingCompleteResponse {
  enterprise_id: string;
  enterprise_name: string;
  organization_id: string;
  status: string;
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

// Endpoint constants from centralized config
const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

// Enterprise Service
export const enterpriseService = {
  /**
   * Invites a new enterprise by sending admin and enterprise details
   * @param data Enterprise invitation details
   * @returns Promise with enterprise invitation response
   */
  inviteEnterprise: async (
    data: EnterpriseInviteRequest
  ): Promise<ApiResponse<EnterpriseInviteResponse>> => {
    const response = await privateAxios.post(
      ENDPOINTS.ORGANIZATION_INVITE,
      data
    );
    return response.data;
  },

  /**
   * Re-invites an enterprise by enterprise_id
   * @param enterprise_id The ID of the enterprise to re-invite
   * @returns Promise with API response
   */
  reInviteEnterprise: async (
    enterprise_id: string
  ): Promise<ApiResponse<any>> => {
    const response = await privateAxios.post(
      ENDPOINTS.ORGANIZATION_RE_INVITE,
      { enterprise_id }
    );
    return response.data;
  },

  /**
   * Deletes an enterprise by enterprise_id
   * @param enterprise_id The ID of the enterprise to delete
   * @returns Promise with API response
   */
  deleteEnterprise: async (
    enterprise_id: string
  ): Promise<ApiResponse<any>> => {
    const response = await privateAxios.delete(
      `${ENDPOINTS.ENTERPRISES}/${enterprise_id}`
    );
    return response.data;
  },

  /**
   * Searches for enterprises based on keyword and pagination
   * @param keyword Search keyword
   * @param page Page number (0-based)
   * @param size Page size
   * @returns Promise with enterprise search response
   */
  searchEnterprises: async (
    keyword: string,
    page: number = 0,
    size: number = 10
  ): Promise<ApiResponse<EnterpriseSearchResponse>> => {
    const response = await privateAxios.get(
      ENDPOINTS.ENTERPRISES_SEARCH,
      {
        params: {
          keyword,
          page,
          size,
        },
      }
    );
    return response.data;
  },

  /**
   * Fetches enterprise statistics (total and deactivated enterprises)
   * @returns Promise with enterprise stats
   */
  getEnterpriseStats: async (): Promise<
    ApiResponse<{ total_enterprises: number; deactivated_enterprises: number }>
  > => {
    const response = await privateAxios.get(
      ENDPOINTS.ENTERPRISES_STATS
    );
    return response.data;
  },

  /**
   * Gets enterprise by ID
   * @param enterprise_id The ID of the enterprise
   * @returns Promise with enterprise details
   */
  getEnterprise: async (enterprise_id: string): Promise<Enterprise> => {
    const response = await privateAxios.get(
      `${ENDPOINTS.ENTERPRISES}/${enterprise_id}`
    );
    return response.data;
  },

  /**
   * Gets onboarding progress for an enterprise
   * @param enterprise_id The ID of the enterprise
   * @returns Promise with onboarding progress
   */
  getOnboardingProgress: async (
    enterprise_id: string
  ): Promise<OnboardingStatus> => {
    const response = await privateAxios.get(
      `${ENDPOINTS.ONBOARDING_PROGRESS}/${enterprise_id}/onboarding`
    );
    return response.data;
  },

  /**
   * Updates onboarding progress for an enterprise
   * @param enterprise_id The ID of the enterprise
   * @param data Onboarding update data
   * @returns Promise with updated progress
   */
  updateOnboardingProgress: async (
    enterprise_id: string,
    data: OnboardingStepUpdate
  ): Promise<OnboardingStepResponse> => {
    const response = await privateAxios.put(
      `${ENDPOINTS.ONBOARDING_PROGRESS}/${enterprise_id}/onboarding`,
      data
    );
    return response.data;
  },

  /**
   * Completes onboarding for an enterprise
   * @param enterprise_id The ID of the enterprise
   * @returns Promise with completion response
   */
  completeOnboarding: async (
    enterprise_id: string
  ): Promise<OnboardingCompleteResponse> => {
    const response = await privateAxios.post(
      `${ENDPOINTS.ONBOARDING_PROGRESS}/${enterprise_id}/onboarding/complete`
    );
    return response.data;
  },
};

export default enterpriseService;
