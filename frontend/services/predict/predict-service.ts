import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const CAR_T_ENDPOINTS = API_CONFIG.CAR_TCELL_SERVICE;
const MONGO_ENDPOINTS = API_CONFIG.MONGO_DATABASE_MANAGER;
const PROJECT_ENDPOINTS = API_CONFIG.PROJECT_MANAGER;

// ----------------- Interfaces -----------------

// generic patient data object
export interface PatientData {
  [key: string]: any;
}

// Prediction models
export interface PredictRequest {
  patient_data: PatientData;
}

export interface Prediction {
  model_name: string;
  prediction: number;
  confidence: number;
  confidence_label: string;
}

export interface PredictResponse {
  status: string;
  state: string;
  message: string;
  data: Prediction[];
}

export interface PredictField {
  name: string;
  type: string;
  required: boolean;
}

// Chart response type
export interface ChartCategory {
  label: string;
  CR: number;
  "PR+NR": number;
}

export interface CharacteristicsChartData {
  "LDH levels"?: ChartCategory[];
  "IPI Score"?: ChartCategory[];
  Age?: ChartCategory[];
  "Primary Mediastinal Y/N"?: ChartCategory[];
  Gender?: ChartCategory[];
  [key: string]: ChartCategory[] | undefined;
}

export interface CharacteristicsChartResponse {
  status: string;
  state: string;
  message: string;
  data: CharacteristicsChartData;
}

export interface ChartTypesResponse {
  status: string;
  state: string;
  message: string;
  data: string[];
}

export interface ChartStats {
  total_data_points: number;
  complete_response_rate: number;
  partial_response_rate: number;
}

export interface ChartStatsResponse {
  status: string;
  state: string;
  message: string;
  data: ChartStats;
}

// Chart response type for legacy charts
export interface ChartData {
  [category: string]: {
    label: string;
    CR: number;
    "PR+NR": number;
  }[];
}

// Patient record types
export interface PatientRecord {
  record_id: string;
  patient_data: PatientData;
  created_at: any[];
  updated_at: any[];
}

export interface UploadResponse {
  status: string;
  message: string;
  data: any[]; // multiple patients from CSV
}

export interface SinglePatientResponse {
  status: string;
  message: string;
  data: any; // single patient JSON
}

export interface PatientListResponse {
  records: any[];
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}

// ----------------- Service -----------------
const predictService = {
  /**
   * Run prediction on patient data (single JSON request)
   */
  async predict(request: PredictRequest, projectId: string): Promise<any> {
    return await privateAxios.post<PredictResponse>(
      CAR_T_ENDPOINTS.PREDICT,
      request,
      {
        params: projectId ? { project_id: projectId } : undefined,
      }
    );
  },

  /**
   * Run prediction with CSV upload
   */
  async predictCsv(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    return await privateAxios.post<PredictResponse>(
      CAR_T_ENDPOINTS.PREDICT_CSV,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  /**
   * Get fields required for prediction
   */
  async getFields(): Promise<any> {
    return await privateAxios.get<PredictField[]>(
      CAR_T_ENDPOINTS.PREDICT_FIELDS
    );
  },

  /**
   * Get chart data (local endpoint for now)
   */
  async getCharts(): Promise<any> {
    return await privateAxios.get<ChartData>(`http://localhost:8000/charts`);
  },

  /**
   * Upload multiple patients via CSV
   */
  async uploadPatientRecord(
    file: File,
    projectId: string,
    trialSlug: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    return await privateAxios.post<UploadResponse>(
      `${MONGO_ENDPOINTS.PATIENT_RECORD}/${projectId}/${trialSlug}/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  /**
   * Create a single patient record via JSON
   */
  async createPatientRecord(
    projectId: string,
    trialSlug: string,
    patientData: PatientData
  ): Promise<any> {
    return await privateAxios.post<any>(
      `${MONGO_ENDPOINTS.PATIENT_RECORD}/${projectId}/${trialSlug}`,
      patientData,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Get all patient records (paginated)
   */
  async getPatientRecords(
    projectId: string,
    trialSlug: string,
    page: number = 0,
    size: number = 10
  ): Promise<any> {
    return await privateAxios.get<PatientListResponse>(
      `${MONGO_ENDPOINTS.PATIENT_RECORD}/${projectId}/${trialSlug}`,
      { params: { page, size } }
    );
  },

  /**
   * Get a single patient record by ID
   */
  async getPatientRecordById(
    projectId: string,
    trialSlug: string,
    recordId: string
  ): Promise<any> {
    return await privateAxios.get<any>(
      `${MONGO_ENDPOINTS.PATIENT_RECORD}/${projectId}/${trialSlug}/${recordId}`
    );
  },

  /**
   * Delete a patient record by ID
   */
  async deletePatientRecord(
    projectId: string,
    trialSlug: string,
    recordId: string
  ): Promise<any> {
    return await privateAxios.delete<{ status: string; message: string }>(
      `${MONGO_ENDPOINTS.PATIENT_RECORD}/${projectId}/${trialSlug}/${recordId}`
    );
  },

  async getAllPatientRecords(
    projectId: string,
    trialSlug: string
  ): Promise<any> {
    return await privateAxios.get<any[]>(
      `${MONGO_ENDPOINTS.PATIENT_RECORD}/${projectId}/${trialSlug}/all`
    );
  },
  async getSamplePatients(): Promise<any> {
    return await privateAxios.get<any[]>(
      CAR_T_ENDPOINTS.PREDICT_SAMPLE_DATA
    );
  },
  async getCharacteristicCharts(chartTypes?: string): Promise<any> {
    return await privateAxios.get<CharacteristicsChartResponse>(
      CAR_T_ENDPOINTS.CHARTS,
      {
        params: chartTypes ? { types: chartTypes } : undefined,
      }
    );
  },
  /**
   * Get available chart types
   */
  async getChartTypes(): Promise<any> {
    return await privateAxios.get<ChartTypesResponse>(
      CAR_T_ENDPOINTS.CHARTS_TYPES
    );
  },
  /**
   * Get overall chart statistics
   */
  async getChartStats(): Promise<any> {
    return await privateAxios.get<ChartStatsResponse>(
      CAR_T_ENDPOINTS.CHARTS_STATS
    );
  },

  /**
   * Get execution records (paginated)
   */
  async getExecutionRecords(
    projectId: string,
    trialSlug: string,
    page: number = 0,
    size: number = 10
  ): Promise<any> {
    return await privateAxios.get<any>(
      `${MONGO_ENDPOINTS.EXECUTION_RECORD}/${projectId}/${trialSlug}/records`,
      {
        params: { page, size },
      }
    );
  },

  /**
   * Get a single execution record by ID
   */
  async getExecutionRecordById(
    projectId: string,
    trialSlug: string,
    executionId: string
  ): Promise<any> {
    return await privateAxios.get<any>(
      `${MONGO_ENDPOINTS.EXECUTION_RECORD}/${projectId}/${trialSlug}/record/${executionId}`
    );
  },

  /**
   * Get a execution shares
   */
  async getExecutionShares(
    projectId: string,
    trialSlug: string,
    auth0Id: string,
    direction: "sent" | "received",
    size?: number,
    page?: number,
    query?: string
  ): Promise<any> {
    return await privateAxios.get<any>(
      `${PROJECT_ENDPOINTS.TRIAL_SHARE}/${projectId}/${trialSlug}/${auth0Id}/${direction}`,
      {
        params: { size, page, query },
      }
    );
  },
  /**
   * share execution with other users
   */
  async shareExecution(
    projectId: string,
    trialSlug: string,
    execution_id: string,
    sender_id: string,
    recipients: string[]
  ): Promise<any> {
    return await privateAxios.post<any>(
      `${PROJECT_ENDPOINTS.TRIAL_SHARE}/${projectId}/${trialSlug}`,
      {
        execution_id,
        sender_id,
        recipients,
      }
    );
  },
};

export default predictService;
