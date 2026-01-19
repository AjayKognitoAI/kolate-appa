import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

// Types based on API documentation (snake_case from API)
export interface Trial {
  id: number;
  module_id: number;
  module_name: string;
  slug: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: number;
  name: string;
  slug: string;
  is_standalone: boolean;
  created_at?: string;
}

export interface CreateTrialRequest {
  module_id: number;
  slug: string;
  name: string;
  icon_url?: string;
  description?: string;
}

export interface UpdateTrialRequest {
  id: number;
  module_id?: number;
  slug?: string;
  name?: string;
  icon_url?: string;
  description?: string;
}

// API Response format from documentation
export interface TrialApiResponse {
  trials: Trial[] | null;
  message: string;
  success: boolean;
}

// Legacy ApiResponse for backwards compatibility
export interface ApiResponse<T> {
  state: string;
  status: string;
  message: string | null;
  data: T;
}

export interface ModulesListResponse {
  modules: Module[];
}

// Enterprise Access Types
export interface ModuleWithTrials {
  id: number;
  name: string;
  is_standalone: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
  trials: Trial[];
}

export interface EnterpriseAccessResponse {
  state: string;
  status: string;
  message: string;
  data: ModuleWithTrials[];
}

// Helper function to generate slug from name
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

// Endpoint constants from centralized config
const ENDPOINTS = API_CONFIG.ENTERPRISE_MANAGER;

// Trials Service
export const trialsService = {
  /**
   * Fetches all trials (GET /api/enterprise-manager/v1/trials)
   * @returns Promise with all trials
   */
  getAllTrials: async (): Promise<TrialApiResponse> => {
    const response = await privateAxios.get(ENDPOINTS.TRIALS);
    return response.data;
  },

  /**
   * Fetches a single trial by slug (GET /api/enterprise-manager/v1/trials/slug/{slug})
   * @param slug Trial slug
   * @returns Promise with trial data
   */
  getTrialBySlug: async (slug: string): Promise<TrialApiResponse> => {
    const response = await privateAxios.get(`${ENDPOINTS.TRIALS_BY_SLUG}/${slug}`);
    return response.data;
  },

  /**
   * Fetches trials by module ID (GET /api/enterprise-manager/v1/trials/module/{moduleId})
   * @param moduleId Module ID
   * @returns Promise with trials data
   */
  getTrialsByModuleId: async (moduleId: number): Promise<TrialApiResponse> => {
    const response = await privateAxios.get(`${ENDPOINTS.TRIALS_BY_MODULE}/${moduleId}`);
    return response.data;
  },

  /**
   * Checks if a slug exists (GET /api/enterprise-manager/v1/trials/exists/slug/{slug})
   * @param slug Trial slug to check
   * @returns Promise with existence check result
   */
  checkSlugExists: async (slug: string): Promise<TrialApiResponse> => {
    const response = await privateAxios.get(`${ENDPOINTS.TRIALS_EXISTS_SLUG}/${slug}`);
    return response.data;
  },

  /**
   * Creates a new trial (POST /api/enterprise-manager/v1/trials)
   * @param data Trial creation data
   * @returns Promise with created trial
   */
  createTrial: async (data: CreateTrialRequest): Promise<TrialApiResponse> => {
    const response = await privateAxios.post(ENDPOINTS.TRIALS, data);
    return response.data;
  },

  /**
   * Updates an existing trial (PUT /api/enterprise-manager/v1/trials)
   * @param data Trial update data (must include id)
   * @returns Promise with updated trial
   */
  updateTrial: async (data: UpdateTrialRequest): Promise<TrialApiResponse> => {
    const response = await privateAxios.put(ENDPOINTS.TRIALS, data);
    return response.data;
  },

  /**
   * Deletes a trial (DELETE /api/enterprise-manager/v1/trials/{id})
   * @param id Trial ID
   * @returns Promise with API response
   */
  deleteTrial: async (id: number): Promise<TrialApiResponse> => {
    const response = await privateAxios.delete(`${ENDPOINTS.TRIALS}/${id}`);
    return response.data;
  },

  /**
   * Fetches all modules by extracting unique modules from trials
   * @returns Promise with modules list
   */
  getModules: async (): Promise<ApiResponse<ModulesListResponse>> => {
    const response = await privateAxios.get(ENDPOINTS.TRIALS);
    const trials: Trial[] = response.data.trials || [];

    // Extract unique modules from trials
    const modulesMap = new Map<number, Module>();
    trials.forEach((trial) => {
      if (trial.module_id && !modulesMap.has(trial.module_id)) {
        const moduleName = trial.module_name || `Module ${trial.module_id}`;
        modulesMap.set(trial.module_id, {
          id: trial.module_id,
          name: moduleName,
          slug: moduleName.toLowerCase().replace(/\s+/g, "-"),
          is_standalone: false,
        });
      }
    });

    return {
      state: "success",
      status: "OK",
      message: null,
      data: {
        modules: Array.from(modulesMap.values()),
      },
    };
  },

  /**
   * Fetches enterprise access data with modules and trials for a given organization
   * @param organizationId Organization ID (e.g., "org_7kK1j3sFFtxqlCtz")
   * @returns Promise with modules and their trials
   */
  getEnterpriseAccess: async (organizationId: string): Promise<EnterpriseAccessResponse> => {
    const response = await privateAxios.get(
      `${ENDPOINTS.ENTERPRISE_ACCESS}/organization/${organizationId}`
    );
    return response.data;
  },
};

export default trialsService;
