import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

export interface Trial {
  id: number | null;
  name?: string;
  icon_url?: string;
  trial_access?: boolean;
  description?: string;
  module_id?: number;
  created_at?: string | null;
  slug?: string;
}

export interface ModuleAccess {
  id: number;
  name: string;
  is_standalone: boolean;
  module_access?: boolean;
  trials: Trial[];
  created_at?: string;
  slug?: string;
}

export interface ManageAccessItem {
  module_id: number;
  trial_id: number | null;
}

export interface ManageAccessRequest {
  enterprise_id: string;
  organization_id: string;
  grant_access?: ManageAccessItem[];
  revoke_access?: ManageAccessItem[];
}

export interface ManageAccessResponse {
  state: string;
  status: string;
  message: string;
  data: {
    granted: Array<{
      id: string;
      enterprise_id: string;
      enterprise_name: string;
      organization_id: string;
      module_id: number;
      module_name: string;
      module_is_standalone: boolean;
      trial_id: number | null;
      trial_name: string;
      created_at: string | null;
    }>;
    revoked: Array<{
      id: string;
      enterprise_id: string;
      enterprise_name: string;
      organization_id: string;
      module_id: number;
      module_name: string;
      module_is_standalone: boolean;
      trial_id: number | null;
      trial_name: string;
      created_at: string | null;
    }>;
    errors: Array<{
      module_id: number;
      trial_id: number | null;
      action: "GRANT" | "REVOKE";
      error: string;
    }>;
  };
}

export const moduleService = {
  /**
   * Fetch all modules & trials (detailed view for accordion UI)
   */
  getOrganizationModules: async (organizationID: string) => {
    return privateAxios.get<{
      state: string;
      status: string;
      message: string;
      data: ModuleAccess[];
    }>(
      `${ENDPOINTS.ENTERPRISE_ACCESS}/organization/${organizationID}`
    );
  },

  /**
   * Fetch basic modules list (flat view)
   */
  getEnterpriseModules: async (enterpriseId: string) => {
    return privateAxios.get<{
      state: string;
      status: string;
      message: string;
      data: ModuleAccess[];
    }>(`${ENDPOINTS.ENTERPRISE_ACCESS}/full/${enterpriseId}`);
  },

  /**
   * Manage module/trial access (grant/revoke)
   */
  manageAccess: async (payload: ManageAccessRequest) => {
    return privateAxios.post<ManageAccessResponse>(
      ENDPOINTS.ENTERPRISE_ACCESS,
      payload
    );
  },
};

export default moduleService;
