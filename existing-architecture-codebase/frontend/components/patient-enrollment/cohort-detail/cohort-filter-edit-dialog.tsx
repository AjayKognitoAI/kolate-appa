"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material"
import { FilterList, Preview, Save, Close } from "@mui/icons-material"
import { parseISO, isBefore, isAfter, isEqual, startOfDay, isValid } from "date-fns"
import { FullScreenFilterBuilder } from "@/components/patient-enrollment/full-screen-filter-builder"
import type { FilterGroup, ColumnType, CohortApi, Cohort } from "@/types/cohort.types"
import type { PatientData } from "@/lib/screening-logic"

interface CohortFilterEditDialogProps {
  open: boolean
  filter: FilterGroup
  columns: Record<string, ColumnType>
  originalColumns: Record<string, ColumnType>  // Original columns before mapping
  columnMappings: Record<string, string> | null  // Current column mappings
  masterData: PatientData[]
  allCohorts: CohortApi[]
  onClose: () => void
  onSave: (filter: FilterGroup, filteredIds: string[], updatedColumns?: Record<string, ColumnType>, updatedMappings?: Record<string, string>) => Promise<void>
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

// Apply filter function (updated to support dirty data filtering and column mappings)
function applyAdvancedFilter(
  data: PatientData[],
  filter: FilterGroup,
  columns: Record<string, ColumnType>,
  cohorts: Cohort[],
  excludeDirtyData: boolean = false,
  columnMappings?: Record<string, string> | null
): PatientData[] {
  let filteredData = data

  // First, apply dirty data filter if enabled
  if (excludeDirtyData) {
    const columnKeys = Object.keys(columns)
    filteredData = filteredData.filter((patient) => {
      // Check if any column has an empty value
      // Use column mapping as pointer to resolve actual column name
      return !columnKeys.some((col) => {
        const actualCol = columnMappings?.[col] || col
        return isValueEmpty(patient[actualCol])
      })
    })
  }

  // Then apply user-defined filter rules
  if (!filter.rules || filter.rules.length === 0) {
    return filteredData
  }

  return filteredData.filter((patient, idx) => {
    const result = evaluateFilterGroup(patient, idx, filter, columns, cohorts, columnMappings)
    return filter.negate ? !result : result
  })
}

function evaluateFilterGroup(
  patient: PatientData,
  patientIdx: number,
  group: FilterGroup,
  columns: Record<string, ColumnType>,
  cohorts: Cohort[],
  columnMappings?: Record<string, string> | null
): boolean {
  if (!group.rules || group.rules.length === 0) {
    return true
  }

  const results = group.rules.map((rule) => {
    if ("logic" in rule) {
      const result = evaluateFilterGroup(patient, patientIdx, rule as FilterGroup, columns, cohorts, columnMappings)
      return (rule as FilterGroup).negate ? !result : result
    } else {
      return evaluateRule(patient, patientIdx, rule, columns, cohorts, columnMappings)
    }
  })

  return group.logic === "AND"
    ? results.every((r) => r)
    : results.some((r) => r)
}

function evaluateRule(
  patient: PatientData,
  patientIdx: number,
  rule: { field: string; operator: string; value: string | number | null; value2?: string | number | null },
  columns: Record<string, ColumnType>,
  cohorts: Cohort[],
  columnMappings?: Record<string, string> | null
): boolean {
  // Use column mapping as pointer to resolve actual column name in the data
  const actualField = columnMappings?.[rule.field] || rule.field
  const fieldValue = patient[actualField]
  // Get column type - check both the mapped name and actual field name
  const columnType = columns[rule.field] || columns[actualField] || "string"
  const compareValue = rule.value

  if (rule.operator === "is_empty") {
    return fieldValue === undefined || fieldValue === null || fieldValue === ""
  }
  if (rule.operator === "is_not_empty") {
    return fieldValue !== undefined && fieldValue !== null && fieldValue !== ""
  }

  // Handle cohort operators
  if (rule.operator === "in_cohort") {
    const cohortIn = cohorts.find((c) => c.id === compareValue)
    if (!cohortIn) return true
    const patientId = patient.patient_id?.toString() || `patient-${patientIdx}`
    return cohortIn.patientIds.includes(patientId)
  }
  if (rule.operator === "not_in_cohort") {
    const cohortNotIn = cohorts.find((c) => c.id === compareValue)
    if (!cohortNotIn) return true
    const pId = patient.patient_id?.toString() || `patient-${patientIdx}`
    return !cohortNotIn.patientIds.includes(pId)
  }

  if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
    return false
  }

  const value = rule.value
  const value2 = rule.value2

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

  // Date type handling
  if (columnType === "date") {
    const dateVal = parseDate(fieldValue)
    const compareDateVal = parseDate(value)

    switch (rule.operator) {
      case "on_date":
        if (!dateVal || !compareDateVal) return false
        return isEqual(dateVal, compareDateVal)
      case "before":
        if (!dateVal || !compareDateVal) return false
        return isBefore(dateVal, compareDateVal)
      case "after":
        if (!dateVal || !compareDateVal) return false
        return isAfter(dateVal, compareDateVal)
      case "on_or_before":
        if (!dateVal || !compareDateVal) return false
        return isEqual(dateVal, compareDateVal) || isBefore(dateVal, compareDateVal)
      case "on_or_after":
        if (!dateVal || !compareDateVal) return false
        return isEqual(dateVal, compareDateVal) || isAfter(dateVal, compareDateVal)
      case "between_dates": {
        const endDate = parseDate(value2)
        if (!dateVal || !compareDateVal || !endDate) return false
        return (isEqual(dateVal, compareDateVal) || isAfter(dateVal, compareDateVal)) &&
               (isEqual(dateVal, endDate) || isBefore(dateVal, endDate))
      }
      default:
        return true
    }
  }

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
      return true
  }
}

export function CohortFilterEditDialog({
  open,
  filter,
  columns,
  originalColumns,
  columnMappings,
  masterData,
  allCohorts,
  onClose,
  onSave,
}: CohortFilterEditDialogProps) {
  const [currentFilter, setCurrentFilter] = useState<FilterGroup>(filter)
  const [isSaving, setIsSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  // Initialize excludeDirtyData from the filter or default to false (don't exclude by default when editing)
  const [excludeDirtyData, setExcludeDirtyData] = useState<boolean>(filter.excludeDirtyData ?? false)
  // Track whether filter has been applied since last edit - controls Apply/Save button states
  const [hasApplied, setHasApplied] = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentFilter(filter)
      setPreviewMode(false)
      setExcludeDirtyData(filter.excludeDirtyData ?? false)
      // If filter has rules, mark as applied since preview is computed automatically via useMemo
      // This allows saving without clicking Apply if no changes were made
      // If filter has no rules, mark as not applied to require user to add and apply filters
      setHasApplied(filter.rules.length > 0)
    }
  }, [open, filter])

  // Convert allCohorts to Cohort[] format for the filter builder
  const cohorts: Cohort[] = useMemo(() => {
    return allCohorts.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      patientIds: c.filtered_patient_ids || [],
      patientCount: c.patient_count,
      data: [],
      columns: c.columns,
      filter: c.filter || { id: "root", logic: "AND" as const, rules: [] },
      createdAt: new Date(c.created_at),
    }))
  }, [allCohorts])

  // Calculate preview data - pass columnMappings to resolve actual column names
  const previewData = useMemo(() => {
    return applyAdvancedFilter(masterData, currentFilter, columns, cohorts, excludeDirtyData, columnMappings)
  }, [masterData, currentFilter, columns, cohorts, excludeDirtyData, columnMappings])

  // Get filtered patient IDs
  const getFilteredIds = () => {
    return previewData.map(
      (p, idx) => p.patient_id?.toString() || `patient-${idx}`
    )
  }

  // Handle dirty data toggle
  const handleExcludeDirtyDataChange = (exclude: boolean) => {
    setExcludeDirtyData(exclude)
    setCurrentFilter((prev) => ({ ...prev, excludeDirtyData: exclude }))
    setHasApplied(false) // Reset: user made a change, need to apply again
  }

  // Handle filter changes from the filter builder
  const handleFilterChange = (newFilter: FilterGroup) => {
    setCurrentFilter(newFilter)
    setHasApplied(false) // Reset: user made a change, need to apply again
  }

  // Handle Apply button click
  const handleApplyComplete = () => {
    setHasApplied(true) // Applied: disable Apply, enable Save
  }

  // Handle Edit mode - user is making changes
  const handleEditMode = () => {
    setHasApplied(false) // Reset: user entered edit mode, need to apply again
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const filteredIds = getFilteredIds()
      // Include excludeDirtyData in the filter when saving
      const filterToSave = { ...currentFilter, excludeDirtyData }
      // Pass the current columns and mappings to ensure filter-column consistency
      // The columns include mapped column names, and columnMappings tracks the mapping
      await onSave(filterToSave, filteredIds, columns, columnMappings || undefined)
    } finally {
      setIsSaving(false)
    }
  }

  const matchRate = masterData.length > 0
    ? ((previewData.length / masterData.length) * 100).toFixed(1)
    : "0"

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{ sx: { height: "90vh" } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
              <FilterList />
            </Avatar>
            <Box>
              <Typography variant="h6">Edit Filter Criteria</Typography>
              <Typography variant="body2" color="text.secondary">
                Modify screening filters for this cohort
              </Typography>
            </Box>
          </Box>

          {/* Preview stats */}
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              label={`${previewData.length.toLocaleString()} / ${masterData.length.toLocaleString()} patients`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`${matchRate}% match rate`}
              color={Number(matchRate) >= 50 ? "success" : Number(matchRate) >= 25 ? "warning" : "error"}
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {previewMode ? (
          <Box p={3}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Preview: {previewData.length} patients match the current filter criteria
            </Alert>
            <Typography variant="subtitle2" gutterBottom>
              Sample Matching Patients (first 10)
            </Typography>
            <Box
              sx={{
                maxHeight: 400,
                overflow: "auto",
                border: "1px solid #ececf1",
                borderRadius: 1,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#fafbfc" }}>
                    {Object.keys(columns).slice(0, 6).map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid #ececf1",
                          textAlign: "left",
                          fontWeight: 600,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(columns).slice(0, 6).map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: "8px",
                            borderBottom: "1px solid #ececf1",
                          }}
                        >
                          {String(row[col] ?? "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        ) : (
          <Box sx={{ height: "100%" }}>
            <FullScreenFilterBuilder
              data={masterData}
              columns={columns}
              filter={currentFilter}
              onFilterChange={handleFilterChange}
              onApplyFilter={() => {
                // Filter is applied automatically via useMemo
              }}
              filteredCount={previewData.length}
              totalCount={masterData.length}
              cohorts={cohorts}
              excludeDirtyData={excludeDirtyData}
              onExcludeDirtyDataChange={handleExcludeDirtyDataChange}
              isApplyEnabled={!hasApplied}
              onApplyComplete={handleApplyComplete}
              onEditMode={handleEditMode}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #ececf1" }}>
        <Button onClick={onClose} disabled={isSaving} startIcon={<Close />}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={() => setPreviewMode(!previewMode)}
          startIcon={<Preview />}
        >
          {previewMode ? "Edit Filters" : "Preview Results"}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !hasApplied}
          startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
