"use client"

import { useState, useEffect } from "react"
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
} from "@mui/material"
import DataInputStep from "./components/data-input-step"
import FileUploadStep from "./components/file-upload-step"
import UrlInputStep from "./components/url-input-step"
import DataExtractionStep from "./components/data-extraction-step"
import FeatureSelectionStep from "./components/feature-selection-step"
import ModelSubmitStep from "./components/model-submit-step"
import { IconDatabase, IconCheck, IconCloudCheck, IconList, IconFolder } from "@tabler/icons-react"
import { Card, CardContent, Button, Alert } from "@mui/material"
import { useRouter } from "next/navigation"
import PredictDropdown from "./components/DropdownPredictList"
import { trialsService } from "@/services/admin/trials-service"

const DATA_PIPELINE_STEPS = [
  { id: 1, title: "Data Input", description: "Upload or provide data source" },
  { id: 2, title: "Extract & Convert", description: "Extract to CSV format" },
  { id: 3, title: "Select Features", description: "Choose relevant features" },
  { id: 4, title: "Submit to Model", description: "Send data to ML model" },
]

type InputMethod = null | "upload" | "url"

export default function DataPipelinePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [inputMethod, setInputMethod] = useState<InputMethod>(null)
  const [urlCompleted, setUrlCompleted] = useState(false)
  const [pipelineData, setPipelineData] = useState({
    uploadedFile: null,
    uploadedFiles: [] as File[],
    dataUrl: null,
    extractedData: null,
    extractedFilesData: [] as any[],
    selectedFeatures: [],
    taskId: null,
    s3Key: null,
    isAllZipFiles: false,
    trialSlug: null as string | null,
  })
  const [pipelineType, setPipelineType] = useState<{ category: string; model: string } | null>(null);
  const [selectedTrialId, setSelectedTrialId] = useState<number | null>(null);

  // Fetch trial slug when a study is selected
  useEffect(() => {
    const fetchTrialSlug = async () => {
      if (!pipelineType || pipelineType.category === "none") {
        setSelectedTrialId(null);
        setPipelineData(prev => ({ ...prev, trialSlug: null }));
        return;
      }

      // Only fetch trial slug for "predict" category
      if (pipelineType.category === "predict" && pipelineType.model) {
        try {
          const response = await trialsService.getTrialBySlug(pipelineType.model);
          if (response.success && response.trials && response.trials.length > 0) {
            const trial = response.trials[0];
            console.log('[Data Pipeline] Trial fetched:', { id: trial.id, slug: trial.slug, model: pipelineType.model });
            setSelectedTrialId(trial.id);
            setPipelineData(prev => ({ ...prev, trialSlug: trial.slug }));
          } else {
            console.warn('[Data Pipeline] No trials found for slug:', pipelineType.model);
            setSelectedTrialId(null);
            setPipelineData(prev => ({ ...prev, trialSlug: null }));
          }
        } catch (error) {
          console.error("Failed to fetch trial slug:", error);
          setSelectedTrialId(null);
          setPipelineData(prev => ({ ...prev, trialSlug: null }));
        }
      } else {
        // For other categories (copilot, compare, etc.), clear the trial slug
        setSelectedTrialId(null);
        setPipelineData(prev => ({ ...prev, trialSlug: null }));
      }
    };

    fetchTrialSlug();
  }, [pipelineType]);

  const handleSelectInputMethod = (method: "upload" | "url") => {
    setInputMethod(method)
  }

  const handleBackFromInputMethod = () => {
    setInputMethod(null)
  }

  const isZipFile = (file: File) => file.name.toLowerCase().endsWith('.zip')

  const handleNextStep = (stepData: any) => {
    // Check if all uploaded files are ZIP files
    const uploadedFiles = stepData.uploadedFiles || pipelineData.uploadedFiles
    const allZip = uploadedFiles.length > 0 && uploadedFiles.every(isZipFile)

    setPipelineData({ ...pipelineData, ...stepData, isAllZipFiles: allZip })

    // If URL method, mark as completed and don't proceed to next steps
    if (inputMethod === "url") {
      setUrlCompleted(true)
      return
    }

    // For file upload, proceed to next step
    setInputMethod(null)
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setInputMethod(null)
    }
  }

  const handleReset = () => {
    setCurrentStep(1)
    setInputMethod(null)
    setUrlCompleted(false)
    setPipelineData({
      uploadedFile: null,
      uploadedFiles: [],
      dataUrl: null,
      extractedData: null,
      extractedFilesData: [],
      selectedFeatures: [],
      taskId: null,
      s3Key: null,
      isAllZipFiles: false,
      trialSlug: null,
    })
    setPipelineType(null)
    setSelectedTrialId(null)
  }

  const handleStepClick = (step: number) => {
    setCurrentStep(step)
    setInputMethod(null)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1, flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 48,
                height: 48,
              }}
            >
              <IconDatabase size={28} />
            </Avatar>
            <Box>
              <Typography variant="h3" fontWeight="bold">
                Data Pipeline
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Transform your data for machine learning
              </Typography>
            </Box>
          </Box>

          {/* Only show buttons when not in input method selection or after URL completion */}
          {(inputMethod === null || urlCompleted) && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<IconList size={18} />}
                onClick={() => router.push("/admin/data-pipeline-tasks")}
              >
                View All Tasks
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconFolder size={18} />}
                onClick={() => router.push("/admin/datasets")}
              >
                View Datasets
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Progress Stepper - Hide when URL input method is selected, URL upload completed, or all files are ZIP */}
      {inputMethod !== "url" && !urlCompleted && !pipelineData.isAllZipFiles && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stepper activeStep={currentStep - 1} alternativeLabel>
            {DATA_PIPELINE_STEPS.map((step) => (
              <Step key={step.id}>
                <StepButton onClick={() => handleStepClick(step.id)}>
                  <StepLabel>
                    <Typography variant="body2" fontWeight="bold">
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
      )}

      {/* Content */}
      <Box sx={{ mt: 4 }}>
        {/* URL Completion Screen */}
        {urlCompleted && (
          <Card sx={{ maxWidth: 800, mx: "auto" }}>
            <CardContent sx={{ p: 6, textAlign: "center" }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: "success.main",
                  mx: "auto",
                  mb: 3,
                }}
              >
                <IconCloudCheck size={60} />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Upload Complete!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Your data has been successfully uploaded to AWS S3 and is ready for processing
              </Typography>

              <Alert severity="success" sx={{ mb: 4, textAlign: "left" }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Upload Details
                </Typography>
                {pipelineData.dataUrl && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>URL:</strong> {pipelineData.dataUrl}
                  </Typography>
                )}
                {pipelineData.taskId && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Task ID:</strong> {pipelineData.taskId}
                  </Typography>
                )}
                {pipelineData.s3Key && (
                  <Typography variant="body2">
                    <strong>S3 Key:</strong> {pipelineData.s3Key}
                  </Typography>
                )}
              </Alert>

              <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<IconList size={18} />}
                  onClick={() => router.push("/admin/data-pipeline-tasks")}
                >
                  View All Tasks
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<IconFolder size={18} />}
                  onClick={() => router.push("/admin/datasets")}
                >
                  View Datasets
                </Button>
                <Button variant="outlined" size="large" onClick={handleReset}>
                  Upload Another File
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Regular Steps Flow (Upload Method) */}
        {!urlCompleted && (
          <>
            {currentStep === 1 && !inputMethod && (
              <>
                {/* Dropdown for pipeline type */}
                <Box sx={{ maxWidth: 400, mb: 3, mx: "auto" }}>
                  <PredictDropdown onChange={(category, model) => setPipelineType({ category, model })} />
                </Box>
                <DataInputStep onNext={handleSelectInputMethod} pipelineType={pipelineType} />
              </>
            )}
            {currentStep === 1 && inputMethod === "upload" && (
              <FileUploadStep onNext={handleNextStep} onBack={handleBackFromInputMethod} />
            )}
            {currentStep === 1 && inputMethod === "url" && (
              <UrlInputStep onNext={handleNextStep} onBack={handleBackFromInputMethod} trialSlug={pipelineData.trialSlug} />
            )}
            {currentStep === 2 && (
              <DataExtractionStep onNext={handleNextStep} onPrevious={handlePreviousStep} data={pipelineData} />
            )}
            {currentStep === 3 && (
              <FeatureSelectionStep onNext={handleNextStep} onPrevious={handlePreviousStep} data={pipelineData} />
            )}
            {currentStep === 4 && (
              <ModelSubmitStep onPrevious={handlePreviousStep} onReset={handleReset} data={pipelineData} />
            )}
          </>
        )}
      </Box>
    </Container>
  )
}