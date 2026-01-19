import { publicAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

// Types
export interface EnterpriseOnboardRequest {
  enterprise_id: string;
  display_name: string;
  icon_url?: string;
  domain_aliases: string[];
  primary_color?: string;
  page_background_color?: string;
}

export interface ticket {
  ticket: string;
}

export interface Organization {
  id: string;
  name: string;
  branding: any | null;
  metadata: any | null;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EnterpriseOnboardResponse {
  ticket: ticket;
  organization: Organization;
}

export interface ApiResponse<T> {
  state: string;
  status: string;
  message: string | null;
  data: T;
}

// SSO Service
export const ssoService = {
  /**
   * Onboards an enterprise for SSO configuration
   * @param data Enterprise onboarding data
   * @returns Promise with SSO ticket and organization details
   */
  onboardEnterprise: async (
    data: EnterpriseOnboardRequest
  ): Promise<ApiResponse<EnterpriseOnboardResponse>> => {
    const response = await publicAxios.post(ENDPOINTS.ORGANIZATION_ONBOARD, data);
    return response.data;
  },
};

export default ssoService;
