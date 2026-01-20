"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Tabs,
  Tab,
  Breadcrumbs,
  Link as MuiLink,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Chip,
} from "@mui/material"
import {
  Storage,
  Group,
  Timeline,
  Add,
  Visibility,
  Delete,
  People,
  CalendarToday,
  FilterList,
  ArrowForward,
  CloudUpload,
  BarChart,
} from "@mui/icons-material"

// Components
import { StudyHeader } from "@/components/patient-enrollment/study-header"
import { StudyStatsSummary } from "@/components/patient-enrollment/study-stats-summary"
import { StudyEditDialog } from "@/components/patient-enrollment/study-edit-dialog"
import { MasterDataList } from "@/components/patient-enrollment/master-data-list"
import { MasterDataUploadDialog } from "@/components/patient-enrollment/master-data-upload-dialog"
import { MergeCohortDialog } from "@/components/patient-enrollment/merge-cohort-dialog"
import { NullDataReviewDialog } from "@/components/patient-enrollment/null-data-review-dialog"
import { OverflowTooltip } from "@/components/common/OverflowTooltip"
import { DataVisualization } from "@/components/patient-enrollment/visualization"
import type { PatientData } from "@/lib/screening-logic"

// Services & Types
import cohortService from "@/services/patient-enrollment/cohort-service"
import type {
  StudyWithCountsApi,
  StudyUpdateRequest,
  MasterDataApi,
  CohortApi,
  ActivityApi,
  EnhancedColumnSchema,
} from "@/types/cohort.types"

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      hidden={value !== index}
      style={{
        paddingTop: 16,
        paddingBottom: 24,
      }}
    >
      {value === index && children}
    </div>
  )
}

export default function StudyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const studyId = params?.id as string

  // Get user context for API calls
  const enterpriseId = session?.user?.orgId || ""
  const userId = session?.user?.sub || ""
  const userName = session?.user?.firstName
    ? `${session.user.firstName} ${session.user.lastName || ""}`.trim()
    : session?.user?.email || ""

  // Loading & error state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Study data
  const [study, setStudy] = useState<StudyWithCountsApi | null>(null)
  const [masterData, setMasterData] = useState<MasterDataApi[]>([])
  const [cohorts, setCohorts] = useState<CohortApi[]>([])
  const [activities, setActivities] = useState<ActivityApi[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)

  // UI state
  const [activeTab, setActiveTab] = useState(0)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isMergeCohortDialogOpen, setIsMergeCohortDialogOpen] = useState(false)
  const [isNullDataReviewOpen, setIsNullDataReviewOpen] = useState(false)
  const [uploadedMasterDataId, setUploadedMasterDataId] = useState<string | null>(null)
  const [uploadedMasterDataName, setUploadedMasterDataName] = useState<string>("")

  // Visualization state
  const [visualizationMasterDataId, setVisualizationMasterDataId] = useState<string>("")
  const [visualizationData, setVisualizationData] = useState<PatientData[]>([])
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false)

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info"
  }>({
    open: false,
    message: "",
    severity: "info",
  })

  // Track if initial tab has been set
  const initialTabSet = useRef(false)

  // Calculate total patients from master data row counts
  const totalPatients = useMemo(() => {
    return masterData.reduce((sum, md) => sum + (md.row_count || 0), 0)
  }, [masterData])

  // Get selected master data for visualization
  const selectedVisualizationMasterData = useMemo(() => {
    if (!visualizationMasterDataId && masterData.length > 0) {
      return masterData[0]
    }
    return masterData.find((md) => md.id === visualizationMasterDataId) || null
  }, [masterData, visualizationMasterDataId])

  // Fetch activity data for the study
  const fetchActivities = useCallback(async () => {
    if (!studyId) return

    setIsLoadingActivities(true)
    try {
      const response = await cohortService.getStudyActivity(studyId, { limit: 50 })
      setActivities(response.data.activities || [])
    } catch (err) {
      console.error("Failed to fetch activities:", err)
      setActivities([])
    } finally {
      setIsLoadingActivities(false)
    }
  }, [studyId])

  // Fetch activities when Activity tab is selected
  useEffect(() => {
    if (activeTab === 2 && studyId) {
      fetchActivities()
    }
  }, [activeTab, studyId, fetchActivities])

  // Fetch visualization data when Visualizations tab is selected
  const fetchVisualizationData = useCallback(async (masterDataId: string) => {
    if (!masterDataId || !enterpriseId) return

    setIsLoadingVisualization(true)
    try {
      const response = await cohortService.getMasterDataPreview(masterDataId, enterpriseId, 0, 1000)
      setVisualizationData((response.data.rows || []) as PatientData[])
    } catch (err) {
      console.error("Failed to fetch visualization data:", err)
      setVisualizationData([])
    } finally {
      setIsLoadingVisualization(false)
    }
  }, [enterpriseId])

  // Load visualization data when tab or master data selection changes
  useEffect(() => {
    if (activeTab === 3 && selectedVisualizationMasterData?.id) {
      fetchVisualizationData(selectedVisualizationMasterData.id)
    }
  }, [activeTab, selectedVisualizationMasterData?.id, fetchVisualizationData])

  // Fetch study data
  const fetchStudyData = useCallback(async () => {
    if (!studyId || !enterpriseId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch study metadata with counts
      const studyResponse = await cohortService.getStudyById(studyId, enterpriseId)
      setStudy(studyResponse.data)

      // Fetch master data for this study
      try {
        const masterDataResponse = await cohortService.getStudyMasterData(studyId, enterpriseId)
        setMasterData(masterDataResponse.data || [])
      } catch {
        setMasterData([])
      }

      // Fetch cohorts for this study
      try {
        const cohortsResponse = await cohortService.getStudyCohorts(studyId, enterpriseId)
        const cohortsData = cohortsResponse.data.content || []

        // For cohorts that have filter_id but no filter object, fetch the filters
        const cohortsWithFilters = await Promise.all(
          cohortsData.map(async (cohort) => {
            if (cohort.filter_id && (!cohort.filter || !cohort.filter.rules || cohort.filter.rules.length === 0)) {
              try {
                const filterResponse = await cohortService.getFilterById(cohort.filter_id)
                return {
                  ...cohort,
                  filter: filterResponse.data.filter
                }
              } catch {
                // If filter fetch fails, return cohort as-is
                return cohort
              }
            }
            return cohort
          })
        )

        setCohorts(cohortsWithFilters)
      } catch {
        setCohorts([])
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load study data"
      setError(errorMessage)
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [studyId, enterpriseId])

  useEffect(() => {
    fetchStudyData()
  }, [fetchStudyData])

  // Set initial tab based on master data availability
  useEffect(() => {
    if (!isLoading && !initialTabSet.current) {
      initialTabSet.current = true
      if (masterData.length > 0) {
        setActiveTab(1) // Cohorts tab if master data exists
      }
      // else stays at 0 (Patient Data tab) - which is the default
    }
  }, [isLoading, masterData.length])

  // Handlers
  const handleBack = () => {
    router.push("/patient-enrollment")
  }

  const handleEditStudy = async (data: StudyUpdateRequest) => {
    if (!study) return

    await cohortService.updateStudy(study.id, enterpriseId, data)
    setSnackbar({
      open: true,
      message: "Study updated successfully",
      severity: "success",
    })
    fetchStudyData()
    setIsEditDialogOpen(false)
  }

  const handleUploadMasterData = async (
    file: File,
    rowCount: number,
    patientIdColumn: string,
    enhancedColumns: EnhancedColumnSchema
  ) => {
    console.log("🚀 Starting upload handler...")
    console.log("Study:", study)
    console.log("File:", file.name)
    console.log("Row count:", rowCount)
    console.log("Enhanced columns:", Object.keys(enhancedColumns).length, "columns with metadata")
    console.log("Sample column metadata:", Object.entries(enhancedColumns)[0])

    if (!study) {
      console.error("❌ No study found!")
      return
    }

    try {
      console.log("📡 Calling uploadMasterDataForStudy with enhanced columns...")
      const uploadResponse = await cohortService.uploadMasterDataForStudy(
        study.id,
        file,
        enterpriseId,
        userId,
        patientIdColumn,
        enhancedColumns
      )

      console.log("📤 Upload Response received:")
      console.log("  - Full response:", uploadResponse)
      console.log("  - Response data:", uploadResponse.data)
      console.log("  - Null detection:", uploadResponse.data?.null_detection)

      // Close upload dialog first
      setIsUploadDialogOpen(false)

      // Check if the uploaded data has null values
      const nullDetection = uploadResponse.data?.null_detection
      console.log("❓ Checking null detection:")
      console.log("  - null_detection exists?", !!nullDetection)
      console.log("  - has_nulls?", nullDetection?.has_nulls)
      console.log("  - rows_with_nulls:", nullDetection?.rows_with_nulls)
      console.log("  - null_count_by_column:", nullDetection?.null_count_by_column)

      if (nullDetection && nullDetection.has_nulls) {
        // Show null data review dialog
        console.log("✅ Conditions met! Opening Null Data Review Dialog")
        console.log("  - Master Data ID:", uploadResponse.data.master_data_id)
        console.log("  - File Name:", uploadResponse.data.file_name || file.name)

        setUploadedMasterDataId(uploadResponse.data.master_data_id)
        setUploadedMasterDataName(uploadResponse.data.file_name || file.name)
        console.log("  - State updated, setting dialog open...")
        setIsNullDataReviewOpen(true)
        console.log("  - Dialog state set to true")
      } else {
        // No nulls, just show success message
        console.log("ℹ️ No nulls detected, showing success message")
        console.log("  - Null detection was:", nullDetection)
        setSnackbar({
          open: true,
          message: `Successfully uploaded ${rowCount.toLocaleString()} patient records`,
          severity: "success",
        })
        fetchStudyData()
      }
    } catch (error) {
      console.error("💥 Error in upload handler:", error)
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : "Failed to upload master data",
        severity: "error",
      })
      setIsUploadDialogOpen(false)
    }
  }

  const handleNullDataEditComplete = async (newMasterDataId: string, version: number) => {
    // Edits were saved, new master data version created
    setIsNullDataReviewOpen(false)
    setSnackbar({
      open: true,
      message: `Successfully saved edits and created version ${version}`,
      severity: "success",
    })
    fetchStudyData()
    setUploadedMasterDataId(null)
    setUploadedMasterDataName("")
  }

  const handleNullDataSkip = () => {
    // User chose to skip editing null values
    setIsNullDataReviewOpen(false)
    setSnackbar({
      open: true,
      message: "Data uploaded with missing values",
      severity: "info",
    })
    fetchStudyData()
    setUploadedMasterDataId(null)
    setUploadedMasterDataName("")
  }

  const handleCreateCohort = () => {
    // Navigate to cohort creation page
    router.push(`/patient-enrollment/studies/${studyId}/create-cohort`)
  }

  const handleViewCohort = (cohort: CohortApi) => {
    router.push(`/patient-enrollment/${cohort.id}`)
  }

  const handleDeleteCohort = async (cohortId: string) => {
    try {
      await cohortService.deleteCohort(cohortId, userId, userName)
      setSnackbar({
        open: true,
        message: "Cohort deleted successfully",
        severity: "success",
      })
      fetchStudyData()
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to delete cohort",
        severity: "error",
      })
    }
  }

  const handleMergeCohort = async (
    sourceCohortId: string,
    mergeColumn: string,
    file: File,
    name?: string
  ) => {
    const result = await cohortService.mergeCohort(
      studyId,
      sourceCohortId,
      mergeColumn,
      file,
      enterpriseId,
      userId,
      name
    )
    setSnackbar({
      open: true,
      message: `Merge successful! ${result.data.matched_count} records matched.`,
      severity: "success",
    })
    fetchStudyData()
    return result.data
  }

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  // Error state
  if (error || !study) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Study not found"}
        </Alert>
        <Button onClick={handleBack}>Back to Studies</Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Box px={3} py={1.5}>
        <Breadcrumbs>
          <MuiLink
            component="button"
            underline="hover"
            color="inherit"
            onClick={handleBack}
            sx={{ cursor: "pointer" }}
          >
            Patient Enrollment
          </MuiLink>
          <Typography color="text.primary">{study.name}</Typography>
        </Breadcrumbs>
      </Box>

      <Divider />

      {/* Header */}
      <Box px={3} py={2}>
        <StudyHeader
          study={study}
          onBack={handleBack}
          onEdit={() => setIsEditDialogOpen(true)}
        />
      </Box>

      <Divider />

      {/* Stats Summary */}
      <Box px={3} py={1}>
        <StudyStatsSummary
          masterDataCount={masterData.length}
          cohortCount={cohorts.length}
          totalPatients={totalPatients}
        />
      </Box>

      <Divider />

      {/* Tabs */}
      <Box px={3}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<Storage />} iconPosition="start" label="Patient Data" />
          <Tab icon={<Group />} iconPosition="start" label="Cohorts" />
          <Tab icon={<Timeline />} iconPosition="start" label="Activity" />
          <Tab icon={<BarChart />} iconPosition="start" label="Visualizations" />
        </Tabs>

        {/* Master Data Tab */}
        <TabPanel value={activeTab} index={0}>
          <MasterDataList
            masterData={masterData}
            onUpload={() => setIsUploadDialogOpen(true)}
            enterpriseId={enterpriseId}
            hasCohorts={cohorts.length > 0}
            onUpdatePatientData={() => setIsMergeCohortDialogOpen(true)}
            onVisualize={(md) => {
              setVisualizationMasterDataId(md.id)
              setActiveTab(3) // Switch to Visualizations tab
            }}
          />
        </TabPanel>

        {/* Cohorts Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                Cohorts ({cohorts.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                disabled={masterData.length === 0}
                onClick={handleCreateCohort}
              >
                Create Cohort
              </Button>
            </Box>

            {masterData.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, border: "1px solid #ececf1" }}>
                {/* Header */}
                <Box textAlign="center" mb={3}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: "warning.light", color: "warning.main", mx: "auto", mb: 2 }}>
                    <CloudUpload sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Upload Data First
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You need to upload patient data before creating cohorts
                  </Typography>
                </Box>

                {/* Simple flow */}
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  gap={2}
                  mb={3}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      px: 2,
                      border: "1px solid",
                      borderColor: "warning.main",
                      borderRadius: 2,
                      bgcolor: "warning.50"
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="warning.dark">
                      Upload Patient Data
                    </Typography>
                  </Box>
                  <ArrowForward sx={{ color: "text.disabled" }} />
                  <Box
                    sx={{
                      p: 1.5,
                      px: 2,
                      border: "1px solid #e0e0e0",
                      borderRadius: 2,
                      bgcolor: "#fafbfc"
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Create Cohorts
                    </Typography>
                  </Box>
                </Box>

                <Box textAlign="center">
                  <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => {
                      setActiveTab(0)
                      setIsUploadDialogOpen(true)
                    }}
                  >
                    Go to Patient Data Tab
                  </Button>
                </Box>
              </Paper>
            ) : cohorts.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, border: "1px solid #ececf1" }}>
                {/* Header */}
                <Box textAlign="center" mb={3}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.light", color: "primary.main", mx: "auto", mb: 2 }}>
                    <Group sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Create Your First Cohort
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Define filters to identify eligible patients from your master data
                  </Typography>
                </Box>

                {/* What you can do */}
                <Box
                  display="flex"
                  justifyContent="center"
                  gap={3}
                  flexWrap="wrap"
                  mb={3}
                  maxWidth={500}
                  mx="auto"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <FilterList sx={{ fontSize: 20, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Build custom filters
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <People sx={{ fontSize: 20, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Screen {totalPatients.toLocaleString()} patients
                    </Typography>
                  </Box>
                </Box>

                <Box textAlign="center">
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateCohort}
                  >
                    Create First Cohort
                  </Button>
                </Box>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {cohorts.map((cohort) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cohort.id}>
                    <Card elevation={0} sx={{ border: "1px solid #ececf1", height: "100%", minHeight: 160 }}>
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box display="flex" alignItems="flex-start" gap={1.5} mb={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "info.light", color: "info.main" }}>
                            <Group sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box flex={1} minWidth={0}>
                            <OverflowTooltip title={cohort.name}>
                              <Typography variant="subtitle2" fontWeight={600} noWrap>
                                {cohort.name}
                              </Typography>
                            </OverflowTooltip>
                            <OverflowTooltip title={cohort.description || "No description"}>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                                {cohort.description || "No description"}
                              </Typography>
                            </OverflowTooltip>
                          </Box>
                        </Box>

                        <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center" mb={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <People sx={{ fontSize: 14 }} color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {cohort.patient_count.toLocaleString()} / {cohort.master_data_patient_count.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <CalendarToday sx={{ fontSize: 14 }} color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(cohort.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>

                        <Box display="flex" gap={0.75}>
                          <Chip
                            label={`${cohort.filter?.rules?.length || 0} filter${(cohort.filter?.rules?.length || 0) !== 1 ? "s" : ""}`}
                            size="small"
                            icon={<FilterList sx={{ fontSize: 14 }} />}
                            variant="outlined"
                            sx={{ height: 22, fontSize: "0.7rem" }}
                          />
                          <Chip
                            label={`${((cohort.patient_count / cohort.master_data_patient_count) * 100).toFixed(0)}% match`}
                            size="small"
                            variant="outlined"
                            color={cohort.patient_count / cohort.master_data_patient_count >= 0.5 ? "success" : "warning"}
                            sx={{ height: 22, fontSize: "0.7rem" }}
                          />
                        </Box>
                      </CardContent>
                      <CardActions sx={{ borderTop: "1px solid #ececf1", px: 1.5, py: 0.75 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility sx={{ fontSize: 16 }} />}
                          onClick={() => handleViewCohort(cohort)}
                          sx={{
                            px: 1.5,
                            py: 0.25,
                            fontSize: "0.75rem",
                            borderRadius: "6px !important",
                            color: "primary.main",
                            border: "1px solid transparent",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              borderColor: "primary.main",
                            },
                          }}
                        >
                          View
                        </Button>
                        <Box flex={1} />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCohort(cohort.id)}
                          sx={{ p: 0.5 }}
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}

                {/* Create New Cohort Card */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    onClick={handleCreateCohort}
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
                        "& .create-cohort-icon": {
                          bgcolor: "primary.main",
                          color: "white",
                        },
                        "& .create-cohort-text": {
                          color: "primary.main",
                        }
                      }
                    }}
                  >
                    <Avatar
                      className="create-cohort-icon"
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
                      className="create-cohort-text"
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ transition: "all 0.2s ease-in-out" }}
                    >
                      Create New Cohort
                    </Typography>
                    <Typography variant="caption" color="text.disabled" mt={0.25}>
                      Define filters to screen patients
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Activity Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box
            sx={{
              height: "calc(100vh - 300px)",
              overflowY: "auto",
              overflowX: "hidden",
              pr: 1,
              pb: 6,
              "&::-webkit-scrollbar": {
                width: 6,
              },
              "&::-webkit-scrollbar-track": {
                bgcolor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "#d1d5db",
                borderRadius: 3,
                "&:hover": {
                  bgcolor: "#9ca3af",
                },
              },
            }}
          >
            <Paper elevation={0} sx={{ p: 3, mb: 4, border: "1px solid #ececf1" }}>
              <Typography variant="h6" gutterBottom>
                Activity Timeline
              </Typography>

              {isLoadingActivities ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={32} />
                </Box>
              ) : activities.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Timeline sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No activity recorded yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activities will appear here as you work with this study
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {activities.map((activity, index) => (
                    <Box
                      key={activity.id}
                      sx={{
                        display: "flex",
                        gap: 2,
                        py: 2,
                        borderBottom: index < activities.length - 1 ? "1px solid #ececf1" : "none",
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor:
                            activity.action === "created"
                              ? "success.light"
                              : activity.action === "deleted"
                              ? "error.light"
                              : "info.light",
                          color:
                            activity.action === "created"
                              ? "success.main"
                              : activity.action === "deleted"
                              ? "error.main"
                              : "info.main",
                        }}
                      >
                        {activity.entity_type === "cohort" ? (
                          <Group fontSize="small" />
                        ) : activity.entity_type === "master_data" ? (
                          <Storage fontSize="small" />
                        ) : activity.entity_type === "filter" ? (
                          <FilterList fontSize="small" />
                        ) : (
                          <Timeline fontSize="small" />
                        )}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={500}>
                          {activity.description}
                        </Typography>
                        <Box display="flex" gap={2} mt={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {activity.user_name || "System"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                          <Chip
                            label={activity.entity_type.replace("_", " ")}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>
        </TabPanel>

        {/* Visualizations Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box
            sx={{
              height: "calc(100vh - 340px)",
              overflowY: "auto",
              overflowX: "hidden",
              pr: 1,
              pb: 6,
              "&::-webkit-scrollbar": {
                width: 6,
              },
              "&::-webkit-scrollbar-track": {
                bgcolor: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "#d1d5db",
                borderRadius: 3,
                "&:hover": {
                  bgcolor: "#9ca3af",
                },
              },
            }}
          >
            {masterData.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, border: "1px solid #ececf1", textAlign: "center" }}>
                <BarChart sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Data Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload patient data to see visualizations
                </Typography>
              </Paper>
            ) : (
              <Box>
                {/* Master data selector if multiple files */}
                {masterData.length > 1 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      mb: 3,
                      border: "1px solid #e5e7eb",
                      borderRadius: 2.5,
                      background: "linear-gradient(135deg, #fafbfc 0%, #f8fafc 100%)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          bgcolor: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Storage sx={{ fontSize: 18, color: "#0284c7" }} />
                      </Box>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            color: "#1e293b",
                            fontSize: "0.9rem",
                          }}
                        >
                          Select Data Source
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#64748b", fontSize: "0.75rem" }}
                        >
                          Choose which dataset to visualize
                        </Typography>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        maxHeight: 165,
                        overflowY: "auto",
                        overflowX: "hidden",
                        pr: 0.5,
                        "&::-webkit-scrollbar": {
                          width: 4,
                        },
                        "&::-webkit-scrollbar-track": {
                          bgcolor: "transparent",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          bgcolor: "#d1d5db",
                          borderRadius: 2,
                        },
                      }}
                    >
                      {masterData.map((md) => {
                        const isSelected = (visualizationMasterDataId || masterData[0].id) === md.id;
                        return (
                          <Paper
                            key={md.id}
                            elevation={0}
                            onClick={() => setVisualizationMasterDataId(md.id)}
                            sx={{
                              px: 2,
                              py: 1.5,
                              cursor: "pointer",
                              borderRadius: 2,
                              border: isSelected
                                ? "2px solid #6366f1"
                                : "1px solid #e2e8f0",
                              bgcolor: isSelected ? "#eef2ff" : "#ffffff",
                              transition: "all 0.2s ease",
                              flexShrink: 0,
                              "&:hover": {
                                borderColor: isSelected ? "#6366f1" : "#c7d2fe",
                                bgcolor: isSelected ? "#eef2ff" : "#f8fafc",
                                transform: "translateY(-1px)",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: isSelected ? 600 : 500,
                                fontSize: "0.85rem",
                                color: isSelected ? "#4338ca" : "#374151",
                                mb: 0.25,
                              }}
                            >
                              {md.file_name}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: isSelected ? "#6366f1" : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: isSelected ? "#22c55e" : "#94a3b8",
                                  display: "inline-block",
                                }}
                              />
                              {md.row_count.toLocaleString()} rows
                            </Typography>
                          </Paper>
                        );
                      })}
                    </Box>
                  </Paper>
                )}

                {isLoadingVisualization ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : selectedVisualizationMasterData ? (
                  <DataVisualization
                    data={visualizationData}
                    columns={selectedVisualizationMasterData.columns || {}}
                    columnMetadata={selectedVisualizationMasterData.column_descriptions}
                    nullDetection={selectedVisualizationMasterData.null_detection}
                    title={`Patient Data Distribution - ${selectedVisualizationMasterData.file_name}`}
                    maxAutoCharts={10}
                    showQuickBuilder={true}
                    chartHeight={320}
                  />
                ) : null}
              </Box>
            )}
          </Box>
        </TabPanel>
      </Box>

      {/* Dialogs */}
      <StudyEditDialog
        open={isEditDialogOpen}
        study={study}
        onClose={() => setIsEditDialogOpen(false)}
        onSubmit={handleEditStudy}
        userId={userId}
        userName={userName}
      />

      <MasterDataUploadDialog
        open={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUpload={handleUploadMasterData}
      />

      <MergeCohortDialog
        open={isMergeCohortDialogOpen}
        studyId={studyId}
        cohorts={cohorts}
        onClose={() => setIsMergeCohortDialogOpen(false)}
        onMerge={handleMergeCohort}
      />

      {uploadedMasterDataId && (
        <NullDataReviewDialog
          open={isNullDataReviewOpen}
          onClose={() => setIsNullDataReviewOpen(false)}
          masterDataId={uploadedMasterDataId}
          masterDataName={uploadedMasterDataName}
          onEditComplete={handleNullDataEditComplete}
          onSkip={handleNullDataSkip}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
