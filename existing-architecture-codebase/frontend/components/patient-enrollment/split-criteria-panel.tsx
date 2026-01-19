"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material"
import {
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

interface SplitCriteriaPanelProps {
  /** Type of criteria to display */
  type: "inclusion" | "exclusion"
  /** List of all criteria formulas (will be filtered by type) */
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
 * SplitCriteriaPanel
 *
 * Displays criteria formulas for a single type (inclusion OR exclusion).
 * Used in the unified create cohort layout where inclusion and exclusion
 * are shown side by side instead of in tabs.
 */
export function SplitCriteriaPanel({
  type,
  criteriaFormulas,
  columns,
  columnMetadata,
  categoricalValues = {},
  onFormulasChange,
  onError,
  isLoading = false,
  readOnly = false,
  nullStats = {},
  totalCount = 0,
}: SplitCriteriaPanelProps) {
  const [editingFormula, setEditingFormula] = useState<{
    index: number
    formula: FormulaGroup
    sentence: string
    suggestions: CriteriaFormula["column_suggestions"]
  } | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [newCriteriaSentence, setNewCriteriaSentence] = useState("")
  const [isAddingCriteria, setIsAddingCriteria] = useState(false)
  const [shouldScrollToNew, setShouldScrollToNew] = useState(false)
  const lastCriteriaRef = useRef<HTMLDivElement>(null)

  // Scroll to newly added criteria
  useEffect(() => {
    if (shouldScrollToNew && lastCriteriaRef.current) {
      lastCriteriaRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      setShouldScrollToNew(false)
    }
  }, [shouldScrollToNew, criteriaFormulas])

  // Filter formulas by type
  const typeFormulas = useMemo(
    () => criteriaFormulas.filter((f) => f.type === type),
    [criteriaFormulas, type]
  )

  // Handle formula change
  const handleFormulaChange = useCallback(
    (index: number, newFormula: FormulaRule | FormulaGroup) => {
      const updatedFormulas = criteriaFormulas.map((f, i) => {
        const actualIndex = criteriaFormulas.indexOf(typeFormulas[index])
        if (i === actualIndex) {
          return { ...f, formula: newFormula }
        }
        return f
      })
      onFormulasChange(updatedFormulas)
    },
    [criteriaFormulas, typeFormulas, onFormulasChange]
  )

  // Handle opening the modal for complex formula editing
  const handleOpenModal = (index: number) => {
    const criteria = typeFormulas[index]
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
      handleFormulaChange(editingFormula.index, newFormula)
    }
    setEditingFormula(null)
  }

  // Handle sentence edit - calls process-criteria API for the edited sentence
  const handleSentenceEdit = useCallback(
    async (index: number, newSentence: string) => {
      const actualIndex = criteriaFormulas.indexOf(typeFormulas[index])
      if (actualIndex === -1) return

      if (Object.keys(columns).length === 0) {
        console.error("Cannot edit criteria: no columns available")
        return
      }

      const columnsForApi = columnMetadata && Object.keys(columnMetadata).length > 0
        ? columnMetadata
        : Object.fromEntries(
            Object.entries(columns).map(([key, value]) => [key, { type: value }])
          )

      setSavingIndex(actualIndex)

      try {
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

          if (apiFormulas.length === 1) {
            combinedFormula = simplifyFormula(apiFormulas[0].formula)
            combinedColumnSuggestions = apiFormulas[0].column_suggestions
            combinedUnmappedConcepts = apiFormulas[0].unmapped_concepts
          } else {
            const rules: (FormulaRule | FormulaGroup)[] = apiFormulas.map(f => simplifyFormula(f.formula))
            if (rules.length === 1) {
              combinedFormula = rules[0]
            } else {
              // Use logic from first formula if it's a group, otherwise default to AND
              const firstFormula = apiFormulas[0].formula
              const logicFromApi = "logic" in firstFormula ? firstFormula.logic : "AND"
              combinedFormula = {
                logic: logicFromApi,
                rules: rules,
              }
            }
            apiFormulas.forEach(f => {
              combinedColumnSuggestions.push(...f.column_suggestions)
              combinedUnmappedConcepts.push(...f.unmapped_concepts)
            })
            combinedUnmappedConcepts = [...new Set(combinedUnmappedConcepts)]
          }

          const updatedFormulas = criteriaFormulas.map((f, i) => {
            if (i === actualIndex) {
              return {
                ...f,
                sentence: newSentence,
                type: type,
                formula: combinedFormula,
                column_suggestions: combinedColumnSuggestions,
                unmapped_concepts: combinedUnmappedConcepts,
                category: apiFormulas[0].category,
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
    [criteriaFormulas, typeFormulas, columns, columnMetadata, onFormulasChange, onError, type]
  )

  // Handle delete criteria
  const handleDelete = useCallback(
    (index: number) => {
      const actualIndex = criteriaFormulas.indexOf(typeFormulas[index])
      if (actualIndex === -1) return

      const updatedFormulas = criteriaFormulas.filter((_, i) => i !== actualIndex)
      onFormulasChange(updatedFormulas)
    },
    [criteriaFormulas, typeFormulas, onFormulasChange]
  )

  // Handle ignore unmapped concepts
  const handleIgnoreUnmappedConcepts = useCallback(
    (index: number) => {
      const actualIndex = criteriaFormulas.indexOf(typeFormulas[index])
      if (actualIndex === -1) return

      const updatedFormulas = criteriaFormulas.map((f, i) => {
        if (i === actualIndex) {
          return { ...f, unmapped_concepts: [] }
        }
        return f
      })
      onFormulasChange(updatedFormulas)
    },
    [criteriaFormulas, typeFormulas, onFormulasChange]
  )

  // Handle adding new criteria
  const handleAddCriteria = useCallback(
    async () => {
      const sentence = newCriteriaSentence.trim()
      if (!sentence) return

      if (Object.keys(columns).length === 0) {
        console.error("Cannot add criteria: no columns available")
        return
      }

      const columnsForApi = columnMetadata && Object.keys(columnMetadata).length > 0
        ? columnMetadata
        : Object.fromEntries(
            Object.entries(columns).map(([key, value]) => [key, { type: value }])
          )

      setIsAddingCriteria(true)

      try {
        const response = await cohortService.processCriteria({
          columns: columnsForApi,
          inclusion_criteria: type === "inclusion" ? sentence : "",
          exclusion_criteria: type === "exclusion" ? sentence : "",
        })

        if (response.status === "success" && response.data.criteria_formulas.length > 0) {
          const apiFormulas = response.data.criteria_formulas

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

          // Combine multiple API formulas into a single CriteriaFormula (same logic as edit)
          let combinedFormula: FormulaRule | FormulaGroup
          let combinedColumnSuggestions: CriteriaFormula["column_suggestions"] = []
          let combinedUnmappedConcepts: string[] = []

          if (apiFormulas.length === 1) {
            combinedFormula = simplifyFormula(apiFormulas[0].formula)
            combinedColumnSuggestions = apiFormulas[0].column_suggestions
            combinedUnmappedConcepts = apiFormulas[0].unmapped_concepts
          } else {
            const rules: (FormulaRule | FormulaGroup)[] = apiFormulas.map(f => simplifyFormula(f.formula))
            if (rules.length === 1) {
              combinedFormula = rules[0]
            } else {
              // Use logic from first formula if it's a group, otherwise default to AND
              const firstFormula = apiFormulas[0].formula
              const logicFromApi = "logic" in firstFormula ? firstFormula.logic : "AND"
              combinedFormula = {
                logic: logicFromApi,
                rules: rules,
              }
            }
            apiFormulas.forEach(f => {
              combinedColumnSuggestions.push(...f.column_suggestions)
              combinedUnmappedConcepts.push(...f.unmapped_concepts)
            })
            combinedUnmappedConcepts = [...new Set(combinedUnmappedConcepts)]
          }

          const newCriteriaFormula: CriteriaFormula = {
            sentence: sentence,
            type: type,
            formula: combinedFormula,
            column_suggestions: combinedColumnSuggestions,
            unmapped_concepts: combinedUnmappedConcepts,
            category: apiFormulas[0].category,
          }

          onFormulasChange([...criteriaFormulas, newCriteriaFormula])
          setNewCriteriaSentence("")
          setShouldScrollToNew(true)
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
    [newCriteriaSentence, type, columns, columnMetadata, criteriaFormulas, onFormulasChange, onError]
  )

  const themeColor = type === "inclusion" ? "#3b82f6" : "#ef4444"

  return (
    <Box>
      {/* Loading state */}
      {isLoading && (
        <Box display="flex" alignItems="center" justifyContent="center" gap={1.5} py={3}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "#ede9fe",
            }}
          >
            <AutoAwesome sx={{ fontSize: 16, color: "#7c3aed", animation: "pulse 1.5s ease-in-out infinite" }} />
          </Box>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 500, color: "#6b21a8" }}>
            Processing...
          </Typography>
          <CircularProgress size={14} sx={{ color: "#7c3aed" }} />
        </Box>
      )}

      {/* Add new criteria input */}
      {!isLoading && !readOnly && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={`Add new ${type} criteria...`}
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
                      <Tooltip title={`Add ${type} criteria`}>
                        <IconButton
                          size="small"
                          onClick={handleAddCriteria}
                          disabled={!newCriteriaSentence.trim()}
                          disableRipple
                          sx={{
                            p: 0,
                            color: newCriteriaSentence.trim() ? themeColor : "#94a3b8",
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
                    borderColor: themeColor,
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: themeColor,
                  },
                },
              },
            }}
          />
          <Typography sx={{ fontSize: "0.65rem", color: "#94a3b8", mt: 0.5, ml: 0.5 }}>
            Press Enter or click + to add
          </Typography>
        </Box>
      )}

      {/* Criteria cards */}
      {!isLoading && typeFormulas.length > 0 && (
        <Box display="flex" flexDirection="column" gap={1}>
          {typeFormulas.map((criteria, idx) => {
            const actualIndex = criteriaFormulas.indexOf(typeFormulas[idx])
            const isSaving = savingIndex === actualIndex
            const isLastItem = idx === typeFormulas.length - 1

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
                    handleFormulaChange(idx, newFormula)
                  }
                  onEditInModal={
                    !isSimpleRule(criteria.formula)
                      ? () => handleOpenModal(idx)
                      : undefined
                  }
                  onSentenceEdit={
                    !readOnly
                      ? (newSentence) => handleSentenceEdit(idx, newSentence)
                      : undefined
                  }
                  onDelete={
                    !readOnly
                      ? () => handleDelete(idx)
                      : undefined
                  }
                  onIgnoreUnmappedConcepts={
                    !readOnly && criteria.unmapped_concepts.length > 0
                      ? () => handleIgnoreUnmappedConcepts(idx)
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
      )}

      {/* Empty state */}
      {!isLoading && typeFormulas.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 3,
            color: "#94a3b8",
          }}
        >
          <Typography sx={{ fontSize: "0.8rem" }}>
            No {type} criteria yet
          </Typography>
          <Typography sx={{ fontSize: "0.7rem", mt: 0.5 }}>
            Type above or use AI Generate
          </Typography>
        </Box>
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
    </Box>
  )
}

export default SplitCriteriaPanel
