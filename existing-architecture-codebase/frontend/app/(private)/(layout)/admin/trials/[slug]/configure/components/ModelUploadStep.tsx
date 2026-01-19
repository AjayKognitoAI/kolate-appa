"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Tab,
  Tabs,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from "@mui/material";
import {
  IconUpload,
  IconCloud,
  IconWorld,
  IconBrain,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,
  IconChevronDown,
  IconSettings,
} from "@tabler/icons-react";
import { useStudyConfig } from "@/context/StudyConfigContext";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import type {
  UnifiedModelConfig,
  ModelFramework,
  ConfidenceStrategy,
  CreateModelRequest,
} from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";
import { InfoTooltip } from "@/components/InfoTooltip";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Model form state
interface ModelFormState {
  model_key: string;
  display_name: string;
  model_type: "classification" | "regression";
  model_framework: ModelFramework;
  version: string;
  confidence_strategy: ConfidenceStrategy;
  sample_fraction: string;
  response_mapping: { key: string; value: string }[];
  description: string;
  // For upload
  file: File | null;
  // For S3
  s3_uri: string;
  // For HTTP
  http_url: string;
  // BentoML integration options
  save_to_bentoml: boolean;
  auto_reload: boolean;
  replace_existing: boolean;
}

const initialFormState: ModelFormState = {
  model_key: "",
  display_name: "",
  model_type: "classification",
  model_framework: "scikit-learn",
  version: "1.0.0",
  confidence_strategy: "classification_probability",
  sample_fraction: "0.2",
  response_mapping: [{ key: "0", value: "Complete Response" }],
  description: "",
  file: null,
  s3_uri: "",
  http_url: "",
  // BentoML defaults
  save_to_bentoml: true,
  auto_reload: true,
  replace_existing: true,
};

export default function ModelUploadStep() {
  const { state, addModel, updateModel, removeModel, addUploadedModelId, nextStep, markStepCompleted } =
    useStudyConfig();

  const [tabValue, setTabValue] = useState(0);
  const [formState, setFormState] = useState<ModelFormState>(initialFormState);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingModelIndex, setEditingModelIndex] = useState<number | null>(null);
  const [editFormState, setEditFormState] = useState<Omit<ModelFormState, 'file' | 's3_uri' | 'http_url' | 'save_to_bentoml' | 'auto_reload' | 'replace_existing'> | null>(null);

  // Expanded accordion state
  const [expandedModel, setExpandedModel] = useState<number | false>(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (field: keyof ModelFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Response mapping handlers
  const addResponseMapping = () => {
    setFormState((prev) => ({
      ...prev,
      response_mapping: [...prev.response_mapping, { key: "", value: "" }],
    }));
  };

  const updateResponseMapping = (index: number, field: "key" | "value", value: string) => {
    setFormState((prev) => {
      const newMapping = [...prev.response_mapping];
      newMapping[index] = { ...newMapping[index], [field]: value };
      return { ...prev, response_mapping: newMapping };
    });
  };

  const removeResponseMapping = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      response_mapping: prev.response_mapping.filter((_, i) => i !== index),
    }));
  };

  // File handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidModelFile(file)) {
        handleInputChange("file", file);
      } else {
        toast.error("Invalid file type. Please upload .pkl, .pickle, or .joblib files.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (isValidModelFile(file)) {
        handleInputChange("file", file);
      } else {
        toast.error("Invalid file type. Please upload .pkl, .pickle, or .joblib files.");
      }
    }
  };

  const isValidModelFile = (file: File): boolean => {
    const validExtensions = [".pkl", ".pickle", ".joblib"];
    return validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formState.model_key.trim()) {
      newErrors.model_key = "Model key is required";
    } else if (!/^[a-z0-9_]+$/.test(formState.model_key)) {
      newErrors.model_key = "Model key must be lowercase letters, numbers, and underscores only";
    }

    if (!formState.display_name.trim()) {
      newErrors.display_name = "Display name is required";
    }

    // Check based on current tab
    if (tabValue === 0 && !formState.file) {
      newErrors.file = "Please select a model file";
    }
    if (tabValue === 1 && !formState.s3_uri.trim()) {
      newErrors.s3_uri = "S3 URI is required";
    }
    if (tabValue === 2 && !formState.http_url.trim()) {
      newErrors.http_url = "HTTP URL is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add model
  const handleAddModel = async () => {
    if (!validateForm()) return;

    setUploading(true);
    try {
      // Build response mapping object
      const responseMapping: Record<string, string> = {};
      formState.response_mapping.forEach((m) => {
        if (m.key && m.value) {
          responseMapping[m.key] = m.value;
        }
      });

      // Build unified model config
      const modelConfig: UnifiedModelConfig = {
        model_key: formState.model_key,
        display_name: formState.display_name,
        model_type: formState.model_type,
        model_framework: formState.model_framework,
        version: formState.version,
        confidence_config: {
          strategy: formState.confidence_strategy,
          sample_fraction: parseFloat(formState.sample_fraction),
        },
        response_mapping: responseMapping,
        description: formState.description || undefined,
        // BentoML options
        save_to_bentoml: formState.save_to_bentoml,
        auto_reload: formState.auto_reload,
        replace_existing: formState.replace_existing,
      };

      // Add trial/module for file uploads, storage config for URL-based
      if (tabValue === 0 && formState.file) {
        // File upload - include trial_slug and module_id
        modelConfig.trial_slug = state.studySlug;
        modelConfig.module_id = state.moduleId;
      } else {
        // URL-based registration - include storage config
        modelConfig.storage = {
          source_type: tabValue === 1 ? "s3" : "http",
          s3_uri: tabValue === 1 ? formState.s3_uri : undefined,
          http_url: tabValue === 2 ? formState.http_url : undefined,
          loader_type: "pickle",
        };
      }

      // Call unified endpoint
      const response = await mlEvaluationAdminService.uploadModelUnified(
        modelConfig,
        tabValue === 0 ? formState.file || undefined : undefined
      );

      addUploadedModelId(response.model_id);

      // Build success message with BentoML info
      let successMessage = `Model "${formState.display_name}" ${tabValue === 0 ? "uploaded" : "registered"} successfully`;
      if (response.bento_tag) {
        successMessage += ` (BentoML: ${response.bento_tag})`;
      }
      if (response.replaced_model_id) {
        successMessage += ` - Replaced model: ${response.replaced_model_id}`;
      }
      toast.success(successMessage);

      // Show reload status if available
      if (response.reload_status === "reloaded") {
        toast.info("Model reloaded in service");
      } else if (response.reload_status === "reload_failed") {
        toast.warning("Model uploaded but reload failed - manual reload may be needed");
      }

      // Add to local state
      addModel({
        model_key: formState.model_key,
        display_name: formState.display_name,
        model_type: formState.model_type,
        model_framework: formState.model_framework,
        version: formState.version,
        confidence_config: {
          strategy: formState.confidence_strategy,
          sample_fraction: parseFloat(formState.sample_fraction),
        },
        response_mapping: responseMapping,
      });

      // Reset form
      setFormState(initialFormState);
    } catch (error: any) {
      console.error("Failed to add model:", error);
      toast.error(error.response?.data?.message || "Failed to add model");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (state.models.length > 0) {
      markStepCompleted(1);
      nextStep();
    } else {
      toast.error("Please add at least one model before proceeding");
    }
  };

  // Accordion expand handler
  const handleAccordionChange = (index: number) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedModel(isExpanded ? index : false);
  };

  // Edit dialog handlers
  const handleOpenEditDialog = (index: number) => {
    const model = state.models[index];
    // Convert model to edit form state
    const responseMappingArray = model.response_mapping
      ? Object.entries(model.response_mapping).map(([key, value]) => ({ key, value }))
      : [{ key: "0", value: "Complete Response" }];

    setEditFormState({
      model_key: model.model_key,
      display_name: model.display_name,
      model_type: model.model_type,
      model_framework: model.model_framework,
      version: model.version || "1.0.0",
      confidence_strategy: model.confidence_config?.strategy || "classification_probability",
      sample_fraction: String(model.confidence_config?.sample_fraction || 0.2),
      response_mapping: responseMappingArray,
      description: model.description || "",
    });
    setEditingModelIndex(index);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingModelIndex(null);
    setEditFormState(null);
  };

  const handleEditInputChange = (field: string, value: any) => {
    if (!editFormState) return;
    setEditFormState((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleEditResponseMapping = (index: number, field: "key" | "value", value: string) => {
    if (!editFormState) return;
    setEditFormState((prev) => {
      if (!prev) return null;
      const newMapping = [...prev.response_mapping];
      newMapping[index] = { ...newMapping[index], [field]: value };
      return { ...prev, response_mapping: newMapping };
    });
  };

  const handleAddEditResponseMapping = () => {
    if (!editFormState) return;
    setEditFormState((prev) =>
      prev ? { ...prev, response_mapping: [...prev.response_mapping, { key: "", value: "" }] } : null
    );
  };

  const handleRemoveEditResponseMapping = (index: number) => {
    if (!editFormState) return;
    setEditFormState((prev) =>
      prev ? { ...prev, response_mapping: prev.response_mapping.filter((_, i) => i !== index) } : null
    );
  };

  const handleSaveEdit = () => {
    if (editingModelIndex === null || !editFormState) return;

    // Build response mapping object
    const responseMapping: Record<string, string> = {};
    editFormState.response_mapping.forEach((m) => {
      if (m.key && m.value) {
        responseMapping[m.key] = m.value;
      }
    });

    const updatedModel: CreateModelRequest = {
      model_key: editFormState.model_key,
      display_name: editFormState.display_name,
      model_type: editFormState.model_type,
      model_framework: editFormState.model_framework,
      version: editFormState.version,
      confidence_config: {
        strategy: editFormState.confidence_strategy,
        sample_fraction: parseFloat(editFormState.sample_fraction),
      },
      response_mapping: responseMapping,
      description: editFormState.description || undefined,
      save_to_bentoml: true,
      auto_reload: true,
      replace_existing: true,
    };

    updateModel(editingModelIndex, updatedModel);
    toast.success("Model properties updated");
    handleCloseEditDialog();
  };

  return (
    <Box>
      {/* Models List */}
      {state.models.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            Added Models ({state.models.length})
          </Typography>
          {state.models.map((model, index) => (
            <Accordion
              key={index}
              expanded={expandedModel === index}
              onChange={handleAccordionChange(index)}
              sx={{
                mb: 2,
                border: 1,
                borderColor: "divider",
                "&:last-child": { mb: 0 },
                "&:before": { display: "none" },
                boxShadow: "none",
              }}
            >
              <AccordionSummary
                expandIcon={<IconChevronDown size={20} />}
                sx={{
                  "& .MuiAccordionSummary-content": {
                    alignItems: "center",
                    gap: 2,
                    my: 1,
                  }
                }}
              >
                <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                  <IconBrain size={20} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight="600">
                    {model.display_name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                    <Chip label={model.model_key} size="small" variant="outlined" />
                    <Chip
                      label={model.model_type}
                      size="small"
                      color={model.model_type === "classification" ? "primary" : "secondary"}
                    />
                    <Chip label={model.model_framework || "scikit-learn"} size="small" />
                    <Chip label={`v${model.version || "1.0.0"}`} size="small" variant="outlined" />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }} onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditDialog(index);
                    }}
                  >
                    <IconEdit size={18} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeModel(index);
                    }}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {/* Basic Properties */}
                  <Grid size={12}>
                    <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>
                      Basic Configuration
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Model Key</Typography>
                    <Typography variant="body2" fontWeight="500">{model.model_key}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Display Name</Typography>
                    <Typography variant="body2" fontWeight="500">{model.display_name}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Model Type</Typography>
                    <Typography variant="body2" fontWeight="500" sx={{ textTransform: "capitalize" }}>
                      {model.model_type}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Framework</Typography>
                    <Typography variant="body2" fontWeight="500">{model.model_framework || "scikit-learn"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary">Version</Typography>
                    <Typography variant="body2" fontWeight="500">{model.version || "1.0.0"}</Typography>
                  </Grid>

                  {/* Confidence Configuration */}
                  {model.confidence_config && (
                    <>
                      <Grid size={12} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>
                          Confidence Configuration
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary">Strategy</Typography>
                        <Typography variant="body2" fontWeight="500">
                          {model.confidence_config.strategy?.replace(/_/g, " ") || "classification probability"}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary">Sample Fraction</Typography>
                        <Typography variant="body2" fontWeight="500">
                          {model.confidence_config.sample_fraction ?? 0.2}
                        </Typography>
                      </Grid>
                    </>
                  )}

                  {/* Response Mapping (for classification) */}
                  {model.model_type === "classification" && model.response_mapping && Object.keys(model.response_mapping).length > 0 && (
                    <>
                      <Grid size={12} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>
                          Response Mapping
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {Object.entries(model.response_mapping).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key} → ${value}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: "monospace" }}
                            />
                          ))}
                        </Box>
                      </Grid>
                    </>
                  )}

                  {/* Description */}
                  {model.description && (
                    <>
                      <Grid size={12} sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1 }}>
                          Description
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Typography variant="body2">{model.description}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}

      {/* Add Model Form */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            Add New Model
          </Typography>
          <InfoTooltip
            title="Model Upload Methods"
            description="Upload a model file from your computer, link to S3 cloud storage, or provide an HTTP download URL. Most users upload files directly."
            variant="inline"
          />
        </Box>

        {/* Source Tabs */}
        <Box sx={{ mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              icon={<IconUpload size={18} />}
              label="Upload File"
              iconPosition="start"
            />
            <Tab
              icon={<IconCloud size={18} />}
              label="S3 Reference"
              iconPosition="start"
            />
            <Tab
              icon={<IconWorld size={18} />}
              label="HTTP URL"
              iconPosition="start"
            />
          </Tabs>
          <Box sx={{ mt: 1, px: 2 }}>
            {tabValue === 0 && (
              <Typography variant="caption" color="text.secondary">
                💡 Recommended for beginners: Upload your .pkl, .pickle, or .joblib model file directly
              </Typography>
            )}
            {tabValue === 1 && (
              <Typography variant="caption" color="text.secondary">
                💡 For advanced users: Link to a model stored in Amazon S3 (e.g., s3://bucket/model.pkl)
              </Typography>
            )}
            {tabValue === 2 && (
              <Typography variant="caption" color="text.secondary">
                💡 For web-hosted models: Provide a direct download URL (e.g., https://example.com/model.pkl)
              </Typography>
            )}
          </Box>
        </Box>

        {/* Tab Content */}
        <TabPanel value={tabValue} index={0}>
          {/* File Upload */}
          <Paper
            sx={{
              p: 4,
              border: 2,
              borderStyle: "dashed",
              borderColor: dragActive ? "primary.main" : errors.file ? "error.main" : "divider",
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
              accept=".pkl,.pickle,.joblib"
              style={{ display: "none" }}
              id="model-file-input"
            />
            <label htmlFor="model-file-input" style={{ cursor: "pointer", display: "block" }}>
              <Box sx={{ textAlign: "center" }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: formState.file ? "success.main" : "primary.main",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  {formState.file ? <IconCheck size={32} /> : <IconUpload size={32} />}
                </Avatar>
                {formState.file ? (
                  <>
                    <Typography variant="body1" fontWeight="600">
                      {formState.file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(formState.file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body1" fontWeight="600">
                      Drag and drop your model file
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supported: .pkl, .pickle, .joblib
                    </Typography>
                  </>
                )}
              </Box>
            </label>
          </Paper>
          {errors.file && (
            <FormHelperText error sx={{ mt: 1 }}>
              {errors.file}
            </FormHelperText>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* S3 Reference */}
          <TextField
            fullWidth
            label="S3 URI"
            placeholder="s3://bucket-name/path/to/model.pkl"
            value={formState.s3_uri}
            onChange={(e) => handleInputChange("s3_uri", e.target.value)}
            error={!!errors.s3_uri}
            helperText={errors.s3_uri || "Example: s3://ml-models/trials/lung-cancer/model.pkl"}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* HTTP URL */}
          <TextField
            fullWidth
            label="HTTP URL"
            placeholder="https://example.com/models/model.pkl"
            value={formState.http_url}
            onChange={(e) => handleInputChange("http_url", e.target.value)}
            error={!!errors.http_url}
            helperText={errors.http_url || "Direct URL to download the model file"}
          />
        </TabPanel>

        <Divider sx={{ my: 3 }} />

        {/* Model Configuration */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="600">
            Model Configuration
          </Typography>
          <InfoTooltip
            title="Model Settings"
            description="Configure how your machine learning model will be identified and used for predictions."
            variant="inline"
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">
                Model Key <Typography component="span" color="error.main">*</Typography>
              </Typography>
              <InfoTooltip
                title="Unique Model Identifier"
                description="A unique ID for your model (e.g., 'obj_response'). Use lowercase letters, numbers, and underscores only. This must match how you reference the model in your code."
                variant="inline"
                size="small"
              />
            </Box>
            <TextField
              fullWidth
              placeholder="obj_response"
              value={formState.model_key}
              onChange={(e) => handleInputChange("model_key", e.target.value.toLowerCase())}
              error={!!errors.model_key}
              helperText={errors.model_key || "Example: obj_response, survival_rate"}
              required
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">
                Display Name <Typography component="span" color="error.main">*</Typography>
              </Typography>
              <InfoTooltip
                title="User-Friendly Name"
                description="The name users will see for this model (e.g., 'Objective Response Predictor'). Make it clear and descriptive."
                variant="inline"
                size="small"
              />
            </Box>
            <TextField
              fullWidth
              placeholder="Objective Response"
              value={formState.display_name}
              onChange={(e) => handleInputChange("display_name", e.target.value)}
              error={!!errors.display_name}
              helperText={errors.display_name || "Example: Objective Response Predictor"}
              required
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">Model Type</Typography>
              <InfoTooltip
                title="Prediction Type"
                description="Classification: Predicts categories (Yes/No, CR/PR/SD). Regression: Predicts numbers (survival time, probability scores)."
                variant="inline"
                size="small"
              />
            </Box>
            <FormControl fullWidth>
              <Select
                value={formState.model_type}
                onChange={(e) => handleInputChange("model_type", e.target.value)}
              >
                <MenuItem value="classification">Classification (Categories)</MenuItem>
                <MenuItem value="regression">Regression (Numbers)</MenuItem>
              </Select>
              <FormHelperText>
                Classification for categories, Regression for numerical values
              </FormHelperText>
            </FormControl>
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">Framework</Typography>
              <InfoTooltip
                title="ML Framework"
                description="The machine learning library used to train this model. If unsure, check with your data science team. Most models use scikit-learn."
                variant="inline"
                size="small"
              />
            </Box>
            <FormControl fullWidth>
              <Select
                value={formState.model_framework}
                onChange={(e) => handleInputChange("model_framework", e.target.value)}
              >
                <MenuItem value="scikit-learn">scikit-learn (Most Common)</MenuItem>
                <MenuItem value="xgboost">XGBoost (Gradient Boosting)</MenuItem>
                <MenuItem value="lightgbm">LightGBM (Fast Gradient Boosting)</MenuItem>
                <MenuItem value="random_forest">Random Forest</MenuItem>
              </Select>
              <FormHelperText>
                Ask your data science team if you're unsure
              </FormHelperText>
            </FormControl>
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">
                Version
              </Typography>
              <InfoTooltip
                title="Model Version"
                description="Track model versions (e.g., 1.0.0). Increment when you update the model. Helps identify which model is deployed."
                variant="inline"
                size="small"
              />
            </Box>
            <TextField
              fullWidth
              placeholder="1.0.0"
              value={formState.version}
              onChange={(e) => handleInputChange("version", e.target.value)}
              helperText="Semantic versioning: MAJOR.MINOR.PATCH"
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">Confidence Strategy</Typography>
              <InfoTooltip
                title="How Confidence is Calculated"
                description="Classification Probability: Standard approach for most models. XGBoost/Random Forest Variance: Measures uncertainty across ensemble trees. Use default unless your data scientist specifies otherwise."
                variant="inline"
                size="small"
              />
            </Box>
            <FormControl fullWidth>
              <Select
                value={formState.confidence_strategy}
                onChange={(e) => handleInputChange("confidence_strategy", e.target.value)}
              >
                <MenuItem value="classification_probability">
                  Classification Probability (Default)
                </MenuItem>
                <MenuItem value="xgboost_ensemble_variance">
                  XGBoost Ensemble Variance
                </MenuItem>
                <MenuItem value="random_forest_tree_variance">
                  Random Forest Tree Variance
                </MenuItem>
              </Select>
              <FormHelperText>
                How the model calculates prediction confidence
              </FormHelperText>
            </FormControl>
          </Box>
        </Box>

        {/* Response Mapping (for classification) */}
        {formState.model_type === "classification" && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="600">
                Response Mapping
              </Typography>
              <InfoTooltip
                title="Output Label Mapping"
                description="Translate model output values (0, 1, 2) into user-friendly labels (Complete Response, Partial Response). Add all possible values your model can output."
                variant="inline"
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Example: 0 → Complete Response, 1 → Partial Response
            </Typography>
            {formState.response_mapping.map((mapping, index) => (
              <Box
                key={index}
                sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}
              >
                <TextField
                  size="small"
                  label="Output Value"
                  placeholder="0"
                  value={mapping.key}
                  onChange={(e) => updateResponseMapping(index, "key", e.target.value)}
                  sx={{ width: 120 }}
                />
                <Typography color="text.secondary">→</Typography>
                <TextField
                  size="small"
                  label="Label"
                  placeholder="Complete Response"
                  value={mapping.value}
                  onChange={(e) => updateResponseMapping(index, "value", e.target.value)}
                  sx={{ flex: 1 }}
                />
                {formState.response_mapping.length > 1 && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeResponseMapping(index)}
                  >
                    <IconX size={18} />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconPlus size={16} />}
              onClick={addResponseMapping}
            >
              Add Mapping
            </Button>
          </Box>
        )}

        {/* Add Model Button */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <IconPlus size={18} />}
            onClick={handleAddModel}
            disabled={uploading}
          >
            {uploading ? "Adding Model..." : "Add Model"}
          </Button>
        </Box>
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleNext}
          disabled={state.models.length === 0}
        >
          Next: Define Fields
        </Button>
      </Box>

      {/* Edit Model Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconSettings size={24} />
          Edit Model Properties
        </DialogTitle>
        <DialogContent dividers>
          {editFormState && (
            <Box sx={{ pt: 1 }}>
              {/* Basic Configuration */}
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                Basic Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Model Key"
                    value={editFormState.model_key}
                    onChange={(e) => handleEditInputChange("model_key", e.target.value.toLowerCase())}
                    helperText="Unique identifier (lowercase, underscores allowed)"
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={editFormState.display_name}
                    onChange={(e) => handleEditInputChange("display_name", e.target.value)}
                    helperText="User-friendly name shown in UI"
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Model Type</InputLabel>
                    <Select
                      value={editFormState.model_type}
                      label="Model Type"
                      onChange={(e) => handleEditInputChange("model_type", e.target.value)}
                    >
                      <MenuItem value="classification">Classification</MenuItem>
                      <MenuItem value="regression">Regression</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Framework</InputLabel>
                    <Select
                      value={editFormState.model_framework}
                      label="Framework"
                      onChange={(e) => handleEditInputChange("model_framework", e.target.value)}
                    >
                      <MenuItem value="scikit-learn">scikit-learn</MenuItem>
                      <MenuItem value="xgboost">XGBoost</MenuItem>
                      <MenuItem value="lightgbm">LightGBM</MenuItem>
                      <MenuItem value="random_forest">Random Forest</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Version"
                    value={editFormState.version}
                    onChange={(e) => handleEditInputChange("version", e.target.value)}
                    helperText="Semantic version (e.g., 1.0.0)"
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={editFormState.description}
                    onChange={(e) => handleEditInputChange("description", e.target.value)}
                    helperText="Optional description of the model"
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Confidence Configuration */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                Confidence Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Confidence Strategy</InputLabel>
                    <Select
                      value={editFormState.confidence_strategy}
                      label="Confidence Strategy"
                      onChange={(e) => handleEditInputChange("confidence_strategy", e.target.value)}
                    >
                      <MenuItem value="classification_probability">Classification Probability</MenuItem>
                      <MenuItem value="xgboost_ensemble_variance">XGBoost Ensemble Variance</MenuItem>
                      <MenuItem value="random_forest_tree_variance">Random Forest Tree Variance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Sample Fraction"
                    type="number"
                    value={editFormState.sample_fraction}
                    onChange={(e) => handleEditInputChange("sample_fraction", e.target.value)}
                    inputProps={{ step: 0.1, min: 0, max: 1 }}
                    helperText="Fraction for sampling (0-1)"
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Response Mapping (for classification) */}
              {editFormState.model_type === "classification" && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 2 }}>
                    Response Mapping
                  </Typography>
                  {editFormState.response_mapping.map((mapping, index) => (
                    <Box
                      key={index}
                      sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}
                    >
                      <TextField
                        size="small"
                        label="Output Value"
                        placeholder="0"
                        value={mapping.key}
                        onChange={(e) => handleEditResponseMapping(index, "key", e.target.value)}
                        sx={{ width: 120 }}
                      />
                      <Typography color="text.secondary">→</Typography>
                      <TextField
                        size="small"
                        label="Label"
                        placeholder="Complete Response"
                        value={mapping.value}
                        onChange={(e) => handleEditResponseMapping(index, "value", e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      {editFormState.response_mapping.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveEditResponseMapping(index)}
                        >
                          <IconX size={18} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconPlus size={16} />}
                    onClick={handleAddEditResponseMapping}
                  >
                    Add Mapping
                  </Button>
                </>
              )}

            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
