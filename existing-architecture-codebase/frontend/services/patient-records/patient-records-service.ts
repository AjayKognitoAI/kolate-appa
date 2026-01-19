/**
 * Patient Records Service (Migrated)
 *
 * This service provides access to patient records stored in PostgreSQL (JSONB).
 * Replaces the old MongoDB-based patient record storage.
 *
 * Migration Changes:
 * - Old: /api/mongo-database-manager/v1/patient-record/*
 * - New: /api/v1/patient-records/{project_id}/{trial_slug}/*
 * - Storage: MongoDB → PostgreSQL with JSONB columns
 */

import { apiClient } from "@/utils/api-client";
import { ENDPOINTS, buildPaginatedEndpoint } from "@/utils/api-endpoints";

// =============================================================================
// Types
// =============================================================================

export interface ApiResponse<T> {
  state: string;
  status: string;
  message: string | null;
  data: T;
}

export interface PatientRecord {
  id: string;
  record_id: string;
  project_id: string;
  trial_slug: string;
  user_id: string;
  patient_data: Record<string, unknown>;
  prediction_results: PredictionResult[];
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface PredictionResult {
  model_id: string;
  model_name: string;
  prediction: number | string;
  confidence?: number;
  details?: Record<string, unknown>;
  predicted_at: string;
}

export interface PatientRecordCreateRequest {
  user_id: string;
  patient_data: Record<string, unknown>;
  prediction_results?: PredictionResult[];
}

export interface PatientRecordUpdateRequest {
  patient_data?: Record<string, unknown>;
  prediction_results?: PredictionResult[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// =============================================================================
// Patient Records Service
// =============================================================================

export const patientRecordsService = {
  /**
   * Get paginated list of patient records
   */
  getRecords: async (
    projectId: string,
    trialSlug: string,
    page: number = 1,
    size: number = 10,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<ApiResponse<PaginatedResponse<PatientRecord>>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.PATIENT_RECORDS.LIST(projectId, trialSlug),
      page,
      size,
      { sort_by: sortBy, sort_order: sortOrder }
    );
    return apiClient.get(endpoint);
  },

  /**
   * Get a single patient record by ID
   */
  getRecord: async (
    projectId: string,
    trialSlug: string,
    recordId: string
  ): Promise<ApiResponse<PatientRecord>> => {
    return apiClient.get(
      ENDPOINTS.PATIENT_RECORDS.BY_ID(projectId, trialSlug, recordId)
    );
  },

  /**
   * Create a new patient record
   */
  createRecord: async (
    projectId: string,
    trialSlug: string,
    data: PatientRecordCreateRequest
  ): Promise<ApiResponse<PatientRecord>> => {
    return apiClient.post(
      ENDPOINTS.PATIENT_RECORDS.CREATE(projectId, trialSlug),
      data
    );
  },

  /**
   * Update an existing patient record
   */
  updateRecord: async (
    projectId: string,
    trialSlug: string,
    recordId: string,
    data: PatientRecordUpdateRequest
  ): Promise<ApiResponse<PatientRecord>> => {
    return apiClient.put(
      ENDPOINTS.PATIENT_RECORDS.UPDATE(projectId, trialSlug, recordId),
      data
    );
  },

  /**
   * Delete a patient record
   */
  deleteRecord: async (
    projectId: string,
    trialSlug: string,
    recordId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.delete(
      ENDPOINTS.PATIENT_RECORDS.DELETE(projectId, trialSlug, recordId)
    );
  },

  /**
   * Get multiple records by IDs (bulk operation)
   */
  getRecordsByIds: async (
    projectId: string,
    trialSlug: string,
    recordIds: string[]
  ): Promise<ApiResponse<PatientRecord[]>> => {
    return apiClient.post(
      ENDPOINTS.PATIENT_RECORDS.BULK_GET(projectId, trialSlug),
      { record_ids: recordIds }
    );
  },

  /**
   * Get all records for a specific user
   */
  getRecordsByUser: async (
    projectId: string,
    trialSlug: string,
    userId: string,
    page: number = 1,
    size: number = 10
  ): Promise<ApiResponse<PaginatedResponse<PatientRecord>>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.PATIENT_RECORDS.BY_USER(projectId, trialSlug, userId),
      page,
      size
    );
    return apiClient.get(endpoint);
  },

  /**
   * Get count of records
   */
  getRecordCount: async (
    projectId: string,
    trialSlug: string,
    userId?: string
  ): Promise<ApiResponse<{ count: number }>> => {
    let endpoint = ENDPOINTS.PATIENT_RECORDS.COUNT(projectId, trialSlug);
    if (userId) {
      endpoint += `?user_id=${encodeURIComponent(userId)}`;
    }
    return apiClient.get(endpoint);
  },
};

// =============================================================================
// Execution Records Service (Prediction History)
// =============================================================================

export interface ExecutionRecord {
  id: string;
  execution_id: string;
  project_id: string;
  trial_slug: string;
  user_id: string;
  base_patient_data: Record<string, unknown>;
  base_prediction: PredictionResult[];
  executed_by: string;
  executed_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface ExecutionRecordCreateRequest {
  user_id: string;
  base_patient_data: Record<string, unknown>;
  base_prediction?: PredictionResult[];
  executed_by?: string;
}

export interface ExecutionRecordUpdateRequest {
  base_patient_data?: Record<string, unknown>;
  base_prediction?: PredictionResult[];
}

export const executionRecordsService = {
  /**
   * Get paginated list of execution records
   */
  getRecords: async (
    projectId: string,
    trialSlug: string,
    page: number = 1,
    size: number = 10,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<ApiResponse<PaginatedResponse<ExecutionRecord>>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.EXECUTIONS.LIST(projectId, trialSlug),
      page,
      size,
      { sort_by: sortBy, sort_order: sortOrder }
    );
    return apiClient.get(endpoint);
  },

  /**
   * Get a single execution record by ID
   */
  getRecord: async (
    projectId: string,
    trialSlug: string,
    executionId: string
  ): Promise<ApiResponse<ExecutionRecord>> => {
    return apiClient.get(
      ENDPOINTS.EXECUTIONS.BY_ID(projectId, trialSlug, executionId)
    );
  },

  /**
   * Create a new execution record
   */
  createRecord: async (
    projectId: string,
    trialSlug: string,
    data: ExecutionRecordCreateRequest
  ): Promise<ApiResponse<ExecutionRecord>> => {
    return apiClient.post(
      ENDPOINTS.EXECUTIONS.CREATE(projectId, trialSlug),
      data
    );
  },

  /**
   * Update an existing execution record
   */
  updateRecord: async (
    projectId: string,
    trialSlug: string,
    executionId: string,
    data: ExecutionRecordUpdateRequest
  ): Promise<ApiResponse<ExecutionRecord>> => {
    return apiClient.put(
      ENDPOINTS.EXECUTIONS.UPDATE(projectId, trialSlug, executionId),
      data
    );
  },

  /**
   * Delete an execution record
   */
  deleteRecord: async (
    projectId: string,
    trialSlug: string,
    executionId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.delete(
      ENDPOINTS.EXECUTIONS.DELETE(projectId, trialSlug, executionId)
    );
  },

  /**
   * Get multiple execution records by IDs (bulk operation)
   */
  getRecordsByIds: async (
    projectId: string,
    trialSlug: string,
    executionIds: string[]
  ): Promise<ApiResponse<ExecutionRecord[]>> => {
    return apiClient.post(
      ENDPOINTS.EXECUTIONS.BULK_GET(projectId, trialSlug),
      { execution_ids: executionIds }
    );
  },

  /**
   * Get all execution records for a specific user
   */
  getRecordsByUser: async (
    projectId: string,
    trialSlug: string,
    userId: string,
    page: number = 1,
    size: number = 10
  ): Promise<ApiResponse<PaginatedResponse<ExecutionRecord>>> => {
    const endpoint = buildPaginatedEndpoint(
      ENDPOINTS.EXECUTIONS.BY_USER(projectId, trialSlug, userId),
      page,
      size
    );
    return apiClient.get(endpoint);
  },

  /**
   * Get count of execution records
   */
  getRecordCount: async (
    projectId: string,
    trialSlug: string,
    userId?: string
  ): Promise<ApiResponse<{ count: number }>> => {
    let endpoint = ENDPOINTS.EXECUTIONS.COUNT(projectId, trialSlug);
    if (userId) {
      endpoint += `?user_id=${encodeURIComponent(userId)}`;
    }
    return apiClient.get(endpoint);
  },
};

export default patientRecordsService;
