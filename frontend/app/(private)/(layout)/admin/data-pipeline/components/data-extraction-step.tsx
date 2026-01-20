"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Modal,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material"
import { IconFileText, IconJson, IconCheck, IconAlertCircle, IconFile, IconRefresh, IconX, IconFileSpreadsheet, IconCloudUpload } from "@tabler/icons-react"
import { dataPipelineService, IngestFileResponse } from "@/services/data-pipeline/data-pipeline-service"

interface DataExtractionStepProps {
  onNext: (data: any) => void
  onPrevious: () => void
  data: any
}

interface ExtractedData {
  rows: any[]
  columns: string[]
  format: string
  s3_key?: string
  row_count?: number
}

interface FileExtractionState {
  file: File
  status: "pending" | "extracting" | "uploading" | "success" | "error"
  extractedData: ExtractedData | null
  error: string | null
}

export default function DataExtractionStep({ onNext, onPrevious, data }: DataExtractionStepProps) {
  const uploadedFiles: File[] = data.uploadedFiles || (data.uploadedFile ? [data.uploadedFile] : [])

  const [fileStates, setFileStates] = useState<FileExtractionState[]>(() => {
  if (Array.isArray(data.extractedFilesData) && data.extractedFilesData.length > 0) {
    return data.extractedFilesData as FileExtractionState[];
  }

  if (uploadedFiles.length > 0) {
    return uploadedFiles.map((file) => ({
      file,
      status: "pending" as const,
      extractedData: null,
      error: null,
    })) as FileExtractionState[];
  }

  return []; // safe, typed
});


  const [selectedTab, setSelectedTab] = useState(0)
  const [isExtractingAll, setIsExtractingAll] = useState(false)
  const [extractedFilesModalOpen, setExtractedFilesModalOpen] = useState(false)
  const [autoUploadTriggered, setAutoUploadTriggered] = useState<Set<number>>(new Set())

  const isZipFile = (file: File) => {
    return file.name.toLowerCase().endsWith('.zip')
  }

  // Auto-trigger upload for ZIP files when they are in pending state
  useEffect(() => {
    fileStates.forEach((state, index) => {
      if (
        state.status === "pending" &&
        isZipFile(state.file) &&
        !autoUploadTriggered.has(index)
      ) {
        setAutoUploadTriggered((prev) => new Set(prev).add(index))
        handleExtractSingle(index)
      }
    })
  }, [fileStates, autoUploadTriggered])

  const handleExtractSingle = async (index: number) => {
    const file = fileStates[index].file
    const isZip = isZipFile(file)

    setFileStates((prev) =>
      prev.map((state, i) =>
        i === index ? { ...state, status: isZip ? "uploading" : "extracting", error: null } : state
      )
    )

    try {
      console.log('[Data Extraction] Trial slug:', data.trialSlug);

      // For ZIP files, upload directly to S3 without extraction
      if (isZip) {
        const response = await dataPipelineService.uploadFile(file, undefined, data.trialSlug)

        const extractedInfo: ExtractedData = {
          format: "ZIP",
          columns: ["filename", "size", "status"],
          rows: [{ filename: file.name, size: `${(file.size / 1024).toFixed(2)} KB`, status: "Uploaded to S3 bucket" }],
          s3_key: response.s3_key,
          row_count: 1,
        }

        setFileStates((prev) =>
          prev.map((state, i) =>
            i === index
              ? { ...state, status: "success", extractedData: extractedInfo }
              : state
          )
        )
        return
      }

      // For other files, use the ingest endpoint for extraction
      const response: IngestFileResponse = await dataPipelineService.ingestFile(
        file,
        true,
        true,
        "bronze",
        data.trialSlug
      )

      let csvS3Key: string | null = null
      if (response.uploaded_files) {
        const csvFile = response.uploaded_files.find((f) => f.type === "csv")
        if (csvFile) {
          csvS3Key = csvFile.s3_key
        }
      }
      if (!csvS3Key && response.csv_file) {
        csvS3Key = response.csv_file.s3_key
      }

      if (csvS3Key) {
        const csvPreview = await dataPipelineService.fetchCsvPreview(csvS3Key, 100)

        const extractedInfo: ExtractedData = {
          format: "CSV",
          columns: csvPreview.columns,
          rows: csvPreview.rows,
          s3_key: csvS3Key,
          row_count: csvPreview.totalRows,
        }

        setFileStates((prev) =>
          prev.map((state, i) =>
            i === index
              ? { ...state, status: "success", extractedData: extractedInfo }
              : state
          )
        )
      } else {
        throw new Error("No CSV data in response")
      }
    } catch (err: any) {
      console.error("Extraction error:", err)
      setFileStates((prev) =>
        prev.map((state, i) =>
          i === index
            ? {
                ...state,
                status: "error",
                error: err.response?.data?.detail || err.message || "Failed to extract",
              }
            : state
        )
      )
    }
  }

  const handleExtractAll = async () => {
    setIsExtractingAll(true)

    for (let i = 0; i < fileStates.length; i++) {
      if (fileStates[i].status === "pending" || fileStates[i].status === "error") {
        await handleExtractSingle(i)
      }
    }

    setIsExtractingAll(false)
  }

  const handleRetry = (index: number) => {
    handleExtractSingle(index)
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)
  }

  const getStatusChip = (status: FileExtractionState["status"]) => {
    switch (status) {
      case "pending":
        return <Chip label="Pending" size="small" color="default" />
      case "extracting":
        return <Chip label="Extracting..." size="small" color="info" />
      case "uploading":
        return <Chip label="Uploading..." size="small" color="info" />
      case "success":
        return <Chip label="Complete" size="small" color="success" icon={<IconCheck size={14} />} />
      case "error":
        return <Chip label="Failed" size="small" color="error" icon={<IconAlertCircle size={14} />} />
    }
  }

  const allComplete = fileStates.every((s) => s.status === "success")
  const anyPending = fileStates.some((s) => s.status === "pending" || s.status === "error")
  const successCount = fileStates.filter((s) => s.status === "success").length
  const failedCount = fileStates.filter((s) => s.status === "error").length
  const pendingCount = fileStates.filter((s) => s.status === "pending").length
  const totalFiles = fileStates.length

  // Check if all files are ZIP files (for UI customization)
  const allFilesAreZip = fileStates.every((s) => isZipFile(s.file))
  const hasZipFiles = fileStates.some((s) => isZipFile(s.file))
  const hasNonZipPending = fileStates.some((s) => (s.status === "pending" || s.status === "error") && !isZipFile(s.file))

  const currentFile = fileStates[selectedTab]
  const extractedFiles = fileStates.filter((s) => s.status === "success")

  const handleExtractedFileClick = (index: number) => {
    const originalIndex = fileStates.findIndex((s) => s === extractedFiles[index])
    setSelectedTab(originalIndex)
    setExtractedFilesModalOpen(false)
  }

  const handleNext = () => {
    // For backward compatibility, pass both single extractedData and array
    const firstSuccessful = fileStates.find((s) => s.status === "success")
    onNext({
      extractedData: firstSuccessful?.extractedData || null,
      extractedFilesData: fileStates,
    })
  }

  return (
    <Box>
      {/* Header with progress */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {allFilesAreZip ? "Upload to S3 Bucket" : "Extract Data to CSV"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography
                variant="body2"
                color={successCount > 0 ? "success.main" : "text.secondary"}
                sx={{
                  cursor: successCount > 0 ? "pointer" : "default",
                  textDecoration: successCount > 0 ? "underline" : "none",
                  "&:hover": successCount > 0 ? { color: "success.dark" } : {},
                }}
                onClick={() => successCount > 0 && setExtractedFilesModalOpen(true)}
              >
                {successCount} {allFilesAreZip ? "uploaded" : "extracted"}
              </Typography>
              {pendingCount > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {pendingCount} pending
                </Typography>
              )}
              {failedCount > 0 && (
                <Typography variant="body2" color="error.main">
                  {failedCount} failed
                </Typography>
              )}
            </Box>
          </Box>
          {hasNonZipPending && (
            <Button
              variant="contained"
              onClick={handleExtractAll}
              disabled={isExtractingAll}
              startIcon={isExtractingAll ? <CircularProgress size={18} color="inherit" /> : <IconJson size={18} />}
            >
              {isExtractingAll ? "Extracting..." : "Extract All Files"}
            </Button>
          )}
        </Box>
        {totalFiles > 0 && (
          <LinearProgress
            variant="determinate"
            value={(successCount / totalFiles) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        )}
      </Box>

      {/* File Tabs */}
      {totalFiles > 1 && (
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            {fileStates.map((state, index) => (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconFile size={16} />
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {state.file.name}
                    </Typography>
                    {getStatusChip(state.status)}
                  </Box>
                }
                sx={{ textTransform: "none" }}
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* Current File Content */}
      {currentFile && (
        <Box>
          {/* File Info Card */}
          <Card sx={{ mb: 3, bgcolor: "grey.50" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    <IconFile size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {currentFile.file.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(currentFile.file.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {getStatusChip(currentFile.status)}
                  {(currentFile.status === "pending" || currentFile.status === "error") && !isZipFile(currentFile.file) && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleExtractSingle(selectedTab)}
                      disabled={false}
                      startIcon={currentFile.status === "error" ? <IconRefresh size={16} /> : undefined}
                    >
                      {currentFile.status === "error" ? "Retry" : "Extract"}
                    </Button>
                  )}
                  {currentFile.status === "error" && isZipFile(currentFile.file) && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleExtractSingle(selectedTab)}
                      startIcon={<IconRefresh size={16} />}
                    >
                      Retry Upload
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Error Display */}
          {currentFile.error && (
            <Alert
              severity="error"
              icon={<IconAlertCircle />}
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={() => handleRetry(selectedTab)}>
                  Retry
                </Button>
              }
            >
              <Typography variant="body1" fontWeight="bold">
                Extraction Failed
              </Typography>
              <Typography variant="body2">{currentFile.error}</Typography>
            </Alert>
          )}

          {/* Extracting State */}
          {currentFile.status === "extracting" && (
            <Card sx={{ p: 6, textAlign: "center", bgcolor: "primary.lighter", border: 1, borderColor: "primary.light" }}>
              <CardContent>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" fontWeight="bold">
                  Extracting Data...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Converting {currentFile.file.name} to CSV format
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Uploading State for ZIP files */}
          {currentFile.status === "uploading" && (
            <Card sx={{ p: 6, textAlign: "center", bgcolor: "primary.lighter", border: 1, borderColor: "primary.light" }}>
              <CardContent>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "primary.main",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <IconCloudUpload size={40} />
                </Avatar>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" fontWeight="bold">
                  Uploading to S3 bucket...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Uploading {currentFile.file.name} to S3 bucket
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Pending State - Only for non-ZIP files */}
          {currentFile.status === "pending" && !isZipFile(currentFile.file) && (
            <Card
              sx={{
                p: { xs: 4, md: 6 },
                bgcolor: "primary.lighter",
                border: 1,
                borderColor: "primary.light",
              }}
            >
              <CardContent sx={{ textAlign: "center" }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "primary.main",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <IconJson size={40} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Ready to Extract
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Convert this file to CSV format for analysis
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleExtractSingle(selectedTab)}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Start Extraction
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Success State - Data Preview */}
          {currentFile.status === "success" && currentFile.extractedData && (
            <>
              <Alert severity="success" icon={<IconCheck />} sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight="bold">
                  {currentFile.extractedData.format === "ZIP" ? "Uploaded to S3 bucket" : "Extraction Complete"}
                </Typography>
                <Typography variant="body2">
                  {currentFile.extractedData.format === "ZIP"
                    ? `${currentFile.file.name} has been uploaded successfully`
                    : `${currentFile.extractedData.row_count || currentFile.extractedData.rows.length} rows extracted with ${currentFile.extractedData.columns.length} columns`
                  }
                </Typography>
                {currentFile.extractedData.s3_key && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Stored at: {currentFile.extractedData.s3_key}
                  </Typography>
                )}
              </Alert>

              {/* Data Preview */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      Data Preview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Showing {Math.min(currentFile.extractedData.rows.length, 20)} of{" "}
                      {currentFile.extractedData.row_count || currentFile.extractedData.rows.length} rows
                    </Typography>
                  </Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}>
                            #
                          </TableCell>
                          {currentFile.extractedData.columns.map((col) => (
                            <TableCell key={col} sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}>
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentFile.extractedData.rows.slice(0, 20).map((row, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: "medium", bgcolor: "grey.50" }}>
                              {idx + 1}
                            </TableCell>
                            {currentFile.extractedData!.columns.map((col) => (
                              <TableCell key={`${idx}-${col}`}>
                                <Typography variant="body2">{row[col]}</Typography>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Format Info */}
              <Card sx={{ bgcolor: "grey.50" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <IconFileText size={20} />
                    <Typography variant="body1" fontWeight="bold">
                      Format: {currentFile.extractedData.format}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {currentFile.extractedData?.format === "ZIP"
                      ? "ZIP file uploaded to S3 bucket"
                      : "Data converted to CSV format and ready for feature selection"
                    }
                  </Typography>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* Summary Card when multiple files */}
      {totalFiles > 1 && allComplete && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            {allFilesAreZip ? "All Files Uploaded Successfully" : "All Files Extracted Successfully"}
          </Typography>
          <Typography variant="body2">
            {allFilesAreZip
              ? `${totalFiles} files have been uploaded to S3 bucket.`
              : `${totalFiles} files have been converted to CSV format. You can proceed to feature selection.`
            }
          </Typography>
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <Button variant="outlined" fullWidth onClick={onPrevious} size="large">
          Previous
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleNext}
          disabled={!allComplete && successCount === 0}
          size="large"
        >
          {allFilesAreZip
            ? "Upload to S3"
            : `Select Features ${successCount > 0 && !allComplete ? `(${successCount}/${totalFiles} ready)` : ""}`
          }
        </Button>
      </Box>

      {/* Extracted Files Modal */}
      <Modal
        open={extractedFilesModalOpen}
        onClose={() => setExtractedFilesModalOpen(false)}
        aria-labelledby="extracted-files-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 500 },
            maxHeight: "80vh",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            overflow: "hidden",
          }}
        >
          {/* Modal Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "primary.main",
              color: "white",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconFileSpreadsheet size={24} />
              <Typography variant="h6" fontWeight="bold">
                {allFilesAreZip ? `Uploaded Files (${successCount})` : `Extracted Files (${successCount})`}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setExtractedFilesModalOpen(false)}
              sx={{ color: "white" }}
              size="small"
            >
              <IconX size={20} />
            </IconButton>
          </Box>

          {/* Modal Content */}
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            {extractedFiles.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  {allFilesAreZip ? "No files uploaded yet" : "No files extracted yet"}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {extractedFiles.map((fileState, index) => (
                  <Box key={index}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleExtractedFileClick(index)}
                        sx={{
                          py: 2,
                          "&:hover": {
                            bgcolor: "primary.lighter",
                          },
                        }}
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              bgcolor: "success.light",
                              width: 40,
                              height: 40,
                            }}
                          >
                            <IconFileSpreadsheet size={20} color="green" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="medium">
                              {fileState.file.name}
                            </Typography>
                          }
                          secondary={
                            <Box component="span">
                              <Typography variant="caption" color="text.secondary" component="span">
                                {(fileState.file.size / 1024).toFixed(2)} KB
                              </Typography>
                              {fileState.extractedData && (
                                <Typography variant="caption" color="success.main" component="span" sx={{ ml: 1 }}>
                                  • {fileState.extractedData.row_count || fileState.extractedData.rows.length} rows, {fileState.extractedData.columns.length} columns
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label="View"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < extractedFiles.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  )
}
