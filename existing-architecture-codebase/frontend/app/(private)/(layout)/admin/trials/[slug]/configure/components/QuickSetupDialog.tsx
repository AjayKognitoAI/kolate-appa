"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Paper,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";
import {
  IconUpload,
  IconFileCode,
  IconCheck,
  IconX,
  IconDownload,
  IconChevronDown,
  IconChevronUp,
  IconPlayerPlay,
  IconBrain,
  IconForms,
  IconLink,
  IconRocket,
  IconClipboard,
} from "@tabler/icons-react";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import type {
  QuickConfigUpload,
  QuickConfigModel,
  UnifiedModelConfig,
  CreateTrialConfigRequest,
  FieldDefinitionRequest,
} from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";

interface QuickSetupDialogProps {
  open: boolean;
  onClose: () => void;
  studySlug: string;
  moduleId: string;
  studyName: string;
}

interface FileSelectionRequest {
  modelKey: string;
  displayName: string;
  filePath: string;
}

// Processing steps
const PROCESSING_STEPS = [
  { label: "Upload Models", icon: <IconBrain size={18} /> },
  { label: "Create Field Metadata", icon: <IconForms size={18} /> },
  { label: "Create Trial Config", icon: <IconLink size={18} /> },
  { label: "Activate", icon: <IconRocket size={18} /> },
];

// Sample JSON template
const SAMPLE_CONFIG: QuickConfigUpload = {
  models: [
    {
      model_key: "obj_response",
      display_name: "Objective Response Predictor",
      model_type: "classification",
      model_framework: "xgboost",
      version: "1.0.0",
      storage: {
        source_type: "s3",
        s3_uri: "s3://your-bucket/models/obj_response.pkl",
        // Alternative: use local filesystem
        // source_type: "filesystem",
        // file_path: "/path/to/local/model.pkl",
      },
      confidence_config: {
        strategy: "classification_probability",
        sample_fraction: 0.2,
      },
      response_mapping: {
        "0": "Complete Response",
        "1": "Partial Response",
        "2": "No Response",
      },
      is_primary: true,
    },
  ],
  fields: [
    {
      name: "age",
      type: "number",
      description: "Patient age in years",
      category: "continuous",
      validation: {
        required: true,
        min_value: 0,
        max_value: 120,
      },
      ui_config: {
        group: "Demographics",
        display_order: 1,
      },
    },
    {
      name: "stage",
      type: "categorical",
      description: "Disease stage",
      category: "categorical",
      validation: {
        required: true,
        allowed_values: ["I", "II", "III", "IV"],
      },
      ui_config: {
        group: "Clinical",
        display_order: 2,
      },
    },
  ],
  preprocessing: {
    requires_one_hot: true,
    missing_value_strategy: "zero_fill",
  },
  service_config: {
    cache_ttl_seconds: 300,
    batch_prediction_max_rows: 1000,
    enable_execution_tracking: true,
  },
  chart_config: {
    enabled: true,
    mongo_collection: "patient_data",
    response_field: "bestrespg",
    response_values: {
      "Responders": ["CR", "PR"],
      "Non-Responders": ["SD", "PD"]
    },
    chart_types: [
      {
        name: "Age Distribution",
        field: "age",
        chart_type: "bar",
        order: ["<30", "30-50", "50-70", ">70"],
        is_distribution: true,
        custom_grouping: true,
        grouping_type: "age"
      },
      {
        name: "Stage Distribution",
        field: "stage",
        chart_type: "pie",
        order: ["I", "II", "III", "IV"],
        is_distribution: true
      }
    ]
  },
};

export default function QuickSetupDialog({
  open,
  onClose,
  studySlug,
  moduleId,
  studyName,
}: QuickSetupDialogProps) {
  const router = useRouter();

  // State
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState<string>("");
  const [config, setConfig] = useState<QuickConfigUpload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showSampleJson, setShowSampleJson] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // File selection for filesystem models
  const [filesystemModels, setFilesystemModels] = useState<FileSelectionRequest[]>([]);
  const [selectedModelFiles, setSelectedModelFiles] = useState<Map<string, File>>(new Map());
  const [showFileSelection, setShowFileSelection] = useState(false);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepProgress, setStepProgress] = useState<string>("");
  const [processError, setProcessError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  // Validation with detailed error messages
  const validateConfig = (data: any): { valid: boolean; error?: string; details?: string[] } => {
    const errors: string[] = [];

    // Basic structure check
    if (!data || typeof data !== "object") {
      return { valid: false, error: "Invalid JSON structure - expected an object", details: ["The uploaded file does not contain valid JSON"] };
    }

    // ============================================
    // Validate Models
    // ============================================
    if (!data.models) {
      errors.push("Missing 'models' array - at least one model is required");
    } else if (!Array.isArray(data.models)) {
      errors.push("'models' must be an array");
    } else if (data.models.length === 0) {
      errors.push("At least one model is required in the 'models' array");
    } else {
      const modelKeys = new Set<string>();
      const validFrameworks = ["scikit-learn", "xgboost", "lightgbm", "random_forest"];
      const validModelTypes = ["classification", "regression"];
      const validStorageTypes = ["s3", "http", "filesystem"];

      for (let i = 0; i < data.models.length; i++) {
        const model = data.models[i];
        const modelLabel = model.model_key ? `"${model.model_key}"` : `#${i + 1}`;

        // Required fields
        if (!model.model_key || typeof model.model_key !== "string") {
          errors.push(`Model ${modelLabel}: 'model_key' is required (string, lowercase, underscores allowed)`);
        } else {
          if (!/^[a-z0-9_]+$/.test(model.model_key)) {
            errors.push(`Model ${modelLabel}: 'model_key' must be lowercase letters, numbers, and underscores only`);
          }
          if (modelKeys.has(model.model_key)) {
            errors.push(`Duplicate model_key: "${model.model_key}" - each model must have a unique key`);
          }
          modelKeys.add(model.model_key);
        }

        if (!model.display_name || typeof model.display_name !== "string") {
          errors.push(`Model ${modelLabel}: 'display_name' is required (user-friendly name)`);
        }

        if (!model.model_type) {
          errors.push(`Model ${modelLabel}: 'model_type' is required`);
        } else if (!validModelTypes.includes(model.model_type)) {
          errors.push(`Model ${modelLabel}: 'model_type' must be one of: ${validModelTypes.join(", ")} (got: "${model.model_type}")`);
        }

        if (!model.model_framework) {
          errors.push(`Model ${modelLabel}: 'model_framework' is required`);
        } else if (!validFrameworks.includes(model.model_framework)) {
          errors.push(`Model ${modelLabel}: 'model_framework' must be one of: ${validFrameworks.join(", ")} (got: "${model.model_framework}")`);
        }

        if (!model.version || typeof model.version !== "string") {
          errors.push(`Model ${modelLabel}: 'version' is required (e.g., "1.0.0")`);
        }

        // Storage validation
        if (!model.storage) {
          errors.push(`Model ${modelLabel}: 'storage' configuration is required`);
        } else if (typeof model.storage !== "object") {
          errors.push(`Model ${modelLabel}: 'storage' must be an object`);
        } else {
          if (!model.storage.source_type) {
            errors.push(`Model ${modelLabel}: 'storage.source_type' is required`);
          } else if (!validStorageTypes.includes(model.storage.source_type)) {
            errors.push(`Model ${modelLabel}: 'storage.source_type' must be "s3", "http", or "filesystem" (got: "${model.storage.source_type}")`);
          } else {
            if (model.storage.source_type === "s3") {
              if (!model.storage.s3_uri || typeof model.storage.s3_uri !== "string") {
                errors.push(`Model ${modelLabel}: 's3_uri' is required when source_type is "s3"`);
              } else if (!model.storage.s3_uri.startsWith("s3://")) {
                errors.push(`Model ${modelLabel}: 's3_uri' must start with "s3://" (got: "${model.storage.s3_uri}")`);
              }
            }
            if (model.storage.source_type === "http") {
              if (!model.storage.http_url || typeof model.storage.http_url !== "string") {
                errors.push(`Model ${modelLabel}: 'http_url' is required when source_type is "http"`);
              } else if (!model.storage.http_url.startsWith("http://") && !model.storage.http_url.startsWith("https://")) {
                errors.push(`Model ${modelLabel}: 'http_url' must be a valid HTTP/HTTPS URL`);
              }
            }
            if (model.storage.source_type === "filesystem") {
              if (!model.storage.file_path || typeof model.storage.file_path !== "string") {
                errors.push(`Model ${modelLabel}: 'file_path' is required when source_type is "filesystem"`);
              } else if (model.storage.file_path.trim() === "") {
                errors.push(`Model ${modelLabel}: 'file_path' cannot be empty`);
              } else {
                const filePath = model.storage.file_path.trim();
                // Check if path looks like a valid file path (basic validation)
                if (!filePath.includes('/') && !filePath.includes('\\')) {
                  errors.push(`Model ${modelLabel}: 'file_path' should be an absolute path (e.g., "/path/to/model.pkl" or "C:\\path\\to\\model.pkl")`);
                }
                // Check for common model file extensions
                const validExtensions = ['.pkl', '.joblib', '.pickle', '.h5', '.pt', '.pth', '.model', '.bin'];
                const hasValidExtension = validExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
                if (!hasValidExtension) {
                  // This is a warning, not an error - still allow it but inform the user
                  console.warn(`Model ${modelLabel}: file_path "${filePath}" doesn't have a common model extension (${validExtensions.join(', ')})`);
                }
              }
            }

            // Validate loader_type if present (optional field)
            if (model.storage.loader_type) {
              const validLoaderTypes = ["pickle", "joblib", "cloudpickle"];
              if (!validLoaderTypes.includes(model.storage.loader_type)) {
                errors.push(`Model ${modelLabel}: 'storage.loader_type' must be one of: ${validLoaderTypes.join(", ")} (got: "${model.storage.loader_type}")`);
              }
            }
          }
        }

        // Optional but validated if present
        if (model.confidence_config) {
          const validStrategies = ["classification_probability", "xgboost_ensemble_variance", "random_forest_tree_variance"];
          if (model.confidence_config.strategy && !validStrategies.includes(model.confidence_config.strategy)) {
            errors.push(`Model ${modelLabel}: 'confidence_config.strategy' must be one of: ${validStrategies.join(", ")}`);
          }
          if (model.confidence_config.sample_fraction !== undefined) {
            const sf = model.confidence_config.sample_fraction;
            if (typeof sf !== "number" || sf < 0 || sf > 1) {
              errors.push(`Model ${modelLabel}: 'confidence_config.sample_fraction' must be a number between 0 and 1`);
            }
          }
        }

        if (model.response_mapping && typeof model.response_mapping !== "object") {
          errors.push(`Model ${modelLabel}: 'response_mapping' must be an object (e.g., {"0": "Label A", "1": "Label B"})`);
        }
      }
    }

    // ============================================
    // Validate Fields
    // ============================================
    if (!data.fields) {
      errors.push("Missing 'fields' array - at least one field is required");
    } else if (!Array.isArray(data.fields)) {
      errors.push("'fields' must be an array");
    } else if (data.fields.length === 0) {
      errors.push("At least one field is required in the 'fields' array");
    } else {
      const fieldNames = new Set<string>();
      const validFieldTypes = ["number", "string", "categorical"];
      const validCategories = ["continuous", "categorical"];

      for (let i = 0; i < data.fields.length; i++) {
        const field = data.fields[i];
        const fieldLabel = field.name ? `"${field.name}"` : `#${i + 1}`;

        if (!field.name || typeof field.name !== "string") {
          errors.push(`Field ${fieldLabel}: 'name' is required (must match training data column name)`);
        } else {
          if (fieldNames.has(field.name)) {
            errors.push(`Duplicate field name: "${field.name}" - each field must have a unique name`);
          }
          fieldNames.add(field.name);
        }

        if (!field.type) {
          errors.push(`Field ${fieldLabel}: 'type' is required`);
        } else if (!validFieldTypes.includes(field.type)) {
          errors.push(`Field ${fieldLabel}: 'type' must be one of: ${validFieldTypes.join(", ")} (got: "${field.type}")`);
        }

        if (!field.category) {
          errors.push(`Field ${fieldLabel}: 'category' is required`);
        } else if (!validCategories.includes(field.category)) {
          errors.push(`Field ${fieldLabel}: 'category' must be one of: ${validCategories.join(", ")} (got: "${field.category}")`);
        }

        // Validate categorical fields have allowed_values
        if (field.type === "categorical" || field.category === "categorical") {
          if (!field.validation?.allowed_values || !Array.isArray(field.validation.allowed_values) || field.validation.allowed_values.length === 0) {
            errors.push(`Field ${fieldLabel}: categorical fields should have 'validation.allowed_values' array`);
          }
        }

        // Validate number fields have sensible validation
        if (field.type === "number" && field.validation) {
          if (field.validation.min_value !== undefined && typeof field.validation.min_value !== "number") {
            errors.push(`Field ${fieldLabel}: 'validation.min_value' must be a number`);
          }
          if (field.validation.max_value !== undefined && typeof field.validation.max_value !== "number") {
            errors.push(`Field ${fieldLabel}: 'validation.max_value' must be a number`);
          }
          if (field.validation.min_value !== undefined && field.validation.max_value !== undefined) {
            if (field.validation.min_value > field.validation.max_value) {
              errors.push(`Field ${fieldLabel}: 'min_value' cannot be greater than 'max_value'`);
            }
          }
        }
      }
    }

    // ============================================
    // Validate Optional Sections
    // ============================================
    if (data.preprocessing) {
      const validMissingStrategies = ["zero_fill", "mean", "median", "mode", "drop"];
      if (data.preprocessing.missing_value_strategy && !validMissingStrategies.includes(data.preprocessing.missing_value_strategy)) {
        errors.push(`'preprocessing.missing_value_strategy' must be one of: ${validMissingStrategies.join(", ")}`);
      }
    }

    if (data.service_config) {
      if (data.service_config.cache_ttl_seconds !== undefined && (typeof data.service_config.cache_ttl_seconds !== "number" || data.service_config.cache_ttl_seconds < 0)) {
        errors.push("'service_config.cache_ttl_seconds' must be a positive number");
      }
      if (data.service_config.batch_prediction_max_rows !== undefined && (typeof data.service_config.batch_prediction_max_rows !== "number" || data.service_config.batch_prediction_max_rows < 1)) {
        errors.push("'service_config.batch_prediction_max_rows' must be a positive number");
      }
    }

    // ============================================
    // Validate Chart Config (Optional)
    // ============================================
    if (data.chart_config) {
      if (typeof data.chart_config !== "object") {
        errors.push("'chart_config' must be an object");
      } else {
        // If charts are enabled, validate required fields
        if (data.chart_config.enabled === true) {
          if (!data.chart_config.mongo_collection || typeof data.chart_config.mongo_collection !== "string") {
            errors.push("'chart_config.mongo_collection' is required when charts are enabled");
          }

          if (!data.chart_config.response_field || typeof data.chart_config.response_field !== "string") {
            errors.push("'chart_config.response_field' is required when charts are enabled (e.g., 'bestrespg')");
          }

          // Validate chart_types array
          if (data.chart_config.chart_types) {
            if (!Array.isArray(data.chart_config.chart_types)) {
              errors.push("'chart_config.chart_types' must be an array");
            } else if (data.chart_config.chart_types.length === 0) {
              errors.push("'chart_config.chart_types' should have at least one chart when charts are enabled");
            } else {
              const validChartTypes = ["bar", "pie", "donut", "line", "area", "stacked_bar", "horizontal_bar"];

              for (let i = 0; i < data.chart_config.chart_types.length; i++) {
                const chart = data.chart_config.chart_types[i];
                const chartLabel = chart.name ? `"${chart.name}"` : `#${i + 1}`;

                if (!chart.name || typeof chart.name !== "string") {
                  errors.push(`Chart ${chartLabel}: 'name' is required (chart title)`);
                }

                if (!chart.field || typeof chart.field !== "string") {
                  errors.push(`Chart ${chartLabel}: 'field' is required (data field to visualize)`);
                }

                if (chart.chart_type && !validChartTypes.includes(chart.chart_type)) {
                  errors.push(`Chart ${chartLabel}: 'chart_type' must be one of: ${validChartTypes.join(", ")} (got: "${chart.chart_type}")`);
                }

                if (chart.order !== undefined) {
                  if (!Array.isArray(chart.order)) {
                    errors.push(`Chart ${chartLabel}: 'order' must be an array of strings for category ordering`);
                  } else if (chart.order.some((o: any) => typeof o !== "string")) {
                    errors.push(`Chart ${chartLabel}: 'order' array must contain only strings`);
                  }
                }

                if (chart.grouping_type !== undefined && typeof chart.grouping_type !== "string") {
                  errors.push(`Chart ${chartLabel}: 'grouping_type' must be a string (e.g., "age", "range")`);
                }
              }
            }
          }

          // Validate response_values if present
          if (data.chart_config.response_values) {
            if (typeof data.chart_config.response_values !== "object") {
              errors.push("'chart_config.response_values' must be an object mapping response names to arrays");
            } else {
              for (const [key, value] of Object.entries(data.chart_config.response_values)) {
                if (!Array.isArray(value)) {
                  errors.push(`'chart_config.response_values.${key}' must be an array of values`);
                }
              }
            }
          }
        }
      }
    }

    // Return result
    if (errors.length > 0) {
      return {
        valid: false,
        error: `Found ${errors.length} validation error(s)`,
        details: errors,
      };
    }

    return { valid: true };
  };

  // File handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setParseError(null);
    setValidationErrors([]);
    setConfig(null);
    setProcessError(null);
    setShowValidationDetails(false);

    if (!selectedFile.name.endsWith(".json")) {
      setParseError("Please upload a .json file");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const validation = validateConfig(data);
        if (!validation.valid) {
          setParseError(validation.error || "Invalid configuration");
          setValidationErrors(validation.details || []);
          setShowValidationDetails(true);
          return;
        }

        // Check for filesystem models
        const fsModels: FileSelectionRequest[] = [];
        if (data.models && Array.isArray(data.models)) {
          for (const model of data.models) {
            if (model.storage?.source_type === "filesystem" && model.storage?.file_path) {
              fsModels.push({
                modelKey: model.model_key,
                displayName: model.display_name,
                filePath: model.storage.file_path,
              });
            }
          }
        }

        setConfig(data as QuickConfigUpload);
        setFilesystemModels(fsModels);

        // If there are filesystem models, show file selection prompt
        if (fsModels.length > 0) {
          setShowFileSelection(true);
          setSelectedModelFiles(new Map()); // Reset selections
        }
      } catch (err) {
        setParseError("Invalid JSON format - check for syntax errors");
        setValidationErrors([
          "The file does not contain valid JSON",
          "Common issues: missing commas, trailing commas, unquoted keys, single quotes instead of double quotes"
        ]);
        setShowValidationDetails(true);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Download sample JSON
  const handleDownloadSample = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_CONFIG, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${studySlug}-config-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Process configuration
  const handleProcess = async () => {
    if (!config) return;

    setProcessing(true);
    setProcessError(null);
    setCurrentStep(0);

    try {
      // Step 1: Upload all models
      setStepProgress(`Uploading models (0/${config.models.length})`);
      const uploadedModelIds: string[] = [];

      for (let i = 0; i < config.models.length; i++) {
        const model = config.models[i];
        setStepProgress(`Uploading models (${i}/${config.models.length}): ${model.display_name}`);

        let modelFile: File | undefined = undefined;
        let storageConfig: typeof model.storage | undefined = model.storage;

        // Handle filesystem storage: use the selected file
        if (model.storage.source_type === "filesystem" && model.storage.file_path) {
          // Get the file that the user selected for this model
          const selectedFile = selectedModelFiles.get(model.model_key);
          if (!selectedFile) {
            throw new Error(`No file selected for model: ${model.display_name} (${model.model_key})`);
          }
          modelFile = selectedFile;
          // For file uploads, we don't send storage config
          storageConfig = undefined;
        }

        const modelConfig: UnifiedModelConfig = {
          model_key: model.model_key,
          display_name: model.display_name,
          model_type: model.model_type,
          model_framework: model.model_framework,
          version: model.version,
          ...(storageConfig && { storage: storageConfig }),
          confidence_config: model.confidence_config,
          response_mapping: model.response_mapping,
          description: model.description,
          save_to_bentoml: true,
          auto_reload: false, // Delay reload until the end
          replace_existing: true,
          trial_slug: studySlug,
          module_id: moduleId,
        };

        const response = await mlEvaluationAdminService.uploadModelUnified(modelConfig, modelFile);
        uploadedModelIds.push(response.model_id);
      }
      setStepProgress(`Uploaded ${config.models.length} models`);

      // Step 2: Create field metadata
      setCurrentStep(1);
      setStepProgress("Creating field metadata...");

      const fieldMetadataResponse = await mlEvaluationAdminService.createFieldMetadata({
        trial_slug: studySlug,
        module_id: moduleId,
        version: 1,
        fields: config.fields,
      });
      setStepProgress("Field metadata created");

      // Step 3: Create trial config
      setCurrentStep(2);
      setStepProgress("Creating trial configuration...");

      const trialConfig: CreateTrialConfigRequest = {
        trial_slug: studySlug,
        module_id: moduleId,
        models: config.models.map((m, i) => ({
          model_id: uploadedModelIds[i],
          model_key: m.model_key,
          is_primary: m.is_primary ?? (i === 0),
          display_order: m.display_order ?? (i + 1),
        })),
        field_metadata_id: fieldMetadataResponse.metadata_id,
        preprocessing: config.preprocessing,
        service_config: config.service_config,
        chart_config: config.chart_config,
      };

      await mlEvaluationAdminService.createTrialConfig(trialConfig);
      setStepProgress("Trial configuration created");

      // Step 4: Reload/Activate
      setCurrentStep(3);
      setStepProgress("Activating trial...");

      await mlEvaluationAdminService.reloadTrial(studySlug, moduleId);
      setStepProgress("Trial activated");

      // Complete
      setComplete(true);
      toast.success("Configuration completed successfully!");
    } catch (error: any) {
      console.error("Quick setup failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        "Configuration failed";
      setProcessError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Navigate to test model page
  const handleGoToTestModel = () => {
    router.push(`/admin/trials/${studySlug}/test`);
    onClose();
  };

  // Handle pasted JSON
  const handlePasteValidate = () => {
    setParseError(null);
    setValidationErrors([]);
    setConfig(null);
    setShowValidationDetails(false);

    if (!pasteText.trim()) {
      setParseError("Please paste JSON configuration");
      return;
    }

    try {
      const data = JSON.parse(pasteText);
      const validation = validateConfig(data);
      if (!validation.valid) {
        setParseError(validation.error || "Invalid configuration");
        setValidationErrors(validation.details || []);
        setShowValidationDetails(true);
        return;
      }

      // Check for filesystem models
      const fsModels: FileSelectionRequest[] = [];
      if (data.models && Array.isArray(data.models)) {
        for (const model of data.models) {
          if (model.storage?.source_type === "filesystem" && model.storage?.file_path) {
            fsModels.push({
              modelKey: model.model_key,
              displayName: model.display_name,
              filePath: model.storage.file_path,
            });
          }
        }
      }

      setConfig(data as QuickConfigUpload);
      setFilesystemModels(fsModels);

      // If there are filesystem models, show file selection prompt
      if (fsModels.length > 0) {
        setShowFileSelection(true);
        setSelectedModelFiles(new Map()); // Reset selections
        toast.info(`JSON validated! Please select ${fsModels.length} model file(s).`);
      } else {
        toast.success("JSON validated successfully!");
      }
    } catch (err) {
      setParseError("Invalid JSON format - check for syntax errors");
      setValidationErrors([
        "The text does not contain valid JSON",
        "Common issues: missing commas, trailing commas, unquoted keys, single quotes instead of double quotes"
      ]);
      setShowValidationDetails(true);
    }
  };

  // Handle model file selection
  const handleModelFileSelect = (modelKey: string, file: File) => {
    setSelectedModelFiles(prev => {
      const newMap = new Map(prev);
      newMap.set(modelKey, file);
      return newMap;
    });
  };

  // Check if all required model files are selected
  const allFilesSelected = filesystemModels.length === 0 ||
    filesystemModels.every(model => selectedModelFiles.has(model.modelKey));

  // Reset state
  const handleReset = () => {
    setInputMode("file");
    setFile(null);
    setPasteText("");
    setConfig(null);
    setParseError(null);
    setValidationErrors([]);
    setShowValidationDetails(false);
    setFilesystemModels([]);
    setSelectedModelFiles(new Map());
    setShowFileSelection(false);
    setProcessError(null);
    setProcessing(false);
    setCurrentStep(-1);
    setStepProgress("");
    setComplete(false);
  };

  // Handle close
  const handleClose = () => {
    if (processing) return; // Don't close while processing
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconFileCode size={24} />
        Quick Configuration Setup
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          for &quot;{studyName}&quot;
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Input Mode Tabs */}
        {!processing && !complete && (
          <>
            <Tabs
              value={inputMode}
              onChange={(_, newValue) => {
                setInputMode(newValue);
                setParseError(null);
                setValidationErrors([]);
                setConfig(null);
                setShowValidationDetails(false);
              }}
              sx={{ mb: 2 }}
            >
              <Tab
                value="file"
                label="Upload File"
                icon={<IconUpload size={18} />}
                iconPosition="start"
              />
              <Tab
                value="paste"
                label="Paste JSON"
                icon={<IconClipboard size={18} />}
                iconPosition="start"
              />
            </Tabs>

            {/* File Upload Tab */}
            {inputMode === "file" && (
              <Paper
                sx={{
                  p: 4,
                  border: 2,
                  borderStyle: "dashed",
                  borderColor: dragActive
                    ? "primary.main"
                    : parseError
                    ? "error.main"
                    : config
                    ? "success.main"
                    : "divider",
                  bgcolor: dragActive ? "primary.lighter" : "background.paper",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "primary.lighter",
                  },
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".json"
                  style={{ display: "none" }}
                  id="config-file-input"
                />
                <label htmlFor="config-file-input" style={{ cursor: "pointer", display: "block" }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: config ? "success.main" : parseError ? "error.main" : "primary.main",
                        mx: "auto",
                        mb: 2,
                      }}
                    >
                      {config ? <IconCheck size={32} /> : parseError ? <IconX size={32} /> : <IconUpload size={32} />}
                    </Avatar>
                    {file ? (
                      <>
                        <Typography variant="body1" fontWeight="600">
                          {file.name}
                        </Typography>
                        {config && (
                          <>
                            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                              Valid configuration: {config.models.length} model(s), {config.fields.length} field(s)
                            </Typography>
                            {filesystemModels.length > 0 && (
                              <Typography variant="body2" color="info.main" sx={{ mt: 0.5 }}>
                                Please select {filesystemModels.length} model file(s) below
                              </Typography>
                            )}
                          </>
                        )}
                        {parseError && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="error.main" fontWeight="600">
                              {parseError}
                            </Typography>
                            {validationErrors.length > 0 && (
                              <Button
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowValidationDetails(!showValidationDetails);
                                }}
                                sx={{ mt: 0.5 }}
                              >
                                {showValidationDetails ? "Hide Details" : "Show Details"}
                              </Button>
                            )}
                          </Box>
                        )}
                      </>
                    ) : (
                      <>
                        <Typography variant="body1" fontWeight="600">
                          Drag and drop your configuration JSON file
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          or click to browse
                        </Typography>
                      </>
                    )}
                  </Box>
                </label>
              </Paper>
            )}

            {/* Paste JSON Tab */}
            {inputMode === "paste" && (
              <Box>
                <TextField
                  multiline
                  rows={12}
                  fullWidth
                  placeholder='Paste your JSON configuration here...\n\n{\n  "models": [...],\n  "fields": [...]\n}'
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  sx={{
                    "& .MuiInputBase-root": {
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    },
                  }}
                  error={!!parseError}
                />
                <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: "center" }}>
                  <Button
                    variant="contained"
                    onClick={handlePasteValidate}
                    disabled={!pasteText.trim()}
                  >
                    Validate JSON
                  </Button>
                  {config && (
                    <Typography variant="body2" color="success.main">
                      Valid: {config.models.length} model(s), {config.fields.length} field(s)
                    </Typography>
                  )}
                  {parseError && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="error.main" fontWeight="600">
                        {parseError}
                      </Typography>
                      {validationErrors.length > 0 && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => setShowValidationDetails(!showValidationDetails)}
                        >
                          {showValidationDetails ? "Hide" : "Details"}
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Validation Errors Detail */}
            <Collapse in={showValidationDetails && validationErrors.length > 0}>
              <Alert
                severity="error"
                sx={{ mt: 2 }}
                action={
                  <IconButton
                    size="small"
                    onClick={() => setShowValidationDetails(false)}
                  >
                    <IconX size={16} />
                  </IconButton>
                }
              >
                <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>
                  Validation Errors ({validationErrors.length}):
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2,
                    maxHeight: 200,
                    overflow: "auto",
                    "& li": { mb: 0.5, fontSize: "0.85rem" },
                  }}
                >
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </Box>
              </Alert>
            </Collapse>

            {/* Filesystem Model File Selection */}
            {showFileSelection && filesystemModels.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>
                  Select Model Files ({selectedModelFiles.size}/{filesystemModels.length})
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Your configuration uses local file paths. Please select the actual model files below:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {filesystemModels.map((model) => (
                    <Box key={model.modelKey} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="600">
                          {model.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                          Expected: {model.filePath}
                        </Typography>
                        {selectedModelFiles.has(model.modelKey) && (
                          <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.5 }}>
                            ✓ Selected: {selectedModelFiles.get(model.modelKey)?.name}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        variant={selectedModelFiles.has(model.modelKey) ? "outlined" : "contained"}
                        size="small"
                        color={selectedModelFiles.has(model.modelKey) ? "success" : "primary"}
                        component="label"
                        startIcon={selectedModelFiles.has(model.modelKey) ? <IconCheck size={16} /> : <IconUpload size={16} />}
                      >
                        {selectedModelFiles.has(model.modelKey) ? "Change" : "Select"}
                        <input
                          type="file"
                          hidden
                          accept=".pkl,.pickle,.joblib,.h5,.pt,.pth,.model,.bin"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleModelFileSelect(model.modelKey, file);
                            }
                          }}
                        />
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: "flex", gap: 2, mt: 2, justifyContent: "center" }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={showSampleJson ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                onClick={() => setShowSampleJson(!showSampleJson)}
              >
                {showSampleJson ? "Hide" : "View"} Sample JSON
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<IconDownload size={16} />}
                onClick={handleDownloadSample}
              >
                Download Template
              </Button>
            </Box>

            {/* Sample JSON Preview */}
            <Collapse in={showSampleJson}>
              <Paper
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "grey.900",
                  borderRadius: 1,
                  maxHeight: 300,
                  overflow: "auto",
                }}
              >
                <pre style={{ margin: 0, color: "#e0e0e0", fontSize: 11 }}>
                  {JSON.stringify(SAMPLE_CONFIG, null, 2)}
                </pre>
              </Paper>
            </Collapse>
          </>
        )}

        {/* Processing Progress */}
        {(processing || complete) && (
          <Box sx={{ py: 2 }}>
            <Stepper activeStep={currentStep} orientation="vertical">
              {PROCESSING_STEPS.map((step, index) => (
                <Step key={step.label} completed={index < currentStep || complete}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor:
                            index < currentStep || complete
                              ? "success.main"
                              : index === currentStep
                              ? "primary.main"
                              : "grey.300",
                        }}
                      >
                        {index < currentStep || complete ? (
                          <IconCheck size={16} />
                        ) : index === currentStep && processing ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          step.icon
                        )}
                      </Avatar>
                    )}
                  >
                    <Typography variant="body2" fontWeight={index === currentStep ? 600 : 400}>
                      {step.label}
                    </Typography>
                    {index === currentStep && stepProgress && (
                      <Typography variant="caption" color="text.secondary">
                        {stepProgress}
                      </Typography>
                    )}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Error */}
            {processError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {processError}
              </Alert>
            )}

            {/* Success */}
            {complete && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Configuration completed successfully! You can now start making predictions.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!processing && !complete && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              startIcon={<IconPlayerPlay size={18} />}
              onClick={handleProcess}
              disabled={!config || !allFilesSelected}
            >
              Start Configuration
              {filesystemModels.length > 0 && !allFilesSelected && (
                <Typography variant="caption" sx={{ ml: 1 }}>
                  ({selectedModelFiles.size}/{filesystemModels.length} files)
                </Typography>
              )}
            </Button>
          </>
        )}

        {processing && (
          <Button disabled>
            <CircularProgress size={18} sx={{ mr: 1 }} />
            Processing...
          </Button>
        )}

        {complete && (
          <>
            <Button onClick={handleClose}>Close</Button>
            <Button variant="contained" color="success" onClick={handleGoToTestModel}>
              Test Model
            </Button>
          </>
        )}

        {processError && !processing && (
          <>
            <Button onClick={handleReset}>Try Again</Button>
            <Button onClick={handleClose}>Close</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
