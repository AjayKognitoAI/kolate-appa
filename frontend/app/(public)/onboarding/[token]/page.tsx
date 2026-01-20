"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Avatar,
  useTheme,
} from "@mui/material";
import {
  IconBuilding,
  IconUser,
  IconLock,
  IconUsers,
  IconDatabase,
  IconCheck,
  IconRocket,
} from "@tabler/icons-react";
import { toast } from "react-toastify";

import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";
import { onboardingService, WIZARD_STEPS, ONBOARDING_STEPS } from "@/services/onboarding/onboarding-service";

// Step components
import CompanyInfoStep from "./components/CompanyInfoStep";
import AdminSetupStep from "./components/AdminSetupStep";
import SSOConfigStep from "./components/SSOConfigStep";
import InviteUsersStep from "./components/InviteUsersStep";
import DatasourceStep from "./components/DatasourceStep";
import ReviewCompleteStep from "./components/ReviewCompleteStep";

// Step icons mapping
const stepIcons: Record<string, React.ReactNode> = {
  company_info: <IconBuilding size={20} />,
  admin_setup: <IconUser size={20} />,
  sso_config: <IconLock size={20} />,
  invite_users: <IconUsers size={20} />,
  datasource: <IconDatabase size={20} />,
  review: <IconCheck size={20} />,
};

function OnboardingWizardContent() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const token = params.token as string;

  const {
    state,
    setToken,
    setEnterpriseData,
    goToStep,
    nextStep,
    previousStep,
    setLoading,
    setError,
    isStepCompleted,
    canProceed,
    markStepCompleted,
  } = useOnboarding();

  const [initialLoading, setInitialLoading] = useState(true);

  // Load onboarding status on mount
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!token) {
        setError("Invalid onboarding link");
        setInitialLoading(false);
        return;
      }

      try {
        setToken(token);
        setLoading(true);

        const status = await onboardingService.getOnboardingStatus(token);

        // Check if onboarding is already complete
        if (onboardingService.isOnboardingComplete(status)) {
          toast.info("Onboarding already completed. Redirecting to login...");
          setTimeout(() => router.push("/"), 2000);
          return;
        }

        // Set enterprise data from status
        setEnterpriseData({
          enterpriseId: status.enterprise_id,
          enterpriseName: status.enterprise_name,
          enterpriseDomain: status.enterprise_domain,
          adminEmail: status.admin_email,
          organizationId: status.organization_id,
          status: status.status,
          companyInfo: {
            name: status.enterprise_name,
            website: `https://${status.enterprise_domain}`,
          },
        });

        // Set current step based on onboarding progress
        const currentStepIndex = onboardingService.getStepIndex(
          status.onboarding?.current_step || null
        );
        goToStep(currentStepIndex);

      } catch (err: any) {
        console.error("Failed to load onboarding status:", err);
        const errorMessage = err.response?.data?.detail || "Invalid or expired onboarding link";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    loadOnboardingStatus();
  }, [token]);

  // Handle step completion
  const handleStepComplete = async (stepData?: Record<string, any>) => {
    try {
      setLoading(true);

      // Get step name for API
      const stepName = onboardingService.getStepName(state.currentStep);

      // Update step on backend
      await onboardingService.updateStep(token, stepName, stepData);

      // Mark step as completed locally
      markStepCompleted(state.currentStep);

      // Move to next step
      nextStep();

      toast.success("Step completed successfully");
    } catch (err: any) {
      console.error("Failed to complete step:", err);
      const errorMessage = err.response?.data?.detail || "Failed to save progress";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle final completion
  const handleComplete = async () => {
    try {
      setLoading(true);

      const result = await onboardingService.completeOnboarding(token, {
        name: state.companyInfo?.name,
        logo_url: state.companyInfo?.logoUrl,
        description: state.companyInfo?.description,
        industry: state.companyInfo?.industry,
        employee_count: state.companyInfo?.employeeCount,
      });

      toast.success("Onboarding completed! Your account is now active.");

      // Redirect to login after completion
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      console.error("Failed to complete onboarding:", err);
      const errorMessage = err.response?.data?.detail || "Failed to complete onboarding";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 0:
        return <CompanyInfoStep onComplete={handleStepComplete} />;
      case 1:
        return <AdminSetupStep onComplete={handleStepComplete} />;
      case 2:
        return <SSOConfigStep onComplete={handleStepComplete} />;
      case 3:
        return <InviteUsersStep onComplete={handleStepComplete} />;
      case 4:
        return <DatasourceStep onComplete={handleStepComplete} />;
      case 5:
        return <ReviewCompleteStep onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  // Loading state
  if (initialLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography>Loading your onboarding...</Typography>
      </Box>
    );
  }

  // Error state
  if (state.error && !state.enterpriseId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {state.error}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please check your invitation email for the correct link, or contact support.
          </Typography>
          <Button variant="contained" onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: "primary.main",
              }}
            >
              <IconRocket size={32} />
            </Avatar>
          </Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Welcome to Kolate
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Complete your organization setup for{" "}
            <strong>{state.enterpriseName || "your enterprise"}</strong>
          </Typography>
        </Box>

        {/* Stepper */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stepper activeStep={state.currentStep} alternativeLabel nonLinear>
            {WIZARD_STEPS.map((step, index) => (
              <Step key={step.id} completed={isStepCompleted(index)}>
                <StepButton
                  onClick={() => {
                    // Only allow going back to completed steps
                    if (isStepCompleted(index) || index < state.currentStep) {
                      goToStep(index);
                    }
                  }}
                  disabled={index > state.currentStep && !isStepCompleted(index)}
                >
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor:
                            state.currentStep === index
                              ? "primary.main"
                              : isStepCompleted(index)
                              ? "success.main"
                              : "grey.300",
                          color:
                            state.currentStep === index || isStepCompleted(index)
                              ? "white"
                              : "grey.600",
                        }}
                      >
                        {isStepCompleted(index) ? (
                          <IconCheck size={18} />
                        ) : (
                          stepIcons[step.key]
                        )}
                      </Avatar>
                    )}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={state.currentStep === index ? 600 : 400}
                    >
                      {step.title}
                    </Typography>
                  </StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Step Content */}
        <Paper sx={{ p: 4 }}>
          {state.isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderStepContent()
          )}
        </Paper>

        {/* Navigation */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
          <Button
            variant="outlined"
            onClick={previousStep}
            disabled={state.currentStep === 0 || state.isLoading}
          >
            Back
          </Button>
          <Box>
            {state.currentStep < WIZARD_STEPS.length - 1 && (
              <>
                {state.currentStep === 2 || state.currentStep === 3 || state.currentStep === 4 ? (
                  <Button
                    variant="text"
                    onClick={() => {
                      markStepCompleted(state.currentStep);
                      nextStep();
                    }}
                    disabled={state.isLoading}
                    sx={{ mr: 2 }}
                  >
                    Skip
                  </Button>
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default function OnboardingPage() {
  const params = useParams();
  const token = params.token as string;

  return (
    <OnboardingProvider initialToken={token}>
      <OnboardingWizardContent />
    </OnboardingProvider>
  );
}
