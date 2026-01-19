"use client"

import React, { useState } from "react"
import {
  Box,
  Typography,
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
  CardContent,
  Chip,
  InputAdornment,
  Collapse,
} from "@mui/material"
import {
  IconArrowLeft,
  IconLink,
  IconCheck,
  IconCloudUpload,
  IconDatabase,
  IconAlertCircle,
  IconFileZip,
  IconList,
  IconFolder,
  IconLock,
  IconUser,
  IconKey,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import { dataPipelineService, TaskResponse, ScrapyTaskResponse } from "@/services/data-pipeline/data-pipeline-service"
import { useRouter } from "next/navigation"
import SourceTypeSelector, { SourceType } from "./source-type-selector"
import PhysioNetInputStep from "./physionet-input-step"
import DirectoryInputStep from "./directory-input-step"
import CrawlInputStep from "./crawl-input-step"
import ApiInputStep from "./api-input-step"

interface UrlInputStepProps {
  onNext: (data: { dataUrl: string; taskId?: string; s3Key?: string }) => void
  onBack: () => void
  trialSlug?: string | null
}

const UPLOAD_STEPS = [
  "Fetching data from URL",
  "Uploading to AWS S3",
  "Processing file",
  "Complete"
]

export default function UrlInputStep({ onNext, onBack, trialSlug }: UrlInputStepProps) {
  const router = useRouter()

  // Source type selection
  const [sourceType, setSourceType] = useState<SourceType | null>(null)

  // Generic URL form state
  const [url, setUrl] = useState("")
  const [datasetName, setDatasetName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [showAuth, setShowAuth] = useState(false)

  // UI state
  const [error, setError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [taskId, setTaskId] = useState<string>("")
  const [progressPercent, setProgressPercent] = useState(0)
  const [bytesInfo, setBytesInfo] = useState<{ downloaded: number; total: number }>({ downloaded: 0, total: 0 })
  const [filesDownloaded, setFilesDownloaded] = useState(0)

  const validateUrl = (urlString: string) => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const getStepFromStatus = (status: string, progressPercent: number): number => {
    if (status === "completed") return 3
    if (status === "running") {
      if (progressPercent >= 80) return 2
      if (progressPercent >= 30) return 1
      return 0
    }
    if (status === "pending") return 0
    return 0
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const extractDatasetName = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').pop() || 'dataset'
      return filename.replace(/\.[^/.]+$/, "")
    } catch {
      return "dataset"
    }
  }

  const isZipFile = (urlString: string): boolean => {
    try {
      const urlObj = new URL(urlString)
      const pathname = urlObj.pathname.toLowerCase()
      return pathname.endsWith('.zip') || pathname.endsWith('.gz') || pathname.endsWith('.tar.gz')
    } catch {
      return false
    }
  }

  const handleGenericUrlSubmit = async () => {
    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }
    if (!validateUrl(url)) {
      setError("Please enter a valid URL")
      return
    }
    setError("")
    setIsUploading(true)
    setUploadStep(0)
    setProgressPercent(0)
    setFilesDownloaded(0)

    try {
      const finalDatasetName = datasetName.trim() || extractDatasetName(url)

      // Use scrapy download/url endpoint for better handling
      const task = await dataPipelineService.downloadFromUrl({
        urls: url,
        dataset_name: finalDatasetName,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        auth_token: authToken.trim() || undefined,
        enable_parallel: true,
        max_workers: 10,
        trial_slug: trialSlug || undefined,
      })

      setTaskId(task.task_id)

      // Poll scrapy task status
      const completedTask = await dataPipelineService.pollScrapyTaskStatus(
        task.task_id,
        (taskUpdate: ScrapyTaskResponse) => {
          setFilesDownloaded(taskUpdate.files_downloaded || 0)
          setBytesInfo({
            downloaded: taskUpdate.total_bytes || 0,
            total: taskUpdate.total_bytes || 0,
          })
          // Map scrapy status to step
          if (taskUpdate.status === "running") {
            if (taskUpdate.files_downloaded && taskUpdate.files_downloaded > 0) {
              setUploadStep(2)
            } else {
              setUploadStep(1)
            }
          }
        }
      )

      setUploadStep(3)
      setUploadSuccess(true)
      setProgressPercent(100)

      await new Promise(resolve => setTimeout(resolve, 1500))

      onNext({
        dataUrl: url,
        taskId: completedTask.task_id,
      })
    } catch (err: unknown) {
      let errorMessage = "Failed to upload data from URL"
      if (err instanceof Error) {
        // Check for specific error types
        if (err.message.includes("Network Error") || err.message.includes("network")) {
          errorMessage = "Network error: Unable to connect to the server. Please check your internet connection and try again."
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timed out. The server took too long to respond. Please try again."
        } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          errorMessage = "Authentication error. Please log in again and retry."
        } else if (err.message.includes("403") || err.message.includes("Forbidden")) {
          errorMessage = "Access denied. You don't have permission to perform this action."
        } else if (err.message.includes("500") || err.message.includes("Internal Server")) {
          errorMessage = "Server error. Please try again later or contact support."
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
      setIsUploading(false)
      setUploadStep(0)
      setProgressPercent(0)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    if (error) setError("")
  }

  // Render the appropriate component based on source type
  if (sourceType === "physionet") {
    return <PhysioNetInputStep onNext={onNext} onBack={() => setSourceType(null)} trialSlug={trialSlug} />
  }

  if (sourceType === "directory") {
    return <DirectoryInputStep onNext={onNext} onBack={() => setSourceType(null)} trialSlug={trialSlug} />
  }

  if (sourceType === "crawl") {
    return <CrawlInputStep onNext={onNext} onBack={() => setSourceType(null)} trialSlug={trialSlug} />
  }

  if (sourceType === "api") {
    return <ApiInputStep onNext={onNext} onBack={() => setSourceType(null)} trialSlug={trialSlug} />
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={sourceType ? () => setSourceType(null) : onBack} size="small" disabled={isUploading}>
            <IconArrowLeft />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {sourceType === "url" ? "Direct URL Download" : "Remote Data Source"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isUploading ? "Uploading to AWS S3..." : "Choose your data source and configure download"}
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

      {/* Source Type Selector - Show when no type selected or url type selected */}
      {!isUploading && (
        <SourceTypeSelector
          selectedType={sourceType}
          onSelect={setSourceType}
        />
      )}

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
                  bgcolor: "primary.main",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                {uploadSuccess ? (
                  <IconCheck size={32} />
                ) : (
                  <IconCloudUpload size={32} />
                )}
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {uploadSuccess ? "Upload Complete!" : "Uploading to AWS S3"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  maxWidth: 500,
                  mx: "auto",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {url}
              </Typography>
            </Box>

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

            {!uploadSuccess && (
              <Box>
                <LinearProgress
                  variant={filesDownloaded > 0 ? "determinate" : "indeterminate"}
                  value={progressPercent}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                    {filesDownloaded > 0 ? `${filesDownloaded} files downloaded` : "Processing..."}
                  </Typography>
                  {bytesInfo.total > 0 && (
                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                      {formatBytes(bytesInfo.downloaded)}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {uploadSuccess && (
              <Alert severity="success" icon={<IconCheck />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Data successfully uploaded to AWS S3 and ready for processing
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Paper>
      )}

      {/* Generic URL Form - Only show when url type selected and not uploading */}
      {sourceType === "url" && !isUploading && (
        <>
          <Paper elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <CardContent sx={{ p: 3 }}>
              {/* Data URL Field */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconLink size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    Data URL *
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/data.csv or https://example.com/dataset.zip"
                  error={!!error}
                  helperText={error || "Supported: CSV, JSON, PDF, Excel, ZIP/GZ/TAR.GZ archives"}
                  variant="outlined"
                />
              </Box>

              {/* Dataset Name Field */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconDatabase size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    Dataset Name <Typography component="span" variant="body2" color="text.secondary">(Optional)</Typography>
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="my-dataset"
                  helperText="Custom name for the dataset. If not provided, will be extracted from URL"
                  variant="outlined"
                />
              </Box>

              {/* Authentication Section */}
              <Box>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowAuth(!showAuth)}
                  startIcon={<IconLock size={16} />}
                  endIcon={showAuth ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                >
                  Authentication (Optional)
                </Button>
                <Collapse in={showAuth}>
                  <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                      <TextField
                        sx={{ flex: 1 }}
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
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
                        placeholder="password"
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
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                      OR use Bearer Token:
                    </Typography>
                    <TextField
                      fullWidth
                      label="Auth Token"
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      placeholder="Bearer token for API auth"
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconKey size={18} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Collapse>
              </Box>

              {/* Supported File Types Info */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  p: 2,
                  mt: 3,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconDatabase size={20} color="#1976d2" />
                  <Typography variant="caption" color="text.secondary" fontWeight="600">
                    Supported File Types
                  </Typography>
                </Box>
                <Box sx={{ pl: 3.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Data files: CSV, JSON, PDF, Excel (XLSX, XLS)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Archives: ZIP, GZ, TAR.GZ (will be downloaded and stored in S3)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Paper>

          {/* URL Preview */}
          {url && !error && validateUrl(url) && (
            <Paper elevation={0} sx={{ mt: 3, bgcolor: "primary.lighter", border: 1, borderColor: "primary.light" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {url}
                      </Typography>
                      {isZipFile(url) && (
                        <Chip
                          icon={<IconFileZip size={14} />}
                          label="Archive"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    {isZipFile(url) && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Archive file will be downloaded and stored in S3
                      </Typography>
                    )}
                  </Box>
                  <IconCheck color="#00c292" size={28} />
                </Box>
              </CardContent>
            </Paper>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={() => setSourceType(null)} size="large">
              Back
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleGenericUrlSubmit}
              disabled={!url.trim() || !validateUrl(url)}
              size="large"
              startIcon={<IconCloudUpload />}
            >
              Upload to AWS S3
            </Button>
          </Box>
        </>
      )}

      {/* Prompt to select source type */}
      {!sourceType && !isUploading && (
        <Paper elevation={0} sx={{ mt: 3, p: 3, bgcolor: "grey.50", border: 1, borderColor: "divider", textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            Select a data source type above to continue
          </Typography>
        </Paper>
      )}

      {/* Back button when no source type selected */}
      {!sourceType && !isUploading && (
        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button variant="outlined" fullWidth onClick={onBack} size="large">
            Back to Data Input
          </Button>
        </Box>
      )}
    </Box>
  )
}
