"use client"

import React, { useState } from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Paper,
  Avatar,
} from "@mui/material"
import { IconFileUpload, IconArrowLeft, IconCheck } from "@tabler/icons-react"

interface FileUploadStepProps {
  onNext: (data: { uploadedFiles: File[] }) => void
  onBack: () => void
}

export default function FileUploadStep({ onNext, onBack }: FileUploadStepProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const isZipFile = (file: File) => file.name.toLowerCase().endsWith('.zip')
  const allFilesAreZip = uploadedFiles.length > 0 && uploadedFiles.every(isZipFile)

  const handleNext = () => {
    if (uploadedFiles.length > 0) {
      onNext({ uploadedFiles })
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} size="small">
          <IconArrowLeft />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Upload File
          </Typography>
          <Typography variant="body2" color="text.secondary">
            CSV, JSON, PDF, Excel, ZIP
          </Typography>
        </Box>
      </Box>

      <Paper
        sx={{
          p: 6,
          border: 2,
          borderStyle: "dashed",
          borderColor: dragActive ? "primary.main" : "divider",
          bgcolor: dragActive ? "primary.lighter" : "background.paper",
          cursor: "pointer",
          transition: "all 0.3s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "primary.lighter",
          },
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          accept=".csv,.json,.xlsx,.xls,.pdf,.zip"
          style={{ display: "none" }}
          id="file-input"
          multiple
        />
        <label htmlFor="file-input" style={{ cursor: "pointer", display: "block" }}>
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "primary.main",
                mx: "auto",
                mb: 2,
              }}
            >
              <IconFileUpload size={40} color="white" />
            </Avatar>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : "Drag and drop your files"}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported: CSV, JSON, PDF, Excel, ZIP
            </Typography>
          </Box>
        </label>
      </Paper>

      {/* File info if uploaded */}
      {uploadedFiles.length > 0 && (
        <Card sx={{ mt: 3, bgcolor: "primary.lighter", border: 1, borderColor: "primary.light" }}>
          <CardContent>
            {uploadedFiles.map((file, index) => (
              <Box key={index} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: index < uploadedFiles.length - 1 ? 2 : 0 }}>
                <Box>
                  <Typography variant="body1" fontWeight="bold">
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(file.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
                <IconCheck color="#00c292" size={28} />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <Button variant="outlined" fullWidth onClick={onBack} size="large">
          Back
        </Button>
        <Button variant="contained" fullWidth onClick={handleNext} disabled={uploadedFiles.length === 0} size="large">
          {allFilesAreZip ? "Upload to S3" : "Continue to Extract"}
        </Button>
      </Box>
    </Box>
  )
}
