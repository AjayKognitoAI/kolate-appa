import axios, { privateAxios } from "@/utils/axios";
import { AxiosResponse } from "axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;
const ASSET_ENDPOINTS = API_CONFIG.ASSET_MANAGER;

export interface EnterpriseAdmin {
  id: string;
  auth0_id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  organization_id: string;
}

export interface Enterprise {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  domain: string;
  description: string;
  logo_url: string;
  admin_email: string;
  zip_code: string | null;
  region: string | null;
  size: string | null;
  contact_number: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  admins: EnterpriseAdmin[];
}

export interface UpdateEnterprisePayload {
  name: string;
  description: string;
  logo_url: string;
  size: string;
  region: string;
  contact_number: string;
  zip_code: string;
}

export interface EnterpriseApiResponse {
  state: string;
  status: string;
  message: string;
  data: Enterprise;
}

export interface FileUploadResponse {
  state: string;
  status: string;
  message: string;
  data: string;
}

export interface OnboardingProgress {
  profile_updated: boolean;
  invited_member: boolean;
  created_project: boolean;
}

export interface OnboardingProgressResponse {
  state: string;
  status: string;
  message: string;
  data: OnboardingProgress;
}

export interface EnterpriseStatistics {
  active_projects: number;
  completed_projects: number;
  total_users: number;
}

export interface EnterpriseStatisticsResponse {
  state: string;
  status: string;
  message: string;
  data: EnterpriseStatistics;
}

export type OnboardingStep =
  | "PROFILE_UPDATED"
  | "INVITED_MEMBER"
  | "CREATED_PROJECT";

export const updateEnterprise = (
  organizationId: string,
  payload: UpdateEnterprisePayload
) => {
  return privateAxios.put(
    `${ENDPOINTS.ENTERPRISES}/${organizationId}/organization`,
    payload
  );
};

export const getEnterpriseByOrgId = (organizationId: string) => {
  return privateAxios.get<EnterpriseApiResponse>(
    `${ENDPOINTS.ENTERPRISES}/${organizationId}/organization`
  );
};

export const getEnterprise = (enterpriseId: string) => {
  return privateAxios.get<EnterpriseApiResponse>(
    `${ENDPOINTS.ENTERPRISES}/${enterpriseId}`
  );
};

export const uploadEnterpriseFile = (
  file: File,
  org_id: string
): Promise<AxiosResponse<FileUploadResponse>> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("org_id", org_id);

  return privateAxios.post(
    ASSET_ENDPOINTS.ENTERPRISE_UPLOAD,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};

/**
 * Fetch onboarding progress for the current enterprise
 */
export const getOnboardingProgress = () => {
  return privateAxios.get<OnboardingProgressResponse>(
    ENDPOINTS.ONBOARDING_PROGRESS
  );
};

/**
 * Update onboarding progress for a given step
 */
export const updateOnboardingProgress = (step: OnboardingStep) => {
  return privateAxios.put<OnboardingProgressResponse>(
    ENDPOINTS.ONBOARDING_PROGRESS,
    { step }
  );
};

export const getEnterpriseStatistics = () => {
  return privateAxios.get<EnterpriseStatisticsResponse>(
    ENDPOINTS.ENTERPRISE_STATISTICS
  );
};
