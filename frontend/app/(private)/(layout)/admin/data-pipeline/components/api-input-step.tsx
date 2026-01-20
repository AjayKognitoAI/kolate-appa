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
  InputAdornment,
} from "@mui/material"
import {
  IconArrowLeft,
  IconCheck,
  IconCloudUpload,
  IconDatabase,
  IconAlertCircle,
  IconList,
  IconFolder,
  IconApi,
  IconLink,
  IconKey,
  IconNumbers,
} from "@tabler/icons-react"
import { dataPipelineService, ScrapyTaskResponse } from "@/services/data-pipeline/data-pipeline-service"
import { useRouter } from "next/navigation"

interface ApiInputStepProps {
  onNext: (data: { dataUrl: string; taskId?: string; s3Key?: string }) => void
  onBack: () => void
  trialSlug?: string | null
}

const UPLOAD_STEPS = [
  "Connecting to API",
  "Fetching paginated data",
  "Processing JSON responses",
  "Uploading to AWS S3",
  "Complete"
]

export default function ApiInputStep({ onNext, onBack, trialSlug }: ApiInputStepProps) {
  const router = useRouter()

  // Form state
  const [url, setUrl] = useState("")
  const [datasetName, setDatasetName] = useState("")
  const [pages, setPages] = useState(1)
  const [pageParam, setPageParam] = useState("page")
  const [authToken, setAuthToken] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

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

  const getStepFromStatus = (status: string, filesCount: number): number => {
    if (status === "completed") return 4
    if (status === "running") {
      if (filesCount > 0) return 2
      return 1
    }
    if (status === "pending") return 0
    return 0
  }

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString)
      return true
    } catch {
      return false
    }
  }

  const extractDatasetName = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString)
      const pathname = urlObj.pathname
      const parts = pathname.split('/').filter(Boolean)
      return parts[parts.length - 1] || urlObj.hostname.replace(/\./g, '-') + '-api'
    } catch {
      return "api-data"
    }
  }

  const handleNext = async () => {
    if (!url.trim()) {
      setError("Please enter an API endpoint URL")
      return
    }
    if (!validateUrl(url)) {
      setError("Please enter a valid URL")
      return
    }
    if (pages < 1 || pages > 1000) {
      setError("Pages must be between 1 and 1000")
      return
    }

    setError("")
    setIsUploading(true)
    setUploadStep(0)
    setFilesDownloaded(0)
    setTotalBytes(0)

    try {
      const finalDatasetName = datasetName.trim() || extractDatasetName(url)

      const task = await dataPipelineService.downloadFromApi({
        url: url.trim(),
        dataset_name: finalDatasetName,
        pages,
        page_param: pageParam.trim() || "page",
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        auth_token: authToken.trim() || undefined,
        trial_slug: trialSlug || undefined,
      })

      setTaskId(task.task_id)

      const completedTask = await dataPipelineService.pollScrapyTaskStatus(
        task.task_id,
        (taskUpdate: ScrapyTaskResponse) => {
          setFilesDownloaded(taskUpdate.files_downloaded || 0)
          setTotalBytes(taskUpdate.total_bytes || 0)
          const step = getStepFromStatus(taskUpdate.status, taskUpdate.files_downloaded || 0)
          setUploadStep(step)
        }
      )

      setUploadStep(4)
      setUploadSuccess(true)

      await new Promise(resolve => setTimeout(resolve, 1500))

      onNext({
        dataUrl: url,
        taskId: completedTask.task_id,
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch API data"
      setError(errorMessage)
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
              <IconApi size={24} color="#2196f3" />
              <Typography variant="h4" fontWeight="bold">
                REST API
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isUploading ? "Fetching API data..." : "Download paginated data from REST APIs"}
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
                  bgcolor: uploadSuccess ? "success.main" : "info.main",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                {uploadSuccess ? <IconCheck size={32} /> : <IconApi size={32} />}
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {uploadSuccess ? "API Data Retrieved!" : "Fetching API Data"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, maxWidth: 500, mx: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
                        sx: { color: index <= uploadStep ? "primary.main" : "grey.300", width: 28, height: 28 },
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
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {filesDownloaded > 0 && `${filesDownloaded} pages fetched`}
                  {totalBytes > 0 && ` (${formatBytes(totalBytes)})`}
                </Typography>
                <LinearProgress sx={{ mt: 2, height: 6, borderRadius: 3 }} />
              </Box>
            )}

            {uploadSuccess && (
              <Alert severity="success" icon={<IconCheck />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  API data successfully fetched and uploaded to AWS S3
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Paper>
      )}

      {/* Form */}
      {!isUploading && (
        <>
          <Paper elevation={0} sx={{ border: 1, borderColor: "divider" }}>
            <CardContent sx={{ p: 3 }}>
              {/* API Endpoint URL Field */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconLink size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    API Endpoint URL *
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/data or https://api.example.com/v1/records"
                  helperText="REST API endpoint that returns JSON data"
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
                  placeholder="my-api-data"
                  helperText="Custom name for the dataset"
                  variant="outlined"
                />
              </Box>

              {/* Pagination Options */}
              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                  sx={{ flex: 1 }}
                  label="Number of Pages"
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                  helperText="Pages to fetch (1-1000)"
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconNumbers size={18} />
                      </InputAdornment>
                    ),
                    inputProps: { min: 1, max: 1000 }
                  }}
                />
                <TextField
                  sx={{ flex: 1 }}
                  label="Page Parameter"
                  value={pageParam}
                  onChange={(e) => setPageParam(e.target.value)}
                  placeholder="page"
                  helperText="Query param name for pagination"
                  variant="outlined"
                />
              </Box>

              {/* Authentication */}
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconKey size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    API Authentication
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (Optional - use Basic Auth OR Bearer Token)
                  </Typography>
                </Box>

                {/* Basic Auth */}
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    sx={{ flex: 1 }}
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="api-username"
                    helperText="For HTTP Basic Auth"
                    variant="outlined"
                    disabled={!!authToken}
                  />
                  <TextField
                    sx={{ flex: 1 }}
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="api-password"
                    helperText="For HTTP Basic Auth"
                    variant="outlined"
                    disabled={!!authToken}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mb: 2 }}>
                  — OR —
                </Typography>

                {/* Bearer Token */}
                <TextField
                  fullWidth
                  label="Bearer Token"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="your-api-token"
                  helperText="Will be sent as 'Authorization: Bearer <token>' header"
                  variant="outlined"
                  disabled={!!(username || password)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconKey size={18} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </CardContent>
          </Paper>

          {/* Info Box */}
          <Paper elevation={0} sx={{ mt: 3, bgcolor: "info.lighter", border: 1, borderColor: "info.light" }}>
            <CardContent>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                How API Data Download Works
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                The system will fetch each page of data from the API endpoint using the specified page parameter
                (e.g., ?page=1, ?page=2, etc.). JSON responses are saved and uploaded to S3 for processing.
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
              disabled={!url.trim() || !validateUrl(url)}
              size="large"
              startIcon={<IconCloudUpload />}
            >
              Fetch API Data
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
