"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  TextField,
  CircularProgress,
} from "@mui/material"
import {
  CheckCircle,
  Warning,
  Edit,
  Delete,
  Save,
  Close,
  OpenInNew,
  AutoAwesome,
} from "@mui/icons-material"
import type {
  CriteriaFormula,
  FormulaRule,
  FormulaGroup,
  ColumnType,
  isFormulaGroup,
  FieldColumnSuggestions,
} from "@/types/cohort.types"
import { FormulaRuleEditor } from "./formula-rule-editor"

interface CriteriaFormulaCardProps {
  /** The criteria formula data */
  criteria: CriteriaFormula
  /** Index of this card in the list */
  index: number
  /** Available columns and their types */
  columns: Record<string, ColumnType>
  /** Categorical values for autocomplete */
  categoricalValues?: Record<string, string[]>
  /** User's column selections (overrides AI suggestions) */
  columnSelections?: Record<string, string>
  /** Callback when formula changes */
  onFormulaChange: (formula: FormulaRule | FormulaGroup) => void
  /** Callback when user selects a column for a field */
  onColumnSelect?: (field: string, column: string) => void
  /** Callback to open modal for complex editing */
  onEditInModal?: () => void
  /** Read-only mode */
  readOnly?: boolean
  /** Null stats per column */
  nullStats?: Record<string, number>
  /** Total count for percentage calculation */
  totalCount?: number
  /** Callback when sentence is edited */
  onSentenceEdit?: (newSentence: string) => void
  /** Callback when criteria is deleted */
  onDelete?: () => void
  /** Is saving/processing */
  isSaving?: boolean
  /** Callback when unmapped concepts are ignored/dismissed */
  onIgnoreUnmappedConcepts?: () => void
}

/**
 * Check if a formula is a simple FormulaRule or a complex FormulaGroup
 */
function isSimpleRule(formula: FormulaRule | FormulaGroup): formula is FormulaRule {
  return !("logic" in formula)
}

/**
 * Get column suggestions for a specific field
 */
function getSuggestionsForField(
  fieldName: string,
  columnSuggestions: FieldColumnSuggestions[]
): FieldColumnSuggestions | undefined {
  return columnSuggestions.find((cs) => cs.field_in_formula === fieldName)
}

/**
 * Find actual column name with case-insensitive matching
 */
function findColumnCaseInsensitive(
  fieldName: string,
  columns: Record<string, ColumnType>
): boolean {
  // First try exact match
  if (fieldName in columns) {
    return true
  }
  // Then try case-insensitive match
  const lowerField = fieldName.toLowerCase()
  return Object.keys(columns).some((col) => col.toLowerCase() === lowerField)
}

/**
 * Check if all fields in a formula have valid column mappings (case-insensitive)
 */
function isFormulaFullyMapped(
  formula: FormulaRule | FormulaGroup,
  columns: Record<string, ColumnType>,
  columnSelections?: Record<string, string>
): boolean {
  if (isSimpleRule(formula)) {
    // For simple rule, check if the field exists in columns or has a selection (case-insensitive)
    const effectiveField = columnSelections?.[formula.field] || formula.field
    return findColumnCaseInsensitive(effectiveField, columns)
  } else {
    // For group, check all nested rules
    return formula.rules.every((rule) =>
      isFormulaFullyMapped(rule, columns, columnSelections)
    )
  }
}

/**
 * Render a formula as a human-readable string
 */
function formulaToString(formula: FormulaRule | FormulaGroup): string {
  if (isSimpleRule(formula)) {
    const { field, operator, value, value2 } = formula
    switch (operator) {
      case "equals":
        return `${field} = ${value}`
      case "not_equals":
        return `${field} ≠ ${value}`
      case "gt":
        return `${field} > ${value}`
      case "gte":
        return `${field} >= ${value}`
      case "lt":
        return `${field} < ${value}`
      case "lte":
        return `${field} <= ${value}`
      case "between":
        return `${value} <= ${field} <= ${value2}`
      case "contains":
        return `${field} contains "${value}"`
      case "is_empty":
        return `${field} is empty`
      case "is_not_empty":
        return `${field} is not empty`
      default:
        return `${field} ${operator} ${value}`
    }
  } else {
    const parts = formula.rules.map((r) => formulaToString(r))
    const joined = parts.join(` ${formula.logic} `)
    return formula.negate ? `NOT (${joined})` : `(${joined})`
  }
}

/**
 * CriteriaFormulaCard
 *
 * Displays a single IC/EC sentence with its AI-generated formula.
 * Simple rules are editable inline, complex groups show "Edit in Modal" button.
 */
export function CriteriaFormulaCard({
  criteria,
  index,
  columns,
  categoricalValues = {},
  columnSelections = {},
  onFormulaChange,
  onColumnSelect,
  onEditInModal,
  readOnly = false,
  nullStats = {},
  totalCount = 0,
  onSentenceEdit,
  onDelete,
  isSaving = false,
  onIgnoreUnmappedConcepts,
}: CriteriaFormulaCardProps) {
  const isInclusion = criteria.type === "inclusion"
  const tagPrefix = isInclusion ? "IC" : "EC"

  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedSentence, setEditedSentence] = useState(criteria.sentence)

  // Sync editedSentence when criteria.sentence changes (after API response)
  useEffect(() => {
    setEditedSentence(criteria.sentence)
  }, [criteria.sentence])

  // Ref for detecting text truncation
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  // Handle save edit
  const handleSaveEdit = () => {
    if (onSentenceEdit && editedSentence.trim() !== criteria.sentence) {
      onSentenceEdit(editedSentence.trim())
    }
    setIsEditing(false)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedSentence(criteria.sentence)
    setIsEditing(false)
  }

  // Check if text is truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth)
      }
    }
    checkTruncation()
    window.addEventListener("resize", checkTruncation)
    return () => window.removeEventListener("resize", checkTruncation)
  }, [criteria.sentence])

  // Check if formula is simple or complex
  const isSimple = isSimpleRule(criteria.formula)

  // Check if all columns are mapped
  const isFullyMapped = useMemo(
    () => isFormulaFullyMapped(criteria.formula, columns, columnSelections),
    [criteria.formula, columns, columnSelections]
  )

  // Check for unmapped concepts
  const hasUnmappedConcepts = criteria.unmapped_concepts.length > 0

  // Overall status
  const hasIssues = !isFullyMapped || hasUnmappedConcepts

  // Get column suggestions for the formula fields
  const getFieldSuggestions = (fieldName: string) =>
    getSuggestionsForField(fieldName, criteria.column_suggestions)

  // Handle formula rule change
  const handleRuleChange = (updatedRule: FormulaRule) => {
    onFormulaChange(updatedRule)
  }

  // Render formula content
  const renderFormulaContent = () => {
    if (isSimple) {
      const rule = criteria.formula as FormulaRule
      return (
        <FormulaRuleEditor
          rule={rule}
          columns={columns}
          columnSuggestions={getFieldSuggestions(rule.field)}
          categoricalValues={categoricalValues}
          onChange={handleRuleChange}
          compact
          readOnly={readOnly}
          showErrors={!isFullyMapped}
        />
      )
    } else {
      // Complex formula - show summary and edit button inside
      const formulaString = formulaToString(criteria.formula)
      return (
        <Tooltip
          title={formulaString}
          arrow
          placement="top"
          enterDelay={300}
          slotProps={{
            tooltip: {
              sx: {
                maxWidth: 500,
                fontSize: "0.75rem",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              },
            },
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            gap={0.75}
            sx={{
              bgcolor: "#f8fafc",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              border: "1px solid #e2e8f0",
              cursor: onEditInModal && !readOnly ? "pointer" : "default",
              minWidth: 0,
              maxWidth: "100%",
              overflow: "hidden",
              "&:hover": onEditInModal && !readOnly ? {
                bgcolor: "#f1f5f9",
                borderColor: "#cbd5e1",
              } : {},
            }}
            onClick={onEditInModal && !readOnly ? onEditInModal : undefined}
          >
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "#475569",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {formulaString}
            </Typography>
            {onEditInModal && !readOnly && (
              <Tooltip title="Open in editor">
                <OpenInNew sx={{ fontSize: 12, color: "#7c3aed", flexShrink: 0 }} />
              </Tooltip>
            )}
          </Box>
        </Tooltip>
      )
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e2e8f0",
        borderLeft: "3px solid",
        borderLeftColor: isInclusion ? "#3b82f6" : "#ef4444",
        borderRadius: 1.5,
        bgcolor: hasUnmappedConcepts ? "#fffbeb" : "#fff",
        overflow: "hidden",
        opacity: isSaving ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Row 1: Tag + Sentence + Actions + Status */}
      <Box
        display="flex"
        alignItems="flex-start"
        gap={1}
        sx={{
          px: 1.5,
          py: 1,
        }}
      >
        {/* IC/EC Tag */}
        <Chip
          label={`${tagPrefix} ${index + 1}`}
          size="small"
          sx={{
            bgcolor: isInclusion ? "#dbeafe" : "#fee2e2",
            color: isInclusion ? "#1d4ed8" : "#b91c1c",
            fontWeight: 600,
            fontSize: "0.7rem",
            height: 22,
            minWidth: 44,
            borderRadius: 0.75,
            flexShrink: 0,
            mt: 0.25,
          }}
        />

        {/* Sentence text or edit field */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <TextField
              value={editedSentence}
              onChange={(e) => setEditedSentence(e.target.value)}
              fullWidth
              multiline
              size="small"
              autoFocus
              sx={{
                "& .MuiInputBase-root": {
                  fontSize: "0.8rem",
                  py: 0.5,
                },
              }}
            />
          ) : (
            <Tooltip
              title={criteria.sentence || "No sentence provided"}
              arrow
              disableHoverListener={!isTruncated && !!criteria.sentence}
            >
              <Typography
                ref={textRef}
                component="div"
                sx={{
                  fontSize: "0.8rem",
                  color: criteria.sentence ? "#334155" : "#94a3b8",
                  fontWeight: 500,
                  fontStyle: criteria.sentence ? "normal" : "italic",
                  lineHeight: 1.4,
                }}
              >
                {criteria.sentence || "(Empty sentence)"}
              </Typography>
            </Tooltip>
          )}
        </Box>

        {/* Action buttons */}
        <Box display="flex" alignItems="center" gap={0.25} flexShrink={0}>
          {isEditing ? (
            <>
              <Tooltip title="Save">
                <IconButton size="small" onClick={handleSaveEdit} disabled={isSaving}>
                  <Save sx={{ fontSize: 16, color: "#16a34a" }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={handleCancelEdit} disabled={isSaving}>
                  <Close sx={{ fontSize: 16, color: "#64748b" }} />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              {!readOnly && onSentenceEdit && (
                <Tooltip title="Edit criteria">
                  <IconButton size="small" onClick={() => setIsEditing(true)} disabled={isSaving}>
                    <Edit sx={{ fontSize: 16, color: "#64748b" }} />
                  </IconButton>
                </Tooltip>
              )}
              {!readOnly && onDelete && (
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={onDelete} disabled={isSaving}>
                    <Delete sx={{ fontSize: 16, color: "#64748b" }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}

          {/* Status indicator */}
          {hasIssues ? (
            <Tooltip title="Some fields need attention">
              <Warning sx={{ fontSize: 18, color: "#f59e0b", ml: 0.5 }} />
            </Tooltip>
          ) : (
            <Tooltip title="All fields mapped">
              <CheckCircle sx={{ fontSize: 18, color: "#16a34a", ml: 0.5 }} />
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Row 2: Formula editor */}
      <Box
        sx={{
          px: 1.5,
          pb: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* AI Processing indicator */}
        {isSaving && (
          <Chip
            label="AI generating..."
            size="small"
            icon={<CircularProgress size={10} sx={{ color: "#7c3aed" }} />}
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor: "#ede9fe",
              color: "#6b21a8",
              border: "1px solid #c4b5fd",
              "& .MuiChip-label": { px: 0.5 },
              "& .MuiChip-icon": { ml: 0.5 },
              animation: "pulse 1.5s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.6 },
              },
            }}
          />
        )}
        {/* Unmapped concepts (if any) */}
        {!isSaving && hasUnmappedConcepts && (
          <Tooltip title={`${criteria.unmapped_concepts.join(", ")}${onIgnoreUnmappedConcepts ? " (click × to ignore)" : ""}`}>
            <Chip
              label={`${criteria.unmapped_concepts.length} unmapped`}
              size="small"
              icon={<Warning sx={{ fontSize: 12 }} />}
              onDelete={!readOnly && onIgnoreUnmappedConcepts ? onIgnoreUnmappedConcepts : undefined}
              deleteIcon={<Close sx={{ fontSize: 12 }} />}
              sx={{
                height: 20,
                fontSize: "0.65rem",
                bgcolor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fcd34d",
                "& .MuiChip-label": { px: 0.5 },
                "& .MuiChip-icon": { color: "#f59e0b", ml: 0.5 },
                "& .MuiChip-deleteIcon": {
                  color: "#92400e",
                  fontSize: 12,
                  "&:hover": { color: "#78350f" },
                },
              }}
            />
          </Tooltip>
        )}
        {!isSaving && renderFormulaContent()}
      </Box>
    </Paper>
  )
}

export default CriteriaFormulaCard
