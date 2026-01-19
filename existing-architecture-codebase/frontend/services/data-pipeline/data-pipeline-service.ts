import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const BASE_URL = API_CONFIG.DATA_PIPELINE_URL;

// Endpoint constants from centralized config
const ENDPOINTS = API_CONFIG.DATA_LAKE_PLATFORM;

// Types based on OpenAPI spec
export interface S3UploadResponse {
  status: string;
  message: string;
  s3_key: string;
  size: number;
}

export interface S3FileMetadata {
  key: string;
  size: number;
  last_modified: string;
  etag: string;
}

export interface S3FileListResponse {
  total_files: number;
  files: S3FileMetadata[];
}

export interface S3FolderStructureResponse {
  folders: Array<{
    name: string;
    path: string;
  }>;
  files: Array<{
    name: string;
    key: string;
    size: number;
    last_modified: string;
  }>;
}

export interface S3BronzeStructureResponse {
  layer: string;
  path: string;
  total_folders: number;
  total_files: number;
  folders: Array<{
    name: string;
    prefix: string;
  }>;
  files: Array<{
    name: string;
    key: string;
    size: number;
    last_modified: string;
  }>;
}

export interface S3BronzeDatasetResponse {
  dataset_name: string;
  path: string;
  total_folders: number;
  total_files: number;
  folders: Array<{
    name: string;
    prefix: string;
  }>;
  files: Array<{
    name: string;
    key: string;
    size: number;
    last_modified: string;
  }>;
}

export interface ExtractedTextResponse {
  extracted_text: string;
  text_length: number;
  word_count: number;
  filename: string;
}

export interface ConvertToCsvResponse {
  csv_content: string;
  row_count: number;
  column_count: number;
  columns: string[];
  filename: string;
}

export interface IngestFileResponse {
  status: string;
  message: string;
  uploaded_files?: Array<{
    type: string;
    s3_key: string;
    size: number;
  }>;
  total_files?: number;
  // Legacy format support
  original_file?: {
    s3_key: string;
    size: number;
  };
  extracted_text_file?: {
    s3_key: string;
    size: number;
  };
  csv_file?: {
    s3_key: string;
    size: number;
    columns?: string[];
    row_count?: number;
  };
}

export interface SupportedFormatsResponse {
  formats: Record<
    string,
    {
      extensions: string[];
      description: string;
      ocr_enabled: boolean;
    }
  >;
  ocr_available: boolean;
}

export interface TaskResponse {
  task_id: string;
  url: string;
  dataset_name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  progress_percent?: number | null;
  bytes_downloaded?: number | null;
  total_bytes?: number | null;
  error_message?: string | null;
  s3_key?: string | null;
}

export interface CreateTaskRequest {
  url: string;
  dataset_name: string;
  max_workers?: number;
  enable_parallel?: boolean;
  auth_user?: string | null;
  auth_pass?: string | null;
  trial_slug?: string | null;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  total: number;
  limit: number;
  offset: number;
}

// Scrapy Task Response (different from regular TaskResponse)
export interface ScrapyTaskResponse {
  task_id: string;
  spider_type: string;
  url?: string;
  urls?: string;
  dataset_name: string;
  source_name?: string;
  trial_id?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  files_downloaded: number;
  total_bytes?: number | null;
  error_message?: string | null;
  log_output?: string | null;
}

export interface ScrapyTaskListResponse {
  tasks: ScrapyTaskResponse[];
  total: number;
  limit: number;
  offset: number;
}

// Download request interfaces
export interface UrlDownloadRequest {
  urls: string;
  dataset_name: string;
  username?: string;
  password?: string;
  auth_token?: string;
  source_name?: string;
  trial_slug?: string;
  enable_parallel?: boolean;
  max_workers?: number;
}

export interface PhysioNetDownloadRequest {
  dataset_name: string;
  dataset?: string;
  version?: string;
  url?: string;
  username?: string;
  password?: string;
  file_pattern?: string;
  source_name?: string;
  trial_slug?: string;
}

export interface DirectoryDownloadRequest {
  url: string;
  dataset_name: string;
  pattern?: string;
  recursive?: boolean;
  username?: string;
  password?: string;
  auth_token?: string;
  source_name?: string;
  trial_slug?: string;
}

export interface CrawlDownloadRequest {
  url: string;
  dataset_name: string;
  pattern?: string;
  max_depth?: number;
  recursive?: boolean;
  same_domain?: boolean;
  username?: string;
  password?: string;
  auth_token?: string;
  source_name?: string;
  trial_slug?: string;
}

export interface ApiDownloadRequest {
  url: string;
  dataset_name: string;
  pages?: number;
  page_param?: string;
  username?: string;
  password?: string;
  auth_token?: string;
  source_name?: string;
  trial_slug?: string;
}

// =============================================================================
// Multipart Upload Types (for large files 40GB+)
// =============================================================================

export interface MultipartUploadInitiateRequest {
  filename: string;
  content_type: string;
  file_size: number;
  s3_prefix?: string;
  trial_slug?: string;
}

export interface PresignedUrlPart {
  part_number: number;
  presigned_url: string;
}

export interface MultipartUploadInitiateResponse {
  upload_id: string;
  s3_key: string;
  parts: PresignedUrlPart[];
  part_size: number;
  total_parts: number;
}

export interface UploadedPart {
  PartNumber: number;
  ETag: string;
}

export interface MultipartUploadCompleteRequest {
  upload_id: string;
  s3_key: string;
  parts: UploadedPart[];
  original_filename: string;
  file_size: number;
  trial_slug?: string;
}

export interface MultipartUploadCompleteResponse {
  status: string;
  message: string;
  s3_key: string;
  etag: string;
  size: number;
}

export interface MultipartUploadAbortRequest {
  upload_id: string;
  s3_key: string;
}

export interface MultipartUploadAbortResponse {
  status: string;
  message: string;
}

export interface UploadProgressCallback {
  (progress: {
    uploadedParts: number;
    totalParts: number;
    uploadedBytes: number;
    totalBytes: number;
    percentComplete: number;
  }): void;
}

// =============================================================================
// EDA (Exploratory Data Analysis) Types
// =============================================================================

export interface EdaColumnInfo {
  column: string;
  dtype: string;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values?: any[];
}

export interface EdaBasicStats {
  rows: number;
  columns: number;
  memory_usage: string;
  duplicates: number;
}

export interface EdaNumericStats {
  column: string;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  skewness?: number;
  kurtosis?: number;
}

export interface EdaFeatureRanking {
  column: string;
  importance_score: number;
  importance_level: "High" | "Medium" | "Low";
  reasoning: string;
  dtype: string;
  missing_percent: number;
  unique_count: number;
  correlation_with_target?: number;
}

export interface EdaResponse {
  status: string;
  filename: string;
  eda: {
    basic_stats: EdaBasicStats;
    column_info: EdaColumnInfo[];
    numeric_stats?: EdaNumericStats[];
    missing_values: Record<string, number>;
    correlations?: Record<string, Record<string, number>>;
    feature_ranking?: EdaFeatureRanking[];
  };
}

export interface DataQualityIssue {
  column: string;
  issue_type: string;
  severity: "high" | "medium" | "low";
  description: string;
  affected_rows?: number;
}

export interface DataQualityResponse {
  status: string;
  filename: string;
  quality: {
    overall_score: number;
    completeness: number;
    validity: number;
    consistency: number;
    issues: DataQualityIssue[];
    recommendations: string[];
    column_quality: Record<string, {
      score: number;
      issues: string[];
    }>;
  };
}

export interface EdaSummaryResponse {
  filename: string;
  shape: [number, number];
  columns: string[];
  dtypes: Record<string, string>;
  missing: Record<string, number>;
  numeric_summary?: Record<string, EdaNumericStats>;
}

export interface EdaDistributionResponse {
  column: string;
  dtype: string;
  histogram?: {
    bins: number[];
    counts: number[];
  };
  value_counts?: Record<string, number>;
  stats?: EdaNumericStats;
}

export interface EdaOutliersResponse {
  column: string;
  method: string;
  outlier_count: number;
  outlier_indices: number[];
  lower_bound: number;
  upper_bound: number;
  outlier_values: number[];
}

/**
 * Data Pipeline Service
 * Service for interacting with the data pipeline backend API
 */
class DataPipelineService {
  /**
   * Upload a file to S3
   * @param file File to upload
   * @param s3Key Optional custom S3 key
   * @param trialSlug Optional trial slug to associate with the upload
   * @param timeoutMs Optional timeout in milliseconds
   * @returns Upload response with S3 key
   */
  async uploadFile(file: File, s3Key?: string, trialSlug?: string | null, timeoutMs?: number): Promise<S3UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const params: any = {};
    if (s3Key) params.s3_key = s3Key;
    if (trialSlug) params.trial_id = trialSlug;

    // Default timeout is 30 minutes (1800000ms) for large file uploads
    const timeout = timeoutMs ?? 1800000;

    const response = await privateAxios.post<S3UploadResponse>(
      `${BASE_URL}${ENDPOINTS.S3_UPLOAD}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params,
        timeout,
      }
    );

    return response.data;
  }

  /**
   * Ingest file with extraction and S3 upload
   * Complete data pipeline: Extract → Convert → Upload to S3
   * @param file File to ingest
   * @param extractText Whether to extract text
   * @param convertToCsv Whether to convert to CSV
   * @param s3Prefix S3 prefix (bronze/silver/gold)
   * @param trialSlug Optional trial slug to associate with the upload
   * @returns Ingestion response with S3 keys
   */
  async ingestFile(
    file: File,
    extractText: boolean = true,
    convertToCsv: boolean = true,
    s3Prefix: string = "bronze",
    trialSlug?: string | null
  ): Promise<IngestFileResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const params: any = {
      extract_text: extractText,
      convert_to_csv: convertToCsv,
      s3_prefix: s3Prefix,
    };
    if (trialSlug) params.trial_id = trialSlug;

    const response = await privateAxios.post<IngestFileResponse>(
      `${BASE_URL}${ENDPOINTS.INGEST_EXTRACT_AND_UPLOAD}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params,
      }
    );

    return response.data;
  }

  /**
   * Extract text from file (preview only, no S3 upload)
   * @param file File to extract text from
   * @returns Extracted text response
   */
  async extractText(file: File): Promise<ExtractedTextResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await privateAxios.post<ExtractedTextResponse>(
      `${BASE_URL}${ENDPOINTS.INGEST_EXTRACT_TEXT}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  }

  /**
   * Convert file to CSV format
   * @param file File to convert
   * @param returnFile Whether to return downloadable file
   * @returns CSV conversion response
   */
  async convertToCsv(
    file: File,
    returnFile: boolean = false
  ): Promise<ConvertToCsvResponse | Blob> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await privateAxios.post(
      `${BASE_URL}${ENDPOINTS.INGEST_CONVERT_TO_CSV}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params: {
          return_file: returnFile,
        },
        responseType: returnFile ? "blob" : "json",
      }
    );

    return response.data;
  }

  /**
   * List files in S3
   * @param prefix Optional prefix to filter files
   * @returns List of files
   */
  async listS3Files(prefix?: string): Promise<S3FileListResponse> {
    const response = await privateAxios.get<S3FileListResponse>(
      `${BASE_URL}${ENDPOINTS.S3_FILES}`,
      {
        params: { prefix },
      }
    );

    return response.data;
  }

  /**
   * Get S3 folder structure
   * @param prefix Optional prefix
   * @returns Folder structure
   */
  async getS3FolderStructure(
    prefix?: string
  ): Promise<S3FolderStructureResponse> {
    const response = await privateAxios.get<S3FolderStructureResponse>(
      `${BASE_URL}${ENDPOINTS.S3_STRUCTURE}`,
      {
        params: { prefix },
      }
    );

    return response.data;
  }

  /**
   * Get Bronze layer structure
   * Returns folders and files in the bronze layer
   * @returns Bronze layer structure
   */
  async getBronzeStructure(): Promise<S3BronzeStructureResponse> {
    const response = await privateAxios.get<S3BronzeStructureResponse>(
      `${BASE_URL}${ENDPOINTS.S3_BRONZE}`
    );

    return response.data;
  }

  /**
   * Get contents of a specific dataset in the bronze layer
   * Returns subfolders and files within the dataset
   * @param datasetName Name of the dataset folder
   * @returns Dataset structure with subfolders and files
   */
  async getBronzeDataset(datasetName: string): Promise<S3BronzeDatasetResponse> {
    const response = await privateAxios.get<S3BronzeDatasetResponse>(
      `${BASE_URL}${ENDPOINTS.S3_BRONZE_DATASET}/${encodeURIComponent(datasetName)}`
    );

    return response.data;
  }

  /**
   * Get file metadata
   * @param s3Key S3 key of the file
   * @returns File metadata
   */
  async getFileMetadata(s3Key: string): Promise<S3FileMetadata> {
    const response = await privateAxios.get<S3FileMetadata>(
      `${BASE_URL}${ENDPOINTS.S3_FILE_METADATA}`,
      {
        params: { s3_key: s3Key },
      }
    );

    return response.data;
  }

  /**
   * Download file from S3
   * @param s3Key S3 key of the file
   * @param format Optional output format
   * @returns File blob
   */
  async downloadFile(s3Key: string, format?: string): Promise<Blob> {
    const response = await privateAxios.get(`${BASE_URL}${ENDPOINTS.S3_FILE_DOWNLOAD}`, {
      params: {
        s3_key: s3Key,
        format,
      },
      responseType: "blob",
    });

    return response.data;
  }

  /**
   * Delete file from S3
   * @param s3Key S3 key of the file
   * @returns Deletion response
   */
  async deleteFile(s3Key: string): Promise<{ status: string; message: string }> {
    const response = await privateAxios.delete(`${BASE_URL}${ENDPOINTS.S3_FILE_DELETE}`, {
      params: { s3_key: s3Key },
    });

    return response.data;
  }

  /**
   * Get supported file formats
   * @returns Supported formats
   */
  async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    const response = await privateAxios.get<SupportedFormatsResponse>(
      `${BASE_URL}${ENDPOINTS.INGEST_SUPPORTED_FORMATS}`
    );

    return response.data;
  }

  /**
   * Health check for S3 connectivity
   * @returns Health status
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await privateAxios.get(`${BASE_URL}${ENDPOINTS.S3_HEALTH}`);
    return response.data;
  }

  /**
   * Create a task to download data from URL and upload to S3
   * @param request CreateTaskRequest with url and dataset_name
   * @returns Task response with task_id and status
   */
  async createTask(request: CreateTaskRequest): Promise<TaskResponse> {
    const { trial_slug, ...bodyData } = request;

    const params: any = {};
    if (trial_slug) params.trial_id = trial_slug;

    const response = await privateAxios.post<TaskResponse>(
      `${BASE_URL}${ENDPOINTS.TASKS}`,
      bodyData,
      { params }
    );
    return response.data;
  }

  /**
   * Get task status by task_id
   * @param taskId Task ID to check status
   * @returns Task response with current status
   */
  async getTaskStatus(taskId: string): Promise<TaskResponse> {
    const response = await privateAxios.get<TaskResponse>(
      `${BASE_URL}${ENDPOINTS.TASKS}/${taskId}`
    );
    return response.data;
  }

  /**
   * List all tasks with optional filtering
   * @param status Filter by task status (pending, running, completed, failed, cancelled)
   * @param limit Maximum number of tasks to return (default: 100)
   * @param offset Number of tasks to skip (default: 0)
   * @returns Task list response
   */
  async listTasks(
    status?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<TaskListResponse> {
    const response = await privateAxios.get<TaskListResponse>(
      `${BASE_URL}${ENDPOINTS.TASKS}`,
      {
        params: {
          status,
          limit,
          offset,
        },
      }
    );
    return response.data;
  }

  /**
   * Cancel a task
   * @param taskId Task ID to cancel
   * @returns Success response
   */
  async cancelTask(taskId: string): Promise<{ message: string }> {
    const response = await privateAxios.delete(
      `${BASE_URL}${ENDPOINTS.TASKS}/${taskId}`
    );
    return response.data;
  }

  /**
   * Poll task status until completion or failure
   * @param taskId Task ID to poll
   * @param onProgress Callback for progress updates
   * @param pollInterval Polling interval in milliseconds (default: 1000)
   * @returns Final task response
   */
  async pollTaskStatus(
    taskId: string,
    onProgress?: (task: TaskResponse) => void,
    pollInterval: number = 1000
  ): Promise<TaskResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const task = await this.getTaskStatus(taskId);

          // Call progress callback if provided
          if (onProgress) {
            onProgress(task);
          }

          // Check if task is complete
          if (task.status === "completed") {
            resolve(task);
          } else if (task.status === "failed") {
            reject(new Error(task.error_message || "Task failed"));
          } else if (task.status === "cancelled") {
            reject(new Error("Task was cancelled"));
          } else {
            // Continue polling for pending or running status
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Fetch and parse CSV data for preview
   * @param s3Key S3 key of the CSV file
   * @param maxRows Maximum number of rows to return (default: 100)
   * @returns Parsed CSV data with columns and rows
   */
  async fetchCsvPreview(
    s3Key: string,
    maxRows: number = 100
  ): Promise<{ columns: string[]; rows: any[]; totalRows: number }> {
    try {
      // Download the CSV file
      const blob = await this.downloadFile(s3Key);
      const text = await blob.text();

      // Parse CSV
      const lines = text.trim().split('\n');
      if (lines.length === 0) {
        throw new Error('Empty CSV file');
      }

      // Extract headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      // Parse rows
      const rows: any[] = [];
      for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        rows.push(row);
      }

      return {
        columns: headers,
        rows: rows,
        totalRows: lines.length - 1, // Exclude header
      };
    } catch (error) {
      console.error('Error fetching CSV preview:', error);
      throw error;
    }
  }

  // ============================================================================
  // Scrapy Download Methods
  // ============================================================================

  /**
   * Download files from direct URLs
   * @param request UrlDownloadRequest with URLs and dataset info
   * @returns ScrapyTaskResponse with task details
   */
  async downloadFromUrl(request: UrlDownloadRequest): Promise<ScrapyTaskResponse> {
    // Build non-sensitive params as query string
    const params = new URLSearchParams();
    params.append("urls", request.urls);
    params.append("dataset_name", request.dataset_name);
    if (request.source_name) params.append("source_name", request.source_name);
    if (request.trial_slug) params.append("trial_id", request.trial_slug);
    if (request.auth_token) params.append("auth_token", request.auth_token);
    if (request.enable_parallel !== undefined) params.append("enable_parallel", String(request.enable_parallel));
    if (request.max_workers !== undefined) params.append("max_workers", String(request.max_workers));

    // Build headers - use Basic Auth header for credentials (secure)
    const headers: Record<string, string> = {};
    if (request.username && request.password) {
      const credentials = btoa(`${request.username}:${request.password}`);
      headers['X-Download-Auth'] = `Basic ${credentials}`;
    }

    const response = await privateAxios.post<ScrapyTaskResponse>(
      `${BASE_URL}${ENDPOINTS.DOWNLOAD_URL}?${params.toString()}`,
      null,
      { headers, timeout: 120000 } // 2 minute timeout for download initiation
    );
    return response.data;
  }

  /**
   * Download datasets from PhysioNet.org
   * @param request PhysioNetDownloadRequest with dataset info and credentials
   * @returns ScrapyTaskResponse with task details
   */
  async downloadFromPhysioNet(request: PhysioNetDownloadRequest): Promise<ScrapyTaskResponse> {
    // Build request body matching backend schema + include any additional fields if present
    const requestBody: any = {
      dataset_name: request.dataset_name,
      url: request.url || null,
      file_pattern: request.file_pattern || null,
      source_name: request.source_name || "physionet",
      trial_id: request.trial_slug || null,
    };

    // Include optional fields if present
    if (request.dataset) requestBody.dataset = request.dataset;
    if (request.version) requestBody.version = request.version;

    // Include credentials directly in request body (NEW - no more custom headers)
    if (request.username) requestBody.username = request.username;
    if (request.password) requestBody.password = request.password;

    console.log('[PhysioNet Download] Request body:', { ...requestBody, password: requestBody.password ? '***' : null });

    const response = await privateAxios.post<ScrapyTaskResponse>(
      `${BASE_URL}${ENDPOINTS.DOWNLOAD_PHYSIONET}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 // 2 minute timeout for download initiation
      }
    );
    return response.data;
  }

  /**
   * Download files from Apache/Nginx-style directory listings
   * @param request DirectoryDownloadRequest with URL and options
   * @returns ScrapyTaskResponse with task details
   */
  async downloadFromDirectory(request: DirectoryDownloadRequest): Promise<ScrapyTaskResponse> {
    // Build non-sensitive params as query string
    const params = new URLSearchParams();
    params.append("url", request.url);
    params.append("dataset_name", request.dataset_name);
    if (request.pattern) params.append("pattern", request.pattern);
    if (request.recursive !== undefined) params.append("recursive", String(request.recursive));
    if (request.auth_token) params.append("auth_token", request.auth_token);
    if (request.source_name) params.append("source_name", request.source_name);
    if (request.trial_slug) params.append("trial_id", request.trial_slug);

    // Build headers - use custom header for credentials (secure)
    const headers: Record<string, string> = {};
    if (request.username && request.password) {
      const credentials = btoa(`${request.username}:${request.password}`);
      headers['X-Download-Auth'] = `Basic ${credentials}`;
    }

    const response = await privateAxios.post<ScrapyTaskResponse>(
      `${BASE_URL}${ENDPOINTS.DOWNLOAD_DIRECTORY}?${params.toString()}`,
      null,
      { headers, timeout: 120000 } // 2 minute timeout for download initiation
    );
    return response.data;
  }

  /**
   * Crawl a website and download files matching a pattern
   * @param request CrawlDownloadRequest with URL and crawl options
   * @returns ScrapyTaskResponse with task details
   */
  async downloadByCrawling(request: CrawlDownloadRequest): Promise<ScrapyTaskResponse> {
    // Build non-sensitive params as query string
    const params = new URLSearchParams();
    params.append("url", request.url);
    params.append("dataset_name", request.dataset_name);
    if (request.pattern) params.append("pattern", request.pattern);
    if (request.max_depth !== undefined) params.append("max_depth", String(request.max_depth));
    if (request.recursive !== undefined) params.append("recursive", String(request.recursive));
    if (request.same_domain !== undefined) params.append("same_domain", String(request.same_domain));
    if (request.auth_token) params.append("auth_token", request.auth_token);
    if (request.source_name) params.append("source_name", request.source_name);
    if (request.trial_slug) params.append("trial_id", request.trial_slug);

    // Build headers - use custom header for credentials (secure)
    const headers: Record<string, string> = {};
    if (request.username && request.password) {
      const credentials = btoa(`${request.username}:${request.password}`);
      headers['X-Download-Auth'] = `Basic ${credentials}`;
    }

    const response = await privateAxios.post<ScrapyTaskResponse>(
      `${BASE_URL}${ENDPOINTS.DOWNLOAD_CRAWL}?${params.toString()}`,
      null,
      { headers, timeout: 120000 } // 2 minute timeout for download initiation
    );
    return response.data;
  }

  /**
   * Download paginated data from REST APIs
   * @param request ApiDownloadRequest with API endpoint and pagination info
   * @returns ScrapyTaskResponse with task details
   */
  async downloadFromApi(request: ApiDownloadRequest): Promise<ScrapyTaskResponse> {
    // Build non-sensitive params as query string
    const params = new URLSearchParams();
    params.append("url", request.url);
    params.append("dataset_name", request.dataset_name);
    if (request.pages !== undefined) params.append("pages", String(request.pages));
    if (request.page_param) params.append("page_param", request.page_param);
    if (request.auth_token) params.append("auth_token", request.auth_token);
    if (request.source_name) params.append("source_name", request.source_name);
    if (request.trial_slug) params.append("trial_id", request.trial_slug);

    // Build headers - use custom header for credentials (secure)
    const headers: Record<string, string> = {};
    if (request.username && request.password) {
      const credentials = btoa(`${request.username}:${request.password}`);
      headers['X-Download-Auth'] = `Basic ${credentials}`;
    }

    const response = await privateAxios.post<ScrapyTaskResponse>(
      `${BASE_URL}${ENDPOINTS.DOWNLOAD_API}?${params.toString()}`,
      null,
      { headers, timeout: 120000 } // 2 minute timeout for download initiation
    );
    return response.data;
  }

  /**
   * Get scrapy task status by task_id
   * @param taskId Task ID to check status
   * @returns ScrapyTaskResponse with current status
   */
  async getScrapyTaskStatus(taskId: string): Promise<ScrapyTaskResponse> {
    const response = await privateAxios.get<ScrapyTaskResponse>(
      `${BASE_URL}${ENDPOINTS.SCRAPY_TASKS}/${taskId}`,
      { timeout: 60000 } // 1 minute timeout for status checks
    );
    return response.data;
  }

  /**
   * List all scrapy tasks with optional filtering
   * @param status Filter by task status
   * @param spiderType Filter by spider type
   * @param limit Maximum number of tasks to return
   * @param offset Number of tasks to skip
   * @returns ScrapyTaskListResponse
   */
  async listScrapyTasks(
    status?: string,
    spiderType?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ScrapyTaskListResponse> {
    const response = await privateAxios.get<ScrapyTaskListResponse>(
      `${BASE_URL}${ENDPOINTS.SCRAPY_TASKS}`,
      {
        params: {
          status,
          spider_type: spiderType,
          limit,
          offset,
        },
      }
    );
    return response.data;
  }

  /**
   * Poll scrapy task status until completion or failure
   * @param taskId Task ID to poll
   * @param onProgress Callback for progress updates
   * @param pollInterval Polling interval in milliseconds (default: 2000)
   * @returns Final scrapy task response
   */
  async pollScrapyTaskStatus(
    taskId: string,
    onProgress?: (task: ScrapyTaskResponse) => void,
    pollInterval: number = 2000
  ): Promise<ScrapyTaskResponse> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const task = await this.getScrapyTaskStatus(taskId);

          // Call progress callback if provided
          if (onProgress) {
            onProgress(task);
          }

          // Check if task is complete
          if (task.status === "completed") {
            resolve(task);
          } else if (task.status === "failed") {
            reject(new Error(task.error_message || "Task failed"));
          } else if (task.status === "cancelled") {
            reject(new Error("Task was cancelled"));
          } else {
            // Continue polling for pending or running status
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  // ===========================================================================
  // Multipart Upload Methods (for large files 40GB+)
  // ===========================================================================

  /**
   * Threshold for using multipart upload (40GB in bytes)
   */
  static readonly MULTIPART_THRESHOLD = 40 * 1024 * 1024 * 1024; // 40GB

  /**
   * Number of concurrent part uploads
   */
  static readonly CONCURRENT_UPLOADS = 5;

  /**
   * Initiate a multipart upload
   * @param request Request with file details
   * @returns Response with upload_id and presigned URLs for each part
   */
  async initiateMultipartUpload(
    request: MultipartUploadInitiateRequest
  ): Promise<MultipartUploadInitiateResponse> {
    const { trial_slug, ...rest } = request;
    const requestBody: any = { ...rest };
    if (trial_slug) requestBody.trial_id = trial_slug;

    const response = await privateAxios.post<MultipartUploadInitiateResponse>(
      `${BASE_URL}${ENDPOINTS.S3_UPLOAD_INITIATE}`,
      requestBody
    );
    return response.data;
  }

  /**
   * Complete a multipart upload
   * @param request Request with upload_id, s3_key, and parts with ETags
   * @returns Response with final S3 key and etag
   */
  async completeMultipartUpload(
    request: MultipartUploadCompleteRequest
  ): Promise<MultipartUploadCompleteResponse> {
    const { trial_slug, ...rest } = request;
    const requestBody: any = { ...rest };
    if (trial_slug) requestBody.trial_id = trial_slug;

    const response = await privateAxios.post<MultipartUploadCompleteResponse>(
      `${BASE_URL}${ENDPOINTS.S3_UPLOAD_COMPLETE}`,
      requestBody
    );
    return response.data;
  }

  /**
   * Abort a multipart upload
   * @param request Request with upload_id and s3_key
   * @returns Response confirming abort
   */
  async abortMultipartUpload(
    request: MultipartUploadAbortRequest
  ): Promise<MultipartUploadAbortResponse> {
    const response = await privateAxios.post<MultipartUploadAbortResponse>(
      `${BASE_URL}${ENDPOINTS.S3_UPLOAD_ABORT}`,
      request
    );
    return response.data;
  }

  /**
   * Upload a single part to S3 using presigned URL
   * @param presignedUrl Presigned URL for the part
   * @param data Part data (Blob or ArrayBuffer)
   * @returns ETag from S3 response
   */
  async uploadPart(presignedUrl: string, data: Blob | ArrayBuffer): Promise<string> {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: data,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload part: ${response.status} ${response.statusText}`);
    }

    const etag = response.headers.get("ETag");
    if (!etag) {
      throw new Error("No ETag returned from S3");
    }

    return etag;
  }

  /**
   * Upload a large file using multipart upload with progress tracking
   * @param file File to upload
   * @param options Upload options
   * @returns S3 upload response
   */
  async uploadLargeFile(
    file: File,
    options: {
      s3Prefix?: string;
      trialSlug?: string;
      onProgress?: UploadProgressCallback;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<MultipartUploadCompleteResponse> {
    const { s3Prefix = "bronze", trialSlug, onProgress, abortSignal } = options;

    // Step 1: Initiate multipart upload
    const initResponse = await this.initiateMultipartUpload({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      file_size: file.size,
      s3_prefix: s3Prefix,
      trial_slug: trialSlug,
    });

    const { upload_id, s3_key, parts, part_size, total_parts } = initResponse;
    const uploadedParts: UploadedPart[] = [];
    let uploadedBytes = 0;

    try {
      // Step 2: Upload parts in parallel (with concurrency limit)
      const uploadPartWithRetry = async (
        part: PresignedUrlPart,
        retries = 3
      ): Promise<UploadedPart> => {
        // Check for abort
        if (abortSignal?.aborted) {
          throw new Error("Upload aborted");
        }

        const startByte = (part.part_number - 1) * part_size;
        const endByte = Math.min(startByte + part_size, file.size);
        const chunk = file.slice(startByte, endByte);

        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const etag = await this.uploadPart(part.presigned_url, chunk);
            return {
              PartNumber: part.part_number,
              ETag: etag,
            };
          } catch (error) {
            if (attempt === retries - 1) throw error;
            // Wait before retry (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
        throw new Error(`Failed to upload part ${part.part_number} after ${retries} retries`);
      };

      // Process parts in batches for controlled concurrency
      const batchSize = DataPipelineService.CONCURRENT_UPLOADS;
      for (let i = 0; i < parts.length; i += batchSize) {
        // Check for abort
        if (abortSignal?.aborted) {
          throw new Error("Upload aborted");
        }

        const batch = parts.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(uploadPartWithRetry));

        uploadedParts.push(...batchResults);

        // Update progress
        const partsUploaded = uploadedParts.length;
        uploadedBytes = Math.min(partsUploaded * part_size, file.size);

        if (onProgress) {
          onProgress({
            uploadedParts: partsUploaded,
            totalParts: total_parts,
            uploadedBytes,
            totalBytes: file.size,
            percentComplete: Math.round((partsUploaded / total_parts) * 100),
          });
        }
      }

      // Step 3: Complete multipart upload
      const completeResponse = await this.completeMultipartUpload({
        upload_id,
        s3_key,
        parts: uploadedParts,
        original_filename: file.name,
        file_size: file.size,
        trial_slug: trialSlug,
      });

      return completeResponse;
    } catch (error) {
      // Abort the multipart upload on any error
      try {
        await this.abortMultipartUpload({ upload_id, s3_key });
      } catch (abortError) {
        console.error("Failed to abort multipart upload:", abortError);
      }
      throw error;
    }
  }

  /**
   * Smart upload that chooses between simple and multipart upload based on file size
   * @param file File to upload
   * @param options Upload options
   * @returns S3 upload response
   */
  async smartUpload(
    file: File,
    options: {
      s3Key?: string;
      s3Prefix?: string;
      trialSlug?: string;
      onProgress?: UploadProgressCallback;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<S3UploadResponse | MultipartUploadCompleteResponse> {
    // Use multipart upload for files >= 40GB
    if (file.size >= DataPipelineService.MULTIPART_THRESHOLD) {
      return this.uploadLargeFile(file, {
        s3Prefix: options.s3Prefix,
        trialSlug: options.trialSlug,
        onProgress: options.onProgress,
        abortSignal: options.abortSignal,
      });
    }

    // Use simple upload for smaller files
    return this.uploadFile(file, options.s3Key);
  }

  // ===========================================================================
  // EDA (Exploratory Data Analysis) Methods
  // ===========================================================================

  /**
   * Run comprehensive EDA analysis on a file
   * @param file File to analyze (CSV or convertible format)
   * @returns EDA response with all analysis results
   */
  async runEda(file: File): Promise<EdaResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await privateAxios.post<EdaResponse>(
      `${BASE_URL}${ENDPOINTS.EDA_RUN}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  }

  /**
   * Check data quality of a file without running full EDA
   * @param file File to check quality
   * @returns Data quality response with issues and recommendations
   */
  async checkDataQuality(file: File): Promise<DataQualityResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await privateAxios.post<DataQualityResponse>(
      `${BASE_URL}${ENDPOINTS.EDA_DATA_QUALITY}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  }

  /**
   * Upload CSV file for EDA analysis
   * @param file CSV file to upload
   * @returns Upload status and filename
   */
  async uploadCsvForEda(file: File): Promise<{ status: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await privateAxios.post(
      `${BASE_URL}${ENDPOINTS.EDA_UPLOAD_CSV}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  }

  /**
   * Get current uploaded file for EDA
   * @returns Current filename
   */
  async getEdaCurrentFile(): Promise<{ filename: string | null }> {
    const response = await privateAxios.get(`${BASE_URL}${ENDPOINTS.EDA_CURRENT_FILE}`);
    return response.data;
  }

  /**
   * Get EDA summary for an uploaded file
   * @param filename Optional filename (uses current file if not specified)
   * @returns Summary statistics
   */
  async getEdaSummary(filename?: string): Promise<EdaSummaryResponse> {
    const response = await privateAxios.get<EdaSummaryResponse>(
      `${BASE_URL}${ENDPOINTS.EDA_SUMMARY}`,
      {
        params: filename ? { filename } : {},
      }
    );
    return response.data;
  }

  /**
   * Get column information for an uploaded file
   * @param filename Optional filename
   * @returns Column details
   */
  async getEdaColumns(filename?: string): Promise<{ columns: EdaColumnInfo[] }> {
    const response = await privateAxios.get(
      `${BASE_URL}${ENDPOINTS.EDA_COLUMNS}`,
      {
        params: filename ? { filename } : {},
      }
    );
    return response.data;
  }

  /**
   * Get correlation matrix for an uploaded file
   * @param filename Optional filename
   * @returns Correlation data
   */
  async getEdaCorrelation(filename?: string): Promise<{ correlations: Record<string, Record<string, number>> }> {
    const response = await privateAxios.get(
      `${BASE_URL}${ENDPOINTS.EDA_CORR}`,
      {
        params: filename ? { filename } : {},
      }
    );
    return response.data;
  }

  /**
   * Get distribution analysis for a specific column
   * @param filename Filename
   * @param column Column name
   * @returns Distribution data
   */
  async getEdaDistribution(filename: string, column: string): Promise<EdaDistributionResponse> {
    const response = await privateAxios.get<EdaDistributionResponse>(
      `${BASE_URL}${ENDPOINTS.EDA_DISTRIBUTION}`,
      {
        params: { filename, column },
      }
    );
    return response.data;
  }

  /**
   * Get outlier analysis for a specific column
   * @param filename Filename
   * @param column Column name
   * @returns Outlier data
   */
  async getEdaOutliers(filename: string, column: string): Promise<EdaOutliersResponse> {
    const response = await privateAxios.get<EdaOutliersResponse>(
      `${BASE_URL}${ENDPOINTS.EDA_OUTLIERS}`,
      {
        params: { filename, column },
      }
    );
    return response.data;
  }

  /**
   * Get value counts for a specific column
   * @param filename Filename
   * @param column Column name
   * @param topN Number of top values to return (default: 10)
   * @returns Value counts
   */
  async getEdaValueCounts(
    filename: string,
    column: string,
    topN: number = 10
  ): Promise<{ column: string; value_counts: Record<string, number> }> {
    const response = await privateAxios.get(
      `${BASE_URL}${ENDPOINTS.EDA_VALUE_COUNTS}`,
      {
        params: { filename, column, top_n: topN },
      }
    );
    return response.data;
  }

  /**
   * Get histogram data for a numeric column
   * @param filename Filename
   * @param column Column name
   * @param bins Number of bins (default: 30)
   * @returns Histogram data
   */
  async getEdaHistogram(
    filename: string,
    column: string,
    bins: number = 30
  ): Promise<{ column: string; bins: number[]; counts: number[] }> {
    const response = await privateAxios.get(
      `${BASE_URL}${ENDPOINTS.EDA_HIST}`,
      {
        params: { filename, column, bins },
      }
    );
    return response.data;
  }

  /**
   * Get boxplot data for a numeric column
   * @param filename Filename
   * @param column Column name
   * @returns Boxplot statistics
   */
  async getEdaBoxplot(
    filename: string,
    column: string
  ): Promise<{ column: string; q1: number; median: number; q3: number; whisker_low: number; whisker_high: number; outliers: number[] }> {
    const response = await privateAxios.get(
      `${BASE_URL}${ENDPOINTS.EDA_BOXPLOT}`,
      {
        params: { filename, column },
      }
    );
    return response.data;
  }

  /**
   * Get correlation heatmap data
   * @param filename Optional filename
   * @returns Heatmap data
   */
  async getEdaHeatmap(filename?: string): Promise<{ columns: string[]; data: number[][] }> {
    const response = await privateAxios.get(
      `${BASE_URL}${ENDPOINTS.EDA_HEATMAP}`,
      {
        params: filename ? { filename } : {},
      }
    );
    return response.data;
  }
}

// Export singleton instance
export const dataPipelineService = new DataPipelineService();

export default dataPipelineService;
