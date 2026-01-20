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
  FormControlLabel,
  Switch,
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
  IconFolderOpen,
  IconLink,
  IconFilter,
  IconLock,
  IconUser,
  IconChevronDown,
  IconChevronUp,
  IconKey,
} from "@tabler/icons-react"
import { dataPipelineService, ScrapyTaskResponse } from "@/services/data-pipeline/data-pipeline-service"
import { useRouter } from "next/navigation"

interface DirectoryInputStepProps {
  onNext: (data: { dataUrl: string; taskId?: string; s3Key?: string }) => void
  onBack: () => void
  trialSlug?: string | null
}

const UPLOAD_STEPS = [
  "Connecting to server",
  "Scanning directory",
  "Downloading files",
  "Uploading to AWS S3",
  "Complete"
]

export default function DirectoryInputStep({ onNext, onBack, trialSlug }: DirectoryInputStepProps) {
  const router = useRouter()

  // Form state
  const [url, setUrl] = useState("")
  const [datasetName, setDatasetName] = useState("")
  const [pattern, setPattern] = useState("")
  const [recursive, setRecursive] = useState(true)
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
      return parts[parts.length - 1] || urlObj.hostname.replace(/\./g, '-')
    } catch {
      return "directory-data"
    }
  }

  const handleNext = async () => {
    if (!url.trim()) {
      setError("Please enter a directory URL")
      return
    }
    if (!validateUrl(url)) {
      setError("Please enter a valid URL")
      return
    }

    setError("")
    setIsUploading(true)
    setUploadStep(0)
    setFilesDownloaded(0)
    setTotalBytes(0)

    try {
      const finalDatasetName = datasetName.trim() || extractDatasetName(url)

      const task = await dataPipelineService.downloadFromDirectory({
        url: url.trim(),
        dataset_name: finalDatasetName,
        pattern: pattern.trim() || undefined,
        recursive,
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
      const errorMessage = err instanceof Error ? err.message : "Failed to download from directory"
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
              <IconFolderOpen size={24} color="#ff9800" />
              <Typography variant="h4" fontWeight="bold">
                Directory Listing
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isUploading ? "Downloading from directory..." : "Apache/Nginx-style directory listings"}
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
                  bgcolor: uploadSuccess ? "success.main" : "warning.main",
                  mx: "auto",
                  mb: 1.5,
                }}
              >
                {uploadSuccess ? <IconCheck size={32} /> : <IconFolderOpen size={32} />}
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {uploadSuccess ? "Download Complete!" : "Scanning Directory Listing"}
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
                  {filesDownloaded > 0 && `${filesDownloaded} files downloaded`}
                  {totalBytes > 0 && ` (${formatBytes(totalBytes)})`}
                </Typography>
                <LinearProgress sx={{ mt: 2, height: 6, borderRadius: 3 }} />
              </Box>
            )}

            {uploadSuccess && (
              <Alert severity="success" icon={<IconCheck />} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Files successfully downloaded and uploaded to AWS S3
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
              {/* Directory URL Field */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <IconLink size={20} />
                  <Typography variant="body1" fontWeight="bold">
                    Directory URL *
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/files/ or https://ftp.example.com/data/"
                  helperText="URL of Apache/Nginx-style directory listing"
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
                  placeholder="my-directory-data"
                  helperText="Custom name for the dataset. If not provided, will be extracted from URL"
                  variant="outlined"
                />
              </Box>

              {/* Options */}
              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                  sx={{ flex: 2 }}
                  label="File Pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="\.(csv|json|txt)$"
                  helperText="Regex to filter files (optional)"
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconFilter size={18} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={recursive}
                        onChange={(e) => setRecursive(e.target.checked)}
                      />
                    }
                    label="Recursive"
                  />
                </Box>
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
            </CardContent>
          </Paper>

          {/* Info Box */}
          <Paper elevation={0} sx={{ mt: 3, bgcolor: "warning.lighter", border: 1, borderColor: "warning.light" }}>
            <CardContent>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Supported Directory Types
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Works with Apache, Nginx, and similar web servers that display directory listings.
                The crawler will follow links and download matching files.
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
              Download from Directory
            </Button>
          </Box>
        </>
      )}
    </Box>
  )
}
