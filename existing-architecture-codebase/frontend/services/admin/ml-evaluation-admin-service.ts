/**
 * Service for ml-evaluation-service admin API
 * Handles ML model management, field metadata, and trial configuration
 *
 * UPDATED: All endpoints now use trial_slug + module_name composite key pattern
 * Endpoints follow the pattern: /{trial_slug}/modules/{module_name}/...
 */

import { mlEvalAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";
import type {
  UnifiedModelConfig,
  UnifiedModelResponse,
  ModelsInfoResponse,
  CreateFieldMetadataRequest,
  CreateFieldMetadataResponse,
  FieldMetadataResponse,
  CreateTrialConfigRequest,
  CreateTrialConfigResponse,
  DeleteTrialConfigResponse,
  TrialInfoResponse,
  TrialsListResponse,
  PredictionResponse,
  PatientData,
  ChartDataResponse,
  ChartStatisticsResponse,
  HealthCheckResponse,
  ServicesStatusResponse,
  CacheClearResponse,
} from "@/types/ml-evaluation-admin.types";

// Base URL for ml-evaluation-service
const ML_EVALUATION_BASE = API_CONFIG.PREFIXES.PREDICT_TRIAL_SERVICE || "/api/ml-evaluation-service/v1";

/**
 * Build the module-aware endpoint path
 * @param trialSlug Trial identifier
 * @param moduleName Module name identifier (will be converted to lowercase)
 * @param path Additional path after the module (e.g., "predict", "models")
 */
function buildModuleEndpoint(trialSlug: string, moduleName: string, path: string): string {
  // Ensure moduleName is lowercase for API endpoints
  return `${ML_EVALUATION_BASE}/${trialSlug}/modules/${moduleName.toLowerCase()}/${path}`;
}

/**
 * ML Evaluation Admin Service
 * Provides methods for managing ML models, field metadata, and trial configurations
 */
export const mlEvaluationAdminService = {
  // ============================================
  // Model Management
  // ============================================

  /**
   * Upload/register a model using the unified endpoint
   * Handles both file uploads AND URL-based registration with BentoML integration
   *
   * @param modelConfig Model configuration object
   * @param file Optional model file (.pkl, .pickle, .joblib) - required for file_upload source_type
   * @returns UnifiedModelResponse with bento_tag, reload_status, etc.
   *
   * @example File upload:
   * ```ts
   * const response = await uploadModelUnified({
   *   model_key: "obj_response",
   *   display_name: "Objective Response Predictor",
   *   model_type: "classification",
   *   model_framework: "xgboost",
   *   version: "1.0.0",
   *   trial_slug: "car-t-therapy",
   *   module_id: "module-a",
   *   confidence_config: { strategy: "xgboost_ensemble_variance", sample_fraction: 0.2 },
   *   response_mapping: { "0": "Complete Response", "1": "No Response" },
   *   save_to_bentoml: true,
   *   auto_reload: true
   * }, modelFile);
   * ```
   *
   * @example URL-based registration (S3):
   * ```ts
   * const response = await uploadModelUnified({
   *   model_key: "obj_response",
   *   display_name: "Objective Response Predictor",
   *   model_type: "classification",
   *   model_framework: "xgboost",
   *   version: "1.0.0",
   *   storage: {
   *     source_type: "s3",
   *     s3_uri: "s3://bucket/model.pkl",
   *     loader_type: "pickle"
   *   },
   *   save_to_bentoml: true
   * });
   * ```
   */
  uploadModelUnified: async (
    modelConfig: UnifiedModelConfig,
    file?: File
  ): Promise<UnifiedModelResponse> => {
    const formData = new FormData();

    // Append file if provided (for file uploads)
    if (file) {
      formData.append("file", file);
    }

    // Append model_config as JSON string
    formData.append("model_config", JSON.stringify(modelConfig));

    const response = await mlEvalAxios.post(
      `${ML_EVALUATION_BASE}/admin/models/unified`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // 2 minute timeout for large files
      }
    );
    return response.data;
  },

  /**
   * Get models information for a specific trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  getModelsInfo: async (trialSlug: string, moduleName: string): Promise<ModelsInfoResponse> => {
    const response = await mlEvalAxios.get(buildModuleEndpoint(trialSlug, moduleName, "models"));
    return response.data;
  },

  // ============================================
  // Field Metadata Management
  // ============================================

  /**
   * Create field metadata for a trial
   * @param request Field metadata creation request
   */
  createFieldMetadata: async (
    request: CreateFieldMetadataRequest
  ): Promise<CreateFieldMetadataResponse> => {
    const response = await mlEvalAxios.post(
      `${ML_EVALUATION_BASE}/admin/field-metadata`,
      request
    );
    return response.data;
  },

  /**
   * Get field metadata for a trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  getFieldMetadata: async (trialSlug: string, moduleName: string): Promise<FieldMetadataResponse> => {
    const response = await mlEvalAxios.get(
      buildModuleEndpoint(trialSlug, moduleName, "predict/fields")
    );
    return response.data;
  },

  // ============================================
  // Trial/Study Configuration Management
  // ============================================

  /**
   * Create a new trial configuration
   * @param request Trial configuration request
   */
  createTrialConfig: async (
    request: CreateTrialConfigRequest
  ): Promise<CreateTrialConfigResponse> => {
    const response = await mlEvalAxios.post(
      `${ML_EVALUATION_BASE}/admin/trials`,
      request
    );
    return response.data;
  },

  /**
   * List all configured trials
   */
  listTrials: async (): Promise<TrialsListResponse> => {
    const response = await mlEvalAxios.get(`${ML_EVALUATION_BASE}/admin/trials`);
    return response.data;
  },

  /**
   * Get detailed information about a specific trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  getTrialInfo: async (trialSlug: string, moduleName: string): Promise<TrialInfoResponse> => {
    const response = await mlEvalAxios.get(buildModuleEndpoint(trialSlug, moduleName, "info"));
    return response.data;
  },

  /**
   * Reload a trial configuration from database
   * Useful after updating trial config
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  reloadTrial: async (trialSlug: string, moduleName: string): Promise<{ message: string }> => {
    const response = await mlEvalAxios.post(
      `${ML_EVALUATION_BASE}/admin/trials/${trialSlug}/modules/${moduleName.toLowerCase()}/reload`
    );
    return response.data;
  },

  /**
   * Delete a trial configuration
   * Removes ML configuration for a trial (models, field metadata, charts)
   * NOTE: Backend endpoint may not be implemented yet
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  deleteTrialConfig: async (trialSlug: string, moduleName: string): Promise<DeleteTrialConfigResponse> => {
    const response = await mlEvalAxios.delete(
      `${ML_EVALUATION_BASE}/admin/trials/${trialSlug}/modules/${moduleName.toLowerCase()}`
    );
    return response.data;
  },

  // ============================================
  // Prediction (for testing)
  // ============================================

  /**
   * Run a test prediction for a trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   * @param patientData Patient data for prediction
   * @param projectId Project identifier
   */
  testPredict: async (
    trialSlug: string,
    moduleName: string,
    patientData: Record<string, any>,
    projectId: string
  ): Promise<PredictionResponse> => {
    const response = await mlEvalAxios.post(
      buildModuleEndpoint(trialSlug, moduleName, "predict"),
      { patient_data: patientData } as PatientData,
      { params: { project_id: projectId } }
    );
    return response.data;
  },

  // ============================================
  // Charts
  // ============================================

  /**
   * Get chart data for a trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  getChartData: async (trialSlug: string, moduleName: string): Promise<ChartDataResponse> => {
    const response = await mlEvalAxios.get(buildModuleEndpoint(trialSlug, moduleName, "charts"));
    return response.data;
  },

  /**
   * Get chart statistics for a trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   */
  getChartStats: async (trialSlug: string, moduleName: string): Promise<ChartStatisticsResponse> => {
    const response = await mlEvalAxios.get(
      buildModuleEndpoint(trialSlug, moduleName, "charts/stats")
    );
    return response.data;
  },

  /**
   * Add patients to charts
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   * @param patientData Patient data to add
   */
  addPatientsToCharts: async (
    trialSlug: string,
    moduleName: string,
    patientData: any
  ): Promise<{ status: string; message: string }> => {
    const response = await mlEvalAxios.post(
      buildModuleEndpoint(trialSlug, moduleName, "charts/add-patients"),
      patientData
    );
    return response.data;
  },

  // ============================================
  // Admin Operations
  // ============================================

  /**
   * Health check for the service
   */
  healthCheck: async (): Promise<HealthCheckResponse> => {
    const response = await mlEvalAxios.get(`${ML_EVALUATION_BASE}/admin/health`);
    return response.data;
  },

  /**
   * Get status of all cached trial services
   */
  getServicesStatus: async (): Promise<ServicesStatusResponse> => {
    const response = await mlEvalAxios.get(
      `${ML_EVALUATION_BASE}/admin/services/status`
    );
    return response.data;
  },

  /**
   * Clear all caches (use with caution)
   */
  clearCache: async (): Promise<CacheClearResponse> => {
    const response = await mlEvalAxios.post(`${ML_EVALUATION_BASE}/admin/cache/clear`);
    return response.data;
  },

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if a trial has ML configuration
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   * @returns true if trial has ML config, false otherwise
   */
  hasMLConfig: async (trialSlug: string, moduleName: string): Promise<boolean> => {
    try {
      const response = await mlEvaluationAdminService.getTrialInfo(trialSlug, moduleName);
      // Check for "not_configured" status (200 OK with status: "not_configured")
      if (response.status === "not_configured") {
        return false;
      }
      return response.status === "success" && !!response.trial_info;
    } catch {
      return false;
    }
  },

  /**
   * Get ML config status for a trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   * @returns 'active', 'draft', or 'not_configured'
   */
  getMLConfigStatus: async (
    trialSlug: string,
    moduleName: string
  ): Promise<"active" | "draft" | "not_configured"> => {
    try {
      const response = await mlEvaluationAdminService.getTrialInfo(trialSlug, moduleName);
      // Handle "not_configured" status (200 OK with status: "not_configured")
      if (response.status === "not_configured") {
        return "not_configured";
      }
      if (response.status === "success" && response.trial_info && "is_active" in response.trial_info) {
        return response.trial_info.is_active ? "active" : "draft";
      }
      return "not_configured";
    } catch {
      return "not_configured";
    }
  },

  /**
   * Run a CSV batch prediction for a trial
   * @param trialSlug Trial identifier
   * @param moduleName Module name identifier
   * @param file CSV file to process
   * @param projectId Project identifier
   */
  predictCsv: async (
    trialSlug: string,
    moduleName: string,
    file: File,
    projectId: string
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await mlEvalAxios.post(
      buildModuleEndpoint(trialSlug, moduleName, "predict/csv"),
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        params: { project_id: projectId },
      }
    );
    return response.data;
  },
};

export default mlEvaluationAdminService;
