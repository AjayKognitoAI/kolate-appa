"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Box,
  Button,
  Chip,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material"
import {
  Refresh,
  SwapHoriz,
  CheckCircle,
  Science,
  ErrorOutline,
  FilterList,
  Edit,
  Delete,
  Add,
  Save,
  Close,
} from "@mui/icons-material"

import type { SchemaValidationResult, CriterionColumnMapping } from "@/types/cohort.types"

interface SchemaValidationBannerProps {
  validation: SchemaValidationResult | null
  onSelectNewDataset?: () => void
  onMapColumns?: () => void
  onIgnore?: () => void
  severity?: "error" | "warning"
  blocking?: boolean
  onApplyInlineMappings?: (mappings: Record<string, string>) => void
  // Controlled filter state (optional - for when header is rendered externally)
  showOnlyUnmapped?: boolean
  onShowOnlyUnmappedChange?: (value: boolean) => void
  // Callback to report stats to parent
  onStatsChange?: (stats: { unmappedCount: number; totalCount: number }) => void
  // Hide internal header when it's rendered in parent
  hideHeader?: boolean
  // Callback to sync mappings to parent as they change
  onMappingsChange?: (mappings: Record<string, string>) => void
  // Callback to sync criteria changes to parent (for add/edit/delete)
  onCriteriaChange?: (criteria: CriterionColumnMapping[]) => void
  // Enable criteria editing mode (add/edit/delete buttons)
  enableCriteriaEditing?: boolean
}

// Export header component for use in parent dialog
export function SchemaValidationHeader({
  unmappedCount,
  totalCount,
  showOnlyUnmapped,
  onShowOnlyUnmappedChange,
}: {
  unmappedCount: number
  totalCount: number
  showOnlyUnmapped: boolean
  onShowOnlyUnmappedChange: (value: boolean) => void
}) {
  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Chip
        label={`${unmappedCount}/${totalCount} need mapping`}
        size="small"
        sx={{
          height: 22,
          fontSize: "0.7rem",
          fontWeight: 600,
          bgcolor: unmappedCount > 0 ? "#fef3c7" : "#dcfce7",
          color: unmappedCount > 0 ? "#92400e" : "#166534",
        }}
      />
      <Box
        display="flex"
        alignItems="center"
        gap={0.5}
        sx={{
          bgcolor: "#f8fafc",
          px: 1,
          py: 0.25,
          borderRadius: 1,
          border: "1px solid #e2e8f0"
        }}
      >
        <FilterList sx={{ fontSize: 14, color: "#64748b" }} />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showOnlyUnmapped}
              onChange={(e) => onShowOnlyUnmappedChange(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: "#3b82f6",
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  bgcolor: "#93c5fd",
                },
              }}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>
              Unmapped only
            </Typography>
          }
          sx={{ m: 0, "& .MuiFormControlLabel-label": { ml: 0.5 } }}
        />
      </Box>
    </Box>
  )
}

/**
 * Schema Validation Banner Component
 *
 * Displays validation errors when dataset schema doesn't match
 * inclusion/exclusion criteria requirements.
 */
export function SchemaValidationBanner({
  validation: validationProp,
  onSelectNewDataset,
  onMapColumns,
  onIgnore,
  severity: _severity = "error",
  blocking = true,
  onApplyInlineMappings,
  showOnlyUnmapped: controlledShowOnlyUnmapped,
  onShowOnlyUnmappedChange,
  onStatsChange,
  hideHeader = false,
  onMappingsChange,
  onCriteriaChange,
  enableCriteriaEditing = false,
}: SchemaValidationBannerProps) {
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})
  const [internalShowOnlyUnmapped, setInternalShowOnlyUnmapped] = useState(true)
  const [activeTab, setActiveTab] = useState(0) // 0 = Inclusion, 1 = Exclusion

  // State for criteria editing
  const [editedCriteria, setEditedCriteria] = useState<CriterionColumnMapping[] | null>(null)
  const [editingCriterionIndex, setEditingCriterionIndex] = useState<string | null>(null) // format: "inclusion-0" or "exclusion-1"
  const [editingText, setEditingText] = useState("")
  const [showAddForm, setShowAddForm] = useState<"inclusion" | "exclusion" | null>(null)
  const [newCriterionText, setNewCriterionText] = useState("")

  // Use controlled or internal state
  const showOnlyUnmapped = controlledShowOnlyUnmapped ?? internalShowOnlyUnmapped
  const setShowOnlyUnmapped = onShowOnlyUnmappedChange ?? setInternalShowOnlyUnmapped

  // Note: mappings are synced to parent immediately in handleMappingChange (not via useEffect)
  // to avoid race condition when user clicks "Apply Mappings" right after making a mapping

  // Note: criteria changes are synced to parent immediately in handleSaveEdit/handleDeleteCriterion/handleAddCriterion
  // (not via useEffect) to avoid race condition with stats

  // Don't render if validation passed or no validation result
  if (!validationProp || validationProp.isValid) {
    return null
  }

  // Create working copy of validation that we can modify
  let validation = validationProp

  // If criteria_mapping is missing but we have missing columns, create fallback mappings
  const hasCriteriaMapping = validation.criteria_mapping && validation.criteria_mapping.length > 0
  if (!hasCriteriaMapping && validation.missingColumns.length > 0) {
    const fallbackMappings = validation.missingColumns.map((col, idx) => ({
      criterion: `Column "${col}" is required by your criteria`,
      columns: [col],
      type: (idx % 2 === 0 ? "inclusion" : "exclusion") as "inclusion" | "exclusion"
    }))
    validation = {
      ...validation,
      criteria_mapping: fallbackMappings
    }
  }

  const finalHasCriteriaMapping = validation.criteria_mapping && validation.criteria_mapping.length > 0

  const handleMappingChange = (requiredColumn: string, selectedColumn: string) => {
    const newMappings = {
      ...columnMappings,
      [requiredColumn]: selectedColumn
    }
    setColumnMappings(newMappings)

    // Sync to parent immediately (not via useEffect) to avoid race condition
    // when user clicks "Apply Mappings" button right after making a mapping
    if (onMappingsChange) {
      onMappingsChange(newMappings)
    }
  }

  const handleApplyInlineMappings = () => {
    const validMappings = Object.entries(columnMappings)
      .filter(([_, target]) => target && target !== "")
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {})

    if (onApplyInlineMappings) {
      onApplyInlineMappings(validMappings)
    }
  }

  const allMapped = validation.missingColumns.every(col =>
    columnMappings[col] && columnMappings[col] !== ""
  )

  const getSuggestedMapping = (requiredColumn: string): string | null => {
    const caseMismatch = validation.caseMismatchColumns?.find(
      cm => cm.required === requiredColumn
    )
    return caseMismatch?.available[0] || null
  }

  // Get working criteria (edited or original)
  const getWorkingCriteria = useCallback((): CriterionColumnMapping[] => {
    if (editedCriteria !== null) {
      return editedCriteria
    }
    return validation.criteria_mapping || []
  }, [editedCriteria, validation.criteria_mapping])

  // Initialize edited criteria from validation if not already set
  const initializeEditedCriteria = useCallback(() => {
    if (editedCriteria === null && validation.criteria_mapping) {
      setEditedCriteria([...validation.criteria_mapping])
    }
  }, [editedCriteria, validation.criteria_mapping])

  // Start editing a criterion
  const handleStartEdit = (type: "inclusion" | "exclusion", index: number, currentText: string) => {
    initializeEditedCriteria()
    setEditingCriterionIndex(`${type}-${index}`)
    setEditingText(currentText)
  }

  // Save edited criterion
  const handleSaveEdit = (type: "inclusion" | "exclusion", index: number) => {
    if (!editingText.trim()) {
      setEditingCriterionIndex(null)
      setEditingText("")
      return
    }

    // Get current working criteria
    const workingCriteria = editedCriteria !== null
      ? editedCriteria
      : (validation.criteria_mapping ? [...validation.criteria_mapping] : [])

    const typedCriteria = workingCriteria.filter(m => getCriterionType(m) === type)
    const criterionToEdit = typedCriteria[index]

    if (criterionToEdit) {
      const updatedCriteria = workingCriteria.map(m => {
        if (m === criterionToEdit) {
          return { ...m, criterion: editingText.trim() }
        }
        return m
      })
      setEditedCriteria(updatedCriteria)

      // Sync stats immediately to parent
      if (onStatsChange) {
        const newUnmappedCount = updatedCriteria.filter(m => hasUnmappedColumns(m)).length
        const newTotalCount = updatedCriteria.length
        onStatsChange({ unmappedCount: newUnmappedCount, totalCount: newTotalCount })
      }

      // Sync criteria changes immediately to parent
      if (onCriteriaChange) {
        onCriteriaChange(updatedCriteria)
      }
    }

    setEditingCriterionIndex(null)
    setEditingText("")
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCriterionIndex(null)
    setEditingText("")
  }

  // Delete a criterion
  const handleDeleteCriterion = (type: "inclusion" | "exclusion", index: number) => {
    // Get current working criteria (use editedCriteria if exists, otherwise initialize from validation)
    const workingCriteria = editedCriteria !== null
      ? editedCriteria
      : (validation.criteria_mapping ? [...validation.criteria_mapping] : [])

    const typedCriteria = workingCriteria.filter(m => getCriterionType(m) === type)
    const criterionToDelete = typedCriteria[index]

    if (criterionToDelete) {
      const updatedCriteria = workingCriteria.filter(m => m !== criterionToDelete)
      setEditedCriteria(updatedCriteria)

      // Sync stats immediately to parent to avoid race condition
      if (onStatsChange) {
        const newUnmappedCount = updatedCriteria.filter(m => hasUnmappedColumns(m)).length
        const newTotalCount = updatedCriteria.length
        onStatsChange({ unmappedCount: newUnmappedCount, totalCount: newTotalCount })
      }

      // Sync criteria changes immediately to parent
      if (onCriteriaChange) {
        onCriteriaChange(updatedCriteria)
      }
    }
  }

  // Add a new criterion
  const handleAddCriterion = (type: "inclusion" | "exclusion") => {
    if (!newCriterionText.trim()) {
      setShowAddForm(null)
      setNewCriterionText("")
      return
    }

    // Get current working criteria
    const workingCriteria = editedCriteria !== null
      ? editedCriteria
      : (validation.criteria_mapping ? [...validation.criteria_mapping] : [])

    const newCriterion: CriterionColumnMapping = {
      criterion: newCriterionText.trim(),
      columns: [], // No columns initially - user will need to specify
      type: type
    }

    const updatedCriteria = [...workingCriteria, newCriterion]
    setEditedCriteria(updatedCriteria)

    // Sync stats immediately to parent
    if (onStatsChange) {
      const newUnmappedCount = updatedCriteria.filter(m => hasUnmappedColumns(m)).length
      const newTotalCount = updatedCriteria.length
      onStatsChange({ unmappedCount: newUnmappedCount, totalCount: newTotalCount })
    }

    // Sync criteria changes immediately to parent
    if (onCriteriaChange) {
      onCriteriaChange(updatedCriteria)
    }

    setShowAddForm(null)
    setNewCriterionText("")
  }

  const getCriterionType = (mapping: CriterionColumnMapping): "inclusion" | "exclusion" => {
    if (mapping.type) return mapping.type
    const lower = mapping.criterion.toLowerCase()
    if (lower.includes("exclusion") || lower.includes("exclude") || lower.includes("not")) {
      return "exclusion"
    }
    if (lower.includes("inclusion") || lower.includes("include")) {
      return "inclusion"
    }
    const exclusionPatterns = [
      "pregnant", "breastfeeding", "severe", "unstable", "unable",
      "contraindication", "allergy", "active infection", "malignancy"
    ]
    if (exclusionPatterns.some(pattern => lower.includes(pattern))) {
      return "exclusion"
    }
    return "inclusion"
  }

  // Helper to check if a column is still unmapped (missing AND not yet mapped by user)
  const isColumnUnmapped = (col: string) => {
    return validation.missingColumns.includes(col) && (!columnMappings[col] || columnMappings[col] === "")
  }

  // Helper to check if a criterion has any unmapped columns
  const hasUnmappedColumns = (mapping: CriterionColumnMapping) => {
    return mapping.columns.some(col => isColumnUnmapped(col))
  }

  // Filter criteria based on toggle - only show criteria with unmapped columns
  const filterCriteria = (criteria: CriterionColumnMapping[]) => {
    if (!showOnlyUnmapped) return criteria
    return criteria.filter(m => hasUnmappedColumns(m))
  }

  // Compact criterion row
  const renderCriterionRow = (
    mapping: CriterionColumnMapping,
    index: number,
    type: "inclusion" | "exclusion"
  ) => {
    // Columns that are missing in the dataset
    const missingColumnsInCriterion = mapping.columns.filter(col =>
      validation.missingColumns.includes(col)
    )
    // Columns that exist in the dataset
    const matchedColumns = mapping.columns.filter(col =>
      !validation.missingColumns.includes(col)
    )
    // Check if any missing columns are still unmapped by the user
    const stillHasUnmappedColumns = missingColumnsInCriterion.some(col => isColumnUnmapped(col))
    // All criteria columns are either in dataset OR have been mapped
    const allColumnsMapped = !stillHasUnmappedColumns
    const tagPrefix = type === "inclusion" ? "IC" : "EC"
    const isEditing = editingCriterionIndex === `${type}-${index}`

    return (
      <Box
        key={`${type}-${index}`}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          py: 1,
          px: 1.5,
          borderRadius: 1.5,
          bgcolor: allColumnsMapped ? "#f0fdf4" : "#fff",
          border: "1px solid",
          borderColor: allColumnsMapped ? "#86efac" : "#e2e8f0",
          borderLeft: "3px solid",
          borderLeftColor: allColumnsMapped
            ? "#16a34a"
            : type === "inclusion" ? "#3b82f6" : "#ef4444",
          transition: "all 0.2s ease",
        }}
      >
        {/* IC/EC Tag - compact */}
        <Chip
          label={`${tagPrefix} ${index + 1}`}
          size="small"
          sx={{
            bgcolor: type === "inclusion" ? "#dbeafe" : "#fee2e2",
            color: type === "inclusion" ? "#1d4ed8" : "#b91c1c",
            fontWeight: 600,
            fontSize: "0.7rem",
            height: 22,
            minWidth: 44,
            borderRadius: 0.75,
            flexShrink: 0,
            "& .MuiChip-label": { px: 1 }
          }}
        />

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Criterion text - editable or static */}
          {isEditing ? (
            <Box display="flex" alignItems="center" gap={1} mb={(matchedColumns.length > 0 || missingColumnsInCriterion.length > 0) ? 0.75 : 0}>
              <TextField
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                size="small"
                fullWidth
                autoFocus
                multiline
                maxRows={3}
                placeholder="Enter criterion text..."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.8rem",
                    bgcolor: "#fff",
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveEdit(type, index)
                  }
                  if (e.key === "Escape") {
                    handleCancelEdit()
                  }
                }}
              />
              <Tooltip title="Save">
                <IconButton
                  size="small"
                  onClick={() => handleSaveEdit(type, index)}
                  sx={{ color: "#16a34a" }}
                >
                  <Save sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={handleCancelEdit}
                  sx={{ color: "#64748b" }}
                >
                  <Close sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: "#334155",
                lineHeight: 1.4,
                fontSize: "0.8rem",
                mb: (matchedColumns.length > 0 || missingColumnsInCriterion.length > 0) ? 0.75 : 0,
              }}
            >
              {mapping.criterion}
            </Typography>
          )}

          {/* Column tags - inline */}
          {(matchedColumns.length > 0 || missingColumnsInCriterion.length > 0) && (
            <Box display="flex" flexWrap="wrap" alignItems="center" gap={0.5}>
              {/* Matched columns */}
              {matchedColumns.map(col => (
                <Chip
                  key={col}
                  label={col}
                  size="small"
                  icon={<CheckCircle sx={{ fontSize: 12 }} />}
                  sx={{
                    bgcolor: "#dcfce7",
                    color: "#166534",
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    borderRadius: 0.5,
                    "& .MuiChip-label": { px: 0.75 },
                    "& .MuiChip-icon": {
                      color: "#16a34a",
                      ml: 0.5,
                      fontSize: 12,
                    }
                  }}
                />
              ))}

              {/* Missing columns with inline mapping */}
              {missingColumnsInCriterion.map(col => {
                const suggested = getSuggestedMapping(col)
                const currentMapping = columnMappings[col] || suggested || ""

                if (suggested && !columnMappings[col]) {
                  setTimeout(() => handleMappingChange(col, suggested), 0)
                }

                return (
                  <Box
                    key={col}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      py: 0.25,
                      px: 0.75,
                      borderRadius: 0.5,
                      bgcolor: currentMapping ? "#dcfce7" : "#f8fafc",
                      border: "1px solid",
                      borderColor: currentMapping ? "#86efac" : "#cbd5e1",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: currentMapping ? "#166534" : "#475569",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </Typography>
                    <SwapHoriz sx={{ fontSize: 12, color: "#94a3b8" }} />
                    <FormControl size="small">
                      <Select
                        value={currentMapping}
                        onChange={(e) => handleMappingChange(col, e.target.value)}
                        displayEmpty
                        sx={{
                          height: 20,
                          minWidth: 100,
                          bgcolor: "#fff",
                          fontSize: "0.65rem",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: currentMapping ? "#86efac" : "#cbd5e1",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: currentMapping ? "#4ade80" : "#94a3b8"
                          },
                          "& .MuiSelect-select": {
                            py: 0.25,
                            px: 0.75,
                          }
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: "0.75rem" }}>
                          <em style={{ color: "#94a3b8" }}>Select...</em>
                        </MenuItem>
                        {suggested && (
                          <>
                            <Divider textAlign="left" sx={{ my: 0.25 }}>
                              <Chip label="Suggested" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#dbeafe", color: "#1d4ed8" }} />
                            </Divider>
                            <MenuItem value={suggested} sx={{ fontSize: "0.75rem" }}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Science sx={{ color: "#3b82f6", fontSize: 14 }} />
                                <span style={{ fontWeight: 600 }}>{suggested}</span>
                              </Box>
                            </MenuItem>
                            <Divider sx={{ my: 0.25 }} />
                          </>
                        )}
                        {validation.availableColumns
                          .filter(c => c !== suggested)
                          .map(c => (
                            <MenuItem key={c} value={c} sx={{ fontSize: "0.75rem" }}>
                              {c}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    {currentMapping && (
                      <CheckCircle sx={{ color: "#16a34a", fontSize: 12 }} />
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>

        {/* Status icon and actions */}
        <Box display="flex" alignItems="center" gap={0.5} flexShrink={0} mt={0.25}>
          {enableCriteriaEditing && !isEditing && (
            <>
              <Tooltip title="Edit criterion">
                <IconButton
                  size="small"
                  onClick={() => handleStartEdit(type, index, mapping.criterion)}
                  sx={{
                    p: 0.5,
                    color: "#64748b",
                    "&:hover": { color: "#3b82f6", bgcolor: "#eff6ff" }
                  }}
                >
                  <Edit sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete criterion">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteCriterion(type, index)}
                  sx={{
                    p: 0.5,
                    color: "#64748b",
                    "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" }
                  }}
                >
                  <Delete sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
          {allColumnsMapped ? (
            <CheckCircle sx={{ fontSize: 16, color: "#16a34a" }} />
          ) : (
            <ErrorOutline sx={{ fontSize: 16, color: "#f59e0b" }} />
          )}
        </Box>
      </Box>
    )
  }

  // Fallback simple view when no criteria mapping
  if (!finalHasCriteriaMapping) {
    return (
      <Box>
        <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.5}>
          {validation.missingColumns.map(col => (
            <Chip
              key={col}
              label={col}
              size="small"
              sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#fee2e2", color: "#b91c1c" }}
            />
          ))}
        </Box>

        {validation.caseMismatchColumns && validation.caseMismatchColumns.length > 0 && (
          <Box mb={1.5}>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5} color="#64748b">
              Possible Matches:
            </Typography>
            {validation.caseMismatchColumns.map(({ required, available }) => (
              <Typography key={required} sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                &quot;{required}&quot; → {available.join(", ")}
              </Typography>
            ))}
          </Box>
        )}

        <Box display="flex" gap={1}>
          {onMapColumns && (
            <Button
              size="small"
              variant="contained"
              startIcon={<SwapHoriz sx={{ fontSize: 16 }} />}
              onClick={onMapColumns}
              sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.5, bgcolor: "#3b82f6" }}
            >
              Map Columns
            </Button>
          )}
          {onSelectNewDataset && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
              onClick={onSelectNewDataset}
              sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.5, borderColor: "#cbd5e1", color: "#64748b" }}
            >
              Change Dataset
            </Button>
          )}
          {onIgnore && !blocking && (
            <Button
              size="small"
              variant="text"
              onClick={onIgnore}
              sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.5, color: "#64748b" }}
            >
              Skip
            </Button>
          )}
        </Box>
      </Box>
    )
  }

  // Use working criteria (edited if available, otherwise original)
  const workingCriteriaList = getWorkingCriteria()

  const inclusionCriteria = workingCriteriaList.filter(
    m => getCriterionType(m) === "inclusion"
  )
  const exclusionCriteria = workingCriteriaList.filter(
    m => getCriterionType(m) === "exclusion"
  )

  const filteredInclusion = filterCriteria(inclusionCriteria)
  const filteredExclusion = filterCriteria(exclusionCriteria)

  const unmappedCount = workingCriteriaList.filter(m => hasUnmappedColumns(m)).length
  const totalCount = workingCriteriaList.length

  // Report stats to parent if callback provided
  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ unmappedCount, totalCount })
    }
  }, [unmappedCount, totalCount, onStatsChange])

  return (
    <Box>
      {/* Header Row - only show if not hidden */}
      {!hideHeader && (
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Chip
            label={`${unmappedCount}/${totalCount} need mapping`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor: unmappedCount > 0 ? "#fef3c7" : "#dcfce7",
              color: unmappedCount > 0 ? "#92400e" : "#166534",
            }}
          />

          {/* Filter Toggle */}
          <Box display="flex" alignItems="center" gap={0.5} sx={{ bgcolor: "#f8fafc", px: 1, py: 0.25, borderRadius: 1, border: "1px solid #e2e8f0" }}>
            <FilterList sx={{ fontSize: 14, color: "#64748b" }} />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showOnlyUnmapped}
                  onChange={(e) => setShowOnlyUnmapped(e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": {
                      color: "#3b82f6",
                    },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      bgcolor: "#93c5fd",
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>
                  Unmapped only
                </Typography>
              }
              sx={{ m: 0, "& .MuiFormControlLabel-label": { ml: 0.5 } }}
            />
          </Box>
        </Box>
      )}

      {/* Tabs for Inclusion/Exclusion */}
      <Box>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            bgcolor: "#fff",
            borderBottom: "1px solid #e2e8f0",
            mx: -3,
            px: 3,
            pt: 0,
            pb: 0,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              minHeight: 36,
              "& .MuiTabs-indicator": {
                bgcolor: activeTab === 0 ? "#3b82f6" : "#ef4444",
                height: 2,
              },
            }}
        >
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={0.75}>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "none" }}>
                  Inclusion
                </Typography>
                <Chip
                  label={showOnlyUnmapped ? `${filteredInclusion.length}/${inclusionCriteria.length}` : inclusionCriteria.length}
                  size="small"
                  sx={{
                    height: 18,
                    minWidth: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: activeTab === 0 ? "#dbeafe" : "#f1f5f9",
                    color: activeTab === 0 ? "#1d4ed8" : "#64748b",
                  }}
                />
              </Box>
            }
            sx={{
              minHeight: 36,
              py: 0.5,
              px: 2,
              textTransform: "none",
              color: "#64748b",
              "&.Mui-selected": { color: "#1d4ed8" },
            }}
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={0.75}>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "none" }}>
                  Exclusion
                </Typography>
                <Chip
                  label={showOnlyUnmapped ? `${filteredExclusion.length}/${exclusionCriteria.length}` : exclusionCriteria.length}
                  size="small"
                  sx={{
                    height: 18,
                    minWidth: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: activeTab === 1 ? "#fee2e2" : "#f1f5f9",
                    color: activeTab === 1 ? "#b91c1c" : "#64748b",
                  }}
                />
              </Box>
            }
            sx={{
              minHeight: 36,
              py: 0.5,
              px: 2,
              textTransform: "none",
              color: "#64748b",
              "&.Mui-selected": { color: "#b91c1c" },
            }}
          />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ mt: 2 }}>
          {/* Inclusion Criteria Tab */}
          {activeTab === 0 && (
            <>
              {filteredInclusion.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={0.75}>
                  {filteredInclusion.map((mapping) => {
                    const originalIdx = inclusionCriteria.indexOf(mapping)
                    return renderCriterionRow(mapping, originalIdx, "inclusion")
                  })}
                </Box>
              ) : showOnlyUnmapped ? (
                <Box sx={{ textAlign: "center", py: 3, color: "#64748b" }}>
                  <CheckCircle sx={{ fontSize: 32, color: "#16a34a", mb: 0.5 }} />
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                    All inclusion criteria are mapped!
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", py: 2 }}>
                  No inclusion criteria defined.
                </Typography>
              )}

              {/* Add Inclusion Criterion */}
              {enableCriteriaEditing && (
                <Box sx={{ mt: 1.5 }}>
                  {showAddForm === "inclusion" ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "#eff6ff",
                        border: "1px dashed #93c5fd",
                      }}
                    >
                      <TextField
                        value={newCriterionText}
                        onChange={(e) => setNewCriterionText(e.target.value)}
                        size="small"
                        fullWidth
                        autoFocus
                        multiline
                        maxRows={3}
                        placeholder="Enter new inclusion criterion..."
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: "0.8rem",
                            bgcolor: "#fff",
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleAddCriterion("inclusion")
                          }
                          if (e.key === "Escape") {
                            setShowAddForm(null)
                            setNewCriterionText("")
                          }
                        }}
                      />
                      <Tooltip title="Add criterion">
                        <IconButton
                          size="small"
                          onClick={() => handleAddCriterion("inclusion")}
                          sx={{ color: "#16a34a" }}
                        >
                          <Save sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setShowAddForm(null)
                            setNewCriterionText("")
                          }}
                          sx={{ color: "#64748b" }}
                        >
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Add sx={{ fontSize: 16 }} />}
                      onClick={() => setShowAddForm("inclusion")}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        py: 0.5,
                        borderColor: "#93c5fd",
                        color: "#3b82f6",
                        borderStyle: "dashed",
                        "&:hover": {
                          borderColor: "#3b82f6",
                          bgcolor: "#eff6ff",
                          borderStyle: "dashed",
                        },
                      }}
                    >
                      Add Inclusion Criterion
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}

          {/* Exclusion Criteria Tab */}
          {activeTab === 1 && (
            <>
              {filteredExclusion.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={0.75}>
                  {filteredExclusion.map((mapping) => {
                    const originalIdx = exclusionCriteria.indexOf(mapping)
                    return renderCriterionRow(mapping, originalIdx, "exclusion")
                  })}
                </Box>
              ) : showOnlyUnmapped ? (
                <Box sx={{ textAlign: "center", py: 3, color: "#64748b" }}>
                  <CheckCircle sx={{ fontSize: 32, color: "#16a34a", mb: 0.5 }} />
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                    All exclusion criteria are mapped!
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", py: 2 }}>
                  No exclusion criteria defined.
                </Typography>
              )}

              {/* Add Exclusion Criterion */}
              {enableCriteriaEditing && (
                <Box sx={{ mt: 1.5 }}>
                  {showAddForm === "exclusion" ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "#fef2f2",
                        border: "1px dashed #fca5a5",
                      }}
                    >
                      <TextField
                        value={newCriterionText}
                        onChange={(e) => setNewCriterionText(e.target.value)}
                        size="small"
                        fullWidth
                        autoFocus
                        multiline
                        maxRows={3}
                        placeholder="Enter new exclusion criterion..."
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            fontSize: "0.8rem",
                            bgcolor: "#fff",
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleAddCriterion("exclusion")
                          }
                          if (e.key === "Escape") {
                            setShowAddForm(null)
                            setNewCriterionText("")
                          }
                        }}
                      />
                      <Tooltip title="Add criterion">
                        <IconButton
                          size="small"
                          onClick={() => handleAddCriterion("exclusion")}
                          sx={{ color: "#16a34a" }}
                        >
                          <Save sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setShowAddForm(null)
                            setNewCriterionText("")
                          }}
                          sx={{ color: "#64748b" }}
                        >
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Add sx={{ fontSize: 16 }} />}
                      onClick={() => setShowAddForm("exclusion")}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        py: 0.5,
                        borderColor: "#fca5a5",
                        color: "#ef4444",
                        borderStyle: "dashed",
                        "&:hover": {
                          borderColor: "#ef4444",
                          bgcolor: "#fef2f2",
                          borderStyle: "dashed",
                        },
                      }}
                    >
                      Add Exclusion Criterion
                    </Button>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>

        {/* All mapped message */}
        {filteredInclusion.length === 0 && filteredExclusion.length === 0 && showOnlyUnmapped && (
          <Box sx={{ textAlign: "center", py: 3, color: "#64748b" }}>
            <CheckCircle sx={{ fontSize: 40, color: "#16a34a", mb: 1 }} />
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#166534" }}>
              All criteria are mapped!
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.5 }}>
              Click &quot;Apply Mappings&quot; to continue.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Action Buttons - only show when not in modal (hideHeader=false) */}
      {!hideHeader && (
        <Box display="flex" gap={1.5} mt={2}>
          {onApplyInlineMappings && (
            <Button
              size="small"
              variant="contained"
              startIcon={<SwapHoriz sx={{ fontSize: 16 }} />}
              onClick={handleApplyInlineMappings}
              disabled={!allMapped}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                py: 0.5,
                px: 1.5,
                bgcolor: "#3b82f6",
                "&:hover": { bgcolor: "#2563eb" },
              }}
            >
              Apply Mappings
            </Button>
          )}
          {onSelectNewDataset && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
              onClick={onSelectNewDataset}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                py: 0.5,
                px: 1.5,
                borderColor: "#cbd5e1",
                color: "#64748b",
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
              }}
            >
              Change Dataset
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}
