// src/services/lungCancerTherapySService.ts
import { privateAxios } from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.LUNG_CANCER_THERAPY_S_SERVICE;

// ---------------- Types ----------------

export type ScreenType = "screen-0" | "screen-1" | "screen-2";

export interface LungCancerTherapySPredictionEntry {
  prediction: string; // "Yes" or "No"
  prediction_value: number; // 0 or 1
  confidence?: number; // percentage (0-100)
  confidence_label: string; // "Low" | "Medium" | "High" | "Not Available"
}

export interface LungCancerTherapySPredictionResponse {
  status: string;
  state: string;
  message: string;
  screen_type: ScreenType;
  data: Record<ScreenType, LungCancerTherapySPredictionEntry>;
}

export interface LungCancerTherapySCsvResponseRow {
  row: number;
  prediction?: LungCancerTherapySPredictionEntry;
  error?: string;
}

export interface LungCancerTherapySCsvResponse {
  status: string;
  state: string;
  message: string;
  screen_type: ScreenType;
  data: LungCancerTherapySCsvResponseRow[];
}

export interface LungCancerTherapySFieldMetadata {
  name: string;
  type: string;
  description: string;
  required: boolean;
  options?: { value: number | string; label: string }[];
  min?: number;
  max?: number;
}

export interface LungCancerTherapySFieldsResponse {
  status: string;
  state: string;
  message: string;
  data: LungCancerTherapySFieldMetadata[];
}

export interface LungCancerTherapySampleDataFile {
  file: string;
  count: number;
  data: any[];
}

// ---------------- Service ----------------

const lungCancerTherapySService = {
  // Health Check
  async healthCheck(): Promise<{ status: string }> {
    const res = await privateAxios.get(ENDPOINTS.HEALTH);
    return res.data;
  },

  // Predict single patient
  async predict(
    patientData: Record<string, string | number | boolean | null>,
    project_id: string
  ): Promise<any> {
    return await privateAxios.post<LungCancerTherapySPredictionResponse>(
      ENDPOINTS.PREDICT,
      JSON.parse(JSON.stringify({ patient_data: patientData })),
      {
        headers: { "Content-Type": "application/json" },
        params: { project_id },
      }
    );
  },

  // Predict from CSV
  async predictCsv(
    screenType: ScreenType,
    file: File
  ): Promise<LungCancerTherapySCsvResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await privateAxios.post<LungCancerTherapySCsvResponse>(
      `${ENDPOINTS.PREDICT}/${screenType}/csv`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  // Get prediction fields
  async getFields(): Promise<LungCancerTherapySFieldsResponse> {
    const res = await privateAxios.get<LungCancerTherapySFieldsResponse>(
      ENDPOINTS.PREDICT_FIELDS
    );
    return res.data;
  },

  // Get sample dataset
  async getSampleData(): Promise<any> {
    return await privateAxios.get<LungCancerTherapySampleDataFile[]>(
      ENDPOINTS.PREDICT_SAMPLE_DATA
    );
  },

  // Get chart types
  async getChartTypes(): Promise<any> {
    return await privateAxios.get(ENDPOINTS.CHARTS_TYPES);
  },

  // Get chart statistics
  async getChartStats(): Promise<any> {
    return await privateAxios.get(ENDPOINTS.CHARTS_STATS);
  },

  // Get characteristic charts
  async getCharacteristicCharts(chartTypes?: string): Promise<any> {
    const params = chartTypes ? { chart_types: chartTypes } : {};
    return await privateAxios.get(ENDPOINTS.CHARTS, { params });
  },
};

export default lungCancerTherapySService;
