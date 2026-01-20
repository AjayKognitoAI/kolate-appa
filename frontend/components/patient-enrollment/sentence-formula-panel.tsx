"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material"
import {
  CheckCircle,
  Warning,
  FilterAlt,
  AutoAwesome,
  Add,
} from "@mui/icons-material"
import type {
  CriteriaFormula,
  FormulaRule,
  FormulaGroup,
  ColumnType,
  ColumnMetadata,
} from "@/types/cohort.types"
import { CriteriaFormulaCard } from "./criteria-formula-card"
import { FormulaGroupDialog } from "./formula-group-dialog"
import cohortService from "@/services/patient-enrollment/cohort-service"

interface SentenceFormulaPanelProps {
  /** List of criteria formulas from the API */
  criteriaFormulas: CriteriaFormula[]
  /** Available columns and their types */
  columns: Record<string, ColumnType>
  /** Column metadata for API calls (type + description) */
  columnMetadata?: Record<string, string | ColumnMetadata>
  /** Categorical values for autocomplete */
  categoricalValues?: Record<string, string[]>
  /** Callback when any formula changes */
  onFormulasChange: (formulas: CriteriaFormula[]) => void
  /** Callback when an error occurs during criteria processing */
  onError?: (message: string, isContentFilterError?: boolean) => void
  /** Loading state (e.g., while processing criteria) */
  isLoading?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Global exclude dirty data toggle */
  excludeDirtyData?: boolean
  /** Callback when exclude dirty data changes */
  onExcludeDirtyDataChange?: (exclude: boolean) => void
  /** Null stats per column */
  nullStats?: Record<string, number>
  /** Total count for percentage calculation */
  totalCount?: number
}

/**
 * Check if a formula is a simple FormulaRule
 */
function isSimpleRule(formula: FormulaRule | FormulaGroup): formula is FormulaRule {
  return !("logic" in formula)
}

/**
 * Check if an error is an Azure OpenAI content filter error
 * Returns the user-friendly message if it is, or null otherwise
 */
function parseContentFilterError(error: unknown): string | null {
  const errorStr = error instanceof Error ? error.message : String(error)

  // Check for content filter error patterns
  if (
    errorStr.includes("content_filter") ||
    errorStr.includes("content management policy") ||
    errorStr.includes("ResponsibleAIPolicyViolation") ||
    errorStr.includes("jailbreak")
  ) {
    return "Your criteria text was flagged by the content filter. Please rephrase your criteria using clinical or medical terminology and try again."
  }

  return null
}

/**
 * Check if all fields in criteria have valid column mappings
 */
function checkFormulaMapped(
  formula: FormulaRule | FormulaGroup,
  columns: Record<string, ColumnType>
): boolean {
  if (isSimpleRule(formula)) {
    return formula.field in columns && formula.field !== ""
  } else {
    return formula.rules.every((rule) => checkFormulaMapped(rule, columns))
  }
}

/**
 * SentenceFormulaPanel
 *
 * Main collapsible panel that displays IC/EC criteria as sentence-by-sentence formulas.
 * Provides tabs for Inclusion/Exclusion, individual formula editing, and "Apply All" button.
 */
export function SentenceFormulaPanel({
  criteriaFormulas,
  columns,
  columnMetadata,
  categoricalValues = {},
  onFormulasChange,
  onError,
  isLoading = false,
  readOnly = false,
  excludeDirtyData = true,
  onExcludeDirtyDataChange,
  nullStats = {},
  totalCount = 0,
}: SentenceFormulaPanelProps) {
  const [activeTab, setActiveTab] = useState(0) // 0 = Inclusion, 1 = Exclusion
  const [editingFormula, setEditingFormula] = useState<{
    index: number
    formula: FormulaGroup
    sentence: string
    suggestions: CriteriaFormula["column_suggestions"]
  } | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null) // Track which criteria is being saved
  const [newCriteriaSentence, setNewCriteriaSentence] = useState("") // New criteria sentence input
  const [isAddingCriteria, setIsAddingCriteria] = useState(false) // Loading state for adding new criteria
  const [shouldScrollToNew, setShouldScrollToNew] = useState(false) // Flag to scroll to newly added criteria
  const lastCriteriaRef = useRef<HTMLDivElement>(null) // Ref to scroll to last added criteria

  // Scroll to newly added criteria
  useEffect(() => {
    if (shouldScrollToNew && lastCriteriaRef.current) {
      lastCriteriaRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      setShouldScrollToNew(false)
    }
  }, [shouldScrollToNew, criteriaFormulas])

  // Separate IC and EC formulas
  const inclusionFormulas = useMemo(
    () => criteriaFormulas.filter((f) => f.type === "inclusion"),
    [criteriaFormulas]
  )
  const exclusionFormulas = useMemo(
    () => criteriaFormulas.filter((f) => f.type === "exclusion"),
    [criteriaFormulas]
  )

  // Count criteria needing attention (unmapped formula OR has unmapped concepts)
  const icAttentionCount = useMemo(
    () => inclusionFormulas.filter((f) =>
      !checkFormulaMapped(f.formula, columns) || f.unmapped_concepts.length > 0
    ).length,
    [inclusionFormulas, columns]
  )
  const ecAttentionCount = useMemo(
    () => exclusionFormulas.filter((f) =>
      !checkFormulaMapped(f.formula, columns) || f.unmapped_concepts.length > 0
    ).length,
    [exclusionFormulas, columns]
  )
  const totalAttentionCount = icAttentionCount + ecAttentionCount

  // Handle formula change
  const handleFormulaChange = useCallback(
    (index: number, type: "inclusion" | "exclusion", newFormula: FormulaRule | FormulaGroup) => {
      const updatedFormulas = criteriaFormulas.map((f, i) => {
        // Find the actual index in the full array
        const targetFormulas = type === "inclusion" ? inclusionFormulas : exclusionFormulas
        const actualIndex = criteriaFormulas.indexOf(targetFormulas[index])

        if (i === actualIndex) {
          return { ...f, formula: newFormula }
        }
        return f
      })
      onFormulasChange(updatedFormulas)
    },
    [criteriaFormulas, inclusionFormulas, exclusionFormulas, onFormulasChange]
  )

  // Handle opening the modal for complex formula editing
  const handleOpenModal = (
    index: number,
    type: "inclusion" | "exclusion"
  ) => {
    const targetFormulas = type === "inclusion" ? inclusionFormulas : exclusionFormulas
    const criteria = targetFormulas[index]

    if (!isSimpleRule(criteria.formula)) {
      setEditingFormula({
        index,
        formula: criteria.formula as FormulaGroup,
        sentence: criteria.sentence,
        suggestions: criteria.column_suggestions,
      })
    }
  }

  // Handle modal save
  const handleModalSave = (newFormula: FormulaGroup) => {
    if (editingFormula !== null) {
      const type = activeTab === 0 ? "inclusion" : "exclusion"
      handleFormulaChange(editingFormula.index, type, newFormula)
    }
    setEditingFormula(null)
  }

  // Handle sentence edit - calls process-criteria API for the edited sentence
  const handleSentenceEdit = useCallback(
    async (index: number, type: "inclusion" | "exclusion", newSentence: string) => {
      const targetFormulas = type === "inclusion" ? inclusionFormulas : exclusionFormulas
      const actualIndex = criteriaFormulas.indexOf(targetFormulas[index])

      if (actualIndex === -1) return

      // Validate columns exist before making API call
      if (Object.keys(columns).length === 0) {
        console.error("Cannot edit criteria: no columns available")
        return
      }

      // Build column metadata for API call - ensure proper format
      // Backend expects either simple format {col: "type"} or enhanced {col: {type: "..."}}
      const columnsForApi = columnMetadata && Object.keys(columnMetadata).length > 0
        ? columnMetadata
        : Object.fromEntries(
            Object.entries(columns).map(([key, value]) => [key, { type: value }])
          )

      setSavingIndex(actualIndex)

      try {
        // Call process-criteria API for just this sentence
        // Note: Backend expects "None" for empty criteria, not empty string
        const response = await cohortService.processCriteria({
          columns: columnsForApi,
          inclusion_criteria: type === "inclusion" ? newSentence : "",
          exclusion_criteria: type === "exclusion" ? newSentence : "",
        })

        if (response.status === "success" && response.data.criteria_formulas.length > 0) {
          const apiFormulas = response.data.criteria_formulas

          let combinedFormula: FormulaRule | FormulaGroup
          let combinedColumnSuggestions: CriteriaFormula["column_suggestions"] = []
          let combinedUnmappedConcepts: string[] = []

          // Helper to simplify a formula - unwrap groups with single rule
          const simplifyFormula = (formula: FormulaRule | FormulaGroup): FormulaRule | FormulaGroup => {
            if ("logic" in formula && formula.rules.length === 1) {
              // Group with single rule - unwrap it (recursively simplify the inner rule too)
              return simplifyFormula(formula.rules[0])
            }
            if ("logic" in formula) {
              // Group with multiple rules - recursively simplify each rule
              return {
                ...formula,
                rules: formula.rules.map(r => simplifyFormula(r)),
              }
            }
            return formula
          }

          if (apiFormulas.length === 1) {
            // Single formula - use it directly (but simplify if needed)
            combinedFormula = simplifyFormula(apiFormulas[0].formula)
            combinedColumnSuggestions = apiFormulas[0].column_suggestions
            combinedUnmappedConcepts = apiFormulas[0].unmapped_concepts
          } else {
            // Multiple formulas - combine into a FormulaGroup with AND logic
            const rules: (FormulaRule | FormulaGroup)[] = apiFormulas.map(f => simplifyFormula(f.formula))
            // If after simplification we only have one rule, use it directly
            if (rules.length === 1) {
              combinedFormula = rules[0]
            } else {
              combinedFormula = {
                logic: "AND" as const,
                rules: rules,
              }
            }
            // Combine all column suggestions and unmapped concepts
            apiFormulas.forEach(f => {
              combinedColumnSuggestions.push(...f.column_suggestions)
              combinedUnmappedConcepts.push(...f.unmapped_concepts)
            })
            // Remove duplicate unmapped concepts
            combinedUnmappedConcepts = [...new Set(combinedUnmappedConcepts)]
          }

          // Update the formulas array with the combined formula and the user's edited sentence
          const updatedFormulas = criteriaFormulas.map((f, i) => {
            if (i === actualIndex) {
              return {
                ...f,
                sentence: newSentence, // Use the user's edited sentence
                type: type, // Preserve the original type
                formula: combinedFormula,
                column_suggestions: combinedColumnSuggestions,
                unmapped_concepts: combinedUnmappedConcepts,
                category: apiFormulas[0].category, // Use first category
              }
            }
            return f
          })

          onFormulasChange(updatedFormulas)
        }
      } catch (error) {
        console.error("Failed to process edited sentence:", error)
        const contentFilterMessage = parseContentFilterError(error)
        if (contentFilterMessage) {
          onError?.(contentFilterMessage, true)
        } else {
          onError?.(error instanceof Error ? error.message : "Failed to process criteria. Please try again.", false)
        }
      } finally {
        setSavingIndex(null)
      }
    },
    [criteriaFormulas, inclusionFormulas, exclusionFormulas, columns, columnMetadata, onFormulasChange, onError]
  )

  // Handle delete criteria
  const handleDelete = useCallback(
    (index: number, type: "inclusion" | "exclusion") => {
      const targetFormulas = type === "inclusion" ? inclusionFormulas : exclusionFormulas
      const actualIndex = criteriaFormulas.indexOf(targetFormulas[index])

      if (actualIndex === -1) return

      // Remove the criteria from the array
      const updatedFormulas = criteriaFormulas.filter((_, i) => i !== actualIndex)
      onFormulasChange(updatedFormulas)
    },
    [criteriaFormulas, inclusionFormulas, exclusionFormulas, onFormulasChange]
  )

  // Handle ignore unmapped concepts - clears unmapped_concepts array
  const handleIgnoreUnmappedConcepts = useCallback(
    (index: number, type: "inclusion" | "exclusion") => {
      const targetFormulas = type === "inclusion" ? inclusionFormulas : exclusionFormulas
      const actualIndex = criteriaFormulas.indexOf(targetFormulas[index])

      if (actualIndex === -1) return

      // Clear unmapped concepts for this criteria
      const updatedFormulas = criteriaFormulas.map((f, i) => {
        if (i === actualIndex) {
          return { ...f, unmapped_concepts: [] }
        }
        return f
      })
      onFormulasChange(updatedFormulas)
    },
    [criteriaFormulas, inclusionFormulas, exclusionFormulas, onFormulasChange]
  )

  // Handle adding new criteria - calls process-criteria API for the new sentence
  const handleAddCriteria = useCallback(
    async () => {
      const sentence = newCriteriaSentence.trim()
      if (!sentence) return

      // Validate columns exist before making API call
      if (Object.keys(columns).length === 0) {
        console.error("Cannot add criteria: no columns available")
        return
      }

      const type = activeTab === 0 ? "inclusion" : "exclusion"

      // Build column metadata for API call - ensure proper format
      // Backend expects either simple format {col: "type"} or enhanced {col: {type: "..."}}
      const columnsForApi = columnMetadata && Object.keys(columnMetadata).length > 0
        ? columnMetadata
        : Object.fromEntries(
            Object.entries(columns).map(([key, value]) => [key, { type: value }])
          )

      setIsAddingCriteria(true)

      try {
        // Call process-criteria API for just this sentence
        // Note: Backend expects "None" for empty criteria, not empty string
        const response = await cohortService.processCriteria({
          columns: columnsForApi,
          inclusion_criteria: type === "inclusion" ? sentence : "None",
          exclusion_criteria: type === "exclusion" ? sentence : "None",
        })

        if (response.status === "success" && response.data.criteria_formulas.length > 0) {
          const apiFormulas = response.data.criteria_formulas

          // Helper to simplify a formula - unwrap groups with single rule
          const simplifyFormula = (formula: FormulaRule | FormulaGroup): FormulaRule | FormulaGroup => {
            if ("logic" in formula && formula.rules.length === 1) {
              return simplifyFormula(formula.rules[0])
            }
            if ("logic" in formula) {
              return {
                ...formula,
                rules: formula.rules.map(r => simplifyFormula(r)),
              }
            }
            return formula
          }

          // Create new criteria formulas from API response
          const newCriteriaFormulas: CriteriaFormula[] = apiFormulas.map(apiFormula => ({
            ...apiFormula,
            sentence: sentence, // Use user's input sentence
            type: type, // Force the type based on active tab
            formula: simplifyFormula(apiFormula.formula),
          }))

          // Add new criteria to the list
          onFormulasChange([...criteriaFormulas, ...newCriteriaFormulas])
          setNewCriteriaSentence("") // Clear input
          setShouldScrollToNew(true) // Trigger scroll to new criteria
        }
      } catch (error) {
        console.error("Failed to add new criteria:", error)
        const contentFilterMessage = parseContentFilterError(error)
        if (contentFilterMessage) {
          onError?.(contentFilterMessage, true)
        } else {
          onError?.(error instanceof Error ? error.message : "Failed to process criteria. Please try again.", false)
        }
      } finally {
        setIsAddingCriteria(false)
      }
    },
    [newCriteriaSentence, activeTab, columns, columnMetadata, criteriaFormulas, onFormulasChange, onError]
  )

  // Current tab formulas
  const currentFormulas = activeTab === 0 ? inclusionFormulas : exclusionFormulas

  if (criteriaFormulas.length === 0 && !isLoading) {
    return null
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Loading state */}
      {isLoading && (
        <Box display="flex" alignItems="center" justifyContent="center" gap={1.5} p={3}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "50%",
              bgcolor: "#ede9fe",
            }}
          >
            <AutoAwesome sx={{ fontSize: 18, color: "#7c3aed", animation: "pulse 1.5s ease-in-out infinite" }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#6b21a8" }}>
              AI Processing Criteria...
            </Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "#a78bfa" }}>
              Generating filters from your inclusion & exclusion criteria
            </Typography>
          </Box>
          <CircularProgress size={16} sx={{ color: "#7c3aed", ml: 1 }} />
        </Box>
      )}

      {/* Tabs + Missing Data Toggle */}
      {!isLoading && (
        <>
          {/* Top-level attention banner */}
          {totalAttentionCount > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.75,
                bgcolor: "#fffbeb",
                borderBottom: "1px solid #fcd34d",
              }}
            >
              <Warning sx={{ fontSize: 16, color: "#f59e0b" }} />
              <Typography sx={{ fontSize: "0.75rem", color: "#92400e", fontWeight: 500 }}>
                {totalAttentionCount} {totalAttentionCount === 1 ? "criterion needs" : "criteria need"} attention
                {icAttentionCount > 0 && ecAttentionCount > 0 && (
                  <Typography component="span" sx={{ fontSize: "0.7rem", color: "#b45309", ml: 0.5 }}>
                    ({icAttentionCount} inclusion, {ecAttentionCount} exclusion)
                  </Typography>
                )}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              bgcolor: "#fff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pr: 2,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                minHeight: 38,
                px: 1.5,
                "& .MuiTabs-indicator": {
                  bgcolor: activeTab === 0 ? "#3b82f6" : "#ef4444",
                  height: 2,
                },
              }}
            >
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    {inclusionFormulas.length > 0 && (
                      icAttentionCount === 0 ? (
                        <CheckCircle sx={{ fontSize: 16, color: "#16a34a" }} />
                      ) : (
                        <Tooltip title={`${icAttentionCount} criteria need attention`}>
                          <Chip
                            icon={<Warning sx={{ fontSize: 12 }} />}
                            label={icAttentionCount}
                            size="small"
                            sx={{
                              height: 18,
                              minWidth: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fcd34d",
                              "& .MuiChip-icon": {
                                color: "#f59e0b",
                                marginLeft: "4px",
                              },
                            }}
                          />
                        </Tooltip>
                      )
                    )}
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      Inclusion
                    </Typography>
                    <Chip
                      label={inclusionFormulas.length}
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
                  minHeight: 38,
                  py: 0.5,
                  px: 1.5,
                  textTransform: "none",
                  color: "#64748b",
                  "&.Mui-selected": { color: "#1d4ed8" },
                }}
              />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={0.75}>
                    {exclusionFormulas.length > 0 && (
                      ecAttentionCount === 0 ? (
                        <CheckCircle sx={{ fontSize: 16, color: "#16a34a" }} />
                      ) : (
                        <Tooltip title={`${ecAttentionCount} criteria need attention`}>
                          <Chip
                            icon={<Warning sx={{ fontSize: 12 }} />}
                            label={ecAttentionCount}
                            size="small"
                            sx={{
                              height: 18,
                              minWidth: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fcd34d",
                              "& .MuiChip-icon": {
                                color: "#f59e0b",
                                marginLeft: "4px",
                              },
                            }}
                          />
                        </Tooltip>
                      )
                    )}
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      Exclusion
                    </Typography>
                    <Chip
                      label={exclusionFormulas.length}
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
                  minHeight: 38,
                  py: 0.5,
                  px: 1.5,
                  textTransform: "none",
                  color: "#64748b",
                  "&.Mui-selected": { color: "#b91c1c" },
                }}
              />
            </Tabs>

            {/* Missing Data Toggle */}
            {onExcludeDirtyDataChange && (
              <Tooltip title={excludeDirtyData ? "Records with missing values are excluded" : "Records with missing values are included"}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <FilterAlt sx={{ fontSize: 16, color: excludeDirtyData ? "#f59e0b" : "#64748b" }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={excludeDirtyData}
                        onChange={(e) => onExcludeDirtyDataChange(e.target.checked)}
                        size="small"
                        color={excludeDirtyData ? "warning" : "default"}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                        {excludeDirtyData ? "Exclude missing" : "Include missing"}
                      </Typography>
                    }
                    sx={{ mr: 0, ml: 0 }}
                  />
                </Box>
              </Tooltip>
            )}
          </Box>

          {/* Criteria cards */}
          <Box
            sx={{
              p: 1.5,
            }}
          >
            {/* Add new criteria input */}
            {!readOnly && (
              <Box
                sx={{
                  mb: 2,
                  pb: 2,
                  borderBottom: "1px dashed #e2e8f0",
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Add new ${activeTab === 0 ? "inclusion" : "exclusion"} criteria sentence...`}
                  value={newCriteriaSentence}
                  onChange={(e) => setNewCriteriaSentence(e.target.value)}
                  disabled={isAddingCriteria}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newCriteriaSentence.trim()) {
                      e.preventDefault()
                      handleAddCriteria()
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <AutoAwesome sx={{ fontSize: 16, color: "#7c3aed" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          {isAddingCriteria ? (
                            <CircularProgress size={16} sx={{ color: "#7c3aed" }} />
                          ) : (
                            <Tooltip title={`Add ${activeTab === 0 ? "Inclusion" : "Exclusion"} Criteria`}>
                              <IconButton
                                size="small"
                                onClick={handleAddCriteria}
                                disabled={!newCriteriaSentence.trim()}
                                disableRipple
                                sx={{
                                  p: 0,
                                  color: newCriteriaSentence.trim() ? (activeTab === 0 ? "#3b82f6" : "#ef4444") : "#94a3b8",
                                  "&:hover": {
                                    bgcolor: "transparent",
                                  },
                                }}
                              >
                                <Add sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </InputAdornment>
                      ),
                      sx: {
                        fontSize: "0.8rem",
                        bgcolor: "#fff",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#e2e8f0",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: activeTab === 0 ? "#3b82f6" : "#ef4444",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: activeTab === 0 ? "#3b82f6" : "#ef4444",
                        },
                      },
                    },
                  }}
                />
                <Typography sx={{ fontSize: "0.65rem", color: "#94a3b8", mt: 0.5, ml: 0.5 }}>
                  Enter a criteria sentence and press Enter or click + to add
                </Typography>
              </Box>
            )}

            {currentFormulas.length > 0 ? (
              <Box display="flex" flexDirection="column" gap={1}>
                {currentFormulas.map((criteria, idx) => {
                  const type = activeTab === 0 ? "inclusion" : "exclusion"
                  const targetFormulas = activeTab === 0 ? inclusionFormulas : exclusionFormulas
                  const actualIndex = criteriaFormulas.indexOf(targetFormulas[idx])
                  const isSaving = savingIndex === actualIndex

                  const isLastItem = idx === currentFormulas.length - 1

                  return (
                    <Box
                      key={`${criteria.type}-${idx}`}
                      ref={isLastItem ? lastCriteriaRef : undefined}
                    >
                      <CriteriaFormulaCard
                        criteria={criteria}
                        index={idx}
                        columns={columns}
                        categoricalValues={categoricalValues}
                        onFormulaChange={(newFormula) =>
                          handleFormulaChange(idx, type, newFormula)
                        }
                        onEditInModal={
                          !isSimpleRule(criteria.formula)
                            ? () => handleOpenModal(idx, type)
                            : undefined
                        }
                        onSentenceEdit={
                          !readOnly
                            ? (newSentence) => handleSentenceEdit(idx, type, newSentence)
                            : undefined
                        }
                        onDelete={
                          !readOnly
                            ? () => handleDelete(idx, type)
                            : undefined
                        }
                        onIgnoreUnmappedConcepts={
                          !readOnly && criteria.unmapped_concepts.length > 0
                            ? () => handleIgnoreUnmappedConcepts(idx, type)
                            : undefined
                        }
                        isSaving={isSaving}
                        readOnly={readOnly}
                        nullStats={nullStats}
                        totalCount={totalCount}
                      />
                    </Box>
                  )
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  color: "#64748b",
                }}
              >
                <Typography sx={{ fontSize: "0.85rem" }}>
                  No {activeTab === 0 ? "inclusion" : "exclusion"} criteria
                </Typography>
              </Box>
            )}
          </Box>

        </>
      )}

      {/* Modal for complex formula editing */}
      {editingFormula && (
        <FormulaGroupDialog
          open={true}
          onClose={() => setEditingFormula(null)}
          formula={editingFormula.formula}
          sentenceText={editingFormula.sentence}
          columns={columns}
          columnSuggestions={editingFormula.suggestions}
          categoricalValues={categoricalValues}
          onSave={handleModalSave}
        />
      )}
    </Paper>
  )
}

export default SentenceFormulaPanel
