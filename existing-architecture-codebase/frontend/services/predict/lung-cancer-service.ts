// src/services/lungCancerService.ts
import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.LUNG_CANCER_SERVICE;

// ---------------- Types ----------------

export type ScreenType = "screen-0" | "screen-1" | "screen-2";

export interface LungCancerPredictionEntry {
  prediction: string; // "Yes" or "No"
  prediction_value: number; // 0 or 1
  confidence?: number; // percentage (0-100)
  confidence_label: string; // "Low" | "Medium" | "High" | "Not Available"
}

export interface LungCancerPredictionResponse {
  status: string;
  state: string;
  message: string;
  screen_type: ScreenType;
  data: Record<ScreenType, LungCancerPredictionEntry>;
}

export interface LungCancerCsvResponseRow {
  row: number;
  prediction?: LungCancerPredictionEntry;
  error?: string;
}

export interface LungCancerCsvResponse {
  status: string;
  state: string;
  message: string;
  screen_type: ScreenType;
  data: LungCancerCsvResponseRow[];
}

export interface LungCancerFieldMetadata {
  name: string;
  type: string;
  description: string;
  required: boolean;
  options?: { value: number | string; label: string }[];
  min?: number;
  max?: number;
}

export interface LungCancerFieldsResponse {
  status: string;
  state: string;
  message: string;
  data: LungCancerFieldMetadata[];
}

export interface LungCancerSampleDataFile {
  file: string;
  count: number;
  data: any[];
}

// ---------------- Service ----------------

const lungCancerService = {
  // Health Check
  async healthCheck(): Promise<{ status: string }> {
    const res = await privateAxios.get(ENDPOINTS.HEALTH);
    return res.data;
  },

  // Predict single patient
  async predict(
    patientData: Record<string, string | number | boolean | null>,
    project_id: string
  ): Promise<LungCancerPredictionResponse> {
    const res = await privateAxios.post<LungCancerPredictionResponse>(
      ENDPOINTS.PREDICT,
      JSON.parse(JSON.stringify({ patient_data: patientData })),
      {
        headers: { "Content-Type": "application/json" },
        params: { project_id },
      }
    );
    return res.data;
  },

  // Predict from CSV
  async predictCsv(
    screenType: ScreenType,
    file: File
  ): Promise<LungCancerCsvResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await privateAxios.post<LungCancerCsvResponse>(
      `${ENDPOINTS.PREDICT}/${screenType}/csv`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  // Get prediction fields
  async getFields(): Promise<LungCancerFieldsResponse> {
    const res = await privateAxios.get<LungCancerFieldsResponse>(
      ENDPOINTS.PREDICT_FIELDS
    );
    return res.data;
  },

  // Get sample dataset
  async getSampleData(): Promise<any> {
    return await privateAxios.get<LungCancerSampleDataFile[]>(
      ENDPOINTS.PREDICT_SAMPLE_DATA
    );
  },
};

export default lungCancerService;
