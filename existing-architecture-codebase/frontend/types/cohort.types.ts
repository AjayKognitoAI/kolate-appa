/**
 * Cohort Types for Patient Enrollment
 *
 * This file contains all type definitions for the patient enrollment cohort feature,
 * including frontend types and API request/response types.
 */

import type { PatientData } from "@/lib/screening-logic"

// ============ ENUMS & BASE TYPES ============

export type ColumnType = "string" | "number" | "categorical" | "date"

// Study status enum
export type StudyStatus = "draft" | "active" | "completed" | "archived"

export type OperatorType =
  | "equals"
  | "not_equals"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_empty"
  | "is_not_empty"
  | "in_cohort"
  | "not_in_cohort"
  // Date operators
  | "on_date"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "between_dates"

export type LogicType = "AND" | "OR"

// ============ FILTER STRUCTURES ============

export interface FilterRule {
  id: string
  field: string
  operator: OperatorType
  value: string | number | null
  value2?: string | number | null // For 'between' operator
  includeMissingData?: boolean // Per-column override for missing data handling (true = include, false = exclude, undefined = use global)
}

export interface FilterGroup {
  id: string
  name?: string
  logic: LogicType
  negate?: boolean
  rules: (FilterRule | FilterGroup)[]
  excludeDirtyData?: boolean  // When true, records with missing/empty values are excluded
}

// Dirty data configuration for handling records with missing/empty values
export interface DirtyDataConfig {
  excludeDirtyData: boolean  // true = exclude records with missing data, false = include them
  columnsToCheck: string[] | 'all'  // which columns to check for empty values
}

// Statistics about dirty/empty data in a dataset
export interface DirtyDataStats {
  totalDirtyRecords: number  // count of records with at least one empty value
  columnStats: Record<string, number>  // count of empty values per column
}

// Type guard to check if a rule is a FilterGroup
export function isFilterGroup(rule: FilterRule | FilterGroup): rule is FilterGroup {
  return "logic" in rule && "rules" in rule
}

// ============ SAVED FILTER ============

// Frontend SavedFilter type
export interface SavedFilter {
  id: string
  name: string
  description: string
  filter: FilterGroup
  isTemplate?: boolean
  usageCount?: number
  createdAt: Date
  updatedAt: Date
}

// API SavedFilter type (from backend)
export interface SavedFilterApi {
  id: string
  name: string
  description: string | null
  filter: FilterGroup
  is_template: boolean
  usage_count: number
  enterprise_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// Create saved filter request
export interface SavedFilterCreateRequest {
  name: string
  description?: string | null
  filter: FilterGroup
  is_template?: boolean
  enterprise_id: string
  user_id: string
  user_name?: string | null
}

// Update saved filter request
export interface SavedFilterUpdateRequest {
  name?: string | null
  description?: string | null
  filter?: FilterGroup | null
  is_template?: boolean | null
}

// Filter list params
export interface FilterListParams {
  enterprise_id: string
  page?: number
  size?: number
  include_templates?: boolean
  search?: string | null
}

// AI Filter Mapping types
export interface ColumnMapping {
  originalField: string
  mappedField: string | null
  confidence: number
  suggestions: string[]
}

export interface FilterMappingRequest {
  filter: FilterGroup
  sourceColumns: string[]
  targetColumns: string[]
}

export interface FilterMappingResponse {
  mappings: ColumnMapping[]
  adaptedFilter: FilterGroup
  unmappedFields: string[]
}

// ============ STUDY TYPES ============

// Study from API
export interface StudyApi {
  id: string
  name: string
  description: string | null
  status: StudyStatus
  study_metadata: Record<string, unknown> | null
  enterprise_id: string
  created_by: string
  created_at: string
  updated_at: string
}

// Study with counts (from GET /studies/{id})
export interface StudyWithCountsApi extends StudyApi {
  master_data_count: number
  cohort_count: number
  total_patients: number
}

// Study create request
export interface StudyCreateRequest {
  name: string
  description?: string | null
  status?: StudyStatus
  study_metadata?: Record<string, unknown> | null
  enterprise_id: string
  user_id: string
  user_name?: string | null
}

// Study update request
export interface StudyUpdateRequest {
  name?: string | null
  description?: string | null
  status?: StudyStatus | null
  study_metadata?: Record<string, unknown> | null
  user_id: string
  user_name?: string | null
}

// Study list params
export interface StudyListParams {
  enterprise_id: string
  page?: number
  size?: number
  sort_by?: "created_at" | "updated_at" | "name" | "status"
  sort_direction?: "asc" | "desc"
  search?: string | null
  status?: StudyStatus | null
}

// ============ COHORT (FRONTEND) ============

export interface Cohort {
  id: string
  name: string
  description: string
  studyId?: string
  patientIds: string[]
  patientCount: number
  masterDataPatientCount?: number
  sourceFilterId?: string
  sourceFilterName?: string
  data: PatientData[]
  columns: Record<string, ColumnType>
  filter: FilterGroup
  createdAt: Date
}

// ============ API TYPES ============

// Column schema as stored in backend
export type ColumnSchema = Record<string, ColumnType>

// API Cohort (from backend)
export interface CohortApi {
  id: string
  name: string
  description: string | null
  study_id: string
  master_data_id: string
  columns: ColumnSchema
  column_mappings?: Record<string, string> | null  // Mappings from filter field names to original column names (e.g., { "age": "actual_age_field" })
  filter_id: string | null
  filter: FilterGroup | null
  inclusion_criteria: string | null  // NEW - Free text inclusion criteria
  exclusion_criteria: string | null  // NEW - Free text exclusion criteria
  filtered_patient_ids: string[] | null
  patient_count: number
  master_data_patient_count: number
  created_at: string
  updated_at: string
  created_by: string
}

// Create cohort request
export interface CohortCreateRequest {
  name: string
  description?: string | null
  study_id: string
  master_data_id: string
  columns: ColumnSchema
  column_mappings?: Record<string, string> | null  // Mappings from filter field names to original column names
  filter_id?: string | null        // Use saved filter
  filter?: FilterGroup | null      // OR provide inline filter
  save_filter_as?: string | null   // If provided, save inline filter with this name
  inclusion_criteria?: string | null  // NEW - Free text inclusion criteria
  exclusion_criteria?: string | null  // NEW - Free text exclusion criteria
  filtered_patient_ids?: string[] | null
  patient_count?: number
  master_data_patient_count?: number
  enterprise_id: string
  user_id: string
  user_name?: string | null
  project_id?: string | null
}

// Update cohort request
export interface CohortUpdateRequest {
  name?: string | null
  description?: string | null
  filter_id?: string | null
  filter?: FilterGroup | null
  inclusion_criteria?: string | null  // NEW - Free text inclusion criteria
  exclusion_criteria?: string | null  // NEW - Free text exclusion criteria
  filtered_patient_ids?: string[] | null
  patient_count?: number | null
  master_data_patient_count?: number | null
  columns?: ColumnSchema | null  // Updated columns schema (when mappings change)
  column_mappings?: Record<string, string> | null  // Updated column mappings
  user_id: string
  user_name?: string | null
}

// List cohorts params
export interface CohortListParams {
  enterprise_id: string
  page?: number
  size?: number
  sort_by?: "created_at" | "updated_at" | "name" | "patient_count"
  sort_direction?: "asc" | "desc"
  search?: string | null
}

// ============ MASTER DATA TYPES ============

export interface MasterDataInfo {
  master_data_id: string
  s3_key?: string
  file_name?: string
  file_size?: number
  row_count?: number
  columns?: ColumnSchema
  patient_id_column?: string | null
  // AI-generated column descriptions with clinical metadata
  column_descriptions?: EnhancedColumnSchema | null
  null_detection?: {
    total_rows: number
    rows_with_nulls: number
    rows_with_nulls_percentage: number
    null_count_by_column: Record<string, number>
    has_nulls: boolean
  }
}

export interface MasterDataUploadResponse {
  status: string
  message?: string | null
  data: MasterDataInfo
}

export interface PresignedUrlData {
  url: string
  expires_at: string
  file_name: string
}

export interface PresignedUrlResponse {
  status: string
  data: PresignedUrlData
}

// ============ COMPARISON TYPES ============

export interface CohortCompareRequest {
  cohort_ids: string[]
}

export interface CohortComparisonItem {
  cohort_id: string
  cohort_name: string
  patient_count: number
  master_patient_count: number
  match_rate: number
  filter_count: number
}

export interface CohortOverlap {
  cohort_ids: string[]
  overlap_count: number
  overlap_percentage: number
  unique_to_first: number
  unique_to_second: number
}

export interface CohortCompareData {
  cohorts: CohortComparisonItem[]
  overlaps: CohortOverlap[]
  total_unique_patients: number
  common_to_all: number
}

export interface CohortCompareResponse {
  status: string
  data: Record<string, unknown>
}

// ============ API RESPONSE WRAPPERS ============

export interface ApiResponse<T> {
  status: string
  message?: string
  data: T
}

export interface PaginatedData<T> {
  content: T[]
  total_elements: number
  page: number
  size: number
  total_pages: number
}

export type CohortResponse = ApiResponse<CohortApi>
export type CohortListResponse = ApiResponse<PaginatedData<CohortApi>>

// Study response types
export type StudyResponse = ApiResponse<StudyApi>
export type StudyWithCountsResponse = ApiResponse<StudyWithCountsApi>
export type StudyListResponse = ApiResponse<PaginatedData<StudyApi>>

// Delete response type matching OpenAPI spec
export interface DeleteResponse {
  status: string
  message: string
}

// Master data types for study
export interface MasterDataApi {
  id: string
  study_id: string
  file_name: string
  s3_key: string
  file_size: number
  row_count: number
  columns: ColumnSchema
  patient_id_column?: string | null
  // AI-generated column descriptions with clinical metadata
  column_descriptions?: EnhancedColumnSchema | null
  enterprise_id: string
  created_by: string
  created_at: string
  updated_at: string
  null_detection?: {
    total_rows: number
    rows_with_nulls: number
    rows_with_nulls_percentage: number
    null_count_by_column: Record<string, number>
    has_nulls: boolean
  }
  // Version tracking fields
  version?: number
  is_edited_version?: boolean
  parent_master_data_id?: string | null
}

export type MasterDataListResponse = ApiResponse<MasterDataApi[]>

// Master data preview/content response
export interface MasterDataPreviewData {
  master_data_id: string
  rows: Record<string, unknown>[]
  total_rows: number
  columns: ColumnSchema
  patient_id_column?: string | null
  column_descriptions?: EnhancedColumnSchema | null
  page?: number
  size?: number
}

export type MasterDataPreviewResponse = ApiResponse<MasterDataPreviewData>

// Merge result response
export interface MergeResultData {
  master_data_id: string
  merged_row_count: number
  columns: ColumnSchema
  source_cohort_patient_count: number
  matched_count: number
  unmatched_count: number
}

export type MergeResultResponse = ApiResponse<MergeResultData>

// ============ UTILITY TYPES ============

// Convert API cohort to frontend cohort (with loaded data)
export interface CohortWithData extends Omit<CohortApi, "created_at" | "updated_at"> {
  data: PatientData[]
  masterData: PatientData[]
  createdAt: Date
  updatedAt: Date
}

// Download format options
export type DownloadFormat = "csv" | "xlsx" | "json"

// Download type options
export type DownloadType = "master" | "screened"

// ============ COHORT PATIENT IDS TYPES ============

// Response for getting all patient IDs from cohorts in a study
export interface CohortPatientIdsData {
  study_id: string
  cohorts: {
    cohort_id: string
    cohort_name: string
    patient_ids: string[]
    patient_count: number
  }[]
  total_unique_patients: number
}

export type CohortPatientIdsResponse = ApiResponse<CohortPatientIdsData>

// ============ SCHEMA VALIDATION TYPES ============

// Criterion to column mapping
export interface CriterionColumnMapping {
  criterion: string
  columns: string[]
  type?: "inclusion" | "exclusion" // Tag from backend indicating criterion type
}

// Schema validation result
export interface SchemaValidationResult {
  isValid: boolean
  missingColumns: string[]
  availableColumns: string[]
  requiredColumns: string[]
  caseMismatchColumns?: Array<{
    required: string
    available: string[]
  }>
  criteria_mapping?: CriterionColumnMapping[]
  // Column mapping suggestions from backend (AI-powered or fuzzy matching)
  // Maps required/missing column names to suggested available column names
  suggestedMappings?: Record<string, string> // e.g., { "age": "patient_age", "bmi": "body_mass_index" }
}

// ============ COLUMN DESCRIPTION TYPES ============

// Column category classification from AI
export type ColumnCategory =
  | "Demographics"
  | "Clinical/Lab Values"
  | "Treatment History"
  | "Safety/Exclusions"
  | "Study-Specific"
  | "Administrative"

// Single column description from AI
export interface ColumnDescription {
  column_name: string
  clinical_description: string
  category: ColumnCategory
  confidence_score: number // 0.0 - 1.0
  abbreviation_expansion: string | null
  unit_of_measure: string | null
  reference_range: string | null
}

// Column metadata input for API request
export interface ColumnMetadataInput {
  name: string
  data_type: string
  sample_values?: (string | number | boolean | null)[]
}

// Generate column descriptions request
export interface GenerateColumnDescriptionsRequest {
  master_data_id?: string
  enterprise_id?: string
  columns?: ColumnMetadataInput[]
  column_names?: string[]
}

// Generate column descriptions response
export interface GenerateColumnDescriptionsResponse {
  status: "success" | "error"
  message: string
  data: {
    descriptions: ColumnDescription[]
    total_columns: number
    master_data_id: string | null
    processing_metadata: {
      input_mode: "master_data" | "columns_with_metadata" | "column_names_only"
      sample_data_available: boolean
    }
  }
}

// Enhanced column metadata with all rich information for each column
// This is the new format to be stored in master data
export interface EnhancedColumnMetadata {
  type: ColumnType
  // AI-generated clinical description
  description?: string | null
  // AI category classification
  category?: ColumnCategory | null
  // AI confidence score (0.0 - 1.0)
  confidence_score?: number | null
  // Abbreviation expansion (e.g., "BMI" -> "Body Mass Index")
  abbreviation_expansion?: string | null
  // Unit of measurement (e.g., "kg/m²", "mg/dL")
  unit_of_measure?: string | null
  // Reference range for clinical values (e.g., "18.5-24.9")
  reference_range?: string | null
  // Sample values from the dataset
  sample_values?: (string | number | boolean | null)[]
  // Count of unique values in this column
  unique_count?: number
  // Count of null/empty values in this column
  null_count?: number
}

// Enhanced column schema - map of column name to its metadata
export type EnhancedColumnSchema = Record<string, EnhancedColumnMetadata>

// Legacy simple column schema (for backwards compatibility)
export interface SimpleColumnSchema {
  type: ColumnType
  description?: ColumnDescription
}

// ============ ACTIVITY TYPES (NEW) ============

// Entity types for activity logs
export type ActivityEntityType = "study" | "master_data" | "cohort" | "filter"

// Activity action types
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "filter_changed"
  | "status_changed"
  | "exported"
  | "compared"

// Activity from API (new schema)
export interface ActivityApi {
  id: string
  study_id: string
  entity_type: ActivityEntityType
  entity_id: string | null
  action: ActivityAction
  description: string
  user_id: string
  user_name: string
  previous_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  activity_metadata: Record<string, unknown> | null
  timestamp: string
}

// Activity list params for GET /studies/{id}/activity
export interface ActivityListParams {
  entity_type?: ActivityEntityType
  entity_id?: string
  limit?: number  // default: 50, max: 100
  offset?: number // default: 0
}

// Activity response
export interface ActivityResponse {
  status: "success"
  data: {
    activities: ActivityApi[]
  }
}

// ============ UNIFIED CRITERIA PROCESSING TYPES ============
// Types for the new POST /ai/process-criteria endpoint

/**
 * Category of criteria for organizing filters in UI
 */
export type CriteriaCategory =
  | "Demographics"
  | "Clinical/Lab Values"
  | "Treatment History"
  | "Safety/Exclusions"
  | "Study-Specific"
  | "Administrative"

/**
 * Type of criteria - inclusion or exclusion
 */
export type CriteriaType = "inclusion" | "exclusion"

/**
 * A single rule within a formula (from AI response)
 * Note: Unlike FilterRule, this doesn't have an 'id' field - IDs are assigned on frontend
 */
export interface FormulaRule {
  field: string
  operator: OperatorType
  value: string | number | null
  value2?: string | number | null // For 'between' operator
}

/**
 * A group of rules with logic operator (from AI response)
 * Note: Unlike FilterGroup, this doesn't have an 'id' field - IDs are assigned on frontend
 */
export interface FormulaGroup {
  logic: "AND" | "OR"
  negate?: boolean
  rules: (FormulaRule | FormulaGroup)[]
}

/**
 * Type guard to check if a formula item is a FormulaGroup
 */
export function isFormulaGroup(item: FormulaRule | FormulaGroup): item is FormulaGroup {
  return "logic" in item && "rules" in item
}

/**
 * A single column suggestion with confidence score
 */
export interface ColumnSuggestion {
  column: string      // Column name from available columns
  confidence: number  // 0-100 (100 = exact match)
}

/**
 * Column suggestions for a field used in a formula
 */
export interface FieldColumnSuggestions {
  field_in_formula: string
  suggestions: ColumnSuggestion[]
}

/**
 * A single sentence/criterion with its formula and column mappings
 * This is the main structure returned by the AI for each IC/EC sentence
 */
export interface CriteriaFormula {
  sentence: string           // Exact user wording preserved
  type: CriteriaType         // "inclusion" or "exclusion"
  category: CriteriaCategory // Category for UI organization
  formula: FormulaRule | FormulaGroup
  column_suggestions: FieldColumnSuggestions[]
  unmapped_concepts: string[]  // Concepts that couldn't be mapped to columns
}

/**
 * Enhanced column metadata format for API request
 */
export interface ColumnMetadata {
  type: ColumnType
  description?: string
  sample_values?: (string | number | boolean | null)[]
  unique_count?: number
  null_count?: number
}

/**
 * Request for POST /ai/process-criteria
 */
export interface UnifiedCriteriaRequest {
  // Column metadata (two formats supported)
  columns: Record<string, string | ColumnMetadata>
  // Natural language criteria text
  inclusion_criteria: string
  exclusion_criteria: string
}

/**
 * Response data for unified criteria processing
 */
export interface UnifiedCriteriaResponseData {
  criteria_formulas: CriteriaFormula[]
  total_sentences: number
  mapped_sentences: number
  unmapped_sentences: number
  columns_used: string[]
  inclusion_criteria: string | null
  exclusion_criteria: string | null
}

/**
 * Response for POST /ai/process-criteria
 */
export interface UnifiedCriteriaResponse {
  status: "success" | "error"
  message: string
  data: UnifiedCriteriaResponseData
}
