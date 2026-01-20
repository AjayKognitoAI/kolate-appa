import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

// API Base URL and prefix from centralized config
const BOT_API_BASE_URL = API_CONFIG.BOT_API_URL;
const COPILOT_API_PREFIX = API_CONFIG.PREFIXES.COPILOT;
const ENDPOINTS = API_CONFIG.COPILOT;

console.log("[Copilot] Base URL:", BOT_API_BASE_URL);

const BASE_URL = `${BOT_API_BASE_URL}${COPILOT_API_PREFIX}`;

// Types based on backend OpenAPI
export interface SessionCreate {
  org_id: string;
  user_id?: string | null;
  trial_name?: string | null;
}

export interface SessionResponse {
  session_id: string;
  org_id: string;
  user_id: string | null;
  trial_name?: string | null;
  starred: boolean;
  created_at: string;
  updated_at?: string | null;
  is_active: boolean;
}

export interface ConversationTurn {
  turn: number;
  user_message: string;
  agent_response: string | null;
  agent_type: string | null;
  timestamp: string;
}

export interface AnalysisRequest {
  session_id: string;
  message: string;
  file_paths?: string[] | null;
  trial_name?: string | null;
}

export interface AnalysisResponse {
  response: string;
  session_id: string;
  timestamp: string;
}

export interface UploadFileResponse {
  file_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  upload_timestamp: string;
  analysis?: any;
  message: string;
  status?: string;
}

export interface SessionInfo {
  session_id: string;
  org_id: string;
  user_id: string | null;
  trial_name?: string | null;
  starred: boolean;
  created_at: string;
  updated_at?: string | null;
  is_active: boolean;
  vector_store_count?: number;
  last_activity?: string;
}

export interface SessionListParams {
  org_id: string;
  starred_only?: boolean;
  active_only?: boolean;
  limit?: number;
}

// Trial Types
export interface Trial {
  name: string;
  s3_files: number;
  files_processed: number;
  files_failed: number;
  files_pending: number;
  last_sync: string | null;
}

export interface TrialListResponse {
  trials: Trial[];
  total: number;
}

export interface TrialDetails extends Trial {
  files?: string[];
}

export interface TrialFile {
  file_name: string;
  s3_key: string;
  status: string;
  file_size: number;
  last_modified?: string | null;
  processed_at?: string | null;
  error_message?: string | null;
  analysis_metadata?: any;
}

export interface SchedulerStatus {
  is_running: boolean;
  last_sync?: string;
  next_sync?: string;
  interval_minutes?: number;
}

// SERVICE (matches backend endpoints)
const copilotService = {
  // Create Session
  async createSession(orgId: string, userId?: string | null, trialName?: string | null): Promise<SessionResponse> {
    const payload: SessionCreate = {
      org_id: orgId,
      user_id: userId ?? null,
      trial_name: trialName ?? null,
    };
    const res = await privateAxios.post(`${BASE_URL}${ENDPOINTS.SESSIONS}`, payload, {
      timeout: 600000,
    });
    return res.data;
  },

  // List Sessions
  async listSessions(params: SessionListParams): Promise<SessionResponse[]> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}`, {
      params: {
        org_id: params.org_id,
        starred_only: params.starred_only,
        active_only: params.active_only,
        limit: params.limit,
      },
      timeout: 600000,
    });
    return res.data;
  },

  // Get Session
  async getSession(sessionId: string, orgId?: string): Promise<SessionResponse> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}`, {
      params: orgId ? { org_id: orgId } : undefined,
      timeout: 600000,
    });
    return res.data;
  },

  // Get Session Details (with vector store stats)
  async getSessionDetails(sessionId: string, orgId?: string): Promise<SessionInfo> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/details`, {
      params: orgId ? { org_id: orgId } : undefined,
      timeout: 600000,
    });
    return res.data;
  },

  // Set Starred Status
  async setStarred(sessionId: string, starred: boolean, orgId?: string): Promise<SessionResponse> {
    const res = await privateAxios.patch(
      `${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/star`,
      { starred },
      {
        params: orgId ? { org_id: orgId } : undefined,
        timeout: 600000,
      }
    );
    return res.data;
  },

  // Toggle Starred Status
  async toggleStarred(sessionId: string, orgId?: string): Promise<SessionResponse> {
    const res = await privateAxios.post(
      `${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/star/toggle`,
      {},
      {
        params: orgId ? { org_id: orgId } : undefined,
        timeout: 600000,
      }
    );
    return res.data;
  },

  // Delete Session (Deactivate)
  async deleteSession(sessionId: string, orgId?: string): Promise<any> {
    const res = await privateAxios.delete(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}`, {
      params: orgId ? { org_id: orgId } : undefined,
      timeout: 600000,
    });
    return res.data;
  },

  // Get Session History
  async getSessionHistory(
    sessionId: string,
    limit?: number
  ): Promise<ConversationTurn[]> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/history`, {
      params: limit ? { limit } : undefined,
      timeout: 600000,
    });
    return res.data;
  },

  // Get Vector Store info
  async getSessionVectorStore(sessionId: string): Promise<any> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/vector-store`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Get Session Files
  async getSessionFiles(sessionId: string): Promise<any[]> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/files`, {
      timeout: 600000,
    });
    return res.data;
  },

  // List Session Visualizations
  async listSessionVisualizations(sessionId: string): Promise<string[]> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.SESSIONS}/${sessionId}/visualizations`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Analyze / Chat
  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const res = await privateAxios.post(`${BASE_URL}${ENDPOINTS.ANALYZE}`, request, {
      timeout: 600000,
    });
    return res.data;
  },

  // Upload File
  async uploadFile(
    sessionId: string,
    file: File
  ): Promise<UploadFileResponse> {
    const form = new FormData();
    form.append("file", file);

    const res = await privateAxios.post(`${BASE_URL}${ENDPOINTS.UPLOAD}`, form, {
      params: { session_id: sessionId },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 600000,
    });

    return res.data;
  },

  // Get Visualization Image
  async getVisualization(sessionId: string, filename: string): Promise<Blob> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.VISUALIZATIONS}/${sessionId}/${filename}`, {
      responseType: "blob",
      timeout: 600000,
    });
    return res.data;
  },

  // Visualization URL
  getVisualizationUrl(sessionId: string, filename: string): string {
    return `${BASE_URL}${ENDPOINTS.VISUALIZATIONS}/${sessionId}/${filename}`;
  },

  // Health Check
  async healthCheck(): Promise<any> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.HEALTH}`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Capabilities
  async getCapabilities(): Promise<any> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.CAPABILITIES}`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Root
  async getRoot(): Promise<any> {
    const res = await privateAxios.get(`${BASE_URL}/`, {
      timeout: 600000,
    });
    return res.data;
  },

  // ============ TRIAL ENDPOINTS ============

  // List Available Trials
  async listTrials(): Promise<TrialListResponse> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.TRIALS}`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Get Trial Details
  async getTrialDetails(trialName: string): Promise<TrialDetails> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.TRIALS}/${encodeURIComponent(trialName)}`, {
      timeout: 600000,
    });
    return res.data;
  },

  // List Files in a Trial
  async listTrialFiles(trialName: string): Promise<TrialFile[]> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.TRIALS}/${encodeURIComponent(trialName)}/files`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Trigger Manual Sync
  async syncTrials(): Promise<any> {
    const res = await privateAxios.post(`${BASE_URL}${ENDPOINTS.TRIALS_SYNC}`, {}, {
      timeout: 600000,
    });
    return res.data;
  },

  // Get Scheduler Status
  async getSchedulerStatus(): Promise<SchedulerStatus> {
    const res = await privateAxios.get(`${BASE_URL}${ENDPOINTS.TRIALS_SCHEDULER_STATUS}`, {
      timeout: 600000,
    });
    return res.data;
  },

  // Sync a Specific Trial
  async syncTrial(trialName: string): Promise<any> {
    const res = await privateAxios.post(
      `${BASE_URL}${ENDPOINTS.TRIALS}/${encodeURIComponent(trialName)}/sync`,
      {},
      { timeout: 600000 }
    );
    return res.data;
  },

  // Delete a Trial
  async deleteTrial(trialName: string): Promise<any> {
    const res = await privateAxios.delete(
      `${BASE_URL}${ENDPOINTS.TRIALS}/${encodeURIComponent(trialName)}`,
      { timeout: 600000 }
    );
    return res.data;
  },
};

export default copilotService;
