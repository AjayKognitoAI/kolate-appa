"use client"

import { useState, useCallback } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import { CloudUpload, CheckCircle, TableChart, Settings, ArrowBack, ArrowForward } from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType } from "@/types/cohort.types"

interface UploadWizardProps {
  onUpload: (data: PatientData[], columns: Record<string, ColumnType>) => void
  existingColumns: Record<string, ColumnType>
  hasExistingData: boolean
}

const steps = ["Select File", "Preview Data", "Configure Columns"]

export function UploadWizard({ onUpload, existingColumns, hasExistingData }: UploadWizardProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PatientData[]>([])
  const [columns, setColumns] = useState<Record<string, ColumnType>>({})
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const inferColumnTypes = (data: PatientData[]): Record<string, ColumnType> => {
    if (data.length === 0) return {}

    const cols: Record<string, ColumnType> = {}
    const firstRow = data[0]

    Object.keys(firstRow).forEach((key) => {
      const values = data.map((row) => row[key]).filter((v) => v !== null && v !== undefined)
      const isNumber = values.every((v) => !isNaN(Number(v)) && v !== "")
      cols[key] = isNumber ? "number" : "string"
    })

    return cols
  }

  const parseCSV = (text: string): PatientData[] => {
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
      const row: PatientData = {}

      headers.forEach((header, index) => {
        const value = values[index]
        row[header] = isNaN(Number(value)) || value === "" ? value : Number(value)
      })

      return row
    })
  }

  const parseExcel = (buffer: ArrayBuffer): PatientData[] => {
    const workbook = XLSX.read(buffer, { type: "array" })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as PatientData[]
    return jsonData
  }

  const handleFile = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setError(null)

    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer
          const parsedData = parseExcel(buffer)
          setPreviewData(parsedData)
          setColumns(inferColumnTypes(parsedData))
          setActiveStep(1)
        } catch (err) {
          setError("Failed to parse Excel file. Please check the file format.")
        }
      }
      reader.readAsArrayBuffer(selectedFile)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          let parsedData: PatientData[] = []

          if (selectedFile.name.endsWith(".json")) {
            parsedData = JSON.parse(text)
          } else if (selectedFile.name.endsWith(".csv")) {
            parsedData = parseCSV(text)
          }

          setPreviewData(parsedData)
          setColumns(inferColumnTypes(parsedData))
          setActiveStep(1)
        } catch (err) {
          setError("Failed to parse file. Please check the file format.")
        }
      }
      reader.readAsText(selectedFile)
    }
  }, [])

  const isValidFile = (fileName: string): boolean => {
    return (
      fileName.endsWith(".json") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls")
    )
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && isValidFile(droppedFile.name)) {
        handleFile(droppedFile)
      } else {
        setError("Invalid file type. Please upload JSON, CSV, or Excel files.")
      }
    },
    [handleFile]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (isValidFile(selectedFile.name)) {
        handleFile(selectedFile)
      } else {
        setError("Invalid file type. Please upload JSON, CSV, or Excel files.")
      }
    }
  }

  const handleColumnTypeChange = (column: string, type: ColumnType) => {
    setColumns({ ...columns, [column]: type })
  }

  const handleComplete = () => {
    onUpload(previewData, columns)
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box display="flex" justifyContent="center">
            <Paper
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: 600,
                border: "1px solid #ececf1",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {hasExistingData && (
                <Alert severity="warning" sx={{ borderRadius: 0 }}>
                  Uploading a new file will replace the existing data.
                </Alert>
              )}
              <Box
                sx={{
                  p: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  border: "2px dashed",
                  borderColor: isDragging ? "primary.main" : "#d1d5db",
                  borderRadius: 2,
                  m: 2,
                  bgcolor: isDragging ? "action.hover" : "#fafbfc",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "#f5faff",
                  },
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: "primary.light",
                    color: "primary.main",
                  }}
                >
                  <CloudUpload sx={{ fontSize: 32 }} />
                </Avatar>

                <Box textAlign="center">
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Upload Patient Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Drag and drop your file here, or click to browse
                  </Typography>
                </Box>

                <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
                  <Chip label=".json" size="small" variant="outlined" />
                  <Chip label=".csv" size="small" variant="outlined" />
                  <Chip label=".xlsx" size="small" color="success" variant="outlined" />
                  <Chip label=".xls" size="small" color="success" variant="outlined" />
                </Box>

                <label htmlFor="file-upload-wizard">
                  <Button variant="contained" component="span">
                    Select File
                  </Button>
                  <input
                    id="file-upload-wizard"
                    type="file"
                    accept=".json,.csv,.xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={handleInputChange}
                  />
                </label>
              </Box>

              {error && (
                <Alert severity="error" sx={{ m: 2, mt: 0 }}>
                  {error}
                </Alert>
              )}
            </Paper>
          </Box>
        )

      case 1:
        return (
          <Box>
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Data Preview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {previewData.length} records loaded from {file?.name}
                </Typography>
              </Box>
              <Chip
                icon={<CheckCircle />}
                label={`${Object.keys(columns).length} columns detected`}
                color="success"
                variant="outlined"
              />
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #ececf1", maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(columns).map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>
                        <Box>
                          {col}
                          <Chip
                            label={columns[col]}
                            size="small"
                            sx={{ ml: 1 }}
                            color={columns[col] === "number" ? "primary" : "default"}
                          />
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx} hover>
                      {Object.keys(columns).map((col) => (
                        <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {previewData.length > 10 && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                Showing first 10 of {previewData.length} records
              </Typography>
            )}
          </Box>
        )

      case 2:
        return (
          <Box>
            <Box mb={3}>
              <Typography variant="h6" fontWeight={600}>
                Configure Column Types
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Adjust the data types for each column if needed
              </Typography>
            </Box>

            <Paper elevation={0} sx={{ border: "1px solid #ececf1" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafbfc" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Column Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Sample Values</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Data Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.keys(columns).map((col) => (
                    <TableRow key={col} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{col}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {previewData
                            .slice(0, 3)
                            .map((r) => String(r[col] ?? ""))
                            .join(", ")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={columns[col]}
                            onChange={(e) => handleColumnTypeChange(col, e.target.value as ColumnType)}
                          >
                            <MenuItem value="string">String</MenuItem>
                            <MenuItem value="number">Number</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}

      {activeStep > 0 && (
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => setActiveStep(activeStep - 1)}
          >
            Back
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={handleComplete}
            >
              Complete Upload
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<ArrowForward />}
              onClick={() => setActiveStep(activeStep + 1)}
            >
              Next
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}
