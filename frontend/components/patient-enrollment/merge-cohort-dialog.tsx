"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  TextField,
} from "@mui/material"
import {
  MergeType,
  CloudUpload,
  CheckCircle,
} from "@mui/icons-material"
import { useDropzone } from "react-dropzone"
import type { CohortApi, MergeResultData } from "@/types/cohort.types"

interface MergeCohortDialogProps {
  open: boolean
  studyId: string
  cohorts: CohortApi[]
  onClose: () => void
  onMerge: (
    sourceCohortId: string,
    mergeColumn: string,
    file: File,
    name?: string
  ) => Promise<MergeResultData>
}

const steps = ["Select Source", "Configure Merge", "Upload File", "Review"]

export function MergeCohortDialog({
  open,
  studyId,
  cohorts,
  onClose,
  onMerge,
}: MergeCohortDialogProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [sourceCohortId, setSourceCohortId] = useState("")
  const [mergeColumn, setMergeColumn] = useState("")
  const [masterDataName, setMasterDataName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergeResult, setMergeResult] = useState<MergeResultData | null>(null)

  const sourceCohort = cohorts.find((c) => c.id === sourceCohortId)
  const availableColumns = sourceCohort
    ? Object.keys(sourceCohort.columns)
    : []

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      const validExtensions = [".csv", ".xlsx", ".xls"]
      const hasValidExtension = validExtensions.some((ext) =>
        selectedFile.name.toLowerCase().endsWith(ext)
      )

      if (!hasValidExtension) {
        setError("Please upload a CSV or Excel file")
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  })

  const handleNext = () => {
    setError(null)

    if (activeStep === 0 && !sourceCohortId) {
      setError("Please select a source cohort")
      return
    }

    if (activeStep === 1 && !mergeColumn) {
      setError("Please select a merge column")
      return
    }

    if (activeStep === 2 && !file) {
      setError("Please upload a file")
      return
    }

    if (activeStep === 2) {
      // Perform merge
      handleMerge()
    } else {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
    setError(null)
  }

  const handleMerge = async () => {
    if (!sourceCohortId || !mergeColumn || !file) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onMerge(sourceCohortId, mergeColumn, file, masterDataName || undefined)
      setMergeResult(result)
      setActiveStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge cohort")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setSourceCohortId("")
    setMergeColumn("")
    setMasterDataName("")
    setFile(null)
    setError(null)
    setMergeResult(null)
    onClose()
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select the cohort whose filtered patients will be used as the base for merging.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Source Cohort</InputLabel>
              <Select
                value={sourceCohortId}
                label="Source Cohort"
                onChange={(e) => {
                  const cohortId = e.target.value
                  setSourceCohortId(cohortId)
                  setMergeColumn("") // Reset merge column when source changes
                  // Set default name based on selected cohort
                  const selectedCohort = cohorts.find((c) => c.id === cohortId)
                  if (selectedCohort) {
                    setMasterDataName(`${selectedCohort.name} - Merged`)
                  }
                }}
              >
                {cohorts.map((cohort) => (
                  <MenuItem key={cohort.id} value={cohort.id}>
                    {cohort.name} ({cohort.patient_count.toLocaleString()} patients)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {sourceCohort && (
              <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Cohort Details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sourceCohort.patient_count.toLocaleString()} patients matching filters
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Object.keys(sourceCohort.columns).length} columns available
                </Typography>
              </Paper>
            )}
          </Box>
        )

      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Configure the merge settings for the new master data.
            </Typography>
            <TextField
              fullWidth
              label="Master Data Name"
              value={masterDataName}
              onChange={(e) => setMasterDataName(e.target.value)}
              placeholder="Enter a name for the merged data"
              helperText="This name will help identify the merged dataset"
              sx={{ mb: 3 }}
            />
            <FormControl fullWidth>
              <InputLabel>Merge Column</InputLabel>
              <Select
                value={mergeColumn}
                label="Merge Column"
                onChange={(e) => setMergeColumn(e.target.value)}
              >
                {availableColumns.map((col) => (
                  <MenuItem key={col} value={col}>
                    {col}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ mt: 2 }}>
              The merge column must exist in both the source cohort data and your uploaded file.
            </Alert>
          </Box>
        )

      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Upload a file containing new columns to merge with the filtered patients from the source cohort.
            </Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: "2px dashed",
                borderColor: isDragActive ? "primary.main" : "#ccc",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                bgcolor: isDragActive ? "action.hover" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              {file ? (
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Drag & drop your file here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to browse (CSV, XLSX supported)
                  </Typography>
                </Box>
              )}
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
              Your file must contain the merge column &quot;{mergeColumn}&quot; to match with source cohort patients.
            </Alert>
          </Box>
        )

      case 3:
        return (
          <Box>
            {mergeResult && (
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <CheckCircle color="success" />
                  <Typography variant="h6">Merge Successful!</Typography>
                </Box>

                <Paper elevation={0} sx={{ p: 2, bgcolor: "#f5f5f5", mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Merge Results
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Typography variant="body2">
                      <strong>Source Cohort Patients:</strong>{" "}
                      {mergeResult.source_cohort_patient_count.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Matched Records:</strong>{" "}
                      {mergeResult.matched_count.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Unmatched Records:</strong>{" "}
                      {mergeResult.unmatched_count.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Rows in Result:</strong>{" "}
                      {mergeResult.merged_row_count.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Columns in Result:</strong>{" "}
                      {Object.keys(mergeResult.columns).length}
                    </Typography>
                  </Box>
                </Paper>

                <Alert severity="info">
                  A new master data file has been created with ID: {mergeResult.master_data_id}.
                  You can now create a new cohort from this merged data.
                </Alert>
              </Box>
            )}
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <MergeType color="primary" />
          Merge Cohort Data
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          {activeStep === 3 ? "Close" : "Cancel"}
        </Button>
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
        {activeStep < 3 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
          >
            {isSubmitting
              ? "Merging..."
              : activeStep === 2
              ? "Merge"
              : "Next"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
