"use client"

import React, { useState } from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Alert,
  LinearProgress,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Collapse,
} from "@mui/material"
import {
  IconArrowLeft,
  IconCheck,
  IconCloudUpload,
  IconDatabase,
  IconAlertCircle,
  IconList,
  IconFolder,
  IconHeartbeat,
  IconLock,
  IconUser,
  IconLink,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import { dataPipelineService, ScrapyTaskResponse } from "@/services/data-pipeline/data-pipeline-service"
import { useRouter } from "next/navigation"

interface PhysioNetInputStepProps {
  onNext: (data: { dataUrl: string; taskId?: string; s3Key?: string }) => void
  onBack: () => void
  trialSlug?: string | null
}

const UPLOAD_STEPS = [
  "Connecting to PhysioNet",
  "Downloading files",
  "Uploading to AWS S3",
  "Complete"
]

type SourceMode = "dataset" | "url"

export default function PhysioNetInputStep({ onNext, onBack, trialSlug }: PhysioNetInputStepProps) {
  const router = useRouter()

  // Form state
  const [datasetName, setDatasetName] = useState("")
  const [sourceMode, setSourceMode] = useState<SourceMode>("dataset")
  const [dataset, setDataset] = useState("")
  const [version, setVersion] = useState("")
  const [url, setUrl] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [filePattern, setFilePattern] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // UI state
  const [error, setError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [taskId, setTaskId] = useState<string>("")
  const [filesDownloaded, setFilesDownloaded] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const getStepFromStatus = (status: string): number => {
    if (status === "completed") return 3
    if (status === "running") return 1
    if (status === "pending") return 0
    return 0
  }

  const validateForm = (): boolean => {
    if (!datasetName.trim()) {
      setError("Please enter a dataset name")
      return false
    }
    if (sourceMode === "dataset" && !dataset.trim()) {
      setError("Please enter a PhysioNet dataset ID")
      return false
    }
    if (sourceMode === "url" && !url.trim()) {
      setError("Please enter a PhysioNet URL")
      return false
    }
    if (sourceMode === "url") {
      try {
        const urlObj = new URL(url)
        if (!urlObj.hostname.includes("physionet.org")) {
          setError("URL must be from physionet.org")
          return false
        }
      } catch {
        setError("Please enter a valid URL")
        return false
      }
    }
    return true
  }

  const handleNext = async () => {
    if (!validateForm()) return

    setError("")
    setIsUploading(true)
    setUploadStep(0)
    setFilesDownloaded(0)
    setTotalBytes(0)

    try {
      // Create PhysioNet download task
      const task = await dataPipelineService.downloadFromPhysioNet({
        dataset_name: datasetName.trim(),
        dataset: sourceMode === "dataset" ? dataset.trim() : undefined,
        version: sourceMode === "dataset" && version.trim() ? version.trim() : undefined,
        url: sourceMode === "url" ? url.trim() : undefined,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        file_pattern: filePattern.trim() || undefined,
        trial_slug: trialSlug || undefined,
      })

      setTaskId(task.task_id)

      // Poll task status
      const completedTask = await dataPipelineService.pollScrapyTaskStatus(
        task.task_id,
        (taskUpdate: ScrapyTaskResponse) => {
          setFilesDownloaded(taskUpdate.files_downloaded || 0)
          setTotalBytes(taskUpdate.total_bytes || 0)
          const step = getStepFromStatus(taskUpdate.status)
          setUploadStep(step)
        }
      )

      // Task completed successfully
      setUploadStep(3)
      setUploadSuccess(true)

      // Wait a bit to show success
      await new Promise(resolve => setTimeout(resolve, 1500))

      onNext({
        dataUrl: sourceMode === "url" ? url : `physionet://${dataset}/${version || "latest"}`,
        taskId: completedTask.task_id,
      })
    } catch (err: any) {
      setError(err.message || "Failed to download from PhysioNet")
      setIsUploading(false)
      setUploadStep(0)
    }
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={onBack} size="small" disabled={isUploading}>
            <IconArrowLeft />
          </IconButton>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconHeartbeat size={24} color="#e91e63" />
              <Typography variant="h4" fontWeight="bold">
                PhysioNet
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isUploading ? "Downloading from PhysioNet..." : "Medical research datasets"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconList size={16} />}
            onClick={() => router.push("/admin/data-pipeline-tasks")}
          >
            View Tasks
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconFolder size={16} />}
            onClick={() => router.push("/admin/datasets")}
          >
            Datasets
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && !isUploading && (
        <Alert severity="error" icon={<IconAlertCircle />} sx={{ mb: 3 }} onClose={() => setError("")}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {/* Upload Progress UI */}
      {isUploading && (
        <Paper elevation={2} sx={{ mb: 3, border: 1, borderColor: "primary.main" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: uploadSuccess ? "success.main" : "primary.main",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                {uploadSuccess ? <IconCheck size={32} /> : <IconHeartbeat size={32} />}
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {uploadSuccess ? "Download Complete!" : "Downloading from PhysioNet"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {sourceMode === "dataset" ? `Dataset: ${dataset}` : url}
              </Typography>
            </Box>

            {/* Progress Steps */}
            <Box sx={{ mb: 2 }}>
              <Stepper activeStep={uploadStep} orientation="vertical" sx={{ py: 1 }}>
                {UPLOAD_STEPS.map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          color: index <= uploadStep ? "primary.main" : "grey.300",
                          width: 28,
                          height: 28,
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontSize="0.875rem"
                        fontWeight={index === uploadStep ? "600" : "regular"}
                        color={index <= uploadStep ? "text.primary" : "text.secondary"}
                      >
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Progress Info */}
            {!uploadSuccess && (
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {filesDownloaded > 0 && `${filesDownloaded} files downloaded`}
                  {totalBytes > 0 && ` (${formatBytes(totalBytes)})`}
                </Typography>
                <LinearProgress sx={{ mt: 2, height: 6, borderRadius: 3 }} />
              </Box>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <Alert severity="success" icon={<IconCheck />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Data successfully downloaded and uploaded to AWS S3
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Paper>
      )}

      {/* Form - Only show when not uploading */}
      {!isUploading && (
        <>
          <Paper elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <CardContent sx={{ p: 3 }}>
              {/* Dataset Name Field */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconDatabase size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    Dataset Name *
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="my-physionet-dataset"
                  helperText="Name for organizing your data in S3"
                  variant="outlined"
                />
              </Box>

              {/* Source Mode Selection */}
              <Box sx={{ mb: 3 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: "bold" }}>
                    Data Source
                  </FormLabel>
                  <RadioGroup
                    row
                    value={sourceMode}
                    onChange={(e) => setSourceMode(e.target.value as SourceMode)}
                  >
                    <FormControlLabel
                      value="dataset"
                      control={<Radio />}
                      label="Dataset ID"
                    />
                    <FormControlLabel
                      value="url"
                      control={<Radio />}
                      label="Direct URL"
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              {/* Dataset ID Fields */}
              {sourceMode === "dataset" && (
                <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                  <TextField
                    sx={{ flex: 2 }}
                    label="Dataset ID"
                    value={dataset}
                    onChange={(e) => setDataset(e.target.value)}
                    placeholder="mitdb, mimic-iv, etc."
                    helperText="PhysioNet dataset identifier"
                    variant="outlined"
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label="Version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    helperText="Optional"
                    variant="outlined"
                  />
                </Box>
              )}

              {/* Direct URL Field */}
              {sourceMode === "url" && (
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="PhysioNet URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://physionet.org/content/mitdb/1.0.0/"
                    helperText="Direct URL to a PhysioNet dataset page"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconLink size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              )}

              {/* Credentials Section */}
              <Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconLock size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    PhysioNet Credentials
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Required for restricted datasets)
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    sx={{ flex: 1 }}
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your-physionet-username"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconUser size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="your-password"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconLock size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>

              {/* Advanced Options */}
              <Box>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  endIcon={showAdvanced ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                >
                  Advanced Options
                </Button>
                <Collapse in={showAdvanced}>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="File Pattern"
                      value={filePattern}
                      onChange={(e) => setFilePattern(e.target.value)}
                      placeholder="\.(csv|dat|hea|mat)$"
                      helperText="Regex pattern to filter files (e.g., download only .csv files)"
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconFilter size={18} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Collapse>
              </Box>
            </CardContent>
          </Paper>

          {/* Info Box */}
          <Paper elevation={0} sx={{ mt: 3, bgcolor: "info.lighter", border: 1, borderColor: "info.light" }}>
            <CardContent>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                About PhysioNet
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                PhysioNet provides free access to physiological and clinical data. Many datasets
                require credentialed access - you'll need to complete training and sign a data use agreement on physionet.org first.
              </Typography>
            </CardContent>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={onBack} size="large">
              Back
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleNext}
              disabled={!datasetName.trim() || (sourceMode === "dataset" ? !dataset.trim() : !url.trim())}
              size="large"
              startIcon={<IconCloudUpload />}
            >
              Download from PhysioNet
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
