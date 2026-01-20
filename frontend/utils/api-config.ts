// Centralized API URL configuration
// All API base URLs and endpoints should be defined here

export const API_CONFIG = {
  // Base URLs
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  DATA_PIPELINE_URL: process.env.NEXT_PUBLIC_DATA_PIPELINE_API_URL || process.env.NEXT_PUBLIC_API_URL,
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || "",
  BOT_API_URL: process.env.NEXT_PUBLIC_BOT_API_URL || process.env.NEXT_PUBLIC_API_URL,
  ML_EVAL_URL: process.env.NEXT_PUBLIC_ML_EVAL_API_URL || process.env.NEXT_PUBLIC_API_URL,
  PATIENT_ENROLLMENT_URL: process.env.NEXT_PUBLIC_PATIENT_ENROLLMENT_API_URL || process.env.NEXT_PUBLIC_API_URL,

  // API Prefixes
  PREFIXES: {
    ENTERPRISE_MANAGER: "/api/enterprise-manager/v1",
    DATA_LAKE_PLATFORM: "/api/data-lake-platform/v1",
    PROJECT_MANAGER: "/api/project-manager/v1",
    USER_MANAGER: "/api/user-manager/v1",
    ASSET_MANAGER: "/api/asset-manager/v1",
    CAR_TCELL_SERVICE: "/api/car-tcell-service/v1",
    MONGO_DATABASE_MANAGER: "/api/mongo-database-manager/v1",
    COPILOT: "/api/copilot-data-science-ml-agent/v1",
    EXTERNAL_ENTERPRISE_MANAGER: "/external/enterprise-manager/v1",
    LUNG_CANCER_SERVICE: "/api/lung-cancer-service/v1",
    LUNG_CANCER_THERAPY_S_SERVICE: "/api/lung-cancer-therapy-s-service/v1",
    SCLC_THERAPY_N_SERVICE: "/api/sclc-therapy-n-service/v1",
    PREDICT_TRIAL_SERVICE: "/api/ml-evaluation-service/v1",
    PATIENT_ENROLLMENT: "/api/patient-screening/v1",
  },

  // Enterprise Manager Endpoints (migrated to FastAPI)
  ENTERPRISE_MANAGER: {
    // Organizations - Invite/Onboard endpoints
    ORGANIZATION_INVITE: "/api/v1/enterprises/organization/invite",
    ORGANIZATION_RE_INVITE: "/api/v1/enterprises/organization/re-invite",
    ORGANIZATION_ONBOARD: "/api/v1/enterprises/external/organization/onboard",

    // Enterprises CRUD
    ENTERPRISES: "/api/v1/enterprises",
    ENTERPRISES_SEARCH: "/api/v1/enterprises/search",
    ENTERPRISES_STATS: "/api/v1/enterprises/stats",
    ENTERPRISES_DELETE_REQUEST: "/api/v1/enterprises/delete-request",
    ENTERPRISE_STATISTICS: "/api/v1/enterprises/stats",

    // Onboarding (token-based external endpoints)
    ONBOARDING_PROGRESS: "/api/v1/enterprises",  // /{enterprise_id}/onboarding
    ONBOARDING_EXTERNAL: "/api/v1/enterprises/external/onboarding",  // /{token}
    ONBOARDING_STEP: "/api/v1/enterprises/external/onboarding",  // /{token}/step
    ONBOARDING_COMPLETE: "/api/v1/enterprises/external/onboarding",  // /{token}/complete

    // Trials
    TRIALS: "/api/v1/trials",
    TRIALS_BY_SLUG: "/api/v1/trials/slug",
    TRIALS_BY_MODULE: "/api/v1/trials/module",
    TRIALS_EXISTS_SLUG: "/api/v1/trials/exists/slug",

    // Enterprise Access
    ENTERPRISE_ACCESS: "/api/v1/enterprises",  // /{enterprise_id}/modules
  },

  // Data Lake Platform Endpoints
  DATA_LAKE_PLATFORM: {
    // S3 Operations
    S3_UPLOAD: "/api/data-lake-platform/v1/s3/upload",
    S3_FILES: "/api/data-lake-platform/v1/s3/files",
    S3_STRUCTURE: "/api/data-lake-platform/v1/s3/structure",
    S3_FILE_METADATA: "/api/data-lake-platform/v1/s3/file/metadata",
    S3_FILE_DOWNLOAD: "/api/data-lake-platform/v1/s3/file/download",
    S3_FILE_DELETE: "/api/data-lake-platform/v1/s3/file",
    S3_HEALTH: "/api/data-lake-platform/v1/s3/health",
    S3_BRONZE: "/api/data-lake-platform/v1/s3/bronze",
    S3_BRONZE_DATASET: "/api/data-lake-platform/v1/s3/bronze", // Append /{dataset_name} when calling

    // Multipart Upload (for large files 40GB+)
    S3_UPLOAD_INITIATE: "/api/data-lake-platform/v1/s3/upload/initiate",
    S3_UPLOAD_COMPLETE: "/api/data-lake-platform/v1/s3/upload/complete",
    S3_UPLOAD_ABORT: "/api/data-lake-platform/v1/s3/upload/abort",

    // Ingestion
    INGEST_EXTRACT_AND_UPLOAD: "/api/data-lake-platform/v1/s3/ingest/extract-and-upload",
    INGEST_EXTRACT_TEXT: "/api/data-lake-platform/v1/s3/ingest/extract-text",
    INGEST_CONVERT_TO_CSV: "/api/data-lake-platform/v1/s3/ingest/convert-to-csv",
    INGEST_SUPPORTED_FORMATS: "/api/data-lake-platform/v1/s3/ingest/supported-formats",

    // Tasks
    TASKS: "/api/data-lake-platform/v1/tasks",

    // Scrapy/Download endpoints
    SCRAPY_SPIDERS: "/api/data-lake-platform/v1/scrapy/spiders",
    SCRAPY_TASKS: "/api/data-lake-platform/v1/scrapy/tasks",
    DOWNLOAD_URL: "/api/data-lake-platform/v1/download/url",
    DOWNLOAD_PHYSIONET: "/api/data-lake-platform/v1/download/physionet",
    DOWNLOAD_CRAWL: "/api/data-lake-platform/v1/download/crawl",
    DOWNLOAD_DIRECTORY: "/api/data-lake-platform/v1/download/directory",
    DOWNLOAD_API: "/api/data-lake-platform/v1/download/api",

    // EDA (Exploratory Data Analysis) endpoints
    EDA_UPLOAD_CSV: "/api/data-lake-platform/v1/eda/upload-csv",
    EDA_RUN: "/api/data-lake-platform/v1/eda/run",
    EDA_DATA_QUALITY: "/api/data-lake-platform/v1/eda/data-quality",
    EDA_CURRENT_FILE: "/api/data-lake-platform/v1/eda/current-file",
    EDA_SUMMARY: "/api/data-lake-platform/v1/eda/analysis/summary",
    EDA_COLUMNS: "/api/data-lake-platform/v1/eda/analysis/columns",
    EDA_CORR: "/api/data-lake-platform/v1/eda/analysis/corr",
    EDA_OUTLIERS: "/api/data-lake-platform/v1/eda/analysis/outliers",
    EDA_VALUE_COUNTS: "/api/data-lake-platform/v1/eda/analysis/value-counts",
    EDA_DISTRIBUTION: "/api/data-lake-platform/v1/eda/analysis/distribution",
    EDA_HIST: "/api/data-lake-platform/v1/eda/visualization/hist",
    EDA_BOXPLOT: "/api/data-lake-platform/v1/eda/visualization/boxplot",
    EDA_SCATTER: "/api/data-lake-platform/v1/eda/visualization/scatter",
    EDA_BAR_CHART: "/api/data-lake-platform/v1/eda/visualization/bar-chart",
    EDA_PAIRPLOT: "/api/data-lake-platform/v1/eda/visualization/pairplot",
    EDA_HEATMAP: "/api/data-lake-platform/v1/eda/visualization/heatmap",
  },

  // Project Manager Endpoints (migrated to FastAPI)
  PROJECT_MANAGER: {
    PROJECT: "/api/v1/projects",
    PROJECT_SEARCH: "/api/v1/projects/search",
    PROJECTS_STATISTICS: "/api/v1/projects/stats",
    BOOKMARKS: "/api/v1/bookmarks",
    TRIAL_SHARE: "/api/v1/projects/trial-share",
  },

  // User Manager Endpoints (migrated to FastAPI)
  USER_MANAGER: {
    USER: "/api/v1/users",
    USERS: "/api/v1/users",
    USERS_SEARCH: "/api/v1/users/search",
    USERS_ROLES: "/api/v1/auth/roles",
    USER_INVITE: "/api/v1/auth/organizations",  // /{org_id}/invitations
  },

  // Asset Manager Endpoints
  ASSET_MANAGER: {
    ENTERPRISE_UPLOAD: "/api/asset-manager/v1/enterprise-upload",
  },

  // CAR-T Cell Service Endpoints
  CAR_TCELL_SERVICE: {
    PREDICT: "/api/car-tcell-service/v1/predict",
    PREDICT_CSV: "/api/car-tcell-service/v1/predict/csv",
    PREDICT_FIELDS: "/api/car-tcell-service/v1/predict/fields",
    PREDICT_SAMPLE_DATA: "/api/car-tcell-service/v1/predict/sample-data",
    CHARTS: "/api/car-tcell-service/v1/charts",
    CHARTS_TYPES: "/api/car-tcell-service/v1/charts/types",
    CHARTS_STATS: "/api/car-tcell-service/v1/charts/stats",
  },

  // Mongo Database Manager Endpoints
  MONGO_DATABASE_MANAGER: {
    PATIENT_RECORD: "/api/mongo-database-manager/v1/patient-record",
    EXECUTION_RECORD: "/api/mongo-database-manager/v1/execution-record",
  },

  // Copilot Endpoints (relative to COPILOT prefix)
  COPILOT: {
    SESSIONS: "/sessions",
    ANALYZE: "/analyze",
    UPLOAD: "/upload",
    VISUALIZATIONS: "/visualizations",
    HEALTH: "/health",
    CAPABILITIES: "/capabilities",
    // Trial endpoints
    TRIALS: "/trials",
    TRIALS_SYNC: "/trials/sync",
    TRIALS_SCHEDULER_STATUS: "/trials/scheduler/status",
  },

  // Lung Cancer Service Endpoints
  LUNG_CANCER_SERVICE: {
    HEALTH: "/api/lung-cancer-service/v1/health",
    PREDICT: "/api/lung-cancer-service/v1/predict",
    PREDICT_FIELDS: "/api/lung-cancer-service/v1/predict/fields",
    PREDICT_SAMPLE_DATA: "/api/lung-cancer-service/v1/predict/sample-data",
  },

  // Lung Cancer Therapy S Service Endpoints
  LUNG_CANCER_THERAPY_S_SERVICE: {
    HEALTH: "/api/lung-cancer-therapy-s-service/v1/health",
    PREDICT: "/api/lung-cancer-therapy-s-service/v1/predict",
    PREDICT_FIELDS: "/api/lung-cancer-therapy-s-service/v1/predict/fields",
    PREDICT_SAMPLE_DATA: "/api/lung-cancer-therapy-s-service/v1/predict/sample-data",
    CHARTS: "/api/lung-cancer-therapy-s-service/v1/charts",
    CHARTS_TYPES: "/api/lung-cancer-therapy-s-service/v1/charts/types",
    CHARTS_STATS: "/api/lung-cancer-therapy-s-service/v1/charts/stats",
  },

  // SCLC Therapy N Service Endpoints (Squamous)
  SCLC_THERAPY_N_SERVICE: {
    PREDICT: "/api/sclc-therapy-n-service/v1/predict",
    PREDICT_CSV: "/api/sclc-therapy-n-service/v1/predict/csv",
    PREDICT_FIELDS: "/api/sclc-therapy-n-service/v1/predict/fields",
    PREDICT_SAMPLE_DATA: "/api/sclc-therapy-n-service/v1/predict/sample-data",
  },

  // Patient Enrollment Endpoints
  PATIENT_ENROLLMENT: {
    // Study CRUD
    STUDIES: "/api/patient-screening/v1/studies",
    STUDY_BY_ID: "/api/patient-screening/v1/studies", // Append /{study_id}

    // Study-specific operations
    STUDY_MASTER_DATA: "/api/patient-screening/v1/studies", // Append /{study_id}/master-data
    STUDY_UPLOAD_MASTER_DATA: "/api/patient-screening/v1/studies", // Append /{study_id}/upload-master-data
    STUDY_COHORTS: "/api/patient-screening/v1/studies", // Append /{study_id}/cohorts
    STUDY_COHORT_PATIENT_IDS: "/api/patient-screening/v1/studies", // Append /{study_id}/cohort-patient-ids
    STUDY_MERGE_COHORT: "/api/patient-screening/v1/studies", // Append /{study_id}/merge-cohort

    // Cohort CRUD
    COHORTS: "/api/patient-screening/v1/cohorts",
    COHORT_BY_ID: "/api/patient-screening/v1/cohorts", // Append /{cohort_id}

    // Saved Filters CRUD
    FILTERS: "/api/patient-screening/v1/filters",
    FILTER_BY_ID: "/api/patient-screening/v1/filters", // Append /{filter_id}

    // Master Data Upload (legacy - use STUDY_UPLOAD_MASTER_DATA instead)
    UPLOAD_MASTER_DATA: "/api/patient-screening/v1/cohorts/upload-master-data",

    // Master Data Content/Preview (TODO: Backend endpoint needed)
    MASTER_DATA_BY_ID: "/api/patient-screening/v1/master-data", // Append /{master_data_id}
    MASTER_DATA_PREVIEW: "/api/patient-screening/v1/master-data", // Append /{master_data_id}/preview

    // Comparison
    COMPARE: "/api/patient-screening/v1/cohorts/compare",

    // Activity & Analytics
    // UPDATED: Activity endpoint now uses study-based path instead of cohort-based
    STUDY_ACTIVITY: "/api/patient-screening/v1/studies", // Append /{study_id}/activity
    ANALYTICS: "/api/patient-screening/v1/analytics",

    // Health Check
    HEALTH: "/api/patient-screening/v1/health",

    // AI Filter Generation
    AI_GENERATE_FILTER: "/api/patient-screening/v1/ai/generate-filter",

    // AI Column Description Generation
    AI_GENERATE_COLUMN_DESCRIPTIONS: "/api/patient-screening/v1/ai/generate-column-descriptions",

    // AI Unified Criteria Processing (replaces AI_GENERATE_FILTER and VALIDATE_SCHEMA)
    AI_PROCESS_CRITERIA: "/api/patient-screening/v1/ai/process-criteria",

    // Schema Validation (deprecated - use AI_PROCESS_CRITERIA instead)
    VALIDATE_SCHEMA: "/api/patient-screening/v1/master-data/validate-schema",
  },

  // Predict Trial Service Endpoints (Unified ML Prediction Service)
  // UPDATED: All trial-specific endpoints now use /{trial_slug}/modules/{module_id}/... pattern
  PREDICT_TRIAL_SERVICE: {
    // Admin endpoints (no module_id in path, but may require it in request body)
    ADMIN_MODELS_UNIFIED: "/api/ml-evaluation-service/v1/admin/models/unified",
    ADMIN_TRIALS: "/api/ml-evaluation-service/v1/admin/trials",
    ADMIN_FIELD_METADATA: "/api/ml-evaluation-service/v1/admin/field-metadata",
    ADMIN_HEALTH: "/api/ml-evaluation-service/v1/admin/health",
    ADMIN_SERVICES_STATUS: "/api/ml-evaluation-service/v1/admin/services/status",
    ADMIN_CACHE_CLEAR: "/api/ml-evaluation-service/v1/admin/cache/clear",

    // Trial reload endpoint (uses module_id in path)
    // Pattern: /admin/trials/{trial_slug}/modules/{module_id}/reload
    ADMIN_TRIAL_RELOAD: "/api/ml-evaluation-service/v1/admin/trials",

    // Dynamic endpoints with module_id - NEW PATTERN:
    // /{trial_slug}/modules/{module_id}/predict
    // /{trial_slug}/modules/{module_id}/predict/csv
    // /{trial_slug}/modules/{module_id}/predict/fields
    // /{trial_slug}/modules/{module_id}/models
    // /{trial_slug}/modules/{module_id}/info
    // /{trial_slug}/modules/{module_id}/charts
    // /{trial_slug}/modules/{module_id}/charts/stats
    // /{trial_slug}/modules/{module_id}/charts/add-patients
    //
    // Use buildModuleEndpoint() helper in ml-evaluation-admin-service.ts
  },
} as const;

// Helper function to build endpoint with ID
export const buildEndpoint = (baseEndpoint: string, id: string | number): string => {
  return `${baseEndpoint}/${id}`;
};

// Helper function to get data pipeline URL
export const getDataPipelineUrl = (endpoint: string): string => {
  return `${API_CONFIG.DATA_PIPELINE_URL}${endpoint}`;
};

// Helper function to get copilot full URL
export const getCopilotUrl = (endpoint: string): string => {
  return `${API_CONFIG.BOT_API_URL}${API_CONFIG.PREFIXES.COPILOT}${endpoint}`;
};

// Helper function to get ML evaluation service URL
export const getMlEvalUrl = (endpoint: string): string => {
  return `${API_CONFIG.ML_EVAL_URL}${endpoint}`;
};

// Helper function to get patient enrollment service URL
export const getPatientEnrollmentUrl = (endpoint: string): string => {
  return `${API_CONFIG.PATIENT_ENROLLMENT_URL}${endpoint}`;
};

export default API_CONFIG;
