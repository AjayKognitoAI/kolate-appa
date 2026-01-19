"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Alert,
  Snackbar,
  Divider,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material"
import {
  Add,
  Science,
  ViewModule,
  ViewList,
  Visibility,
  Edit,
  Delete,
  ArrowForward,
  Lightbulb,
  Close,
  CloudUpload,
  FilterAlt,
} from "@mui/icons-material"
import { StudyCard } from "@/components/patient-enrollment/study-card"
import { StudyCreateDialog } from "@/components/patient-enrollment/study-create-dialog"
import { StudyEditDialog } from "@/components/patient-enrollment/study-edit-dialog"
import cohortService from "@/services/patient-enrollment/cohort-service"
import type {
  StudyApi,
  StudyWithCountsApi,
  StudyCreateRequest,
  StudyUpdateRequest,
  StudyStatus,
} from "@/types/cohort.types"

type ViewMode = "card" | "table"

const STATUS_OPTIONS: { value: StudyStatus | "all"; label: string; color: "default" | "warning" | "primary" | "success" | "secondary" }[] = [
  { value: "all", label: "All", color: "default" },
  { value: "draft", label: "Draft", color: "warning" },
  { value: "active", label: "Active", color: "primary" },
  { value: "completed", label: "Completed", color: "success" },
  { value: "archived", label: "Archived", color: "secondary" },
]

const getStatusColor = (status: StudyStatus): "warning" | "primary" | "success" | "secondary" => {
  switch (status) {
    case "draft": return "warning"
    case "active": return "primary"
    case "completed": return "success"
    case "archived": return "secondary"
    default: return "primary"
  }
}

export default function PatientScreeningPage() {
  const router = useRouter()
  const { data: session } = useSession()

  // Get user context for API calls
  const enterpriseId = session?.user?.orgId || ""
  const userId = session?.user?.sub || ""
  const userName = session?.user?.firstName
    ? `${session.user.firstName} ${session.user.lastName || ""}`.trim()
    : session?.user?.email || ""

  // Studies state
  const [studies, setStudies] = useState<StudyApi[]>([])
  const [isLoadingStudies, setIsLoadingStudies] = useState(true)

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const [statusFilter, setStatusFilter] = useState<StudyStatus | "all">("all")

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [studyToEdit, setStudyToEdit] = useState<StudyApi | null>(null)
  const [studyToDelete, setStudyToDelete] = useState<StudyApi | null>(null)
  const [showHelpTips, setShowHelpTips] = useState(true)

  // Filtered studies based on status filter
  const filteredStudies = useMemo(() => {
    if (statusFilter === "all") return studies
    return studies.filter((study) => study.status === statusFilter)
  }, [studies, statusFilter])

  // Count studies by status for filter badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: studies.length }
    studies.forEach((study) => {
      counts[study.status] = (counts[study.status] || 0) + 1
    })
    return counts
  }, [studies])

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  })

  // Fetch studies from API on mount
  const fetchStudies = useCallback(async () => {
    if (!enterpriseId) return
    setIsLoadingStudies(true)
    try {
      const response = await cohortService.getStudies({ enterprise_id: enterpriseId, size: 50 })
      setStudies(response.data.content)
    } catch (error) {
      console.error("Failed to fetch studies:", error)
      setSnackbar({
        open: true,
        message: "Failed to load studies",
        severity: "error",
      })
    } finally {
      setIsLoadingStudies(false)
    }
  }, [enterpriseId])

  useEffect(() => {
    fetchStudies()
  }, [fetchStudies])

  const handleCreateStudy = async (data: StudyCreateRequest) => {
    const response = await cohortService.createStudy(data)
    setSnackbar({
      open: true,
      message: `Study "${response.data.name}" created successfully`,
      severity: "success",
    })
    fetchStudies()
    // Navigate to the new study detail page
    router.push(`/patient-enrollment/studies/${response.data.id}`)
  }

  const handleViewStudy = (study: StudyApi | StudyWithCountsApi) => {
    router.push(`/patient-enrollment/studies/${study.id}`)
  }

  const handleEditStudy = (study: StudyApi | StudyWithCountsApi) => {
    setStudyToEdit(study as StudyApi)
    setIsEditDialogOpen(true)
  }

  const handleEditStudySubmit = async (data: StudyUpdateRequest) => {
    if (!studyToEdit) return
    await cohortService.updateStudy(studyToEdit.id, enterpriseId, data)
    setSnackbar({
      open: true,
      message: `Study "${data.name}" updated successfully`,
      severity: "success",
    })
    fetchStudies()
  }

  const handleDeleteStudy = async () => {
    if (!studyToDelete) return

    try {
      await cohortService.deleteStudy(studyToDelete.id, enterpriseId)
      setSnackbar({
        open: true,
        message: `Study "${studyToDelete.name}" deleted successfully`,
        severity: "success",
      })
      fetchStudies()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete study"
      // Check if it's a "has children" error
      if (errorMessage.includes("children") || errorMessage.includes("existing data")) {
        setSnackbar({
          open: true,
          message: "Cannot delete study with existing master data or cohorts. Please delete them first.",
          severity: "error",
        })
      } else {
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        })
      }
    } finally {
      setStudyToDelete(null)
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box px={3} py={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography fontWeight={500} variant="h4">
          Patient Enrollment
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          Create New Study
        </Button>
      </Box>
      <Divider />

      {/* Main Content */}
      <Box px={3} mt={4}>
        {isLoadingStudies ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        ) : studies.length === 0 ? (
          <Paper elevation={0} sx={{ p: 5, border: "1px solid #ececf1" }}>
            {/* Header */}
            <Box textAlign="center" mb={4}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 2 }}>
                <Science sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Get Started with Patient Enrollment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Follow these simple steps to screen patients for your clinical trials
              </Typography>
            </Box>

            {/* Step-by-step Flow */}
            <Box
              display="flex"
              justifyContent="center"
              alignItems="stretch"
              gap={2}
              flexWrap="wrap"
              maxWidth={900}
              mx="auto"
              mb={4}
            >
              {/* Step 1 */}
              <Box
                flex={1}
                minWidth={200}
                maxWidth={260}
                sx={{
                  p: 2.5,
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  bgcolor: "#fafbfc",
                  position: "relative"
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>1</Avatar>
                  <Typography variant="subtitle2" fontWeight={600}>Create a Study</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  Organize your work by clinical trial, protocol, or research project
                </Typography>
                <ArrowForward
                  sx={{
                    position: "absolute",
                    right: -20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "text.disabled",
                    display: { xs: "none", md: "block" }
                  }}
                />
              </Box>

              {/* Step 2 */}
              <Box
                flex={1}
                minWidth={200}
                maxWidth={260}
                sx={{
                  p: 2.5,
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  bgcolor: "#fafbfc",
                  position: "relative"
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>2</Avatar>
                  <Typography variant="subtitle2" fontWeight={600}>Upload Patient Data</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  Import your patient dataset from CSV or Excel files
                </Typography>
                <ArrowForward
                  sx={{
                    position: "absolute",
                    right: -20,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "text.disabled",
                    display: { xs: "none", md: "block" }
                  }}
                />
              </Box>

              {/* Step 3 */}
              <Box
                flex={1}
                minWidth={200}
                maxWidth={260}
                sx={{
                  p: 2.5,
                  border: "1px solid #e0e0e0",
                  borderRadius: 2,
                  bgcolor: "#fafbfc"
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>3</Avatar>
                  <Typography variant="subtitle2" fontWeight={600}>Create Cohorts</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  Define filters to identify eligible patients for screening
                </Typography>
              </Box>
            </Box>

            {/* CTA Button */}
            <Box textAlign="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create Your First Study
              </Button>
            </Box>
          </Paper>
        ) : (
          <Box>
            {/* Header with Quick Tips and Filters */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Your Studies
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredStudies.length} of {studies.length} stud{studies.length !== 1 ? "ies" : "y"}
                </Typography>
              </Box>

              {/* Quick Tips - Inline */}
              {showHelpTips && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor: "rgba(99, 102, 241, 0.06)",
                    borderRadius: 2,
                    border: "1px solid rgba(99, 102, 241, 0.12)"
                  }}
                >
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Avatar sx={{ width: 18, height: 18, bgcolor: "#6366f1", fontSize: 10 }}>1</Avatar>
                    <Typography variant="caption" color="text.secondary">Click to view</Typography>
                  </Box>
                  <ArrowForward sx={{ fontSize: 12, color: "text.disabled" }} />
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Avatar sx={{ width: 18, height: 18, bgcolor: "#8b5cf6", fontSize: 10 }}>2</Avatar>
                    <Typography variant="caption" color="text.secondary">Upload data</Typography>
                  </Box>
                  <ArrowForward sx={{ fontSize: 12, color: "text.disabled" }} />
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Avatar sx={{ width: 18, height: 18, bgcolor: "#a855f7", fontSize: 10 }}>3</Avatar>
                    <Typography variant="caption" color="text.secondary">Create cohorts</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setShowHelpTips(false)}
                    sx={{ p: 0.25, ml: 0.5, color: "text.disabled", "&:hover": { color: "text.secondary" } }}
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              )}

              <Box display="flex" alignItems="center" gap={2}>
                {/* Status Filter Chips */}
                <Box display="flex" gap={1} flexWrap="wrap">
                  {STATUS_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      label={`${option.label}${statusCounts[option.value] ? ` (${statusCounts[option.value]})` : ""}`}
                      color={statusFilter === option.value ? option.color : "default"}
                      variant={statusFilter === option.value ? "filled" : "outlined"}
                      onClick={() => setStatusFilter(option.value)}
                      size="small"
                    />
                  ))}
                </Box>
                {/* View Mode Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newValue) => newValue && setViewMode(newValue)}
                  size="small"
                >
                  <ToggleButton value="card">
                    <Tooltip title="Card View">
                      <ViewModule />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="table">
                    <Tooltip title="Table View">
                      <ViewList />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {filteredStudies.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, border: "1px solid #ececf1", textAlign: "center" }}>
                <Typography variant="body1" color="text.secondary">
                  No studies match the selected filter.
                </Typography>
                <Button
                  variant="text"
                  onClick={() => setStatusFilter("all")}
                  sx={{ mt: 1 }}
                >
                  Clear Filter
                </Button>
              </Paper>
            ) : viewMode === "card" ? (
              <Grid container spacing={2}>
                {filteredStudies.map((study) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={study.id}>
                    <StudyCard
                      study={study}
                      onView={handleViewStudy}
                      onEdit={handleEditStudy}
                      onDelete={(s) => setStudyToDelete(s as StudyApi)}
                    />
                  </Grid>
                ))}

                {/* Create New Study Card */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    onClick={() => setIsCreateDialogOpen(true)}
                    sx={{
                      height: "100%",
                      minHeight: 160,
                      border: "2px dashed",
                      borderColor: "grey.300",
                      borderRadius: 2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      bgcolor: "grey.50",
                      py: 2,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "primary.50",
                        transform: "translateY(-2px)",
                        "& .create-icon": {
                          bgcolor: "primary.main",
                          color: "white",
                        },
                        "& .create-text": {
                          color: "primary.main",
                        }
                      }
                    }}
                  >
                    <Avatar
                      className="create-icon"
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "grey.200",
                        color: "grey.600",
                        mb: 1,
                        transition: "all 0.2s ease-in-out"
                      }}
                    >
                      <Add sx={{ fontSize: 20 }} />
                    </Avatar>
                    <Typography
                      className="create-text"
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ transition: "all 0.2s ease-in-out" }}
                    >
                      Create New Study
                    </Typography>
                    <Typography variant="caption" color="text.disabled" mt={0.25}>
                      Start a new research project
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #ececf1" }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: "#fafbfc" }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudies.map((study) => (
                      <TableRow key={study.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {study.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>
                            {study.description || "No description"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={study.status.charAt(0).toUpperCase() + study.status.slice(1)}
                            size="small"
                            color={getStatusColor(study.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(study.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" gap={0.5} justifyContent="flex-end">
                            <Tooltip title="View">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleViewStudy(study)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleEditStudy(study)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setStudyToDelete(study)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Create New Study Row */}
                    <TableRow
                      hover
                      onClick={() => setIsCreateDialogOpen(true)}
                      sx={{
                        cursor: "pointer",
                        bgcolor: "grey.50",
                        "&:hover": {
                          bgcolor: "primary.50",
                          "& .create-row-icon": {
                            bgcolor: "primary.main",
                            color: "white",
                          },
                          "& .create-row-text": {
                            color: "primary.main",
                          }
                        }
                      }}
                    >
                      <TableCell colSpan={5}>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={2} py={1}>
                          <Avatar
                            className="create-row-icon"
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: "grey.200",
                              color: "grey.600",
                              transition: "all 0.2s ease-in-out"
                            }}
                          >
                            <Add sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Box textAlign="left">
                            <Typography
                              className="create-row-text"
                              variant="body2"
                              fontWeight={600}
                              color="text.secondary"
                              sx={{ transition: "all 0.2s ease-in-out" }}
                            >
                              Create New Study
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Start a new research project
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>

      {/* Create Study Dialog */}
      <StudyCreateDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateStudy}
        enterpriseId={enterpriseId}
        userId={userId}
        userName={userName}
      />

      {/* Edit Study Dialog */}
      <StudyEditDialog
        open={isEditDialogOpen}
        study={studyToEdit as StudyWithCountsApi}
        onClose={() => {
          setIsEditDialogOpen(false)
          setStudyToEdit(null)
        }}
        onSubmit={handleEditStudySubmit}
        userId={userId}
        userName={userName}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!studyToDelete}
        onClose={() => setStudyToDelete(null)}
      >
        <DialogTitle>Delete Study</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{studyToDelete?.name}"?
            This action cannot be undone. All master data and cohorts within this study will also be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudyToDelete(null)}>Cancel</Button>
          <Button onClick={handleDeleteStudy} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
