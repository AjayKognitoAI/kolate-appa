"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  TextField,
  Chip,
  Tooltip,
} from "@mui/material"
import {
  ArrowBack,
  People,
  FilterList,
  CompareArrows,
  CheckCircle,
  DoNotDisturb,
  AutoAwesome,
  Save,
  Warning,
  BarChart,
} from "@mui/icons-material"

// Components
import { CohortHeader } from "@/components/patient-enrollment/cohort-detail/cohort-header"
import { CohortStatsSummary } from "@/components/patient-enrollment/cohort-detail/cohort-stats-summary"
import { CohortDataTable } from "@/components/patient-enrollment/cohort-detail/cohort-data-table"
import { CohortEditDialog } from "@/components/patient-enrollment/cohort-detail/cohort-edit-dialog"
import { CohortDownloadMenu } from "@/components/patient-enrollment/cohort-detail/cohort-download-menu"
import { CohortComparisonDialog } from "@/components/patient-enrollment/cohort-detail/cohort-comparison-dialog"
import { CohortComparisonResults } from "@/components/patient-enrollment/cohort-detail/cohort-comparison-results"
import { SplitCriteriaPanel } from "@/components/patient-enrollment/split-criteria-panel"
import { DataVisualization } from "@/components/patient-enrollment/visualization"

// Services & Types
import cohortService from "@/services/patient-enrollment/cohort-service"
import type {
  CohortApi,
  FilterGroup,
  ColumnType,
  CohortCompareData,
  CriteriaFormula,
  ColumnMetadata,
  UnifiedCriteriaRequest,
  FormulaRule,
  FormulaGroup,
} from "@/types/cohort.types"
import { combineFormulasToFilterGroup } from "@/utils/formula-combiner"
import { groupPatientRecords, type GroupedPatientResult } from "@/utils/patient-id-utils"
import type { PatientData } from "@/lib/screening-logic"

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
        maxHeight: "calc(100vh - 380px)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {value === index && children}
    </div>
  )
}

// ============ FILTER APPLICATION LOGIC ============
// (Moved from main page.tsx - applies filters client-side)

function applyAdvancedFilter(
  data: PatientData[],
  filter: FilterGroup,
  columns: Record<string, ColumnType>,
  columnMappings?: Record<string, string> | null
): PatientData[] {
  if (!filter.rules || filter.rules.length === 0) {
    return data
  }

  return data.filter((patient, idx) => {
    const result = evaluateFilterGroup(patient, idx, filter, columns, columnMappings)
    return filter.negate ? !result : result
  })
}

function evaluateFilterGroup(
  patient: PatientData,
  patientIdx: number,
  group: FilterGroup,
  columns: Record<string, ColumnType>,
  columnMappings?: Record<string, string> | null
): boolean {
  if (!group.rules || group.rules.length === 0) {
    return true
  }

  const results = group.rules.map((rule) => {
    if ("logic" in rule) {
      // Nested group
      const result = evaluateFilterGroup(patient, patientIdx, rule as FilterGroup, columns, columnMappings)
      return (rule as FilterGroup).negate ? !result : result
    } else {
      // Single rule
      return evaluateRule(patient, patientIdx, rule, columns, columnMappings)
    }
  })

  return group.logic === "AND"
    ? results.every((r) => r)
    : results.some((r) => r)
}

function evaluateRule(
  patient: PatientData,
  _patientIdx: number,
  rule: { field: string; operator: string; value: string | number | null; value2?: string | number | null },
  columns: Record<string, ColumnType>,
  columnMappings?: Record<string, string> | null
): boolean {
  // Use column mapping as a pointer to resolve the actual column name
  // If rule.field is a mapped name (e.g., "age"), look up the actual column (e.g., "patient_age")
  const actualField = columnMappings?.[rule.field] || rule.field
  const fieldValue = patient[actualField]

  // Get column type - check both the mapped name and actual field name
  const columnType = columns[rule.field] || columns[actualField] || "string"

  // Handle empty checks first
  if (rule.operator === "is_empty") {
    return fieldValue === undefined || fieldValue === null || fieldValue === ""
  }
  if (rule.operator === "is_not_empty") {
    return fieldValue !== undefined && fieldValue !== null && fieldValue !== ""
  }

  // For other operators, if field is empty, return false
  if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
    return false
  }

  const value = rule.value
  const value2 = rule.value2

  // Numeric comparisons
  if (columnType === "number") {
    const numField = Number(fieldValue)
    const numValue = Number(value)

    switch (rule.operator) {
      case "equals":
        return numField === numValue
      case "not_equals":
        return numField !== numValue
      case "gt":
        return numField > numValue
      case "gte":
        return numField >= numValue
      case "lt":
        return numField < numValue
      case "lte":
        return numField <= numValue
      case "between":
        return numField >= numValue && numField <= Number(value2)
      default:
        return false
    }
  }

  // String/categorical comparisons
  const strField = String(fieldValue).toLowerCase()
  const strValue = String(value).toLowerCase()

  switch (rule.operator) {
    case "equals":
      return strField === strValue
    case "not_equals":
      return strField !== strValue
    case "contains":
      return strField.includes(strValue)
    default:
      return false
  }
}

// ============ MAIN COMPONENT ============

export default function CohortDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const cohortId = params?.id as string

  // Get user context for API calls
  const enterpriseId = session?.user?.orgId || ""
  const userId = session?.user?.sub || ""
  const userName = session?.user?.firstName
    ? `${session.user.firstName} ${session.user.lastName || ""}`.trim()
    : session?.user?.email || ""

  // Loading & error state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cohort data
  const [cohort, setCohort] = useState<CohortApi | null>(null)
  const [masterData, setMasterData] = useState<PatientData[]>([])
  const [filteredData, setFilteredData] = useState<PatientData[]>([])
  const [allCohorts, setAllCohorts] = useState<CohortApi[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState(0)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false)
  const [comparisonResults, setComparisonResults] = useState<CohortCompareData | null>(null)

  // Criteria editing state (similar to create-cohort page)
  const [inclusionCriteria, setInclusionCriteria] = useState("")
  const [exclusionCriteria, setExclusionCriteria] = useState("")
  const [criteriaFormulas, setCriteriaFormulas] = useState<CriteriaFormula[]>([])
  const [processingCriteria, setProcessingCriteria] = useState<{ inclusion: boolean; exclusion: boolean }>({ inclusion: false, exclusion: false })
  const [isSavingCriteria, setIsSavingCriteria] = useState(false)
  const [isInitialFilterLoad, setIsInitialFilterLoad] = useState(true) // Track if this is initial load

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

  // Loading state for master data (separate from initial load)
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false)

  // Visualization state
  const [showFilteredDataViz, setShowFilteredDataViz] = useState(true)

  // Build column metadata for AI process-criteria API calls
  const columnMetadata = useMemo(() => {
    if (!cohort) return {}
    const metadata: Record<string, ColumnMetadata> = {}
    for (const [colName, colType] of Object.entries(cohort.columns)) {
      metadata[colName] = { type: colType as "string" | "number" | "categorical" }
    }
    return metadata
  }, [cohort])

  // Build categorical values from master data for autocomplete
  const categoricalValues = useMemo(() => {
    if (masterData.length === 0 || !cohort) return {}

    const values: Record<string, string[]> = {}
    for (const [colName, colType] of Object.entries(cohort.columns)) {
      if (colType === "categorical") {
        const uniqueValues = new Set<string>()
        for (const row of masterData) {
          const val = row[colName]
          if (val != null && val !== "") {
            uniqueValues.add(String(val))
          }
        }
        values[colName] = Array.from(uniqueValues).sort()
      }
    }
    return values
  }, [cohort, masterData])

  // Count criteria
  const inclusionCount = criteriaFormulas.filter(f => f.type === "inclusion").length
  const exclusionCount = criteriaFormulas.filter(f => f.type === "exclusion").length
  const inclusionUnmappedCount = criteriaFormulas
    .filter(f => f.type === "inclusion")
    .reduce((sum, f) => sum + (f.unmapped_concepts?.length || 0), 0)
  const exclusionUnmappedCount = criteriaFormulas
    .filter(f => f.type === "exclusion")
    .reduce((sum, f) => sum + (f.unmapped_concepts?.length || 0), 0)

  // Compute grouped patient records for the screened patients table
  // Groups records by patient ID and separates matched vs unmatched records
  const groupedPatientData = useMemo<GroupedPatientResult | undefined>(() => {
    // Only compute if we have both master data and filtered data
    if (masterData.length === 0 || filteredData.length === 0) {
      return undefined
    }
    // Only group if filter is applied (not showing all data)
    if (filteredData.length === masterData.length) {
      return undefined
    }
    // Detect patient ID column from cohort columns
    const patientIdColumn = Object.keys(cohort?.columns || {}).find(col =>
      /^(patient_?id|subject_?id|participant_?id|id)$/i.test(col)
    )
    return groupPatientRecords(masterData, filteredData, patientIdColumn)
  }, [masterData, filteredData, cohort?.columns])

  // Determine if we should show grouped view
  const showGroupedView = useMemo(() => {
    return groupedPatientData != null && groupedPatientData.patientsWithUnmatchedRecords > 0
  }, [groupedPatientData])

  // Fetch cohort data
  const fetchCohortData = useCallback(async () => {
    if (!cohortId || !enterpriseId) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch cohort metadata
      const cohortResponse = await cohortService.getCohortById(cohortId)
      let cohortData = cohortResponse.data

      // If cohort has filter_id but no filter object, fetch the filter separately
      if (cohortData.filter_id && (!cohortData.filter || !cohortData.filter.rules || cohortData.filter.rules.length === 0)) {
        try {
          const filterResponse = await cohortService.getFilterById(cohortData.filter_id)
          cohortData = {
            ...cohortData,
            filter: filterResponse.data.filter
          }
        } catch (filterErr) {
          console.warn("Failed to fetch filter by ID:", filterErr)
          // Continue without the filter - it will show as empty
        }
      }

      // If column_mappings exist but columns doesn't include the mapped names,
      // augment the columns schema with mapped column names for backward compatibility
      // This handles cohorts created before the fix where originalColumns were saved
      if (cohortData.column_mappings && Object.keys(cohortData.column_mappings).length > 0) {
        const augmentedColumns = { ...cohortData.columns }
        Object.entries(cohortData.column_mappings).forEach(([mappedName, originalName]) => {
          // Add mapped column name with the same type as the original column
          if (cohortData.columns[originalName] && !augmentedColumns[mappedName]) {
            augmentedColumns[mappedName] = cohortData.columns[originalName]
          }
        })
        cohortData = {
          ...cohortData,
          columns: augmentedColumns
        }
      }

      setCohort(cohortData)

      // Load inclusion/exclusion criteria text from cohort data
      if (cohortData.inclusion_criteria) {
        setInclusionCriteria(cohortData.inclusion_criteria)
      }
      if (cohortData.exclusion_criteria) {
        setExclusionCriteria(cohortData.exclusion_criteria)
      }

      // Fetch actual master data using the master_data_id from cohort
      if (cohortData.master_data_id) {
        setIsLoadingMasterData(true)
        try {
          // Fetch master data preview (up to 1000 rows for display)
          const masterDataResponse = await cohortService.getMasterDataPreview(
            cohortData.master_data_id,
            enterpriseId,
            0, // first page
            1000 // fetch up to 1000 rows
          )

          // Convert rows to PatientData format
          // Column mappings are stored as a record but NOT applied to transform data
          // Instead, mappings are used as pointers during filter evaluation to resolve actual column names
          const allMasterData: PatientData[] = masterDataResponse.data.rows.map((row, idx) => {
            const rowData = row as Record<string, string | number>
            return {
              _row_index: idx,
              ...rowData,
            } as PatientData
          })

          setMasterData(allMasterData)

          // Filter to show only the screened patients based on filtered_patient_ids
          const filteredPatientIds = cohortData.filtered_patient_ids || []
          if (filteredPatientIds.length > 0) {
            // Create a Set for faster lookup
            const filteredIdsSet = new Set(filteredPatientIds.map(id => String(id)))

            // Filter master data to only include patients in the filtered list
            const screenedData = allMasterData.filter((patient) => {
              // Try to match by patient_id field (common identifier field names)
              const patientId = patient.patient_id || patient.PatientId || patient.PATIENT_ID ||
                patient.id || patient.Id || patient.ID ||
                patient.subject_id || patient.SubjectId || patient.SUBJECT_ID ||
                patient.Participant_ID || patient.participant_id || patient.PARTICIPANTID
              return patientId && filteredIdsSet.has(String(patientId))
            })

            // If we got matches, use them; otherwise use row index matching as fallback
            if (screenedData.length > 0) {
              setFilteredData(screenedData)
            } else {
              // Fallback: assume filtered_patient_ids are row indices or sequential IDs
              // Try to match by index position
              const indexBasedData = filteredPatientIds
                .map((id) => {
                  const idx = parseInt(String(id).replace('patient_', ''), 10)
                  return !isNaN(idx) && idx < allMasterData.length ? allMasterData[idx] : null
                })
                .filter((d): d is PatientData => d !== null)

              if (indexBasedData.length > 0) {
                setFilteredData(indexBasedData)
              } else {
                // Last resort: show all master data if no matching strategy works
                setFilteredData(allMasterData)
              }
            }
          } else {
            // No filter applied, show all data
            setFilteredData(allMasterData)
          }
        } catch (masterDataErr) {
          console.error("Failed to load master data preview:", masterDataErr)
          // Fallback to placeholder data if master data fetch fails
          const patientIds = cohortData.filtered_patient_ids || []
          const placeholderData: PatientData[] = patientIds.map((id, index) => ({
            patient_id: id,
            _row_index: index,
          }))
          setMasterData(placeholderData)
          setFilteredData(placeholderData)
          setSnackbar({
            open: true,
            message: "Could not load complete patient data. Showing patient IDs only.",
            severity: "info",
          })
        } finally {
          setIsLoadingMasterData(false)
        }
      } else {
        // No master_data_id, use placeholder
        const patientIds = cohortData.filtered_patient_ids || []
        const placeholderData: PatientData[] = patientIds.map((id, index) => ({
          patient_id: id,
          _row_index: index,
        }))
        setMasterData(placeholderData)
        setFilteredData(placeholderData)
      }

      // Fetch cohorts from the same study for comparison and filtering
      if (cohortData.study_id) {
        const studyCohortsResponse = await cohortService.getStudyCohorts(
          cohortData.study_id,
          enterpriseId,
          0,   // page
          100  // size
        )
        setAllCohorts(studyCohortsResponse.data.content.filter((c) => c.id !== cohortId))
      } else {
        // Fallback: if no study_id, fetch all cohorts (for backward compatibility)
        const allCohortsResponse = await cohortService.getCohorts({
          enterprise_id: enterpriseId,
          size: 100
        })
        setAllCohorts(allCohortsResponse.data.content.filter((c) => c.id !== cohortId))
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load cohort data"
      setError(errorMessage)
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [cohortId, enterpriseId])

  useEffect(() => {
    fetchCohortData()
  }, [fetchCohortData])

  // Handlers
  const handleBack = () => {
    // Navigate back to the study detail page if cohort has a study_id
    if (cohort?.study_id) {
      router.push(`/patient-enrollment/studies/${cohort.study_id}`)
    } else {
      router.push("/patient-enrollment")
    }
  }

  const handleBackToStudies = () => {
    router.push("/patient-enrollment")
  }

  const handleEditSave = async (name: string, description: string) => {
    if (!cohort || !userId) return

    try {
      await cohortService.updateCohort(cohort.id, {
        name,
        description,
        user_id: userId,
        user_name: userName || undefined,
      })
      setCohort({ ...cohort, name, description })
      setIsEditDialogOpen(false)
      setSnackbar({
        open: true,
        message: "Cohort updated successfully",
        severity: "success",
      })
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to update cohort",
        severity: "error",
      })
    }
  }

  const handleCompare = async (selectedCohortIds: string[]) => {
    if (!cohort) return

    try {
      const response = await cohortService.compareCohorts([cohort.id, ...selectedCohortIds])
      // Cast the response data to CohortCompareData since the API returns a generic object
      setComparisonResults(response.data as unknown as CohortCompareData)
      setIsCompareDialogOpen(false)
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to compare cohorts",
        severity: "error",
      })
    }
  }

  // Handle criteria processing for a specific type (inclusion or exclusion)
  const handleProcessCriteriaByType = useCallback(async (type: "inclusion" | "exclusion") => {
    // Simplify formula by unwrapping single-rule groups
    const simplifyFormula = (formula: FormulaRule | FormulaGroup): FormulaRule | FormulaGroup => {
      if (!("logic" in formula)) {
        return formula
      }
      const simplifiedRules = formula.rules.map(r => simplifyFormula(r))
      if (simplifiedRules.length === 1 && !formula.negate) {
        return simplifiedRules[0]
      }
      return {
        ...formula,
        rules: simplifiedRules,
      }
    }

    const criteriaText = type === "inclusion" ? inclusionCriteria.trim() : exclusionCriteria.trim()

    if (!criteriaText) {
      setSnackbar({
        open: true,
        message: `Please enter ${type} criteria first`,
        severity: "warning",
      })
      return
    }

    if (!cohort || Object.keys(cohort.columns).length === 0) {
      setSnackbar({
        open: true,
        message: "No columns available for processing",
        severity: "warning",
      })
      return
    }

    setProcessingCriteria(prev => ({ ...prev, [type]: true }))

    try {
      const colMetadata: Record<string, ColumnMetadata> = {}
      for (const [colName, colType] of Object.entries(cohort.columns)) {
        colMetadata[colName] = { type: colType as "string" | "number" | "categorical" }
      }

      const request: UnifiedCriteriaRequest = {
        columns: colMetadata,
        inclusion_criteria: type === "inclusion" ? criteriaText : "",
        exclusion_criteria: type === "exclusion" ? criteriaText : "",
      }

      const response = await cohortService.processCriteria(request)

      if (response.status === "success" && response.data.criteria_formulas) {
        const newFormulas = response.data.criteria_formulas
          .filter(f => f.type === type)
          .map(f => ({
            ...f,
            formula: simplifyFormula(f.formula),
          }))
        setCriteriaFormulas(prevFormulas => {
          const otherTypeFormulas = prevFormulas.filter(f => f.type !== type)
          return [...otherTypeFormulas, ...newFormulas]
        })

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
  }, [inclusionCriteria, exclusionCriteria, cohort])

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

  // Handle saving updated criteria
  const handleSaveCriteria = async () => {
    if (!cohort || !userId) return

    setIsSavingCriteria(true)

    try {
      // Convert criteria formulas to filter group
      const newFilter = combineFormulasToFilterGroup(criteriaFormulas, cohort.columns)

      // Apply filter to get new filtered data
      const filtered = applyAdvancedFilter(masterData, newFilter, cohort.columns, cohort.column_mappings)
      const newFilteredIds = filtered.map((p, idx) => {
        const patientId = p.patient_id || p.PatientId || p.PATIENT_ID ||
          p.id || p.Id || p.ID ||
          p.subject_id || p.SubjectId || p.SUBJECT_ID ||
          p.Participant_ID || p.participant_id || p.PARTICIPANTID
        return patientId?.toString() || `patient_${idx}`
      })

      // Save to backend
      await cohortService.updateCohort(cohort.id, {
        filter: newFilter,
        inclusion_criteria: inclusionCriteria.trim() || null,
        exclusion_criteria: exclusionCriteria.trim() || null,
        filtered_patient_ids: newFilteredIds,
        patient_count: newFilteredIds.length,
        user_id: userId,
        user_name: userName || undefined,
      })

      // Update local state
      setFilteredData(filtered)
      setCohort({
        ...cohort,
        filter: newFilter,
        inclusion_criteria: inclusionCriteria.trim() || null,
        exclusion_criteria: exclusionCriteria.trim() || null,
        filtered_patient_ids: newFilteredIds,
        patient_count: newFilteredIds.length,
      })

      setSnackbar({
        open: true,
        message: `Criteria saved: ${filtered.length} patients match`,
        severity: "success",
      })
    } catch (err) {
      console.error("Failed to save criteria:", err)
      setSnackbar({
        open: true,
        message: "Failed to save criteria",
        severity: "error",
      })
    } finally {
      setIsSavingCriteria(false)
    }
  }

  // NOTE: We do NOT auto-apply filter when criteria change.
  // Filter is only applied when user clicks "Save Criteria".
  // This matches the original behavior and prevents overwriting the correct filtered data on load.

  // Sync text fields with formula sentences when formulas are edited/added/deleted
  // Skip during initial load to preserve saved criteria text from API
  useEffect(() => {
    if (isInitialFilterLoad) return // Don't sync during initial load

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
  }, [criteriaFormulas, isInitialFilterLoad])

  // Load existing filter from cohort when cohort data is loaded
  useEffect(() => {
    if (cohort?.filter && cohort.filter.rules && cohort.filter.rules.length > 0 && criteriaFormulas.length === 0 && isInitialFilterLoad) {
      // Convert existing filter rules to CriteriaFormula format
      const loadedFormulas: CriteriaFormula[] = []

      const processRule = (rule: FilterGroup["rules"][number], isNegated: boolean = false, groupName?: string): void => {
        if ("logic" in rule) {
          // It's a nested group - check if it's an exclusion group by name or negate flag
          const group = rule as FilterGroup & { name?: string }
          const isExclusionGroup = group.name?.toLowerCase().includes("exclusion") || group.negate
          const groupIsNegated = isExclusionGroup || isNegated
          group.rules.forEach(r => processRule(r, groupIsNegated, group.name))
        } else {
          // It's a single rule - convert to CriteriaFormula
          const filterRule = rule as { id: string; field: string; operator: string; value: string | number | null; value2?: string | number | null }

          // Generate a human-readable sentence from the rule
          const operatorText = {
            equals: "equals",
            not_equals: "does not equal",
            contains: "contains",
            gt: "is greater than",
            gte: "is at least",
            lt: "is less than",
            lte: "is at most",
            between: "is between",
            is_empty: "is empty",
            is_not_empty: "is not empty",
          }[filterRule.operator] || filterRule.operator

          let sentence = `${filterRule.field} ${operatorText}`
          if (filterRule.operator === "between") {
            sentence += ` ${filterRule.value} and ${filterRule.value2}`
          } else if (filterRule.value !== null && filterRule.operator !== "is_empty" && filterRule.operator !== "is_not_empty") {
            sentence += ` ${filterRule.value}`
          }

          const formula: CriteriaFormula = {
            sentence,
            type: isNegated ? "exclusion" : "inclusion",
            category: "Demographics",
            formula: {
              field: filterRule.field,
              operator: filterRule.operator,
              value: filterRule.value,
              value2: filterRule.value2,
            } as FormulaRule,
            column_suggestions: [],
            unmapped_concepts: [],
          }

          loadedFormulas.push(formula)
        }
      }

      cohort.filter.rules.forEach(rule => processRule(rule, cohort.filter?.negate || false))

      if (loadedFormulas.length > 0) {
        setCriteriaFormulas(loadedFormulas)
      }

      // Mark initial load as complete after a short delay to ensure state is set
      setTimeout(() => {
        setIsInitialFilterLoad(false)
      }, 100)
    } else if (cohort && (!cohort.filter || !cohort.filter.rules || cohort.filter.rules.length === 0) && isInitialFilterLoad) {
      // No existing filter - mark initial load as complete
      setIsInitialFilterLoad(false)
    }
  }, [cohort, criteriaFormulas.length, isInitialFilterLoad])

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    )
  }

  // Error state
  if (error || !cohort) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Cohort not found"}
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={handleBack}>
          Back to Cohorts
        </Button>
      </Box>
    )
  }

  // Use API values for stats - master_data_patient_count is the total from the master data
  const masterPatientCount = cohort.master_data_patient_count
  const screenedPatientCount = cohort.patient_count
  const matchRate = masterPatientCount > 0
    ? ((screenedPatientCount / masterPatientCount) * 100).toFixed(1)
    : "0"

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      {/* Breadcrumb */}
      <Box px={3} py={1.5}>
        <Breadcrumbs>
          <MuiLink
            component="button"
            underline="hover"
            color="inherit"
            onClick={handleBackToStudies}
            sx={{ cursor: "pointer" }}
          >
            Patient Enrollment
          </MuiLink>
          {cohort.study_id && (
            <MuiLink
              component="button"
              underline="hover"
              color="inherit"
              onClick={handleBack}
              sx={{ cursor: "pointer" }}
            >
              Study
            </MuiLink>
          )}
          <Typography color="text.primary">{cohort.name}</Typography>
        </Breadcrumbs>
      </Box>

      <Divider />

      {/* Header */}
      <Box px={3} py={2}>
        <CohortHeader
          cohort={cohort}
          onBack={handleBack}
          onEdit={() => setIsEditDialogOpen(true)}
        />
      </Box>

      <Divider />

      {/* Stats Summary */}
      <Box px={3} py={2}>
        <CohortStatsSummary
          masterPatientCount={masterPatientCount}
          screenedPatientCount={screenedPatientCount}
          matchRate={Number(matchRate)}
          filterCount={inclusionCount + exclusionCount}
          columnCount={Object.keys(cohort.columns).length}
          createdAt={cohort.created_at}
        />
      </Box>

      <Divider />

      {/* Tabs */}
      <Box px={3} sx={{ overflow: "hidden" }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: "divider", minHeight: 48 }}
          >
            <Tab icon={<People />} iconPosition="start" label="Screened Patients" />
            <Tab icon={<FilterList />} iconPosition="start" label="Criteria" />
            <Tab icon={<BarChart />} iconPosition="start" label="Visualizations" />
            {comparisonResults && (
              <Tab icon={<CompareArrows />} iconPosition="start" label="Comparison Results" />
            )}
          </Tabs>

          {/* Action Buttons */}
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`${filteredData.length.toLocaleString()} / ${masterPatientCount.toLocaleString()} patients matching`}
              size="small"
              color={filteredData.length > 0 ? "primary" : "default"}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <CohortDownloadMenu
              cohortId={cohort.id}
              cohortName={cohort.name}
              masterData={masterData}
              screenedData={filteredData}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<CompareArrows />}
              onClick={() => setIsCompareDialogOpen(true)}
              disabled={allCohorts.length === 0}
              sx={{ textTransform: "none" }}
            >
              Compare Cohorts
            </Button>
          </Box>
        </Box>

        {/* Tab Panels */}
        {/* Screened Patients Tab */}
        <TabPanel value={activeTab} index={0}>
          {isLoadingMasterData ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={6}>
              <CircularProgress size={32} sx={{ mr: 2 }} />
              <Typography color="text.secondary">Loading patient data...</Typography>
            </Box>
          ) : (
            <CohortDataTable
              data={filteredData}
              columns={cohort.columns}
              title={`Screened Patients (${filteredData.length.toLocaleString()})`}
              groupedData={groupedPatientData}
              showGroupedView={showGroupedView}
            />
          )}
        </TabPanel>

        {/* Criteria Tab - Inclusion/Exclusion editing */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ py: 2 }}>
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
                        !inclusionCriteria.trim()
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
                          disabled={processingCriteria.inclusion || !inclusionCriteria.trim()}
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
                    placeholder="e.g., Adults aged 18-65, diagnosed with Type 2 Diabetes, HbA1c between 7.0 and 10.0%"
                    value={inclusionCriteria}
                    onChange={(e) => setInclusionCriteria(e.target.value)}
                    sx={{
                      mb: 2,
                      "& .MuiOutlinedInput-root": {
                        "&:hover fieldset": { borderColor: "#3b82f6" },
                        "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                      },
                    }}
                  />

                  <Divider sx={{ my: 2 }} />

                  <SplitCriteriaPanel
                    type="inclusion"
                    criteriaFormulas={criteriaFormulas}
                    columns={cohort.columns}
                    columnMetadata={columnMetadata}
                    categoricalValues={categoricalValues}
                    onFormulasChange={setCriteriaFormulas}
                    onError={handleCriteriaError}
                    isLoading={processingCriteria.inclusion}
                    totalCount={masterPatientCount}
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
                        !exclusionCriteria.trim()
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
                          disabled={processingCriteria.exclusion || !exclusionCriteria.trim()}
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
                    placeholder="e.g., Pregnant patients, severe kidney disease (eGFR < 30), currently on insulin therapy"
                    value={exclusionCriteria}
                    onChange={(e) => setExclusionCriteria(e.target.value)}
                    sx={{
                      mb: 2,
                      "& .MuiOutlinedInput-root": {
                        "&:hover fieldset": { borderColor: "#ef4444" },
                        "&.Mui-focused fieldset": { borderColor: "#ef4444" },
                      },
                    }}
                  />

                  <Divider sx={{ my: 2 }} />

                  <SplitCriteriaPanel
                    type="exclusion"
                    criteriaFormulas={criteriaFormulas}
                    columns={cohort.columns}
                    columnMetadata={columnMetadata}
                    categoricalValues={categoricalValues}
                    onFormulasChange={setCriteriaFormulas}
                    onError={handleCriteriaError}
                    isLoading={processingCriteria.exclusion}
                    totalCount={masterPatientCount}
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Save button */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                mt: 3,
                p: 2,
                bgcolor: "#f8f9fa",
                borderRadius: 2,
                border: "1px solid #ececf1",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {criteriaFormulas.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {inclusionCount} inclusion, {exclusionCount} exclusion criteria
                  </Typography>
                )}
                <Button
                  variant="contained"
                  color="success"
                  startIcon={isSavingCriteria ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  onClick={handleSaveCriteria}
                  disabled={isSavingCriteria || criteriaFormulas.length === 0}
                  sx={{ fontWeight: 600 }}
                >
                  {isSavingCriteria ? "Saving..." : "Save Criteria"}
                </Button>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Visualizations Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box>
            {/* Toggle between Master and Filtered data */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #ececf1" }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Data Source:
                </Typography>
                <Box display="flex" gap={1}>
                  <Chip
                    label={`Screened Data (${filteredData.length.toLocaleString()})`}
                    variant={showFilteredDataViz ? "filled" : "outlined"}
                    color={showFilteredDataViz ? "primary" : "default"}
                    onClick={() => setShowFilteredDataViz(true)}
                    sx={{ cursor: "pointer" }}
                  />
                  <Chip
                    label={`All Master Data (${masterData.length.toLocaleString()})`}
                    variant={!showFilteredDataViz ? "filled" : "outlined"}
                    color={!showFilteredDataViz ? "primary" : "default"}
                    onClick={() => setShowFilteredDataViz(false)}
                    sx={{ cursor: "pointer" }}
                  />
                </Box>
              </Box>
            </Paper>

            <DataVisualization
              data={showFilteredDataViz ? filteredData : masterData}
              columns={cohort.columns}
              title={showFilteredDataViz ? "Cohort Patient Distribution" : "Master Data Distribution"}
              maxAutoCharts={10}
              showQuickBuilder={true}
            />
          </Box>
        </TabPanel>

        {/* Comparison Results Tab */}
        {comparisonResults && (
          <TabPanel value={activeTab} index={3}>
            <CohortComparisonResults
              results={comparisonResults}
              currentCohortId={cohort.id}
            />
          </TabPanel>
        )}
      </Box>

      {/* Dialogs */}
      <CohortEditDialog
        open={isEditDialogOpen}
        cohort={cohort}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEditSave}
      />

      <CohortComparisonDialog
        open={isCompareDialogOpen}
        allCohorts={allCohorts}
        onClose={() => setIsCompareDialogOpen(false)}
        onCompare={handleCompare}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
