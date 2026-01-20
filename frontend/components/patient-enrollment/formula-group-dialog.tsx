"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  Tooltip,
} from "@mui/material"
import {
  Close,
  Add,
  Delete,
  PlaylistAdd,
} from "@mui/icons-material"
import type {
  FormulaRule,
  FormulaGroup,
  ColumnType,
  FieldColumnSuggestions,
} from "@/types/cohort.types"
import { FormulaRuleEditor } from "./formula-rule-editor"

// Depth colors for nested groups
const DEPTH_COLORS = [
  { border: "#5c8dc9", bg: "rgba(92, 141, 201, 0.07)" },
  { border: "#8b7bc7", bg: "rgba(139, 123, 199, 0.07)" },
  { border: "#5ba3a8", bg: "rgba(91, 163, 168, 0.07)" },
  { border: "#7ab87a", bg: "rgba(122, 184, 122, 0.07)" },
]

interface FormulaGroupDialogProps {
  /** Dialog open state */
  open: boolean
  /** Close callback */
  onClose: () => void
  /** The formula group to edit */
  formula: FormulaGroup
  /** Original sentence text for context */
  sentenceText: string
  /** Available columns and their types */
  columns: Record<string, ColumnType>
  /** Column suggestions per field */
  columnSuggestions: FieldColumnSuggestions[]
  /** Categorical values for autocomplete */
  categoricalValues?: Record<string, string[]>
  /** Save callback */
  onSave: (formula: FormulaGroup) => void
}

/**
 * Check if an item is a FormulaGroup
 */
function isFormulaGroup(item: FormulaRule | FormulaGroup): item is FormulaGroup {
  return "logic" in item && "rules" in item
}

/**
 * Create a new empty rule
 */
function createEmptyRule(): FormulaRule {
  return {
    field: "",
    operator: "equals",
    value: null,
  }
}

/**
 * Create a new empty group
 */
function createEmptyGroup(): FormulaGroup {
  return {
    logic: "AND",
    negate: false,
    rules: [createEmptyRule()],
  }
}

/**
 * FormulaGroupDialog
 *
 * Modal dialog for editing complex multi-condition formulas with nested AND/OR groups.
 */
export function FormulaGroupDialog({
  open,
  onClose,
  formula,
  sentenceText,
  columns,
  columnSuggestions,
  categoricalValues = {},
  onSave,
}: FormulaGroupDialogProps) {
  // Local state for editing
  const [editedFormula, setEditedFormula] = useState<FormulaGroup>(() => ({
    ...formula,
    rules: [...formula.rules],
  }))

  // Reset when dialog opens with new formula
  const handleOpen = useCallback(() => {
    setEditedFormula({
      ...formula,
      rules: [...formula.rules],
    })
  }, [formula])

  // Get suggestions for a field
  const getSuggestionsForField = (fieldName: string) =>
    columnSuggestions.find((cs) => cs.field_in_formula === fieldName)

  // Update a rule at a specific path
  const updateRuleAtPath = (
    group: FormulaGroup,
    path: number[],
    updater: (item: FormulaRule | FormulaGroup) => FormulaRule | FormulaGroup
  ): FormulaGroup => {
    if (path.length === 0) {
      return group
    }

    const [index, ...restPath] = path
    const newRules = [...group.rules]

    if (restPath.length === 0) {
      newRules[index] = updater(newRules[index])
    } else {
      const nestedGroup = newRules[index]
      if (isFormulaGroup(nestedGroup)) {
        newRules[index] = updateRuleAtPath(nestedGroup, restPath, updater)
      }
    }

    return { ...group, rules: newRules }
  }

  // Delete a rule at a specific path
  const deleteRuleAtPath = (group: FormulaGroup, path: number[]): FormulaGroup => {
    if (path.length === 0) {
      return group
    }

    const [index, ...restPath] = path
    const newRules = [...group.rules]

    if (restPath.length === 0) {
      newRules.splice(index, 1)
    } else {
      const nestedGroup = newRules[index]
      if (isFormulaGroup(nestedGroup)) {
        newRules[index] = deleteRuleAtPath(nestedGroup, restPath)
      }
    }

    return { ...group, rules: newRules }
  }

  // Add a rule to a group at a specific path
  const addRuleToPath = (
    group: FormulaGroup,
    path: number[],
    item: FormulaRule | FormulaGroup
  ): FormulaGroup => {
    if (path.length === 0) {
      return { ...group, rules: [...group.rules, item] }
    }

    const [index, ...restPath] = path
    const newRules = [...group.rules]
    const nestedGroup = newRules[index]

    if (isFormulaGroup(nestedGroup)) {
      newRules[index] = addRuleToPath(nestedGroup, restPath, item)
    }

    return { ...group, rules: newRules }
  }

  // Render a single rule or nested group
  const renderRuleOrGroup = (
    item: FormulaRule | FormulaGroup,
    path: number[],
    depth: number = 0
  ) => {
    const colors = DEPTH_COLORS[depth % DEPTH_COLORS.length]
    const canDelete = editedFormula.rules.length > 1 || path.length > 1

    if (isFormulaGroup(item)) {
      // Render nested group
      return (
        <Paper
          key={path.join("-")}
          elevation={0}
          sx={{
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.border}`,
            borderRadius: 1.5,
            bgcolor: colors.bg,
            p: 1.5,
            mb: 1,
          }}
        >
          {/* Group header */}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <ToggleButtonGroup
              value={item.logic}
              exclusive
              size="small"
              onChange={(_, newLogic) => {
                if (newLogic) {
                  setEditedFormula(
                    updateRuleAtPath(editedFormula, path, (g) => ({
                      ...(g as FormulaGroup),
                      logic: newLogic,
                    }))
                  )
                }
              }}
            >
              <ToggleButton
                value="AND"
                sx={{
                  fontSize: "0.7rem",
                  py: 0.25,
                  px: 1,
                  fontWeight: 600,
                }}
              >
                AND
              </ToggleButton>
              <ToggleButton
                value="OR"
                sx={{
                  fontSize: "0.7rem",
                  py: 0.25,
                  px: 1,
                  fontWeight: 600,
                }}
              >
                OR
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={item.negate || false}
                  onChange={(e) =>
                    setEditedFormula(
                      updateRuleAtPath(editedFormula, path, (g) => ({
                        ...(g as FormulaGroup),
                        negate: e.target.checked,
                      }))
                    )
                  }
                />
              }
              label={
                <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                  Negate
                </Typography>
              }
              sx={{ ml: 1 }}
            />

            <Box flex={1} />

            {/* Add rule/group buttons */}
            <Tooltip title="Add condition">
              <IconButton
                size="small"
                onClick={() =>
                  setEditedFormula(addRuleToPath(editedFormula, path, createEmptyRule()))
                }
                sx={{ color: colors.border }}
              >
                <Add sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Add nested group">
              <IconButton
                size="small"
                onClick={() =>
                  setEditedFormula(addRuleToPath(editedFormula, path, createEmptyGroup()))
                }
                sx={{ color: colors.border }}
              >
                <PlaylistAdd sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {canDelete && (
              <Tooltip title="Delete group">
                <IconButton
                  size="small"
                  onClick={() => setEditedFormula(deleteRuleAtPath(editedFormula, path))}
                  sx={{ color: "#ef4444" }}
                >
                  <Delete sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Nested rules */}
          {item.rules.map((nestedItem, idx) => (
            <Box key={idx}>
              {idx > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    my: 0.75,
                  }}
                >
                  <Divider sx={{ flex: 1 }} />
                  <Typography
                    sx={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: item.logic === "AND" ? "#1976d2" : "#f57c00",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.logic}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>
              )}
              {renderRuleOrGroup(nestedItem, [...path, idx], depth + 1)}
            </Box>
          ))}
        </Paper>
      )
    } else {
      // Render single rule
      return (
        <Box
          key={path.join("-")}
          display="flex"
          alignItems="center"
          gap={1}
          sx={{
            p: 1,
            bgcolor: "#fff",
            borderRadius: 1,
            border: "1px solid #e2e8f0",
            mb: 1,
          }}
        >
          <FormulaRuleEditor
            rule={item}
            columns={columns}
            columnSuggestions={getSuggestionsForField(item.field)}
            categoricalValues={categoricalValues}
            onChange={(updated) =>
              setEditedFormula(updateRuleAtPath(editedFormula, path, () => updated))
            }
            compact
          />

          {canDelete && (
            <IconButton
              size="small"
              onClick={() => setEditedFormula(deleteRuleAtPath(editedFormula, path))}
              sx={{ color: "#ef4444", ml: "auto" }}
            >
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      )
    }
  }

  // Handle save
  const handleSave = () => {
    onSave(editedFormula)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{ onEnter: handleOpen }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Edit Formula
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                maxWidth: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sentenceText}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Root group controls */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
            Root Logic:
          </Typography>
          <ToggleButtonGroup
            value={editedFormula.logic}
            exclusive
            size="small"
            onChange={(_, newLogic) => {
              if (newLogic) {
                setEditedFormula({ ...editedFormula, logic: newLogic })
              }
            }}
          >
            <ToggleButton value="AND" sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5 }}>
              AND
            </ToggleButton>
            <ToggleButton value="OR" sx={{ fontSize: "0.75rem", py: 0.5, px: 1.5 }}>
              OR
            </ToggleButton>
          </ToggleButtonGroup>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={editedFormula.negate || false}
                onChange={(e) =>
                  setEditedFormula({ ...editedFormula, negate: e.target.checked })
                }
              />
            }
            label={
              <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                Negate entire formula
              </Typography>
            }
          />

          <Box flex={1} />

          <Button
            size="small"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={() =>
              setEditedFormula({
                ...editedFormula,
                rules: [...editedFormula.rules, createEmptyRule()],
              })
            }
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            Add Condition
          </Button>

          <Button
            size="small"
            startIcon={<PlaylistAdd sx={{ fontSize: 16 }} />}
            onClick={() =>
              setEditedFormula({
                ...editedFormula,
                rules: [...editedFormula.rules, createEmptyGroup()],
              })
            }
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            Add Group
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Rules */}
        {editedFormula.rules.map((item, idx) => (
          <Box key={idx}>
            {idx > 0 && (
              <Box display="flex" alignItems="center" gap={1} my={1}>
                <Divider sx={{ flex: 1 }} />
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: editedFormula.logic === "AND" ? "#1976d2" : "#f57c00",
                    textTransform: "uppercase",
                    px: 1,
                  }}
                >
                  {editedFormula.logic}
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            )}
            {renderRuleOrGroup(item, [idx], 0)}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save Formula
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default FormulaGroupDialog
