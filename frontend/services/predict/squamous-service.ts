import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.SCLC_THERAPY_N_SERVICE;

export interface SquamousPredictionEntry {
  prediction: string | number;
  confidence: string;
}

export interface SegregatedAETypesPredictionEntry {
  prediction: Record<string, string>;
  confidence: Record<string, string>;
  overall_confidence?: string;
}

export interface SquamousPrediction {
  objective_response?: SquamousPredictionEntry;
  total_ae?: SquamousPredictionEntry;
  total_sae?: SquamousPredictionEntry;
  segregated_ae_types?: SegregatedAETypesPredictionEntry;
}

export interface SquamousCsvResponseRow {
  row: number;
  predictions: SquamousPrediction;
}

export interface SquamousDirectPredictionData {
  [key: string]: string | number; // flexible to accept all patient fields
}

export interface SquamousFieldMetadata {
  name: string;
  type: string;
  description: string;
  required: boolean;
  options?: { value: number; label: string }[];
  min?: number;
  max?: number;
}

export interface SquamousFieldsResponse {
  data: SquamousFieldMetadata[];
}

export interface SquamousPatientRecord {
  record_id: string;
  patient_data: SquamousDirectPredictionData;
  created_at: string;
  updated_at: string;
}

export interface SquamousUploadResponse {
  status: string;
  message: string;
  data: SquamousPatientRecord[];
}

export interface SquamousSinglePatientResponse {
  status: string;
  message: string;
  data: SquamousPatientRecord;
}

export interface SquamousPatientListResponse {
  records: SquamousPatientRecord[];
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}

type squamousModels =
  | "objective_response"
  | "total_ae"
  | "total_sae"
  | "segregated_ae_types";

const squamousService = {
  // Prediction APIs
  async predictCsv(
    file: File,
    requestedModels: squamousModels[] = [
      "objective_response",
      "total_ae",
      "total_sae",
      "segregated_ae_types",
    ]
  ): Promise<{ data: SquamousCsvResponseRow[] }> {
    const formData = new FormData();
    formData.append("file", file);

    const requested_models = requestedModels.join(",");

    return await privateAxios.post(
      `${ENDPOINTS.PREDICT_CSV}?requested_models=${encodeURIComponent(
        requested_models
      )}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  async predict(
    data: SquamousDirectPredictionData,
    projectId: string,
    requestedModels: squamousModels[] = [
      "objective_response",
      "total_ae",
      "total_sae",
      "segregated_ae_types",
    ]
  ): Promise<{ data: SquamousPrediction }> {
    return await privateAxios.post(
      ENDPOINTS.PREDICT,
      {
        patient_data: data,
        requested_models: requestedModels,
      },
      {
        headers: { "Content-Type": "application/json" },
        params: projectId ? { project_id: projectId } : undefined,
      }
    );
  },

  async getFields(): Promise<SquamousFieldsResponse> {
    const res = await privateAxios.get(
      ENDPOINTS.PREDICT_FIELDS,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  },
  async getSamplePatients(): Promise<any> {
    return await privateAxios.get<any[]>(
      ENDPOINTS.PREDICT_SAMPLE_DATA
    );
  },
};

export default squamousService;
