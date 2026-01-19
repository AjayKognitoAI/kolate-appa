"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Box, Paper, Typography, Button, Avatar } from "@mui/material"
import { CloudUpload, InsertDriveFile, TableChart, Description } from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { PatientData } from "@/lib/screening-logic"
import type { ColumnType } from "@/types/cohort.types"

interface FileUploaderProps {
  onUpload: (data: PatientData[], columns: Record<string, ColumnType>) => void
}

export function FileUploader({ onUpload }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const inferColumnTypes = (data: PatientData[]): Record<string, ColumnType> => {
    if (data.length === 0) return {}

    const columns: Record<string, ColumnType> = {}
    const firstRow = data[0]

    Object.keys(firstRow).forEach((key) => {
      const values = data.map((row) => row[key]).filter((v) => v !== null && v !== undefined)
      const isNumber = values.every((v) => !isNaN(Number(v)) && v !== "")
      columns[key] = isNumber ? "number" : "string"
    })

    return columns
  }

  const parseCSV = (text: string): PatientData[] => {
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const row: PatientData = {}

      headers.forEach((header, index) => {
        const value = values[index]
        row[header] = isNaN(Number(value)) ? value : Number(value)
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

  const handleFile = useCallback(
    (file: File) => {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")

      if (isExcel) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer
          const parsedData = parseExcel(buffer)
          onUpload(parsedData, inferColumnTypes(parsedData))
        }
        reader.readAsArrayBuffer(file)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          let parsedData: PatientData[] = []

          if (file.name.endsWith(".json")) parsedData = JSON.parse(text)
          else if (file.name.endsWith(".csv")) parsedData = parseCSV(text)

          onUpload(parsedData, inferColumnTypes(parsedData))
        }
        reader.readAsText(file)
      }
    },
    [onUpload],
  )

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
      const file = e.dataTransfer.files[0]
      if (file && isValidFile(file.name)) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
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
          <Box display="flex" alignItems="center" gap={0.5}>
            <InsertDriveFile sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              .json
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <TableChart sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              .csv
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Description sx={{ fontSize: 18, color: "success.main" }} />
            <Typography variant="body2" color="success.main">
              .xlsx
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Description sx={{ fontSize: 18, color: "success.main" }} />
            <Typography variant="body2" color="success.main">
              .xls
            </Typography>
          </Box>
        </Box>

        <label htmlFor="file-upload">
          <Button variant="contained" component="span">
            Select File
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleInputChange}
          />
        </label>
      </Box>
    </Paper>
  )
}
