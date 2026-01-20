import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

export interface UpdateOrganizationRequest {
  name: string;
  description?: string;
  logo_url?: string;
  size?: string;
  region?: string;
  contact_number?: string;
  zip_code?: string;
}

export interface DeleteAccountRequest {
  delete_reason: string;
}

export const orgSettingsService = {
  /**
   * Updates organization details
   */
  updateOrganization: async (
    organization_id: string,
    data: UpdateOrganizationRequest
  ) => {
    return privateAxios.put(
      `${ENDPOINTS.ENTERPRISES}/${organization_id}/organization`,
      data
    );
  },

  /**
   * Requests account deletion
   */
  requestAccountDeletion: async (payload: DeleteAccountRequest) => {
    return privateAxios.post(
      ENDPOINTS.ENTERPRISES_DELETE_REQUEST,
      payload
    );
  },
};

export default orgSettingsService;
