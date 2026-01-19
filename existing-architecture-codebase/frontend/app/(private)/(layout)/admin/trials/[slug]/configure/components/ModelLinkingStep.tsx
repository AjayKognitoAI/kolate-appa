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
  FormControlLabel,
  FormHelperText,
  Switch,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Chip,
  Divider,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  IconLink,
  IconTrash,
  IconGripVertical,
  IconBrain,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { useStudyConfig } from "@/context/StudyConfigContext";
import type { ModelReferenceRequest } from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";
import { InfoTooltip } from "@/components/InfoTooltip";

export default function ModelLinkingStep() {
  const {
    state,
    linkModel,
    unlinkModel,
    updateLinkedModel,
    setPreprocessing,
    setServiceConfig,
    nextStep,
    previousStep,
    markStepCompleted,
  } = useStudyConfig();

  const [selectedModelKey, setSelectedModelKey] = useState("");

  // Get available models (not yet linked)
  const availableModels = state.models.filter(
    (model) => !state.linkedModels.some((linked) => linked.model_key === model.model_key)
  );

  const handleLinkModel = () => {
    if (!selectedModelKey) return;

    const model = state.models.find((m) => m.model_key === selectedModelKey);
    if (!model) return;

    const modelRef: ModelReferenceRequest = {
      model_id: `model_${model.model_key}`, // Will be updated with actual ID
      model_key: model.model_key,
      is_primary: state.linkedModels.length === 0, // First model is primary
      display_order: state.linkedModels.length + 1,
    };

    linkModel(modelRef);
    setSelectedModelKey("");
    toast.success(`Model "${model.display_name}" linked`);
  };

  const handleSetPrimary = (modelKey: string) => {
    // Set all to non-primary first
    state.linkedModels.forEach((m) => {
      updateLinkedModel(m.model_key, { is_primary: m.model_key === modelKey });
    });
    toast.success("Primary model updated");
  };

  const handleNext = () => {
    if (state.linkedModels.length === 0) {
      toast.error("Please link at least one model before proceeding");
      return;
    }

    // Ensure at least one is primary
    const hasPrimary = state.linkedModels.some((m) => m.is_primary);
    if (!hasPrimary) {
      updateLinkedModel(state.linkedModels[0].model_key, { is_primary: true });
    }

    markStepCompleted(3);
    nextStep();
  };

  const getModelDetails = (modelKey: string) => {
    return state.models.find((m) => m.model_key === modelKey);
  };

  return (
    <Box>
      {/* Linked Models */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
          Linked Models ({state.linkedModels.length})
        </Typography>

        {state.linkedModels.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No models linked yet. Select models from your uploaded models to link them to this
            study.
          </Alert>
        ) : (
          <Box sx={{ mb: 3 }}>
            {state.linkedModels.map((linkedModel, index) => {
              const modelDetails = getModelDetails(linkedModel.model_key);
              return (
                <Card
                  key={linkedModel.model_key}
                  sx={{
                    mb: 2,
                    border: 2,
                    borderColor: linkedModel.is_primary ? "primary.main" : "divider",
                    bgcolor: linkedModel.is_primary ? "primary.lighter" : "background.paper",
                  }}
                >
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconGripVertical size={18} style={{ color: "#9e9e9e", cursor: "grab" }} />
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                      <IconBrain size={20} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body1" fontWeight="600">
                          {modelDetails?.display_name || linkedModel.model_key}
                        </Typography>
                        {linkedModel.is_primary && (
                          <Chip label="Primary" size="small" color="primary" />
                        )}
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        <Chip label={linkedModel.model_key} size="small" variant="outlined" />
                        <Chip
                          label={modelDetails?.model_type || "classification"}
                          size="small"
                          color={
                            modelDetails?.model_type === "classification" ? "primary" : "secondary"
                          }
                          variant="outlined"
                        />
                        <Chip
                          label={`Order: ${linkedModel.display_order}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Tooltip title={linkedModel.is_primary ? "Primary model" : "Set as primary"}>
                      <IconButton
                        onClick={() => handleSetPrimary(linkedModel.model_key)}
                        color={linkedModel.is_primary ? "primary" : "default"}
                      >
                        {linkedModel.is_primary ? (
                          <IconStarFilled size={20} />
                        ) : (
                          <IconStar size={20} />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Unlink model">
                      <IconButton
                        color="error"
                        onClick={() => {
                          unlinkModel(linkedModel.model_key);
                          toast.success("Model unlinked");
                        }}
                      >
                        <IconTrash size={18} />
                      </IconButton>
                    </Tooltip>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}

        {/* Link new model */}
        {availableModels.length > 0 && (
          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
            <FormControl sx={{ minWidth: 300 }}>
              <InputLabel>Select Model to Link</InputLabel>
              <Select
                value={selectedModelKey}
                label="Select Model to Link"
                onChange={(e) => setSelectedModelKey(e.target.value)}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.model_key} value={model.model_key}>
                    {model.display_name} ({model.model_key})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<IconLink size={18} />}
              onClick={handleLinkModel}
              disabled={!selectedModelKey}
            >
              Link Model
            </Button>
          </Box>
        )}

        {availableModels.length === 0 && state.models.length > 0 && (
          <Alert severity="success">All uploaded models have been linked.</Alert>
        )}
      </Paper>

      {/* Preprocessing Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            Preprocessing Configuration
          </Typography>
          <InfoTooltip
            title="Data Preprocessing"
            description="Configure how input data is processed before being sent to your model. These settings should match how your model was trained."
            variant="inline"
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.preprocessing.requires_one_hot ?? true}
                  onChange={(e) => setPreprocessing({ requires_one_hot: e.target.checked })}
                />
              }
              label="Requires One-Hot Encoding"
            />
            <InfoTooltip
              title="One-Hot Encoding"
              description="Converts categories into binary columns (e.g., Gender='Male' becomes Male=1, Female=0). Enable if your model was trained with one-hot encoded data. Most scikit-learn models need this."
              variant="inline"
              size="small"
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">Missing Value Strategy</Typography>
              <InfoTooltip
                title="Handling Missing Data"
                description="How to handle missing/empty fields: Zero Fill (replace with 0), Mean/Median (statistical replacement), Mode (most common value), Drop Row (skip prediction if data missing). Choose based on your model's training."
                variant="inline"
                size="small"
              />
            </Box>
            <FormControl fullWidth>
              <Select
                value={state.preprocessing.missing_value_strategy || "zero_fill"}
                onChange={(e) =>
                  setPreprocessing({
                    missing_value_strategy: e.target.value as any,
                  })
                }
              >
                <MenuItem value="zero_fill">Zero Fill (Default)</MenuItem>
                <MenuItem value="mean">Mean (Average)</MenuItem>
                <MenuItem value="median">Median (Middle Value)</MenuItem>
                <MenuItem value="mode">Mode (Most Common)</MenuItem>
                <MenuItem value="drop">Drop Row (Skip if Missing)</MenuItem>
              </Select>
              <FormHelperText>
                How to handle missing data in predictions
              </FormHelperText>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Service Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="h6" fontWeight="600">
            Service Configuration
          </Typography>
          <InfoTooltip
            title="Performance Settings"
            description="Configure caching, batch processing limits, and tracking. These affect speed, resource usage, and auditing capabilities."
            variant="inline"
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 3 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">Cache TTL (seconds)</Typography>
              <InfoTooltip
                title="Cache Duration"
                description="How long to store prediction results (Time-To-Live). 300 seconds (5 min) is recommended for production. Set to 0 to disable caching. Higher values = faster repeat predictions but older results."
                variant="inline"
                size="small"
              />
            </Box>
            <TextField
              fullWidth
              type="number"
              value={state.serviceConfig.cache_ttl_seconds || 300}
              onChange={(e) =>
                setServiceConfig({ cache_ttl_seconds: parseInt(e.target.value) || 300 })
              }
              helperText="Default: 300 (5 minutes)"
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
              <Typography variant="body2" fontWeight="500">Max Batch Rows</Typography>
              <InfoTooltip
                title="Batch Size Limit"
                description="Maximum number of patients to process in a single CSV upload. 1000 is recommended. Higher = faster batch processing but more memory usage. Lower = slower but more stable."
                variant="inline"
                size="small"
              />
            </Box>
            <TextField
              fullWidth
              type="number"
              value={state.serviceConfig.batch_prediction_max_rows || 1000}
              onChange={(e) =>
                setServiceConfig({
                  batch_prediction_max_rows: parseInt(e.target.value) || 1000,
                })
              }
              helperText="Default: 1000 rows"
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.serviceConfig.enable_execution_tracking ?? true}
                  onChange={(e) =>
                    setServiceConfig({ enable_execution_tracking: e.target.checked })
                  }
                />
              }
              label="Enable Execution Tracking"
            />
            <InfoTooltip
              title="Audit Logging"
              description="Track who made predictions, when, and what data was used. Recommended for clinical settings for compliance and auditing. Disable only if storage is limited."
              variant="inline"
              size="small"
            />
          </Box>
        </Box>
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button variant="outlined" size="large" onClick={previousStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleNext}
          disabled={state.linkedModels.length === 0}
        >
          Next: Configure Charts
        </Button>
      </Box>
    </Box>
  );
}
