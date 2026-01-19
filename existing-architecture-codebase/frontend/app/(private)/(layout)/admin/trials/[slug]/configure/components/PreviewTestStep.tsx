"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Button,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
} from "@mui/material";
import {
  IconCheck,
  IconX,
  IconCode,
  IconRocket,
  IconBrain,
  IconForms,
  IconLink,
  IconChartBar,
} from "@tabler/icons-react";
import { useStudyConfig } from "@/context/StudyConfigContext";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import type {
  CreateTrialConfigRequest,
} from "@/types/ml-evaluation-admin.types";
import { toast } from "react-toastify";

export default function PreviewTestStep() {
  const router = useRouter();
  const { state, previousStep, markStepCompleted, setLoading, setError } = useStudyConfig();

  const [activating, setActivating] = useState(false);

  // Validation checks
  const validationChecks = useMemo(() => {
    return [
      {
        id: "models",
        label: "Models uploaded",
        passed: state.models.length > 0,
        icon: <IconBrain size={18} />,
      },
      {
        id: "fields",
        label: "Field metadata defined",
        passed: state.fieldMetadata !== null && state.fieldMetadata.fields.length > 0,
        icon: <IconForms size={18} />,
      },
      {
        id: "linked",
        label: "Models linked to study",
        passed: state.linkedModels.length > 0,
        icon: <IconLink size={18} />,
      },
      {
        id: "primary",
        label: "Primary model set",
        passed: state.linkedModels.some((m) => m.is_primary),
        icon: <IconBrain size={18} />,
      },
      {
        id: "charts",
        label: "Charts configured (optional)",
        passed: state.chartConfig?.enabled ? (state.chartConfig.chart_types?.length || 0) > 0 : true,
        optional: true,
        icon: <IconChartBar size={18} />,
      },
    ];
  }, [state]);

  const allRequiredPassed = validationChecks
    .filter((c) => !c.optional)
    .every((c) => c.passed);

  // Build JSON config
  const configJson = useMemo(() => {
    const config: CreateTrialConfigRequest = {
      trial_slug: state.studySlug,
      module_id: state.moduleId,
      models: state.linkedModels.map((m) => ({
        model_id: state.uploadedModelIds.find((id) => id.includes(m.model_key)) || m.model_id,
        model_key: m.model_key,
        is_primary: m.is_primary,
        display_order: m.display_order,
      })),
      field_metadata_id: state.fieldMetadataId ?? undefined,
      preprocessing: state.preprocessing,
      service_config: state.serviceConfig,
      chart_config: state.chartConfig || undefined,
    };
    return config;
  }, [state]);

  const handleActivate = async () => {
    if (!allRequiredPassed) {
      toast.error("Please complete all required steps before activating");
      return;
    }

    setActivating(true);
    setError(null);

    try {
      // 1. Always save field metadata (backend handles upsert - creates or updates)
      let fieldMetadataId = state.fieldMetadataId;
      if (state.fieldMetadata) {
        const metadataResponse = await mlEvaluationAdminService.createFieldMetadata(
          state.fieldMetadata
        );
        fieldMetadataId = metadataResponse.metadata_id;
      }

      // 2. Create trial configuration (backend handles upsert)
      const trialConfig: CreateTrialConfigRequest = {
        ...configJson,
        field_metadata_id: fieldMetadataId ?? undefined,
      };

      await mlEvaluationAdminService.createTrialConfig(trialConfig);

      // 3. Reload the trial to activate it
      await mlEvaluationAdminService.reloadTrial(state.studySlug, state.moduleId);

      markStepCompleted(5);
      toast.success("Study configuration activated successfully!");

      // Redirect to studies list
      router.push("/admin/trials");
    } catch (error: any) {
      console.error("Failed to activate configuration:", error);
      const errorMessage = error.response?.data?.message || "Failed to activate configuration";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActivating(false);
    }
  };

  return (
    <Box>
      {/* Summary Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
          Configuration Summary
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {state.models.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Models Uploaded
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {state.fieldMetadata?.fields.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fields Defined
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {state.linkedModels.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Models Linked
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {state.chartConfig?.chart_types?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chart Types
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Validation Checklist */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
          Validation Checklist
        </Typography>
        <List dense>
          {validationChecks.map((check) => (
            <ListItem key={check.id}>
              <ListItemIcon>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: check.passed
                      ? "success.light"
                      : check.optional
                      ? "grey.200"
                      : "error.light",
                    color: check.passed
                      ? "success.main"
                      : check.optional
                      ? "grey.500"
                      : "error.main",
                  }}
                >
                  {check.passed ? <IconCheck size={16} /> : <IconX size={16} />}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={check.label}
                secondary={check.optional ? "Optional" : "Required"}
              />
              {check.passed && <Chip label="Passed" size="small" color="success" />}
              {!check.passed && check.optional && (
                <Chip label="Skipped" size="small" variant="outlined" />
              )}
              {!check.passed && !check.optional && (
                <Chip label="Missing" size="small" color="error" />
              )}
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* JSON Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <IconCode size={20} />
          <Typography variant="h6" fontWeight="600">
            JSON Configuration
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This configuration will be saved to the database when you activate
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: "grey.900",
            borderRadius: 1,
            maxHeight: 400,
            overflow: "auto",
          }}
        >
          <pre style={{ margin: 0, color: "#e0e0e0", fontSize: 12 }}>
            {JSON.stringify(configJson, null, 2)}
          </pre>
        </Paper>
        <Alert severity="info" sx={{ mt: 2 }}>
          After activation, you can test the model predictions from the Studies list page (three-dot menu → Test Model)
        </Alert>
      </Paper>

      {/* Error display */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.error}
        </Alert>
      )}

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button variant="outlined" size="large" onClick={previousStep}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          color="success"
          startIcon={
            activating ? <CircularProgress size={18} color="inherit" /> : <IconRocket size={18} />
          }
          onClick={handleActivate}
          disabled={!allRequiredPassed || activating}
        >
          {activating ? "Activating..." : "Activate Configuration"}
        </Button>
      </Box>
    </Box>
  );
}
