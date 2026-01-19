"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Snackbar,
  Divider,
  Grid,
  TextField,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  InputAdornment,
} from "@mui/material"
import {
  ArrowBack,
  Save,
  Storage,
  AutoAwesome,
  CheckCircle,
  DoNotDisturb,
  Warning,
  FilterList,
  Visibility,
  Download,
  BarChart,
  Settings,
  Close,
  Search,
  SortByAlpha,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import { parseISO, isBefore, isAfter, isEqual, startOfDay, isValid } from "date-fns"

// Import components
import { SplitCriteriaPanel } from "@/components/patient-enrollment/split-criteria-panel"
import { NullDataReviewDialog } from "@/components/patient-enrollment/null-data-review-dialog"
import { CohortDataTable } from "@/components/patient-enrollment/cohort-detail/cohort-data-table"
import { DataVisualization } from "@/components/patient-enrollment/visualization"

// Services & Types
import cohortService from "@/services/patient-enrollment/cohort-service"
import type {
  MasterDataApi,
  CohortCreateRequest,
  FilterGroup,
  ColumnSchema,
  ColumnType,
  ColumnMetadata,
  Cohort,
  SchemaValidationResult,
  CriteriaFormula,
  UnifiedCriteriaRequest,
  FormulaRule,
  FormulaGroup,
} from "@/types/cohort.types"

/**
 * Simplify formula by unwrapping single-rule groups
 * e.g., { logic: "AND", rules: [singleRule] } -> singleRule
 */
function simplifyFormula(formula: FormulaRule | FormulaGroup): FormulaRule | FormulaGroup {
  // If it's not a group, return as-is
  if (!("logic" in formula)) {
    return formula
  }

  // Recursively simplify all nested rules first
  const simplifiedRules = formula.rules.map(r => simplifyFormula(r))

  // If group has only one rule and is not negated, unwrap it
  if (simplifiedRules.length === 1 && !formula.negate) {
    return simplifiedRules[0]
  }

  // Return the group with simplified rules
  return {
    ...formula,
    rules: simplifiedRules,
  }
}
import type { PatientData } from "@/lib/screening-logic"
import { validateSchemaAgainstFilter } from "@/utils/schema-validator"
import { detectPatientIdColumn, groupPatientRecords, type GroupedPatientResult } from "@/utils/patient-id-utils"
import { combineFormulasToFilterGroup } from "@/utils/formula-combiner"

export default function CreateCohortPage() {
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

  // Page loading state
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [studyName, setStudyName] = useState("")
  const [masterDataList, setMasterDataList] = useState<MasterDataApi[]>([])
  const [existingCohorts, setExistingCohorts] = useState<Cohort[]>([])

  // Cohort Details
  const [cohortName, setCohortName] = useState("")
  const [inclusionCriteria, setInclusionCriteria] = useState("")
  const [exclusionCriteria, setExclusionCriteria] = useState("")

  // Data Source
  const [selectedMasterDataId, setSelectedMasterDataId] = useState("")
  const [uploadedData, setUploadedData] = useState<PatientData[]>([])
  const [columns, setColumns] = useState<Record<string, ColumnType>>({})
  const [patientIdColumn, setPatientIdColumn] = useState<string>("")

  // Filter building
  const [currentFilter, setCurrentFilter] = useState<FilterGroup>({
    id: "root",
    logic: "AND",
    rules: [],
    excludeDirtyData: true,
  })
  const [filteredData, setFilteredData] = useState<PatientData[]>([])
  const [criteriaFormulas, setCriteriaFormulas] = useState<CriteriaFormula[]>([])
  const [processingCriteria, setProcessingCriteria] = useState<{ inclusion: boolean; exclusion: boolean }>({ inclusion: false, exclusion: false })
  const [activeTab, setActiveTab] = useState<"filters" | "preview" | "visualizations">("filters")
  const [saveFilterAs, setSaveFilterAs] = useState("")
  const [savedFilterId, setSavedFilterId] = useState<string | null>(null)
  const [isSavingFilter, setIsSavingFilter] = useState(false)

  // Null data review dialog state
  const [nullReviewDialogOpen, setNullReviewDialogOpen] = useState(false)
  const [masterDataWithNulls, setMasterDataWithNulls] = useState<MasterDataApi | null>(null)

  // Per-column null override settings (true = include missing, false = exclude, undefined = use global)
  const [columnNullOverrides, setColumnNullOverrides] = useState<Record<string, boolean | undefined>>({})
  const [advancedNullModalOpen, setAdvancedNullModalOpen] = useState(false)
  const [nullColumnSearch, setNullColumnSearch] = useState("")
  const [nullColumnSort, setNullColumnSort] = useState<"name" | "count" | "percentage">("count")

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false)

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info" | "warning"
  }>({
    open: false,
    message: "",
    severity: "info",
  })

  // Schema validation state (for filter validation only)
  const [schemaValidation, setSchemaValidation] = useState<SchemaValidationResult | null>(null)

  const selectedMasterData = masterDataList.find(md => md.id === selectedMasterDataId)

  // Build column metadata for AI process-criteria API calls
  const columnMetadata = useMemo(() => {
    const metadata: Record<string, ColumnMetadata> = {}
    for (const [colName, colType] of Object.entries(columns)) {
      metadata[colName] = { type: colType as "string" | "number" | "categorical" }
    }
    return metadata
  }, [columns])

  // Build categorical values from uploaded data for autocomplete
  const categoricalValues = useMemo(() => {
    if (uploadedData.length === 0) return {}

    const values: Record<string, string[]> = {}
    for (const [colName, colType] of Object.entries(columns)) {
      if (colType === "categorical") {
        // Get unique values from the data
        const uniqueValues = new Set<string>()
        for (const row of uploadedData) {
          const val = row[colName]
          if (val != null && val !== "") {
            uniqueValues.add(String(val))
          }
        }
        values[colName] = Array.from(uniqueValues).sort()
      }
    }
    return values
  }, [columns, uploadedData])

  // Create ordered columns with patient ID column first for preview
  const orderedColumns = useMemo(() => {
    if (!patientIdColumn || !columns[patientIdColumn]) {
      return columns
    }
    // Create a new object with patient ID column first
    const ordered: Record<string, ColumnType> = {
      [patientIdColumn]: columns[patientIdColumn],
    }
    // Add remaining columns
    for (const [key, value] of Object.entries(columns)) {
      if (key !== patientIdColumn) {
        ordered[key] = value
      }
    }
    return ordered
  }, [columns, patientIdColumn])

  // Calculate null stats per column
  const columnNullStats = useMemo(() => {
    if (uploadedData.length === 0) return {}

    const stats: Record<string, { nullCount: number; percentage: number }> = {}
    for (const colName of Object.keys(columns)) {
      let nullCount = 0
      for (const row of uploadedData) {
        const val = row[colName]
        if (val === null || val === undefined || val === "" || (typeof val === "string" && val.trim() === "")) {
          nullCount++
        }
      }
      stats[colName] = {
        nullCount,
        percentage: uploadedData.length > 0 ? Math.round((nullCount / uploadedData.length) * 100) : 0,
      }
    }
    return stats
  }, [columns, uploadedData])

  // Get columns with null values
  const columnsWithNulls = useMemo(() => {
    return Object.entries(columnNullStats)
      .filter(([_, stats]) => stats.nullCount > 0)
      .sort((a, b) => b[1].nullCount - a[1].nullCount)
  }, [columnNullStats])

  // Filtered and sorted columns for the advanced modal
  const filteredSortedColumnsWithNulls = useMemo(() => {
    let filtered = columnsWithNulls

    // Apply search filter
    if (nullColumnSearch.trim()) {
      const query = nullColumnSearch.toLowerCase().trim()
      filtered = filtered.filter(([colName]) => colName.toLowerCase().includes(query))
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      switch (nullColumnSort) {
        case "name":
          return a[0].localeCompare(b[0])
        case "count":
          return b[1].nullCount - a[1].nullCount
        case "percentage":
          return b[1].percentage - a[1].percentage
        default:
          return 0
      }
    })
  }, [columnsWithNulls, nullColumnSearch, nullColumnSort])

  // Total records with any null value
  const totalRecordsWithNulls = useMemo(() => {
    if (uploadedData.length === 0) return 0
    let count = 0
    for (const row of uploadedData) {
      for (const colName of Object.keys(columns)) {
        const val = row[colName]
        if (val === null || val === undefined || val === "" || (typeof val === "string" && val.trim() === "")) {
          count++
          break // Count each row only once
        }
      }
    }
    return count
  }, [uploadedData, columns])

  // Compute grouped patient records for the preview table
  // Groups records by patient ID and separates matched vs unmatched records
  const groupedPatientData = useMemo<GroupedPatientResult | undefined>(() => {
    // Only compute if we have filter applied and some results
    if (uploadedData.length === 0 || filteredData.length === 0) {
      return undefined
    }
    // Only group if filter is applied (not showing all data)
    if (filteredData.length === uploadedData.length) {
      return undefined
    }
    return groupPatientRecords(uploadedData, filteredData, patientIdColumn)
  }, [uploadedData, filteredData, patientIdColumn])

  // Determine if we should show grouped view
  const showGroupedView = useMemo(() => {
    return groupedPatientData != null && groupedPatientData.patientsWithUnmatchedRecords > 0
  }, [groupedPatientData])

  // Fetch study data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!studyId || !enterpriseId) return

      setIsPageLoading(true)
      try {
        // Fetch study info
        const studyResponse = await cohortService.getStudyById(studyId, enterpriseId)
        setStudyName(studyResponse.data.name)

        // Fetch master data list
        const masterDataResponse = await cohortService.getStudyMasterData(studyId, enterpriseId)
        console.log("📋 Master Data List Response:", masterDataResponse)
        console.log("📋 Master Data Array:", masterDataResponse.data)
        if (masterDataResponse.data && masterDataResponse.data.length > 0) {
          console.log("📋 First Master Data Item:", masterDataResponse.data[0])
          console.log("📋 First Item Null Detection:", masterDataResponse.data[0].null_detection)
        }
        setMasterDataList(masterDataResponse.data || [])

        // Fetch existing cohorts for "in_cohort" filter option
        try {
          const cohortsResponse = await cohortService.getStudyCohorts(studyId, enterpriseId)
          // Convert CohortApi to Cohort format for filter builder
          const cohorts: Cohort[] = cohortsResponse.data.content.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || "",
            patientIds: c.filtered_patient_ids || [],
            patientCount: c.patient_count,
            data: [],
            columns: c.columns as Record<string, ColumnType>,
            filter: c.filter || { id: "root", logic: "AND", rules: [] },
            createdAt: new Date(c.created_at),
          }))
          setExistingCohorts(cohorts)
        } catch (cohortErr) {
          console.error("Failed to load existing cohorts (non-critical):", cohortErr)
          // Don't fail the entire page if cohorts can't be loaded
          setExistingCohorts([])
        }
      } catch (err) {
        console.error("Failed to load study data:", err)
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : "Failed to load study data",
          severity: "error",
        })
      } finally {
        setIsPageLoading(false)
      }
    }

    fetchData()
  }, [studyId, enterpriseId])

  // Handle master data selection - load columns and fetch preview data
  const handleMasterDataSelect = async (masterDataId: string) => {
    console.log("🎯 handleMasterDataSelect called with ID:", masterDataId)
    setSelectedMasterDataId(masterDataId)
    const md = masterDataList.find(m => m.id === masterDataId)
    console.log("🎯 Found master data:", md)

    if (md) {
      const mdColumns = md.columns as Record<string, ColumnType>
      setColumns(mdColumns)
      setIsLoadingMasterData(true)

      try {
        // Fetch actual master data preview for filtering
        const previewResponse = await cohortService.getMasterDataPreview(
          masterDataId,
          enterpriseId,
          0, // first page
          Math.min(md.row_count, 1000) // up to 1000 rows for filtering
        )

        // Convert rows to PatientData format
        const previewData: PatientData[] = previewResponse.data.rows.map((row, idx) => ({
          _row_index: idx,
          ...row,
        })) as PatientData[]

        setUploadedData(previewData)
        setFilteredData(previewData)

        // Auto-detect patient ID column
        try {
          if (previewData.length > 0 && Object.keys(mdColumns).length > 0) {
            const detectedPatientIdCol = detectPatientIdColumn(previewData, mdColumns)
            if (detectedPatientIdCol) {
              setPatientIdColumn(detectedPatientIdCol)
            }
          }
        } catch (err) {
          console.error("Failed to auto-detect patient ID column:", err)
        }

        setSnackbar({
          open: true,
          message: `Loaded ${previewData.length} patient records for processing`,
          severity: "success",
        })
      } catch (err) {
        // If API fails, allow creating cohort with server-side filtering
        console.error("Failed to load master data preview:", err)
        setUploadedData([])
        setFilteredData([])

        // Still try to auto-detect patient ID from column names
        try {
          const possibleIdColumns = Object.keys(mdColumns).filter(col =>
            col.toLowerCase().includes('id') ||
            col.toLowerCase().includes('patient')
          )
          if (possibleIdColumns.length > 0) {
            setPatientIdColumn(possibleIdColumns[0])
          }
        } catch (err) {
          console.error("Failed to detect patient ID from column names:", err)
        }

        setSnackbar({
          open: true,
          message: "Could not load data preview. Filtering will be applied server-side.",
          severity: "info",
        })
      } finally {
        setIsLoadingMasterData(false)
      }
    }
  }


  const handleFilterChange = (filter: FilterGroup) => {
    // Validate and fix duplicate IDs before setting the filter
    const fixDuplicateIds = (group: FilterGroup, seenIds: Set<string> = new Set()): FilterGroup => {
      return {
        ...group,
        id: seenIds.has(group.id) ? `group_${Math.random().toString(36).substr(2, 9)}` : group.id,
        rules: group.rules.map((rule) => {
          if ("logic" in rule) {
            // It's a nested group
            return fixDuplicateIds(rule as FilterGroup, seenIds)
          } else {
            // It's a rule - check if ID is duplicate and regenerate if needed
            const ruleTyped = rule as any
            if (seenIds.has(rule.id)) {
              const newId = `${ruleTyped.field}_${ruleTyped.operator}_${Math.random().toString(36).substr(2, 9)}`
              seenIds.add(newId)
              return { ...rule, id: newId }
            } else {
              seenIds.add(rule.id)
              return rule
            }
          }
        })
      }
    }

    const fixedFilter = fixDuplicateIds(filter)
    setCurrentFilter(fixedFilter)
  }

  // Handle dirty data toggle - updates the filter's excludeDirtyData property
  const handleExcludeDirtyDataChange = (exclude: boolean) => {
    setCurrentFilter(prev => ({ ...prev, excludeDirtyData: exclude }))
  }

  // Schema validation: validate filter against selected dataset
  const validateFilterSchema = useCallback((): SchemaValidationResult | null => {
    if (!currentFilter || currentFilter.rules.length === 0) {
      setSchemaValidation(null)
      return null
    }

    const availableColumns = Object.keys(columns)
    const result = validateSchemaAgainstFilter(currentFilter, availableColumns)

    setSchemaValidation(result)

    if (!result.isValid) {
      setSnackbar({
        open: true,
        message: `Filter validation: ${result.missingColumns.length} column${result.missingColumns.length > 1 ? "s" : ""} not found in dataset`,
        severity: "error"
      })
    }

    return result
  }, [currentFilter, columns])

  // Trigger filter validation when filter changes
  useEffect(() => {
    if (currentFilter.rules.length > 0 && Object.keys(columns).length > 0) {
      const timer = setTimeout(() => {
        validateFilterSchema()
      }, 500)
      return () => clearTimeout(timer)
    } else if (currentFilter.rules.length === 0) {
      setSchemaValidation(null)
    }
  }, [currentFilter, columns, validateFilterSchema])

  // Convert criteriaFormulas to currentFilter and auto-apply filter when formulas change
  useEffect(() => {
    if (criteriaFormulas.length > 0) {
      const combinedFilter = combineFormulasToFilterGroup(criteriaFormulas, columns)
      // Preserve excludeDirtyData setting from previous filter
      const newFilter = {
        ...combinedFilter,
        excludeDirtyData: currentFilter.excludeDirtyData,
      }
      setCurrentFilter(newFilter)

      // Auto-apply filter
      if (uploadedData.length > 0) {
        const excludeDirty = newFilter.excludeDirtyData ?? true
        const filtered = applyAdvancedFilter(uploadedData, newFilter, columns, existingCohorts, excludeDirty, undefined, columnNullOverrides)
        setFilteredData(filtered)
      }
    } else {
      // No formulas - still apply dirty data filtering based on global setting
      if (uploadedData.length > 0) {
        const excludeDirty = currentFilter.excludeDirtyData ?? true
        // Only filter if we need to exclude dirty data or have per-column overrides
        if (excludeDirty || Object.keys(columnNullOverrides).length > 0) {
          const filtered = applyAdvancedFilter(uploadedData, currentFilter, columns, existingCohorts, excludeDirty, undefined, columnNullOverrides)
          setFilteredData(filtered)
        } else {
          // Include all - no filtering needed
          setFilteredData(uploadedData)
        }
      } else {
        setFilteredData(uploadedData)
      }
    }
  }, [criteriaFormulas, columns, uploadedData, existingCohorts, columnNullOverrides, currentFilter.excludeDirtyData])

  // Re-apply filter when excludeDirtyData or columnNullOverrides changes
  useEffect(() => {
    if (uploadedData.length > 0) {
      const excludeDirty = currentFilter.excludeDirtyData ?? true
      // Apply filter even when no rules - dirty data filtering should still work
      const filtered = applyAdvancedFilter(uploadedData, currentFilter, columns, existingCohorts, excludeDirty, undefined, columnNullOverrides)
      setFilteredData(filtered)
    }
  }, [currentFilter.excludeDirtyData, columnNullOverrides, uploadedData, currentFilter, columns, existingCohorts])

  // Sync text fields with formula sentences when formulas are edited/added/deleted
  useEffect(() => {
    // Extract sentences from inclusion formulas
    const inclusionSentences = criteriaFormulas
      .filter(f => f.type === "inclusion")
      .map(f => f.sentence)
      .filter(s => s && s.trim())

    // Extract sentences from exclusion formulas
    const exclusionSentences = criteriaFormulas
      .filter(f => f.type === "exclusion")
      .map(f => f.sentence)
      .filter(s => s && s.trim())

    // Update text fields with combined sentences (one per line)
    setInclusionCriteria(inclusionSentences.join("\n"))
    setExclusionCriteria(exclusionSentences.join("\n"))
  }, [criteriaFormulas])

  // Handle criteria processing for a specific type (inclusion or exclusion)
  const handleProcessCriteriaByType = useCallback(async (type: "inclusion" | "exclusion") => {
    const criteriaText = type === "inclusion" ? inclusionCriteria.trim() : exclusionCriteria.trim()

    if (!criteriaText) {
      setSnackbar({
        open: true,
        message: `Please enter ${type} criteria first`,
        severity: "warning",
      })
      return
    }

    // Validate that we have columns
    if (Object.keys(columns).length === 0) {
      setSnackbar({
        open: true,
        message: "Please select a dataset first",
        severity: "warning",
      })
      return
    }

    setProcessingCriteria(prev => ({ ...prev, [type]: true }))

    try {
      // Build column metadata for the request
      const colMetadata: Record<string, ColumnMetadata> = {}
      for (const [colName, colType] of Object.entries(columns)) {
        colMetadata[colName] = { type: colType as "string" | "number" | "categorical" }
      }

      // Build request for the specific type
      const request: UnifiedCriteriaRequest = {
        columns: colMetadata,
        inclusion_criteria: type === "inclusion" ? criteriaText : "",
        exclusion_criteria: type === "exclusion" ? criteriaText : "",
      }

      const response = await cohortService.processCriteria(request)

      if (response.status === "success" && response.data.criteria_formulas) {
        // Simplify formulas: unwrap single-rule groups for cleaner display
        const newFormulas = response.data.criteria_formulas
          .filter(f => f.type === type)
          .map(f => ({
            ...f,
            formula: simplifyFormula(f.formula),
          }))
        // Use functional update to avoid race condition when both buttons clicked together
        setCriteriaFormulas(prevFormulas => {
          const otherTypeFormulas = prevFormulas.filter(f => f.type !== type)
          return [...otherTypeFormulas, ...newFormulas]
        })

        // Show success message
        const count = newFormulas.length
        setSnackbar({
          open: true,
          message: `Processed ${count} ${type} criteria`,
          severity: "success",
        })
      } else {
        throw new Error(response.message || "Failed to process criteria")
      }
    } catch (err) {
      console.error("Criteria processing failed:", err)
      const errorStr = err instanceof Error ? err.message : String(err)
      // Check for Azure OpenAI content filter error
      const isContentFilterError =
        errorStr.includes("content_filter") ||
        errorStr.includes("content management policy") ||
        errorStr.includes("ResponsibleAIPolicyViolation") ||
        errorStr.includes("jailbreak")

      setSnackbar({
        open: true,
        message: isContentFilterError
          ? "Your criteria text was flagged by the content filter. Please rephrase your criteria using clinical or medical terminology and try again."
          : err instanceof Error ? err.message : "Failed to process criteria.",
        severity: isContentFilterError ? "warning" : "error",
      })
    } finally {
      setProcessingCriteria(prev => ({ ...prev, [type]: false }))
    }
  }, [inclusionCriteria, exclusionCriteria, columns])

  // Handle criteria processing errors (including content filter errors)
  const handleCriteriaError = useCallback((message: string, isContentFilterError?: boolean) => {
    setSnackbar({
      open: true,
      message: isContentFilterError
        ? message
        : `Error processing criteria: ${message}`,
      severity: isContentFilterError ? "warning" : "error",
    })
  }, [])

  // Handle null data editing complete
  const handleNullDataEditComplete = useCallback((newMasterDataId: string, version: number) => {
    // Update the selected master data ID to use the new version
    setSelectedMasterDataId(newMasterDataId)

    setSnackbar({
      open: true,
      message: `Successfully created version ${version} with edited values. Continue with cohort creation.`,
      severity: "success",
    })

    // Close the dialog
    setNullReviewDialogOpen(false)

    // Reload master data list to include the new version
    const fetchUpdatedMasterData = async () => {
      if (!studyId || !enterpriseId) return
      try {
        const masterDataResponse = await cohortService.getStudyMasterData(studyId, enterpriseId)
        setMasterDataList(masterDataResponse.data || [])
      } catch (err) {
        console.error("Failed to reload master data list:", err)
      }
    }
    fetchUpdatedMasterData()
  }, [studyId, enterpriseId])

  // Handle skip editing null values
  const handleSkipNullEditing = useCallback(() => {
    setNullReviewDialogOpen(false)
    setSnackbar({
      open: true,
      message: "Continuing with original data. Missing values will remain.",
      severity: "info",
    })
  }, [])

  // Navigation
  const handleBack = () => {
    router.push(`/patient-enrollment/studies/${studyId}`)
  }

  const handleSaveCohort = async () => {
    // Validation
    if (!cohortName.trim()) {
      setSnackbar({ open: true, message: "Please enter a cohort name", severity: "error" })
      return
    }
    if (!selectedMasterDataId) {
      setSnackbar({ open: true, message: "Please select a master data file", severity: "error" })
      return
    }

    // Schema validation if there are filter rules
    if (currentFilter.rules.length > 0) {
      const filterValidation = validateFilterSchema()
      if (filterValidation && !filterValidation.isValid) {
        setSnackbar({
          open: true,
          message: `Cannot save: Filter references ${filterValidation.missingColumns.length} non-existent column${filterValidation.missingColumns.length > 1 ? "s" : ""}`,
          severity: "error"
        })
        return
      }
    }

    if (!selectedMasterData) {
      setSnackbar({ open: true, message: "No master data selected", severity: "error" })
      return
    }

    setIsSubmitting(true)
    setIsSavingFilter(true)
    try {
      const masterDataId = selectedMasterDataId
      const masterDataPatientCount = selectedMasterData.row_count

      // Apply filters to get filtered data
      const excludeDirty = currentFilter.excludeDirtyData ?? true
      const filtered = applyAdvancedFilter(uploadedData, currentFilter, columns, existingCohorts, excludeDirty, undefined, columnNullOverrides)

      // Save filter to backend if there are rules and not already saved
      let filterIdToUse = savedFilterId
      if (currentFilter.rules.length > 0 && !savedFilterId) {
        try {
          const filterName = saveFilterAs.trim() || `${cohortName} - Filter`
          const filterResponse = await cohortService.createFilter({
            name: filterName,
            description: null,
            filter: currentFilter,
            is_template: !!saveFilterAs.trim(), // Mark as template only if user provided a name
            enterprise_id: enterpriseId,
            user_id: userId,
            user_name: userName || null,
          })
          filterIdToUse = filterResponse.data.id
        } catch (err) {
          console.error("Failed to save filter:", err)
          // Continue without saved filter ID - will send inline filter
        }
      }

      // Determine if we have client-side filtered data available
      // We have client-side data if uploadedData was loaded (either from upload or from master data preview)
      const hasClientSideData = uploadedData.length > 0

      // Extract patient IDs from filtered data when available
      const filteredPatientIds = hasClientSideData
        ? filtered.map((p, idx) => p[patientIdColumn]?.toString() || p.patient_id?.toString() || `patient_${idx}`)
        : null // Server will apply filters if no client-side data
      const patientCount = hasClientSideData
        ? filtered.length
        : 0 // Server will calculate after applying filters

      // IMPORTANT: Always use `columns` (which includes mapped column names) when saving
      // This ensures filter field references match the saved column schema.
      //
      // When column mappings are applied:
      // - `columns` contains the mapped column names (e.g., "age" mapped from "actual_age_field")
      // - Filters reference these mapped names (e.g., { field: "age", ... })
      // - We must save the same column schema so filters resolve correctly on reload
      //
      // Previously this used `originalColumns`, causing a namespace mismatch where:
      // - Filter referenced "age" but saved columns only had "actual_age_field"
      // - This caused filter rules to break when editing the cohort
      const columnsToSend = columns

      // Create cohort - use saved filter ID if available, otherwise use inline filter
      const cohortData: CohortCreateRequest = {
        name: cohortName.trim(),
        description: null,
        study_id: studyId,
        master_data_id: masterDataId,
        columns: columnsToSend as ColumnSchema,
        column_mappings: null, // No longer using separate column mappings
        filter_id: filterIdToUse || undefined, // Use saved filter ID if available
        filter: filterIdToUse ? undefined : currentFilter, // Only send inline filter if no saved filter ID
        save_filter_as: filterIdToUse ? undefined : (saveFilterAs.trim() || null), // Don't save again if already saved
        inclusion_criteria: inclusionCriteria.trim() || null, // Save free text criteria
        exclusion_criteria: exclusionCriteria.trim() || null, // Save free text criteria
        filtered_patient_ids: filteredPatientIds,
        patient_count: patientCount,
        master_data_patient_count: masterDataPatientCount,
        enterprise_id: enterpriseId,
        user_id: userId,
        user_name: userName || undefined,
      }

      const response = await cohortService.createCohort(cohortData)

      // Update study status to 'active' if this is the first cohort
      if (existingCohorts.length === 0) {
        try {
          await cohortService.updateStudy(studyId, enterpriseId, {
            status: "active",
            user_id: userId,
            user_name: userName || undefined,
          })
        } catch {
          // Don't fail the cohort creation if status update fails
          console.warn("Failed to update study status")
        }
      }

      const successMessage = !hasClientSideData
        ? `Cohort "${cohortName}" created successfully. Filters will be applied server-side.`
        : `Cohort "${cohortName}" created with ${filtered.length} patients`

      setSnackbar({
        open: true,
        message: successMessage,
        severity: "success",
      })

      // Navigate to cohort detail page immediately
      router.push(`/patient-enrollment/${response.data.id}`)
    } catch (err) {
      console.error("Failed to save cohort:", err)
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Failed to create cohort",
        severity: "error",
      })
    } finally {
      setIsSubmitting(false)
      setIsSavingFilter(false)
    }
  }

  // Helper to check if a filter rule is complete
  const isFilterRuleComplete = (rule: FilterGroup["rules"][number]): boolean => {
    if ("logic" in rule) {
      // It's a nested group - recursively check
      const group = rule as FilterGroup
      if (group.rules.length === 0) return true
      return group.rules.every(isFilterRuleComplete)
    }

    // It's a rule
    const r = rule as { field: string; operator: string; value: string | number | null; value2?: string | number | null }

    // Check field is selected
    if (!r.field) return false

    // Check operator is selected
    if (!r.operator) return false

    // Operators that don't need values
    if (r.operator === "is_empty" || r.operator === "is_not_empty") {
      return true
    }

    // Check value is not empty
    if (r.value === "" || r.value === null || r.value === undefined) {
      return false
    }

    // Between operator needs second value
    if (r.operator === "between") {
      if (r.value2 === "" || r.value2 === null || r.value2 === undefined) {
        return false
      }
    }

    return true
  }

  // Check if entire filter is complete
  const isFilterComplete = (filter: FilterGroup): boolean => {
    if (filter.rules.length === 0) return true
    return filter.rules.every(isFilterRuleComplete)
  }

  const filterIsValid = isFilterComplete(currentFilter)

  // Check if save button should be enabled
  const canSave = Boolean(cohortName.trim() && selectedMasterDataId && !processingCriteria.inclusion && !processingCriteria.exclusion && !isSubmitting)

  // Count criteria and unmapped concepts
  const inclusionCount = criteriaFormulas.filter(f => f.type === "inclusion").length
  const exclusionCount = criteriaFormulas.filter(f => f.type === "exclusion").length
  const inclusionUnmappedCount = criteriaFormulas
    .filter(f => f.type === "inclusion")
    .reduce((sum, f) => sum + (f.unmapped_concepts?.length || 0), 0)
  const exclusionUnmappedCount = criteriaFormulas
    .filter(f => f.type === "exclusion")
    .reduce((sum, f) => sum + (f.unmapped_concepts?.length || 0), 0)

  // Export functions for preview
  const handleExportCSV = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : uploadedData
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${cohortName.replace(/\s+/g, "_") || "cohort_preview"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : uploadedData
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Cohort Data")
    XLSX.writeFile(wb, `${cohortName.replace(/\s+/g, "_") || "cohort_preview"}.xlsx`)
  }

  // Loading state
  if (isPageLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Fixed Header */}
      <Box
        sx={{
          flexShrink: 0,
          zIndex: 10,
          bgcolor: "white",
        }}
      >
        {/* Breadcrumb with Back button */}
        <Box px={3} py={1.5} display="flex" alignItems="center" gap={1}>
          <IconButton
            size="small"
            onClick={handleBack}
            sx={{
              color: "#667085",
              "&:hover": { bgcolor: "#f8f9fa" },
            }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          <Breadcrumbs>
            <MuiLink
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => router.push("/patient-enrollment")}
              sx={{ cursor: "pointer" }}
            >
              Patient Enrollment
            </MuiLink>
            <MuiLink
              component="button"
              underline="hover"
              color="inherit"
              onClick={handleBack}
              sx={{ cursor: "pointer" }}
            >
              {studyName}
            </MuiLink>
            <Typography color="text.primary">Create New Cohort</Typography>
          </Breadcrumbs>
        </Box>

        <Divider />
      </Box>

      {/* Scrollable Content Area */}
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 3 }}>
        {/* Row 1: Cohort Name + Master Data */}
        <Paper elevation={0} sx={{ border: "1px solid #ececf1", p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Cohort Name"
                placeholder="e.g., Adult Patients with High EASI Score"
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
                required
                fullWidth
                inputProps={{ maxLength: 255 }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              {masterDataList.length === 0 ? (
                <Alert severity="warning">
                  No master data files available.
                </Alert>
              ) : (
                <FormControl fullWidth required>
                  <InputLabel required>Master Data</InputLabel>
                  <Select
                    value={selectedMasterDataId}
                    label="Master Data *"
                    onChange={(e) => handleMasterDataSelect(e.target.value)}
                  >
                    {masterDataList.map((md) => (
                      <MenuItem key={md.id} value={md.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Storage fontSize="small" color="action" />
                          {md.file_name} ({md.row_count.toLocaleString()} rows)
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>
          </Grid>

          {isLoadingMasterData && (
            <Box display="flex" alignItems="center" gap={2} mt={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading patient data...
              </Typography>
            </Box>
          )}

          {selectedMasterData && !isLoadingMasterData && (
            <>
              {/* Column info row */}
              <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedMasterData.row_count.toLocaleString()} patients · {Object.keys(columns).length} columns:
                </Typography>
                {Object.keys(columns).slice(0, 8).map((col) => (
                  <Chip key={col} label={col} size="small" variant="outlined" />
                ))}
                {Object.keys(columns).length > 8 && (
                  <Chip label={`+${Object.keys(columns).length - 8} more`} size="small" />
                )}
              </Box>

              {/* Missing data controls */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: totalRecordsWithNulls === 0
                    ? "#f0fdf4"
                    : currentFilter.excludeDirtyData
                      ? "#fffbeb"
                      : "#f0fdf4",
                  borderRadius: 1,
                  border: `1px solid ${totalRecordsWithNulls === 0
                    ? "#86efac"
                    : currentFilter.excludeDirtyData
                      ? "#fcd34d"
                      : "#86efac"}`,
                  transition: "all 0.2s ease-in-out",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {totalRecordsWithNulls > 0 ? (
                      currentFilter.excludeDirtyData ? (
                        <Warning sx={{ fontSize: 18, color: "#f59e0b" }} />
                      ) : (
                        <CheckCircle sx={{ fontSize: 18, color: "#22c55e" }} />
                      )
                    ) : (
                      <CheckCircle sx={{ fontSize: 18, color: "#22c55e" }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {totalRecordsWithNulls > 0
                        ? `${totalRecordsWithNulls.toLocaleString()} records (${Math.round((totalRecordsWithNulls / uploadedData.length) * 100)}%) have missing values`
                        : "No missing values detected"}
                    </Typography>
                    {columnsWithNulls.length > 0 && (
                      <Chip
                        label={`${columnsWithNulls.length} column${columnsWithNulls.length > 1 ? "s" : ""} affected`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          bgcolor: currentFilter.excludeDirtyData ? "#fef3c7" : "#dcfce7",
                          color: currentFilter.excludeDirtyData ? "#92400e" : "#166534",
                          transition: "all 0.2s ease-in-out",
                        }}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {totalRecordsWithNulls > 0 && (
                      <Tooltip title={currentFilter.excludeDirtyData ? "Records with missing/empty values will be excluded" : "Records with missing/empty values will be included"}>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={currentFilter.excludeDirtyData ?? true}
                              onChange={(e) => handleExcludeDirtyDataChange(e.target.checked)}
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": {
                                  color: "#ff9800",
                                },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                  backgroundColor: "#ff9800",
                                },
                                "& .MuiSwitch-switchBase:not(.Mui-checked)": {
                                  color: "#22c55e",
                                },
                                "& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track": {
                                  backgroundColor: "#22c55e",
                                  opacity: 0.7,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" sx={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              {currentFilter.excludeDirtyData ? "Exclude missing data" : "Include missing data"}
                            </Typography>
                          }
                          sx={{ mr: 0 }}
                        />
                      </Tooltip>
                    )}

                    {columnsWithNulls.length > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setAdvancedNullModalOpen(true)}
                        startIcon={<Settings sx={{ fontSize: 14 }} />}
                        sx={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          borderColor: "#e5e7eb",
                          textTransform: "none",
                          "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                        }}
                      >
                        Advanced
                        {Object.keys(columnNullOverrides).length > 0 && (
                          <Chip
                            label={Object.keys(columnNullOverrides).length}
                            size="small"
                            sx={{ ml: 0.5, height: 16, fontSize: "0.6rem", bgcolor: "#3b82f6", color: "white" }}
                          />
                        )}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Paper>

        {/* Row 2: Tabbed section for Filters & Preview */}
        <Paper elevation={0} sx={{ border: "1px solid #ececf1", borderRadius: 2, overflow: "hidden" }}>
          {/* Tab Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ececf1", bgcolor: "#fafbfc" }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                minHeight: 44,
                "& .MuiTab-root": {
                  minHeight: 44,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                },
              }}
            >
              <Tab
                value="filters"
                icon={<FilterList sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Filters"
              />
              <Tab
                value="preview"
                icon={<Visibility sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Preview"
              />
              <Tab
                value="visualizations"
                icon={<BarChart sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Visualizations"
              />
            </Tabs>
            <Box sx={{ pr: 2 }}>
              <Chip
                label={`${filteredData.length.toLocaleString()} / ${(uploadedData.length || selectedMasterData?.row_count || 0).toLocaleString()} patients matching`}
                size="small"
                color={filteredData.length > 0 ? "primary" : "default"}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>

          {/* Filters Tab Content */}
          {activeTab === "filters" && (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={3}>
          {/* Left: Inclusion Criteria */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                border: "2px solid #3b82f6",
                borderRadius: 2,
                p: 2,
                minHeight: 400,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircle sx={{ color: "#3b82f6" }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Inclusion Criteria
                  </Typography>
                  {inclusionCount > 0 && (
                    <Chip label={inclusionCount} size="small" color="primary" />
                  )}
                  {inclusionUnmappedCount > 0 && (
                    <Tooltip title={`${inclusionUnmappedCount} concept(s) could not be mapped to columns`}>
                      <Chip
                        icon={<Warning sx={{ fontSize: 12 }} />}
                        label={`${inclusionUnmappedCount} unmapped`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          bgcolor: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fcd34d",
                          "& .MuiChip-icon": { color: "#92400e" },
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
                <Tooltip
                  title={
                    !selectedMasterDataId
                      ? "Select master data first"
                      : !inclusionCriteria.trim()
                        ? "Enter inclusion criteria"
                        : processingCriteria.inclusion
                          ? "Processing..."
                          : ""
                  }
                  arrow
                  placement="top"
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        processingCriteria.inclusion
                          ? <CircularProgress size={14} sx={{ color: "#3b82f6" }} />
                          : <AutoAwesome sx={{ fontSize: 16 }} />
                      }
                      onClick={() => handleProcessCriteriaByType("inclusion")}
                      disabled={processingCriteria.inclusion || !selectedMasterDataId || !inclusionCriteria.trim()}
                      sx={{
                        borderColor: "#3b82f6",
                        color: "#3b82f6",
                        "&:hover": {
                          borderColor: "#2563eb",
                          bgcolor: "rgba(59, 130, 246, 0.04)",
                        },
                      }}
                    >
                      {processingCriteria.inclusion ? "Generating..." : "AI Generate"}
                    </Button>
                  </span>
                </Tooltip>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder={!selectedMasterDataId ? "Select master data first to enter criteria" : "e.g., Adults aged 18-65, diagnosed with Type 2 Diabetes, HbA1c between 7.0 and 10.0%"}
                value={inclusionCriteria}
                onChange={(e) => setInclusionCriteria(e.target.value)}
                disabled={!selectedMasterDataId}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": { borderColor: selectedMasterDataId ? "#3b82f6" : undefined },
                    "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                  },
                }}
              />

              <Divider sx={{ my: 2 }} />

              <SplitCriteriaPanel
                type="inclusion"
                criteriaFormulas={criteriaFormulas}
                columns={columns}
                columnMetadata={columnMetadata}
                categoricalValues={categoricalValues}
                onFormulasChange={setCriteriaFormulas}
                onError={handleCriteriaError}
                isLoading={processingCriteria.inclusion}
                totalCount={uploadedData.length || selectedMasterData?.row_count || 0}
              />
            </Paper>
          </Grid>

          {/* Right: Exclusion Criteria */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{
                border: "2px solid #ef4444",
                borderRadius: 2,
                p: 2,
                minHeight: 400,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DoNotDisturb sx={{ color: "#ef4444" }} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Exclusion Criteria
                  </Typography>
                  {exclusionCount > 0 && (
                    <Chip label={exclusionCount} size="small" color="error" />
                  )}
                  {exclusionUnmappedCount > 0 && (
                    <Tooltip title={`${exclusionUnmappedCount} concept(s) could not be mapped to columns`}>
                      <Chip
                        icon={<Warning sx={{ fontSize: 12 }} />}
                        label={`${exclusionUnmappedCount} unmapped`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          bgcolor: "#fef3c7",
                          color: "#92400e",
                          border: "1px solid #fcd34d",
                          "& .MuiChip-icon": { color: "#92400e" },
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
                <Tooltip
                  title={
                    !selectedMasterDataId
                      ? "Select master data first"
                      : !exclusionCriteria.trim()
                        ? "Enter exclusion criteria"
                        : processingCriteria.exclusion
                          ? "Processing..."
                          : ""
                  }
                  arrow
                  placement="top"
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        processingCriteria.exclusion
                          ? <CircularProgress size={14} sx={{ color: "#ef4444" }} />
                          : <AutoAwesome sx={{ fontSize: 16 }} />
                      }
                      onClick={() => handleProcessCriteriaByType("exclusion")}
                      disabled={processingCriteria.exclusion || !selectedMasterDataId || !exclusionCriteria.trim()}
                      sx={{
                        borderColor: "#ef4444",
                        color: "#ef4444",
                        "&:hover": {
                          borderColor: "#dc2626",
                          bgcolor: "rgba(239, 68, 68, 0.04)",
                        },
                      }}
                    >
                      {processingCriteria.exclusion ? "Generating..." : "AI Generate"}
                    </Button>
                  </span>
                </Tooltip>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder={!selectedMasterDataId ? "Select master data first to enter criteria" : "e.g., Pregnant patients, severe kidney disease (eGFR < 30), currently on insulin therapy"}
                value={exclusionCriteria}
                onChange={(e) => setExclusionCriteria(e.target.value)}
                disabled={!selectedMasterDataId}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": { borderColor: selectedMasterDataId ? "#ef4444" : undefined },
                    "&.Mui-focused fieldset": { borderColor: "#ef4444" },
                  },
                }}
              />

              <Divider sx={{ my: 2 }} />

              <SplitCriteriaPanel
                type="exclusion"
                criteriaFormulas={criteriaFormulas}
                columns={columns}
                columnMetadata={columnMetadata}
                categoricalValues={categoricalValues}
                onFormulasChange={setCriteriaFormulas}
                onError={handleCriteriaError}
                isLoading={processingCriteria.exclusion}
                totalCount={uploadedData.length || selectedMasterData?.row_count || 0}
              />
            </Paper>
              </Grid>
            </Grid>
            </Box>
          )}

          {/* Preview Tab Content */}
          {activeTab === "preview" && (
            <Box sx={{ p: 2 }}>
              {!selectedMasterDataId ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    Select master data to preview patients
                  </Typography>
                </Box>
              ) : uploadedData.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress size={24} sx={{ mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Loading patient data...
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {/* Export buttons */}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Download sx={{ fontSize: 16 }} />}
                      onClick={handleExportCSV}
                      disabled={filteredData.length === 0 && uploadedData.length === 0}
                    >
                      Export CSV
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Download sx={{ fontSize: 16 }} />}
                      onClick={handleExportExcel}
                      disabled={filteredData.length === 0 && uploadedData.length === 0}
                    >
                      Export Excel
                    </Button>
                  </Box>

                  {/* Data table */}
                  <CohortDataTable
                    data={filteredData.length > 0 ? filteredData : uploadedData}
                    columns={orderedColumns}
                    title={`${cohortName || "Cohort Preview"} (${filteredData.length > 0 ? filteredData.length : uploadedData.length} patients)`}
                    groupedData={groupedPatientData}
                    showGroupedView={showGroupedView}
                    appliedFilter={currentFilter}
                    columnNullOverrides={columnNullOverrides}
                    criteriaFormulas={criteriaFormulas}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Visualizations Tab Content */}
          {activeTab === "visualizations" && (
            <Box sx={{ p: 2 }}>
              {!selectedMasterDataId ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <BarChart sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Select master data to see visualizations
                  </Typography>
                </Box>
              ) : uploadedData.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <CircularProgress size={24} sx={{ mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Loading patient data...
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {/* Master Data Visualization */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", borderRadius: 2 }}>
                      <DataVisualization
                        data={uploadedData}
                        columns={columns}
                        columnMetadata={selectedMasterData?.column_descriptions}
                        nullDetection={selectedMasterData?.null_detection}
                        title="Master Data Distribution"
                        maxAutoCharts={4}
                        showQuickBuilder={false}
                        chartHeight={220}
                      />
                    </Paper>
                  </Grid>

                  {/* Filtered Data Visualization */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={0} sx={{ p: 2, border: "1px solid #ececf1", borderRadius: 2 }}>
                      <DataVisualization
                        data={filteredData.length > 0 ? filteredData : uploadedData}
                        columns={columns}
                        columnMetadata={selectedMasterData?.column_descriptions}
                        nullDetection={selectedMasterData?.null_detection}
                        title={`Filtered Data (${filteredData.length > 0 ? filteredData.length : uploadedData.length} patients)`}
                        maxAutoCharts={4}
                        showQuickBuilder={false}
                        chartHeight={220}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </Paper>

        {/* Row 3: Footer with Count & Save */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 3,
            p: 2,
            bgcolor: "#f8f9fa",
            borderRadius: 2,
            border: "1px solid #ececf1",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip
              label={`${filteredData.length.toLocaleString()} / ${(uploadedData.length || selectedMasterData?.row_count || 0).toLocaleString()} patients matching`}
              color={filteredData.length === (uploadedData.length || selectedMasterData?.row_count || 0) ? "default" : "primary"}
              variant="outlined"
            />
            {criteriaFormulas.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {inclusionCount} inclusion, {exclusionCount} exclusion criteria
              </Typography>
            )}
          </Box>

          <Tooltip
            title={
              !cohortName.trim()
                ? "Please enter a cohort name"
                : !selectedMasterDataId
                  ? "Please select a master data file"
                  : (processingCriteria.inclusion || processingCriteria.exclusion)
                    ? "Processing criteria..."
                    : ""
            }
            arrow
            placement="top"
            disableHoverListener={canSave}
          >
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={handleSaveCohort}
                disabled={!canSave}
                sx={{ fontWeight: 600 }}
              >
                {isSubmitting ? "Saving..." : "Save Cohort"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Advanced Missing Data Settings Modal */}
      <Dialog
        open={advancedNullModalOpen}
        onClose={() => {
          setAdvancedNullModalOpen(false)
          setNullColumnSearch("")
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Settings sx={{ fontSize: 20, color: "#64748b" }} />
            <Typography variant="h6" fontWeight={600}>
              Advanced Missing Data Settings
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => {
            setAdvancedNullModalOpen(false)
            setNullColumnSearch("")
          }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "#f8fafc", borderRadius: 1, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" color="text.secondary">
              All columns default to <strong>{currentFilter.excludeDirtyData ? "Exclude" : "Include"}</strong> (from global switch).
              Override specific columns below if needed.
            </Typography>
          </Box>

          {/* Search and Sort Controls */}
          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search columns..."
              value={nullColumnSearch}
              onChange={(e) => setNullColumnSearch(e.target.value)}
              sx={{ flex: 1, maxWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: "#9ca3af" }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={nullColumnSort}
                label="Sort by"
                onChange={(e) => setNullColumnSort(e.target.value as "name" | "count" | "percentage")}
                startAdornment={<SortByAlpha sx={{ fontSize: 16, color: "#9ca3af", mr: 0.5 }} />}
              >
                <MenuItem value="count">Empty Count</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="name">Column Name</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              {filteredSortedColumnsWithNulls.length} of {columnsWithNulls.length} columns
            </Typography>
          </Box>

          <TableContainer sx={{ maxHeight: 350 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Column Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, bgcolor: "#f8fafc", width: 120 }}>Empty Count</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, bgcolor: "#f8fafc", width: 200 }}>Missing Data Handling</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSortedColumnsWithNulls.map(([colName, stats]) => (
                  <TableRow key={colName} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{colName}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${stats.nullCount} (${stats.percentage}%)`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          bgcolor: stats.percentage > 50 ? "#fef2f2" : stats.percentage > 20 ? "#fffbeb" : "#f0fdf4",
                          color: stats.percentage > 50 ? "#dc2626" : stats.percentage > 20 ? "#d97706" : "#16a34a",
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
                        <FormControlLabel
                          checked={
                            columnNullOverrides[colName] !== undefined
                              ? columnNullOverrides[colName] === true
                              : !currentFilter.excludeDirtyData
                          }
                          onChange={() => {
                            // If global is Include (excludeDirtyData=false), selecting Include means follow global (remove override)
                            // If global is Exclude (excludeDirtyData=true), selecting Include means override to true
                            if (!currentFilter.excludeDirtyData) {
                              // Global is Include, so Include = follow global
                              setColumnNullOverrides(prev => {
                                const newState = { ...prev }
                                delete newState[colName]
                                return newState
                              })
                            } else {
                              // Global is Exclude, so Include = override
                              setColumnNullOverrides(prev => ({ ...prev, [colName]: true }))
                            }
                          }}
                          control={<Radio size="small" sx={{ color: "#22c55e", "&.Mui-checked": { color: "#22c55e" } }} />}
                          label={<Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 500 }}>Include</Typography>}
                          sx={{ m: 0 }}
                        />
                        <FormControlLabel
                          checked={
                            columnNullOverrides[colName] !== undefined
                              ? columnNullOverrides[colName] === false
                              : currentFilter.excludeDirtyData
                          }
                          onChange={() => {
                            // If global is Exclude (excludeDirtyData=true), selecting Exclude means follow global (remove override)
                            // If global is Include (excludeDirtyData=false), selecting Exclude means override to false
                            if (currentFilter.excludeDirtyData) {
                              // Global is Exclude, so Exclude = follow global
                              setColumnNullOverrides(prev => {
                                const newState = { ...prev }
                                delete newState[colName]
                                return newState
                              })
                            } else {
                              // Global is Include, so Exclude = override
                              setColumnNullOverrides(prev => ({ ...prev, [colName]: false }))
                            }
                          }}
                          control={<Radio size="small" sx={{ color: "#f59e0b", "&.Mui-checked": { color: "#f59e0b" } }} />}
                          label={<Typography variant="caption" sx={{ color: "#d97706", fontWeight: 500 }}>Exclude</Typography>}
                          sx={{ m: 0 }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSortedColumnsWithNulls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No columns match your search
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setColumnNullOverrides({})}
            disabled={Object.keys(columnNullOverrides).length === 0}
            sx={{ color: "#64748b" }}
          >
            Reset All to Default
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setAdvancedNullModalOpen(false)
                setNullColumnSearch("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setAdvancedNullModalOpen(false)
                setNullColumnSearch("")
              }}
            >
              Apply
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Null Data Review Dialog */}
      {masterDataWithNulls && (
        <NullDataReviewDialog
          open={nullReviewDialogOpen}
          onClose={() => setNullReviewDialogOpen(false)}
          masterDataId={masterDataWithNulls.id}
          masterDataName={masterDataWithNulls.file_name}
          onEditComplete={handleNullDataEditComplete}
          onSkip={handleSkipNullEditing}
        />
      )}

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

// Helper function to check if a value is empty
function isValueEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  )
}

// Helper function to find the actual field name in patient data (case-insensitive)
function findActualFieldName(fieldName: string, patient: PatientData): string {
  // First try exact match
  if (fieldName in patient) {
    return fieldName
  }
  // Then try case-insensitive match
  const lowerField = fieldName.toLowerCase()
  for (const key of Object.keys(patient)) {
    if (key.toLowerCase() === lowerField) {
      return key
    }
  }
  return fieldName // Return original if no match found
}

// Helper function to find actual column name in columns object (case-insensitive)
function findActualColumnName(columnName: string, columns: Record<string, ColumnType>): string {
  // First try exact match
  if (columnName in columns) {
    return columnName
  }
  // Then try case-insensitive match
  const lowerName = columnName.toLowerCase()
  for (const key of Object.keys(columns)) {
    if (key.toLowerCase() === lowerName) {
      return key
    }
  }
  return columnName // Return original if no match found
}

// Helper function to extract per-column missing data settings from filter rules
function extractMissingDataSettings(filter: FilterGroup): Map<string, boolean | undefined> {
  const settings = new Map<string, boolean | undefined>()

  const extractFromRules = (rules: FilterGroup["rules"]) => {
    for (const rule of rules) {
      if ("logic" in rule && "rules" in rule) {
        // Nested group - recurse
        extractFromRules((rule as FilterGroup).rules)
      } else {
        // It's a FilterRule
        const r = rule as { field: string; includeMissingData?: boolean }
        if (r.field && r.includeMissingData !== undefined) {
          settings.set(r.field, r.includeMissingData)
        }
      }
    }
  }

  extractFromRules(filter.rules)
  return settings
}

// Helper function to apply advanced nested filters
function applyAdvancedFilter(
  data: PatientData[],
  filter: FilterGroup,
  columns: Record<string, ColumnType>,
  cohorts: Cohort[],
  excludeDirtyData: boolean = true,
  columnMappings?: Record<string, string> | null,
  columnNullOverrides?: Record<string, boolean | undefined>
): PatientData[] {
  // Extract per-column missing data settings from filter rules
  const perColumnMissingDataSettings = extractMissingDataSettings(filter)

  // Merge UI column overrides (they take precedence over filter rule settings)
  if (columnNullOverrides) {
    for (const [col, setting] of Object.entries(columnNullOverrides)) {
      if (setting !== undefined) {
        perColumnMissingDataSettings.set(col, setting)
      }
    }
  }

  let filteredData = data

  // Apply dirty data filter with per-column overrides
  if (excludeDirtyData || perColumnMissingDataSettings.size > 0) {
    const columnKeys = Object.keys(columns)
    filteredData = filteredData.filter((patient) => {
      // Check each column for missing values
      for (const col of columnKeys) {
        // Use column mapping as pointer to resolve actual column name in the data
        // Then use case-insensitive matching to find the actual field in patient data
        const mappedCol = columnMappings?.[col] || col
        const actualCol = findActualFieldName(mappedCol, patient)
        const isEmpty = isValueEmpty(patient[actualCol])
        if (!isEmpty) continue // Column has value, no issue

        // Column is empty - check per-column setting
        const columnSetting = perColumnMissingDataSettings.get(col)

        if (columnSetting === true) {
          // Per-column override: include missing data for this column
          continue // Skip this column, don't exclude the record
        } else if (columnSetting === false) {
          // Per-column override: exclude missing data for this column
          return false // Exclude this record
        } else {
          // No per-column override - use global setting
          if (excludeDirtyData) {
            return false // Exclude this record (global setting)
          }
          // Global setting is to include, so continue
        }
      }
      return true // All columns passed the check
    })
  }

  // Then apply user-defined filter rules
  if (filter.rules.length === 0) return filteredData

  return filteredData.filter((patient, idx) => {
    return evaluateFilterGroup(patient, idx, filter, columns, cohorts, perColumnMissingDataSettings, excludeDirtyData, columnMappings)
  })
}

function evaluateFilterGroup(
  patient: PatientData,
  patientIdx: number,
  group: FilterGroup,
  columns: Record<string, ColumnType>,
  cohorts: Cohort[],
  perColumnMissingDataSettings: Map<string, boolean | undefined>,
  globalExcludeDirtyData: boolean,
  columnMappings?: Record<string, string> | null
): boolean {
  if (group.rules.length === 0) return true

  const results = group.rules.map((rule) => {
    if ("logic" in rule) {
      // It's a nested group
      return evaluateFilterGroup(patient, patientIdx, rule as FilterGroup, columns, cohorts, perColumnMissingDataSettings, globalExcludeDirtyData, columnMappings)
    } else {
      // It's a rule
      return evaluateRule(patient, patientIdx, rule, columns, cohorts, perColumnMissingDataSettings, globalExcludeDirtyData, columnMappings)
    }
  })

  // Apply negate if set
  const result = group.logic === "AND" ? results.every((r) => r) : results.some((r) => r)
  return group.negate ? !result : result
}

function evaluateRule(
  patient: PatientData,
  patientIdx: number,
  rule: { field: string; operator: string; value: string | number | null; value2?: string | number | null; includeMissingData?: boolean },
  columns: Record<string, ColumnType>,
  cohorts: Cohort[],
  perColumnMissingDataSettings: Map<string, boolean | undefined>,
  globalExcludeDirtyData: boolean,
  columnMappings?: Record<string, string> | null
): boolean {
  // Use column mapping as pointer to resolve actual column name in the data
  // Then use case-insensitive matching to find the actual field in patient data
  const mappedField = columnMappings?.[rule.field] || rule.field
  const actualField = findActualFieldName(mappedField, patient)
  const value = patient[actualField]
  const compareValue = rule.value
  const valueIsEmpty = isValueEmpty(value)

  // Handle missing data for this specific rule
  // Note: The pre-filter already handles most missing data cases,
  // but we need to handle the case where a rule explicitly checks for empty/not-empty
  // or when the rule's includeMissingData setting affects the evaluation

  // For is_empty and is_not_empty operators, evaluate directly
  if (rule.operator === "is_empty") {
    return valueIsEmpty
  }
  if (rule.operator === "is_not_empty") {
    return !valueIsEmpty
  }

  // For other operators, if the value is empty, check includeMissingData setting
  if (valueIsEmpty) {
    // Get the per-column setting (from the rule itself or extracted settings)
    const columnSetting = rule.includeMissingData ?? perColumnMissingDataSettings.get(rule.field)

    if (columnSetting === true) {
      // Include missing data - treat as matching (true)
      return true
    } else if (columnSetting === false) {
      // Exclude missing data - treat as not matching (false)
      return false
    } else {
      // Use global setting
      if (globalExcludeDirtyData) {
        return false // Exclude records with missing data
      }
      // Global includes missing data - for comparison operators, missing value can't match
      // Return false as empty values don't satisfy numeric/string comparisons
      return false
    }
  }

  // Helper to parse date values
  const parseDate = (val: unknown): Date | null => {
    if (!val) return null
    if (val instanceof Date) return startOfDay(val)
    if (typeof val === "number") return startOfDay(new Date(val))
    if (typeof val === "string") {
      const isoDate = parseISO(val)
      if (isValid(isoDate)) return startOfDay(isoDate)
      const nativeDate = new Date(val)
      if (isValid(nativeDate)) return startOfDay(nativeDate)
    }
    return null
  }

  switch (rule.operator) {
    case "equals":
      return String(value).toLowerCase() === String(compareValue).toLowerCase()
    case "not_equals":
      return String(value).toLowerCase() !== String(compareValue).toLowerCase()
    case "contains":
      return String(value).toLowerCase().includes(String(compareValue).toLowerCase())
    case "gt":
      return Number(value) > Number(compareValue)
    case "gte":
      return Number(value) >= Number(compareValue)
    case "lt":
      return Number(value) < Number(compareValue)
    case "lte":
      return Number(value) <= Number(compareValue)
    case "between":
      return Number(value) >= Number(compareValue) && Number(value) <= Number(rule.value2)
    // Date operators
    case "on_date": {
      const dateVal = parseDate(value)
      const compareDateVal = parseDate(compareValue)
      if (!dateVal || !compareDateVal) return false
      return isEqual(dateVal, compareDateVal)
    }
    case "before": {
      const dateVal = parseDate(value)
      const compareDateVal = parseDate(compareValue)
      if (!dateVal || !compareDateVal) return false
      return isBefore(dateVal, compareDateVal)
    }
    case "after": {
      const dateVal = parseDate(value)
      const compareDateVal = parseDate(compareValue)
      if (!dateVal || !compareDateVal) return false
      return isAfter(dateVal, compareDateVal)
    }
    case "on_or_before": {
      const dateVal = parseDate(value)
      const compareDateVal = parseDate(compareValue)
      if (!dateVal || !compareDateVal) return false
      return isEqual(dateVal, compareDateVal) || isBefore(dateVal, compareDateVal)
    }
    case "on_or_after": {
      const dateVal = parseDate(value)
      const compareDateVal = parseDate(compareValue)
      if (!dateVal || !compareDateVal) return false
      return isEqual(dateVal, compareDateVal) || isAfter(dateVal, compareDateVal)
    }
    case "between_dates": {
      const dateVal = parseDate(value)
      const startDate = parseDate(compareValue)
      const endDate = parseDate(rule.value2)
      if (!dateVal || !startDate || !endDate) return false
      return (isEqual(dateVal, startDate) || isAfter(dateVal, startDate)) &&
             (isEqual(dateVal, endDate) || isBefore(dateVal, endDate))
    }
    case "in_cohort":
      const cohortIn = cohorts.find((c) => c.id === compareValue)
      if (!cohortIn) return true
      // Use the value from the selected patient ID column (rule.field)
      const patientId = value?.toString() || `patient-${patientIdx}`
      return cohortIn.patientIds.includes(patientId)
    case "not_in_cohort":
      const cohortNotIn = cohorts.find((c) => c.id === compareValue)
      if (!cohortNotIn) return true
      // Use the value from the selected patient ID column (rule.field)
      const pId = value?.toString() || `patient-${patientIdx}`
      return !cohortNotIn.patientIds.includes(pId)
    default:
      return true
  }
}
