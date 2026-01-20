import axios from "axios";
import { API_CONFIG } from "@/utils/api-config";

// Use public axios instance (no auth required for token-based onboarding)
const publicAxios = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Types
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

export interface OnboardingCompleteRequest {
  company_data?: {
    name?: string;
    logo_url?: string;
    description?: string;
    industry?: string;
    employee_count?: string;
    settings?: Record<string, any>;
  };
}

export interface OnboardingCompleteResponse {
  enterprise_id: string;
  enterprise_name: string;
  organization_id: string;
  status: string;
  message: string;
}

// Onboarding step names
export const ONBOARDING_STEPS = {
  INVITED: "INVITED",
  EMAIL_SENT: "EMAIL_SENT",
  ONBOARDING_STARTED: "ONBOARDING_STARTED",
  AUTH0_ORG_CREATED: "AUTH0_ORG_CREATED",
  SSO_CONFIGURED: "SSO_CONFIGURED",
  ADMIN_SETUP: "ADMIN_SETUP",
  SCHEMA_CREATED: "SCHEMA_CREATED",
  DATA_MIGRATED: "DATA_MIGRATED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// Step order for wizard
export const WIZARD_STEPS = [
  { id: 1, key: "company_info", step: ONBOARDING_STEPS.ONBOARDING_STARTED, title: "Company Information", description: "Enter your company details" },
  { id: 2, key: "admin_setup", step: ONBOARDING_STEPS.ADMIN_SETUP, title: "Admin Account", description: "Set up your admin profile" },
  { id: 3, key: "sso_config", step: ONBOARDING_STEPS.SSO_CONFIGURED, title: "SSO Configuration", description: "Configure single sign-on (optional)" },
  { id: 4, key: "invite_users", step: ONBOARDING_STEPS.DATA_MIGRATED, title: "Invite Team", description: "Invite team members" },
  { id: 5, key: "datasource", step: ONBOARDING_STEPS.SCHEMA_CREATED, title: "Data Source", description: "Configure your data source" },
  { id: 6, key: "review", step: ONBOARDING_STEPS.COMPLETED, title: "Review & Complete", description: "Review and activate your account" },
] as const;

// Endpoint constants
const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

/**
 * Onboarding Service
 *
 * Public API for token-based enterprise onboarding.
 * These endpoints don't require authentication - they use the onboarding token instead.
 */
export const onboardingService = {
  /**
   * Gets onboarding status by token
   * @param token Onboarding token from invitation
   * @returns Promise with onboarding status
   */
  getOnboardingStatus: async (token: string): Promise<OnboardingStatus> => {
    const response = await publicAxios.get(
      `${ENDPOINTS.ONBOARDING_EXTERNAL}/${token}`
    );
    return response.data;
  },

  /**
   * Updates onboarding step
   * @param token Onboarding token
   * @param step Step name
   * @param stepData Step-specific data
   * @returns Promise with updated progress
   */
  updateStep: async (
    token: string,
    step: string,
    stepData?: Record<string, any>
  ): Promise<OnboardingStepResponse> => {
    const response = await publicAxios.post(
      `${ENDPOINTS.ONBOARDING_STEP}/${token}/step`,
      {
        step,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Completes the onboarding process
   * @param token Onboarding token
   * @param companyData Final company data
   * @returns Promise with completion response
   */
  completeOnboarding: async (
    token: string,
    companyData?: OnboardingCompleteRequest["company_data"]
  ): Promise<OnboardingCompleteResponse> => {
    const response = await publicAxios.post(
      `${ENDPOINTS.ONBOARDING_COMPLETE}/${token}/complete`,
      {
        company_data: companyData,
      }
    );
    return response.data;
  },

  /**
   * Gets the current step index based on step name
   * @param stepName Step name from API
   * @returns Step index (0-based) or 0 if not found
   */
  getStepIndex: (stepName: string | null): number => {
    if (!stepName) return 0;

    const stepIndex = WIZARD_STEPS.findIndex(
      (s) => s.step === stepName
    );

    // If step is INVITED or EMAIL_SENT, start at step 0
    if (stepName === ONBOARDING_STEPS.INVITED || stepName === ONBOARDING_STEPS.EMAIL_SENT) {
      return 0;
    }

    return stepIndex >= 0 ? stepIndex : 0;
  },

  /**
   * Gets step name for a wizard step index
   * @param stepIndex Step index (0-based)
   * @returns Step name for API
   */
  getStepName: (stepIndex: number): string => {
    const step = WIZARD_STEPS[stepIndex];
    return step ? step.step : ONBOARDING_STEPS.ONBOARDING_STARTED;
  },

  /**
   * Checks if onboarding is complete
   * @param status Onboarding status from API
   * @returns True if onboarding is complete
   */
  isOnboardingComplete: (status: OnboardingStatus): boolean => {
    return (
      status.onboarding?.is_completed ||
      status.onboarding?.current_step === ONBOARDING_STEPS.COMPLETED ||
      status.status === "ACTIVE"
    );
  },
};

export default onboardingService;
