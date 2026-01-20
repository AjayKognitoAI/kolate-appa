"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Alert,
  Avatar,
} from "@mui/material"
import {
  CloudUpload,
  Description,
  Delete,
  Visibility,
  Download,
  Close,
  Autorenew,
  ArrowForward,
  InfoOutlined,
  BarChart,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import type { MasterDataApi, MasterDataPreviewData } from "@/types/cohort.types"
import cohortService from "@/services/patient-enrollment/cohort-service"

interface MasterDataListProps {
  masterData: MasterDataApi[]
  onUpload: () => void
  onDelete?: (masterDataId: string) => void
  isLoading?: boolean
  enterpriseId: string
  hasCohorts?: boolean
  onUpdatePatientData?: () => void
  onVisualize?: (masterData: MasterDataApi) => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function MasterDataList({
  masterData,
  onUpload,
  onDelete,
  isLoading = false,
  enterpriseId,
  hasCohorts = false,
  onUpdatePatientData,
  onVisualize,
}: MasterDataListProps) {
  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<MasterDataPreviewData | null>(null)
  const [selectedMasterData, setSelectedMasterData] = useState<MasterDataApi | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(25)

  // Handle preview
  const handlePreview = async (data: MasterDataApi) => {
    setSelectedMasterData(data)
    setPreviewOpen(true)
    setIsLoadingPreview(true)
    setPreviewError(null)
    setPreviewPage(0)

    try {
      const response = await cohortService.getMasterDataPreview(
        data.id,
        enterpriseId,
        0,
        100
      )
      setPreviewData(response.data)
    } catch (err) {
      console.error("Failed to load preview:", err)
      setPreviewError("Failed to load data preview. Please try again.")
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Handle download as CSV
  const handleDownloadCSV = async (data: MasterDataApi) => {
    try {
      const response = await cohortService.getMasterDataPreview(
        data.id,
        enterpriseId,
        0,
        data.row_count
      )
      const rows = response.data.rows
      const ws = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = data.file_name.replace(/\.[^/.]+$/, "") + "_export.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download:", err)
    }
  }

  // Handle download as Excel
  const handleDownloadExcel = async (data: MasterDataApi) => {
    try {
      const response = await cohortService.getMasterDataPreview(
        data.id,
        enterpriseId,
        0,
        data.row_count
      )
      const rows = response.data.rows
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Patient Data")
      XLSX.writeFile(wb, data.file_name.replace(/\.[^/.]+$/, "") + "_export.xlsx")
    } catch (err) {
      console.error("Failed to download:", err)
    }
  }

  const closePreview = () => {
    setPreviewOpen(false)
    setPreviewData(null)
    setSelectedMasterData(null)
    setPreviewError(null)
  }
  if (masterData.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, border: "1px solid #ececf1" }}>
        {/* Header */}
        <Box textAlign="center" mb={3}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 2 }}>
            <CloudUpload sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Upload Your Patient Data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start by uploading a CSV or Excel file with your patient records
          </Typography>
        </Box>

        {/* What happens next */}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="stretch"
          gap={1.5}
          flexWrap="wrap"
          maxWidth={700}
          mx="auto"
          mb={3}
        >
          {/* Step 1 */}
          <Box
            flex={1}
            minWidth={140}
            maxWidth={200}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              bgcolor: "#fafbfc",
              textAlign: "center",
              position: "relative"
            }}
          >
            <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 12, mx: "auto", mb: 1 }}>1</Avatar>
            <Typography variant="caption" fontWeight={600} display="block">
              Upload File
            </Typography>
            <Typography variant="caption" color="text.secondary">
              CSV or Excel
            </Typography>
            <ArrowForward
              sx={{
                position: "absolute",
                right: -14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "text.disabled",
                fontSize: 18,
                display: { xs: "none", sm: "block" }
              }}
            />
          </Box>

          {/* Step 2 */}
          <Box
            flex={1}
            minWidth={140}
            maxWidth={200}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              bgcolor: "#fafbfc",
              textAlign: "center",
              position: "relative"
            }}
          >
            <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 12, mx: "auto", mb: 1 }}>2</Avatar>
            <Typography variant="caption" fontWeight={600} display="block">
              Create Cohorts
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Filter patients
            </Typography>
            <ArrowForward
              sx={{
                position: "absolute",
                right: -14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "text.disabled",
                fontSize: 18,
                display: { xs: "none", sm: "block" }
              }}
            />
          </Box>

          {/* Step 3 */}
          <Box
            flex={1}
            minWidth={140}
            maxWidth={200}
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              bgcolor: "#fafbfc",
              textAlign: "center"
            }}
          >
            <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: 12, mx: "auto", mb: 1 }}>3</Avatar>
            <Typography variant="caption" fontWeight={600} display="block">
              Screen Patients
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review results
            </Typography>
          </Box>
        </Box>

        {/* Supported formats info */}
        <Box textAlign="center" mb={3}>
          <Typography variant="caption" color="text.secondary">
            Supported formats: .csv, .xlsx, .xls
          </Typography>
        </Box>

        {/* CTA */}
        <Box textAlign="center">
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={onUpload}
            disabled={isLoading}
          >
            Upload Master Data
          </Button>
        </Box>
      </Paper>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Master Data Files ({masterData.length})
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          {hasCohorts && onUpdatePatientData && (
            <Tooltip title="Upload new records for patients continuing in the study" arrow>
              <Button
                variant="outlined"
                startIcon={<Autorenew />}
                endIcon={<InfoOutlined sx={{ fontSize: 16 }} />}
                onClick={onUpdatePatientData}
              >
                Update Patient Data
              </Button>
            </Tooltip>
          )}
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={onUpload}
            disabled={isLoading}
          >
            Upload New
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #ececf1", maxHeight: 260 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>File Name</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Rows</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Columns</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Size</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Uploaded</TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {masterData.map((data) => (
              <TableRow key={data.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Description fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={500}>
                      {data.file_name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={data.row_count.toLocaleString()}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={Object.keys(data.columns).length}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(data.file_size)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(data.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={0.5} justifyContent="flex-end">
                    <Tooltip title="Preview Data">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handlePreview(data)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download CSV">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleDownloadCSV(data)}
                      >
                        <Download fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {onVisualize && (
                      <Tooltip title="Visualize Data">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onVisualize(data)}
                        >
                          <BarChart fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(data.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}

          </TableBody>
        </Table>
      </TableContainer>

      {/* Upload New Data Section - Outside table for visibility */}
      <Paper
        elevation={0}
        onClick={onUpload}
        sx={{
          mt: 1,
          p: 1.5,
          border: "1px dashed #e0e0e0",
          borderRadius: 2,
          cursor: "pointer",
          bgcolor: "grey.50",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            bgcolor: "primary.50",
            borderColor: "primary.main",
            "& .upload-icon": {
              bgcolor: "primary.main",
              color: "white",
            },
            "& .upload-text": {
              color: "primary.main",
            }
          }
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
          <Avatar
            className="upload-icon"
            sx={{
              width: 32,
              height: 32,
              bgcolor: "grey.200",
              color: "grey.600",
              transition: "all 0.2s ease-in-out"
            }}
          >
            <CloudUpload sx={{ fontSize: 18 }} />
          </Avatar>
          <Box textAlign="left">
            <Typography
              className="upload-text"
              variant="body2"
              fontWeight={600}
              color="text.secondary"
              sx={{ transition: "all 0.2s ease-in-out" }}
            >
              Upload New Data
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Add another CSV or Excel file
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={closePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {selectedMasterData?.file_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedMasterData?.row_count.toLocaleString()} rows • {selectedMasterData ? Object.keys(selectedMasterData.columns).length : 0} columns
              </Typography>
            </Box>
            <IconButton onClick={closePreview} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingPreview ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress />
            </Box>
          ) : previewError ? (
            <Alert severity="error">{previewError}</Alert>
          ) : previewData && previewData.rows.length > 0 ? (
            <>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(previewData.columns).map((col) => (
                        <TableCell key={col} sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>
                          {col}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.rows
                      .slice(previewPage * previewRowsPerPage, previewPage * previewRowsPerPage + previewRowsPerPage)
                      .map((row, idx) => (
                        <TableRow key={idx} hover>
                          {Object.keys(previewData.columns).map((col) => (
                            <TableCell key={col}>
                              {String(row[col] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={previewData.rows.length}
                page={previewPage}
                onPageChange={(_, newPage) => setPreviewPage(newPage)}
                rowsPerPage={previewRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setPreviewRowsPerPage(parseInt(e.target.value, 10))
                  setPreviewPage(0)
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          ) : (
            <Box py={4} textAlign="center">
              <Typography color="text.secondary">No data available</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => selectedMasterData && handleDownloadCSV(selectedMasterData)}
            disabled={!previewData}
          >
            Download CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => selectedMasterData && handleDownloadExcel(selectedMasterData)}
            disabled={!previewData}
          >
            Download Excel
          </Button>
          <Button onClick={closePreview}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
