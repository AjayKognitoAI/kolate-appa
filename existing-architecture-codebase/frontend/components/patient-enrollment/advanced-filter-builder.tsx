"use client"

import { useState } from "react"
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
  Collapse,
  CircularProgress,
  LinearProgress,
  Fade,
} from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3"
import { parseISO, format, isValid } from "date-fns"
import {
  Add,
  Delete,
  PlayArrow,
  Clear,
  Save,
  FolderOpen,
  Code,
  Description,
  ExpandMore,
  ExpandLess,
  AutoAwesome,
} from "@mui/icons-material"
import type {
  ColumnType,
  FilterRule,
  FilterGroup,
  LogicType,
  OperatorType,
  Cohort,
} from "@/types/cohort.types"

interface AdvancedFilterBuilderProps {
  columns: Record<string, ColumnType>
  filter: FilterGroup
  cohorts: Cohort[]
  onFilterChange: (filter: FilterGroup) => void
  onRunFilter: () => void
  onClearFilter: () => void
  onSaveFilter: (name: string, description: string) => void
  // AI-related props
  isGeneratingAI?: boolean
  onGenerateAI?: () => void
  hasCriteria?: boolean
}

const OPERATORS: { value: OperatorType; label: string; symbol: string; types: ColumnType[] }[] = [
  { value: "equals", label: "Equals", symbol: "=", types: ["string", "number", "categorical"] },
  { value: "not_equals", label: "Not Equals", symbol: "≠", types: ["string", "number", "categorical"] },
  { value: "contains", label: "Contains", symbol: "∋", types: ["string"] },
  { value: "gt", label: "Greater Than", symbol: ">", types: ["number"] },
  { value: "gte", label: "Greater or Equal", symbol: "≥", types: ["number"] },
  { value: "lt", label: "Less Than", symbol: "<", types: ["number"] },
  { value: "lte", label: "Less or Equal", symbol: "≤", types: ["number"] },
  { value: "between", label: "Between", symbol: "∈", types: ["number"] },
  { value: "is_empty", label: "Is Empty", symbol: "∅", types: ["string", "number", "categorical", "date"] },
  { value: "is_not_empty", label: "Is Not Empty", symbol: "≠∅", types: ["string", "number", "categorical", "date"] },
  { value: "in_cohort", label: "Belongs to Cohort", symbol: "∈C", types: ["string", "number"] },
  { value: "not_in_cohort", label: "Not Belongs to Cohort", symbol: "∉C", types: ["string", "number"] },
  // Date operators
  { value: "on_date", label: "On Date", symbol: "=", types: ["date"] },
  { value: "before", label: "Before", symbol: "<", types: ["date"] },
  { value: "after", label: "After", symbol: ">", types: ["date"] },
  { value: "on_or_before", label: "On or Before", symbol: "≤", types: ["date"] },
  { value: "on_or_after", label: "On or After", symbol: "≥", types: ["date"] },
  { value: "between_dates", label: "Between Dates", symbol: "∈", types: ["date"] },
]

// Helper to parse date value for DatePicker
const parseDateValue = (value: string | number | null | undefined): Date | null => {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return new Date(value)
  const parsed = parseISO(String(value))
  return isValid(parsed) ? parsed : null
}

// Helper to format date for storage
const formatDateForStorage = (date: Date | null): string | null => {
  if (!date || !isValid(date)) return null
  return format(date, "yyyy-MM-dd")
}

export function AdvancedFilterBuilder({
  columns,
  filter,
  cohorts,
  onFilterChange,
  onRunFilter,
  onClearFilter,
  onSaveFilter,
  isGeneratingAI,
  onGenerateAI,
  hasCriteria,
}: AdvancedFilterBuilderProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [filterDescription, setFilterDescription] = useState("")
  const [viewMode, setViewMode] = useState<"visual" | "formula">("visual")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["root"]))

  const columnKeys = Object.keys(columns)

  const generateId = () => `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const addRule = (groupId: string) => {
    const newRule: FilterRule = {
      id: generateId(),
      field: columnKeys[0] || "",
      operator: "equals",
      value: "",
    }

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return { ...group, rules: [...group.rules, newRule] }
      }
      return {
        ...group,
        rules: group.rules.map((r) =>
          "logic" in r ? updateGroup(r as FilterGroup) : r
        ),
      }
    }

    onFilterChange(updateGroup(filter))
  }

  const addGroup = (parentId: string) => {
    const newGroup: FilterGroup = {
      id: generateId(),
      logic: "AND",
      rules: [],
    }

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === parentId) {
        return { ...group, rules: [...group.rules, newGroup] }
      }
      return {
        ...group,
        rules: group.rules.map((r) =>
          "logic" in r ? updateGroup(r as FilterGroup) : r
        ),
      }
    }

    onFilterChange(updateGroup(filter))
    setExpandedGroups((prev) => new Set([...prev, newGroup.id]))
  }

  const updateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    const updateInGroup = (group: FilterGroup): FilterGroup => ({
      ...group,
      rules: group.rules.map((r) => {
        if ("logic" in r) {
          return updateInGroup(r as FilterGroup)
        }
        if ((r as FilterRule).id === ruleId) {
          return { ...(r as FilterRule), ...updates }
        }
        return r
      }),
    })

    onFilterChange(updateInGroup(filter))
  }

  const updateGroupLogic = (groupId: string, logic: LogicType) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return { ...group, logic }
      }
      return {
        ...group,
        rules: group.rules.map((r) =>
          "logic" in r ? updateGroup(r as FilterGroup) : r
        ),
      }
    }

    onFilterChange(updateGroup(filter))
  }

  const deleteRule = (ruleId: string) => {
    const deleteFromGroup = (group: FilterGroup): FilterGroup => ({
      ...group,
      rules: group.rules
        .filter((r) => {
          if ("logic" in r) return true
          return (r as FilterRule).id !== ruleId
        })
        .map((r) => ("logic" in r ? deleteFromGroup(r as FilterGroup) : r)),
    })

    onFilterChange(deleteFromGroup(filter))
  }

  const deleteGroup = (groupId: string) => {
    const deleteFromGroup = (group: FilterGroup): FilterGroup => ({
      ...group,
      rules: group.rules
        .filter((r) => {
          if ("logic" in r) return (r as FilterGroup).id !== groupId
          return true
        })
        .map((r) => ("logic" in r ? deleteFromGroup(r as FilterGroup) : r)),
    })

    onFilterChange(deleteFromGroup(filter))
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const handleSave = () => {
    if (filterName.trim()) {
      onSaveFilter(filterName.trim(), filterDescription.trim())
      setSaveDialogOpen(false)
      setFilterName("")
      setFilterDescription("")
    }
  }

  // Convert filter to mathematical formula
  const filterToFormula = (group: FilterGroup, indent = 0): string => {
    if (group.rules.length === 0) return "∀ patients (true)"

    const logic = group.logic === "AND" ? " ∧ " : " ∨ "
    const parts = group.rules.map((rule) => {
      if ("logic" in rule) {
        return `(${filterToFormula(rule as FilterGroup, indent + 1)})`
      }
      const r = rule as FilterRule
      const op = OPERATORS.find((o) => o.value === r.operator)
      const symbol = op?.symbol || "="

      if (r.operator === "is_empty") return `${r.field} = ∅`
      if (r.operator === "is_not_empty") return `${r.field} ≠ ∅`
      if (r.operator === "between") return `${r.value} ≤ ${r.field} ≤ ${r.value2}`
      if (r.operator === "contains") return `"${r.value}" ⊂ ${r.field}`
      if (r.operator === "in_cohort") {
        const cohort = cohorts.find((c) => c.id === r.value)
        return `patient ∈ ${cohort?.name || "Cohort"}`
      }
      if (r.operator === "not_in_cohort") {
        const cohort = cohorts.find((c) => c.id === r.value)
        return `patient ∉ ${cohort?.name || "Cohort"}`
      }
      return `${r.field} ${symbol} ${r.value}`
    })

    return parts.join(logic)
  }

  const renderRule = (rule: FilterRule) => {
    const fieldType = columns[rule.field] || "string"
    const availableOperators = OPERATORS.filter(
      (op) => op.types.includes(fieldType) || op.value === "in_cohort" || op.value === "not_in_cohort"
    )
    const isCohortOperator = rule.operator === "in_cohort" || rule.operator === "not_in_cohort"
    const isBetween = rule.operator === "between"
    const isBetweenDates = rule.operator === "between_dates"
    const noValueNeeded = rule.operator === "is_empty" || rule.operator === "is_not_empty"
    const isDateField = fieldType === "date"

    return (
      <Box
        key={rule.id}
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          p: 1.5,
          bgcolor: "#fafbfc",
          borderRadius: 1,
          mb: 1,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Field</InputLabel>
          <Select
            value={rule.field}
            label="Field"
            onChange={(e) => updateRule(rule.id, { field: e.target.value })}
          >
            {columnKeys.map((col) => (
              <MenuItem key={col} value={col}>
                {col}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Operator</InputLabel>
          <Select
            value={rule.operator}
            label="Operator"
            onChange={(e) => updateRule(rule.id, { operator: e.target.value as OperatorType, value: "" })}
          >
            {availableOperators.map((op) => (
              <MenuItem key={op.value} value={op.value}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontFamily="monospace" color="primary">
                    {op.symbol}
                  </Typography>
                  {op.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!noValueNeeded && (
          isCohortOperator ? (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Cohort</InputLabel>
              <Select
                value={rule.value}
                label="Cohort"
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
              >
                {cohorts.map((cohort) => (
                  <MenuItem key={cohort.id} value={cohort.id}>
                    {cohort.name} ({cohort.patientCount})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : isDateField ? (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={parseDateValue(rule.value)}
                onChange={(date) => updateRule(rule.id, { value: formatDateForStorage(date) })}
                slotProps={{
                  textField: {
                    size: "small",
                    label: isBetweenDates ? "Start Date" : "Date",
                    sx: { width: 150 },
                  },
                }}
              />
              {isBetweenDates && (
                <DatePicker
                  value={parseDateValue(rule.value2)}
                  onChange={(date) => updateRule(rule.id, { value2: formatDateForStorage(date) })}
                  slotProps={{
                    textField: {
                      size: "small",
                      label: "End Date",
                      sx: { width: 150 },
                    },
                  }}
                />
              )}
            </LocalizationProvider>
          ) : (
            <>
              <TextField
                size="small"
                label={isBetween ? "Min" : "Value"}
                value={rule.value}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                type={fieldType === "number" ? "number" : "text"}
                sx={{ width: 120 }}
              />
              {isBetween && (
                <TextField
                  size="small"
                  label="Max"
                  value={rule.value2 || ""}
                  onChange={(e) => updateRule(rule.id, { value2: e.target.value })}
                  type="number"
                  sx={{ width: 120 }}
                />
              )}
            </>
          )
        )}

        <IconButton size="small" color="error" onClick={() => deleteRule(rule.id)}>
          <Delete fontSize="small" />
        </IconButton>
      </Box>
    )
  }

  const renderGroup = (group: FilterGroup, depth = 0) => {
    const isExpanded = expandedGroups.has(group.id)
    const isRoot = group.id === "root"

    return (
      <Paper
        key={group.id}
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: depth === 0 ? "#ececf1" : "primary.light",
          borderRadius: 1,
          mb: depth > 0 ? 1 : 0,
          ml: depth > 0 ? 2 : 0,
          bgcolor: depth % 2 === 0 ? "background.paper" : "#fafbfc",
        }}
      >
        <Box
          p={1.5}
          display="flex"
          alignItems="center"
          gap={1}
          borderBottom={isExpanded ? "1px solid #ececf1" : "none"}
          sx={{ cursor: "pointer" }}
          onClick={() => toggleGroup(group.id)}
        >
          <IconButton size="small">
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>

          <ToggleButtonGroup
            value={group.logic}
            exclusive
            size="small"
            onChange={(_, val) => val && updateGroupLogic(group.id, val)}
            onClick={(e) => e.stopPropagation()}
          >
            <ToggleButton value="AND">
              <Typography variant="caption" fontWeight={600}>AND</Typography>
            </ToggleButton>
            <ToggleButton value="OR">
              <Typography variant="caption" fontWeight={600}>OR</Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          <Chip
            label={`${group.rules.length} rule${group.rules.length !== 1 ? "s" : ""}`}
            size="small"
            variant="outlined"
          />

          <Box flex={1} />

          {!isRoot && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation()
                deleteGroup(group.id)
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Collapse in={isExpanded}>
          <Box p={2}>
            {group.rules.map((rule) =>
              "logic" in rule
                ? renderGroup(rule as FilterGroup, depth + 1)
                : renderRule(rule as FilterRule)
            )}

            <Box display="flex" gap={1} mt={2}>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => addRule(group.id)}
                variant="outlined"
              >
                Add Rule
              </Button>
              <Button
                size="small"
                startIcon={<FolderOpen />}
                onClick={() => addGroup(group.id)}
                variant="outlined"
              >
                Add Group
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Paper>
    )
  }

  return (
    <Paper elevation={0} sx={{ border: "1px solid #ececf1", height: "100%", position: "relative" }}>
      {/* AI Generation Loading Overlay */}
      <Fade in={isGeneratingAI}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(255, 255, 255, 0.95)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 2s ease-in-out infinite",
              "@keyframes pulse": {
                "0%, 100%": { transform: "scale(1)", opacity: 1 },
                "50%": { transform: "scale(1.1)", opacity: 0.8 },
              },
            }}
          >
            <AutoAwesome sx={{ fontSize: 28, color: "white" }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={600}>
            AI is generating filters...
          </Typography>
          <Box sx={{ width: 200 }}>
            <LinearProgress
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: "rgba(102, 126, 234, 0.2)",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        </Box>
      </Fade>

      {/* Header */}
      <Box p={2} borderBottom="1px solid #ececf1" display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Filter Builder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create complex nested filters with AND/OR logic
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {onGenerateAI && (
            <Tooltip title={hasCriteria ? "Generate filters from your screening criteria" : "Add screening criteria first"}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isGeneratingAI ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                  onClick={onGenerateAI}
                  disabled={isGeneratingAI || !hasCriteria}
                  sx={{
                    background: hasCriteria
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : undefined,
                    "&:hover": {
                      background: hasCriteria
                        ? "linear-gradient(135deg, #5a67d8 0%, #6b46a1 100%)"
                        : undefined,
                    },
                    "&:disabled": {
                      background: "#e0e0e0",
                    },
                  }}
                >
                  {isGeneratingAI ? "Generating..." : "AI Generate"}
                </Button>
              </span>
            </Tooltip>
          )}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(_, val) => val && setViewMode(val)}
            disabled={isGeneratingAI}
          >
            <Tooltip title="Visual Builder">
              <ToggleButton value="visual">
                <Description fontSize="small" />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Mathematical Formula">
              <ToggleButton value="formula">
                <Code fontSize="small" />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Content */}
      <Box p={2} sx={{ maxHeight: 500, overflow: "auto" }}>
        {viewMode === "visual" ? (
          renderGroup(filter)
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: "#1e1e1e",
              borderRadius: 1,
              fontFamily: "monospace",
              color: "#d4d4d4",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            <Typography variant="caption" color="#6a9955" display="block" mb={2}>
              // Mathematical representation of filter criteria
            </Typography>
            <Typography
              component="div"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.95rem",
                lineHeight: 1.8,
                color: "#ce9178",
              }}
            >
              {filter.rules.length > 0 ? (
                <>
                  <Box component="span" sx={{ color: "#569cd6" }}>SELECT </Box>
                  <Box component="span" sx={{ color: "#dcdcaa" }}>patient </Box>
                  <Box component="span" sx={{ color: "#569cd6" }}>WHERE</Box>
                  <br />
                  <Box component="span" sx={{ color: "#d4d4d4", pl: 2, display: "block" }}>
                    {filterToFormula(filter)}
                  </Box>
                </>
              ) : (
                <Box component="span" sx={{ color: "#6a9955" }}>
                  // No filter criteria defined - all patients will match
                </Box>
              )}
            </Typography>

            <Divider sx={{ my: 2, borderColor: "#404040" }} />

            <Typography variant="caption" color="#6a9955" display="block" mb={1}>
              // Legend:
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>∧ = AND</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>∨ = OR</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>= equals</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>≠ not equals</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>{">"} greater than</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>{"<"} less than</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>≥ greater or equal</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>≤ less or equal</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>∈ in / belongs to</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>∉ not in</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>∅ empty</Typography>
              <Typography variant="caption" sx={{ color: "#9cdcfe" }}>⊂ contains</Typography>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Actions */}
      <Box p={2} borderTop="1px solid #ececf1" display="flex" gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={onRunFilter}
          disabled={filter.rules.length === 0 || isGeneratingAI}
        >
          Run Filter
        </Button>
        <Button
          variant="outlined"
          startIcon={<Save />}
          onClick={() => setSaveDialogOpen(true)}
          disabled={filter.rules.length === 0 || isGeneratingAI}
        >
          Save
        </Button>
        <Button
          variant="outlined"
          startIcon={<Clear />}
          onClick={onClearFilter}
          color="error"
          disabled={isGeneratingAI}
        >
          Clear
        </Button>
      </Box>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Filter</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Filter Name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={filterDescription}
            onChange={(e) => setFilterDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!filterName.trim()}>
            Save Filter
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
