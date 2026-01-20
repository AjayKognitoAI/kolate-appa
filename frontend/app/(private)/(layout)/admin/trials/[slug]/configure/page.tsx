"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Avatar,
  Button,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  IconFlask,
  IconArrowLeft,
  IconBrain,
  IconForms,
  IconLink,
  IconChartBar,
  IconPlayerPlay,
  IconFileCode,
} from "@tabler/icons-react";
import { StudyConfigProvider, useStudyConfig, WIZARD_STEPS, InitialMLConfig } from "@/context/StudyConfigContext";
import { trialsService, Trial } from "@/services/admin/trials-service";
import { mlEvaluationAdminService } from "@/services/admin/ml-evaluation-admin-service";
import ModelUploadStep from "./components/ModelUploadStep";
import FieldMetadataStep from "./components/FieldMetadataStep";
import ModelLinkingStep from "./components/ModelLinkingStep";
import ChartConfigStep from "./components/ChartConfigStep";
import PreviewTestStep from "./components/PreviewTestStep";
import QuickSetupDialog from "./components/QuickSetupDialog";
import type {
  CreateModelRequest,
  ModelReferenceRequest,
  ModelFramework,
  CreateFieldMetadataRequest,
} from "@/types/ml-evaluation-admin.types";

// Extended Trial type with module information for ML configuration
interface TrialWithModule extends Trial {
  module_id: number;
  module_name: string;
}

// Step icons mapping
const stepIcons: Record<string, React.ReactNode> = {
  models: <IconBrain size={20} />,
  fields: <IconForms size={20} />,
  linking: <IconLink size={20} />,
  charts: <IconChartBar size={20} />,
  preview: <IconPlayerPlay size={20} />,
};

// Inner wizard component that uses context
function ConfigureWizardContent({
  quickSetupOpen,
  setQuickSetupOpen,
}: {
  quickSetupOpen: boolean;
  setQuickSetupOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const { state, goToStep, isStepCompleted } = useStudyConfig();

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return <ModelUploadStep />;
      case 2:
        return <FieldMetadataStep />;
      case 3:
        return <ModelLinkingStep />;
      case 4:
        return <ChartConfigStep />;
      case 5:
        return <PreviewTestStep />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              variant="text"
              startIcon={<IconArrowLeft size={18} />}
              onClick={() => router.push("/admin/trials")}
              sx={{ mr: 1 }}
            >
              Back to Studies
            </Button>
          </Box>
          <Button
            variant="outlined"
            startIcon={<IconFileCode size={18} />}
            onClick={() => setQuickSetupOpen(true)}
          >
            Quick Setup (JSON)
          </Button>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
          <Avatar
            sx={{
              bgcolor: "primary.main",
              width: 48,
              height: 48,
            }}
          >
            <IconFlask size={28} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Configure for "{state.studyName}"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Set up study details, machine learning models and prediction configuration
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Error display */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {state.error}
        </Alert>
      )}

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={state.currentStep - 1} alternativeLabel nonLinear>
          {WIZARD_STEPS.map((step) => (
            <Step key={step.id} completed={isStepCompleted(step.id)}>
              <StepButton onClick={() => goToStep(step.id)}>
                <StepLabel
                  StepIconComponent={() => (
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor:
                          state.currentStep === step.id
                            ? "primary.main"
                            : isStepCompleted(step.id)
                            ? "success.main"
                            : "grey.300",
                        fontSize: 14,
                      }}
                    >
                      {stepIcons[step.key]}
                    </Avatar>
                  )}
                >
                  <Typography variant="body2" fontWeight="600">
                    {step.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Box sx={{ mt: 4 }}>{renderStepContent()}</Box>
    </Container>
  );
}

// Main page component
export default function ConfigureStudyPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [study, setStudy] = useState<TrialWithModule | null>(null);
  const [existingConfig, setExistingConfig] = useState<InitialMLConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);

  useEffect(() => {
    const fetchStudyAndMLConfig = async () => {
      if (!slug) return;

      try {
        setLoading(true);

        // Step 1: Fetch study info from enterprise-manager
        const response = await trialsService.getTrialBySlug(slug);
        if (!response.trials || response.trials.length === 0) {
          setError("Study not found");
          return;
        }

        const studyData = response.trials[0] as TrialWithModule;
        setStudy(studyData);

        // Step 2: Fetch existing models and field metadata
        const moduleName = studyData.module_name;
        let models: CreateModelRequest[] = [];
        let linkedModels: ModelReferenceRequest[] = [];
        let fieldMetadata: CreateFieldMetadataRequest | undefined;

        // Fetch models
        try {
          const modelsResponse = await mlEvaluationAdminService.getModelsInfo(slug, moduleName);

          if (modelsResponse.models && modelsResponse.models.length > 0) {
            // Convert ModelInfo[] to CreateModelRequest[] format
            models = modelsResponse.models.map((m) => ({
              model_key: m.model_key,
              display_name: m.display_name,
              model_type: m.model_type as "classification" | "regression",
              model_framework: (m.model_framework as ModelFramework) || "scikit-learn",
              version: m.version || "1.0.0",
            }));

            // Build linked models from the models info
            linkedModels = modelsResponse.models.map((m, index) => ({
              model_id: `model_${slug}_${m.model_key}`, // Reconstruct model_id format
              model_key: m.model_key,
              is_primary: m.is_primary ?? index === 0,
              display_order: m.display_order ?? index + 1,
            }));
          }
        } catch (mlError) {
          // No models exist yet - that's okay, user can upload them
          console.log("No existing models found, starting fresh");
        }

        // Fetch field metadata
        let fieldMetadataId: string | undefined;
        try {
          const fieldMetadataResponse = await mlEvaluationAdminService.getFieldMetadata(slug, moduleName);

          if (fieldMetadataResponse.data && fieldMetadataResponse.data.length > 0) {
            // Convert FieldMetadataResponse to CreateFieldMetadataRequest format
            fieldMetadata = {
              trial_slug: slug,
              module_id: moduleName,
              version: 1,
              fields: fieldMetadataResponse.data,
            };

            // Build the field metadata ID based on backend pattern
            // Backend uses: f"field_metadata_{trial_slug}_{module_id}"
            fieldMetadataId = `field_metadata_${slug}_${moduleName}`;
          }
        } catch (fieldError) {
          // No field metadata exists yet - that's okay
          console.log("No existing field metadata found, starting fresh");
        }

        // Set existing config if we have any data
        if (models.length > 0 || fieldMetadata) {
          // Determine which steps are completed
          const completedSteps: number[] = [];
          if (models.length > 0) completedSteps.push(1);
          if (fieldMetadata && fieldMetadata.fields.length > 0) completedSteps.push(2);
          if (linkedModels.length > 0) completedSteps.push(3);

          setExistingConfig({
            models,
            uploadedModelIds: linkedModels.map((m) => m.model_id),
            linkedModels,
            fieldMetadata,
            fieldMetadataId, // Set the metadata ID so it knows to update instead of create
            completedSteps,
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch study:", err);
        setError(err.response?.data?.message || "Failed to load study");
      } finally {
        setLoading(false);
      }
    };

    fetchStudyAndMLConfig();
  }, [slug]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box>
            <Skeleton variant="text" width={300} height={32} />
            <Skeleton variant="text" width={200} height={20} />
          </Box>
        </Box>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 4, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (error || !study) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => router.push("/admin/trials")}>
              Go Back
            </Button>
          }
        >
          {error || "Study not found"}
        </Alert>
      </Container>
    );
  }

  // Use module_name for the provider (API endpoints use module name, not numeric ID)
  const moduleName = study.module_name;

  return (
    <StudyConfigProvider
      studySlug={study.slug}
      moduleId={moduleName}
      studyName={study.name}
      initialConfig={existingConfig}
    >
      <ConfigureWizardContent
        quickSetupOpen={quickSetupOpen}
        setQuickSetupOpen={setQuickSetupOpen}
      />

      {/* Quick Setup Dialog */}
      <QuickSetupDialog
        open={quickSetupOpen}
        onClose={() => setQuickSetupOpen(false)}
        studySlug={study.slug}
        moduleId={moduleName}
        studyName={study.name}
      />
    </StudyConfigProvider>
  );
}
