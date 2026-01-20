"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Grid,
  Autocomplete,
  CircularProgress,
  LinearProgress,
  Switch,
  FormControlLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
} from "@mui/material"
import {
  Add,
  Delete,
  FilterList,
  ViewList,
  PlayArrow,
  Clear,
  DoNotDisturb,
  BookmarkBorder,
  AutoAwesome,
  CleaningServices,
  Save,
  InfoOutlined,
  Edit,
  MenuBook,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3"
import { parseISO, format, isValid } from "date-fns"
import { SavedFilterSelector } from "./saved-filter-selector"
import { AISuggestionsGate } from "./ai-suggestions-gate"
import { SentenceFormulaPanel } from "./sentence-formula-panel"
import cohortService from "@/services/patient-enrollment/cohort-service"
import type { FilterMappingResponse, CriteriaFormula, ColumnMetadata } from "@/types/cohort.types"
import type { PatientData } from "@/lib/screening-logic"
import type {
  ColumnType,
  FilterGroup,
  FilterRule,
  OperatorType,
  LogicType,
  Cohort,
} from "@/types/cohort.types"

interface FullScreenFilterBuilderProps {
  columns: Record<string, ColumnType>
  filter: FilterGroup
  cohorts: Cohort[]
  data: PatientData[]
  filteredData?: PatientData[] // Filtered patient data for preview
  onFilterChange: (filter: FilterGroup) => void
  onApplyFilter: () => void
  filteredCount: number
  totalCount: number
  isGeneratingAI?: boolean
  onGenerateAI?: () => void
  inclusionCriteria?: string
  exclusionCriteria?: string
  excludeDirtyData?: boolean
  onExcludeDirtyDataChange?: (exclude: boolean) => void
  onInclusionCriteriaChange?: (criteria: string) => void
  onExclusionCriteriaChange?: (criteria: string) => void
  nullStats?: Record<string, number> // Null count per column
  columnMappings?: Record<string, string> | null // Column mappings: filter field name -> actual column in data
  patientIdColumn?: string // The column that contains patient IDs - only this column can use cohort operators
  studyId?: string // Study ID for fetching cohort patient IDs
  readOnly?: boolean // When true, hide all editing controls
  isApplyEnabled?: boolean // When provided, controls whether Apply button is enabled (for parent state management)
  onApplyComplete?: () => void // Callback when Apply is successfully clicked (for parent state management)
  onEditMode?: () => void // Callback when user switches to edit mode or makes filter changes (for parent state management)
  // New: Sentence-by-formula criteria processing (only used in "default" view mode)
  criteriaFormulas?: CriteriaFormula[] // Processed criteria formulas from AI
  onCriteriaFormulasChange?: (formulas: CriteriaFormula[]) => void // Callback when user edits a formula
  isProcessingCriteria?: boolean // Loading state while processing criteria
  // Column metadata for AI process-criteria API calls
  columnMetadata?: Record<string, string | ColumnMetadata>
  // Categorical values for autocomplete in formula editors
  categoricalValues?: Record<string, string[]>
}

// Operator configurations with mathematical symbols
const OPERATORS: { value: OperatorType; label: string; symbol: string; types: ColumnType[] }[] = [
  { value: "equals", label: "Equals", symbol: "=", types: ["string", "number", "categorical"] },
  { value: "not_equals", label: "Not Equals", symbol: "≠", types: ["string", "number", "categorical"] },
  { value: "contains", label: "Contains", symbol: "∋", types: ["string"] },
  { value: "gt", label: "Greater Than", symbol: ">", types: ["number"] },
  { value: "gte", label: "Greater or Equal", symbol: "≥", types: ["number"] },
  { value: "lt", label: "Less Than", symbol: "<", types: ["number"] },
  { value: "lte", label: "Less or Equal", symbol: "≤", types: ["number"] },
  { value: "between", label: "Between", symbol: "∈", types: ["number"] },
  { value: "is_empty", label: "Is Empty", symbol: "= ∅", types: ["string", "number", "categorical", "date"] },
  { value: "is_not_empty", label: "Is Not Empty", symbol: "≠ ∅", types: ["string", "number", "categorical", "date"] },
  { value: "in_cohort", label: "Belongs to Cohort", symbol: "∈ C", types: ["string", "number", "categorical"] },
  { value: "not_in_cohort", label: "Not Belongs to Cohort", symbol: "∉ C", types: ["string", "number", "categorical"] },
  // Date operators
  { value: "on_date", label: "On Date", symbol: "=", types: ["date"] },
  { value: "before", label: "Before", symbol: "<", types: ["date"] },
  { value: "after", label: "After", symbol: ">", types: ["date"] },
  { value: "on_or_before", label: "On or Before", symbol: "≤", types: ["date"] },
  { value: "on_or_after", label: "On or After", symbol: "≥", types: ["date"] },
  { value: "between_dates", label: "Between Dates", symbol: "∈", types: ["date"] },
]

// Type guard
const isFilterRule = (rule: FilterRule | FilterGroup): rule is FilterRule => {
  return !("logic" in rule)
}

// Gate colors
const GATE_COLORS = {
  AND: { bg: "#e3f2fd", border: "#1976d2", text: "#1565c0" },
  OR: { bg: "#fff3e0", border: "#f57c00", text: "#e65100" },
}

// Soft theme-consistent colors for nested groups (light and harmonious)
const RAINBOW_DEPTH_COLORS = [
  { border: "#5c8dc9", bg: "rgba(92, 141, 201, 0.07)" },   // Soft Blue (Theme Primary)
  { border: "#8b7bc7", bg: "rgba(139, 123, 199, 0.07)" },  // Soft Purple
  { border: "#5ba3a8", bg: "rgba(91, 163, 168, 0.07)" },   // Soft Teal
  { border: "#7ab87a", bg: "rgba(122, 184, 122, 0.07)" },  // Soft Green
]

// Get depth color (cycles after 4 levels)
const getRainbowColor = (depth: number) => {
  return RAINBOW_DEPTH_COLORS[depth % RAINBOW_DEPTH_COLORS.length]
}

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

// Recursive FilterGroup component
interface FilterGroupComponentProps {
  group: FilterGroup
  columns: Record<string, ColumnType>
  cohorts: Cohort[]
  categoricalValues: Record<string, string[]>
  onUpdate: (group: FilterGroup) => void
  onDelete?: () => void
  depth: number
  nullStats?: Record<string, number> // Null count per column
  totalCount?: number // Total row count for percentage calculation
  patientIdColumn?: string // The column that contains patient IDs - only this column can use cohort operators
  readOnly?: boolean // When true, hide all editing controls
  excludeAISuggestions?: boolean // When true, don't render AI suggestions gate (but preserve in updates)
}

function FilterGroupComponent({
  group,
  columns,
  cohorts,
  categoricalValues,
  onUpdate,
  onDelete,
  depth,
  nullStats,
  totalCount,
  patientIdColumn,
  readOnly,
  excludeAISuggestions,
}: FilterGroupComponentProps) {
  const gateColor = GATE_COLORS[group.logic]
  const rainbowColor = getRainbowColor(depth)

  // Get operators for a column - cohort operators (in_cohort/not_in_cohort) only for patient ID column and when cohorts exist
  const getOperatorsForColumn = (columnType: ColumnType, columnName: string) => {
    return OPERATORS.filter((op) => {
      // Check if column type is compatible
      if (!op.types.includes(columnType)) return false
      // Cohort operators only available for patient ID column AND when there are cohorts available
      if (op.value === "in_cohort" || op.value === "not_in_cohort") {
        return patientIdColumn && columnName === patientIdColumn && cohorts.length > 0
      }
      return true
    })
  }

  const addRule = () => {
    const firstColumn = Object.keys(columns)[0]
    const columnType = columns[firstColumn]
    const newRule: FilterRule = {
      id: Math.random().toString(36).substr(2, 9),
      field: firstColumn,
      operator: columnType === "number" ? "gte" : "equals",
      value: "",
    }
    onUpdate({ ...group, rules: [...group.rules, newRule] })
  }

  const addNestedGroup = () => {
    const newGroup: FilterGroup = {
      id: Math.random().toString(36).substr(2, 9),
      logic: group.logic === "AND" ? "OR" : "AND",
      rules: [],
    }
    onUpdate({ ...group, rules: [...group.rules, newGroup] })
  }

  const removeItem = (id: string) => {
    onUpdate({ ...group, rules: group.rules.filter((r) => r.id !== id) })
  }

  const updateRule = (id: string, updates: Partial<FilterRule>) => {
    const updatedRules = group.rules.map((rule) => {
      if (isFilterRule(rule) && rule.id === id) {
        return { ...rule, ...updates }
      }
      return rule
    })

    onUpdate({
      ...group,
      rules: updatedRules,
    })
  }

  const updateNestedGroup = (id: string, updatedGroup: FilterGroup) => {
    const updatedRules = group.rules.map((rule) => {
      if (!isFilterRule(rule) && rule.id === id) {
        return updatedGroup
      }
      return rule
    })

    onUpdate({
      ...group,
      rules: updatedRules,
    })
  }

  const toggleLogic = () => {
    onUpdate({ ...group, logic: group.logic === "AND" ? "OR" : "AND" })
  }

  // Filter rules for display (exclude AI suggestions if requested)
  // But keep all rules in the data structure for updates
  const displayRules = excludeAISuggestions
    ? group.rules.filter((rule) => {
        if (isFilterRule(rule)) return true
        const ruleGroup = rule as FilterGroup
        return !ruleGroup.name?.toLowerCase().includes("ai generated suggestions")
      })
    : group.rules

  return (
    <Box
      sx={{
        position: "relative",
        borderLeft: `4px solid ${rainbowColor.border}`,
        bgcolor: rainbowColor.bg,
        borderRadius: 1,
        pl: 2.5,
        pr: 2,
        ml: depth > 0 ? 2 : 0,
        mr: depth > 0 ? 2 : 0,
        py: 1.5,
        transition: "all 0.2s ease",
      }}
    >
      {/* Gate Header */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Chip
          icon={group.negate ? <DoNotDisturb fontSize="small" /> : undefined}
          label={group.negate ? "NOT" : group.logic}
          onClick={group.negate ? () => onUpdate({ ...group, negate: false }) : toggleLogic}
          sx={{
            bgcolor: group.negate ? "#ffebee" : `${rainbowColor.border}20`,
            color: group.negate ? "#c62828" : rainbowColor.border,
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            border: `2px solid ${group.negate ? "#ef5350" : rainbowColor.border}`,
            "&:hover": { bgcolor: group.negate ? "#ef5350" : rainbowColor.border, color: "#fff" },
          }}
        />
        {!group.negate && (
          <Chip
            icon={<DoNotDisturb fontSize="small" />}
            label="NOT"
            variant="outlined"
            onClick={() => onUpdate({ ...group, negate: true })}
            sx={{
              cursor: "pointer",
              borderColor: "#e0e0e0",
              color: "#9e9e9e",
              "&:hover": { bgcolor: "#ffebee", borderColor: "#ef5350", color: "#c62828" },
            }}
          />
        )}
        {group.negate && (
          <Chip
            label={group.logic}
            onClick={toggleLogic}
            sx={{
              bgcolor: `${rainbowColor.border}20`,
              color: rainbowColor.border,
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              border: `2px solid ${rainbowColor.border}`,
              "&:hover": { bgcolor: rainbowColor.border, color: "#fff" },
            }}
          />
        )}
        <TextField
          size="small"
          placeholder={depth === 0 ? "Main Filter Group" : "Group Name"}
          value={group.name || ""}
          onChange={(e) => onUpdate({ ...group, name: e.target.value })}
          variant="outlined"
          sx={{
            minWidth: 150,
            "& .MuiOutlinedInput-root": {
              bgcolor: "#fff",
              "& fieldset": { borderColor: rainbowColor.border },
            },
          }}
          InputProps={{
            sx: { fontSize: "0.813rem", py: 0.5 },
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {group.negate
            ? `Exclude: ${group.logic === "AND" ? "All must match" : "Any can match"}`
            : group.logic === "AND" ? "All must match" : "Any can match"}
        </Typography>
        <Chip
          label={`Level ${depth}`}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            fontWeight: 600,
            bgcolor: rainbowColor.border,
            color: "#fff",
            "& .MuiChip-label": { px: 1 },
          }}
        />
        {!readOnly && onDelete && (
          <IconButton size="small" color="error" onClick={onDelete}>
            <Delete fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Rules */}
      {displayRules.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: `2px dashed ${rainbowColor.border}`,
            borderRadius: 1.5,
            textAlign: "center",
            mb: 1.5,
            mr: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
            No conditions in this group
          </Typography>
          {!readOnly && (
            <Box display="flex" gap={1} justifyContent="center">
              <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />} onClick={addRule}>
                Add Condition
              </Button>
            </Box>
          )}
        </Paper>
      ) : (
        <Box>
          {displayRules.map((rule, index) => (
            <Box key={rule.id} mb={2}>
              {/* Logic connector between items */}
              {index > 0 && (
                <Box display="flex" alignItems="center" my={1} ml={2}>
                  <Box
                    sx={{
                      width: 36,
                      height: 20,
                      bgcolor: `${rainbowColor.border}20`,
                      border: `1px solid ${rainbowColor.border}`,
                      borderRadius: 0.75,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="caption" fontWeight={600} color={rainbowColor.border} fontSize="0.7rem">
                      {group.logic}
                    </Typography>
                  </Box>
                  <Divider sx={{ flex: 1, ml: 0.75, borderColor: rainbowColor.border }} />
                </Box>
              )}

              {isFilterRule(rule) ? (
                // Render a simple rule
                <RuleRow
                  rule={rule}
                  columns={columns}
                  cohorts={cohorts}
                  categoricalValues={categoricalValues}
                  getOperatorsForColumn={getOperatorsForColumn}
                  onUpdate={(updates) => updateRule(rule.id, updates)}
                  onDelete={() => removeItem(rule.id)}
                  nullStats={nullStats}
                  totalCount={totalCount}
                  patientIdColumn={patientIdColumn}
                  readOnly={readOnly}
                />
              ) : (
                // Render nested group recursively
                <FilterGroupComponent
                  group={rule as FilterGroup}
                  columns={columns}
                  cohorts={cohorts}
                  categoricalValues={categoricalValues}
                  onUpdate={(updatedGroup) => updateNestedGroup(rule.id, updatedGroup)}
                  onDelete={() => removeItem(rule.id)}
                  depth={depth + 1}
                  nullStats={nullStats}
                  totalCount={totalCount}
                  patientIdColumn={patientIdColumn}
                  readOnly={readOnly}
                  excludeAISuggestions={excludeAISuggestions}
                />
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Add Buttons */}
      {!readOnly && (
        <Box display="flex" gap={2} mt={2}>
          <Button size="small" variant="outlined" startIcon={<Add fontSize="small" />} onClick={addRule} sx={{ px: 2 }}>
            Add Condition
          </Button>
          {depth < 3 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add fontSize="small" />}
              onClick={addNestedGroup}
              sx={{
                px: 2,
                borderColor: getRainbowColor(depth + 1).border,
                color: getRainbowColor(depth + 1).border,
                "&:hover": {
                  borderColor: getRainbowColor(depth + 1).border,
                  bgcolor: getRainbowColor(depth + 1).bg,
                },
              }}
            >
              Add {group.logic === "AND" ? "OR" : "AND"} Group
            </Button>
          )}
        </Box>
      )}
    </Box>
  )
}

// Single Rule Row component
interface RuleRowProps {
  rule: FilterRule
  columns: Record<string, ColumnType>
  cohorts: Cohort[]
  categoricalValues: Record<string, string[]>
  getOperatorsForColumn: (type: ColumnType, columnName: string) => typeof OPERATORS
  onUpdate: (updates: Partial<FilterRule>) => void
  onDelete: () => void
  nullStats?: Record<string, number> // Null count per column
  totalCount?: number // Total row count for percentage calculation
  patientIdColumn?: string // The column that contains patient IDs
  readOnly?: boolean // When true, disable all editing controls
}

function RuleRow({
  rule,
  columns,
  cohorts,
  categoricalValues,
  getOperatorsForColumn,
  onUpdate,
  onDelete,
  nullStats,
  totalCount,
  patientIdColumn,
  readOnly,
}: RuleRowProps) {
  const columnType = columns[rule.field] || "string"
  const availableOperators = getOperatorsForColumn(columnType, rule.field)
  const isCategorical = columnType === "categorical"
  const isDateField = columnType === "date"
  const isCohortOperator = rule.operator === "in_cohort" || rule.operator === "not_in_cohort"
  const needsValue = !["is_empty", "is_not_empty"].includes(rule.operator)
  const needsSecondValue = rule.operator === "between"
  const needsBetweenDates = rule.operator === "between_dates"

  // Check if selected column has null values
  const columnNullCount = nullStats?.[rule.field] || 0
  const hasNullValues = columnNullCount > 0
  const nullPercentage = totalCount && totalCount > 0 ? ((columnNullCount / totalCount) * 100).toFixed(1) : "0"

  // Determine missing data status for this column
  const getMissingDataStatus = () => {
    if (rule.includeMissingData === true) return "include"
    if (rule.includeMissingData === false) return "exclude"
    return "global" // undefined = use global setting
  }
  const missingDataStatus = getMissingDataStatus()

  // Validation checks for highlighting empty fields
  const isFieldEmpty = !rule.field
  const isOperatorEmpty = !rule.operator
  const isValueEmpty = needsValue && (rule.value === "" || rule.value === null || rule.value === undefined)
  const isValue2Empty = (needsSecondValue || needsBetweenDates) && (rule.value2 === "" || rule.value2 === null || rule.value2 === undefined)
  const hasValidationError = isFieldEmpty || isOperatorEmpty || isValueEmpty || isValue2Empty

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: hasValidationError ? "2px solid #f44336" : hasNullValues ? "2px solid #ff9800" : "1px solid #ececf1",
        borderRadius: 1.5,
        bgcolor: hasValidationError ? "rgba(244, 67, 54, 0.04)" : hasNullValues ? "rgba(255, 152, 0, 0.04)" : "#fafbfc",
        display: "inline-flex",
        alignItems: "center",
        gap: 1.5,
        flexWrap: "wrap",
        position: "relative",
      }}
    >
      {/* Field */}
      <FormControl size="small" error={isFieldEmpty} sx={{ minWidth: 140, width: "auto" }}>
        <InputLabel error={isFieldEmpty}>Field</InputLabel>
        <Select
          value={rule.field}
          label="Field"
          autoWidth
          error={isFieldEmpty}
          onChange={(e) => {
            const newField = e.target.value
            const newType = columns[newField]
            const newOps = getOperatorsForColumn(newType, newField)
            const currentOpValid = newOps.some((op) => op.value === rule.operator)

            onUpdate({
              field: newField,
              operator: currentOpValid ? rule.operator : newOps[0].value,
              value: "",
              value2: undefined,
            })
          }}
        >
          {Object.keys(columns).map((col) => {
            const colNullCount = nullStats?.[col] || 0
            const colHasNulls = colNullCount > 0
            const colNullPct = totalCount && totalCount > 0 ? ((colNullCount / totalCount) * 100).toFixed(1) : "0"
            return (
              <MenuItem key={col} value={col}>
                <Box display="flex" alignItems="center" gap={0.75} width="100%">
                  <Chip
                    label={columns[col].charAt(0).toUpperCase()}
                    size="small"
                    sx={{ width: 18, height: 18, fontSize: "0.55rem", "& .MuiChip-label": { px: 0.4 } }}
                    color={columns[col] === "number" ? "primary" : columns[col] === "categorical" ? "secondary" : "default"}
                  />
                  <Typography variant="body2" fontSize="0.75rem" sx={{ flex: 1 }}>
                    {col}
                  </Typography>
                  {colHasNulls && (
                    <Chip
                      label={`${colNullPct}% missing`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.6rem",
                        bgcolor: "#fff3e0",
                        color: "#e65100",
                        border: "1px solid #ff9800",
                        "& .MuiChip-label": { px: 0.5 },
                      }}
                    />
                  )}
                </Box>
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>

      {/* Operator */}
      <FormControl size="small" error={isOperatorEmpty} sx={{ minWidth: 120, width: "auto" }}>
        <InputLabel error={isOperatorEmpty}>Operator</InputLabel>
        <Select
          value={rule.operator}
          label="Operator"
          autoWidth
          error={isOperatorEmpty}
          onChange={(e) => onUpdate({ operator: e.target.value as OperatorType, value2: undefined })}
        >
          {availableOperators.map((op) => (
            <MenuItem key={op.value} value={op.value}>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Typography component="span" sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.8rem" }}>
                  {op.symbol}
                </Typography>
                <Typography fontSize="0.75rem">{op.label}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Value */}
      {needsValue && (
        <>
          {isCohortOperator ? (
            <FormControl size="small" error={isValueEmpty} sx={{ minWidth: 140, width: "auto" }}>
              <InputLabel error={isValueEmpty}>Cohort</InputLabel>
              <Select
                value={rule.value}
                label="Cohort"
                autoWidth
                error={isValueEmpty}
                onChange={(e) => onUpdate({ value: e.target.value })}
              >
                {cohorts.map((cohort) => (
                  <MenuItem key={cohort.id} value={cohort.id}>
                    <Typography fontSize="0.75rem">{cohort.name} ({cohort.patientCount})</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : isCategorical ? (
            <Autocomplete
              size="small"
              options={categoricalValues[rule.field] || []}
              value={String(rule.value) || null}
              onChange={(_, newValue) => onUpdate({ value: newValue || "" })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Value"
                  error={isValueEmpty}
                  sx={{ minWidth: 100, width: `${Math.max(100, String(rule.value).length * 10 + 60)}px` }}
                />
              )}
              freeSolo
              sx={{ minWidth: 100, width: "auto" }}
            />
          ) : isDateField ? (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={parseDateValue(rule.value)}
                onChange={(date) => onUpdate({ value: formatDateForStorage(date) })}
                slotProps={{
                  textField: {
                    size: "small",
                    label: needsBetweenDates ? "Start Date" : "Date",
                    error: isValueEmpty,
                    sx: { minWidth: 140 },
                  },
                }}
              />
            </LocalizationProvider>
          ) : (
            <TextField
              size="small"
              type={columnType === "number" ? "number" : "text"}
              label={needsSecondValue ? "Min" : "Value"}
              value={rule.value}
              error={isValueEmpty}
              onChange={(e) => onUpdate({ value: e.target.value })}
              sx={{ minWidth: 80, width: `${Math.max(80, String(rule.value).length * 10 + 50)}px` }}
            />
          )}
        </>
      )}

      {/* Second Value (for between / between_dates) */}
      {(needsSecondValue || needsBetweenDates) && (
        <>
          <Typography color="text.secondary" fontSize="0.75rem">
            and
          </Typography>
          {needsBetweenDates ? (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={parseDateValue(rule.value2)}
                onChange={(date) => onUpdate({ value2: formatDateForStorage(date) })}
                slotProps={{
                  textField: {
                    size: "small",
                    label: "End Date",
                    error: isValue2Empty,
                    sx: { minWidth: 140 },
                  },
                }}
              />
            </LocalizationProvider>
          ) : (
            <TextField
              size="small"
              type="number"
              label="Max"
              value={rule.value2 || ""}
              error={isValue2Empty}
              onChange={(e) => onUpdate({ value2: e.target.value })}
              sx={{ minWidth: 80, width: `${Math.max(80, String(rule.value2 || "").length * 10 + 50)}px` }}
            />
          )}
        </>
      )}

      {/* Validation error indicator */}
      {hasValidationError && (
        <Tooltip title="Please fill all required fields">
          <Chip
            label="Incomplete"
            size="small"
            color="error"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 600,
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        </Tooltip>
      )}

      {/* Delete */}
      <IconButton color="error" onClick={onDelete} size="small" sx={{ ml: 0.5 }}>
        <Delete fontSize="small" />
      </IconButton>

      {/* Null values warning and missing data toggle */}
      {hasNullValues && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pl: 1,
            borderLeft: "1px solid #e0e0e0",
          }}
        >
          {/* Missing data warning badge */}
          <Tooltip title={`${columnNullCount} records (${nullPercentage}%) have missing values in "${rule.field}"`}>
            <Chip
              icon={<CleaningServices sx={{ fontSize: 12 }} />}
              label={`${nullPercentage}% missing`}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.65rem",
                bgcolor: "#fff3e0",
                color: "#e65100",
                border: "1px solid #ff9800",
                "& .MuiChip-label": { px: 0.5 },
                "& .MuiChip-icon": { color: "#e65100", ml: 0.5 },
              }}
            />
          </Tooltip>

          {/* Missing data toggle */}
          <Tooltip
            title={
              missingDataStatus === "include"
                ? "Include records with missing values for this column (overrides global)"
                : missingDataStatus === "exclude"
                ? "Exclude records with missing values for this column (overrides global)"
                : "Using global missing data setting"
            }
            placement="top"
            enterDelay={500}
            disableInteractive
          >
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={missingDataStatus}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "global") {
                    onUpdate({ includeMissingData: undefined })
                  } else if (value === "include") {
                    onUpdate({ includeMissingData: true })
                  } else {
                    onUpdate({ includeMissingData: false })
                  }
                }}
                sx={{
                  height: 26,
                  fontSize: "0.7rem",
                  bgcolor:
                    missingDataStatus === "include"
                      ? "#e8f5e9"
                      : missingDataStatus === "exclude"
                      ? "#ffebee"
                      : "#f5f5f5",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      missingDataStatus === "include"
                        ? "#4caf50"
                        : missingDataStatus === "exclude"
                        ? "#f44336"
                        : "#bdbdbd",
                  },
                  "& .MuiSelect-select": { py: 0.25, px: 1 },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { mt: 0.5 },
                  },
                }}
              >
                <MenuItem value="global" sx={{ fontSize: "0.7rem" }}>
                  Use Global
                </MenuItem>
                <MenuItem value="include" sx={{ fontSize: "0.7rem" }}>
                  Include Missing
                </MenuItem>
                <MenuItem value="exclude" sx={{ fontSize: "0.7rem" }}>
                  Exclude Missing
                </MenuItem>
              </Select>
            </FormControl>
          </Tooltip>
        </Box>
      )}
    </Paper>
  )
}

// Read Mode View - displays filter as readable English statements
export interface ReadModeViewProps {
  filter: FilterGroup
  cohorts: Cohort[]
  excludeDirtyData: boolean
  onEditClick: () => void
  nullStats?: Record<string, number>
  totalCount?: number
  // Props for AI suggestion actions in read mode
  onAcceptSuggestion?: (rule: FilterRule, targetGate: string, isExclusion: boolean) => void
  onRejectSuggestion?: (ruleId: string) => void
  // Props for filtered patient preview
  filteredData?: PatientData[]
  columns?: Record<string, ColumnType>
  filteredCount?: number
}

export function ReadModeView({ filter, cohorts, excludeDirtyData, onEditClick, nullStats, totalCount, onAcceptSuggestion, onRejectSuggestion, filteredData, columns, filteredCount }: ReadModeViewProps) {
  // State for collapsible sections
  const [aiSuggestionsExpanded, setAiSuggestionsExpanded] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState(10)

  // Find AI suggestions gate
  const aiSuggestionsGate = filter.rules.find(
    (rule) =>
      !isFilterRule(rule) &&
      (rule as FilterGroup).name?.toLowerCase().includes("ai generated suggestions")
  ) as FilterGroup | undefined

  const suggestionRules = aiSuggestionsGate?.rules.filter(isFilterRule) || []
  const hasSuggestions = suggestionRules.length > 0

  // Get column names for preview table
  const columnNames = columns ? Object.keys(columns) : []
  const hasFilteredData = filteredData && filteredData.length > 0

  // Filter out AI suggestions gate from main filter display
  const filterWithoutAISuggestions: FilterGroup = {
    ...filter,
    rules: filter.rules.filter((rule) => {
      if (isFilterRule(rule)) return true
      return !(rule as FilterGroup).name?.toLowerCase().includes("ai generated suggestions")
    }),
  }

  // Helper to determine target gate for inclusion
  const determineInclusionGate = (rule: FilterRule): string => {
    const fieldLower = rule.field.toLowerCase()
    if (fieldLower.includes("age") || fieldLower.includes("gender") || fieldLower.includes("sex")) {
      return "Gate 1 - Demographics"
    }
    if (fieldLower.includes("score") || fieldLower.includes("severity") || fieldLower.includes("clinical")) {
      return "Gate 2 - Clinical Criteria"
    }
    if (fieldLower.includes("treatment") || fieldLower.includes("medication") || fieldLower.includes("therapy")) {
      return "Gate 3 - Treatment History"
    }
    return "Gate 4 - Study Specific"
  }
  // Convert rule to readable English
  const ruleToReadable = (rule: FilterRule): string => {
    const fieldName = rule.field.replace(/_/g, " ")

    switch (rule.operator) {
      case "equals":
        return `${fieldName} is "${rule.value}"`
      case "not_equals":
        return `${fieldName} is not "${rule.value}"`
      case "contains":
        return `${fieldName} contains "${rule.value}"`
      case "gt":
        return `${fieldName} is greater than ${rule.value}`
      case "gte":
        return `${fieldName} is at least ${rule.value}`
      case "lt":
        return `${fieldName} is less than ${rule.value}`
      case "lte":
        return `${fieldName} is at most ${rule.value}`
      case "between":
        return `${fieldName} is between ${rule.value} and ${rule.value2}`
      case "is_empty":
        return `${fieldName} is empty`
      case "is_not_empty":
        return `${fieldName} has a value`
      case "in_cohort": {
        const cohort = cohorts.find((c) => c.id === rule.value)
        return `patient belongs to cohort "${cohort?.name || rule.value}"`
      }
      case "not_in_cohort": {
        const cohort = cohorts.find((c) => c.id === rule.value)
        return `patient not belongs to cohort "${cohort?.name || rule.value}"`
      }
      default:
        return `${fieldName} ${rule.operator} ${rule.value}`
    }
  }

  // Render a group recursively
  const renderGroup = (group: FilterGroup, depth: number = 0): React.ReactNode => {
    const hasRules = group.rules.length > 0
    const rainbowColor = getRainbowColor(depth)
    const logicWord = group.logic === "AND" ? "all" : "any"
    const negateText = group.negate ? "Exclude patients where " : ""

    if (!hasRules) {
      return (
        <Box sx={{ pl: depth * 3, py: 1 }}>
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            No conditions defined
          </Typography>
        </Box>
      )
    }

    return (
      <Box
        sx={{
          border: `1px solid ${rainbowColor.border}`,
          borderLeft: `4px solid ${rainbowColor.border}`,
          borderRadius: 1.5,
          bgcolor: rainbowColor.bg,
          pl: 2,
          pr: 1.5,
          py: 1.5,
          ml: depth > 0 ? 1 : 0,
          mt: depth > 0 ? 1 : 0,
        }}
      >
        {/* Group header */}
        {depth > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: rainbowColor.border,
              fontWeight: 600,
              mb: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {group.negate && (
              <Chip
                label="NOT"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: "#ffebee",
                  color: "#c62828",
                  fontWeight: 600,
                }}
              />
            )}
            {group.name && <span>{group.name}:</span>}
            <span style={{ fontWeight: 400, color: "#666" }}>
              ({logicWord} of the following)
            </span>
          </Typography>
        )}

        {/* Rules */}
        {group.rules.map((rule, index) => (
          <Box key={rule.id}>
            {/* Logic connector */}
            {index > 0 && (
              <Box sx={{ py: 0.75, pl: 1 }}>
                <Chip
                  label={group.logic}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    bgcolor: `${rainbowColor.border}15`,
                    color: rainbowColor.border,
                    border: `1px solid ${rainbowColor.border}40`,
                  }}
                />
              </Box>
            )}

            {isFilterRule(rule) ? (
              // Single condition
              (() => {
                const columnNullCount = nullStats?.[rule.field] || 0
                const hasNulls = columnNullCount > 0
                const nullPct = totalCount && totalCount > 0 ? ((columnNullCount / totalCount) * 100).toFixed(1) : "0"
                const hasMissingDataOverride = rule.includeMissingData !== undefined

                // Validation checks for Read mode
                const needsValue = !["is_empty", "is_not_empty"].includes(rule.operator)
                const needsSecondValue = rule.operator === "between"
                const isIncomplete = !rule.field || !rule.operator ||
                  (needsValue && (rule.value === "" || rule.value === null || rule.value === undefined)) ||
                  (needsSecondValue && (rule.value2 === "" || rule.value2 === null || rule.value2 === undefined))

                return (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.75,
                      pl: 1,
                      flexWrap: "wrap",
                      bgcolor: isIncomplete ? "rgba(244, 67, 54, 0.08)" : "transparent",
                      borderRadius: 1,
                      border: isIncomplete ? "1px solid #f44336" : "none",
                      mx: isIncomplete ? -0.5 : 0,
                      px: isIncomplete ? 0.5 : 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: isIncomplete ? "#f44336" : hasNulls ? "#ff9800" : rainbowColor.border,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: isIncomplete ? "#c62828" : "#333" }}>
                      {isIncomplete ? "Incomplete filter rule" : ruleToReadable(rule)}
                    </Typography>
                    {/* Incomplete indicator */}
                    {isIncomplete && (
                      <Chip
                        label="Fill required fields"
                        size="small"
                        color="error"
                        sx={{
                          height: 18,
                          fontSize: "0.6rem",
                          fontWeight: 600,
                          "& .MuiChip-label": { px: 0.5 },
                        }}
                      />
                    )}
                    {/* Missing values indicator */}
                    {!isIncomplete && hasNulls && (
                      <Chip
                        label={`${nullPct}% missing`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.6rem",
                          bgcolor: "#fff3e0",
                          color: "#e65100",
                          border: "1px solid #ff9800",
                          "& .MuiChip-label": { px: 0.5 },
                        }}
                      />
                    )}
                    {/* Per-column missing data override indicator */}
                    {!isIncomplete && hasMissingDataOverride && (
                      <Chip
                        label={rule.includeMissingData ? "Include missing" : "Exclude missing"}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.6rem",
                          bgcolor: rule.includeMissingData ? "#e8f5e9" : "#ffebee",
                          color: rule.includeMissingData ? "#2e7d32" : "#c62828",
                          border: `1px solid ${rule.includeMissingData ? "#4caf50" : "#f44336"}`,
                          "& .MuiChip-label": { px: 0.5 },
                        }}
                      />
                    )}
                  </Box>
                )
              })()
            ) : (
              // Nested group
              renderGroup(rule as FilterGroup, depth + 1)
            )}
          </Box>
        ))}
      </Box>
    )
  }

  const hasFilters = filterWithoutAISuggestions.rules.length > 0

  return (
    <Box>
      {/* Main filter summary */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
          bgcolor: "#fafbfc",
        }}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FilterList sx={{ color: "primary.main", fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {filter.name || "Filter Criteria"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hasFilters
                  ? `${filterWithoutAISuggestions.rules.length} condition${filterWithoutAISuggestions.rules.length > 1 ? "s" : ""} • ${filter.logic === "AND" ? "All must match" : "Any can match"}`
                  : "No conditions defined"}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            onClick={onEditClick}
            sx={{ px: 2 }}
          >
            Edit Filter
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Filter conditions */}
        {hasFilters ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1.5} fontWeight={500}>
              Include patients where {filter.logic === "AND" ? "all" : "any"} of the following are true:
            </Typography>
            {renderGroup(filterWithoutAISuggestions)}
          </Box>
        ) : (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No filter conditions have been set yet.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Edit sx={{ fontSize: 16 }} />}
              onClick={onEditClick}
            >
              Add Conditions
            </Button>
          </Box>
        )}

        {/* Dirty data info */}
        {excludeDirtyData && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box display="flex" alignItems="center" gap={1.5}>
              <CleaningServices sx={{ fontSize: 18, color: "#ff9800" }} />
              <Typography variant="body2" color="text.secondary">
                Records with missing values are <strong>excluded</strong>
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* AI Suggestions Card - Separate collapsible card */}
      {hasSuggestions && onAcceptSuggestion && onRejectSuggestion && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 2,
            border: "2px solid #9c27b0",
            borderRadius: 2,
            bgcolor: "#fafbfc",
            background: "linear-gradient(135deg, rgba(156, 39, 176, 0.03) 0%, rgba(123, 31, 162, 0.05) 100%)",
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
            onClick={() => setAiSuggestionsExpanded(!aiSuggestionsExpanded)}
            sx={{ cursor: "pointer", userSelect: "none" }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <IconButton
                size="small"
                sx={{ p: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setAiSuggestionsExpanded(!aiSuggestionsExpanded);
                }}
              >
                {aiSuggestionsExpanded ? <ExpandLess sx={{ fontSize: 20 }} /> : <ExpandMore sx={{ fontSize: 20 }} />}
              </IconButton>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AutoAwesome sx={{ color: "white", fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="#7b1fa2">
                  AI Generated Suggestions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Review and apply AI-suggested filter criteria
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${suggestionRules.length} suggestion${suggestionRules.length > 1 ? 's' : ''}`}
              sx={{
                height: 28,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
              }}
            />
          </Box>

          <Collapse in={aiSuggestionsExpanded}>
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" flexDirection="column" gap={1.5}>
                {suggestionRules.map((rule) => (
                  <Paper
                    key={rule.id}
                    elevation={0}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      bgcolor: "white",
                      borderRadius: 1.5,
                      border: "1px solid rgba(156, 39, 176, 0.2)",
                      flexWrap: "wrap",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        boxShadow: "0 2px 8px rgba(156, 39, 176, 0.15)",
                        borderColor: "#9c27b0",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: "#333", flex: 1, fontWeight: 500 }}>
                      {ruleToReadable(rule)}
                    </Typography>
                    {/* Action buttons */}
                    <Box display="flex" gap={0.5} flexShrink={0}>
                      <Tooltip title="Add as inclusion criteria">
                        <IconButton
                          size="small"
                          onClick={() => onAcceptSuggestion(rule, determineInclusionGate(rule), false)}
                          sx={{
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            minHeight: 28,
                            p: 0,
                            borderRadius: "50%",
                            bgcolor: "#e8f5e9",
                            color: "#2e7d32",
                            border: "1px solid #c8e6c9",
                            "&:hover": { bgcolor: "#c8e6c9", borderColor: "#4caf50" },
                          }}
                        >
                          <Add sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Add as exclusion criteria">
                        <IconButton
                          size="small"
                          onClick={() => onAcceptSuggestion(rule, "Safety Exclusions", true)}
                          sx={{
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            minHeight: 28,
                            p: 0,
                            borderRadius: "50%",
                            bgcolor: "#fff3e0",
                            color: "#e65100",
                            border: "1px solid #ffe0b2",
                            "&:hover": { bgcolor: "#ffe0b2", borderColor: "#ff9800" },
                          }}
                        >
                          <DoNotDisturb sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject suggestion">
                        <IconButton
                          size="small"
                          onClick={() => onRejectSuggestion(rule.id)}
                          sx={{
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            minHeight: 28,
                            p: 0,
                            borderRadius: "50%",
                            bgcolor: "#ffebee",
                            color: "#c62828",
                            border: "1px solid #ffcdd2",
                            "&:hover": { bgcolor: "#ffcdd2", borderColor: "#f44336" },
                          }}
                        >
                          <Clear sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Filtered Patient Preview - collapsible table */}
      {hasFilteredData && columns && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            bgcolor: "#fafbfc",
            mt: 2,
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
            onClick={() => setPreviewExpanded(!previewExpanded)}
            sx={{ cursor: "pointer", userSelect: "none" }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <IconButton size="small" sx={{ p: 0 }}>
                {previewExpanded ? <ExpandLess sx={{ fontSize: 20 }} /> : <ExpandMore sx={{ fontSize: 20 }} />}
              </IconButton>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: "success.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ViewList sx={{ color: "success.main", fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Filtered Patient Preview
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {filteredCount || filteredData.length} patient{(filteredCount || filteredData.length) === 1 ? '' : 's'} match the filter criteria
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${filteredCount || filteredData.length} records`}
              color="success"
              variant="outlined"
              size="small"
              sx={{ px: 0.75, height: 28 }}
            />
          </Box>

          <Collapse in={previewExpanded}>
            <Box>
              <Divider sx={{ mb: 2 }} />

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 500,
                  bgcolor: "background.paper",
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {columnNames.slice(0, 10).map((col) => (
                        <TableCell
                          key={col}
                          sx={{
                            fontWeight: 600,
                            bgcolor: "grey.50",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Chip
                              label={columns[col].charAt(0).toUpperCase()}
                              size="small"
                              sx={{
                                width: 18,
                                height: 18,
                                fontSize: "0.55rem",
                                "& .MuiChip-label": { px: 0.4 },
                              }}
                              color={
                                columns[col] === "number"
                                  ? "primary"
                                  : columns[col] === "categorical"
                                  ? "secondary"
                                  : "default"
                              }
                            />
                            <Typography variant="caption" fontWeight={600}>
                              {col}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                      {columnNames.length > 10 && (
                        <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>
                          <Typography variant="caption" color="text.secondary">
                            +{columnNames.length - 10} more columns
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData
                      .slice(
                        previewPage * previewRowsPerPage,
                        previewPage * previewRowsPerPage + previewRowsPerPage
                      )
                      .map((row, idx) => (
                        <TableRow
                          key={idx}
                          sx={{
                            "&:hover": { bgcolor: "action.hover" },
                            "&:nth-of-type(odd)": { bgcolor: "grey.50" },
                          }}
                        >
                          {columnNames.slice(0, 10).map((col) => (
                            <TableCell
                              key={col}
                              sx={{
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Typography variant="body2" fontSize="0.75rem">
                                {row[col] !== null && row[col] !== undefined && row[col] !== ""
                                  ? String(row[col])
                                  : <span style={{ color: "#9e9e9e", fontStyle: "italic" }}>—</span>}
                              </Typography>
                            </TableCell>
                          ))}
                          {columnNames.length > 10 && <TableCell />}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredData.length}
                page={previewPage}
                onPageChange={(_, newPage) => setPreviewPage(newPage)}
                rowsPerPage={previewRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setPreviewRowsPerPage(parseInt(e.target.value, 10))
                  setPreviewPage(0)
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{ borderTop: "1px solid #e0e0e0" }}
              />
            </Box>
          </Collapse>
        </Paper>
      )}
    </Box>
  )
}

// Skeleton component for AI loading state - matches ReadModeView layout
function FilterBuilderSkeleton() {
  return (
    <Box sx={{ py: 2, px: "5%" }}>
      {/* AI Generating Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: "1px solid",
          borderColor: "primary.light",
          borderRadius: 2,
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
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
            <AutoAwesome sx={{ fontSize: 24, color: "white" }} />
          </Box>
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight={600} color="primary.dark">
              AI is generating filters...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analyzing your inclusion and exclusion criteria to create optimized screening filters
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(102, 126, 234, 0.15)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </Paper>

      {/* Filter summary skeleton - matches ReadModeView layout */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
          bgcolor: "#fafbfc",
        }}
      >
        {/* Header skeleton */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1.5 }} animation="wave" />
            <Box>
              <Skeleton variant="text" width={120} height={24} animation="wave" />
              <Skeleton variant="text" width={180} height={16} animation="wave" />
            </Box>
          </Box>
          <Skeleton variant="rounded" width={100} height={32} animation="wave" />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* "Include patients where..." text skeleton */}
        <Skeleton variant="text" width="45%" height={20} sx={{ mb: 1.5 }} animation="wave" />

        {/* Filter conditions group skeleton - matches nested box style */}
        <Box
          sx={{
            border: "1px solid #bbdefb",
            borderLeft: "4px solid #bbdefb",
            borderRadius: 1.5,
            bgcolor: "rgba(227, 242, 253, 0.4)",
            pl: 2,
            pr: 1.5,
            py: 1.5,
          }}
        >
          {/* First condition skeleton */}
          <Box display="flex" alignItems="center" gap={1} py={0.75} pl={1}>
            <Skeleton variant="circular" width={6} height={6} animation="wave" />
            <Skeleton variant="text" width="55%" height={20} animation="wave" />
          </Box>

          {/* AND chip connector */}
          <Box sx={{ py: 0.75, pl: 1 }}>
            <Skeleton variant="rounded" width={40} height={20} sx={{ borderRadius: 2 }} animation="wave" />
          </Box>

          {/* Second condition skeleton */}
          <Box display="flex" alignItems="center" gap={1} py={0.75} pl={1}>
            <Skeleton variant="circular" width={6} height={6} animation="wave" />
            <Skeleton variant="text" width="48%" height={20} animation="wave" />
          </Box>

          {/* AND chip connector */}
          <Box sx={{ py: 0.75, pl: 1 }}>
            <Skeleton variant="rounded" width={40} height={20} sx={{ borderRadius: 2 }} animation="wave" />
          </Box>

          {/* Third condition skeleton */}
          <Box display="flex" alignItems="center" gap={1} py={0.75} pl={1}>
            <Skeleton variant="circular" width={6} height={6} animation="wave" />
            <Skeleton variant="text" width="60%" height={20} animation="wave" />
          </Box>
        </Box>

        {/* Dirty data info skeleton */}
        <Divider sx={{ my: 2 }} />
        <Box display="flex" alignItems="center" gap={1.5}>
          <Skeleton variant="circular" width={18} height={18} animation="wave" />
          <Skeleton variant="text" width="40%" height={20} animation="wave" />
        </Box>
      </Paper>

      {/* Data preview skeleton */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1.5 }} animation="wave" />
          <Skeleton variant="text" width="30%" height={28} animation="wave" />
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" width={100} height={32} animation="wave" />
          ))}
        </Box>
        <Skeleton variant="rounded" width="100%" height={200} animation="wave" />
      </Paper>
    </Box>
  )
}

// Main component
export function FullScreenFilterBuilder({
  columns,
  filter,
  cohorts,
  data,
  filteredData,
  onFilterChange,
  onApplyFilter,
  filteredCount,
  totalCount,
  isGeneratingAI,
  onGenerateAI,
  inclusionCriteria,
  exclusionCriteria,
  excludeDirtyData = true,
  onExcludeDirtyDataChange,
  onInclusionCriteriaChange,
  onExclusionCriteriaChange,
  nullStats: propNullStats,
  columnMappings,
  patientIdColumn,
  studyId,
  readOnly,
  isApplyEnabled,
  onApplyComplete,
  onEditMode,
  criteriaFormulas,
  onCriteriaFormulasChange,
  isProcessingCriteria,
  columnMetadata,
  categoricalValues,
}: FullScreenFilterBuilderProps) {
  const { data: session } = useSession()
  const enterpriseId = session?.user?.orgId || ""
  const userId = session?.user?.sub || ""
  const userName = session?.user?.firstName
    ? `${session.user.firstName} ${session.user.lastName || ""}`.trim()
    : session?.user?.email || ""

  const [viewMode, setViewMode] = useState<"default" | "read" | "edit">("default")
  const [showSavedFilters, setShowSavedFilters] = useState(false)
  // Store mapping info for potential future display (e.g., showing confidence badges)
  const [_lastMappingInfo, setLastMappingInfo] = useState<FilterMappingResponse | null>(null)

  // State for save filter dialog
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [filterDescription, setFilterDescription] = useState("")
  const [isSavingFilter, setIsSavingFilter] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: "success" | "error"
  }>({ open: false, message: "", severity: "success" })

  const hasCriteria = !!(inclusionCriteria?.trim() || exclusionCriteria?.trim())

  // Validation helper to check if a filter is complete (no empty fields/values/operators)
  const isFilterComplete = (group: FilterGroup): boolean => {
    // Empty filter is considered complete (no rules = no validation needed)
    if (group.rules.length === 0) return true

    return group.rules.every((rule) => {
      if (!isFilterRule(rule)) {
        // Nested group - recursively check
        return isFilterComplete(rule as FilterGroup)
      }

      const r = rule as FilterRule

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
    })
  }

  const filterValid = isFilterComplete(filter)

  // Handle saved filter selection
  const handleSavedFilterSelected = (selectedFilter: FilterGroup, mappingInfo?: FilterMappingResponse) => {
    onFilterChange(selectedFilter)
    if (mappingInfo) {
      setLastMappingInfo(mappingInfo)
    }
    setShowSavedFilters(false)
    // Auto-apply after loading a saved filter
    setTimeout(() => onApplyFilter(), 100)
  }

  // Handle save filter
  const handleSaveFilter = async () => {
    if (!filterName.trim() || !enterpriseId || !userId) {
      setSnackbar({
        open: true,
        message: "Filter name is required",
        severity: "error",
      })
      return
    }

    setIsSavingFilter(true)
    try {
      await cohortService.createFilter({
        name: filterName.trim(),
        description: filterDescription.trim() || undefined,
        filter: filter,
        is_template: false,
        enterprise_id: enterpriseId,
        user_id: userId,
        user_name: userName || undefined,
      })

      setSnackbar({
        open: true,
        message: `Filter "${filterName}" saved successfully`,
        severity: "success",
      })
      setSaveFilterDialogOpen(false)
      setFilterName("")
      setFilterDescription("")
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to save filter: ${err instanceof Error ? err.message : "Unknown error"}`,
        severity: "error",
      })
    } finally {
      setIsSavingFilter(false)
    }
  }

  // Get unique values for categorical columns - use prop if provided, otherwise compute from data
  const computedCategoricalValues = useMemo(() => {
    if (categoricalValues) return categoricalValues
    const values: Record<string, string[]> = {}
    Object.entries(columns).forEach(([col, type]) => {
      if (type === "categorical") {
        const uniqueValues = new Set(data.map((row) => String(row[col] ?? "")))
        values[col] = Array.from(uniqueValues).filter((v) => v !== "").sort()
      }
    })
    return values
  }, [columns, data, categoricalValues])

  // Compute null stats if not provided
  // Use columnMappings to resolve actual column names in the data
  const nullStats = useMemo(() => {
    if (propNullStats) return propNullStats
    const stats: Record<string, number> = {}
    Object.keys(columns).forEach((col) => {
      // Use column mapping as pointer to resolve actual column name in the data
      const actualCol = columnMappings?.[col] || col
      const nullCount = data.filter((row) => {
        const value = row[actualCol]
        return value === null || value === undefined || value === "" || (typeof value === "string" && value.trim() === "")
      }).length
      stats[col] = nullCount
    })
    return stats
  }, [columns, data, propNullStats, columnMappings])

  const clearFilters = () => {
    onFilterChange({ ...filter, rules: [] })
  }

  // Convert FilterRule to natural language text
  const ruleToNaturalLanguage = (rule: FilterRule): string => {
    const fieldName = rule.field.replace(/_/g, " ")

    switch (rule.operator) {
      case "equals":
        return `${fieldName} equals "${rule.value}"`
      case "not_equals":
        return `${fieldName} does not equal "${rule.value}"`
      case "contains":
        return `${fieldName} contains "${rule.value}"`
      case "gt":
        return `${fieldName} greater than ${rule.value}`
      case "gte":
        return `${fieldName} at least ${rule.value}`
      case "lt":
        return `${fieldName} less than ${rule.value}`
      case "lte":
        return `${fieldName} at most ${rule.value}`
      case "between":
        return `${fieldName} between ${rule.value} and ${rule.value2}`
      case "is_empty":
        return `${fieldName} is empty`
      case "is_not_empty":
        return `${fieldName} has a value`
      case "in_cohort":
        return `patient belongs to cohort "${rule.value}"`
      case "not_in_cohort":
        return `patient not belongs to cohort "${rule.value}"`
      default:
        return `${fieldName} ${rule.operator} ${rule.value}`
    }
  }

  // Handle accepting an AI suggestion
  const handleAcceptSuggestion = (rule: FilterRule, targetGateName: string, isExclusion: boolean) => {
    console.log("=== handleAcceptSuggestion START ===")
    console.log("Accepting rule:", rule)
    console.log("Rule ID:", rule.id, "Type:", typeof rule.id)
    console.log("Target gate:", targetGateName)
    console.log("Current filter:", JSON.parse(JSON.stringify(filter)))

    // Check if target gate exists
    const targetGateExists = filter.rules.some(
      (r) => !isFilterRule(r) && (r as FilterGroup).name === targetGateName
    )

    // Build new filter with immutable updates
    let updatedRules = filter.rules.map((r) => {
      if (isFilterRule(r)) return r
      const group = r as FilterGroup

      // Update AI suggestions gate - remove accepted rule
      if (group.name?.toLowerCase().includes("ai generated suggestions")) {
        console.log("AI gate BEFORE:", group.rules.length, "rules")
        console.log("All rule IDs:", group.rules.map(r => isFilterRule(r) ? `${(r as FilterRule).id} (${typeof (r as FilterRule).id})` : 'GROUP'))
        console.log("Removing rule ID:", rule.id, "Type:", typeof rule.id)

        // Track if we've already removed one rule to prevent removing multiple
        let removedCount = 0
        const filteredRules = group.rules.filter((suggestionRule) => {
          if (isFilterRule(suggestionRule)) {
            const ruleObj = suggestionRule as FilterRule
            const idsMatch = ruleObj.id === rule.id
            const shouldRemove = idsMatch && removedCount === 0
            if (shouldRemove) {
              removedCount++
            }
            const shouldKeep = !shouldRemove
            console.log(`  Rule ${ruleObj.id} (${typeof ruleObj.id}) vs ${rule.id} (${typeof rule.id}): match=${idsMatch}, shouldKeep=${shouldKeep}`)
            return shouldKeep
          }
          return true // Keep groups
        })

        console.log(`Total removed: ${removedCount}`);

        console.log("AI gate AFTER:", filteredRules.length, "rules")

        if (filteredRules.length === 0 && group.rules.length > 1) {
          console.error("🔴 ERROR: All suggestions were removed! This should not happen!")
          console.error("Original rules count:", group.rules.length)
          console.error("Rule to remove ID:", rule.id)
          console.error("Rule to remove:", JSON.stringify(rule))
          console.error("All rules:", group.rules.map(r => isFilterRule(r) ? JSON.stringify(r) : 'GROUP'))
          // Emergency fix: if we accidentally removed all rules, keep all except the first one
          // This prevents the UI from breaking completely
          return {
            ...group,
            rules: group.rules.slice(1),
          }
        }

        return {
          ...group,
          rules: filteredRules,
        }
      }

      // Update target gate - add new rule
      if (group.name === targetGateName) {
        return {
          ...group,
          rules: [...group.rules, rule],
        }
      }

      return r
    })

    // If target gate doesn't exist, create it
    if (!targetGateExists) {
      const newGate: FilterGroup = {
        id: `gate-${Date.now()}`,
        name: targetGateName,
        logic: "AND",
        negate: false,
        rules: [rule],
      }

      // Insert before AI suggestions gate
      const aiGateIndex = updatedRules.findIndex(
        (r) => !isFilterRule(r) && (r as FilterGroup).name?.toLowerCase().includes("ai generated suggestions")
      )

      if (aiGateIndex !== -1) {
        updatedRules = [
          ...updatedRules.slice(0, aiGateIndex),
          newGate,
          ...updatedRules.slice(aiGateIndex),
        ]
      } else {
        updatedRules = [...updatedRules, newGate]
      }
    }

    // Create new filter object
    const updatedFilter: FilterGroup = {
      ...filter,
      rules: updatedRules,
    }

    console.log("Updated filter:", JSON.parse(JSON.stringify(updatedFilter)))
    console.log("=== handleAcceptSuggestion END ===")

    // Trigger filter update with new object
    onFilterChange(updatedFilter)

    // Update text criteria (append to inclusion or exclusion)
    const naturalLanguageText = ruleToNaturalLanguage(rule)

    if (isExclusion) {
      // Add to exclusion criteria
      if (onExclusionCriteriaChange) {
        const currentExclusion = exclusionCriteria?.trim() || ""
        const updatedExclusion = currentExclusion
          ? `${currentExclusion}\n${naturalLanguageText}`
          : naturalLanguageText
        onExclusionCriteriaChange(updatedExclusion)
      }
    } else {
      // Add to inclusion criteria
      if (onInclusionCriteriaChange) {
        const currentInclusion = inclusionCriteria?.trim() || ""
        const updatedInclusion = currentInclusion
          ? `${currentInclusion}\n${naturalLanguageText}`
          : naturalLanguageText
        onInclusionCriteriaChange(updatedInclusion)
      }
    }
  }

  // Handle rejecting an AI suggestion
  const handleRejectSuggestion = (ruleId: string) => {
    // Create new filter with immutable updates
    const updatedFilter: FilterGroup = {
      ...filter,
      rules: filter.rules.map((r) => {
        if (isFilterRule(r)) return r
        const group = r as FilterGroup

        // Update AI suggestions gate - remove rejected rule
        if (group.name?.toLowerCase().includes("ai generated suggestions")) {
          return {
            ...group,
            rules: group.rules.filter((suggestionRule) =>
              isFilterRule(suggestionRule) ? suggestionRule.id !== ruleId : true
            ),
          }
        }

        return r
      }),
    }

    // Trigger update with new object
    onFilterChange(updatedFilter)
  }

  return (
    <Box sx={{ minHeight: 500 }}>
      {/* Header */}
      <Box
        px={2}
        py={1.5}
        borderBottom="1px solid #ececf1"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1.5}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: "primary.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FilterList sx={{ color: "primary.main", fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Build Screening Filters
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              Create criteria to filter your patient data
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {/* AI Generate Button */}
          {onGenerateAI && (
            <Tooltip
              title="Uses AI to automatically create filter conditions based on your inclusion and exclusion criteria defined in Step 2. The AI analyzes your criteria text and maps it to the available data columns."
              arrow
              placement="bottom"
            >
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isGeneratingAI ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome sx={{ fontSize: 16 }} />}
                  endIcon={!isGeneratingAI && <InfoOutlined sx={{ fontSize: 14, opacity: 0.7 }} />}
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
                    px: 1.5,
                    fontSize: "0.8rem",
                  }}
                >
                  {isGeneratingAI ? "Generating..." : "AI Generate"}
                </Button>
              </span>
            </Tooltip>
          )}

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" }, mx: 0.25 }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<BookmarkBorder sx={{ fontSize: 16 }} />}
            onClick={() => setShowSavedFilters(!showSavedFilters)}
            color={showSavedFilters ? "primary" : "inherit"}
            sx={{ px: 1.5, fontSize: "0.8rem" }}
          >
            {showSavedFilters ? "Hide Saved" : "Load Saved"}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<Save sx={{ fontSize: 16 }} />}
            onClick={() => setSaveFilterDialogOpen(true)}
            disabled={filter.rules.length === 0 || showSavedFilters || isGeneratingAI}
            sx={{ px: 1.5, fontSize: "0.8rem" }}
          >
            Save Filter
          </Button>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" }, mx: 0.25 }} />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, val) => {
              if (val) {
                setViewMode(val)
                // Notify parent when user switches to edit mode
                if (val === "edit") {
                  onEditMode?.()
                }
              }
            }}
            size="small"
            disabled={showSavedFilters || isGeneratingAI}
          >
            <ToggleButton value="default" sx={{ px: 1.5, py: 0.25, fontSize: "0.8rem" }}>
              <AutoAwesome sx={{ mr: 0.5, fontSize: 16 }} /> Default
            </ToggleButton>
            <ToggleButton value="read" sx={{ px: 1.5, py: 0.25, fontSize: "0.8rem" }}>
              <MenuBook sx={{ mr: 0.5, fontSize: 16 }} /> Read
            </ToggleButton>
            <ToggleButton value="edit" sx={{ px: 1.5, py: 0.25, fontSize: "0.8rem" }}>
              <Edit sx={{ mr: 0.5, fontSize: 16 }} /> Edit
            </ToggleButton>
          </ToggleButtonGroup>

          <Chip
            label={`${filteredCount} / ${totalCount}`}
            color={filteredCount === totalCount ? "default" : "primary"}
            variant="outlined"
            size="small"
            sx={{ px: 0.75, height: 28 }}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
            onClick={() => {
              if (!filterValid) {
                setSnackbar({
                  open: true,
                  message: "Please fill all filter fields properly before applying",
                  severity: "error",
                })
                return
              }
              onApplyFilter()
              // Notify parent that Apply was successfully clicked
              onApplyComplete?.()
            }}
            disabled={showSavedFilters || isGeneratingAI || (isApplyEnabled !== undefined && !isApplyEnabled)}
            sx={{ px: 1.5, fontSize: "0.8rem" }}
          >
            Apply
          </Button>
        </Box>
      </Box>

      {/* Content */}
      {isGeneratingAI ? (
        <FilterBuilderSkeleton />
      ) : (
      <Box sx={{ py: 2, px: "5%" }}>
        {/* Saved Filter Selector Panel */}
        {showSavedFilters ? (
          <SavedFilterSelector
            targetColumns={Object.keys(columns)}
            columnTypes={columns}
            onFilterSelected={handleSavedFilterSelected}
            onCancel={() => setShowSavedFilters(false)}
          />
        ) : viewMode === "default" ? (
          <SentenceFormulaPanel
            criteriaFormulas={criteriaFormulas || []}
            columns={columns}
            columnMetadata={columnMetadata}
            categoricalValues={computedCategoricalValues}
            onFormulasChange={onCriteriaFormulasChange || (() => {})}
            isLoading={isProcessingCriteria}
            readOnly={readOnly}
            excludeDirtyData={excludeDirtyData}
            onExcludeDirtyDataChange={onExcludeDirtyDataChange}
            nullStats={nullStats}
            totalCount={totalCount}
          />
        ) : viewMode === "read" ? (
          <ReadModeView
            filter={filter}
            cohorts={cohorts}
            excludeDirtyData={excludeDirtyData}
            onEditClick={() => setViewMode("edit")}
            nullStats={nullStats}
            totalCount={totalCount}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            filteredData={filteredData}
            columns={columns}
            filteredCount={filteredCount}
          />
        ) : (
          <Box>
            {/* Edit Mode Header with Clear All and Done buttons */}
            <Box display="flex" justifyContent="flex-end" gap={1} mb={2}>
              {filter.rules.length > 0 && (
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Clear fontSize="small" />}
                  onClick={clearFilters}
                  sx={{ px: 2 }}
                >
                  Clear All
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<MenuBook sx={{ fontSize: 16 }} />}
                onClick={() => setViewMode("read")}
                sx={{ px: 2 }}
              >
                Done Editing
              </Button>
            </Box>

            {/* Root Filter Group - Pass complete filter, hide AI suggestions from editor */}
            <FilterGroupComponent
              group={filter}
              columns={columns}
              cohorts={cohorts}
              categoricalValues={computedCategoricalValues}
              onUpdate={onFilterChange}
              depth={0}
              nullStats={nullStats}
              totalCount={totalCount}
              patientIdColumn={patientIdColumn}
              excludeAISuggestions={true}
            />

            {/* AI Suggestions Gate - Display suggestions from LLM */}
            <Box mt={3}>
              <AISuggestionsGate
                filterGroup={filter}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                columns={columns}
              />
            </Box>

            {/* Dirty Data Filter Rule - shown as part of the filter chain */}
            <Box mt={3}>
              {/* AND connector between rules and dirty data filter */}
              {filter.rules.length > 0 && (
                <Box display="flex" alignItems="center" mb={1.5} ml={2}>
                  <Box
                    sx={{
                      width: 36,
                      height: 20,
                      bgcolor: "#e3f2fd",
                      border: "1px solid #1976d2",
                      borderRadius: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography variant="caption" fontWeight={600} color="#1565c0" fontSize="0.7rem">
                      AND
                    </Typography>
                  </Box>
                  <Divider sx={{ flex: 1, ml: 0.75, borderColor: "#1976d2" }} />
                </Box>
              )}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "2px dashed",
                  borderColor: excludeDirtyData ? "#ff9800" : "#66bb6a",
                  bgcolor: excludeDirtyData ? "rgba(255, 152, 0, 0.05)" : "rgba(102, 187, 106, 0.05)",
                  borderRadius: 1.5,
                  transition: "all 0.3s ease",
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: excludeDirtyData ? "#ff9800" : "#4caf50",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 0.3s ease",
                        flexShrink: 0,
                      }}
                    >
                      <CleaningServices sx={{ fontSize: 14, color: "white" }} />
                    </Box>
                    <Box minWidth={0}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography
                          fontFamily="monospace"
                          fontWeight={600}
                          fontSize="0.8rem"
                          sx={{ color: excludeDirtyData ? "#e65100" : "#2e7d32" }}
                        >
                          ALL_COLUMNS ≠ ∅
                        </Typography>
                        <Chip
                          label={excludeDirtyData ? "ACTIVE" : "INACTIVE"}
                          size="small"
                          sx={{
                            height: 14,
                            fontSize: "0.6rem",
                            bgcolor: excludeDirtyData ? "#ff9800" : "#bdbdbd",
                            color: "white",
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                        {excludeDirtyData
                          ? "Records with missing values excluded"
                          : "Records with missing values included"}
                      </Typography>
                    </Box>
                  </Box>

                  {onExcludeDirtyDataChange && (
                    <Tooltip title={excludeDirtyData ? "Click to include records with missing values" : "Click to exclude records with missing values"}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={excludeDirtyData}
                            onChange={(e) => onExcludeDirtyDataChange(e.target.checked)}
                            color={excludeDirtyData ? "warning" : "success"}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={600}>
                            {excludeDirtyData ? "Exclude Missing Data" : "Include Missing Data"}
                          </Typography>
                        }
                        labelPlacement="start"
                      />
                    </Tooltip>
                  )}
                </Box>
              </Paper>
            </Box>
          </Box>
        )}
      </Box>
      )}

      {/* Save Filter Dialog */}
      <Dialog
        open={saveFilterDialogOpen}
        onClose={() => !isSavingFilter && setSaveFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Filter</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save this filter to reuse it in other cohorts or studies.
          </Typography>
          <TextField
            fullWidth
            label="Filter Name"
            placeholder="e.g., High Blood Pressure Patients"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            margin="normal"
            required
            disabled={isSavingFilter}
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            fullWidth
            label="Description (optional)"
            placeholder="Describe what this filter does..."
            value={filterDescription}
            onChange={(e) => setFilterDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            disabled={isSavingFilter}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveFilterDialogOpen(false)} disabled={isSavingFilter}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveFilter}
            variant="contained"
            disabled={isSavingFilter || !filterName.trim()}
            startIcon={isSavingFilter ? <CircularProgress size={16} /> : <Save />}
          >
            {isSavingFilter ? "Saving..." : "Save Filter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
