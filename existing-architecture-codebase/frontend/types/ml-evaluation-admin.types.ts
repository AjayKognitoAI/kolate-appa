/**
 * Type definitions for ml-evaluation-service admin API
 * Based on OpenAPI spec: ml-evaluation-service-openapi.json
 */

// ============================================
// Storage Types
// ============================================

export type StorageSourceType = "file_upload" | "s3" | "http" | "filesystem";
export type LoaderType = "pickle" | "joblib" | "cloudpickle";

export interface ModelStorageRequest {
  source_type: StorageSourceType;
  s3_uri?: string;       // Required when source_type = "s3"
  http_url?: string;     // Required when source_type = "http"
  file_path?: string;    // Required when source_type = "filesystem"
  loader_type?: LoaderType;
}

// ============================================
// Confidence Configuration
// ============================================

export type ConfidenceStrategy =
  | "classification_probability"
  | "xgboost_ensemble_variance"
  | "random_forest_tree_variance";

export interface ConfidenceConfigRequest {
  strategy?: ConfidenceStrategy;
  sample_fraction?: number;
}

// ============================================
// Model Types
// ============================================

export type ModelType = "classification" | "regression";
export type ModelFramework = "scikit-learn" | "xgboost" | "lightgbm" | "random_forest";
export type OutputFormatter = "categorical_label" | "numeric" | "rounded_integer";

/**
 * Unified model configuration for the new /admin/models/unified endpoint
 * Handles both file uploads AND URL-based registration
 */
export interface UnifiedModelConfig {
  // Required fields
  model_key: string;           // Alphanumeric with underscores/hyphens
  display_name: string;
  model_type: ModelType;
  model_framework: ModelFramework;
  version: string;             // Semantic version (e.g., "1.0.0")

  // Required for file uploads
  trial_slug?: string;
  module_id?: string;

  // Storage config (required for URL-based, omit for file upload)
  storage?: ModelStorageRequest;

  // Optional configurations
  confidence_config?: ConfidenceConfigRequest;
  response_mapping?: Record<string, string>;
  output_formatter?: OutputFormatter;
  tags?: string[];
  description?: string;

  // BentoML integration options
  auto_reload?: boolean;       // Default: true
  replace_existing?: boolean;  // Default: true
  save_to_bentoml?: boolean;   // Default: true
}

/**
 * @deprecated Use UnifiedModelConfig instead
 */
export interface CreateModelRequest extends UnifiedModelConfig {}

export type ReloadStatus = "reloaded" | "reload_skipped" | "reload_failed";

/**
 * Response from the unified model upload endpoint
 * Based on OpenAPI: UnifiedModelResponse schema
 */
export interface UnifiedModelResponse {
  // Required fields (per OpenAPI spec)
  status: "success" | "partial_success" | "error";
  model_id: string;
  model_key: string;
  message: string;
  storage_type: string;        // Final storage type (s3, filesystem, http)
  storage_location: string;    // Final storage location (S3 URI, path, or URL)
  version: string;             // Model version
  created_at: string;          // ISO timestamp

  // Optional fields
  bento_tag?: string;          // e.g., "trial__module__model_key:v1.0.0"
  bento_framework?: string;    // sklearn, xgboost, lightgbm, picklable
  s3_uri?: string;             // S3 URI if file was uploaded to S3
  file_size_bytes?: number;    // Uploaded file size in bytes
  replaced_model_id?: string;  // ID of deactivated previous model
  reload_status?: ReloadStatus; // Service reload status
}

/**
 * @deprecated Use UnifiedModelResponse instead
 */
export interface CreateModelResponse extends UnifiedModelResponse {}

/**
 * @deprecated Use UnifiedModelConfig instead - the unified endpoint now
 * accepts model_config as a JSON string in FormData
 */
export interface ModelUploadMetadata {
  model_key: string;
  display_name: string;
  model_type: ModelType;
  trial_slug: string;
  module_id: string;
  model_framework?: ModelFramework;
  version?: string;
  loader_type?: LoaderType;
  confidence_strategy?: ConfidenceStrategy;
  sample_fraction?: number;
  response_mapping?: string;
  output_formatter?: OutputFormatter;
  tags?: string;
  auto_reload?: boolean;
}

export interface ModelInfo {
  model_key: string;
  display_name: string;
  model_type: string;
  model_framework?: string;
  version?: string;
  enabled: boolean;
  loaded: boolean;
  is_primary?: boolean;
  display_order?: number;
}

export interface ModelsInfoResponse {
  status: string;
  trial_slug: string;
  models: ModelInfo[];
  message?: string;
}

// ============================================
// Field Metadata Types
// ============================================

export interface FieldValidation {
  required?: boolean;
  min_value?: number;
  max_value?: number;
  allowed_values?: string[];
  pattern?: string;
}

export interface FieldUIConfig {
  display_order?: number;
  group?: string;
  placeholder?: string;
  help_text?: string;
  widget_type?: string;
}

export interface FieldDefinitionRequest {
  name: string;
  type: "number" | "string" | "categorical";
  description: string;
  category: "continuous" | "categorical";
  validation?: FieldValidation;
  ui_config?: FieldUIConfig;
}

export interface CreateFieldMetadataRequest {
  trial_slug: string;
  module_id: string; // NEW REQUIRED FIELD
  version?: number;
  fields: FieldDefinitionRequest[];
}

export interface CreateFieldMetadataResponse {
  status: string;
  metadata_id: string;
  message: string;
}

export interface FieldMetadataResponse {
  status: string;
  state: string;
  message: string;
  data: FieldDefinitionRequest[];
}

// ============================================
// Chart Configuration Types
// ============================================

export interface ChartTypeRequest {
  name: string;
  field: string;
  order: string[];
  normalize_type?: string;
  is_distribution?: boolean;
  custom_grouping?: boolean;
  grouping_type?: string;
  chart_type?: "bar" | "pie" | "donut" | "line" | "area" | "stacked_bar" | "horizontal_bar";
}

export interface ChartConfigRequest {
  enabled?: boolean;
  mongo_collection?: string;
  response_field?: string;
  response_values?: Record<string, string[]>;
  chart_types?: ChartTypeRequest[];
}

// ============================================
// Preprocessing & Service Config Types
// ============================================

export interface PreprocessingConfigRequest {
  requires_one_hot?: boolean;
  missing_value_strategy?: "zero_fill" | "mean" | "median" | "mode" | "drop";
  feature_engineering?: string[];
}

export interface ServiceConfigRequest {
  cache_ttl_seconds?: number;
  batch_prediction_max_rows?: number;
  enable_execution_tracking?: boolean;
}

// ============================================
// Trial/Study Configuration Types
// ============================================

export interface ModelReferenceRequest {
  model_id: string;
  model_key: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface CreateTrialConfigRequest {
  trial_slug: string;
  module_id: string; // REQUIRED - References trial in external service
  models: ModelReferenceRequest[];
  field_metadata_id?: string;
  chart_config?: ChartConfigRequest;
  preprocessing?: PreprocessingConfigRequest;
  service_config?: ServiceConfigRequest;
  tags?: string[];
}

export interface CreateTrialConfigResponse {
  status: string;
  trial_slug: string;
  message: string;
}

export interface DeleteTrialConfigResponse {
  status: string;
  message: string;
}

export interface TrialConfigInfo {
  trial_slug: string;
  module_id: string;
  composite_key: string; // format: "trial_slug:module_id"
  charts_enabled: boolean;
  models_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  field_metadata_id?: string;
  preprocessing?: PreprocessingConfigRequest;
  service_config?: ServiceConfigRequest;
  chart_config?: ChartConfigRequest;
  tags?: string[];
}

export interface TrialInfoNotConfigured {
  exists: false;
  message: string;
}

export interface TrialInfoResponse {
  status: "success" | "not_configured";
  trial_info: TrialConfigInfo | TrialInfoNotConfigured;
}

export interface TrialsListResponse {
  status: string;
  count: number;
  trials: TrialConfigInfo[];
}

// ============================================
// Prediction Types
// ============================================

export interface PredictionResult {
  model_name: string;
  prediction: string | number;
  prediction_label?: string;
  confidence?: number;
  confidence_label?: string;
  error?: string;
}

export interface PredictionResponse {
  status: string;
  state: string;
  message: string;
  execution_id?: string;
  predictions: PredictionResult[];
}

export interface PatientData {
  patient_data: Record<string, any>;
  requested_models?: string[];
}

// ============================================
// Chart Data Types
// ============================================

export interface ChartDataResponse {
  status: string;
  data: Record<string, any[]>;
}

export interface ChartStatisticsResponse {
  status: string;
  statistics: Record<string, any>;
}

// ============================================
// Admin Types
// ============================================

export interface HealthCheckResponse {
  status: string;
}

export interface ServicesStatusResponse {
  [trialSlug: string]: {
    loaded: boolean;
    models_count: number;
    error?: string;
  };
}

export interface CacheClearResponse {
  status: string;
  message: string;
}

// ============================================
// Wizard State Types (Frontend Only)
// ============================================

export interface StudyConfigWizardState {
  studySlug: string;
  moduleId: string; // NEW FIELD
  studyName: string;

  // Step 1: Models
  models: CreateModelRequest[];
  uploadedModelIds: string[];

  // Step 2: Fields
  fieldMetadata: CreateFieldMetadataRequest | null;
  fieldMetadataId: string | null;

  // Step 3: Trial Config
  linkedModels: ModelReferenceRequest[];
  preprocessing: PreprocessingConfigRequest;
  serviceConfig: ServiceConfigRequest;

  // Step 4: Charts
  chartConfig: ChartConfigRequest | null;

  // Wizard state
  currentStep: number;
  completedSteps: number[];
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

export type WizardStep =
  | "models"
  | "fields"
  | "linking"
  | "charts"
  | "preview";

export interface StepConfig {
  id: number;
  key: WizardStep;
  title: string;
  description: string;
  optional?: boolean;
}

// ============================================
// ML Config Status (for Studies Table)
// ============================================

export type MLConfigStatus = "not_configured" | "draft" | "active";

// ============================================
// Composite Key Helper Types
// ============================================

/**
 * Trial identifier that includes both trial_slug and module_id
 * Used for uniquely identifying a trial configuration
 */
export interface TrialIdentifier {
  trialSlug: string;
  moduleId: string;
  compositeKey: string; // format: "trialSlug:moduleId"
}

/**
 * Create a composite key from trial_slug and module_id
 */
export function createCompositeKey(trialSlug: string, moduleId: string): string {
  return `${trialSlug}:${moduleId}`;
}

/**
 * Parse a composite key into trial_slug and module_id
 */
export function parseCompositeKey(compositeKey: string): { trialSlug: string; moduleId: string } {
  const [trialSlug, moduleId] = compositeKey.split(":");
  return { trialSlug, moduleId };
}

/**
 * Create a TrialIdentifier from trial_slug and module_id
 */
export function createTrialIdentifier(trialSlug: string, moduleId: string): TrialIdentifier {
  return {
    trialSlug,
    moduleId,
    compositeKey: createCompositeKey(trialSlug, moduleId),
  };
}

export interface StudyWithMLConfig {
  id: number;
  module_id: number;
  module_name: string;
  slug: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;

  // ML Config fields
  ml_config_status: MLConfigStatus;
  model_count: number;
  last_config_update?: string;
}

// ============================================
// Quick Config Upload Types (JSON Upload)
// ============================================

/**
 * Model configuration for quick setup JSON upload
 * Supports S3, HTTP, or local filesystem storage
 */
export interface QuickConfigModel {
  model_key: string;
  display_name: string;
  model_type: ModelType;
  model_framework: ModelFramework;
  version: string;
  storage: ModelStorageRequest;  // S3, HTTP, or filesystem
  confidence_config?: ConfidenceConfigRequest;
  response_mapping?: Record<string, string>;
  description?: string;
  is_primary?: boolean;
  display_order?: number;
}

/**
 * Complete configuration for quick setup via JSON upload
 * Allows configuring all steps in a single JSON file
 */
export interface QuickConfigUpload {
  models: QuickConfigModel[];
  fields: FieldDefinitionRequest[];
  preprocessing?: PreprocessingConfigRequest;
  service_config?: ServiceConfigRequest;
  chart_config?: ChartConfigRequest;
}
