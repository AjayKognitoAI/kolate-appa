/**
 * Cohort Service for Patient Enrollment
 *
 * Handles all API operations for cohort management including:
 * - CRUD operations for cohorts
 * - CRUD operations for saved filters
 * - Master data upload
 * - Cohort comparison
 * - Activity tracking and analytics
 *
 * Updated to match OpenAPI spec v1.0.0
 */

import { apiClient } from "@/utils/api-client"
import { ENDPOINTS, buildPaginatedEndpoint } from "@/utils/api-endpoints"
import type {
  CohortCreateRequest,
  CohortUpdateRequest,
  CohortListParams,
  CohortResponse,
  CohortListResponse,
  MasterDataUploadResponse,
  CohortCompareResponse,
  DeleteResponse,
  SavedFilterCreateRequest,
  SavedFilterUpdateRequest,
  FilterListParams,
  FilterGroup,
  SavedFilterApi,
  PaginatedData,
  // Study types
  StudyCreateRequest,
  StudyUpdateRequest,
  StudyListParams,
  StudyResponse,
  StudyWithCountsResponse,
  StudyListResponse,
  MasterDataListResponse,
  MasterDataPreviewResponse,
  MergeResultResponse,
  // Activity types (new)
  ActivityEntityType,
  ActivityListParams,
  ActivityResponse,
  // Cohort patient IDs
  CohortPatientIdsResponse,
  // Column description types
  GenerateColumnDescriptionsRequest,
  GenerateColumnDescriptionsResponse,
  ColumnMetadataInput,
  // Enhanced column schema
  EnhancedColumnSchema,
  // Unified criteria processing types
  UnifiedCriteriaRequest,
  UnifiedCriteriaResponse,
} from "@/types/cohort.types"

// API Endpoints - shorthand for patient screening endpoints
const PS = ENDPOINTS.PATIENT_SCREENING

// ============ ACTIVITY TYPES ============
// Activity types are now defined in @/types/cohort.types.ts
// Re-exported types: ActivityEntityType, ActivityListParams, ActivityResponse, ActivityApi

// ============ ANALYTICS TYPES ============

export interface ScreeningAnalytics {
  total_cohorts: number
  total_patients_screened: number
  average_match_rate: number
  cohorts_this_month: number
  top_filters_used: Array<{
    field: string
    count: number
  }>
  screening_trends: Array<{
    date: string
    cohorts_created: number
    patients_screened: number
  }>
}

export interface AnalyticsResponse {
  status: string
  data: Record<string, unknown>
}

// ============ FILTER RESPONSE TYPES ============

export interface SavedFilterResponse {
  status: string
  message?: string | null
  data: SavedFilterApi
}

export interface FilterListResponse {
  status: string
  data: PaginatedData<SavedFilterApi>
}

// ============ COMPARE TYPES ============

export interface CompareRequest {
  cohort_ids: string[]
}

// ============ AI FILTER GENERATION TYPES ============

export interface AIGenerateFilterRequest {
  master_data_id?: string
  enterprise_id?: string
  columns?: Record<string, string>
  inclusion_criteria?: string
  exclusion_criteria?: string
}

export interface AIGenerateFilterResponse {
  status: "success" | "error"
  message?: string
  data: {
    filter: FilterGroup
    master_data_id?: string
    columns_used: string[]
    inclusion_criteria?: string
    exclusion_criteria?: string
  }
}

// ============ SCHEMA VALIDATION TYPES ============

export interface ValidateSchemaRequest {
  columns: string[] // Dataset column names (schema)
  inclusion_criteria?: string
  exclusion_criteria?: string
}

export interface ValidateSchemaResponse {
  status: "success" | "error"
  message?: string
  data: {
    is_valid: boolean
    missing_columns: string[]
    required_columns: string[]
    available_columns: string[]
    criteria_mapping?: Array<{
      criterion: string
      columns: string[]
      type?: "inclusion" | "exclusion" // Tag from backend indicating criterion type
    }>
    // Column mapping suggestions from backend (AI-powered or fuzzy matching)
    // Maps required/missing column names to suggested available column names
    suggested_mappings?: Record<string, string> // e.g., { "age": "patient_age", "bmi": "body_mass_index" }
  }
}

// ============ NULL VALUE DETECTION TYPES ============

export interface NullDetection {
  total_rows: number
  rows_with_nulls: number
  rows_with_nulls_percentage: number
  null_count_by_column: Record<string, number>
  has_nulls: boolean
}

export interface NullRecord {
  row_index: number
  patient_id?: string
  null_columns: string[]
  record_data: Record<string, unknown>
}

export interface NullRecordsResponse {
  status: string
  data: {
    master_data_id: string
    total_rows: number
    rows_with_nulls: number
    null_count_by_column: Record<string, number>
    null_records: NullRecord[]
    page: number
    size: number
    has_more: boolean
  }
}

export interface NullValueEdit {
  row_index: number
  column_name: string
  new_value: string | number
}

export interface EditNullValuesRequest {
  edits: NullValueEdit[]
  enterprise_id: string
  user_id: string
  user_name?: string
  description?: string
}

export interface EditNullValuesResponse {
  status: string
  message: string
  data: {
    new_master_data_id: string
    parent_master_data_id: string
    version: number
    file_name: string
    row_count: number
    total_edits_applied: number
    edited_columns: string[]
    created_at: string
    s3_key: string
  }
}

export interface EditSummary {
  total_cells_edited: number
  edited_columns: string[]
  description?: string
  edit_date: string
}

export interface MasterDataVersion {
  id: string
  file_name: string
  version: number
  is_edited_version: boolean
  parent_master_data_id: string | null
  edit_summary: EditSummary | null
  row_count: number
  created_at: string
  created_by: string
}

export interface VersionHistoryResponse {
  status: string
  data: {
    original: MasterDataVersion
    versions: MasterDataVersion[]
    total_versions: number
  }
}

// ============ SERVICE ============

const cohortService = {
  // ============ STUDY CRUD ============

  /**
   * List all studies with optional pagination and sorting
   * @param params - Query parameters including required enterprise_id
   */
  async getStudies(params: StudyListParams): Promise<StudyListResponse> {
    return apiClient.get<StudyListResponse>(PS.STUDIES, { params })
  },

  /**
   * Get a single study by ID with counts
   * @param studyId - The study ID
   * @param enterpriseId - Enterprise ID for authorization
   */
  async getStudyById(studyId: string, enterpriseId: string): Promise<StudyWithCountsResponse> {
    return apiClient.get<StudyWithCountsResponse>(
      PS.STUDY_BY_ID(studyId),
      { params: { enterprise_id: enterpriseId } }
    )
  },

  /**
   * Create a new study
   */
  async createStudy(data: StudyCreateRequest): Promise<StudyResponse> {
    return apiClient.post<StudyResponse>(PS.STUDIES, data)
  },

  /**
   * Update an existing study
   */
  async updateStudy(
    studyId: string,
    enterpriseId: string,
    data: StudyUpdateRequest
  ): Promise<StudyResponse> {
    return apiClient.put<StudyResponse>(
      PS.STUDY_BY_ID(studyId),
      data,
      { params: { enterprise_id: enterpriseId } }
    )
  },

  /**
   * Delete a study
   */
  async deleteStudy(studyId: string, enterpriseId: string): Promise<DeleteResponse> {
    return apiClient.delete<DeleteResponse>(
      PS.STUDY_BY_ID(studyId),
      { params: { enterprise_id: enterpriseId } }
    )
  },

  // ============ STUDY-SPECIFIC OPERATIONS ============

  /**
   * Get all master data files for a study
   */
  async getStudyMasterData(studyId: string, enterpriseId: string): Promise<MasterDataListResponse> {
    return apiClient.get<MasterDataListResponse>(
      PS.STUDY_MASTER_DATA(studyId),
      { params: { enterprise_id: enterpriseId } }
    )
  },

  /**
   * Upload master data file for a specific study
   * @param studyId - The study ID to upload to
   * @param file - The file to upload
   * @param enterpriseId - Enterprise ID (sent as form data)
   * @param userId - User ID (sent as form data)
   * @param patientIdColumn - The column name that contains unique patient IDs
   */
  async uploadMasterDataForStudy(
    studyId: string,
    file: File,
    enterpriseId: string,
    userId: string,
    patientIdColumn: string,
    enhancedColumns?: EnhancedColumnSchema
  ): Promise<MasterDataUploadResponse> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("enterprise_id", enterpriseId)
    formData.append("user_id", userId)
    formData.append("patient_id_column", patientIdColumn)

    // Include enhanced column metadata if provided
    if (enhancedColumns) {
      formData.append("column_descriptions", JSON.stringify(enhancedColumns))
    }

    return apiClient.upload<MasterDataUploadResponse>(
      PS.STUDY_UPLOAD_MASTER_DATA(studyId),
      formData,
      { timeout: 300000 } // 5 minutes for large files
    )
  },

  /**
   * Get master data preview/content (sample rows for filtering)
   * @param masterDataId - The master data ID to fetch
   * @param enterpriseId - Enterprise ID
   * @param page - Page number (0-indexed)
   * @param size - Number of rows to fetch (default 100)
   */
  async getMasterDataPreview(
    masterDataId: string,
    enterpriseId: string,
    page: number = 0,
    size: number = 100
  ): Promise<MasterDataPreviewResponse> {
    return apiClient.get<MasterDataPreviewResponse>(
      PS.MASTER_DATA_PREVIEW(masterDataId),
      { params: { enterprise_id: enterpriseId, page, size } }
    )
  },

  /**
   * Get all cohorts for a study with pagination
   */
  async getStudyCohorts(
    studyId: string,
    enterpriseId: string,
    page: number = 0,
    size: number = 20
  ): Promise<CohortListResponse> {
    return apiClient.get<CohortListResponse>(
      PS.STUDY_COHORTS(studyId),
      { params: { enterprise_id: enterpriseId, page, size } }
    )
  },

  /**
   * Get all patient IDs from all cohorts in a study
   * Used for "belongs to cohort" / "not belongs to cohort" filter conditions
   * @param studyId - The study ID
   * @param enterpriseId - Enterprise ID for authorization
   */
  async getCohortPatientIds(
    studyId: string,
    enterpriseId: string
  ): Promise<CohortPatientIdsResponse> {
    return apiClient.get<CohortPatientIdsResponse>(
      PS.STUDY_COHORT_PATIENT_IDS(studyId),
      { params: { enterprise_id: enterpriseId } }
    )
  },

  /**
   * Merge cohort with new columns from uploaded file
   * @param studyId - The study ID
   * @param sourceCohortId - Source cohort to get filtered patients from
   * @param mergeColumn - Column to merge on (e.g., patient_id)
   * @param file - File with new columns to merge
   * @param enterpriseId - Enterprise ID (sent as form data)
   * @param userId - User ID (sent as form data)
   * @param name - Optional name for the new master data
   */
  async mergeCohort(
    studyId: string,
    sourceCohortId: string,
    mergeColumn: string,
    file: File,
    enterpriseId: string,
    userId: string,
    name?: string
  ): Promise<MergeResultResponse> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("enterprise_id", enterpriseId)
    formData.append("user_id", userId)

    const params: Record<string, string> = {
      source_cohort_id: sourceCohortId,
      merge_column: mergeColumn,
    }
    if (name) {
      params.name = name
    }

    return apiClient.upload<MergeResultResponse>(
      PS.STUDY_MERGE_COHORT(studyId),
      formData,
      { params, timeout: 300000 } // 5 minutes for large files
    )
  },

  // ============ COHORT CRUD ============

  /**
   * List all cohorts with optional pagination and sorting
   * @param params - Query parameters including required enterprise_id
   */
  async getCohorts(params: CohortListParams): Promise<CohortListResponse> {
    return apiClient.get<CohortListResponse>(PS.COHORTS, { params })
  },

  /**
   * Get a single cohort by ID
   */
  async getCohortById(cohortId: string): Promise<CohortResponse> {
    return apiClient.get<CohortResponse>(PS.COHORT_BY_ID(cohortId))
  },

  /**
   * Create a new cohort
   */
  async createCohort(data: CohortCreateRequest): Promise<CohortResponse> {
    return apiClient.post<CohortResponse>(PS.COHORTS, data)
  },

  /**
   * Update an existing cohort
   */
  async updateCohort(
    cohortId: string,
    data: CohortUpdateRequest
  ): Promise<CohortResponse> {
    return apiClient.put<CohortResponse>(PS.COHORT_BY_ID(cohortId), data)
  },

  /**
   * Delete a cohort
   * @param cohortId - The cohort ID to delete
   * @param userId - User ID performing the deletion (required)
   * @param userName - Display name for activity logging (optional)
   */
  async deleteCohort(
    cohortId: string,
    userId: string,
    userName?: string
  ): Promise<DeleteResponse> {
    const params: Record<string, string> = { user_id: userId }
    if (userName) {
      params.user_name = userName
    }
    return apiClient.delete<DeleteResponse>(PS.COHORT_BY_ID(cohortId), { params })
  },

  // ============ SAVED FILTERS CRUD ============

  /**
   * List all saved filters with optional pagination
   * @param params - Query parameters including required enterprise_id
   */
  async getFilters(params: FilterListParams): Promise<FilterListResponse> {
    return apiClient.get<FilterListResponse>(PS.FILTERS, { params })
  },

  /**
   * Get a single saved filter by ID
   */
  async getFilterById(filterId: string): Promise<SavedFilterResponse> {
    return apiClient.get<SavedFilterResponse>(PS.FILTER_BY_ID(filterId))
  },

  /**
   * Create a new saved filter
   */
  async createFilter(data: SavedFilterCreateRequest): Promise<SavedFilterResponse> {
    return apiClient.post<SavedFilterResponse>(PS.FILTERS, data)
  },

  /**
   * Update an existing saved filter
   */
  async updateFilter(
    filterId: string,
    data: SavedFilterUpdateRequest
  ): Promise<SavedFilterResponse> {
    return apiClient.put<SavedFilterResponse>(PS.FILTER_BY_ID(filterId), data)
  },

  /**
   * Delete a saved filter
   */
  async deleteFilter(filterId: string): Promise<DeleteResponse> {
    return apiClient.delete<DeleteResponse>(PS.FILTER_BY_ID(filterId))
  },

  // ============ MASTER DATA OPERATIONS ============

  /**
   * Upload master data file
   * Returns upload result with master_data_id to be used when creating a cohort
   * @param file - The file to upload
   * @param enterpriseId - Enterprise ID (sent as form data)
   * @param userId - User ID (sent as form data)
   */
  async uploadMasterData(
    file: File,
    enterpriseId: string,
    userId: string
  ): Promise<MasterDataUploadResponse> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("enterprise_id", enterpriseId)
    formData.append("user_id", userId)

    return apiClient.upload<MasterDataUploadResponse>(
      PS.MASTER_DATA_UPLOAD,
      formData,
      { timeout: 300000 } // 5 minutes for large files
    )
  },

  /**
   * Get records with null values from master data
   * @param masterDataId - The master data ID
   * @param enterpriseId - Enterprise ID
   * @param page - Page number (default: 0)
   * @param size - Page size (default: 100, max: 1000)
   */
  async getNullRecords(
    masterDataId: string,
    enterpriseId: string,
    page: number = 0,
    size: number = 100
  ): Promise<NullRecordsResponse> {
    return apiClient.get<NullRecordsResponse>(
      PS.MASTER_DATA_NULL_RECORDS(masterDataId),
      { params: { enterprise_id: enterpriseId, page, size } }
    )
  },

  /**
   * Edit null values and create new versioned master data
   * @param masterDataId - The master data ID
   * @param request - Edit request with edits array and metadata
   */
  async editNullValues(
    masterDataId: string,
    request: EditNullValuesRequest
  ): Promise<EditNullValuesResponse> {
    return apiClient.patch<EditNullValuesResponse>(
      PS.MASTER_DATA_EDIT_NULL_VALUES(masterDataId),
      request
    )
  },

  /**
   * Get version history for master data
   * @param masterDataId - The master data ID
   * @param enterpriseId - Enterprise ID
   */
  async getMasterDataVersions(
    masterDataId: string,
    enterpriseId: string
  ): Promise<VersionHistoryResponse> {
    return apiClient.get<VersionHistoryResponse>(
      PS.MASTER_DATA_VERSIONS(masterDataId),
      { params: { enterprise_id: enterpriseId } }
    )
  },

  // ============ COMPARISON ============

  /**
   * Compare multiple cohorts
   */
  async compareCohorts(cohortIds: string[]): Promise<CohortCompareResponse> {
    const request: CompareRequest = { cohort_ids: cohortIds }
    return apiClient.post<CohortCompareResponse>(PS.COHORTS_COMPARE, request)
  },

  // ============ ACTIVITY & ANALYTICS ============

  /**
   * Get activity history for a study
   * @param studyId - The study ID
   * @param params - Optional filter parameters (entity_type, entity_id, limit, offset)
   *
   * @example
   * // Get all activities for a study
   * const activities = await cohortService.getStudyActivity(studyId);
   *
   * @example
   * // Get only cohort-related activities
   * const cohortActivities = await cohortService.getStudyActivity(studyId, { entity_type: 'cohort' });
   *
   * @example
   * // Get activities for a specific cohort
   * const specificCohortActivities = await cohortService.getStudyActivity(studyId, {
   *   entity_type: 'cohort',
   *   entity_id: cohortId
   * });
   */
  async getStudyActivity(
    studyId: string,
    params?: ActivityListParams
  ): Promise<ActivityResponse> {
    return apiClient.get<ActivityResponse>(
      PS.STUDY_ACTIVITY(studyId),
      { params: { limit: 50, offset: 0, ...params } }
    )
  },

  /**
   * Get screening analytics/dashboard data
   */
  async getAnalytics(): Promise<AnalyticsResponse> {
    return apiClient.get<AnalyticsResponse>(PS.ANALYTICS)
  },

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string }> {
    return apiClient.get<{ status: string }>(PS.HEALTH)
  },

  // ============ AI FILTER GENERATION ============

  /**
   * @deprecated Use processCriteria() instead.
   * Generate filter from natural language criteria using AI.
   * This returns a single combined filter. Use processCriteria() for sentence-by-sentence formulas.
   * @param request - The AI filter generation request
   */
  async generateFilterFromAI(request: AIGenerateFilterRequest): Promise<AIGenerateFilterResponse> {
    return apiClient.post<AIGenerateFilterResponse>(
      PS.AI_GENERATE_FILTER,
      request,
      { timeout: 60000 } // 60 seconds for AI processing
    )
  },

  /**
   * @deprecated Use processCriteria() instead.
   * Validate dataset schema against inclusion/exclusion criteria
   * Backend extracts required columns from criteria and checks if they exist in the dataset
   *
   * @param request - Schema validation request with columns and IC/EC criteria
   */
  async validateSchema(request: ValidateSchemaRequest): Promise<ValidateSchemaResponse> {
    return apiClient.post<ValidateSchemaResponse>(
      PS.AI_VALIDATE_SCHEMA,
      request,
      { timeout: 30000 } // 30 seconds for validation
    )
  },

  /**
   * Process inclusion/exclusion criteria into sentence-by-sentence formulas using AI.
   *
   * This unified endpoint replaces both validateSchema and generateFilterFromAI.
   * It parses criteria text, generates filter formulas for each sentence,
   * and provides confidence-scored column suggestions.
   *
   * Key features:
   * - Preserves exact user wording for each sentence
   * - Returns individual formulas per sentence (not one combined filter)
   * - Provides top 3 column suggestions per field with confidence scores
   * - Handles exclusions as pre-negated formulas (ready to AND with inclusions)
   *
   * @param request - The unified criteria processing request
   * @returns Sentence-by-sentence formulas with column suggestions
   *
   * @example
   * const response = await cohortService.processCriteria({
   *   columns: {
   *     age: { type: "number", description: "Patient age in years" },
   *     pregnant: { type: "categorical", sample_values: ["Yes", "No"] }
   *   },
   *   inclusion_criteria: "Age >= 18 years\nEASI score > 16",
   *   exclusion_criteria: "Pregnant patients"
   * });
   *
   * // Returns individual formulas for each sentence:
   * // - "Age >= 18 years" → { field: "age", operator: "gte", value: 18 }
   * // - "EASI score > 16" → { field: "easi_score", operator: "gt", value: 16 }
   * // - "Pregnant patients" → { field: "pregnant", operator: "equals", value: "No" }
   */
  async processCriteria(request: UnifiedCriteriaRequest): Promise<UnifiedCriteriaResponse> {
    return apiClient.post<UnifiedCriteriaResponse>(
      PS.AI_PROCESS_CRITERIA,
      request,
      { timeout: 60000 } // 60 seconds for AI processing
    )
  },

  /**
   * Generate AI-powered clinical descriptions for dataset columns
   * Returns descriptions, categories, confidence scores, and metadata for each column
   *
   * @param request - Column description request (master_data_id, columns, or column_names)
   *
   * @example
   * // Using master data ID (recommended after upload)
   * const response = await cohortService.generateColumnDescriptions({
   *   master_data_id: "550e8400-e29b-41d4-a716-446655440000",
   *   enterprise_id: "enterprise-123"
   * });
   *
   * @example
   * // Using column names directly (quick preview)
   * const response = await cohortService.generateColumnDescriptions({
   *   column_names: ["age", "bmi", "easi_score", "pregnant"]
   * });
   *
   * @example
   * // Using columns with metadata (best accuracy)
   * const response = await cohortService.generateColumnDescriptions({
   *   columns: [
   *     { name: "bmi", data_type: "number", sample_values: [22.5, 28.1, 31.2] },
   *     { name: "gender", data_type: "categorical", sample_values: ["Male", "Female"] }
   *   ]
   * });
   */
  async generateColumnDescriptions(
    request: GenerateColumnDescriptionsRequest
  ): Promise<GenerateColumnDescriptionsResponse> {
    return apiClient.post<GenerateColumnDescriptionsResponse>(
      PS.AI_GENERATE_COLUMN_DESCRIPTIONS,
      request,
      { timeout: 60000 } // 60 seconds for AI processing
    )
  },

  // ============ UTILITY METHODS ============

  /**
   * Helper to trigger file download from blob
   */
  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /**
   * Extract unique column names used in a filter
   */
  extractColumnsFromFilter(filter: FilterGroup): string[] {
    const columns = new Set<string>()

    const extractFromRules = (rules: FilterGroup["rules"]) => {
      for (const rule of rules) {
        if ("logic" in rule && "rules" in rule) {
          // Nested group
          extractFromRules((rule as FilterGroup).rules)
        } else if ("field" in rule) {
          // Simple rule
          columns.add(rule.field)
        }
      }
    }

    extractFromRules(filter.rules)
    return Array.from(columns)
  },

  /**
   * Simple CSV parser for client-side data processing
   */
  parseCSV(csvText: string): Record<string, string | number>[] {
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
    const data: Record<string, string | number>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
      const row: Record<string, string | number> = {}

      headers.forEach((header, index) => {
        const value = values[index] || ""
        // Try to parse as number
        const numValue = Number(value)
        row[header] = !isNaN(numValue) && value !== "" ? numValue : value
      })

      data.push(row)
    }

    return data
  },
}

export default cohortService
