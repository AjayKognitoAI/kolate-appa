"use client"

import { useState, useCallback } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import {
  CloudUpload,
  CheckCircle,
  Description,
  TableChart,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType } from "@/types/cohort.types"

interface DataUploadStepProps {
  onUpload: (data: PatientData[], columns: Record<string, ColumnType>, file?: File) => void
  uploadedCount: number
}

const CATEGORICAL_THRESHOLD = 0.1 // If unique values are less than 10% of total, consider it categorical

export function DataUploadStep({ onUpload, uploadedCount }: DataUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PatientData[]>([])
  const [previewColumns, setPreviewColumns] = useState<Record<string, ColumnType>>({})

  const inferColumnTypes = (data: PatientData[]): Record<string, ColumnType> => {
    if (data.length === 0) return {}

    const columns: Record<string, ColumnType> = {}
    const sampleSize = Math.min(data.length, 100)
    const sample = data.slice(0, sampleSize)

    Object.keys(data[0]).forEach((key) => {
      const values = sample.map((row) => row[key]).filter((v) => v !== null && v !== undefined && v !== "")

      if (values.length === 0) {
        columns[key] = "string"
        return
      }

      // Check if all values are numbers
      const isNumber = values.every((v) => !isNaN(Number(v)) && typeof v !== "boolean")

      if (isNumber) {
        columns[key] = "number"
      } else {
        // Check if it's categorical (limited unique values)
        const uniqueValues = new Set(values.map((v) => String(v).toLowerCase()))
        const uniqueRatio = uniqueValues.size / values.length

        // Consider categorical if:
        // 1. Less than 10% unique values, OR
        // 2. Less than 20 unique values total
        if (uniqueRatio < CATEGORICAL_THRESHOLD || uniqueValues.size <= 20) {
          columns[key] = "categorical"
        } else {
          columns[key] = "string"
        }
      }
    })

    return columns
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

      const columns = inferColumnTypes(data)
      setPreviewData(data)
      setPreviewColumns(columns)
      onUpload(data, columns, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
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

  const previewColumnKeys = Object.keys(previewColumns)

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Upload Patient Data
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Upload your patient data file. Supported formats: CSV, JSON, Excel (.xlsx, .xls)
      </Typography>

      {/* Upload Area */}
      <Paper
        elevation={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: 6,
          border: isDragging ? "2px dashed #1976d2" : "2px dashed #d1d5db",
          borderRadius: 2,
          bgcolor: isDragging ? "action.hover" : "transparent",
          textAlign: "center",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          type="file"
          id="file-input"
          accept=".csv,.json,.xlsx,.xls"
          onChange={handleFileInput}
          style={{ display: "none" }}
        />

        {isLoading ? (
          <Box>
            <LinearProgress sx={{ mb: 2, maxWidth: 300, mx: "auto" }} />
            <Typography variant="body1">Processing file...</Typography>
          </Box>
        ) : uploadedCount > 0 ? (
          <Box>
            <CheckCircle sx={{ fontSize: 48, color: "success.main", mb: 2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Data Uploaded Successfully
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={2}>
              {uploadedCount} patient records loaded
            </Typography>
            <Button variant="outlined" startIcon={<CloudUpload />}>
              Upload Different File
            </Button>
          </Box>
        ) : (
          <Box>
            <CloudUpload sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Drag & Drop Your File
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              or click to browse
            </Typography>
            <Box display="flex" justifyContent="center" gap={1}>
              <Chip icon={<Description />} label="CSV" size="small" variant="outlined" />
              <Chip icon={<Description />} label="JSON" size="small" variant="outlined" />
              <Chip icon={<TableChart />} label="Excel" size="small" variant="outlined" />
            </Box>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Preview */}
      {previewData.length > 0 && (
        <Box mt={4}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Data Preview (first 5 rows)
          </Typography>

          <Box display="flex" gap={1} mb={2}>
            {Object.entries(previewColumns).slice(0, 5).map(([col, type]) => (
              <Chip
                key={col}
                label={`${col}: ${type}`}
                size="small"
                color={type === "number" ? "primary" : type === "categorical" ? "secondary" : "default"}
                variant="outlined"
              />
            ))}
            {previewColumnKeys.length > 5 && (
              <Chip label={`+${previewColumnKeys.length - 5} more`} size="small" variant="outlined" />
            )}
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #ececf1", maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {previewColumnKeys.slice(0, 6).map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx} hover>
                    {previewColumnKeys.slice(0, 6).map((col) => (
                      <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  )
}
