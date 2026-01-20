"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  StepIconProps,
} from "@mui/material"
import {
  CloudUpload,
  Description,
  TableChart,
  CheckCircle,
  Error as ErrorIcon,
  ArrowForward,
  ArrowBack,
  AutoAwesome,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType, ColumnDescription, ColumnMetadataInput, EnhancedColumnSchema } from "@/types/cohort.types"
import { detectPatientIdColumn, getDirtyDataStatistics } from "@/utils/patient-id-utils"
import { ColumnReviewStep } from "./column-review-step"
import cohortService from "@/services/patient-enrollment/cohort-service"

interface MasterDataUploadDialogProps {
  open: boolean
  onClose: () => void
  onUpload: (
    file: File,
    rowCount: number,
    patientIdColumn: string,
    enhancedColumns: EnhancedColumnSchema
  ) => Promise<void>
}

const CATEGORICAL_THRESHOLD = 0.1

// Date format patterns for detection
const DATE_PATTERNS = [
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,           // ISO: 2024-01-15, 2024/01/15
  /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,           // US/EU: 01/15/2024, 15-01-2024
  /^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/,           // Short year: 01/15/24
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}$/,     // Month name: January 15, 2024
  /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/,       // EU text: 15 January 2024
]

// Check if a value looks like a valid date
function isValidDateValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false
  const strValue = String(value).trim()

  // Check if it matches any date pattern
  const matchesPattern = DATE_PATTERNS.some((pattern) => pattern.test(strValue))
  if (!matchesPattern) return false

  // Validate it actually parses to a valid date
  const parsed = new Date(strValue)
  if (isNaN(parsed.getTime())) return false

  // Sanity check: year should be reasonable (1900-2100)
  const year = parsed.getFullYear()
  return year > 1900 && year < 2100
}

// Simplified 2-step flow
type UploadStep = "upload" | "review"

const STEPS: { key: UploadStep; label: string; icon: React.ReactNode }[] = [
  { key: "upload", label: "Upload File", icon: <CloudUpload /> },
  { key: "review", label: "Review Columns", icon: <AutoAwesome /> },
]

// Custom step icon component with soft colors
function CustomStepIcon(props: StepIconProps & { stepIcon: React.ReactNode }) {
  const { active, completed, stepIcon } = props

  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: completed ? "#e8f5e9" : active ? "#e3f2fd" : "#f5f5f5",
        color: completed ? "#2e7d32" : active ? "#1565c0" : "#9e9e9e",
        border: completed ? "2px solid #a5d6a7" : active ? "2px solid #90caf9" : "2px solid #e0e0e0",
        transition: "all 0.2s",
      }}
    >
      {completed ? <CheckCircle sx={{ fontSize: 20 }} /> : stepIcon}
    </Box>
  )
}

export function MasterDataUploadDialog({
  open,
  onClose,
  onUpload,
}: MasterDataUploadDialogProps) {
  const [step, setStep] = useState<UploadStep>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PatientData[]>([])
  const [columns, setColumns] = useState<Record<string, ColumnType>>({})
  const [selectedPatientIdColumn, setSelectedPatientIdColumn] = useState<string>("")

  // Column description state
  const [columnDescriptions, setColumnDescriptions] = useState<ColumnDescription[]>([])
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [regeneratingColumn, setRegeneratingColumn] = useState<string | null>(null)

  // Auto-detect patient ID column when data is loaded
  useEffect(() => {
    if (previewData.length > 0 && Object.keys(columns).length > 0) {
      const detected = detectPatientIdColumn(previewData, columns)
      if (detected) {
        setSelectedPatientIdColumn(detected)
      }
    }
  }, [previewData, columns])

  // Calculate dirty data statistics
  const dirtyDataStats = useMemo(() => {
    if (previewData.length === 0 || Object.keys(columns).length === 0) {
      return null
    }
    return getDirtyDataStatistics(previewData, Object.keys(columns))
  }, [previewData, columns])

  // Handle patient ID column change
  const handlePatientIdChange = (columnName: string) => {
    setSelectedPatientIdColumn(columnName)
  }

  const inferColumnTypes = (data: PatientData[]): Record<string, ColumnType> => {
    if (data.length === 0) return {}

    const cols: Record<string, ColumnType> = {}
    const sampleSize = Math.min(data.length, 100)
    const sample = data.slice(0, sampleSize)

    Object.keys(data[0]).forEach((key) => {
      const values = sample.map((row) => row[key]).filter((v) => v !== null && v !== undefined && v !== "")

      if (values.length === 0) {
        cols[key] = "string"
        return
      }

      // Check for date type first (before number, as some date formats might be numeric)
      const isDate = values.every((v) => isValidDateValue(v))
      if (isDate && values.length > 0) {
        cols[key] = "date"
        return
      }

      const isNumber = values.every((v) => !isNaN(Number(v)) && typeof v !== "boolean")

      if (isNumber) {
        cols[key] = "number"
      } else {
        const uniqueValues = new Set(values.map((v) => String(v).toLowerCase()))
        const uniqueRatio = uniqueValues.size / values.length

        if (uniqueRatio < CATEGORICAL_THRESHOLD || uniqueValues.size <= 20) {
          cols[key] = "categorical"
        } else {
          cols[key] = "string"
        }
      }
    })

    return cols
  }

  const parseCSV = (text: string): PatientData[] => {
    const lines = text.trim().split("\n")
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
    const data: PatientData[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
      const row: PatientData = {}
      headers.forEach((header, idx) => {
        const value = values[idx] || ""
        const numValue = Number(value)
        row[header] = !isNaN(numValue) && value !== "" ? numValue : value
      })
      data.push(row)
    }

    return data
  }

  const parseJSON = (text: string): PatientData[] => {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  }

  const parseExcel = async (buffer: ArrayBuffer): Promise<PatientData[]> => {
    const workbook = XLSX.read(buffer, { type: "array" })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<PatientData>(firstSheet)
    return data
  }

  const handleFile = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      let data: PatientData[] = []

      if (file.name.endsWith(".csv")) {
        const text = await file.text()
        data = parseCSV(text)
      } else if (file.name.endsWith(".json")) {
        const text = await file.text()
        data = parseJSON(text)
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer()
        data = await parseExcel(buffer)
      } else {
        throw new Error("Unsupported file format. Please upload CSV, JSON, or Excel files.")
      }

      if (data.length === 0) {
        throw new Error("No data found in the file.")
      }

      const cols = inferColumnTypes(data)
      setSelectedFile(file)
      setPreviewData(data)
      setColumns(cols)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
      setSelectedFile(null)
      setPreviewData([])
      setColumns({})
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  // Generate column descriptions using AI in batches of 10
  const generateColumnDescriptions = useCallback(async () => {
    if (Object.keys(columns).length === 0 || previewData.length === 0) return

    setIsGeneratingDescriptions(true)
    setDescriptionError(null)
    setColumnDescriptions([]) // Clear previous descriptions

    try {
      // Prepare column metadata with sample values for better AI accuracy
      const columnMetadata: ColumnMetadataInput[] = Object.entries(columns).map(([name, type]) => {
        const sampleValues = previewData
          .slice(0, 10)
          .map((row) => row[name])
          .filter((v) => v !== null && v !== undefined && v !== "")
          .slice(0, 5)

        return {
          name,
          data_type: type,
          sample_values: sampleValues as (string | number | boolean | null)[],
        }
      })

      const BATCH_SIZE = 10
      const batches: ColumnMetadataInput[][] = []

      // Split columns into batches of 10
      for (let i = 0; i < columnMetadata.length; i += BATCH_SIZE) {
        batches.push(columnMetadata.slice(i, i + BATCH_SIZE))
      }

      // Process all batches in parallel and display results as they arrive
      const batchPromises = batches.map(async (batch) => {
        try {
          const response = await cohortService.generateColumnDescriptions({
            columns: batch,
          })

          if (response.status === "success" && response.data.descriptions) {
            // Immediately update state as soon as this batch completes
            setColumnDescriptions((prev) => [...prev, ...response.data.descriptions])
          } else {
            throw new Error(response.message || "Failed to generate descriptions")
          }
        } catch (err) {
          console.error("Error generating batch descriptions:", err)
          throw err
        }
      })

      // Wait for all batches to complete
      await Promise.all(batchPromises)
    } catch (err) {
      console.error("Error generating column descriptions:", err)
      setDescriptionError(
        err instanceof Error ? err.message : "Failed to generate column descriptions. Please try again."
      )
    } finally {
      setIsGeneratingDescriptions(false)
    }
  }, [columns, previewData])

  // Regenerate description for a single column
  const regenerateSingleColumn = useCallback(async (columnName: string) => {
    if (!columns[columnName] || previewData.length === 0) return

    setRegeneratingColumn(columnName)

    try {
      const sampleValues = previewData
        .slice(0, 10)
        .map((row) => row[columnName])
        .filter((v) => v !== null && v !== undefined && v !== "")
        .slice(0, 5)

      const columnMetadata: ColumnMetadataInput[] = [{
        name: columnName,
        data_type: columns[columnName],
        sample_values: sampleValues as (string | number | boolean | null)[],
      }]

      const response = await cohortService.generateColumnDescriptions({
        columns: columnMetadata,
      })

      if (response.status === "success" && response.data.descriptions.length > 0) {
        const newDescription = response.data.descriptions[0]
        setColumnDescriptions((prev) => {
          const updated = prev.filter((d) => d.column_name !== columnName)
          return [...updated, newDescription]
        })
      }
    } catch (err) {
      console.error("Error regenerating column description:", err)
    } finally {
      setRegeneratingColumn(null)
    }
  }, [columns, previewData])

  const handleNext = () => {
    if (step === "upload") {
      // Move to review step and auto-generate AI descriptions
      setStep("review")
      // Generate descriptions if not already generated
      if (columnDescriptions.length === 0) {
        generateColumnDescriptions()
      }
    }
  }

  const handleBack = () => {
    if (step === "review") {
      setStep("upload")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedPatientIdColumn) return

    setIsLoading(true)
    setError(null)

    try {
      // Build enhanced column schema with all metadata
      const enhancedColumns: EnhancedColumnSchema = {}

      // Map column descriptions by column name for quick lookup
      const descriptionMap = new Map<string, ColumnDescription>()
      columnDescriptions.forEach((desc) => {
        descriptionMap.set(desc.column_name, desc)
      })

      // Build enhanced metadata for each column
      Object.entries(columns).forEach(([columnName, columnType]) => {
        // Get sample values (first 5 non-null values)
        const sampleValues = previewData
          .slice(0, 20)
          .map((row) => row[columnName])
          .filter((v) => v !== null && v !== undefined && v !== "")
          .slice(0, 5)

        // Count unique values
        const uniqueValues = new Set(
          previewData
            .map((row) => row[columnName])
            .filter((v) => v !== null && v !== undefined && v !== "")
        )

        // Get null count from dirty data stats
        const nullCount = dirtyDataStats?.columnStats[columnName] || 0

        // Get AI-generated description if available
        const aiDescription = descriptionMap.get(columnName)

        enhancedColumns[columnName] = {
          type: columnType,
          description: aiDescription?.clinical_description || null,
          category: aiDescription?.category || null,
          confidence_score: aiDescription?.confidence_score || null,
          abbreviation_expansion: aiDescription?.abbreviation_expansion || null,
          unit_of_measure: aiDescription?.unit_of_measure || null,
          reference_range: aiDescription?.reference_range || null,
          sample_values: sampleValues as (string | number | boolean | null)[],
          unique_count: uniqueValues.size,
          null_count: nullCount,
        }
      })

      await onUpload(
        selectedFile,
        previewData.length,
        selectedPatientIdColumn,
        enhancedColumns
      )
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep("upload")
    setSelectedFile(null)
    setPreviewData([])
    setColumns({})
    setSelectedPatientIdColumn("")
    setError(null)
    setColumnDescriptions([])
    setDescriptionError(null)
    setIsGeneratingDescriptions(false)
    onClose()
  }

  // Get current step index for stepper
  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={step === "upload" ? "sm" : "lg"}
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CloudUpload color="primary" />
          Upload Master Data
        </Box>
        <Stepper activeStep={currentStepIndex} alternativeLabel>
          {STEPS.map((s, index) => (
            <Step key={s.key} completed={index < currentStepIndex}>
              <StepLabel
                StepIconComponent={(props) => (
                  <CustomStepIcon {...props} stepIcon={s.icon} />
                )}
              >
                {s.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>
      <DialogContent sx={{ overflow: step === "review" ? "hidden" : "auto", pb: 1 }}>
        <Box pt={1} sx={{ height: step === "review" ? "auto" : "auto", maxHeight: step === "review" ? "calc(80vh - 200px)" : "auto" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === "upload" ? (
            <>
              <Paper
                elevation={0}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                sx={{
                  p: 4,
                  border: isDragging ? "2px dashed #1976d2" : "2px dashed #90caf9",
                  borderRadius: 3,
                  bgcolor: isDragging ? "#e3f2fd" : "linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)",
                  background: isDragging
                    ? "#e3f2fd"
                    : "linear-gradient(135deg, #fafbfc 0%, #f0f4f8 100%)",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "#42a5f5",
                    background: "linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.15)",
                  },
                }}
                onClick={() => document.getElementById("upload-file-input")?.click()}
              >
                <input
                  type="file"
                  id="upload-file-input"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />

                {isLoading ? (
                  <Box>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        bgcolor: "#e3f2fd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                      }}
                    >
                      <CloudUpload sx={{ fontSize: 32, color: "#1976d2" }} />
                    </Box>
                    <LinearProgress sx={{ mb: 2, maxWidth: 200, mx: "auto", borderRadius: 1 }} />
                    <Typography variant="body1" color="text.secondary">Processing file...</Typography>
                  </Box>
                ) : selectedFile ? (
                  <Box>
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        bgcolor: "#e8f5e9",
                        border: "3px solid #a5d6a7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                      }}
                    >
                      <CheckCircle sx={{ fontSize: 40, color: "#2e7d32" }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom color="success.dark">
                      {selectedFile.name}
                    </Typography>
                    <Box display="flex" gap={2} justifyContent="center" mb={2}>
                      <Chip
                        label={`${previewData.length.toLocaleString()} rows`}
                        size="small"
                        sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 500 }}
                      />
                      <Chip
                        label={`${Object.keys(columns).length} columns`}
                        size="small"
                        sx={{ bgcolor: "#f3e5f5", color: "#7b1fa2", fontWeight: 500 }}
                      />
                    </Box>
                    <Box display="flex" gap={0.5} justifyContent="center" flexWrap="wrap">
                      {Object.entries(columns).slice(0, 4).map(([col, type]) => (
                        <Chip
                          key={col}
                          label={col}
                          size="small"
                          sx={{
                            bgcolor: type === "number" ? "#e3f2fd" : type === "categorical" ? "#f3e5f5" : "#f5f5f5",
                            color: type === "number" ? "#1565c0" : type === "categorical" ? "#7b1fa2" : "#424242",
                            fontSize: "0.7rem",
                          }}
                        />
                      ))}
                      {Object.keys(columns).length > 4 && (
                        <Chip
                          label={`+${Object.keys(columns).length - 4} more`}
                          size="small"
                          sx={{ bgcolor: "#fff3e0", color: "#e65100", fontSize: "0.7rem" }}
                        />
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                        border: "3px solid #90caf9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                        transition: "all 0.3s",
                      }}
                    >
                      <CloudUpload sx={{ fontSize: 40, color: "#1976d2" }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary">
                      Drag & Drop Your File
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      or click to browse your computer
                    </Typography>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Chip
                        icon={<Description sx={{ fontSize: 16 }} />}
                        label="CSV"
                        size="small"
                        sx={{
                          bgcolor: "#e8f5e9",
                          color: "#2e7d32",
                          border: "1px solid #a5d6a7",
                          "& .MuiChip-icon": { color: "#2e7d32" },
                        }}
                      />
                      <Chip
                        icon={<Description sx={{ fontSize: 16 }} />}
                        label="JSON"
                        size="small"
                        sx={{
                          bgcolor: "#fff3e0",
                          color: "#e65100",
                          border: "1px solid #ffcc80",
                          "& .MuiChip-icon": { color: "#e65100" },
                        }}
                      />
                      <Chip
                        icon={<TableChart sx={{ fontSize: 16 }} />}
                        label="Excel"
                        size="small"
                        sx={{
                          bgcolor: "#e3f2fd",
                          color: "#1565c0",
                          border: "1px solid #90caf9",
                          "& .MuiChip-icon": { color: "#1565c0" },
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </Paper>

              {/* Patient ID Column Selection */}
              {selectedFile && previewData.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: 3,
                    background: selectedPatientIdColumn
                      ? "linear-gradient(135deg, #f1f8e9 0%, #e8f5e9 100%)"
                      : "linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)",
                    border: selectedPatientIdColumn
                      ? "2px solid #a5d6a7"
                      : "2px solid #ffcc80",
                    transition: "all 0.3s ease",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        bgcolor: selectedPatientIdColumn ? "#e8f5e9" : "#fff3e0",
                        border: selectedPatientIdColumn ? "2px solid #81c784" : "2px solid #ffb74d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selectedPatientIdColumn ? (
                        <CheckCircle sx={{ fontSize: 22, color: "#2e7d32" }} />
                      ) : (
                        <ErrorIcon sx={{ fontSize: 22, color: "#f57c00" }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600} color={selectedPatientIdColumn ? "#2e7d32" : "#e65100"}>
                        Patient ID Column
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Choose the column that uniquely identifies each patient
                      </Typography>
                    </Box>
                  </Box>

                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedPatientIdColumn}
                      displayEmpty
                      onChange={(e) => handlePatientIdChange(e.target.value)}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            maxHeight: 350,
                            borderRadius: 2,
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                          },
                        },
                      }}
                      sx={{
                        bgcolor: "white",
                        borderRadius: 2,
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: selectedPatientIdColumn ? "#81c784" : "#ffb74d",
                          borderWidth: 2,
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: selectedPatientIdColumn ? "#66bb6a" : "#ffa726",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: selectedPatientIdColumn ? "#4caf50" : "#ff9800",
                        },
                      }}
                      renderValue={(selected) => {
                        if (!selected) {
                          return <Typography color="text.secondary">Select a column...</Typography>
                        }
                        return (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontWeight={500}>{selected}</Typography>
                            <Chip
                              label={columns[selected]}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                bgcolor: columns[selected] === "number" ? "#e3f2fd" : columns[selected] === "categorical" ? "#f3e5f5" : "#f5f5f5",
                                color: columns[selected] === "number" ? "#1565c0" : columns[selected] === "categorical" ? "#7b1fa2" : "#424242",
                                border: columns[selected] === "number" ? "1px solid #90caf9" : columns[selected] === "categorical" ? "1px solid #ce93d8" : "1px solid #e0e0e0",
                              }}
                            />
                          </Box>
                        )
                      }}
                    >
                      {Object.keys(columns).map((columnName) => (
                        <MenuItem
                          key={columnName}
                          value={columnName}
                          sx={{
                            py: 1.5,
                            "&:hover": {
                              bgcolor: "#f5f5f5",
                            },
                            "&.Mui-selected": {
                              bgcolor: "#e8f5e9",
                              "&:hover": { bgcolor: "#c8e6c9" },
                            },
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1} width="100%">
                            <Typography variant="body2" fontWeight={columnName === selectedPatientIdColumn ? 600 : 400}>
                              {columnName}
                            </Typography>
                            <Box flex={1} />
                            <Chip
                              label={columns[columnName]}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: "0.7rem",
                                bgcolor: columns[columnName] === "number" ? "#e3f2fd" : columns[columnName] === "categorical" ? "#f3e5f5" : "#f5f5f5",
                                color: columns[columnName] === "number" ? "#1565c0" : columns[columnName] === "categorical" ? "#7b1fa2" : "#424242",
                                border: columns[columnName] === "number" ? "1px solid #90caf9" : columns[columnName] === "categorical" ? "1px solid #ce93d8" : "1px solid #e0e0e0",
                              }}
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedPatientIdColumn && (
                    <Box display="flex" alignItems="center" gap={0.5} mt={1.5}>
                      <CheckCircle sx={{ fontSize: 16, color: "#2e7d32" }} />
                      <Typography variant="caption" color="#2e7d32" fontWeight={500}>
                        Ready to proceed with &quot;{selectedPatientIdColumn}&quot; as the patient identifier
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {!selectedPatientIdColumn && selectedFile && previewData.length > 0 && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                    bgcolor: "#fff8e1",
                    border: "1px solid #ffcc80",
                    "& .MuiAlert-icon": { color: "#f57c00" },
                  }}
                >
                  A patient ID column is required to proceed. Please select a column with unique values.
                </Alert>
              )}
            </>
          ) : (
            /* Combined Review Step: Column Types + AI Descriptions */
            <ColumnReviewStep
              columns={columns}
              data={previewData}
              descriptions={columnDescriptions}
              onColumnsChange={setColumns}
              onDescriptionsChange={setColumnDescriptions}
              isLoadingDescriptions={isGeneratingDescriptions}
              descriptionError={descriptionError}
              onRetryDescriptions={generateColumnDescriptions}
              onRegenerateSingleColumn={regenerateSingleColumn}
              regeneratingColumn={regeneratingColumn}
              dirtyDataStats={dirtyDataStats}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading || isGeneratingDescriptions}>
          Cancel
        </Button>

        {step === "review" && (
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            disabled={isLoading || isGeneratingDescriptions}
          >
            Back
          </Button>
        )}

        {step === "upload" && (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleNext}
            disabled={isLoading || !selectedFile || !selectedPatientIdColumn}
          >
            Next: Review Columns
          </Button>
        )}

        {step === "review" && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={isLoading || isGeneratingDescriptions}
          >
            {isLoading ? "Uploading..." : "Upload"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
