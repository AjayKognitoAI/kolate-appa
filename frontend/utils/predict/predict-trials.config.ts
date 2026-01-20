import { ComponentType } from "react";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";

export interface ExtraColumn {
  field: string;
  headerName: string;
  width?: number;
}

export interface PredictService {
  getAllPatientRecords: (projectId: string, trialSlug: string) => Promise<any>;
  getExecutionRecords: (projectId: string, trialSlug: string) => Promise<any>;
  predict: (data: any, projectId: string) => Promise<any>;
}

export interface CharacteristicsConfig {
  getCharacteristicCharts: (chartTypes?: string) => Promise<any>;
  getChartStats?: () => Promise<any>;
  getChartTypes?: () => Promise<any>;
  chartKeyMap: Record<string, { id: string; title: string; subtitle?: string }>;
}

// ModalConfig: Configuration for Add Patient Modal
export interface ModalConfig {
  title: string;
  getFields: () => Promise<any>;
  getSamplePatients?: () => Promise<any>;
  reorderData?: (data: Record<string, any>) => Record<string, any>;
  runPrediction: (patient: any, projectId: string) => Promise<any>;
}

// Prediction metric configuration for cards display
export interface PredictionMetric {
  key: string;
  title: string;
  valueField?: "prediction" | "prediction_label";
  showProgressBar?: boolean;
}

// ResultDisplayConfig: Configuration for displaying prediction results
export interface ResultDisplayConfig {
  displayType: "cards" | "donut";
  patientIdField: string;
  patientIdPrefix?: string; // e.g., "Patient " for mask_id display
  ageField: string;
  sexField: string;

  // For 'cards' displayType
  predictionMetrics?: PredictionMetric[];
  dataAccessPattern?: "array" | "object"; // array: result.find(), object: result[key]
  showSegregatedAETable?: boolean;

  // For 'donut' displayType
  screens?: Array<{ key: string; label: string }>;
  riskLabels?: { high: string; low: string };
}

export interface TrialConfig {
  modelName: string;
  trialSlug: string;
  moduleName: string; // Module name identifier (e.g., "default")
  compositeKey?: string; // "trialSlug:moduleName" - computed for convenience
  allowManual?: boolean;
  hasCharacteristics?: boolean;
  extraColumns: ExtraColumn[];
  predictService: PredictService;
  characteristics?: CharacteristicsConfig;
  modalConfig: ModalConfig;
  resultDisplay: ResultDisplayConfig;
}

// Import services
import predictService from "@/services/predict/predict-service";
import squamousService from "@/services/predict/squamous-service";
import lungCancerService from "@/services/predict/lung-cancer-service";
import lungCancerTherapySService from "@/services/predict/lung-cancer-therapy-s-service";

// Import reorder utilities
import { LungCancerRiskPatientReorder } from "@/utils/predict/LungCancerRiskPatientReorder";
import { LungCancerTherapySPatientReorder } from "@/utils/predict/LungCancerTherapySPatientReorder";

export const TRIAL_CONFIGS: Record<string, TrialConfig> = {
  "car-t-cell-therapy-b:default": {
    modelName: "CAR T-Cell Therapy B",
    trialSlug: "car-t-cell-therapy-b",
    moduleName: "default",
    compositeKey: "car-t-cell-therapy-b:default",
    allowManual: true,
    hasCharacteristics: true,
    extraColumns: [
      { field: "diagnosis", headerName: "Diagnosis", width: 300 },
      { field: "stage", headerName: "Stage" },
      { field: "ps", headerName: "PS" },
      { field: "ipi", headerName: "IPI" },
      { field: "ipig", headerName: "IPIG" },
      { field: "bestresp", headerName: "Best Response" },
      { field: "ldh_ipi", headerName: "LDH IPI" },
      { field: "ethnic_id", headerName: "Ethnicity" },
      { field: "race_id", headerName: "Race" },
    ],
    predictService: {
      getAllPatientRecords: predictService.getAllPatientRecords,
      getExecutionRecords: predictService.getExecutionRecords,
      predict: async (patientData, projectId) =>
        predictService.predict({ patient_data: patientData }, projectId),
    },
    modalConfig: {
      title: "Add new patient profile",
      getFields: async () => (await predictService.getFields()).data?.data,
      getSamplePatients: async () =>
        (await predictService.getSamplePatients()).data || [],
      runPrediction: async (patient, projectId) =>
        (await predictService.predict({ patient_data: patient }, projectId)).data,
    },
    resultDisplay: {
      displayType: "cards",
      patientIdField: "patid",
      ageField: "ptage",
      sexField: "sex_id",
      dataAccessPattern: "array",
      predictionMetrics: [
        { key: "obj_response", title: "Objective Response", showProgressBar: true },
        { key: "total_ae", title: "Total Adverse Events", showProgressBar: true },
        { key: "total_sae", title: "Total Serious Adverse Events", showProgressBar: true },
        { key: "gr_345", title: "Grade≥3 Adverse Events", showProgressBar: true },
        { key: "total_nes", title: "Total Neurological Events", showProgressBar: true },
      ],
    },
    characteristics: {
      getCharacteristicCharts: predictService.getCharacteristicCharts,
      getChartStats: predictService.getChartStats,
      getChartTypes: predictService.getChartTypes,
      chartKeyMap: {
        "LDH levels": {
          id: "ldh",
          title: "LDH Levels Analysis",
          subtitle:
            "Lactate dehydrogenase biomarker correlation with treatment outcomes",
        },
        "IPI Score": {
          id: "ipi",
          title: "IPI Score Distribution",
          subtitle:
            "International Prognostic Index correlation with patient outcomes",
        },
        Age: {
          id: "age",
          title: "Age Group Analysis",
          subtitle: "Treatment response rates across different age demographics",
        },
        "Primary Mediastinal Y/N": {
          id: "mediastinal",
          title: "Primary Mediastinal Y/N",
          subtitle:
            "Indicates whether the lymphoma is primary mediastinal and correlation with treatment outcomes",
        },
        Gender: {
          id: "gender",
          title: "Gender",
          subtitle:
            "Distribution of patient gender and their correlation with treatment outcomes",
        },
      },
    },
  },
  "lung-cancer-risk:default": {
    modelName: "Lung cancer risk prediction",
    trialSlug: "lung-cancer-risk",
    moduleName: "default",
    compositeKey: "lung-cancer-risk:default",
    allowManual: false,
    hasCharacteristics: false,
    extraColumns: [
      { field: "Smoking_History", headerName: "Smoking History" },
      { field: "Years_Smoked", headerName: "Years Smoked" },
      {
        field: "Family_History_Cancer",
        headerName: "Family History of Cancer",
      },
      { field: "Occupation", headerName: "Occupation" },
      { field: "Exposure_to_Toxins", headerName: "Exposure to Toxins" },
      { field: "Residential_Area", headerName: "Residential Area" },
      { field: "BMI", headerName: "BMI" },
      { field: "Chest_Pain_Symptoms", headerName: "Chest Pain Symptoms" },
      { field: "Shortness_of_Breath", headerName: "Shortness of Breath" },
      { field: "Chronic_Cough", headerName: "Chronic Cough" },
      { field: "Weight_Loss", headerName: "Weight Loss" },
      {
        field: "Physical_Activity_Level",
        headerName: "Physical Activity Level",
      },
      { field: "Dietary_Habits", headerName: "Dietary Habits" },
      { field: "Air_Quality_Index", headerName: "Air Quality Index" },
      { field: "Leukocytes", headerName: "Leukocytes" },
      { field: "Alkaline_Phosphatase", headerName: "Alkaline Phosphatase" },
      { field: "Blood_Urea_Nitrogen", headerName: "Blood Urea Nitrogen" },
      { field: "Erythrocytes", headerName: "Erythrocytes" },
    ],
    predictService: {
      getAllPatientRecords: predictService.getAllPatientRecords,
      getExecutionRecords: predictService.getExecutionRecords,
      predict: lungCancerService.predict,
    },
    modalConfig: {
      title: "Add new lung cancer risk profile",
      getFields: async () => (await lungCancerService.getFields()).data,
      getSamplePatients: async () => (await lungCancerService.getSampleData())?.data || [],
      reorderData: LungCancerRiskPatientReorder.reorder,
      runPrediction: async (patient, projectId) =>
        lungCancerService.predict(patient, projectId),
    },
    resultDisplay: {
      displayType: "donut",
      patientIdField: "Patient_ID",
      ageField: "Age",
      sexField: "Gender",
      screens: [
        { key: "screen-0", label: "Screen - 0" },
        { key: "screen-1", label: "Screen - 1" },
        { key: "screen-2", label: "Screen - 2" },
      ],
    },
  },
  "squamous-lung-therapy-n:default": {
    modelName: "Squamous Lung Therapy N",
    trialSlug: "squamous-lung-therapy-n",
    moduleName: "default",
    compositeKey: "squamous-lung-therapy-n:default",
    allowManual: false,
    hasCharacteristics: false,
    extraColumns: [
      { field: "ALTPATID", headerName: "Patient ID" },
      { field: "DERIVED_RACE", headerName: "Race" },
      { field: "SEX", headerName: "Sex" },
      { field: "HISPANIC", headerName: "Hispanic" },
      { field: "STRAT_TRMT", headerName: "Strat Treatment" },
      { field: "CIGHIST1", headerName: "Smoking History" },
      { field: "P6WTLOSS", headerName: "Weight Loss" },
      { field: "ZUBRODPS", headerName: "Performance Status" },
      { field: "ARMNAME", headerName: "Treatment Arm" },
      { field: "RESP4", headerName: "Best Response" },
      { field: "age_cat", headerName: "Age" },
    ],
    predictService: {
      getAllPatientRecords: predictService.getAllPatientRecords,
      getExecutionRecords: predictService.getExecutionRecords,
      predict: squamousService.predict,
    },
    modalConfig: {
      title: "Add new squamous profile",
      getFields: async () => (await predictService.getFields()).data?.data,
      getSamplePatients: async () => (await squamousService.getSamplePatients()).data || [],
      runPrediction: async (patient, projectId) =>
        (await squamousService.predict(patient, projectId)).data,
    },
    resultDisplay: {
      displayType: "cards",
      patientIdField: "ALTPATID",
      ageField: "age_cat",
      sexField: "SEX",
      dataAccessPattern: "object",
      showSegregatedAETable: true,
      predictionMetrics: [
        { key: "objective_response", title: "Objective Response" },
        { key: "total_ae", title: "Total Adverse Events" },
        { key: "total_sae", title: "Total Serious Adverse Events" },
      ],
    },
  },
  "lung-cancer-therapy-s:default": {
    modelName: "Lung Cancer Therapy S",
    trialSlug: "lung-cancer-therapy-s",
    moduleName: "default",
    compositeKey: "lung-cancer-therapy-s:default",
    allowManual: true,
    hasCharacteristics: true,
    extraColumns: [
      { field: "Patient_ID", headerName: "Patient ID" },
      { field: "Age", headerName: "Age" },
      { field: "Gender", headerName: "Gender" },
      { field: "Smoking_History", headerName: "Smoking History" },
      { field: "Years_Smoked", headerName: "Years Smoked" },
      {
        field: "Family_History_Cancer",
        headerName: "Family History of Cancer",
      },
      { field: "Occupation", headerName: "Occupation" },
      { field: "Exposure_to_Toxins", headerName: "Exposure to Toxins" },
      { field: "Residential_Area", headerName: "Residential Area" },
      { field: "BMI", headerName: "BMI" },
      { field: "Chest_Pain_Symptoms", headerName: "Chest Pain Symptoms" },
      { field: "Shortness_of_Breath", headerName: "Shortness of Breath" },
      { field: "Chronic_Cough", headerName: "Chronic Cough" },
      { field: "Weight_Loss", headerName: "Weight Loss" },
      {
        field: "Physical_Activity_Level",
        headerName: "Physical Activity Level",
      },
      { field: "Dietary_Habits", headerName: "Dietary Habits" },
      { field: "Air_Quality_Index", headerName: "Air Quality Index" },
      { field: "Leukocytes", headerName: "Leukocytes" },
      { field: "Alkaline_Phosphatase", headerName: "Alkaline Phosphatase" },
      { field: "Blood_Urea_Nitrogen", headerName: "Blood Urea Nitrogen" },
      { field: "Erythrocytes", headerName: "Erythrocytes" },
    ],
    predictService: {
      getAllPatientRecords: predictService.getAllPatientRecords,
      getExecutionRecords: predictService.getExecutionRecords,
      predict: lungCancerTherapySService.predict,
    },
    modalConfig: {
      title: "Add new lung cancer therapy S profile",
      getFields: async () => (await lungCancerTherapySService.getFields()).data,
      getSamplePatients: async () =>
        (await lungCancerTherapySService.getSampleData())?.data || [],
      reorderData: LungCancerTherapySPatientReorder.reorder,
      runPrediction: async (patient, projectId) =>
        (await lungCancerTherapySService.predict(patient, projectId)).data,
    },
    resultDisplay: {
      displayType: "cards",
      patientIdField: "mask_id",
      patientIdPrefix: "Patient ",
      ageField: "agecat",
      sexField: "sex",
      dataAccessPattern: "array",
      predictionMetrics: [
        { key: "Objective Response", title: "Objective Response", valueField: "prediction_label", showProgressBar: true },
        { key: "Total Adverse Events", title: "Total Adverse Events", valueField: "prediction_label", showProgressBar: true },
        { key: "Total Serious Adverse Events", title: "Total Serious Adverse Events", valueField: "prediction_label", showProgressBar: true },
        { key: "Overall Survival (months)", title: "Overall Survival (months)", valueField: "prediction_label", showProgressBar: true },
      ],
    },
    characteristics: {
      getCharacteristicCharts: lungCancerTherapySService.getCharacteristicCharts,
      getChartStats: lungCancerTherapySService.getChartStats,
      getChartTypes: lungCancerTherapySService.getChartTypes,
      chartKeyMap: {
        "Overall Response Distribution": {
          id: "overall_response",
          title: "Overall Response Distribution",
          subtitle: "Distribution of overall treatment response rates",
        },
        "Age Distribution": {
          id: "age",
          title: "Age Distribution",
          subtitle: "Treatment response rates across different age demographics",
        },
        "Gender Distribution": {
          id: "gender",
          title: "Gender Distribution",
          subtitle:
            "Distribution of patient gender and correlation with treatment outcomes",
        },
        "Performance Status": {
          id: "performance",
          title: "Performance Status",
          subtitle: "ECOG or Karnofsky performance status assessment",
        },
        "Race/Ethnicity": {
          id: "race",
          title: "Race/Ethnicity",
          subtitle: "Patient race and ethnicity distribution",
        },
        "Prophylactic Cranial Irradiation": {
          id: "pci",
          title: "Prophylactic Cranial Irradiation",
          subtitle: "Distribution of patients receiving PCI",
        },
        "Chemotherapy Stratification": {
          id: "chemo",
          title: "Chemotherapy Stratification",
          subtitle: "Chemotherapy regimen stratification patterns",
        },
        "Cycle Maintenance": {
          id: "cycle",
          title: "Cycle Maintenance",
          subtitle: "Treatment cycle maintenance analysis",
        },
      },
    },
  },
};

// Cache for dynamically loaded configs
const dynamicConfigCache: Record<string, TrialConfig> = {};

/**
 * Build a TrialConfig from API response data
 * This converts the backend trial config format to the frontend TrialConfig format
 */
function buildDynamicTrialConfig(trialSlug: string, moduleName: string, trialInfo: any): TrialConfig {
  const { trial_name, models = [], field_metadata, chart_config } = trialInfo;
  // Ensure moduleName is lowercase for API calls
  const moduleNameLower = moduleName.toLowerCase();
  const compositeKey = `${trialSlug}:${moduleNameLower}`;

  // Find primary model for display
  const primaryModel = models.find((m: any) => m.is_primary) || models[0];

  // Build extra columns from field metadata
  const extraColumns: ExtraColumn[] = (field_metadata?.fields || [])
    .filter((f: any) => f.ui_config?.show_in_table !== false)
    .slice(0, 12) // Limit to first 12 fields for table display
    .map((f: any) => ({
      field: f.name,
      headerName: f.ui_config?.display_name || f.name,
      width: f.ui_config?.width,
    }));

  // Build prediction metrics from models
  const predictionMetrics: PredictionMetric[] = models.map((m: any) => ({
    key: m.model_key,
    title: m.display_name || m.model_key,
    showProgressBar: true,
  }));

  // Find patient ID, age, and sex fields from metadata
  const fields = field_metadata?.fields || [];
  const patientIdField = fields.find((f: any) =>
    f.name.toLowerCase().includes("patid") ||
    f.name.toLowerCase().includes("patient_id") ||
    f.name.toLowerCase() === "id"
  )?.name || fields[0]?.name || "id";

  const ageField = fields.find((f: any) =>
    f.name.toLowerCase().includes("age")
  )?.name || "age";

  const sexField = fields.find((f: any) =>
    f.name.toLowerCase().includes("sex") ||
    f.name.toLowerCase().includes("gender")
  )?.name || "sex";

  // Build characteristics config if chart_config is enabled
  let characteristics: CharacteristicsConfig | undefined;
  if (chart_config?.enabled) {
    const chartKeyMap: Record<string, { id: string; title: string; subtitle?: string }> = {};
    (chart_config.chart_types || []).forEach((ct: any) => {
      chartKeyMap[ct.name] = {
        id: ct.key,
        title: ct.name,
        subtitle: ct.description,
      };
    });

    characteristics = {
      getCharacteristicCharts: async (chartTypes?: string) =>
        mlEvaluationAdminService.getChartData(trialSlug, moduleNameLower),
      getChartStats: async () =>
        mlEvaluationAdminService.getChartStats(trialSlug, moduleNameLower),
      chartKeyMap,
    };
  }

  return {
    modelName: trial_name || trialSlug,
    trialSlug,
    moduleName: moduleNameLower,
    compositeKey,
    allowManual: true,
    hasCharacteristics: chart_config?.enabled || false,
    extraColumns,
    predictService: {
      getAllPatientRecords: predictService.getAllPatientRecords,
      getExecutionRecords: predictService.getExecutionRecords,
      predict: async (data: any, projectId: string) =>
        mlEvaluationAdminService.testPredict(trialSlug, moduleNameLower, data, projectId),
    },
    modalConfig: {
      title: `Add new ${trial_name || trialSlug} profile`,
      getFields: async () => {
        const response = await mlEvaluationAdminService.getFieldMetadata(trialSlug, moduleNameLower);
        return response.data || [];
      },
      runPrediction: async (patient: any, projectId: string) =>
        mlEvaluationAdminService.testPredict(trialSlug, moduleNameLower, patient, projectId),
    },
    resultDisplay: {
      displayType: "cards",
      patientIdField,
      ageField,
      sexField,
      dataAccessPattern: "array",
      predictionMetrics,
    },
    characteristics,
  };
}

/**
 * Get trial configuration dynamically
 * @param trialSlug Trial identifier
 * @param moduleName Module name identifier
 * 1. First checks static TRIAL_CONFIGS for existing trials using composite key
 * 2. Then checks cache for previously loaded dynamic configs
 * 3. Finally tries to load from API if not found
 * 4. Returns null if trial not configured
 */
export async function getTrialConfig(trialSlug: string, moduleName: string): Promise<TrialConfig | null> {
  // Ensure moduleName is lowercase for API calls
  const moduleNameLower = moduleName.toLowerCase();
  const compositeKey = `${trialSlug}:${moduleNameLower}`;

  // 1. Check static configs first using composite key
  if (TRIAL_CONFIGS[compositeKey]) {
    return TRIAL_CONFIGS[compositeKey];
  }

  // 2. Check cache
  if (dynamicConfigCache[compositeKey]) {
    return dynamicConfigCache[compositeKey];
  }

  // 3. Try to load from API
  try {
    const response = await mlEvaluationAdminService.getTrialInfo(trialSlug, moduleNameLower);
    if (response.status === "success" && response.trial_info) {
      const config = buildDynamicTrialConfig(trialSlug, moduleName, response.trial_info);
      dynamicConfigCache[compositeKey] = config;
      return config;
    }
  } catch (error) {
    console.warn(`Failed to load dynamic config for trial ${compositeKey}:`, error);
  }

  // 4. Not found
  return null;
}

/**
 * Get trial config by composite key (convenience method)
 * @param compositeKey Format: "trialSlug:moduleName"
 */
export async function getTrialConfigByCompositeKey(compositeKey: string): Promise<TrialConfig | null> {
  const [trialSlug, moduleName] = compositeKey.split(":");
  if (!trialSlug || !moduleName) {
    console.warn(`Invalid composite key format: ${compositeKey}`);
    return null;
  }
  return getTrialConfig(trialSlug, moduleName);
}

/**
 * Check if a trial has configuration (static or dynamic)
 * @param trialSlug Trial identifier
 * @param moduleName Module name identifier
 */
export async function hasTrialConfig(trialSlug: string, moduleName: string): Promise<boolean> {
  // Ensure moduleName is lowercase for API calls
  const moduleNameLower = moduleName.toLowerCase();
  const compositeKey = `${trialSlug}:${moduleNameLower}`;

  // Check static first
  if (TRIAL_CONFIGS[compositeKey]) {
    return true;
  }

  // Check API
  try {
    const hasConfig = await mlEvaluationAdminService.hasMLConfig(trialSlug, moduleNameLower);
    return hasConfig;
  } catch {
    return false;
  }
}

/**
 * Clear the dynamic config cache
 * Useful after a trial configuration is updated
 */
export function clearDynamicConfigCache(trialSlug?: string): void {
  if (trialSlug) {
    delete dynamicConfigCache[trialSlug];
  } else {
    Object.keys(dynamicConfigCache).forEach((key) => {
      delete dynamicConfigCache[key];
    });
  }
}
